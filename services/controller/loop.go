package controller

import (
	"encoding/json"
	"sync"
	"time"

	"orcn/core"
	"orcn/core/logger"
	"orcn/models"
	"orcn/services/gateway/health"

	"gorm.io/gorm"
)

var controllerLog = logger.New("CONTROLLER")

type Controller struct {
	DB     *gorm.DB
	Health *health.Checker

	// Concurrency Lock Map: Tracks which nodes are currently being checked
	// so we don't spawn multiple goroutines for a slow node.
	activeChecks sync.Map
}

func New(db *gorm.DB) *Controller {
	return &Controller{
		DB:     db,
		Health: health.New(db),
	}
}

func (c *Controller) StartLoop() {
	controllerLog.Info("Starting background reconciliation loop...")
	ticker := time.NewTicker(15 * time.Second)
	
	// Run the first reconciliation immediately
	go c.reconcile()
	
	go func() {
		for range ticker.C {
			c.reconcile()
		}
		// for {
		// 	select {
		// 	case <-ticker.C:
		// 		c.reconcile()
		// 	}
		// }
	}()
}

func (c *Controller) reconcile() {
	var deployments []models.Deployment
	
	activeStatuses := []string{
		models.DeploymentDraft,
		models.DeploymentPending,
		models.DeploymentRunning,
		models.DeploymentReady,
		models.DeploymentPartial,
	}

	if err := c.DB.Preload("Nodes").Where("status IN ?", activeStatuses).Find(&deployments).Error; err != nil {
		controllerLog.Error("Error fetching deployments: %v", err)
		return
	}

	for _, dep := range deployments {
		provider, err := core.GetProvider(dep.ProviderID)
		if err != nil {
			continue
		}

		var spec core.JobSpec
		json.Unmarshal([]byte(dep.JobSpecJSON), &spec)

		var hcPath string
		var hcExpected int
		
		for _, container := range spec.Containers {
			for _, p := range container.Args.Expose {
				if p.HealthCheck != nil && p.HealthCheck.Path != "" {
					hcPath = p.HealthCheck.Path
					hcExpected = p.HealthCheck.ExpectedStatus
					if hcExpected == 0 {
						hcExpected = 200
					}
					break
				}
			}
			if hcPath != "" {
				break
			}
		}

		for i := range dep.Nodes {
			node := dep.Nodes[i]
			
			// Check if this node is already being processed by a slow thread
			if _, loaded := c.activeChecks.LoadOrStore(node.ID, true); loaded {
				continue
			}

			go func(n models.Node, deploymentID string) {
				defer c.activeChecks.Delete(n.ID)

				info, err := provider.GetNodeInfo(n.ID)
				if err == nil && info != nil {
					statusChanged := false
					
					// 1. Update Infra Status blindly (no conditional hell needed!)
					if n.InfraStatus != info.Status {
						n.InfraStatus = info.Status
						
						if n.InfraStatus != models.InfraRunning {
							n.AppStatus = models.AppPending
						}
						
						statusChanged = true
					}
					
					if len(info.Endpoints) > 0 {
						if b, err := json.Marshal(info.Endpoints); err == nil {
							if n.EndpointsJSON != string(b) {
								n.EndpointsJSON = string(b)
								statusChanged = true
							}
						}
					}

					// Save intermediate status if it changed
					if statusChanged {
						c.DB.Save(&n)
					}

					// 2. Ping the AI Health Endpoint if hardware is on
					if n.InfraStatus == models.InfraRunning && len(info.Endpoints) > 0 {
						if hcPath != "" {
							ep := info.Endpoints[0]
							c.Health.RunCheck(n.ID, ep.BaseURL, ep.Protocol, hcPath, hcExpected)
						} else {
							// Generic workload, no health check required. Mark as Ready immediately!
							if n.AppStatus != models.AppReady {
								n.AppStatus = models.AppReady
								c.DB.Save(&n)
							}
						}
					}
				}
			}(node, dep.ID)
		}
		
		// Update parent deployment status based on current DB state of nodes
		c.updateDeploymentStatus(dep)
	}
}

func (c *Controller) updateDeploymentStatus(dep models.Deployment) {
	var currentNodes []models.Node
	if err := c.DB.Where("deployment_id = ?", dep.ID).Find(&currentNodes).Error; err != nil {
		return
	}

	hasReadyNode := false
	hasRunningNode := false
	allCompleted := true

	for _, n := range currentNodes {
		// AppStatus takes priority for the Deployment status
		if n.AppStatus == models.AppReady {
			hasReadyNode = true
			allCompleted = false
		} else if n.InfraStatus == models.InfraRunning {
			hasRunningNode = true
			allCompleted = false
		} else if n.InfraStatus == models.InfraPending {
			allCompleted = false
		}
	}

	newStatus := dep.Status
	if hasReadyNode {
		newStatus = models.DeploymentReady
	} else if hasRunningNode {
		newStatus = models.DeploymentRunning
	} else if len(currentNodes) > 0 && allCompleted {
		newStatus = models.DeploymentStopped
	}

	if dep.Status != newStatus {
		dep.Status = newStatus
		c.DB.Save(&dep)
	}
}

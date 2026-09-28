package api

import (
	"net/http"

	"orcn/core"
)

type runtimeCapability struct {
	ID    string               `json:"id"`
	Name  string               `json:"name"`
	Tasks []core.ModelTaskInfo `json:"tasks"`
}

func (s *Server) handleListRuntimes(w http.ResponseWriter, r *http.Request) {
	ids := core.RuntimeIDs()
	runtimes := make([]runtimeCapability, 0, len(ids))
	tasks := []core.ModelTaskInfo{}
	seen := make(map[core.ModelTask]bool)

	for _, id := range ids {
		runtime, err := core.GetRuntime(id)
		if err != nil {
			continue
		}

		capability := runtimeCapability{ID: id, Name: runtime.Name(), Tasks: []core.ModelTaskInfo{}}
		for _, task := range runtime.SupportedTasks() {
			info, ok := core.GetModelTaskInfo(task)
			if !ok {
				info = core.ModelTaskInfo{ID: task, Name: string(task)}
			}
			capability.Tasks = append(capability.Tasks, info)
			if !seen[info.ID] {
				seen[info.ID] = true
				tasks = append(tasks, info)
			}
		}
		runtimes = append(runtimes, capability)
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"runtimes": runtimes,
		"tasks":    tasks,
	})
}

func (s *Server) handleGetRuntimeSchema(w http.ResponseWriter, r *http.Request) {
	runtimeID := r.URL.Query().Get("runtime")
	task := core.NormalizeModelTask(core.ModelTask(r.URL.Query().Get("task")))
	if runtimeID == "" {
		respondError(w, http.StatusBadRequest, "Missing runtime parameter")
		return
	}

	runtime, err := core.GetRuntime(runtimeID)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}

	schema := runtime.GetAdvancedConfigSchema(task)
	respondJSON(w, http.StatusOK, map[string]interface{}{
		"runtime": runtimeID,
		"task":    task,
		"schema":  schema,
	})
}

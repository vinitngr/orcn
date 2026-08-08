# Workloads API

This API is used to deploy **Generic Container Workloads** using a raw JSON Job Specification (TemplateSpecV2). Unlike Deployments which use AI Runtimes to build configurations, Workloads accept raw container definitions, allowing you to run arbitrary docker images (e.g., Jupyter notebooks, custom python scripts).

## 1. Create a Workload
Validates a raw container spec and deploys it to the requested provider infrastructure.

**Endpoint:** `POST /api/v1/workloads`

### JSON Payload
*   `name` (string, required): Unique name for the workload. (Reserved: `llm`, `embedding`).
*   `template_id` (string, optional): ID of the template used (if any).
*   `provider_id` (string, required): ID of the infrastructure provider (e.g., `nosana`).
*   `instance_type_id` (string, required): The ID of the market/pool (e.g., `rtx-4090-pool`).
*   `instance_name` (string, required): Friendly name of the instance.
*   `replicas` (integer, optional): Number of nodes to launch. Defaults to 1.
*   `spec` (object, required): The raw `TemplateSpecV2` container configuration.

### cURL Example
```bash
curl -X POST "http://localhost:8080/api/v1/workloads" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "custom-jupyter",
    "provider_id": "nosana",
    "instance_type_id": "xyz...",
    "instance_name": "NVIDIA 3050",
    "replicas": 1,
    "spec": {
      "version": "v2",
      "type": "container",
      "containers": [
        {
          "id": "jupyter-main",
          "args": {
            "image": "jupyter/scipy-notebook:latest",
            "expose": [
              {
                "port": 8888,
                "protocol": "http",
                "is_public": true
              }
            ]
          }
        }
      ]
    }
  }'
```

### Response Example
```json
{
  "created_at": "2026-08-08T15:00:00Z",
  "deployment_id": "workload-custom-jupyter-1723129200000",
  "node_ids": [
    "nosana-job-55555"
  ],
  "status": "DRAFT"
}
```
> [!NOTE]
> Workloads are tracked in the database under the same `Deployments` table but are tagged with `workload_type: "container"` to differentiate them from AI Deployments.

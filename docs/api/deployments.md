# Deployments API

This API is used to manage **AI Model Deployments**. Unlike Workloads (which run generic containers), Deployments use specific AI Runtimes (like vLLM) to automatically build the perfect container configuration for a given model.

## 1. Create a Deployment
Creates and launches a new AI model deployment across the specified infrastructure provider.

**Endpoint:** `POST /api/v1/deployments`

### JSON Payload
*   `name` (string, required): Unique name for the deployment. (Reserved: `llm`, `embedding`).
*   `template_id` (string, optional): ID of the template used (if any).
*   `provider_id` (string, required): ID of the infrastructure provider (e.g., `nosana`).
*   `instance_type_id` (string, required): The ID of the market/pool (e.g., `rtx-4090-pool`).
*   `instance_name` (string, required): Friendly name of the instance.
*   `runtime_id` (string, required): The AI runtime engine to use (e.g., `vllm`).
*   `model_id` (string, required): The exact model ID to run (e.g., `meta-llama/Meta-Llama-3-8B-Instruct`).
*   `replicas` (integer, optional): Number of nodes to launch. Defaults to 1.
*   `hf_token` (string, optional): Hugging Face token required to download gated models.
*   `advanced_config` (map, optional): Runtime-specific configuration parameters matching the Runtime Schema (e.g., `{"gpu_memory_utilization": "0.90"}`).

### cURL Example
```bash
curl -X POST "http://localhost:8080/api/v1/deployments" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "production-llama",
    "provider_id": "nosana",
    "instance_type_id": "premium-h100",
    "instance_name": "H100 Node",
    "runtime_id": "vllm",
    "model_id": "meta-llama/Meta-Llama-3-8B-Instruct",
    "replicas": 2,
    "advanced_config": {
      "gpu_memory_utilization": "0.90",
      "tensor_parallel": "0"
    }
  }'
```

### Response Example
```json
{
  "created_at": "2026-08-08T15:00:00Z",
  "deployment_id": "dep-production-llama-1723129200000",
  "node_ids": [
    "nosana-job-12345",
    "nosana-job-67890"
  ],
  "status": "DRAFT"
}
```

---

## 2. List Deployments
Retrieves all deployments, including their child Nodes and Endpoints.

**Endpoint:** `GET /api/v1/deployments`

### cURL Example
```bash
curl -X GET "http://localhost:8080/api/v1/deployments"
```

### Response Example
```json
[
  {
    "id": "dep-production-llama-1723129200000",
    "name": "production-llama",
    "status": "RUNNING",
    "provider_id": "nosana",
    "instance_name": "H100 Node",
    "instance_type_id": "premium-h100",
    "runtime_id": "vllm",
    "model_id": "meta-llama/Meta-Llama-3-8B-Instruct",
    "replicas": 2,
    "nodes": [
      {
        "id": "nosana-job-12345",
        "infra_status": "RUNNING",
        "app_status": "READY",
        "node_url": "https://node-12345.nosana.network",
        "endpoints_json": "[{\"protocol\":\"https\",\"base_url\":\"https://node-12345.nosana.network\",\"port\":9000}]"
      }
    ],
    "endpoints": [
      {
        "id": "ep-dep-production-llama-1723129200000-9000",
        "subdomain": "production-llama-9000",
        "target_port": 9000
      }
    ]
  }
]
```

---

## 3. Get Deployment
Retrieves a specific deployment by ID or Name.

**Endpoint:** `GET /api/v1/deployments/{id}`

### cURL Example
```bash
curl -X GET "http://localhost:8080/api/v1/deployments/dep-production-llama-1723129200000"
```

### Response Example
```json
{
  "id": "dep-production-llama-1723129200000",
  "name": "production-llama",
  "status": "RUNNING",
  "provider_id": "nosana",
  "instance_name": "H100 Node",
  "instance_type_id": "premium-h100",
  "runtime_id": "vllm",
  "model_id": "meta-llama/Meta-Llama-3-8B-Instruct",
  "replicas": 2,
  "nodes": [
    {
      "id": "nosana-job-12345",
      "infra_status": "RUNNING",
      "app_status": "READY"
    }
  ],
  "endpoints": [
    {
      "id": "ep-dep-production-llama-1723129200000-9000",
      "subdomain": "production-llama-9000",
      "target_port": 9000
    }
  ]
}
```

---

## 4. Trigger Action
Triggers a lifecycle action (start, stop, update timeout) on all nodes in a deployment.

**Endpoint:** `POST /api/v1/deployments/{id}/action`

### JSON Payload
*   `action` (string, required): The action to perform (`start`, `stop`, `update_timeout`).
*   `timeout_minutes` (integer, optional): Required only when `action` is `update_timeout`.

### cURL Example
```bash
curl -X POST "http://localhost:8080/api/v1/deployments/dep-production-llama-123/action" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "stop"
  }'
```

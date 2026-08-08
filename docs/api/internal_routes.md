# Internal Router API

This API is exposed by the main Admin control plane. It is **exclusively called by the Gateway Proxy** to sync its in-memory routing tables.

## 1. Get Internal Routes
Retrieves all Deployments and Workloads that are currently in a `READY` or `RUNNING` state, along with all of their active underlying nodes and routing endpoints.

**Endpoint:** `GET /api/v1/internal/routes`

### cURL Example
```bash
curl -X GET "http://localhost:8080/api/v1/internal/routes"
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
        "deployment_id": "dep-production-llama-1723129200000",
        "provider_id": "nosana",
        "infra_status": "RUNNING",
        "app_status": "READY",
        "node_url": "https://node-12345.nosana.network",
        "endpoints_json": "[{\"protocol\":\"https\",\"base_url\":\"https://node-12345.nosana.network\",\"port\":9000}]"
      }
    ]
  }
]
```
> [!NOTE]
> The Gateway Proxy automatically calls this endpoint every `GATEWAY_SYNC_INTERVAL_SEC` (default: 5s) to rebuild its internal mapping of subdomains to IP addresses, ensuring zero-downtime routing.

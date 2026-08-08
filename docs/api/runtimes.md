# Runtimes API

This API fetches configuration schemas and runtime-specific data for inference engines like vLLM and Ollama.

## 1. Get Runtime Schema
Retrieves the "Advanced Configuration" schema for a specific runtime. This schema defines the parameters (e.g., memory utilization, prefix caching) that the frontend should display when configuring a workload.

**Endpoint:** `GET /api/v1/runtimes/schema`

### Query Parameters
*   `runtime` (string, required): The ID of the runtime (e.g., `vllm`, `ollama`).

### cURL Example
```bash
curl -X GET "http://localhost:8080/api/v1/runtimes/schema?runtime=vllm"
```

### Response Example
```json
{
  "runtime": "vllm",
  "schema": [
    {
      "key": "gpu_memory_utilization",
      "name": "GPU Memory Utilization",
      "description": "Fraction of GPU VRAM to allocate for the model and KV cache.",
      "type": "number",
      "default": "0.80",
      "min": 0.1,
      "max": 1.0,
      "options": null
    },
    {
      "key": "enable_prefix_caching",
      "name": "Prefix Caching",
      "description": "Automatically cache system prompts and shared prefixes.",
      "type": "boolean",
      "default": "true",
      "min": null,
      "max": null,
      "options": null
    },
    {
      "key": "tensor_parallel",
      "name": "Tensor Parallel Size",
      "description": "Number of GPUs to use (0=Disable, 2, 4, 8).",
      "type": "select",
      "default": "0",
      "min": null,
      "max": null,
      "options": [
        "0",
        "2",
        "4",
        "8"
      ]
    }
  ]
}
```
> [!NOTE]
> The schema directly matches the `core.ConfigOption` struct. The frontend uses this array to dynamically build the Advanced Settings form during workload creation.

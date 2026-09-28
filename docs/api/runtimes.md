# Runtimes API

This API exposes the registered inference runtimes (e.g. vLLM, Ollama) and their configuration schemas.

## 1. List Runtimes
Returns every runtime registered in the gateway together with the model tasks (modalities) it supports. This is the single source of truth for the runtime and modality selectors in clients, so adding a new runtime plugin only requires registering it in `services/gateway/main.go` — no API or frontend changes.

**Endpoint:** `GET /api/v1/runtimes`

### cURL Example
```bash
curl -X GET "http://localhost:8080/api/v1/runtimes"
```

### Response Example
```json
{
  "runtimes": [
    {
      "id": "ollama",
      "name": "Ollama",
      "tasks": [
        { "id": "text-generation", "name": "Text Generation", "description": "Autoregressive chat and completion models." }
      ]
    },
    {
      "id": "vllm",
      "name": "vLLM",
      "tasks": [
        { "id": "text-generation", "name": "Text Generation", "description": "Autoregressive chat and completion models." },
        { "id": "multimodal", "name": "Multimodal", "description": "Models that accept image, video or audio alongside text." },
        { "id": "embedding", "name": "Embedding", "description": "Models that turn text into dense vector representations." },
        { "id": "score", "name": "Reranker", "description": "Cross-encoder models that score query-document pairs." }
      ]
    }
  ],
  "tasks": [
    { "id": "text-generation", "name": "Text Generation", "description": "Autoregressive chat and completion models." },
    { "id": "multimodal", "name": "Multimodal", "description": "Models that accept image, video or audio alongside text." },
    { "id": "embedding", "name": "Embedding", "description": "Models that turn text into dense vector representations." },
    { "id": "score", "name": "Reranker", "description": "Cross-encoder models that score query-document pairs." }
  ]
}
```
> [!NOTE]
> `runtimes[].tasks` is scoped per runtime; the top-level `tasks` array is the de-duplicated union of all tasks in display order. Clients should render the modality selector from `tasks` and the runtime selector from the runtimes that support the selected task.

---

## 2. Get Runtime Schema
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

# Models API

This API provides endpoints for searching and retrieving model details from supported runtimes (e.g., vLLM, Ollama).

## 1. Search Models
Searches for available models on a specific runtime platform.

**Endpoint:** `GET /api/v1/models/search`

### Query Parameters
*   `runtime` (string, required): The ID of the runtime to search (e.g., `vllm`, `ollama`).
*   `q` (string, required): The search query.

### cURL Example
```bash
curl -X GET "http://localhost:8080/api/v1/models/search?runtime=vllm&q=llama"
```

### Response Example
```json
{
  "runtime": "vllm",
  "results": [
    {
      "id": "meta-llama/Meta-Llama-3-8B-Instruct",
      "name": "meta-llama/Meta-Llama-3-8B-Instruct",
      "author": "meta-llama",
      "architecture": "LlamaForCausalLM",
      "downloads": 1500000,
      "pipeline_tag": "text-generation",
      "tags": [
        "LlamaForCausalLM"
      ]
    }
  ]
}
```
> [!NOTE]
> The exact search behavior and sorting (e.g., by downloads) is handled by the Runtime plugin. The response conforms to the `core.ModelInfo` struct.

---

## 2. Get Model Details
Retrieves detailed information, configuration, and recommended parsers for a specific model.

**Endpoint:** `GET /api/v1/models/details`

### Query Parameters
*   `runtime` (string, required): The ID of the runtime (e.g., `vllm`).
*   `model` (string, required): The exact model ID.

### cURL Example
```bash
curl -X GET "http://localhost:8080/api/v1/models/details?runtime=vllm&model=meta-llama/Meta-Llama-3-8B-Instruct"
```

### Response Example
```json
{
  "runtime": "vllm",
  "model": "meta-llama/Meta-Llama-3-8B-Instruct",
  "details": {
    "id": "meta-llama/Meta-Llama-3-8B-Instruct",
    "author": "meta-llama",
    "downloads": 1500000,
    "pipeline_tag": "text-generation",
    "config": {
      "architectures": ["LlamaForCausalLM"],
      "vocab_size": 128256,
      "max_position_embeddings": 8192
    },
    "chat_template": "{% set loop_messages = messages %}{% for message in loop_messages %}...",
    "recommended_tool_parser": "llama3_json",
    "recommended_reasoning_parser": "",
    "metadata": {
      "tool_parser": "llama3_json",
      "reasoning_parser": ""
    }
  }
}
```
> [!NOTE]
> The `details` object returns the raw HuggingFace payload enriched with `recommended_tool_parser` and `recommended_reasoning_parser` injected by the vLLM plugin.

# Models API

This API provides endpoints for searching and retrieving model details from supported runtimes (e.g., vLLM, Ollama).

## 1. Search Models
Searches for available models on a specific runtime platform.

**Endpoint:** `GET /api/v1/models/search`

### Query Parameters
*   `runtime` (string, required): The ID of the runtime to search (e.g., `vllm`, `ollama`).
*   `q` (string, required): The search query.
*   `task` (string, optional): Canonical task id (`text-generation`, `multimodal`, `embedding`, `score`, `decision`). Each runtime maps it to its own registry vocabulary — vLLM to HuggingFace `pipeline_tag`s, Ollama to library `c` filters. Defaults to `text-generation`.
*   `capabilities` (string, optional): Comma-separated generic facets (`tools`, `thinking`, `vision`). Runtimes filter on the ones they support and ignore the rest.

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
      ],
      "Parameters": 8.03
    }
  ]
}
```
> [!NOTE]
> The exact search behavior and sorting (e.g., by downloads) is handled by the Runtime plugin. The response conforms to the `core.ModelInfo` struct. `Parameters` is the parameter count in billions, sourced from the model card (HuggingFace `safetensors.total` for vLLM, the library size tag for Ollama) and omitted when unknown. Ollama searches the live public library (`ollama.com/search`) with in-memory TTL caching — there is no vendored model list. Queries are tag-stripped (`gpt-oss:latest` searches `gpt-oss`), exact name matches float above forks, and a direct library-page probe covers models the search ranking misses; task matching is strict (a `decision` search only returns `decision`-tagged models) and cloud-only entries (no pullable tag) are excluded. Every returned ID is directly usable as `ollama pull <id>` — bare names imply `:latest`, otherwise the smallest concrete tag is pinned.

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

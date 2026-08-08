# Markets API

This API fetches available GPU instance types and pricing markets from supported compute providers (e.g., Nosana).

## 1. Get Provider Markets
Retrieves a list of available instance markets for a specific infrastructure provider.

**Endpoint:** `GET /api/v1/markets`

### Query Parameters
*   `provider` (string, required): The ID of the compute provider (e.g., `nosana`).

### cURL Example
```bash
curl -X GET "http://localhost:8080/api/v1/markets?provider=nosana"
```

### Response Example
```json
{
  "provider": "nosana",
  "markets": [
    {
      "id": "rtx-4090-pool",
      "name": "RTX 4090 GPU",
      "price_per_hour": 0.25,
      "tag": "PREMIUM"
    }
  ]
}
```
> [!NOTE]
> The exact structure inside the `markets` array depends on the provider plugin. Community and unverified pools are usually filtered out automatically by the gateway logic.

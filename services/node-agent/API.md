# Node Agent API

The node agent has two servers:

| Server | Default | Purpose |
|---|---:|---|
| Admin | `127.0.0.1:9090` | Registration, lifecycle, logs, events |
| Proxy | `0.0.0.0:8080` | Public workload traffic |

The admin server controls Docker. The proxy only forwards requests to public
ports declared in the registered job.

## Docker setup

Build both images:

```bash
docker build -f services/node-agent/Dockerfile -t vinitngr/orcn-agent:dev .
docker build -f services/node-agent/resource-loader/Dockerfile -t vinitngr/orcn-resource-loader:dev .
```

Run the agent:

```bash
docker rm -f orcn-node-agent 2>/dev/null || true

docker run -d --name orcn-node-agent \
  -p 127.0.0.1:9090:9090 \
  -p 127.0.0.1:8080:8080 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e NODE_AGENT_ADMIN_ADDRESS=0.0.0.0:9090 \
  -e NODE_AGENT_PROXY_ADDRESS=0.0.0.0:8080 \
  -e NODE_AGENT_REGISTRATION_API_KEY=dev-registration-key \
  -e NODE_AGENT_RESOURCE_LOADER_IMAGE=vinitngr/orcn-resource-loader:dev \
  vinitngr/orcn-agent:dev
```

Check it:

```bash
docker ps --filter name=orcn-node-agent
docker logs --tail 100 orcn-node-agent
```

If `NODE_AGENT_ADMIN_TOKEN` is set, send
`Authorization: Bearer <admin-token>` with every admin request.
Registration additionally requires
`X-Registration-Key: dev-registration-key`.

## Registration

`POST /register` accepts the canonical `core.JobSpec`. All resources for all
containers are prepared before any workload container starts.

```bash
curl --max-time 1200 -i -X POST http://127.0.0.1:9090/register \
  -H 'X-Registration-Key: dev-registration-key' \
  -H 'Content-Type: application/json' \
  -d '{
    "version": "v2",
    "job_name": "mobilebert-resource-test",
    "type": "container",
    "node_id": "local-resource-node",
    "containers": [{
      "id": "mobilebert-resource-test",
      "args": {
        "image": "alpine:latest",
        "cmd": ["sh", "-c", "while true; do sleep 30; done"],
        "resources": [{
          "id": "mobilebert-model",
          "type": "http",
          "url": "https://huggingface.co/google/mobilebert-uncased/resolve/main/pytorch_model.bin",
          "target": "/tmp/mobilebert/pytorch_model.bin"
        }]
      }
    }]
  }'
```

Success:

```json
{"status":"registered","node_id":"local-resource-node","containers":1}
```

The process accepts one registration. Restart the agent to register a new job.

## Health

```bash
curl -i http://127.0.0.1:9090/healthz
curl -i http://127.0.0.1:8080/healthz
```

Responses:

```json
{"status":"ok","server":"admin"}
{"status":"ok","server":"proxy"}
```

## Container lifecycle

All lifecycle operations require registration and only accept IDs from the
registered job.

```bash
curl -i -X POST 'http://127.0.0.1:9090/containers?force=false' \
  -H 'Content-Type: application/json' \
  -d '{"id":"mobilebert-resource-test"}'

curl -i -X POST http://127.0.0.1:9090/containers/mobilebert-resource-test/start
curl -i -X POST http://127.0.0.1:9090/containers/mobilebert-resource-test/restart
curl -i -X POST http://127.0.0.1:9090/containers/mobilebert-resource-test/stop
curl -i -X DELETE http://127.0.0.1:9090/containers/mobilebert-resource-test
```

Ensure response:

```json
{"id":"mobilebert-resource-test","created":false}
```

Action response:

```json
{"status":"ok"}
```

Remove requires the container to be stopped first. Agent-owned temporary
resource volumes are removed after workload removal.

## Logs

Snapshot:

```bash
curl -i 'http://127.0.0.1:9090/containers/mobilebert-resource-test/logs?tail=100'
```

Live:

```bash
curl -sN 'http://127.0.0.1:9090/containers/mobilebert-resource-test/logs?live=true'
```

## Events

Events are available before, during, and after registration. Normal snapshots
contain lifecycle events only; download progress is not stored.

```bash
curl -s http://127.0.0.1:9090/events
```

Example:

```json
[{
  "timestamp":"2026-08-09T15:11:21Z",
  "container_id":"mobilebert-resource-test",
  "category":"lifecycle",
  "type":"container_started",
  "message":"container started",
  "level":"info"
}]
```

Live events use Server-Sent Events. Start this before registration:

```bash
curl -sN \
  -H 'X-Registration-Key: dev-registration-key' \
  'http://127.0.0.1:9090/events?live=true'
```

Progress example:

```text
data: {"id":"mobilebert-model","category":"resource","type":"download_progress","message":"resource download progress","level":"info","metadata":{"percentage":50}}
```

Progress is throttled to approximately one event per percentage point and is
not replayed for late subscribers.

Event fields:

| Field | Meaning |
|---|---|
| `category` | `lifecycle`, `image`, `resource`, or another group |
| `type` | Specific event name |
| `level` | `info`, `warn`, or `error` |
| `message` | Human-readable description |
| `metadata` | Event-specific structured data |

## Proxy

Only public ports from the registered job are routed:

```bash
curl -i \
  -H 'X-Orcn-Container: nginx-agent-test' \
  -H 'X-Orcn-Port: 80' \
  http://127.0.0.1:8080/
```

The proxy removes both `X-Orcn-*` headers before forwarding. Private ports and
unregistered containers are rejected.

## Standalone loader test

The loader does not create Docker volumes; Docker creates the volume when it
is mounted.

```bash
printf '%s' '{"version":1,"resources":[{"id":"post-one","type":"http","config":{"url":"https://jsonplaceholder.typicode.com/posts/1"},"destination":"/data/post.json"}]}' > /tmp/orcn-resource-plan.json

docker volume rm orcn-loader-test-volume 2>/dev/null || true

docker run --rm --name orcn-resource-loader-test \
  --mount type=volume,source=orcn-loader-test-volume,target=/data \
  --mount type=bind,source=/tmp/orcn-resource-plan.json,target=/run/resource-plan.json,readonly \
  vinitngr/orcn-resource-loader:dev

docker run --rm \
  --mount type=volume,source=orcn-loader-test-volume,target=/data \
  alpine:latest cat /data/post.json

docker volume rm orcn-loader-test-volume
rm -f /tmp/orcn-resource-plan.json
```

## Errors

Errors use:

```json
{"error":"description"}
```

Typical statuses are `400` invalid input, `401` authentication, `403`
authorization, `404` missing resources, `409` conflicts, and `502`
Docker or resource-loader failures.


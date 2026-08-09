# Resource Loader

The resource loader is a short-lived helper container. It owns installer
implementations; the node agent owns orchestration and lifecycle.

The loader never creates workload containers. It receives a normalized plan,
writes resources into mounted storage, exits with a status code, and is then
removed by the node agent.

Implementation files:

```text
resource-loader/
├── main.go       # plan parsing and installer dispatch
├── plan.go       # loader-only plan types
├── http.go       # HTTP/HTTPS installer with atomic writes and progress logs
└── Dockerfile    # separate loader image
```

```mermaid
sequenceDiagram
    participant A as Node Agent
    participant D as Docker Daemon
    participant L as Resource Loader
    participant V as Shared Volume
    participant W as Workload

    A->>D: Pull loader image
    A->>D: Create/resolve volume
    A->>D: Create loader with volume mount
    A->>D: Copy resource-plan.json to /run
    A->>D: Start loader
    D->>L: Start with mounted volume
    L->>L: Select installer by resource.type
    L->>V: Download/write atomically
    L-->>A: Exit success or failure
    A->>D: Remove loader
    A->>D: Create workload with same volume mount
    W->>V: Read installed resource
```

## Storage mapping

The node agent resolves the storage backend before creating the loader.

```mermaid
flowchart LR
    S[Logical volume: model-cache] --> Q{Resolved backend}
    Q -->|Docker local volume| DV[Docker named volume]
    Q -->|Cloud persistent disk| HP[Host path /mnt/orcn/model-cache]
    DV --> LM1[Loader: /mnt/volumes/model-cache]
    DV --> WM1[Workload: /root/.cache/models]
    HP --> LM2[Loader bind mount: /mnt/volumes/model-cache]
    HP --> WM2[Workload bind mount: /root/.cache/models]
```

The loader plan contains normalized destinations, for example:

```json
{
  "version": 1,
  "resources": [
    {
      "id": "model-resource",
      "type": "http",
      "config": {
        "url": "https://example.com/model.bin"
      },
      "destination": "/mnt/volumes/model-cache/models/model.bin"
    }
  ]
}
```

Installer selection is type-based:

```text
http         → HTTP installer
huggingface  → HuggingFace installer
s3           → S3 installer
git          → Git installer
```

Unknown types fail preparation. Resource credentials must be delivered through
temporary protected loader input and must never be written to logs or events.

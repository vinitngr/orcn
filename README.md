# orkn

> ORK-N — Orchestration & Routing Kernel Network

Distributed inference orchestration and routing platform for deploying and serving AI models across heterogeneous compute infrastructure.

---

## Overview

orkn is a control-plane focused inference infrastructure system designed to:

- orchestrate model deployments
- manage distributed GPU resources
- route inference traffic
- scale inference replicas
- unify serving across multiple compute providers

The project focuses on scalable inference topology management, deployment orchestration, and provider-agnostic serving.

---

## Architecture

```txt
Client
  ↓
API Gateway
  ↓
Control Plane
  ├── Serving
  │     ├── Request Routing
  │     ├── Replica Selection
  │     ├── Load Balancing
  │     ├── Streaming Proxy
  │     └── Failover
  │
  ├── Deployment
  ├── Scheduling
  ├── GPU Allocation
  ├── Topology Planning
  ├── Autoscaling
  └── Provider Orchestration
          ↓
    Inference Replicas
```

---

## Infrastructure Support

Current and planned infrastructure targets:

- Cloud Providers
- DePIN Networks
- Local / Bare Metal

---

## Inference Runtime Support

Planned runtime integrations include:

- vLLM
- Ollama
- Text Generation Inference (TGI)

---

## Core Concepts

### Replica

An isolated inference runtime instance managing a tensor-parallel GPU group.

### Topology

The structural layout of replicas, GPU allocation, and tensor-parallel groupings.

### Deployment

The orchestration lifecycle responsible for provisioning, scaling, and managing inference replicas.

### Serving

The traffic layer responsible for routing, balancing, failover, and endpoint management.

---

## Goals

- Unified inference API layer
- Multi-provider deployment orchestration
- Runtime-agnostic serving
- Scalable replica-based inference
- Distributed GPU resource management
- Self-hostable infrastructure stack

---

## Future Directions

- Additional runtime integrations
- Advanced topology orchestration
- Multi-cluster scheduling
- Extended workload orchestration

---

## Status

Early architecture and runtime development.

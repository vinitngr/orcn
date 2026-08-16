package agent

import (
	"context"
	"io"
	"orcn/core"
	"orcn/services/node-agent/engines/docker"

	containertypes "github.com/docker/docker/api/types/container"
)

type Engine interface {
	ValidateJob(ctx context.Context, job core.JobSpec) error
	Inspect(ctx context.Context, id string) (containertypes.InspectResponse, error)
	Ensure(ctx context.Context, spec docker.ContainerConfig, force bool) (string, bool, error)
	EnsureStopped(ctx context.Context, spec docker.ContainerConfig, force bool) (string, bool, error)
	Start(ctx context.Context, id string) error
	Restart(ctx context.Context, id string) error
	Stop(ctx context.Context, id string) error
	Remove(ctx context.Context, id string) error
	Logs(ctx context.Context, id string, live bool, tail int, output io.Writer) error
	Ping(ctx context.Context) error
	Close() error
}

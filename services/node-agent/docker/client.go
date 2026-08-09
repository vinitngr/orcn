package docker

import (
	"context"
	"fmt"
	"io"

	containertypes "github.com/docker/docker/api/types/container"
	imagetypes "github.com/docker/docker/api/types/image"
	"github.com/docker/docker/api/types/registry"
	"github.com/docker/docker/client"
	"github.com/docker/docker/pkg/stdcopy"
	"orcn/services/node-agent/config"
)

type Client struct {
	api          *client.Client
	registryAuth *registry.AuthConfig
	logTailLimit int
}

func NewClient(cfg config.Config) (*Client, error) {
	options := []client.Opt{client.FromEnv, client.WithAPIVersionNegotiation()}
	if cfg.DockerHost != "" {
		options = append(options, client.WithHost(cfg.DockerHost))
	}
	api, err := client.NewClientWithOpts(options...)
	if err != nil {
		return nil, fmt.Errorf("create docker client: %w", err)
	}
	result := &Client{api: api, logTailLimit: cfg.LogTailLimit}
	if cfg.RegistryUsername != "" || cfg.RegistryCredential != "" {
		if cfg.RegistryUsername == "" || cfg.RegistryCredential == "" {
			return nil, fmt.Errorf("docker registry username and credential must be provided together")
		}
		result.registryAuth = &registry.AuthConfig{Username: cfg.RegistryUsername, Password: cfg.RegistryCredential, ServerAddress: cfg.RegistryServerAddress}
	}
	return result, nil
}

func (c *Client) Close() error { return c.api.Close() }

func (c *Client) Ping(ctx context.Context) error { _, err := c.api.Ping(ctx); return err }

func (c *Client) Inspect(ctx context.Context, id string) (containertypes.InspectResponse, error) {
	return c.api.ContainerInspect(ctx, id)
}

func (c *Client) Pull(ctx context.Context, image string) error {
	if _, _, err := c.api.ImageInspectWithRaw(ctx, image); err == nil {
		return nil
	}
	var encodedAuth string
	if c.registryAuth != nil {
		if _, err := c.api.RegistryLogin(ctx, *c.registryAuth); err != nil {
			return fmt.Errorf("docker registry login: %w", err)
		}
		var err error
		encodedAuth, err = registry.EncodeAuthConfig(*c.registryAuth)
		if err != nil {
			return fmt.Errorf("encode registry credentials: %w", err)
		}
	}
	stream, err := c.api.ImagePull(ctx, image, imagetypes.PullOptions{RegistryAuth: encodedAuth})
	if err != nil {
		return fmt.Errorf("pull image %q: %w", image, err)
	}
	defer stream.Close()
	if _, err := io.Copy(io.Discard, stream); err != nil {
		return fmt.Errorf("read image pull response: %w", err)
	}
	return nil
}

func (c *Client) Create(ctx context.Context, spec ContainerConfig) (containertypes.CreateResponse, error) {
	created, err := c.api.ContainerCreate(ctx, containerConfig(spec), hostConfig(spec), nil, nil, spec.ID)
	if err != nil {
		return containertypes.CreateResponse{}, fmt.Errorf("create container: %w", err)
	}
	return created, nil
}

func (c *Client) Start(ctx context.Context, id string) error {
	if err := c.api.ContainerStart(ctx, id, containertypes.StartOptions{}); err != nil {
		return fmt.Errorf("start container: %w", err)
	}
	return nil
}

func (c *Client) Restart(ctx context.Context, id string) error {
	timeout := 10
	if err := c.api.ContainerRestart(ctx, id, containertypes.StopOptions{Timeout: &timeout}); err != nil {
		return fmt.Errorf("restart container: %w", err)
	}
	return nil
}

func (c *Client) Stop(ctx context.Context, id string) error {
	timeout := 10
	if err := c.api.ContainerStop(ctx, id, containertypes.StopOptions{Timeout: &timeout}); err != nil {
		return fmt.Errorf("stop container: %w", err)
	}
	return nil
}

func (c *Client) Remove(ctx context.Context, id string, force bool) error {
	if err := c.api.ContainerRemove(ctx, id, containertypes.RemoveOptions{Force: force}); err != nil {
		return fmt.Errorf("remove container: %w", err)
	}
	return nil
}

func (c *Client) RemoveVolume(ctx context.Context, name string) error {
	if err := c.api.VolumeRemove(ctx, name, true); err != nil {
		return fmt.Errorf("remove volume: %w", err)
	}
	return nil
}

func (c *Client) CopyToContainer(ctx context.Context, id, destination string, content io.Reader) error {
	if err := c.api.CopyToContainer(ctx, id, destination, content, containertypes.CopyToContainerOptions{}); err != nil {
		return fmt.Errorf("copy files into container: %w", err)
	}
	return nil
}

func (c *Client) Wait(ctx context.Context, id string) (int64, error) {
	status, errCh := c.api.ContainerWait(ctx, id, containertypes.WaitConditionNotRunning)
	select {
	case result := <-status:
		if result.Error != nil {
			return 0, fmt.Errorf("container wait: %s", result.Error.Message)
		}
		return result.StatusCode, nil
	case err := <-errCh:
		return 0, err
	case <-ctx.Done():
		return 0, ctx.Err()
	}
}

func (c *Client) Logs(ctx context.Context, id string, live bool, tail int, output io.Writer) error {
	if tail <= 0 || tail > c.logTailLimit {
		tail = c.logTailLimit
	}
	stream, err := c.api.ContainerLogs(ctx, id, containertypes.LogsOptions{ShowStdout: true, ShowStderr: true, Follow: live, Tail: fmt.Sprintf("%d", tail), Timestamps: true})
	if err != nil {
		return fmt.Errorf("get container logs: %w", err)
	}
	defer stream.Close()
	if _, err := stdcopy.StdCopy(output, output, stream); err != nil {
		return fmt.Errorf("stream container logs: %w", err)
	}
	return nil
}

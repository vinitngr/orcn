package docker

import (
	"context"
	"io"

	"orcn/core"
)

type resourceRuntime struct {
	client *Client
}

func (r resourceRuntime) Pull(ctx context.Context, image string) error {
	return r.client.Pull(ctx, image)
}

func (r resourceRuntime) CreateLoader(ctx context.Context, id, image string, mounts []core.VolumeMount) (string, error) {
	created, err := r.client.Create(ctx, ContainerConfig{ID: id, Image: image, VolumeMounts: mounts})
	if err != nil {
		return "", err
	}
	return created.ID, nil
}

func (r resourceRuntime) CopyToContainer(ctx context.Context, id, destination string, content io.Reader) error {
	return r.client.CopyToContainer(ctx, id, destination, content)
}

func (r resourceRuntime) Start(ctx context.Context, id string) error {
	return r.client.Start(ctx, id)
}

func (r resourceRuntime) Wait(ctx context.Context, id string) (int64, error) {
	return r.client.Wait(ctx, id)
}

func (r resourceRuntime) Logs(ctx context.Context, id string, live bool, tail int, output io.Writer) error {
	return r.client.Logs(ctx, id, live, tail, output)
}

func (r resourceRuntime) Remove(ctx context.Context, id string, force bool) error {
	return r.client.Remove(ctx, id, force)
}

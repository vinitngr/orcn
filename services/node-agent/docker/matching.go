package docker

import (
	"reflect"
	"sort"

	containertypes "github.com/docker/docker/api/types/container"
	"github.com/docker/go-connections/nat"
)

func Matches(existing containertypes.InspectResponse, desired ContainerConfig) bool {
	if existing.Config == nil || existing.HostConfig == nil || existing.Config.Image != desired.Image {
		return false
	}
	if !sameStrings(existing.Config.Cmd, desired.Command) {
		return false
	}
	if !sameStrings(existing.Config.Entrypoint, desired.Entrypoint) {
		return false
	}
	wantEnv := environmentSlice(desired.Environment)
	haveEnv := append([]string(nil), existing.Config.Env...)
	sort.Strings(haveEnv)
	if !sameStrings(haveEnv, wantEnv) {
		return false
	}
	wantedConfig := containerConfig(desired)
	if !reflect.DeepEqual(existing.Config.ExposedPorts, wantedConfig.ExposedPorts) {
		return false
	}
	if !reflect.DeepEqual(existing.Config.Healthcheck, wantedConfig.Healthcheck) {
		return false
	}
	return samePortBindings(existing.HostConfig.PortBindings, hostConfig(desired).PortBindings) &&
		reflect.DeepEqual(existing.HostConfig.DeviceRequests, hostConfig(desired).DeviceRequests)
}

func environmentSlice(environment map[string]string) []string {
	values := make([]string, 0, len(environment))
	for key, value := range environment {
		values = append(values, key+"="+value)
	}
	sort.Strings(values)
	return values
}

func samePortBindings(a, b nat.PortMap) bool {
	if len(a) != len(b) {
		return false
	}
	for port, bindings := range a {
		other, ok := b[port]
		if !ok || len(bindings) != len(other) {
			return false
		}
		for i := range bindings {
			if bindings[i].HostIP != other[i].HostIP || bindings[i].HostPort != other[i].HostPort {
				return false
			}
		}
	}
	return true
}

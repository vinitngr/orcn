package docker

import (
	"reflect"
	"sort"
	"strings"

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
	if !containsEnv(haveEnv, wantEnv) {
		return false
	}
	wantedConfig := containerConfig(desired)
	if !sameLabels(existing.Config.Labels, wantedConfig.Labels) {
		return false
	}
	if !samePortSet(existing.Config.ExposedPorts, wantedConfig.ExposedPorts) {
		return false
	}
	if !reflect.DeepEqual(existing.Config.Healthcheck, wantedConfig.Healthcheck) {
		return false
	}
	return samePortBindings(existing.HostConfig.PortBindings, hostConfig(desired).PortBindings) &&
		reflect.DeepEqual(existing.HostConfig.DeviceRequests, hostConfig(desired).DeviceRequests)
}

func sameLabels(a, b map[string]string) bool {
	for key, value := range b {
		if a[key] != value {
			return false
		}
	}
	for key := range a {
		if strings.HasPrefix(key, "orcn.resource.") {
			if _, exists := b[key]; !exists {
				return false
			}
		}
	}
	return true
}

func samePortSet(a, b nat.PortSet) bool {
	if len(a) == 0 && len(b) == 0 {
		return true
	}
	return reflect.DeepEqual(a, b)
}

func containsEnv(have, want []string) bool {
	set := make(map[string]struct{}, len(have))
	for _, value := range have {
		set[value] = struct{}{}
	}
	for _, value := range want {
		if _, ok := set[value]; !ok {
			return false
		}
	}
	return true
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

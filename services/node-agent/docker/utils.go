package docker

import "github.com/docker/docker/client"

func sameStrings(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

func isNotFound(err error) bool { return client.IsErrNotFound(err) }

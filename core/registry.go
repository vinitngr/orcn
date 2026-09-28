package core

import (
	"errors"
	"sort"
)

var (
	providers = make(map[string]Provider)
	runtimes  = make(map[string]Runtime)
)

func RegisterProvider(id string, p Provider) {
	providers[id] = p
}

func GetProvider(id string) (Provider, error) {
	p, ok := providers[id]
	if !ok {
		return nil, errors.New("provider not found")
	}
	return p, nil
}

func RegisterRuntime(id string, r Runtime) {
	runtimes[id] = r
}

func GetRuntime(id string) (Runtime, error) {
	r, ok := runtimes[id]
	if !ok {
		return nil, errors.New("runtime not found")
	}
	return r, nil
}

// RuntimeIDs returns the registered runtime IDs in deterministic order.
func RuntimeIDs() []string {
	ids := make([]string, 0, len(runtimes))
	for id := range runtimes {
		ids = append(ids, id)
	}
	sort.Strings(ids)
	return ids
}

// ListRuntimes returns the registered runtimes keyed by ID.
func ListRuntimes() map[string]Runtime {
	registered := make(map[string]Runtime, len(runtimes))
	for id, runtime := range runtimes {
		registered[id] = runtime
	}
	return registered
}

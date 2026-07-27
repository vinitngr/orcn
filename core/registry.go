package core

import "errors"

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

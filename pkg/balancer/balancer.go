package balancer

import (
	"errors"
	"math/rand"
	"sync/atomic"
)

var ErrNoNodes = errors.New("no nodes available")

type Strategy string

const (
	StrategyRoundRobin Strategy = "RoundRobin"
	StrategyRandom     Strategy = "Random"
)

type LoadBalancer[T any] interface {
	Pick(nodes []T) (T, error)
}

type roundRobinBalancer[T any] struct {
	counter uint64
}

func (r *roundRobinBalancer[T]) Pick(nodes []T) (T, error) {
	if len(nodes) == 0 {
		var zero T
		return zero, ErrNoNodes
	}
	idx := atomic.AddUint64(&r.counter, 1)
	return nodes[(idx-1)%uint64(len(nodes))], nil
}

type randomBalancer[T any] struct{}

func (r *randomBalancer[T]) Pick(nodes []T) (T, error) {
	if len(nodes) == 0 {
		var zero T
		return zero, ErrNoNodes
	}
	idx := rand.Intn(len(nodes))
	return nodes[idx], nil
}

func New[T any](strategy Strategy) LoadBalancer[T] {
	switch strategy {
	case StrategyRandom:
		return &randomBalancer[T]{}
	case StrategyRoundRobin:
		fallthrough
	default:
		return &roundRobinBalancer[T]{}
	}
}

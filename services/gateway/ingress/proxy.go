package ingress

import (
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"sync"
	"time"
)

var (
	llmTransport *http.Transport
	transportOnce sync.Once
)

func getLLMTransport(maxConns int) *http.Transport {
	transportOnce.Do(func() {
		llmTransport = &http.Transport{
			DialContext: (&net.Dialer{
				Timeout:   60 * time.Second,
				KeepAlive: 30 * time.Second,
			}).DialContext,
			TLSHandshakeTimeout:   60 * time.Second,
			MaxIdleConns:          1000,
			MaxIdleConnsPerHost:   100,
			MaxConnsPerHost:       maxConns,
		}
	})
	return llmTransport
}

func NewReverseProxy(target *url.URL, originalHost, nodeID string, route *CachedRoute, server *Server) *httputil.ReverseProxy {
	proxy := httputil.NewSingleHostReverseProxy(target)

	proxy.Transport = getLLMTransport(server.cfg.MaxConnsPerHost)

	originalDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		originalDirector(req)
		req.Host = target.Host
		req.Header.Set("X-Forwarded-Host", originalHost)
		req.Header.Set("X-Orcn-Proxy", "true")
	}

	proxy.ModifyResponse = func(resp *http.Response) error {
		resp.Header.Set("X-Node-ID", nodeID)
		resp.Header.Set("X-Node-Target", target.String())
		return nil
	}

	proxy.ErrorHandler = func(w http.ResponseWriter, req *http.Request, proxyErr error) {
		ingressLog.Error("Proxy error for node %s: %v", nodeID, proxyErr)
		http.Error(w, "Bad Gateway: Node failed to respond", http.StatusBadGateway)
	}

	return proxy
}

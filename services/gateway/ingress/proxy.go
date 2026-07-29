package ingress

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
)

func NewReverseProxy(target *url.URL, originalHost, nodeID string) *httputil.ReverseProxy {
	proxy := httputil.NewSingleHostReverseProxy(target)

	//overriting the Director function to modify the request before it's sent to the target
	originalDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		originalDirector(req)
		req.Host = target.Host
		req.Header.Set("X-Forwarded-Host", originalHost)
		req.Header.Set("X-Orcn-Proxy", "true")
	}

	proxy.ErrorHandler = func(w http.ResponseWriter, req *http.Request, proxyErr error) {
		log.Printf("Proxy error for node %s: %v\n", nodeID, proxyErr)
		http.Error(w, "Bad Gateway: Node failed to respond", http.StatusBadGateway)
	}

	return proxy
}

package ingress

import (
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"time"
)

func NewReverseProxy(target *url.URL, originalHost, nodeID string, server *Server) *httputil.ReverseProxy {
	proxy := httputil.NewSingleHostReverseProxy(target)

	// Short dial timeout to prevent stalling on dead nodes (Circuit Breaking)
	transport := &http.Transport{
		DialContext: (&net.Dialer{
			Timeout:   15 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		TLSHandshakeTimeout:   15 * time.Second,
		ResponseHeaderTimeout: 120 * time.Second,
		MaxIdleConns:          1000,
		MaxIdleConnsPerHost:   1000,
	}
	proxy.Transport = transport

	//overriting the Director function to modify the request before it's sent to the target
	originalDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		originalDirector(req)
		req.Host = target.Host
		req.Header.Set("X-Forwarded-Host", originalHost)
		req.Header.Set("X-Orcn-Proxy", "true")
	}

	proxy.ErrorHandler = func(w http.ResponseWriter, req *http.Request, proxyErr error) {
		ingressLog.Error("Proxy error for node %s: %v", nodeID, proxyErr)
		
		// Apply the Penalty!
		server.PenalizeNode(nodeID)
		
		http.Error(w, "Bad Gateway: Node failed to respond", http.StatusBadGateway)
	}

	return proxy
}

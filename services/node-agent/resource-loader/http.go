package main

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"orcn/services/node-agent/resources"
)

const (
	loaderHTTPTimeout = 2 * time.Hour
	loaderMaxBytes    = int64(0)
)

type progressFunc func(downloaded, total int64)

func installHTTP(ctx context.Context, resource resources.Resource, progress progressFunc) error {
	value, ok := resource.Config["url"].(string)
	if !ok || strings.TrimSpace(value) == "" {
		return fmt.Errorf("HTTP resource %q requires config.url", resource.ID)
	}
	parsed, err := url.Parse(value)
	if err != nil || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return fmt.Errorf("resource %q has an invalid HTTP URL", resource.ID)
	}
	if resource.Destination == "" || !filepath.IsAbs(resource.Destination) || filepath.Clean(resource.Destination) == "/" {
		return fmt.Errorf("resource %q has an invalid destination", resource.ID)
	}

	requestCtx, cancel := context.WithTimeout(ctx, loaderHTTPTimeout)
	defer cancel()
	request, err := http.NewRequestWithContext(requestCtx, http.MethodGet, parsed.String(), nil)
	if err != nil {
		return fmt.Errorf("create HTTP request: %w", err)
	}
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return fmt.Errorf("download resource %q: %w", resource.ID, err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf("download resource %q: unexpected HTTP status %s", resource.ID, response.Status)
	}
	if loaderMaxBytes > 0 && response.ContentLength > loaderMaxBytes {
		return fmt.Errorf("resource %q exceeds the loader size limit", resource.ID)
	}

	if err := os.MkdirAll(filepath.Dir(resource.Destination), 0o755); err != nil {
		return fmt.Errorf("create resource directory: %w", err)
	}
	temporary, err := os.CreateTemp(filepath.Dir(resource.Destination), ".orcn-resource-*")
	if err != nil {
		return fmt.Errorf("create temporary resource: %w", err)
	}
	temporaryName := temporary.Name()
	defer os.Remove(temporaryName)
	defer temporary.Close()

	if progress != nil {
		progress(0, response.ContentLength)
	}
	writer := &progressWriter{writer: temporary, total: response.ContentLength, progress: progress}
	if _, err := io.Copy(writer, response.Body); err != nil {
		return fmt.Errorf("write resource %q: %w", resource.ID, err)
	}
	if err := temporary.Close(); err != nil {
		return fmt.Errorf("close resource %q: %w", resource.ID, err)
	}
	if err := os.Chmod(temporaryName, 0o644); err != nil {
		return fmt.Errorf("set resource permissions: %w", err)
	}
	if err := os.Rename(temporaryName, resource.Destination); err != nil {
		return fmt.Errorf("publish resource %q: %w", resource.ID, err)
	}
	return nil
}

type progressWriter struct {
	writer   io.Writer
	total    int64
	progress progressFunc
	done     int64
}

func (w *progressWriter) Write(data []byte) (int, error) {
	n, err := w.writer.Write(data)
	w.done += int64(n)
	if w.progress != nil {
		w.progress(w.done, w.total)
	}
	return n, err
}

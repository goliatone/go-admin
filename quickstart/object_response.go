package quickstart

import (
	"context"
	"errors"
	"mime"
	"net/http"
	"strings"

	router "github.com/goliatone/go-router"
)

var (
	// ErrBinaryObjectContextRequired signals a missing response context.
	ErrBinaryObjectContextRequired = errors.New("quickstart: response context required")
	// ErrBinaryObjectStoreRequired signals a missing object store.
	ErrBinaryObjectStoreRequired = errors.New("quickstart: object store is not configured")
	// ErrBinaryObjectKeyRequired signals a missing object key.
	ErrBinaryObjectKeyRequired = errors.New("quickstart: object key is required")
	// ErrBinaryObjectUnavailable signals a missing/empty object payload.
	ErrBinaryObjectUnavailable = errors.New("quickstart: object payload is unavailable")
)

// BinaryObjectStore resolves raw object bytes by key.
type BinaryObjectStore interface {
	GetFile(ctx context.Context, path string) ([]byte, error)
}

// BinaryObjectResponseConfig configures object-backed binary responses.
type BinaryObjectResponseConfig struct {
	Store        BinaryObjectStore
	ObjectKey    string
	ContentType  string
	Filename     string
	Disposition  string
	CacheControl string
	Pragma       string
	StatusCode   int
	Headers      map[string]string
}

// ServeBinaryObject resolves an object from storage and writes it as an HTTP response body.
func ServeBinaryObject(c router.Context, cfg BinaryObjectResponseConfig) error {
	if c == nil {
		return ErrBinaryObjectContextRequired
	}
	if cfg.Store == nil {
		return ErrBinaryObjectStoreRequired
	}
	objectKey := strings.TrimSpace(cfg.ObjectKey)
	if objectKey == "" {
		return ErrBinaryObjectKeyRequired
	}
	payload, err := cfg.Store.GetFile(c.Context(), objectKey)
	if err != nil || len(payload) == 0 {
		return ErrBinaryObjectUnavailable
	}

	contentType := strings.TrimSpace(cfg.ContentType)
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	c.SetHeader("Content-Type", contentType)

	if disposition := resolveContentDisposition(cfg.Disposition, strings.TrimSpace(cfg.Filename)); disposition != "" {
		c.SetHeader("Content-Disposition", disposition)
	}

	cacheControl := strings.TrimSpace(cfg.CacheControl)
	if cacheControl == "" {
		cacheControl = "no-store, no-cache, max-age=0, must-revalidate, private"
	}
	c.SetHeader("Cache-Control", cacheControl)

	pragma := strings.TrimSpace(cfg.Pragma)
	if pragma == "" {
		pragma = "no-cache"
	}
	c.SetHeader("Pragma", pragma)

	for key, value := range cfg.Headers {
		key = strings.TrimSpace(key)
		value = strings.TrimSpace(value)
		if key == "" || value == "" {
			continue
		}
		c.SetHeader(key, value)
	}

	statusCode := cfg.StatusCode
	if statusCode == 0 {
		statusCode = http.StatusOK
	}
	return c.Status(statusCode).Send(payload)
}

func resolveContentDisposition(disposition, filename string) string {
	filename = strings.TrimSpace(filename)
	if filename == "" {
		return ""
	}
	value := "inline"
	if strings.EqualFold(strings.TrimSpace(disposition), "attachment") {
		value = "attachment"
	}
	formatted := strings.TrimSpace(mime.FormatMediaType(value, map[string]string{"filename": filename}))
	if formatted != "" {
		return formatted
	}
	return value + `; filename="` + filename + `"`
}

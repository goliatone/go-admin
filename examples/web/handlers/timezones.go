package handlers

import (
	"bytes"
	"errors"
	"net/http"
	"strings"

	"github.com/goliatone/go-admin/pkg/formgencomponents/timezones"
	authlib "github.com/goliatone/go-auth"
	"github.com/goliatone/go-router"
)

func ListTimezones(c router.Context) error {
	if c == nil {
		return router.NewBadRequestError("missing context")
	}

	handler := timezones.NewHandler(
		timezones.WithGuard(timezonesGuard()),
	)

	return serveHTTP(c, handler)
}

func timezonesGuard() timezones.GuardFunc {
	return func(r *http.Request) error {
		if r == nil {
			return timezones.StatusError{Code: http.StatusBadRequest, Err: errors.New("missing request")}
		}

		ctx := r.Context()
		claims, ok := authlib.GetClaims(ctx)
		if !ok || claims == nil {
			return timezones.StatusError{Code: http.StatusUnauthorized, Err: errors.New("missing or invalid token")}
		}

		if authlib.Can(ctx, "admin.users", "read") {
			return nil
		}

		return timezones.StatusError{Code: http.StatusForbidden, Err: errors.New("forbidden")}
	}
}

type bufferedResponseWriter struct {
	headers http.Header
	code    int
	body    bytes.Buffer
}

func (w *bufferedResponseWriter) Header() http.Header {
	return w.headers
}

func (w *bufferedResponseWriter) WriteHeader(statusCode int) {
	if w.code != 0 {
		return
	}
	w.code = statusCode
}

func (w *bufferedResponseWriter) Write(p []byte) (int, error) {
	if w.code == 0 {
		w.code = http.StatusOK
	}
	return w.body.Write(p)
}

func serveHTTP(c router.Context, handler http.Handler) error {
	if handler == nil {
		return router.NewBadRequestError("missing handler")
	}

	rawPath := strings.TrimSpace(c.OriginalURL())
	if rawPath == "" {
		rawPath = strings.TrimSpace(c.Path())
	}
	if rawPath == "" {
		rawPath = "/"
	}
	if !strings.HasPrefix(rawPath, "/") {
		rawPath = "/" + rawPath
	}

	req, err := http.NewRequestWithContext(c.Context(), c.Method(), "http://localhost"+rawPath, nil)
	if err != nil {
		return err
	}

	rw := &bufferedResponseWriter{headers: make(http.Header)}
	handler.ServeHTTP(rw, req)

	for name, values := range rw.headers {
		if len(values) == 0 {
			continue
		}
		c.SetHeader(name, values[len(values)-1])
	}

	status := rw.code
	if status == 0 {
		status = http.StatusOK
	}

	if rw.body.Len() == 0 {
		return c.SendStatus(status)
	}
	c.Status(status)
	return c.Send(rw.body.Bytes())
}


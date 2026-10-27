package main

import (
	"io"
	"net"
	"net/http"
	"strings"
	"testing"
	"time"

	fiber3 "github.com/gofiber/fiber/v3"
)

func TestPresentationExampleHTTP(t *testing.T) {
	app, err := newPresentationApp()
	if err != nil {
		t.Fatal(err)
	}
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	done := make(chan error, 1)
	go func() { done <- app.Listener(listener, fiber3.ListenConfig{DisableStartupMessage: true}) }()
	t.Cleanup(func() {
		if err := app.ShutdownWithTimeout(3 * time.Second); err != nil {
			t.Error(err)
		}
		listener.Close()
		select {
		case err := <-done:
			if err != nil {
				t.Error(err)
			}
		case <-time.After(5 * time.Second):
			t.Error("preview listener did not stop")
		}
	})
	client := &http.Client{Timeout: 5 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	defer client.CloseIdleConnections()
	for _, tc := range []struct {
		path                  string
		status                int
		contentType, contains string
	}{
		{"/admin", 200, "text/html", "Escaped &lt;values&gt;"},
		{"/admin?state=empty", 200, "text/html", "data-empty-state"},
		{"/admin/denied", 403, "text/html", "Access denied"},
		{"/admin/failure", 500, "text/html", "Something went wrong"},
		{"/admin/missing", 404, "text/html", "Page not found"},
		{"/admin/api/denied", 403, "application/json", `"code":403`},
		{"/admin/assets/preview.css", 200, "text/css", ".presentation-preview"},
		{"/admin/assets/output.css", 200, "text/css", ""},
		{"/admin/redirect", 303, "", ""},
	} {
		t.Run(tc.path, func(t *testing.T) {
			res, err := client.Get("http://" + listener.Addr().String() + tc.path)
			if err != nil {
				t.Fatal(err)
			}
			body, err := io.ReadAll(res.Body)
			res.Body.Close()
			if err != nil {
				t.Fatal(err)
			}
			if res.StatusCode != tc.status || !strings.Contains(res.Header.Get("Content-Type"), tc.contentType) || !strings.Contains(string(body), tc.contains) {
				t.Fatalf("status=%d type=%q body=%s", res.StatusCode, res.Header.Get("Content-Type"), body)
			}
			if strings.Contains(string(body), "private diagnostic detail") {
				t.Fatal("private error escaped")
			}
			if tc.status == 303 && res.Header.Get("Location") != "/admin" {
				t.Fatal("redirect target lost")
			}
			if tc.contentType == "text/html" && strings.Count(strings.ToLower(string(body)), "<!doctype html>") != 1 {
				t.Fatal("expected one document")
			}
		})
	}
}

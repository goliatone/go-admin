package quickstart

import (
	"net/http"
	"testing"
)

func closeResponseBody(t testing.TB, resp *http.Response) {
	t.Helper()
	if resp == nil || resp.Body == nil {
		return
	}
	if err := resp.Body.Close(); err != nil {
		t.Fatalf("close response body: %v", err)
	}
}

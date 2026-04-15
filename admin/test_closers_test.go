package admin

import "testing"

type testCloser interface {
	Close() error
}

func mustClose(t *testing.T, name string, closer testCloser) {
	t.Helper()
	if closer == nil {
		return
	}
	if err := closer.Close(); err != nil {
		t.Fatalf("close %s: %v", name, err)
	}
}

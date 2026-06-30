package quickstart

import "testing"

func requireTestValue[T any](t *testing.T, value any, label string) T {
	t.Helper()
	typed, ok := value.(T)
	if !ok {
		var zero T
		t.Fatalf("expected %s to be %T, got %T", label, zero, value)
	}
	return typed
}

package quickstart

import (
	"context"
	"testing"

	commandregistry "github.com/goliatone/go-command/registry"
)

func resetCommandRegistryForTest(t *testing.T) {
	t.Helper()
	if err := commandregistry.Stop(context.Background()); err != nil {
		t.Errorf("stop command registry: %v", err)
	}
}

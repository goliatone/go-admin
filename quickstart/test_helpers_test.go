package quickstart

import (
	"context"
	"testing"

	commandregistry "github.com/goliatone/go-command/registry"
)

func resetCommandRegistryForTest(t *testing.T) {
	t.Helper()
	_ = commandregistry.Stop(context.Background())
}

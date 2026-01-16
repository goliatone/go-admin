package client

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestDebugReplPanelMountMarkup(t *testing.T) {
	path := filepath.Join("assets", "src", "debug", "repl", "repl-panel.ts")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read repl panel source: %v", err)
	}
	source := string(data)
	needles := []string{
		"data-repl-terminal",
		"new DebugReplTerminal",
		"terminal.refresh()",
		"terminal.focus()",
	}
	for _, needle := range needles {
		if !strings.Contains(source, needle) {
			t.Fatalf("expected repl panel markup to include %q", needle)
		}
	}
}

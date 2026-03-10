package admin

import (
	"testing"

	"github.com/goliatone/go-command"
)

func TestNormalizeCommandExecutionPolicyDefaultsInline(t *testing.T) {
	policy, err := normalizeCommandExecutionPolicy(CommandExecutionPolicy{})
	if err != nil {
		t.Fatalf("normalizeCommandExecutionPolicy: %v", err)
	}
	if policy.DefaultMode != command.ExecutionModeInline {
		t.Fatalf("expected default mode inline, got %q", policy.DefaultMode)
	}
	if policy.PerCommand == nil {
		t.Fatalf("expected non-nil per_command map")
	}
}

func TestNormalizeCommandExecutionPolicyValidatesModes(t *testing.T) {
	_, err := normalizeCommandExecutionPolicy(CommandExecutionPolicy{
		DefaultMode: command.ExecutionMode("invalid"),
	})
	if err == nil {
		t.Fatalf("expected invalid default_mode error")
	}
}

func TestNormalizeCommandExecutionPolicyRejectsEmptyPerCommandKey(t *testing.T) {
	_, err := normalizeCommandExecutionPolicy(CommandExecutionPolicy{
		PerCommand: map[string]command.ExecutionMode{
			" ": command.ExecutionModeQueued,
		},
	})
	if err == nil {
		t.Fatalf("expected empty per_command key error")
	}
}

func TestNormalizeCommandExecutionPolicyNormalizesPerCommandModes(t *testing.T) {
	policy, err := normalizeCommandExecutionPolicy(CommandExecutionPolicy{
		DefaultMode: command.ExecutionModeInline,
		PerCommand: map[string]command.ExecutionMode{
			"docs.remediate": command.ExecutionMode(" QUEUED "),
			"noop":           "",
		},
	})
	if err != nil {
		t.Fatalf("normalizeCommandExecutionPolicy: %v", err)
	}
	if mode, ok := policy.Resolve("docs.remediate"); !ok || mode != command.ExecutionModeQueued {
		t.Fatalf("expected docs.remediate queued override, got mode=%q ok=%v", mode, ok)
	}
	if _, ok := policy.Resolve("noop"); ok {
		t.Fatalf("expected empty per-command mode to be ignored")
	}
}

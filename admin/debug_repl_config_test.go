package admin

import "testing"

func TestNormalizeDebugREPLConfigDefaults(t *testing.T) {
	cfg := normalizeDebugREPLConfig(DebugREPLConfig{})

	if cfg.Permission != debugReplDefaultPermission {
		t.Fatalf("expected default permission %q, got %q", debugReplDefaultPermission, cfg.Permission)
	}
	if cfg.ExecPermission != debugReplDefaultExecPermission {
		t.Fatalf("expected default exec permission %q, got %q", debugReplDefaultExecPermission, cfg.ExecPermission)
	}
	if cfg.ShellCommand != debugReplDefaultShellCommand {
		t.Fatalf("expected default shell command %q, got %q", debugReplDefaultShellCommand, cfg.ShellCommand)
	}
	if cfg.MaxSessionSeconds != debugReplDefaultMaxSessionSeconds {
		t.Fatalf("expected default max session %d, got %d", debugReplDefaultMaxSessionSeconds, cfg.MaxSessionSeconds)
	}
	if cfg.AppEvalTimeoutMs != debugReplDefaultAppEvalTimeoutMs {
		t.Fatalf("expected default eval timeout %d, got %d", debugReplDefaultAppEvalTimeoutMs, cfg.AppEvalTimeoutMs)
	}
	if cfg.MaxSessionsPerUser != debugReplDefaultMaxSessionsPerUser {
		t.Fatalf("expected default max sessions %d, got %d", debugReplDefaultMaxSessionsPerUser, cfg.MaxSessionsPerUser)
	}
	if cfg.ReadOnly == nil || !*cfg.ReadOnly {
		t.Fatalf("expected read-only default to true")
	}
	if _, ok := cfg.OverrideStrategy.(DenyAllStrategy); !ok {
		t.Fatalf("expected default override strategy DenyAllStrategy")
	}
	if cfg.AllowedRoles != nil {
		t.Fatalf("expected allowed roles to be nil by default")
	}
	if cfg.AllowedIPs != nil {
		t.Fatalf("expected allowed IPs to be nil by default")
	}
	if cfg.AppAllowedPackages != nil {
		t.Fatalf("expected app allowed packages to be nil by default")
	}
}

func TestNormalizeDebugREPLConfigListNormalization(t *testing.T) {
	cfg := normalizeDebugREPLConfig(DebugREPLConfig{
		AllowedRoles:       []string{" admin ", "", "admin", "ops", "ops"},
		AllowedIPs:         []string{" 127.0.0.1 ", "", "127.0.0.1"},
		AppAllowedPackages: []string{" fmt ", "fmt", "strings"},
	})

	if len(cfg.AllowedRoles) != 2 || cfg.AllowedRoles[0] != "admin" || cfg.AllowedRoles[1] != "ops" {
		t.Fatalf("unexpected allowed roles: %#v", cfg.AllowedRoles)
	}
	if len(cfg.AllowedIPs) != 1 || cfg.AllowedIPs[0] != "127.0.0.1" {
		t.Fatalf("unexpected allowed IPs: %#v", cfg.AllowedIPs)
	}
	if len(cfg.AppAllowedPackages) != 2 || cfg.AppAllowedPackages[0] != "fmt" || cfg.AppAllowedPackages[1] != "strings" {
		t.Fatalf("unexpected allowed packages: %#v", cfg.AppAllowedPackages)
	}
}

func TestDebugREPLReadOnlyEnabled(t *testing.T) {
	cfg := DebugREPLConfig{}
	if !cfg.ReadOnlyEnabled() {
		t.Fatalf("expected read-only enabled when unset")
	}
	cfg.ReadOnly = BoolPtr(false)
	if cfg.ReadOnlyEnabled() {
		t.Fatalf("expected read-only disabled when false")
	}
}

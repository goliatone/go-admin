package main

import (
	"context"
	"testing"
)

func TestResolveAuthzPreflightModeDefaults(t *testing.T) {
	t.Setenv("ADMIN_AUTHZ_PREFLIGHT", "")
	if got := resolveAuthzPreflightMode(true); got != authzPreflightModeWarn {
		t.Fatalf("expected dev default warn, got %q", got)
	}
	if got := resolveAuthzPreflightMode(false); got != authzPreflightModeOff {
		t.Fatalf("expected non-dev default off, got %q", got)
	}
}

func TestResolveAuthzPreflightModeExplicitStrict(t *testing.T) {
	t.Setenv("ADMIN_AUTHZ_PREFLIGHT", "strict")
	if got := resolveAuthzPreflightMode(false); got != authzPreflightModeStrict {
		t.Fatalf("expected strict, got %q", got)
	}
}

func TestResolveAuthzPreflightRoleKeysDefault(t *testing.T) {
	t.Setenv("ADMIN_AUTHZ_PREFLIGHT_ROLES", "")
	keys := resolveAuthzPreflightRoleKeys()
	if len(keys) != 2 || keys[0] != "owner" || keys[1] != "superadmin" {
		t.Fatalf("expected default sorted roles [owner superadmin], got %v", keys)
	}
}

func TestMissingPermissionsCaseInsensitive(t *testing.T) {
	required := []string{"admin.translations.export", "admin.translations.assign"}
	granted := []string{"ADMIN.TRANSLATIONS.EXPORT"}
	missing := missingPermissions(required, granted)
	if len(missing) != 1 || missing[0] != "admin.translations.assign" {
		t.Fatalf("expected missing assign only, got %v", missing)
	}
}

func TestBuildPermissionDiagnosticsPayloadIncludesClaimsPermissions(t *testing.T) {
	payload := buildPermissionDiagnosticsPayload(nil, context.Background(), []string{
		"admin.translations.export",
		"ADMIN.TRANSLATIONS.EXPORT",
	})

	claims, ok := payload["claims_permissions"].([]string)
	if !ok {
		t.Fatalf("expected claims_permissions list, got %T", payload["claims_permissions"])
	}
	if len(claims) != 1 || claims[0] != "admin.translations.export" {
		t.Fatalf("expected deduped claims_permissions, got %v", claims)
	}

	granted, ok := payload["granted_permissions"].([]string)
	if !ok {
		t.Fatalf("expected granted_permissions list, got %T", payload["granted_permissions"])
	}
	if len(granted) != len(claims) || granted[0] != claims[0] {
		t.Fatalf("expected granted_permissions to match claims_permissions, got claims=%v granted=%v", claims, granted)
	}
}

func TestEnabledModuleKeysSorted(t *testing.T) {
	enabled := enabledModuleKeys(map[string]bool{
		"queue":    true,
		"exchange": false,
		"zeta":     true,
		"alpha":    true,
	})
	if len(enabled) != 3 {
		t.Fatalf("expected three enabled modules, got %v", enabled)
	}
	if enabled[0] != "alpha" || enabled[1] != "queue" || enabled[2] != "zeta" {
		t.Fatalf("expected sorted enabled modules, got %v", enabled)
	}
}

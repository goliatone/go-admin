package admin

import "testing"

func TestPermissionDeniedAddsTranslationHint(t *testing.T) {
	err := permissionDenied("admin.translations.export", "translations")
	denied, ok := err.(PermissionDeniedError)
	if !ok {
		t.Fatalf("expected PermissionDeniedError, got %T", err)
	}
	if denied.Hint == "" {
		t.Fatalf("expected translation permission hint")
	}
	if !denied.ReauthRequired {
		t.Fatalf("expected reauth_required=true for translation permission denial")
	}
}

func TestMapToGoErrorPermissionDeniedIncludesActionableMetadata(t *testing.T) {
	mapped, code := mapToGoError(permissionDenied("admin.translations.assign", "translations"), nil)
	if mapped == nil {
		t.Fatalf("expected mapped error")
	}
	if code != 403 {
		t.Fatalf("expected status 403, got %d", code)
	}
	if mapped.Metadata == nil {
		t.Fatalf("expected metadata")
	}
	if got := mapped.Metadata["missing_permission"]; got != "admin.translations.assign" {
		t.Fatalf("expected missing_permission metadata, got %v", got)
	}
	if got := mapped.Metadata["hint"]; got == "" {
		t.Fatalf("expected hint metadata, got %v", got)
	}
	if got := mapped.Metadata["reauth_required"]; got != true {
		t.Fatalf("expected reauth_required=true, got %v", got)
	}
}

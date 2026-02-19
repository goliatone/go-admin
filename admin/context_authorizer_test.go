package admin

import (
	"context"
	"testing"
)

type testSimpleAuthorizer struct {
	allowed map[string]bool
}

func (t testSimpleAuthorizer) Can(_ context.Context, action string, resource string) bool {
	return t.allowed[resource+"|"+action]
}

type testBatchAuthorizer struct {
	calledAny bool
	calledAll bool
	lastAny   []string
	lastAll   []string
}

func (t *testBatchAuthorizer) Can(context.Context, string, string) bool { return false }
func (t *testBatchAuthorizer) CanAny(_ context.Context, _ string, permissions ...string) bool {
	t.calledAny = true
	t.lastAny = append([]string(nil), permissions...)
	return true
}
func (t *testBatchAuthorizer) CanAll(_ context.Context, _ string, permissions ...string) bool {
	t.calledAll = true
	t.lastAll = append([]string(nil), permissions...)
	return true
}

func TestCanAllHelperFallbacksToCan(t *testing.T) {
	authz := testSimpleAuthorizer{allowed: map[string]bool{
		"translations|admin.translations.export": true,
		"translations|admin.translations.assign": true,
	}}
	if !CanAll(authz, context.Background(), "translations", "admin.translations.export", "admin.translations.assign") {
		t.Fatalf("expected CanAll fallback to allow")
	}
	if CanAll(authz, context.Background(), "translations", "admin.translations.export", "admin.translations.approve") {
		t.Fatalf("expected CanAll fallback to deny on missing permission")
	}
}

func TestCanAnyHelperUsesBatchAuthorizer(t *testing.T) {
	authz := &testBatchAuthorizer{}
	if !CanAny(authz, context.Background(), "translations", "a", "b") {
		t.Fatalf("expected CanAny to return true from batch authorizer")
	}
	if !CanAll(authz, context.Background(), "translations", "a", "b") {
		t.Fatalf("expected CanAll to return true from batch authorizer")
	}
	if !authz.calledAny || !authz.calledAll {
		t.Fatalf("expected batch authorizer methods to be invoked")
	}
	if len(authz.lastAny) != 2 || authz.lastAny[0] != "a" || authz.lastAny[1] != "b" {
		t.Fatalf("unexpected CanAny forwarded permissions: %v", authz.lastAny)
	}
	if len(authz.lastAll) != 2 || authz.lastAll[0] != "a" || authz.lastAll[1] != "b" {
		t.Fatalf("unexpected CanAll forwarded permissions: %v", authz.lastAll)
	}
}

func TestCanAnyAndCanAllIgnoreEmptyPermissions(t *testing.T) {
	authz := testSimpleAuthorizer{allowed: map[string]bool{
		"translations|admin.translations.export": true,
	}}

	if CanAny(authz, context.Background(), "translations", " ", "\t") {
		t.Fatalf("expected CanAny to deny when only empty permissions are provided")
	}
	if !CanAny(authz, context.Background(), "translations", " ", "admin.translations.export", "\t") {
		t.Fatalf("expected CanAny to ignore empties and allow valid permission")
	}
	if !CanAll(authz, context.Background(), "translations", " ", "\t") {
		t.Fatalf("expected CanAll to treat empty permission set as vacuously true")
	}
}

func TestCanAnyAndCanAllFilterEmptyBeforeBatchAuthorizer(t *testing.T) {
	authz := &testBatchAuthorizer{}
	if !CanAny(authz, context.Background(), "translations", "", "a", " ") {
		t.Fatalf("expected CanAny to return true from batch authorizer")
	}
	if !CanAll(authz, context.Background(), "translations", "", "b", " ") {
		t.Fatalf("expected CanAll to return true from batch authorizer")
	}
	if len(authz.lastAny) != 1 || authz.lastAny[0] != "a" {
		t.Fatalf("expected CanAny to pass only non-empty permissions, got %v", authz.lastAny)
	}
	if len(authz.lastAll) != 1 || authz.lastAll[0] != "b" {
		t.Fatalf("expected CanAll to pass only non-empty permissions, got %v", authz.lastAll)
	}
}

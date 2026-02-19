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
}

func (t *testBatchAuthorizer) Can(context.Context, string, string) bool { return false }
func (t *testBatchAuthorizer) CanAny(context.Context, string, ...string) bool {
	t.calledAny = true
	return true
}
func (t *testBatchAuthorizer) CanAll(context.Context, string, ...string) bool {
	t.calledAll = true
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
}

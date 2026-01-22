package quickstart

import (
	"context"
	"testing"

	fggate "github.com/goliatone/go-featuregate/gate"
	fgtemplates "github.com/goliatone/go-featuregate/templates"
	router "github.com/goliatone/go-router"
)

func TestWithFeatureTemplateContextInjectsMissingKeys(t *testing.T) {
	reqCtx := context.Background()
	scope := fggate.ScopeSet{System: true}
	snapshot := map[string]bool{"users.signup": true}

	viewCtx := WithFeatureTemplateContext(nil, reqCtx, scope, snapshot)
	if viewCtx == nil {
		t.Fatalf("expected view context")
	}
	if viewCtx[fgtemplates.TemplateContextKey] != reqCtx {
		t.Fatalf("expected feature_ctx to be set")
	}
	if viewCtx[fgtemplates.TemplateScopeKey] != scope {
		t.Fatalf("expected feature_scope to be set")
	}
	if viewCtx[fgtemplates.TemplateSnapshotKey] != snapshot {
		t.Fatalf("expected feature_snapshot to be set")
	}
}

func TestWithFeatureTemplateContextDoesNotOverrideExistingKeys(t *testing.T) {
	existing := router.ViewContext{
		fgtemplates.TemplateContextKey:  "ctx",
		fgtemplates.TemplateScopeKey:    "scope",
		fgtemplates.TemplateSnapshotKey: "snapshot",
	}
	out := WithFeatureTemplateContext(existing, context.Background(), fggate.ScopeSet{System: true}, map[string]bool{"users.signup": true})
	if out[fgtemplates.TemplateContextKey] != "ctx" {
		t.Fatalf("expected existing feature_ctx preserved")
	}
	if out[fgtemplates.TemplateScopeKey] != "scope" {
		t.Fatalf("expected existing feature_scope preserved")
	}
	if out[fgtemplates.TemplateSnapshotKey] != "snapshot" {
		t.Fatalf("expected existing feature_snapshot preserved")
	}
}

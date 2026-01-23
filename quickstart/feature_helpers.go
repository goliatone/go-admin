package quickstart

import (
	"context"
	"strings"

	fggate "github.com/goliatone/go-featuregate/gate"
	fgscope "github.com/goliatone/go-featuregate/scope"
	fgtemplates "github.com/goliatone/go-featuregate/templates"
	router "github.com/goliatone/go-router"
)

func featureEnabled(gate fggate.FeatureGate, feature string) bool {
	return featureEnabledWithContext(context.Background(), gate, feature, fggate.ScopeChain{{Kind: fggate.ScopeSystem}})
}

func featureEnabledWithContext(ctx context.Context, gate fggate.FeatureGate, feature string, scope fggate.ScopeChain) bool {
	if gate == nil || strings.TrimSpace(feature) == "" {
		return false
	}
	if ctx == nil {
		ctx = context.Background()
	}
	enabled, err := gate.Enabled(ctx, feature, fggate.WithScopeChain(scope))
	return err == nil && enabled
}

// WithFeatureTemplateContext injects feature helper keys into a view context when missing.
func WithFeatureTemplateContext(ctx router.ViewContext, reqCtx context.Context, scope any, snapshot any) router.ViewContext {
	if ctx == nil {
		ctx = router.ViewContext{}
	}
	if shouldSetTemplateKey(ctx, fgtemplates.TemplateContextKey) && reqCtx != nil {
		ctx[fgtemplates.TemplateContextKey] = reqCtx
	}
	if shouldSetTemplateKey(ctx, fgtemplates.TemplateScopeKey) && scope != nil {
		ctx[fgtemplates.TemplateScopeKey] = scope
	}
	if shouldSetTemplateKey(ctx, fgtemplates.TemplateSnapshotKey) && snapshot != nil {
		ctx[fgtemplates.TemplateSnapshotKey] = snapshot
	}
	return ctx
}

func shouldSetTemplateKey(ctx router.ViewContext, key string) bool {
	value, ok := ctx[key]
	return !ok || value == nil
}

func featureScopeFromSession(session SessionUser) map[string]any {
	scopeData := map[string]any{}
	if session.TenantID != "" {
		scopeData[fgscope.MetadataTenantID] = session.TenantID
	}
	if session.OrganizationID != "" {
		scopeData[fgscope.MetadataOrgID] = session.OrganizationID
	}
	if session.ID != "" {
		scopeData[fgscope.MetadataUserID] = session.ID
	}
	return scopeData
}

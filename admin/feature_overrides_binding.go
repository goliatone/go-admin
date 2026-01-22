package admin

import (
	"context"
	"net/http"
	"strings"

	"github.com/goliatone/go-admin/admin/internal/boot"
	goauthadapter "github.com/goliatone/go-auth/adapters/featuregate"
	goerrors "github.com/goliatone/go-errors"
	"github.com/goliatone/go-featuregate/ferrors"
	fggate "github.com/goliatone/go-featuregate/gate"
	router "github.com/goliatone/go-router"
)

const (
	featureOverrideScopeSystem = "system"
	featureOverrideScopeTenant = "tenant"
	featureOverrideScopeOrg    = "org"
	featureOverrideScopeUser   = "user"
	featureOverrideAliasSignup = "users.self_registration"
)

type featureOverridesBinding struct {
	admin *Admin
}

func newFeatureOverridesBinding(a *Admin) boot.FeatureOverridesBinding {
	if a == nil {
		return nil
	}
	return &featureOverridesBinding{admin: a}
}

func (b *featureOverridesBinding) List(c router.Context) (map[string]any, error) {
	if b == nil || b.admin == nil {
		return nil, goerrors.New("admin required", goerrors.CategoryInternal).WithCode(http.StatusInternalServerError)
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.admin.requirePermission(adminCtx, b.admin.config.FeatureFlagsViewPermission, "feature_flags"); err != nil {
		return nil, err
	}

	scopeName, scopeSet, scopeID, err := parseFeatureOverrideScope(adminCtx, featureOverrideBodyFromQuery(c))
	if err != nil {
		return nil, err
	}

	keys := parseFeatureOverrideKeys(c)
	if len(keys) == 0 {
		keys = b.admin.featureFlagKeys()
	}
	flags := make([]map[string]any, 0, len(keys))
	includeTrace := parseFeatureOverrideTrace(c)
	for _, key := range keys {
		record, err := b.resolveFeatureFlag(adminCtx.Context, key, scopeSet, includeTrace)
		if err != nil {
			return nil, err
		}
		if len(record) > 0 {
			flags = append(flags, record)
		}
	}

	_, mutable := b.admin.featureGate.(fggate.MutableFeatureGate)
	payload := map[string]any{
		"scope":   scopeName,
		"flags":   flags,
		"mutable": mutable,
	}
	if scopeID != "" {
		payload["scope_id"] = scopeID
	}
	return payload, nil
}

func (b *featureOverridesBinding) Set(c router.Context, body map[string]any) (map[string]any, error) {
	return b.applyOverride(c, body, true)
}

func (b *featureOverridesBinding) Unset(c router.Context, body map[string]any) (map[string]any, error) {
	return b.applyOverride(c, body, false)
}

func (b *featureOverridesBinding) applyOverride(c router.Context, body map[string]any, set bool) (map[string]any, error) {
	if b == nil || b.admin == nil {
		return nil, goerrors.New("admin required", goerrors.CategoryInternal).WithCode(http.StatusInternalServerError)
	}
	if body == nil {
		body = map[string]any{}
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.admin.requirePermission(adminCtx, b.admin.config.FeatureFlagsUpdatePermission, "feature_flags"); err != nil {
		return nil, err
	}

	key, err := parseFeatureOverrideKey(body)
	if err != nil {
		return nil, err
	}

	scopeName, scopeSet, scopeID, err := parseFeatureOverrideScope(adminCtx, body)
	if err != nil {
		return nil, err
	}

	mutable, ok := b.admin.featureGate.(fggate.MutableFeatureGate)
	if !ok || mutable == nil {
		return nil, ferrors.WrapSentinel(ferrors.ErrStoreUnavailable, "feature overrides require a mutable feature gate", nil)
	}

	actor, _ := goauthadapter.ActorRefFromContext(adminCtx.Context)
	if set {
		enabled, ok := parseOverrideEnabled(body)
		if !ok {
			return nil, goerrors.New("enabled must be a boolean", goerrors.CategoryBadInput).
				WithCode(http.StatusBadRequest).
				WithTextCode("FEATURE_ENABLED_REQUIRED")
		}
		if err := mutable.Set(adminCtx.Context, key, scopeSet, enabled, actor); err != nil {
			return nil, err
		}
		response := map[string]any{
			"status":  "ok",
			"key":     key,
			"enabled": enabled,
			"scope":   scopeName,
		}
		if scopeID != "" {
			response["scope_id"] = scopeID
		}
		return response, nil
	}

	if err := mutable.Unset(adminCtx.Context, key, scopeSet, actor); err != nil {
		return nil, err
	}
	response := map[string]any{
		"status": "ok",
		"key":    key,
		"scope":  scopeName,
	}
	if scopeID != "" {
		response["scope_id"] = scopeID
	}
	return response, nil
}

func (b *featureOverridesBinding) resolveFeatureFlag(ctx context.Context, key string, scopeSet fggate.ScopeSet, includeTrace bool) (map[string]any, error) {
	if b == nil || b.admin == nil || b.admin.featureGate == nil {
		return nil, ferrors.WrapSentinel(ferrors.ErrGateRequired, "feature gate required", nil)
	}
	key = strings.TrimSpace(key)
	if key == "" {
		return nil, nil
	}
	key = fggate.NormalizeKey(key)
	if key == "" {
		return nil, nil
	}
	if traceable, ok := b.admin.featureGate.(fggate.TraceableFeatureGate); ok {
		value, trace, err := traceable.ResolveWithTrace(ctx, key, fggate.WithScopeSet(scopeSet))
		if err != nil {
			return nil, err
		}
		overrideState := trace.Override.State
		if overrideState == "" {
			overrideState = fggate.OverrideStateMissing
		}
		override := map[string]any{
			"state": overrideState,
		}
		if trace.Override.Value != nil {
			override["value"] = *trace.Override.Value
		}
		defaultInfo := map[string]any{
			"set": trace.Default.Set,
		}
		if trace.Default.Set {
			defaultInfo["value"] = trace.Default.Value
		}
		record := map[string]any{
			"key":       trace.NormalizedKey,
			"effective": value,
			"source":    trace.Source,
			"override":  override,
			"default":   defaultInfo,
		}
		if includeTrace {
			record["trace"] = trace
		}
		return record, nil
	}

	value, err := b.admin.featureGate.Enabled(ctx, key, fggate.WithScopeSet(scopeSet))
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"key":       key,
		"effective": value,
		"source":    "unknown",
	}, nil
}

func parseFeatureOverrideKey(body map[string]any) (string, error) {
	key := strings.TrimSpace(toString(body["key"]))
	if key == "" {
		key = strings.TrimSpace(toString(body["feature"]))
	}
	if key == "" {
		return "", goerrors.New("feature key required", goerrors.CategoryBadInput).
			WithCode(http.StatusBadRequest).
			WithTextCode(ferrors.TextCodeInvalidKey)
	}
	if strings.EqualFold(strings.TrimSpace(key), featureOverrideAliasSignup) {
		return "", goerrors.New("feature alias not supported", goerrors.CategoryBadInput).
			WithCode(http.StatusBadRequest).
			WithTextCode("FEATURE_ALIAS_DISABLED")
	}
	if fggate.IsAlias(key) {
		return "", goerrors.New("feature alias not supported", goerrors.CategoryBadInput).
			WithCode(http.StatusBadRequest).
			WithTextCode("FEATURE_ALIAS_DISABLED")
	}
	return fggate.NormalizeKey(key), nil
}

func parseFeatureOverrideScope(ctx AdminContext, body map[string]any) (string, fggate.ScopeSet, string, error) {
	scopeName := strings.ToLower(strings.TrimSpace(toString(body["scope"])))
	if scopeName == "" {
		scopeName = featureOverrideScopeSystem
	}
	scopeID := strings.TrimSpace(toString(body["scope_id"]))
	tenantID := strings.TrimSpace(toString(body["tenant_id"]))
	orgID := strings.TrimSpace(toString(body["org_id"]))
	userID := strings.TrimSpace(toString(body["user_id"]))

	switch scopeName {
	case featureOverrideScopeSystem:
		return scopeName, fggate.ScopeSet{System: true}, "", nil
	case featureOverrideScopeTenant:
		id := firstNonEmpty(tenantID, scopeID, ctx.TenantID)
		if id == "" {
			return "", fggate.ScopeSet{}, "", goerrors.New("tenant scope requires tenant_id", goerrors.CategoryBadInput).
				WithCode(http.StatusBadRequest).
				WithTextCode(ferrors.TextCodeScopeMetadataMissing)
		}
		return scopeName, fggate.ScopeSet{TenantID: id}, id, nil
	case featureOverrideScopeOrg:
		id := firstNonEmpty(orgID, scopeID, ctx.OrgID)
		if id == "" {
			return "", fggate.ScopeSet{}, "", goerrors.New("org scope requires org_id", goerrors.CategoryBadInput).
				WithCode(http.StatusBadRequest).
				WithTextCode(ferrors.TextCodeScopeMetadataMissing)
		}
		return scopeName, fggate.ScopeSet{OrgID: id}, id, nil
	case featureOverrideScopeUser:
		id := firstNonEmpty(userID, scopeID, ctx.UserID)
		if id == "" {
			return "", fggate.ScopeSet{}, "", goerrors.New("user scope requires user_id", goerrors.CategoryBadInput).
				WithCode(http.StatusBadRequest).
				WithTextCode(ferrors.TextCodeScopeMetadataMissing)
		}
		return scopeName, fggate.ScopeSet{UserID: id}, id, nil
	default:
		return "", fggate.ScopeSet{}, "", goerrors.New("invalid scope", goerrors.CategoryBadInput).
			WithCode(http.StatusBadRequest).
			WithTextCode(ferrors.TextCodeScopeInvalid)
	}
}

func parseOverrideEnabled(body map[string]any) (bool, bool) {
	switch val := body["enabled"].(type) {
	case bool:
		return val, true
	case string:
		if strings.EqualFold(val, "true") {
			return true, true
		}
		if strings.EqualFold(val, "false") {
			return false, true
		}
	}
	return false, false
}

func parseFeatureOverrideKeys(c router.Context) []string {
	if c == nil {
		return nil
	}
	raw := strings.TrimSpace(c.Query("keys"))
	if raw == "" {
		raw = strings.TrimSpace(c.Query("key"))
	}
	if raw == "" {
		raw = strings.TrimSpace(c.Query("feature"))
	}
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	keys := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		keys = append(keys, part)
	}
	return keys
}

func parseFeatureOverrideTrace(c router.Context) bool {
	if c == nil {
		return false
	}
	raw := strings.TrimSpace(c.Query("trace"))
	if raw == "" {
		raw = strings.TrimSpace(c.Query("include_trace"))
	}
	switch strings.ToLower(raw) {
	case "true", "1", "yes", "on":
		return true
	default:
		return false
	}
}

func featureOverrideBodyFromQuery(c router.Context) map[string]any {
	if c == nil {
		return map[string]any{}
	}
	body := map[string]any{}
	if value := strings.TrimSpace(c.Query("scope")); value != "" {
		body["scope"] = value
	}
	if value := strings.TrimSpace(c.Query("scope_id")); value != "" {
		body["scope_id"] = value
	}
	if value := strings.TrimSpace(c.Query("tenant_id")); value != "" {
		body["tenant_id"] = value
	}
	if value := strings.TrimSpace(c.Query("org_id")); value != "" {
		body["org_id"] = value
	}
	if value := strings.TrimSpace(c.Query("user_id")); value != "" {
		body["user_id"] = value
	}
	return body
}

package admin

import (
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
)

type featureOverridesBinding struct {
	admin *Admin
}

func newFeatureOverridesBinding(a *Admin) boot.FeatureOverridesBinding {
	if a == nil {
		return nil
	}
	if _, ok := a.featureGate.(fggate.MutableFeatureGate); !ok {
		return nil
	}
	return &featureOverridesBinding{admin: a}
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

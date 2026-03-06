package handlers

import (
	"context"
	"strconv"
	"strings"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/stores"
	router "github.com/goliatone/go-router"
)

const (
	RateLimitOptionPrefix = "esign.rate_limit"

	RateLimitOptionSignerSessionMaxRequests = "esign.rate_limit.signer_session.max_requests"
	RateLimitOptionSignerSessionWindowSecs  = "esign.rate_limit.signer_session.window_seconds"
	RateLimitOptionSignerConsentMaxRequests = "esign.rate_limit.signer_consent.max_requests"
	RateLimitOptionSignerConsentWindowSecs  = "esign.rate_limit.signer_consent.window_seconds"
	RateLimitOptionSignerWriteMaxRequests   = "esign.rate_limit.signer_write.max_requests"
	RateLimitOptionSignerWriteWindowSecs    = "esign.rate_limit.signer_write.window_seconds"
	RateLimitOptionSignerSubmitMaxRequests  = "esign.rate_limit.signer_submit.max_requests"
	RateLimitOptionSignerSubmitWindowSecs   = "esign.rate_limit.signer_submit.window_seconds"
	RateLimitOptionAdminResendMaxRequests   = "esign.rate_limit.admin_resend.max_requests"
	RateLimitOptionAdminResendWindowSecs    = "esign.rate_limit.admin_resend.window_seconds"
)

type operationRateLimitOptionKeys struct {
	maxRequests string
	windowSecs  string
}

var rateLimitOptionKeysByOperation = map[string]operationRateLimitOptionKeys{
	OperationSignerSession: {maxRequests: RateLimitOptionSignerSessionMaxRequests, windowSecs: RateLimitOptionSignerSessionWindowSecs},
	OperationSignerConsent: {maxRequests: RateLimitOptionSignerConsentMaxRequests, windowSecs: RateLimitOptionSignerConsentWindowSecs},
	OperationSignerWrite:   {maxRequests: RateLimitOptionSignerWriteMaxRequests, windowSecs: RateLimitOptionSignerWriteWindowSecs},
	OperationSignerSubmit:  {maxRequests: RateLimitOptionSignerSubmitMaxRequests, windowSecs: RateLimitOptionSignerSubmitWindowSecs},
	OperationAdminResend:   {maxRequests: RateLimitOptionAdminResendMaxRequests, windowSecs: RateLimitOptionAdminResendWindowSecs},
}

// NewScopedRateLimitRuleResolver overlays plan-scoped user options on top of default rules.
func NewScopedRateLimitRuleResolver(store coreadmin.PreferencesStore, fallbackScope stores.Scope, defaults map[string]RateLimitRule) RateLimitRuleResolver {
	defaultRules := cloneRateLimitRules(defaults)
	return func(c router.Context, operation string) RateLimitRule {
		normalizedOp := strings.TrimSpace(strings.ToLower(operation))
		baseRule, ok := defaultRules[normalizedOp]
		if !ok || baseRule.MaxRequests <= 0 || baseRule.Window <= 0 {
			return RateLimitRule{}
		}
		if store == nil {
			return baseRule
		}
		keys, ok := rateLimitOptionKeysByOperation[normalizedOp]
		if !ok || keys.maxRequests == "" || keys.windowSecs == "" {
			return baseRule
		}
		scope := defaultScopeResolver(c, fallbackScope)
		prefScope := coreadmin.PreferenceScope{
			UserID:   resolveAdminUserID(c),
			TenantID: strings.TrimSpace(scope.TenantID),
			OrgID:    strings.TrimSpace(scope.OrgID),
		}
		snapshot, err := store.Resolve(resolveRateLimitOptionContext(c), coreadmin.PreferencesResolveInput{
			Scope:  prefScope,
			Levels: []coreadmin.PreferenceLevel{coreadmin.PreferenceLevelSystem, coreadmin.PreferenceLevelTenant, coreadmin.PreferenceLevelOrg, coreadmin.PreferenceLevelUser},
			Keys:   []string{keys.maxRequests, keys.windowSecs},
		})
		if err != nil {
			return baseRule
		}
		effective := snapshot.Effective
		if effective == nil {
			return baseRule
		}
		if resolved, ok := parsePositiveInt(effective[keys.maxRequests]); ok {
			baseRule.MaxRequests = resolved
		}
		if resolved, ok := parsePositiveInt(effective[keys.windowSecs]); ok {
			baseRule.Window = time.Duration(resolved) * time.Second
		}
		return baseRule
	}
}

func cloneRateLimitRules(in map[string]RateLimitRule) map[string]RateLimitRule {
	out := map[string]RateLimitRule{}
	for key, rule := range in {
		normalized := strings.TrimSpace(strings.ToLower(key))
		if normalized == "" {
			continue
		}
		out[normalized] = rule
	}
	return out
}

func resolveRateLimitOptionContext(c router.Context) context.Context {
	if c == nil || c.Context() == nil {
		return context.Background()
	}
	return c.Context()
}

func parsePositiveInt(value any) (int, bool) {
	switch typed := value.(type) {
	case int:
		return typed, typed > 0
	case int64:
		return int(typed), typed > 0
	case float64:
		parsed := int(typed)
		return parsed, parsed > 0
	case string:
		parsed, err := strconv.Atoi(strings.TrimSpace(typed))
		return parsed, err == nil && parsed > 0
	default:
		return 0, false
	}
}

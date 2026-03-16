package handlers

import (
	"strings"
	"sync"
	"time"
)

const (
	OperationSignerSession = "signer.session"
	OperationSignerConsent = "signer.consent"
	OperationSignerWrite   = "signer.write"
	OperationSignerSubmit  = "signer.submit"
	OperationAdminResend   = "admin.resend"
)

// RateLimitRule configures max requests per operation window.
type RateLimitRule struct {
	MaxRequests int
	Window      time.Duration
}

// RateLimitDecision captures allow/deny and retry metadata for the checked bucket.
type RateLimitDecision struct {
	Allowed    bool
	Operation  string
	Key        string
	Limit      int
	Remaining  int
	Window     time.Duration
	RetryAfter time.Duration
	ResetAt    time.Time
}

// SlidingWindowRateLimiter enforces per-operation and per-key request limits.
type SlidingWindowRateLimiter struct {
	mu       sync.Mutex
	now      func() time.Time
	rules    map[string]RateLimitRule
	requests map[string][]time.Time
}

func NewSlidingWindowRateLimiter(rules map[string]RateLimitRule) *SlidingWindowRateLimiter {
	clone := map[string]RateLimitRule{}
	for key, rule := range rules {
		clone[strings.TrimSpace(strings.ToLower(key))] = rule
	}
	return &SlidingWindowRateLimiter{
		now:      func() time.Time { return time.Now().UTC() },
		rules:    clone,
		requests: map[string][]time.Time{},
	}
}

func DefaultRateLimitRules() map[string]RateLimitRule {
	return map[string]RateLimitRule{
		OperationSignerSession: {MaxRequests: 60, Window: time.Minute},
		OperationSignerConsent: {MaxRequests: 30, Window: time.Minute},
		OperationSignerWrite:   {MaxRequests: 120, Window: time.Minute},
		OperationSignerSubmit:  {MaxRequests: 12, Window: time.Minute},
		OperationAdminResend:   {MaxRequests: 12, Window: time.Minute},
	}
}

func (r *SlidingWindowRateLimiter) Allow(operationKey, key string) bool {
	return r.Check(operationKey, key, RateLimitRule{}).Allowed
}

// Check evaluates request allowance for operation/key using an optional rule override.
// When override is empty, limiter defaults to its configured rule for the operation.
func (r *SlidingWindowRateLimiter) Check(operationKey, key string, override RateLimitRule) RateLimitDecision {
	if r == nil {
		return RateLimitDecision{Allowed: true}
	}
	opKey := strings.TrimSpace(strings.ToLower(operationKey))
	rule := override
	if rule.MaxRequests <= 0 || rule.Window <= 0 {
		var ok bool
		rule, ok = r.rules[opKey]
		if !ok || rule.MaxRequests <= 0 || rule.Window <= 0 {
			return RateLimitDecision{Allowed: true, Operation: opKey}
		}
	}
	key = strings.TrimSpace(strings.ToLower(key))
	if key == "" {
		key = "unknown"
	}
	bucketKey := opKey + "|" + key

	r.mu.Lock()
	defer r.mu.Unlock()

	now := r.now()
	windowStart := now.Add(-rule.Window)
	window := r.requests[bucketKey]
	kept := make([]time.Time, 0, len(window)+1)
	for _, ts := range window {
		if ts.After(windowStart) {
			kept = append(kept, ts)
		}
	}
	if len(kept) >= rule.MaxRequests {
		r.requests[bucketKey] = kept
		retryAfter, resetAt := computeRetryWindow(now, kept, rule.Window)
		return RateLimitDecision{
			Allowed:    false,
			Operation:  opKey,
			Key:        key,
			Limit:      rule.MaxRequests,
			Remaining:  0,
			Window:     rule.Window,
			RetryAfter: retryAfter,
			ResetAt:    resetAt,
		}
	}
	kept = append(kept, now)
	r.requests[bucketKey] = kept
	remaining := max(rule.MaxRequests-len(kept), 0)
	_, resetAt := computeRetryWindow(now, kept, rule.Window)
	return RateLimitDecision{
		Allowed:   true,
		Operation: opKey,
		Key:       key,
		Limit:     rule.MaxRequests,
		Remaining: remaining,
		Window:    rule.Window,
		ResetAt:   resetAt,
	}
}

// ResolveOperationForPath maps request path/method to the security operation rate-limit key.
func ResolveOperationForPath(method, requestPath string) string {
	method = strings.TrimSpace(strings.ToUpper(method))
	requestPath = strings.ToLower(strings.TrimSpace(requestPath))
	if strings.Contains(requestPath, "/signing/session/") {
		return OperationSignerSession
	}
	if strings.Contains(requestPath, "/signing/profile/") {
		return OperationSignerSession
	}
	if strings.Contains(requestPath, "/signing/signatures/") {
		return OperationSignerSession
	}
	if strings.Contains(requestPath, "/signing/consent/") {
		return OperationSignerConsent
	}
	if strings.Contains(requestPath, "/signing/field-values/") {
		return OperationSignerWrite
	}
	if strings.Contains(requestPath, "/signing/signature-upload/") {
		return OperationSignerWrite
	}
	if strings.Contains(requestPath, "/submit") {
		return OperationSignerSubmit
	}
	if method == "POST" && strings.Contains(requestPath, "/resend") {
		return OperationAdminResend
	}
	return ""
}

func computeRetryWindow(now time.Time, kept []time.Time, window time.Duration) (time.Duration, time.Time) {
	if len(kept) == 0 || window <= 0 {
		return 0, time.Time{}
	}
	resetAt := kept[0].Add(window)
	retryAfter := max(resetAt.Sub(now), 0)
	return retryAfter, resetAt
}

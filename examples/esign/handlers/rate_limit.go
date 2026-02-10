package handlers

import (
	"strings"
	"sync"
	"time"
)

const (
	OperationSignerSession = "signer.session"
	OperationSignerConsent = "signer.consent"
	OperationSignerSubmit  = "signer.submit"
	OperationAdminResend   = "admin.resend"
)

// RateLimitRule configures max requests per operation window.
type RateLimitRule struct {
	MaxRequests int
	Window      time.Duration
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
		OperationSignerSubmit:  {MaxRequests: 12, Window: time.Minute},
		OperationAdminResend:   {MaxRequests: 12, Window: time.Minute},
	}
}

func (r *SlidingWindowRateLimiter) Allow(operationKey, key string) bool {
	if r == nil {
		return true
	}
	opKey := strings.TrimSpace(strings.ToLower(operationKey))
	rule, ok := r.rules[opKey]
	if !ok || rule.MaxRequests <= 0 || rule.Window <= 0 {
		return true
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
		return false
	}
	kept = append(kept, now)
	r.requests[bucketKey] = kept
	return true
}

// ResolveOperationForPath maps request path/method to the security operation rate-limit key.
func ResolveOperationForPath(method, requestPath string) string {
	method = strings.TrimSpace(strings.ToUpper(method))
	requestPath = strings.ToLower(strings.TrimSpace(requestPath))
	if strings.Contains(requestPath, "/signing/session/") {
		return OperationSignerSession
	}
	if strings.Contains(requestPath, "/signing/consent/") {
		return OperationSignerConsent
	}
	if strings.Contains(requestPath, "/submit") {
		return OperationSignerSubmit
	}
	if method == "POST" && strings.Contains(requestPath, "/resend") {
		return OperationAdminResend
	}
	return ""
}

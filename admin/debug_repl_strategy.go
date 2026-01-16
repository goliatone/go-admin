package admin

import (
	"context"
	"crypto/subtle"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	DebugREPLOverrideKeyMetadata   = "override_key"
	DebugREPLOverrideTokenMetadata = "override_token"
)

// DebugREPLOverrideStrategy decides whether a request can override a disabled REPL.
type DebugREPLOverrideStrategy interface {
	Allows(ctx context.Context, req DebugREPLRequest) (bool, error)
}

// DebugREPLRequest captures request metadata for override strategies.
type DebugREPLRequest struct {
	UserID      string
	IP          string
	UserAgent   string
	Kind        string
	RequestedAt time.Time
	Metadata    map[string]any
}

// DenyAllStrategy denies all override attempts.
type DenyAllStrategy struct{}

func (DenyAllStrategy) Allows(_ context.Context, _ DebugREPLRequest) (bool, error) {
	return false, nil
}

// StaticKeyStrategy allows overrides when a shared key matches.
type StaticKeyStrategy struct {
	Key       string
	ExpiresAt time.Time
}

func (s StaticKeyStrategy) Allows(_ context.Context, req DebugREPLRequest) (bool, error) {
	if s.Key == "" {
		return false, nil
	}
	if !s.ExpiresAt.IsZero() && !req.RequestedAt.IsZero() && req.RequestedAt.After(s.ExpiresAt) {
		return false, nil
	}
	provided := debugREPLOverrideKey(req)
	if provided == "" {
		return false, nil
	}
	if subtle.ConstantTimeCompare([]byte(s.Key), []byte(provided)) != 1 {
		return false, nil
	}
	return true, nil
}

// SignedTokenStrategy allows overrides when a signed token validates.
type SignedTokenStrategy struct {
	Secret   []byte
	Audience string
	Issuer   string
}

func (s SignedTokenStrategy) Allows(_ context.Context, req DebugREPLRequest) (bool, error) {
	tokenString := debugREPLOverrideToken(req)
	if tokenString == "" || len(s.Secret) == 0 {
		return false, nil
	}
	opts := []jwt.ParserOption{}
	if s.Audience != "" {
		opts = append(opts, jwt.WithAudience(s.Audience))
	}
	if s.Issuer != "" {
		opts = append(opts, jwt.WithIssuer(s.Issuer))
	}
	claims := &jwt.RegisteredClaims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return s.Secret, nil
	}, opts...)
	if err != nil || token == nil || !token.Valid {
		return false, nil
	}
	return true, nil
}

func debugREPLOverrideKey(req DebugREPLRequest) string {
	if req.Metadata == nil {
		return ""
	}
	if key, ok := req.Metadata[DebugREPLOverrideKeyMetadata].(string); ok {
		return key
	}
	return ""
}

func debugREPLOverrideToken(req DebugREPLRequest) string {
	if req.Metadata == nil {
		return ""
	}
	if token, ok := req.Metadata[DebugREPLOverrideTokenMetadata].(string); ok {
		return token
	}
	return ""
}

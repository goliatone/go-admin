package quickstart

import (
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-notifications/pkg/links"
)

func TestNewNotificationsSecureLinkManagerDisabledConfig(t *testing.T) {
	manager, err := NewNotificationsSecureLinkManager(SecureLinkConfig{})
	if err != nil {
		t.Fatalf("expected nil error for disabled config, got %v", err)
	}
	if manager != nil {
		t.Fatal("expected nil manager for disabled config")
	}
}

func TestNewNotificationsSecureLinkManagerRoundtrip(t *testing.T) {
	cfg := testNotificationsSecureLinkConfig()

	manager, err := NewNotificationsSecureLinkManager(cfg)
	if err != nil {
		t.Fatalf("expected manager, got error: %v", err)
	}
	if manager == nil {
		t.Fatal("expected non-nil manager")
	}

	link, err := manager.Generate("action", links.SecureLinkPayload{
		"user_id": "user-1",
		"scope":   "password-reset",
	})
	if err != nil {
		t.Fatalf("generate failed: %v", err)
	}

	token := extractTokenFromURL(t, link, cfg.QueryKey)

	payload, err := manager.Validate(token)
	if err != nil {
		t.Fatalf("validate failed: %v", err)
	}
	if got := asString(payload["user_id"]); got != "user-1" {
		t.Fatalf("expected user_id user-1, got %q", got)
	}
	if got := asString(payload["scope"]); got != "password-reset" {
		t.Fatalf("expected scope password-reset, got %q", got)
	}

	resolved, err := manager.GetAndValidate(func(key string) string {
		if key != cfg.QueryKey {
			return ""
		}
		return token
	})
	if err != nil {
		t.Fatalf("GetAndValidate failed: %v", err)
	}
	if got := asString(resolved["user_id"]); got != "user-1" {
		t.Fatalf("expected user_id user-1, got %q", got)
	}
	if got := manager.GetExpiration(); got != cfg.Expiration {
		t.Fatalf("expected expiration %v, got %v", cfg.Expiration, got)
	}
}

func TestNewSecureLinkNotificationBuilderNilManager(t *testing.T) {
	builder := NewSecureLinkNotificationBuilder(nil)
	if builder != nil {
		t.Fatal("expected nil builder for nil manager")
	}
}

func testNotificationsSecureLinkConfig() SecureLinkConfig {
	return SecureLinkConfig{
		SigningKey: "0123456789abcdef0123456789abcdef",
		Expiration: 45 * time.Minute,
		BaseURL:    "https://example.com",
		QueryKey:   "token",
		AsQuery:    true,
		Routes: map[string]string{
			"action": "/action",
		},
	}
}

func extractTokenFromURL(t *testing.T, rawURL, queryKey string) string {
	t.Helper()

	parsed, err := url.Parse(rawURL)
	if err != nil {
		t.Fatalf("parse securelink: %v", err)
	}

	token := parsed.Query().Get(queryKey)
	if token != "" {
		return token
	}

	segments := strings.Split(strings.Trim(parsed.Path, "/"), "/")
	if len(segments) == 0 {
		t.Fatalf("token not found in URL: %s", rawURL)
	}
	return segments[len(segments)-1]
}

func asString(value any) string {
	if value == nil {
		return ""
	}
	text, _ := value.(string)
	return text
}

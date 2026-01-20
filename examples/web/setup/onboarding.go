package setup

import (
	"os"
	"strings"
)

const (
	FeatureUserInvites      = "users.invite"
	FeaturePasswordReset    = "users.password_reset"
	FeatureSelfRegistration = "users.signup"
)

// RegistrationMode governs whether self-registration is open, restricted, or disabled.
type RegistrationMode string

const (
	RegistrationClosed    RegistrationMode = "closed"
	RegistrationAllowlist RegistrationMode = "allowlist"
	RegistrationOpen      RegistrationMode = "open"
)

// RegistrationConfig controls self-registration guardrails.
type RegistrationConfig struct {
	Mode      RegistrationMode
	Allowlist []string
}

// DefaultRegistrationConfig returns a closed registration mode with a sample allowlist.
func DefaultRegistrationConfig() RegistrationConfig {
	return RegistrationConfig{
		Mode:      RegistrationClosed,
		Allowlist: []string{"example.com"},
	}
}

// AllowsEmail reports whether the email is permitted under the current allowlist.
func (c RegistrationConfig) AllowsEmail(email string) bool {
	if c.Mode != RegistrationAllowlist {
		return true
	}
	at := strings.Index(email, "@")
	if at <= 0 || at >= len(email)-1 {
		return false
	}
	domain := strings.ToLower(strings.TrimSpace(email[at+1:]))
	for _, item := range c.Allowlist {
		if strings.EqualFold(domain, strings.TrimSpace(item)) {
			return true
		}
	}
	return false
}

// PasswordPolicyHints returns UI hints for password requirements.
func PasswordPolicyHints() []string {
	defaultHints := []string{
		"Use at least 8 characters",
		"Mix letters, numbers, and symbols",
		"Avoid reused passwords",
	}

	raw := strings.TrimSpace(os.Getenv("ADMIN_PASSWORD_POLICY_HINTS"))
	if raw == "" {
		return defaultHints
	}

	parts := strings.Split(raw, ",")
	hints := make([]string, 0, len(parts))
	for _, item := range parts {
		trimmed := strings.TrimSpace(item)
		if trimmed != "" {
			hints = append(hints, trimmed)
		}
	}
	if len(hints) == 0 {
		return defaultHints
	}
	return hints
}

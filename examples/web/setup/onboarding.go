package setup

import "strings"

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

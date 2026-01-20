package setup

import (
	"os"
	"path"
	"strings"
	"time"

	"github.com/goliatone/go-users/adapter/securelink"
	"github.com/goliatone/go-users/command"
	userstypes "github.com/goliatone/go-users/pkg/types"
)

const (
	defaultSecureLinkKey        = "admin-demo-securelink-signing-key-change-me"
	defaultSecureLinkBaseURL    = "http://localhost:8080"
	defaultSecureLinkQueryKey   = "token"
	defaultSecureLinkExpiration = 72 * time.Hour
)

type secureLinkConfig struct {
	signingKey string
	expiration time.Duration
	baseURL    string
	queryKey   string
	asQuery    bool
	routes     map[string]string
}

func (c secureLinkConfig) GetSigningKey() string        { return c.signingKey }
func (c secureLinkConfig) GetExpiration() time.Duration { return c.expiration }
func (c secureLinkConfig) GetBaseURL() string           { return c.baseURL }
func (c secureLinkConfig) GetQueryKey() string          { return c.queryKey }
func (c secureLinkConfig) GetRoutes() map[string]string { return c.routes }
func (c secureLinkConfig) GetAsQuery() bool             { return c.asQuery }

// SecureLinkUIConfig exposes link parsing details for UI templates.
type SecureLinkUIConfig struct {
	QueryKey string
	AsQuery  bool
}

// NewSecureLinkManager builds a securelink manager for onboarding flows.
func NewSecureLinkManager() (userstypes.SecureLinkManager, error) {
	cfg := loadSecureLinkConfig()
	return securelink.NewManager(cfg)
}

// SecureLinkUIConfigFromEnv returns securelink parsing defaults for templates.
func SecureLinkUIConfigFromEnv() SecureLinkUIConfig {
	cfg := loadSecureLinkConfig()
	return SecureLinkUIConfig{
		QueryKey: cfg.queryKey,
		AsQuery:  cfg.asQuery,
	}
}

func loadSecureLinkConfig() secureLinkConfig {
	basePath := normalizeBasePath(os.Getenv("ADMIN_BASE_PATH"))
	baseURL := strings.TrimSpace(os.Getenv("ADMIN_SECURELINK_BASE_URL"))
	if baseURL == "" {
		baseURL = defaultSecureLinkBaseURL
	}

	signingKey := strings.TrimSpace(os.Getenv("ADMIN_SECURELINK_KEY"))
	if signingKey == "" {
		signingKey = defaultSecureLinkKey
	}

	queryKey := strings.TrimSpace(os.Getenv("ADMIN_SECURELINK_QUERY_KEY"))
	if queryKey == "" {
		queryKey = defaultSecureLinkQueryKey
	}

	asQuery := envBoolDefault("ADMIN_SECURELINK_AS_QUERY", true)
	expiration := envDurationDefault("ADMIN_SECURELINK_EXPIRATION", defaultSecureLinkExpiration)

	return secureLinkConfig{
		signingKey: signingKey,
		expiration: expiration,
		baseURL:    baseURL,
		queryKey:   queryKey,
		asQuery:    asQuery,
		routes: map[string]string{
			command.SecureLinkRouteInviteAccept:  path.Join(basePath, "invite"),
			command.SecureLinkRouteRegister:      path.Join(basePath, "register"),
			command.SecureLinkRoutePasswordReset: path.Join(basePath, "password-reset", "confirm"),
		},
	}
}

func envBoolDefault(key string, fallback bool) bool {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	switch strings.ToLower(raw) {
	case "true", "1", "yes", "y", "on":
		return true
	case "false", "0", "no", "n", "off":
		return false
	default:
		return fallback
	}
}

func envDurationDefault(key string, fallback time.Duration) time.Duration {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	if parsed, err := time.ParseDuration(raw); err == nil {
		return parsed
	}
	return fallback
}

func normalizeBasePath(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "/admin"
	}
	return "/" + strings.Trim(trimmed, "/")
}

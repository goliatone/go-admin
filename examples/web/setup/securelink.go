package setup

import (
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

// ResolveSecureLinkUIConfig resolves secure link UI parsing settings from runtime config.
func ResolveSecureLinkUIConfig() SecureLinkUIConfig {
	return secureLinkUIConfigFromConfig(loadSecureLinkConfig())
}

func secureLinkUIConfigFromConfig(cfg secureLinkConfig) SecureLinkUIConfig {
	return SecureLinkUIConfig{
		QueryKey: cfg.queryKey,
		AsQuery:  cfg.asQuery,
	}
}

func loadSecureLinkConfig() secureLinkConfig {
	runtime := runtimeConfig()
	basePath := normalizeBasePath(runtime.SecureLink.BasePath)
	baseURL := strings.TrimSpace(runtime.SecureLink.BaseURL)
	if baseURL == "" {
		baseURL = defaultSecureLinkBaseURL
	}

	signingKey := strings.TrimSpace(runtime.SecureLink.SigningKey)
	if signingKey == "" {
		signingKey = defaultSecureLinkKey
	}

	queryKey := strings.TrimSpace(runtime.SecureLink.QueryKey)
	if queryKey == "" {
		queryKey = defaultSecureLinkQueryKey
	}

	expiration := runtime.SecureLink.Expiration
	if expiration <= 0 {
		expiration = defaultSecureLinkExpiration
	}

	return secureLinkConfig{
		signingKey: signingKey,
		expiration: expiration,
		baseURL:    baseURL,
		queryKey:   queryKey,
		asQuery:    runtime.SecureLink.AsQuery,
		routes: map[string]string{
			command.SecureLinkRouteInviteAccept:  path.Join(basePath, "invite"),
			command.SecureLinkRouteRegister:      path.Join(basePath, "register"),
			command.SecureLinkRoutePasswordReset: path.Join(basePath, "password-reset", "confirm"),
		},
	}
}

func normalizeBasePath(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "/admin"
	}
	return "/" + strings.Trim(trimmed, "/")
}

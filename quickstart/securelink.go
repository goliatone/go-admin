package quickstart

import (
	"errors"
	"os"
	"path"
	"strings"
	"time"

	linknotifications "github.com/goliatone/go-notifications/adapters/securelink"
	"github.com/goliatone/go-notifications/pkg/links"
	urlsecurelink "github.com/goliatone/go-urlkit/securelink"
	linkusers "github.com/goliatone/go-users/adapter/securelink"
	"github.com/goliatone/go-users/command"
	userstypes "github.com/goliatone/go-users/pkg/types"
	userssvc "github.com/goliatone/go-users/service"
)

const (
	defaultSecureLinkBaseURL    = "http://localhost:8080"
	defaultSecureLinkQueryKey   = "token"
	defaultSecureLinkExpiration = 72 * time.Hour
)

// SecureLinkConfig captures securelink defaults for onboarding flows.
type SecureLinkConfig struct {
	SigningKey string
	Expiration time.Duration
	BaseURL    string
	QueryKey   string
	AsQuery    bool
	Routes     map[string]string
}

func (c SecureLinkConfig) GetSigningKey() string        { return c.SigningKey }
func (c SecureLinkConfig) GetExpiration() time.Duration { return c.Expiration }
func (c SecureLinkConfig) GetBaseURL() string           { return c.BaseURL }
func (c SecureLinkConfig) GetQueryKey() string          { return c.QueryKey }
func (c SecureLinkConfig) GetRoutes() map[string]string { return c.Routes }
func (c SecureLinkConfig) GetAsQuery() bool             { return c.AsQuery }

// Enabled reports whether the config has enough data to build a manager.
func (c SecureLinkConfig) Enabled() bool {
	return strings.TrimSpace(c.SigningKey) != ""
}

// SecureLinkConfigFromEnv builds a securelink config from environment variables.
func SecureLinkConfigFromEnv(basePath string) SecureLinkConfig {
	if strings.TrimSpace(basePath) == "" {
		basePath = os.Getenv("ADMIN_BASE_PATH")
	}
	basePath = normalizeBasePath(basePath)

	baseURL := strings.TrimSpace(os.Getenv("ADMIN_SECURELINK_BASE_URL"))
	if baseURL == "" {
		baseURL = defaultSecureLinkBaseURL
	}

	signingKey := strings.TrimSpace(os.Getenv("ADMIN_SECURELINK_KEY"))

	queryKey := strings.TrimSpace(os.Getenv("ADMIN_SECURELINK_QUERY_KEY"))
	if queryKey == "" {
		queryKey = defaultSecureLinkQueryKey
	}

	asQuery := envBoolDefault("ADMIN_SECURELINK_AS_QUERY", true)
	expiration := envDurationDefault("ADMIN_SECURELINK_EXPIRATION", defaultSecureLinkExpiration)

	return SecureLinkConfig{
		SigningKey: signingKey,
		Expiration: expiration,
		BaseURL:    baseURL,
		QueryKey:   queryKey,
		AsQuery:    asQuery,
		Routes:     DefaultSecureLinkRoutes(basePath),
	}
}

// DefaultSecureLinkRoutes builds the route map used by securelink managers.
func DefaultSecureLinkRoutes(basePath string) map[string]string {
	basePath = normalizeBasePath(basePath)
	return map[string]string{
		command.SecureLinkRouteInviteAccept:  path.Join(basePath, "invite"),
		command.SecureLinkRouteRegister:      path.Join(basePath, "register"),
		command.SecureLinkRoutePasswordReset: path.Join(basePath, "password-reset", "confirm"),
	}
}

// SecureLinkUIConfig exposes link parsing details for templates.
type SecureLinkUIConfig struct {
	QueryKey string
	AsQuery  bool
}

// SecureLinkUIConfigFromEnv reads securelink parsing defaults from env.
func SecureLinkUIConfigFromEnv(basePath string) SecureLinkUIConfig {
	cfg := SecureLinkConfigFromEnv(basePath)
	return SecureLinkUIConfig{
		QueryKey: cfg.QueryKey,
		AsQuery:  cfg.AsQuery,
	}
}

// NewSecureLinkManager builds a go-users compatible securelink manager.
func NewSecureLinkManager(cfg SecureLinkConfig) (userstypes.SecureLinkManager, error) {
	if !cfg.Enabled() {
		return nil, nil
	}
	return linkusers.NewManager(cfg)
}

// NewNotificationsSecureLinkManager builds a go-notifications compatible securelink manager.
func NewNotificationsSecureLinkManager(cfg SecureLinkConfig) (links.SecureLinkManager, error) {
	if !cfg.Enabled() {
		return nil, nil
	}
	manager, err := urlsecurelink.NewManagerFromConfig(cfg)
	if err != nil {
		return nil, err
	}
	return notificationSecureLinkManager{inner: manager}, nil
}

// SecureLinkUsersOption customizes go-users securelink wiring.
type SecureLinkUsersOption func(*secureLinkUsersOptions)

type secureLinkUsersOptions struct {
	inviteRoute        string
	registrationRoute  string
	passwordResetRoute string
}

// WithSecureLinkInviteRoute overrides the invite accept route key used by go-users.
func WithSecureLinkInviteRoute(route string) SecureLinkUsersOption {
	return func(opts *secureLinkUsersOptions) {
		if opts == nil {
			return
		}
		route = strings.TrimSpace(route)
		if route != "" {
			opts.inviteRoute = route
		}
	}
}

// WithSecureLinkRegistrationRoute overrides the registration route key used by go-users.
func WithSecureLinkRegistrationRoute(route string) SecureLinkUsersOption {
	return func(opts *secureLinkUsersOptions) {
		if opts == nil {
			return
		}
		route = strings.TrimSpace(route)
		if route != "" {
			opts.registrationRoute = route
		}
	}
}

// WithSecureLinkPasswordResetRoute overrides the password reset route key used by go-users.
func WithSecureLinkPasswordResetRoute(route string) SecureLinkUsersOption {
	return func(opts *secureLinkUsersOptions) {
		if opts == nil {
			return
		}
		route = strings.TrimSpace(route)
		if route != "" {
			opts.passwordResetRoute = route
		}
	}
}

// ApplySecureLinkManager wires securelink settings into go-users config.
func ApplySecureLinkManager(cfg *userssvc.Config, manager userstypes.SecureLinkManager, opts ...SecureLinkUsersOption) {
	if cfg == nil {
		return
	}
	options := secureLinkUsersOptions{
		inviteRoute:        command.SecureLinkRouteInviteAccept,
		registrationRoute:  command.SecureLinkRouteRegister,
		passwordResetRoute: command.SecureLinkRoutePasswordReset,
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}
	cfg.SecureLinkManager = manager
	cfg.InviteLinkRoute = options.inviteRoute
	cfg.RegistrationLinkRoute = options.registrationRoute
	cfg.PasswordResetLinkRoute = options.passwordResetRoute
}

// SecureLinkManagerSetter allows injecting securelink managers into host components.
type SecureLinkManagerSetter interface {
	WithSecureLinkManager(userstypes.SecureLinkManager)
}

// ApplySecureLinkManagerToAuth wires the securelink manager into go-auth style handlers.
func ApplySecureLinkManagerToAuth(target SecureLinkManagerSetter, manager userstypes.SecureLinkManager) {
	if target == nil || manager == nil {
		return
	}
	target.WithSecureLinkManager(manager)
}

// NewSecureLinkNotificationBuilder builds a securelink link builder for go-notifications.
func NewSecureLinkNotificationBuilder(manager links.SecureLinkManager, opts ...linknotifications.Option) links.LinkBuilder {
	if manager == nil {
		return nil
	}
	return linknotifications.NewBuilder(manager, opts...)
}

type notificationSecureLinkManager struct {
	inner urlsecurelink.Manager
}

func (m notificationSecureLinkManager) Generate(route string, payloads ...links.SecureLinkPayload) (string, error) {
	if m.inner == nil {
		return "", errors.New("securelink manager is required")
	}
	if len(payloads) == 0 {
		return m.inner.Generate(route)
	}
	converted := make([]urlsecurelink.Payload, len(payloads))
	for i, payload := range payloads {
		converted[i] = urlsecurelink.Payload(payload)
	}
	return m.inner.Generate(route, converted...)
}

func (m notificationSecureLinkManager) Validate(token string) (map[string]any, error) {
	if m.inner == nil {
		return nil, errors.New("securelink manager is required")
	}
	return m.inner.Validate(token)
}

func (m notificationSecureLinkManager) GetAndValidate(fn func(string) string) (links.SecureLinkPayload, error) {
	if m.inner == nil {
		return nil, errors.New("securelink manager is required")
	}
	payload, err := m.inner.GetAndValidate(fn)
	if payload == nil {
		return nil, err
	}
	return links.SecureLinkPayload(payload), err
}

func (m notificationSecureLinkManager) GetExpiration() time.Duration {
	if m.inner == nil {
		return 0
	}
	return m.inner.GetExpiration()
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

package quickstart

import (
	"fmt"
	"path"
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

// OnboardingRouteKey identifies a specific onboarding endpoint.
type OnboardingRouteKey string

const (
	OnboardingRouteInvite               OnboardingRouteKey = "invite"
	OnboardingRouteInviteVerify         OnboardingRouteKey = "invite.verify"
	OnboardingRouteInviteAccept         OnboardingRouteKey = "invite.accept"
	OnboardingRouteRegister             OnboardingRouteKey = "register"
	OnboardingRouteRegisterConfirm      OnboardingRouteKey = "register.confirm"
	OnboardingRoutePasswordResetRequest OnboardingRouteKey = "password.reset.request"
	OnboardingRoutePasswordResetConfirm OnboardingRouteKey = "password.reset.confirm"
	OnboardingRouteTokenMetadata        OnboardingRouteKey = "token.metadata"
)

// OnboardingHandlers provides handlers for onboarding routes.
type OnboardingHandlers struct {
	Invite               router.HandlerFunc `json:"invite"`
	VerifyInvite         router.HandlerFunc `json:"verify_invite"`
	AcceptInvite         router.HandlerFunc `json:"accept_invite"`
	SelfRegister         router.HandlerFunc `json:"self_register"`
	ConfirmRegistration  router.HandlerFunc `json:"confirm_registration"`
	RequestPasswordReset router.HandlerFunc `json:"request_password_reset"`
	ConfirmPasswordReset router.HandlerFunc `json:"confirm_password_reset"`
	TokenMetadata        router.HandlerFunc `json:"token_metadata"`
}

// OnboardingRoutePaths captures full route paths for onboarding endpoints.
type OnboardingRoutePaths struct {
	Invite               string `json:"invite"`
	InviteVerify         string `json:"invite_verify"`
	InviteAccept         string `json:"invite_accept"`
	Register             string `json:"register"`
	RegisterConfirm      string `json:"register_confirm"`
	PasswordResetRequest string `json:"password_reset_request"`
	PasswordResetConfirm string `json:"password_reset_confirm"`
	TokenMetadata        string `json:"token_metadata"`
}

// OnboardingRouteOption customizes onboarding route registration.
type OnboardingRouteOption func(*onboardingRouteOptions)

type onboardingRouteOptions struct {
	basePath          string
	paths             OnboardingRoutePaths
	auth              admin.HandlerAuthenticator
	protected         map[OnboardingRouteKey]bool
	browserProtection *AuthUIBrowserProtection
}

// WithOnboardingBasePath overrides the onboarding API base path.
func WithOnboardingBasePath(basePath string) OnboardingRouteOption {
	return func(opts *onboardingRouteOptions) {
		if opts != nil {
			opts.basePath = strings.TrimSpace(basePath)
		}
	}
}

// WithOnboardingRoutePaths overrides specific onboarding route paths.
func WithOnboardingRoutePaths(paths OnboardingRoutePaths) OnboardingRouteOption {
	return func(opts *onboardingRouteOptions) {
		if opts != nil {
			opts.paths = mergeOnboardingPaths(opts.paths, paths)
		}
	}
}

// WithOnboardingAuth configures the handler authenticator for protected routes.
func WithOnboardingAuth(auth admin.HandlerAuthenticator) OnboardingRouteOption {
	return func(opts *onboardingRouteOptions) {
		if opts != nil {
			opts.auth = auth
		}
	}
}

// WithOnboardingBrowserProtection reuses the public Auth UI browser CSRF
// contract that issued tokens to registration and password-reset pages.
func WithOnboardingBrowserProtection(protection *AuthUIBrowserProtection) OnboardingRouteOption {
	return func(opts *onboardingRouteOptions) {
		if opts != nil && protection != nil {
			opts.browserProtection = protection
		}
	}
}

// WithOnboardingProtectedRoutes overrides which routes should be auth-wrapped.
func WithOnboardingProtectedRoutes(keys ...OnboardingRouteKey) OnboardingRouteOption {
	return func(opts *onboardingRouteOptions) {
		if opts == nil {
			return
		}
		opts.protected = map[OnboardingRouteKey]bool{}
		for _, key := range keys {
			opts.protected[key] = true
		}
	}
}

// DefaultOnboardingRoutePaths builds onboarding API paths from the base path.
func DefaultOnboardingRoutePaths(basePath string) OnboardingRoutePaths {
	if strings.TrimSpace(basePath) == "" {
		basePath = "/"
	}
	return OnboardingRoutePaths{
		Invite:               path.Join(basePath, "invite"),
		InviteVerify:         path.Join(basePath, "invite", "verify"),
		InviteAccept:         path.Join(basePath, "invite", "accept"),
		Register:             path.Join(basePath, "register"),
		RegisterConfirm:      path.Join(basePath, "register", "confirm"),
		PasswordResetRequest: path.Join(basePath, "password", "reset", "request"),
		PasswordResetConfirm: path.Join(basePath, "password", "reset", "confirm"),
		TokenMetadata:        path.Join(basePath, "token", "metadata"),
	}
}

// RegisterOnboardingRoutes registers onboarding API endpoints.
func RegisterOnboardingRoutes[T any](r router.Router[T], cfg admin.Config, handlers OnboardingHandlers, opts ...OnboardingRouteOption) error {
	if r == nil {
		return fmt.Errorf("router is required")
	}

	options := onboardingRouteOptions{
		basePath: path.Join(cfg.BasePath, "api", "onboarding"),
		protected: map[OnboardingRouteKey]bool{
			OnboardingRouteInvite: true,
		},
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}

	if strings.TrimSpace(options.basePath) == "" {
		options.basePath = "/"
	}
	defaultPaths := DefaultOnboardingRoutePaths(options.basePath)
	options.paths = mergeOnboardingPaths(defaultPaths, options.paths)
	protection := options.browserProtection
	if protection == nil {
		var err error
		protection, err = NewAuthUIBrowserProtection(cfg)
		if err != nil {
			return err
		}
	}

	wrap := func(key OnboardingRouteKey, handler router.HandlerFunc) router.HandlerFunc {
		if handler == nil {
			return nil
		}
		if options.auth != nil && options.protected[key] {
			return options.auth.WrapHandler(handler)
		}
		if onboardingRouteUsesPublicBrowserCSRF(key) {
			return protection.WrapAPI(handler)
		}
		return handler
	}

	registerOptionalPostRoute(r, options.paths.Invite, wrap(OnboardingRouteInvite, handlers.Invite))
	registerOptionalGetRoute(r, options.paths.InviteVerify, handlers.VerifyInvite)
	registerOptionalPostRoute(r, options.paths.InviteAccept, wrap(OnboardingRouteInviteAccept, handlers.AcceptInvite))
	registerOptionalPostRoute(r, options.paths.Register, wrap(OnboardingRouteRegister, handlers.SelfRegister))
	registerOptionalPostRoute(r, options.paths.RegisterConfirm, wrap(OnboardingRouteRegisterConfirm, handlers.ConfirmRegistration))
	registerOptionalPostRoute(r, options.paths.PasswordResetRequest, wrap(OnboardingRoutePasswordResetRequest, handlers.RequestPasswordReset))
	registerOptionalPostRoute(r, options.paths.PasswordResetConfirm, wrap(OnboardingRoutePasswordResetConfirm, handlers.ConfirmPasswordReset))
	registerOptionalGetRoute(r, options.paths.TokenMetadata, handlers.TokenMetadata)

	return nil
}

func onboardingRouteUsesPublicBrowserCSRF(key OnboardingRouteKey) bool {
	switch key {
	case OnboardingRouteRegister,
		OnboardingRouteRegisterConfirm,
		OnboardingRoutePasswordResetRequest,
		OnboardingRoutePasswordResetConfirm:
		return true
	default:
		return false
	}
}

func registerOptionalGetRoute[T any](r router.Router[T], route string, handler router.HandlerFunc) {
	if handler != nil {
		r.Get(route, handler)
	}
}

func registerOptionalPostRoute[T any](r router.Router[T], route string, handler router.HandlerFunc) {
	if handler != nil {
		r.Post(route, handler)
	}
}

func mergeOnboardingPaths(base, override OnboardingRoutePaths) OnboardingRoutePaths {
	if strings.TrimSpace(override.Invite) != "" {
		base.Invite = override.Invite
	}
	if strings.TrimSpace(override.InviteVerify) != "" {
		base.InviteVerify = override.InviteVerify
	}
	if strings.TrimSpace(override.InviteAccept) != "" {
		base.InviteAccept = override.InviteAccept
	}
	if strings.TrimSpace(override.Register) != "" {
		base.Register = override.Register
	}
	if strings.TrimSpace(override.RegisterConfirm) != "" {
		base.RegisterConfirm = override.RegisterConfirm
	}
	if strings.TrimSpace(override.PasswordResetRequest) != "" {
		base.PasswordResetRequest = override.PasswordResetRequest
	}
	if strings.TrimSpace(override.PasswordResetConfirm) != "" {
		base.PasswordResetConfirm = override.PasswordResetConfirm
	}
	if strings.TrimSpace(override.TokenMetadata) != "" {
		base.TokenMetadata = override.TokenMetadata
	}
	return base
}

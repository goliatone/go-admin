package quickstart

import (
	"fmt"
	"path"
	"strings"

	"github.com/gofiber/fiber/v2"
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
	Invite               router.HandlerFunc
	VerifyInvite         router.HandlerFunc
	AcceptInvite         router.HandlerFunc
	SelfRegister         router.HandlerFunc
	ConfirmRegistration  router.HandlerFunc
	RequestPasswordReset router.HandlerFunc
	ConfirmPasswordReset router.HandlerFunc
	TokenMetadata        router.HandlerFunc
}

// OnboardingRoutePaths captures full route paths for onboarding endpoints.
type OnboardingRoutePaths struct {
	Invite               string
	InviteVerify         string
	InviteAccept         string
	Register             string
	RegisterConfirm      string
	PasswordResetRequest string
	PasswordResetConfirm string
	TokenMetadata        string
}

// OnboardingRouteOption customizes onboarding route registration.
type OnboardingRouteOption func(*onboardingRouteOptions)

type onboardingRouteOptions struct {
	basePath  string
	paths     OnboardingRoutePaths
	auth      admin.HandlerAuthenticator
	protected map[OnboardingRouteKey]bool
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
func RegisterOnboardingRoutes(r router.Router[*fiber.App], cfg admin.Config, handlers OnboardingHandlers, opts ...OnboardingRouteOption) error {
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

	wrap := func(key OnboardingRouteKey, handler router.HandlerFunc) router.HandlerFunc {
		if handler == nil {
			return nil
		}
		if options.auth != nil && options.protected[key] {
			return options.auth.WrapHandler(handler)
		}
		return handler
	}

	if handler := wrap(OnboardingRouteInvite, handlers.Invite); handler != nil {
		r.Post(options.paths.Invite, handler)
	}
	if handlers.VerifyInvite != nil {
		r.Get(options.paths.InviteVerify, handlers.VerifyInvite)
	}
	if handlers.AcceptInvite != nil {
		r.Post(options.paths.InviteAccept, handlers.AcceptInvite)
	}
	if handlers.SelfRegister != nil {
		r.Post(options.paths.Register, handlers.SelfRegister)
	}
	if handlers.ConfirmRegistration != nil {
		r.Post(options.paths.RegisterConfirm, handlers.ConfirmRegistration)
	}
	if handlers.RequestPasswordReset != nil {
		r.Post(options.paths.PasswordResetRequest, handlers.RequestPasswordReset)
	}
	if handlers.ConfirmPasswordReset != nil {
		r.Post(options.paths.PasswordResetConfirm, handlers.ConfirmPasswordReset)
	}
	if handlers.TokenMetadata != nil {
		r.Get(options.paths.TokenMetadata, handlers.TokenMetadata)
	}

	return nil
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

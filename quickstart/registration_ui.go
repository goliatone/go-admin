package quickstart

import (
	"fmt"
	"path"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	goerrors "github.com/goliatone/go-errors"
	fggate "github.com/goliatone/go-featuregate/gate"
	router "github.com/goliatone/go-router"
)

// RegistrationUIViewContextBuilder mutates the view context for registration routes.
type RegistrationUIViewContextBuilder func(ctx router.ViewContext, c router.Context) router.ViewContext

// RegistrationUIOption customizes the registration UI route.
type RegistrationUIOption func(*registrationUIOptions)

type registrationUIOptions struct {
	basePath            string
	registerPath        string
	passwordResetPath   string
	template            string
	title               string
	registrationEnabled func(admin.Config) bool
	registrationMode    func(admin.Config) string
	viewContext         RegistrationUIViewContextBuilder
	themeAssets         map[string]string
	themeAssetPrefix    string
	featureGate         fggate.FeatureGate
}

// WithRegistrationUIBasePath overrides the base path used by registration UI routes.
func WithRegistrationUIBasePath(basePath string) RegistrationUIOption {
	return func(opts *registrationUIOptions) {
		if opts != nil {
			opts.basePath = strings.TrimSpace(basePath)
		}
	}
}

// WithRegistrationUIRegisterPath overrides the registration route path.
func WithRegistrationUIRegisterPath(route string) RegistrationUIOption {
	return func(opts *registrationUIOptions) {
		if opts != nil {
			opts.registerPath = strings.TrimSpace(route)
		}
	}
}

// WithRegistrationUIPasswordResetPath overrides the password reset route path.
func WithRegistrationUIPasswordResetPath(route string) RegistrationUIOption {
	return func(opts *registrationUIOptions) {
		if opts != nil {
			opts.passwordResetPath = strings.TrimSpace(route)
		}
	}
}

// WithRegistrationUITemplate overrides the registration template name.
func WithRegistrationUITemplate(name string) RegistrationUIOption {
	return func(opts *registrationUIOptions) {
		if opts == nil {
			return
		}
		name = strings.TrimSpace(name)
		if name != "" {
			opts.template = name
		}
	}
}

// WithRegistrationUITitle overrides the registration view title.
func WithRegistrationUITitle(title string) RegistrationUIOption {
	return func(opts *registrationUIOptions) {
		if opts == nil {
			return
		}
		title = strings.TrimSpace(title)
		if title != "" {
			opts.title = title
		}
	}
}

// WithRegistrationUIEnabled overrides the self-registration feature guard.
func WithRegistrationUIEnabled(fn func(admin.Config) bool) RegistrationUIOption {
	return func(opts *registrationUIOptions) {
		if opts != nil && fn != nil {
			opts.registrationEnabled = fn
		}
	}
}

// WithRegistrationUIFeatureGate sets the feature gate used for default guards.
func WithRegistrationUIFeatureGate(gate fggate.FeatureGate) RegistrationUIOption {
	return func(opts *registrationUIOptions) {
		if opts != nil {
			opts.featureGate = gate
		}
	}
}

// WithRegistrationUIMode overrides the registration mode label in the view context.
func WithRegistrationUIMode(fn func(admin.Config) string) RegistrationUIOption {
	return func(opts *registrationUIOptions) {
		if opts != nil && fn != nil {
			opts.registrationMode = fn
		}
	}
}

// WithRegistrationUIViewContextBuilder overrides the default view context builder.
func WithRegistrationUIViewContextBuilder(builder RegistrationUIViewContextBuilder) RegistrationUIOption {
	return func(opts *registrationUIOptions) {
		if opts != nil && builder != nil {
			opts.viewContext = builder
		}
	}
}

// WithRegistrationUIThemeAssets sets theme assets (logo, favicon, etc.) for registration UI templates.
// The prefix is prepended to each asset filename to form the full URL path.
// Assets are exposed in templates as theme.assets.logo, theme.assets.favicon, etc.
func WithRegistrationUIThemeAssets(prefix string, assets map[string]string) RegistrationUIOption {
	return func(opts *registrationUIOptions) {
		if opts != nil {
			opts.themeAssetPrefix = prefix
			opts.themeAssets = assets
		}
	}
}

// RegisterRegistrationUIRoutes registers the registration UI route.
func RegisterRegistrationUIRoutes(r router.Router[*fiber.App], cfg admin.Config, opts ...RegistrationUIOption) error {
	if r == nil {
		return fmt.Errorf("router is required")
	}

	options := registrationUIOptions{
		basePath: strings.TrimSpace(cfg.BasePath),
		template: "register",
		title:    strings.TrimSpace(cfg.Title),
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}

	if options.basePath == "" {
		options.basePath = "/"
	}
	if options.registerPath == "" {
		options.registerPath = path.Join(options.basePath, "register")
	}
	if options.passwordResetPath == "" {
		options.passwordResetPath = path.Join(options.basePath, "password-reset")
	}
	if options.title == "" {
		options.title = "Register"
	}
	if options.viewContext == nil {
		options.viewContext = func(ctx router.ViewContext, _ router.Context) router.ViewContext { return ctx }
	}

	registrationEnabled := false
	if options.registrationEnabled != nil {
		registrationEnabled = options.registrationEnabled(cfg)
	} else {
		registrationEnabled = featureEnabled(options.featureGate, "users.signup")
	}
	registrationMode := ""
	if options.registrationMode != nil {
		registrationMode = strings.TrimSpace(options.registrationMode(cfg))
	}
	authState := AuthUIStateFromGate(options.featureGate)
	authState.SelfRegistrationEnabled = registrationEnabled
	authSnapshot := authUISnapshot(authState)
	authScope := fggate.ScopeSet{System: true}

	r.Get(options.registerPath, func(c router.Context) error {
		if !registrationEnabled {
			return goerrors.New("registration disabled", goerrors.CategoryAuthz).
				WithCode(fiber.StatusForbidden).
				WithTextCode("FEATURE_DISABLED")
		}
		viewCtx := AuthUIViewContext(cfg, authState, AuthUIPaths{
			BasePath:          options.basePath,
			PasswordResetPath: options.passwordResetPath,
			PasswordResetConfirmPath: path.Join(options.passwordResetPath, "confirm"),
			RegisterPath:      options.registerPath,
		})
		viewCtx["title"] = options.title
		viewCtx["registration_mode"] = registrationMode
		viewCtx = WithAuthUIViewThemeAssets(viewCtx, options.themeAssets, options.themeAssetPrefix)
		viewCtx = WithFeatureTemplateContext(viewCtx, c.Context(), authScope, authSnapshot)
		viewCtx = options.viewContext(viewCtx, c)
		return c.Render(options.template, viewCtx)
	})

	return nil
}

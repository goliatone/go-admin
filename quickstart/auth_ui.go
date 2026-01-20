package quickstart

import (
	"fmt"
	"path"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	auth "github.com/goliatone/go-auth"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

// AuthUIViewContextBuilder mutates the view context for auth UI routes.
type AuthUIViewContextBuilder func(ctx router.ViewContext, c router.Context) router.ViewContext

// AuthUIOption customizes the auth UI routes.
type AuthUIOption func(*authUIOptions)

type authUIOptions struct {
	basePath              string
	loginPath             string
	logoutPath            string
	passwordResetPath     string
	registerPath          string
	loginRedirectPath     string
	logoutRedirectPath    string
	loginTemplate         string
	passwordResetTemplate string
	loginTitle            string
	passwordResetTitle    string
	cookie                router.Cookie
	passwordResetEnabled  func(admin.Config) bool
	selfRegistrationEnabled func(admin.Config) bool
	viewContext           AuthUIViewContextBuilder
}

// WithAuthUIBasePath overrides the base path used by auth UI routes.
func WithAuthUIBasePath(basePath string) AuthUIOption {
	return func(opts *authUIOptions) {
		if opts != nil {
			opts.basePath = strings.TrimSpace(basePath)
		}
	}
}

// WithAuthUILoginPath overrides the login route path.
func WithAuthUILoginPath(route string) AuthUIOption {
	return func(opts *authUIOptions) {
		if opts != nil {
			opts.loginPath = strings.TrimSpace(route)
		}
	}
}

// WithAuthUILogoutPath overrides the logout route path.
func WithAuthUILogoutPath(route string) AuthUIOption {
	return func(opts *authUIOptions) {
		if opts != nil {
			opts.logoutPath = strings.TrimSpace(route)
		}
	}
}

// WithAuthUIPasswordResetPath overrides the password reset route path.
func WithAuthUIPasswordResetPath(route string) AuthUIOption {
	return func(opts *authUIOptions) {
		if opts != nil {
			opts.passwordResetPath = strings.TrimSpace(route)
		}
	}
}

// WithAuthUILoginRedirect overrides the redirect path after login.
func WithAuthUILoginRedirect(route string) AuthUIOption {
	return func(opts *authUIOptions) {
		if opts != nil {
			opts.loginRedirectPath = strings.TrimSpace(route)
		}
	}
}

// WithAuthUILogoutRedirect overrides the redirect path after logout.
func WithAuthUILogoutRedirect(route string) AuthUIOption {
	return func(opts *authUIOptions) {
		if opts != nil {
			opts.logoutRedirectPath = strings.TrimSpace(route)
		}
	}
}

// WithAuthUITemplates overrides the login and password reset templates.
func WithAuthUITemplates(loginTemplate, passwordResetTemplate string) AuthUIOption {
	return func(opts *authUIOptions) {
		if opts == nil {
			return
		}
		if strings.TrimSpace(loginTemplate) != "" {
			opts.loginTemplate = strings.TrimSpace(loginTemplate)
		}
		if strings.TrimSpace(passwordResetTemplate) != "" {
			opts.passwordResetTemplate = strings.TrimSpace(passwordResetTemplate)
		}
	}
}

// WithAuthUITitles overrides the view titles for login and password reset.
func WithAuthUITitles(loginTitle, passwordResetTitle string) AuthUIOption {
	return func(opts *authUIOptions) {
		if opts == nil {
			return
		}
		if strings.TrimSpace(loginTitle) != "" {
			opts.loginTitle = strings.TrimSpace(loginTitle)
		}
		if strings.TrimSpace(passwordResetTitle) != "" {
			opts.passwordResetTitle = strings.TrimSpace(passwordResetTitle)
		}
	}
}

// WithAuthUICookie overrides the auth cookie defaults.
func WithAuthUICookie(cookie router.Cookie) AuthUIOption {
	return func(opts *authUIOptions) {
		if opts != nil {
			opts.cookie = cookie
		}
	}
}

// WithAuthUIPasswordResetEnabled overrides the password reset feature guard.
func WithAuthUIPasswordResetEnabled(fn func(admin.Config) bool) AuthUIOption {
	return func(opts *authUIOptions) {
		if opts != nil && fn != nil {
			opts.passwordResetEnabled = fn
		}
	}
}

// WithAuthUISelfRegistrationEnabled overrides the self-registration feature guard.
func WithAuthUISelfRegistrationEnabled(fn func(admin.Config) bool) AuthUIOption {
	return func(opts *authUIOptions) {
		if opts != nil && fn != nil {
			opts.selfRegistrationEnabled = fn
		}
	}
}

// WithAuthUIRegisterPath overrides the self-registration route path.
func WithAuthUIRegisterPath(route string) AuthUIOption {
	return func(opts *authUIOptions) {
		if opts != nil {
			opts.registerPath = strings.TrimSpace(route)
		}
	}
}

// WithAuthUIViewContextBuilder overrides the default view context builder.
func WithAuthUIViewContextBuilder(builder AuthUIViewContextBuilder) AuthUIOption {
	return func(opts *authUIOptions) {
		if opts != nil && builder != nil {
			opts.viewContext = builder
		}
	}
}

// RegisterAuthUIRoutes registers login, logout, and password reset UI routes.
func RegisterAuthUIRoutes(r router.Router[*fiber.App], cfg admin.Config, auther *auth.Auther, cookieName string, opts ...AuthUIOption) error {
	if r == nil {
		return fmt.Errorf("router is required")
	}
	if auther == nil {
		return fmt.Errorf("auth auther is required")
	}

	options := authUIOptions{
		basePath:              strings.TrimSpace(cfg.BasePath),
		loginTemplate:         "login",
		passwordResetTemplate: "password_reset",
		loginTitle:            strings.TrimSpace(cfg.Title),
		passwordResetTitle:    strings.TrimSpace(cfg.Title),
		cookie: router.Cookie{
			Path:     "/",
			HTTPOnly: true,
			SameSite: "Lax",
		},
		passwordResetEnabled: func(cfg admin.Config) bool {
			return cfg.FeatureFlags["users.password_reset"]
		},
		selfRegistrationEnabled: func(cfg admin.Config) bool {
			return cfg.FeatureFlags["users.signup"]
		},
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}

	if options.basePath == "" {
		options.basePath = "/"
	}
	if options.loginPath == "" {
		options.loginPath = path.Join(options.basePath, "login")
	}
	if options.logoutPath == "" {
		options.logoutPath = path.Join(options.basePath, "logout")
	}
	if options.passwordResetPath == "" {
		options.passwordResetPath = path.Join(options.basePath, "password-reset")
	}
	if options.loginRedirectPath == "" {
		options.loginRedirectPath = options.basePath
	}
	if options.logoutRedirectPath == "" {
		options.logoutRedirectPath = options.loginPath
	}
	if options.viewContext == nil {
		options.viewContext = func(ctx router.ViewContext, _ router.Context) router.ViewContext { return ctx }
	}

	passwordResetEnabled := true
	if options.passwordResetEnabled != nil {
		passwordResetEnabled = options.passwordResetEnabled(cfg)
	}
	selfRegistrationEnabled := false
	if options.selfRegistrationEnabled != nil {
		selfRegistrationEnabled = options.selfRegistrationEnabled(cfg)
	}

	loginCookieName := strings.TrimSpace(cookieName)
	if loginCookieName == "" {
		loginCookieName = strings.TrimSpace(options.cookie.Name)
	}
	if loginCookieName == "" {
		return fmt.Errorf("auth cookie name is required")
	}

	r.Get(options.loginPath, func(c router.Context) error {
		viewCtx := router.ViewContext{
			"title":                     options.loginTitle,
			"base_path":                 options.basePath,
			"password_reset_enabled":    passwordResetEnabled,
			"self_registration_enabled": selfRegistrationEnabled,
			"password_reset_path":       options.passwordResetPath,
			"register_path":             options.registerPath,
		}
		viewCtx = options.viewContext(viewCtx, c)
		return c.Render(options.loginTemplate, viewCtx)
	})

	r.Post(options.loginPath, func(c router.Context) error {
		payload := loginPayload{}
		_ = c.Bind(&payload)

		token, err := auther.Login(c.Context(), payload.Identifier, payload.Password)
		if err != nil {
			return err
		}

		cookie := options.cookie
		cookie.Name = loginCookieName
		cookie.Value = token
		if cookie.Path == "" {
			cookie.Path = "/"
		}
		c.Cookie(&cookie)

		return c.Redirect(options.loginRedirectPath, fiber.StatusFound)
	})

	r.Get(options.passwordResetPath, func(c router.Context) error {
		if !passwordResetEnabled {
			return goerrors.New("password reset disabled", goerrors.CategoryAuthz).
				WithCode(fiber.StatusForbidden).
				WithTextCode("FEATURE_DISABLED")
		}
		viewCtx := router.ViewContext{
			"title":                     options.passwordResetTitle,
			"base_path":                 options.basePath,
			"password_reset_enabled":    passwordResetEnabled,
			"self_registration_enabled": selfRegistrationEnabled,
			"password_reset_path":       options.passwordResetPath,
			"register_path":             options.registerPath,
		}
		viewCtx = options.viewContext(viewCtx, c)
		return c.Render(options.passwordResetTemplate, viewCtx)
	})

	r.Get(options.logoutPath, func(c router.Context) error {
		cookie := options.cookie
		cookie.Name = loginCookieName
		cookie.Value = ""
		if cookie.Path == "" {
			cookie.Path = "/"
		}
		cookie.MaxAge = -1
		c.Cookie(&cookie)
		return c.Redirect(options.logoutRedirectPath, fiber.StatusFound)
	})

	return nil
}

type loginPayload struct {
	Identifier string `form:"identifier" json:"identifier"`
	Password   string `form:"password" json:"password"`
	Remember   bool   `form:"remember" json:"remember"`
}

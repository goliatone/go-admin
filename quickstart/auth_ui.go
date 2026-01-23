package quickstart

import (
	"fmt"
	"path"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	auth "github.com/goliatone/go-auth"
	goerrors "github.com/goliatone/go-errors"
	fggate "github.com/goliatone/go-featuregate/gate"
	router "github.com/goliatone/go-router"
)

// AuthUIViewContextBuilder mutates the view context for auth UI routes.
type AuthUIViewContextBuilder func(ctx router.ViewContext, c router.Context) router.ViewContext

// AuthUIOption customizes the auth UI routes.
type AuthUIOption func(*authUIOptions)

type authUIOptions struct {
	basePath                     string
	loginPath                    string
	logoutPath                   string
	passwordResetPath            string
	passwordResetConfirmPath     string
	registerPath                 string
	loginRedirectPath            string
	logoutRedirectPath           string
	loginTemplate                string
	passwordResetTemplate        string
	passwordResetConfirmTemplate string
	loginTitle                   string
	passwordResetTitle           string
	passwordResetConfirmTitle    string
	cookie                       router.Cookie
	passwordResetEnabled         func(admin.Config) bool
	selfRegistrationEnabled      func(admin.Config) bool
	viewContext                  AuthUIViewContextBuilder
	themeAssets                  map[string]string
	themeAssetPrefix             string
	featureGate                  fggate.FeatureGate
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

// WithAuthUIPasswordResetConfirmPath overrides the password reset confirm route path.
func WithAuthUIPasswordResetConfirmPath(route string) AuthUIOption {
	return func(opts *authUIOptions) {
		if opts != nil {
			opts.passwordResetConfirmPath = strings.TrimSpace(route)
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

// WithAuthUIPasswordResetConfirmTemplate overrides the password reset confirm template name.
func WithAuthUIPasswordResetConfirmTemplate(name string) AuthUIOption {
	return func(opts *authUIOptions) {
		if opts == nil {
			return
		}
		name = strings.TrimSpace(name)
		if name != "" {
			opts.passwordResetConfirmTemplate = name
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

// WithAuthUIPasswordResetConfirmTitle overrides the view title for the confirm reset page.
func WithAuthUIPasswordResetConfirmTitle(title string) AuthUIOption {
	return func(opts *authUIOptions) {
		if opts == nil {
			return
		}
		title = strings.TrimSpace(title)
		if title != "" {
			opts.passwordResetConfirmTitle = title
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

// WithAuthUIFeatureGate sets the feature gate used for default guards.
func WithAuthUIFeatureGate(gate fggate.FeatureGate) AuthUIOption {
	return func(opts *authUIOptions) {
		if opts != nil {
			opts.featureGate = gate
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

// WithAuthUIThemeAssets sets theme assets (logo, favicon, etc.) for auth UI templates.
// The prefix is prepended to each asset filename to form the full URL path.
// Assets are exposed in templates as theme.assets.logo, theme.assets.favicon, etc.
func WithAuthUIThemeAssets(prefix string, assets map[string]string) AuthUIOption {
	return func(opts *authUIOptions) {
		if opts != nil {
			opts.themeAssetPrefix = prefix
			opts.themeAssets = assets
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
		basePath:                     strings.TrimSpace(cfg.BasePath),
		loginTemplate:                "login",
		passwordResetTemplate:        "password_reset",
		passwordResetConfirmTemplate: "password_reset_confirm",
		loginTitle:                   strings.TrimSpace(cfg.Title),
		passwordResetTitle:           strings.TrimSpace(cfg.Title),
		passwordResetConfirmTitle:    strings.TrimSpace(cfg.Title),
		cookie: router.Cookie{
			Path:     "/",
			HTTPOnly: true,
			SameSite: "Lax",
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
	if options.passwordResetConfirmPath == "" {
		options.passwordResetConfirmPath = path.Join(options.passwordResetPath, "confirm")
	}
	confirmBasePath := ""
	confirmLinkPath := options.passwordResetConfirmPath
	if strings.Contains(options.passwordResetConfirmPath, ":") {
		confirmBasePath = stripRouteParams(options.passwordResetConfirmPath)
		if confirmBasePath != "" {
			confirmLinkPath = confirmBasePath
		} else {
			confirmLinkPath = ""
		}
	}
	if options.registerPath == "" {
		options.registerPath = path.Join(options.basePath, "register")
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

	authScope := fggate.ScopeChain{{Kind: fggate.ScopeSystem}}
	resolvePasswordReset := func(c router.Context) bool {
		if options.passwordResetEnabled != nil {
			return options.passwordResetEnabled(cfg)
		}
		return featureEnabledWithContext(c.Context(), options.featureGate, "users.password_reset", authScope)
	}
	resolveSelfRegistration := func(c router.Context) bool {
		if options.selfRegistrationEnabled != nil {
			return options.selfRegistrationEnabled(cfg)
		}
		return featureEnabledWithContext(c.Context(), options.featureGate, "users.signup", authScope)
	}

	loginCookieName := strings.TrimSpace(cookieName)
	if loginCookieName == "" {
		loginCookieName = strings.TrimSpace(options.cookie.Name)
	}
	if loginCookieName == "" {
		return fmt.Errorf("auth cookie name is required")
	}

	r.Get(options.loginPath, func(c router.Context) error {
		authState := AuthUIState{
			PasswordResetEnabled:    resolvePasswordReset(c),
			SelfRegistrationEnabled: resolveSelfRegistration(c),
		}
		authSnapshot := authUISnapshot(authState)
		viewCtx := AuthUIViewContext(cfg, authState, AuthUIPaths{
			BasePath:                 options.basePath,
			PasswordResetPath:        options.passwordResetPath,
			PasswordResetConfirmPath: confirmLinkPath,
			RegisterPath:             options.registerPath,
		})
		viewCtx["title"] = options.loginTitle
		viewCtx = WithAuthUIViewThemeAssets(viewCtx, options.themeAssets, options.themeAssetPrefix)
		viewCtx = WithFeatureTemplateContext(viewCtx, c.Context(), authScope, authSnapshot)
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
		authState := AuthUIState{
			PasswordResetEnabled:    resolvePasswordReset(c),
			SelfRegistrationEnabled: resolveSelfRegistration(c),
		}
		authSnapshot := authUISnapshot(authState)
		passwordResetEnabled := authState.PasswordResetEnabled
		if !passwordResetEnabled {
			return goerrors.New("password reset disabled", goerrors.CategoryAuthz).
				WithCode(fiber.StatusForbidden).
				WithTextCode("FEATURE_DISABLED")
		}
		viewCtx := AuthUIViewContext(cfg, authState, AuthUIPaths{
			BasePath:                 options.basePath,
			PasswordResetPath:        options.passwordResetPath,
			PasswordResetConfirmPath: confirmLinkPath,
			RegisterPath:             options.registerPath,
		})
		viewCtx["title"] = options.passwordResetTitle
		viewCtx = WithAuthUIViewThemeAssets(viewCtx, options.themeAssets, options.themeAssetPrefix)
		viewCtx = WithFeatureTemplateContext(viewCtx, c.Context(), authScope, authSnapshot)
		viewCtx = options.viewContext(viewCtx, c)
		return c.Render(options.passwordResetTemplate, viewCtx)
	})

	confirmHandler := func(c router.Context) error {
		authState := AuthUIState{
			PasswordResetEnabled:    resolvePasswordReset(c),
			SelfRegistrationEnabled: resolveSelfRegistration(c),
		}
		authSnapshot := authUISnapshot(authState)
		passwordResetEnabled := authState.PasswordResetEnabled
		if !passwordResetEnabled {
			return goerrors.New("password reset disabled", goerrors.CategoryAuthz).
				WithCode(fiber.StatusForbidden).
				WithTextCode("FEATURE_DISABLED")
		}
		viewCtx := AuthUIViewContext(cfg, authState, AuthUIPaths{
			BasePath:                 options.basePath,
			PasswordResetPath:        options.passwordResetPath,
			PasswordResetConfirmPath: confirmLinkPath,
			RegisterPath:             options.registerPath,
		})
		if token := strings.TrimSpace(c.Param("token")); token != "" {
			viewCtx["password_reset_token"] = token
		}
		viewCtx["title"] = options.passwordResetConfirmTitle
		viewCtx = WithAuthUIViewThemeAssets(viewCtx, options.themeAssets, options.themeAssetPrefix)
		viewCtx = WithFeatureTemplateContext(viewCtx, c.Context(), authScope, authSnapshot)
		viewCtx = options.viewContext(viewCtx, c)
		return c.Render(options.passwordResetConfirmTemplate, viewCtx)
	}

	r.Get(options.passwordResetConfirmPath, confirmHandler)
	if strings.Contains(options.passwordResetConfirmPath, ":") {
		if confirmBasePath != "" && confirmBasePath != options.passwordResetConfirmPath {
			r.Get(confirmBasePath, confirmHandler)
		}
	} else {
		confirmTokenPath := strings.TrimRight(options.passwordResetConfirmPath, "/") + "/:token"
		r.Get(confirmTokenPath, confirmHandler)
	}

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

func stripRouteParams(route string) string {
	trimmed := strings.TrimSpace(route)
	if trimmed == "" {
		return ""
	}
	parts := strings.Split(trimmed, "/")
	filtered := make([]string, 0, len(parts))
	for _, part := range parts {
		if part == "" {
			continue
		}
		if strings.HasPrefix(part, ":") || strings.HasPrefix(part, "*") {
			continue
		}
		filtered = append(filtered, part)
	}
	if len(filtered) == 0 {
		return ""
	}
	return "/" + strings.Join(filtered, "/")
}

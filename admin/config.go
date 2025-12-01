package admin

// Config holds core admin settings and feature flags.
type Config struct {
	Title            string
	BasePath         string
	DefaultLocale    string
	Theme            string
	ThemeVariant     string
	ThemeTokens      map[string]string
	ThemeAssetPrefix string
	CMSConfig        any

	EnableDashboard     bool
	EnableSearch        bool
	EnableExport        bool
	EnableCMS           bool
	EnableJobs          bool
	EnableCommands      bool
	EnableSettings      bool
	EnableNotifications bool

	LogoURL    string
	FaviconURL string
	CustomCSS  string
	CustomJS   string

	SettingsPermission       string
	SettingsUpdatePermission string
	SettingsThemeTokens      map[string]string

	AuthConfig *AuthConfig

	NavMenuCode string
}

// AuthConfig captures login/logout endpoints and redirect defaults.
type AuthConfig struct {
	LoginPath    string
	LogoutPath   string
	RedirectPath string
}

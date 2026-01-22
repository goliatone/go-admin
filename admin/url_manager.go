package admin

import (
	"fmt"
	"strings"

	urlkit "github.com/goliatone/go-urlkit"
)

const defaultAPIPrefix = "api"

func normalizeURLConfig(cfg URLConfig) URLConfig {
	cfg.APIPrefix = strings.TrimSpace(cfg.APIPrefix)
	cfg.APIPrefix = strings.Trim(cfg.APIPrefix, "/")
	if cfg.APIPrefix == "" {
		cfg.APIPrefix = defaultAPIPrefix
	}

	cfg.APIVersion = strings.TrimSpace(cfg.APIVersion)
	cfg.APIVersion = strings.Trim(cfg.APIVersion, "/")

	return cfg
}

func newURLManager(cfg Config) (*urlkit.RouteManager, error) {
	if cfg.URLs.URLKit != nil {
		manager, err := urlkit.NewRouteManagerFromConfig(cfg.URLs.URLKit)
		if err != nil {
			return nil, fmt.Errorf("url manager config error: %w", err)
		}
		return manager, nil
	}

	manager, err := urlkit.NewRouteManagerFromConfig(defaultURLKitConfig(cfg))
	if err != nil {
		return nil, fmt.Errorf("url manager default config error: %w", err)
	}
	return manager, nil
}

func defaultURLKitConfig(cfg Config) *urlkit.Config {
	adminRoutes := map[string]string{}
	apiRoutes := map[string]string{}

	apiGroup := urlkit.GroupConfig{
		Name: "api",
		Path: "/" + cfg.URLs.APIPrefix,
	}

	if cfg.URLs.APIVersion != "" {
		apiGroup.Groups = []urlkit.GroupConfig{
			{
				Name:   cfg.URLs.APIVersion,
				Path:   "/" + cfg.URLs.APIVersion,
				Routes: apiRoutes,
			},
		}
	} else {
		apiGroup.Routes = apiRoutes
	}

	return &urlkit.Config{
		Groups: []urlkit.GroupConfig{
			{
				Name:    "admin",
				BaseURL: cfg.BasePath,
				Routes:  adminRoutes,
				Groups:  []urlkit.GroupConfig{apiGroup},
			},
		},
	}
}

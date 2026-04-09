package quickstart

import (
	"fmt"
	"slices"
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

const (
	DefaultInternalOpsHealthzPath = "/healthz"
	DefaultInternalOpsStatusPath  = "/status"
)

type InternalOpsConfig struct {
	EnableHealthz bool   `json:"enable_healthz"`
	EnableStatus  bool   `json:"enable_status"`
	HealthzPath   string `json:"healthz_path"`
	StatusPath    string `json:"status_path"`
}

type ResolvedInternalOpsConfig struct {
	EnableHealthz bool   `json:"enable_healthz"`
	EnableStatus  bool   `json:"enable_status"`
	HealthzPath   string `json:"healthz_path"`
	StatusPath    string `json:"status_path"`
}

type InternalOpsOption func(*internalOpsRouteOptions)

type internalOpsRouteOptions struct {
	healthzHandler router.HandlerFunc
	statusHandler  router.HandlerFunc
}

func ResolveInternalOpsConfig(cfg InternalOpsConfig) ResolvedInternalOpsConfig {
	return ResolvedInternalOpsConfig{
		EnableHealthz: cfg.EnableHealthz,
		EnableStatus:  cfg.EnableStatus,
		HealthzPath:   resolveInternalOpsPath(cfg.HealthzPath, DefaultInternalOpsHealthzPath),
		StatusPath:    resolveInternalOpsPath(cfg.StatusPath, DefaultInternalOpsStatusPath),
	}
}

func ResolveInternalOpsHealthzPath(cfg InternalOpsConfig) string {
	return ResolveInternalOpsConfig(cfg).HealthzPath
}

func ResolveInternalOpsStatusPath(cfg InternalOpsConfig) string {
	return ResolveInternalOpsConfig(cfg).StatusPath
}

func WithInternalOpsHealthzHandler(handler router.HandlerFunc) InternalOpsOption {
	return func(opts *internalOpsRouteOptions) {
		if opts == nil || handler == nil {
			return
		}
		opts.healthzHandler = handler
	}
}

func WithInternalOpsStatusHandler(handler router.HandlerFunc) InternalOpsOption {
	return func(opts *internalOpsRouteOptions) {
		if opts == nil || handler == nil {
			return
		}
		opts.statusHandler = handler
	}
}

func RegisterInternalOpsRoutes[T any](r router.Router[T], cfg InternalOpsConfig, opts ...InternalOpsOption) (ResolvedInternalOpsConfig, error) {
	resolved := ResolveInternalOpsConfig(cfg)
	if r == nil {
		return resolved, fmt.Errorf("internal ops router is required")
	}

	options := internalOpsRouteOptions{
		healthzHandler: defaultInternalOpsHandler,
		statusHandler:  defaultInternalOpsHandler,
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}

	if resolved.EnableHealthz {
		r.Get(resolved.HealthzPath, options.healthzHandler)
	}
	if resolved.EnableStatus {
		r.Get(resolved.StatusPath, options.statusHandler)
	}
	return resolved, nil
}

func InternalOpsReservedPrefixes(cfg InternalOpsConfig) []string {
	resolved := ResolveInternalOpsConfig(cfg)
	out := make([]string, 0, 2)
	if resolved.EnableHealthz {
		out = append(out, resolved.HealthzPath)
	}
	if resolved.EnableStatus {
		out = append(out, resolved.StatusPath)
	}
	slices.Sort(out)
	if len(out) == 0 {
		return nil
	}
	return out
}

func resolveInternalOpsPath(value, fallback string) string {
	for _, candidate := range []string{value, fallback} {
		if trimmed := strings.TrimSpace(candidate); trimmed != "" {
			return admin.NormalizeBasePath(prefixBasePath("", trimmed))
		}
	}
	return admin.NormalizeBasePath(prefixBasePath("", fallback))
}

func defaultInternalOpsHandler(c router.Context) error {
	if c == nil {
		return nil
	}
	return c.JSON(200, map[string]string{"status": "ok"})
}

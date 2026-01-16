package admin

import (
	"context"
	"strings"
	"time"

	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
)

const (
	DebugREPLKindShell = "shell"
	DebugREPLKindApp   = "app"
	debugReplResource  = "debug.repl"
)

const (
	debugReplOverrideKeyHeader   = "X-Admin-REPL-Key"
	debugReplOverrideTokenHeader = "X-Admin-REPL-Token"
	debugReplOverrideKeyQuery    = "repl_key"
	debugReplOverrideTokenQuery  = "repl_token"
)

func debugREPLAccessMiddleware(admin *Admin, cfg DebugConfig, kind string, requireExec bool) router.MiddlewareFunc {
	if admin == nil {
		return nil
	}
	wrap := admin.authWrapper()
	return func(next router.HandlerFunc) router.HandlerFunc {
		return wrap(func(c router.Context) error {
			if _, err := debugREPLAuthorizeRequest(admin, cfg, kind, requireExec, c); err != nil {
				return writeError(c, err)
			}
			return next(c)
		})
	}
}

func debugREPLAuthHandler(admin *Admin, cfg DebugConfig, kind string, requireExec bool) router.HandlerFunc {
	if admin == nil {
		return func(_ router.Context) error { return ErrForbidden }
	}
	wrap := admin.authWrapper()
	return wrap(func(c router.Context) error {
		_, err := debugREPLAuthorizeRequest(admin, cfg, kind, requireExec, c)
		return err
	})
}

func debugREPLAuthorizeRequest(admin *Admin, cfg DebugConfig, kind string, requireExec bool, c router.Context) (AdminContext, error) {
	if admin == nil || c == nil {
		return AdminContext{}, ErrForbidden
	}
	if !debugConfigEnabled(cfg) {
		return AdminContext{}, ErrForbidden
	}
	replCfg := normalizeDebugREPLConfig(cfg.Repl)
	if err := debugCheckIP(debugREPLAllowedIPs(cfg.AllowedIPs, replCfg.AllowedIPs), c.IP()); err != nil {
		return AdminContext{}, err
	}
	if kind == DebugREPLKindShell && !replCfg.ShellEnabled {
		return AdminContext{}, ErrForbidden
	}
	if kind == DebugREPLKindApp && !replCfg.AppEnabled {
		return AdminContext{}, ErrForbidden
	}
	locale := strings.TrimSpace(c.Query("locale"))
	if locale == "" {
		locale = admin.config.DefaultLocale
	}
	adminCtx := admin.adminContextFromRequest(c, locale)
	c.SetContext(adminCtx.Context)

	if !replCfg.Enabled {
		allowed, err := debugREPLOverrideAllowed(adminCtx.Context, replCfg, kind, c)
		if err != nil || !allowed {
			return adminCtx, ErrForbidden
		}
	}
	if !debugREPLRoleAllowed(adminCtx.Context, replCfg.AllowedRoles) {
		return adminCtx, ErrForbidden
	}
	if err := admin.requirePermission(adminCtx, replCfg.Permission, debugReplResource); err != nil {
		return adminCtx, err
	}
	if requireExec {
		if replCfg.ReadOnlyEnabled() {
			return adminCtx, ErrForbidden
		}
		if err := admin.requirePermission(adminCtx, replCfg.ExecPermission, debugReplResource); err != nil {
			return adminCtx, err
		}
	}
	return adminCtx, nil
}

func debugREPLOverrideAllowed(ctx context.Context, cfg DebugREPLConfig, kind string, c router.Context) (bool, error) {
	if cfg.OverrideStrategy == nil {
		return false, nil
	}
	req := DebugREPLRequest{
		UserID:      userIDFromContext(ctx),
		IP:          strings.TrimSpace(c.IP()),
		UserAgent:   strings.TrimSpace(c.Header("User-Agent")),
		Kind:        kind,
		RequestedAt: time.Now(),
	}
	meta := map[string]any{}
	if key := debugREPLOverrideValue(c, debugReplOverrideKeyHeader, debugReplOverrideKeyQuery); key != "" {
		meta[DebugREPLOverrideKeyMetadata] = key
	}
	if token := debugREPLOverrideValue(c, debugReplOverrideTokenHeader, debugReplOverrideTokenQuery); token != "" {
		meta[DebugREPLOverrideTokenMetadata] = token
	}
	if len(meta) > 0 {
		req.Metadata = meta
	}
	return cfg.OverrideStrategy.Allows(ctx, req)
}

func debugREPLOverrideValue(c router.Context, header, query string) string {
	if c == nil {
		return ""
	}
	value := strings.TrimSpace(c.Header(header))
	if value != "" {
		return value
	}
	return strings.TrimSpace(c.Query(query))
}

func debugREPLAllowedIPs(debugIPs, replIPs []string) []string {
	if len(debugIPs) == 0 && len(replIPs) == 0 {
		return nil
	}
	out := make([]string, 0, len(debugIPs)+len(replIPs))
	seen := map[string]bool{}
	for _, ip := range debugIPs {
		ip = strings.TrimSpace(ip)
		if ip == "" || seen[ip] {
			continue
		}
		seen[ip] = true
		out = append(out, ip)
	}
	for _, ip := range replIPs {
		ip = strings.TrimSpace(ip)
		if ip == "" || seen[ip] {
			continue
		}
		seen[ip] = true
		out = append(out, ip)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func debugREPLRoleAllowed(ctx context.Context, allowed []string) bool {
	if len(allowed) == 0 {
		return true
	}
	actor, ok := auth.ActorFromContext(ctx)
	if !ok || actor == nil {
		return false
	}
	if debugREPLRoleMatch(actor.Role, allowed) {
		return true
	}
	for _, role := range actor.ResourceRoles {
		if debugREPLRoleMatch(role, allowed) {
			return true
		}
	}
	return false
}

func debugREPLRoleMatch(role string, allowed []string) bool {
	role = strings.TrimSpace(role)
	if role == "" {
		return false
	}
	for _, allowedRole := range allowed {
		if strings.EqualFold(role, allowedRole) {
			return true
		}
	}
	return false
}

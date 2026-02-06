package quickstart

import (
	"github.com/goliatone/go-admin/admin"
	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
)

// DebugWSAuthMiddleware returns a go-auth backed WebSocket auth middleware
// with defaults aligned to debug remote settings.
func DebugWSAuthMiddleware(auther *auth.Auther, cfg admin.DebugConfig, config ...router.WSAuthConfig) router.WebSocketMiddleware {
	if auther == nil {
		return nil
	}
	wsCfg := router.WSAuthConfig{
		EnableTokenCookie: cfg.RemoteEnabled,
	}
	if len(config) > 0 {
		wsCfg = config[0]
		if cfg.RemoteEnabled && !wsCfg.EnableTokenCookie {
			wsCfg.EnableTokenCookie = true
		}
	}
	return auther.NewWSAuthMiddleware(wsCfg)
}

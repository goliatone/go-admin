package quickstart

import (
	fiber3 "github.com/gofiber/fiber/v3"
	"github.com/goliatone/go-admin/admin"
)

// WithDefaultFiberV3DashboardRenderer registers typed dashboard SSR using the
// shared native v3 views. Both view interfaces are structurally identical, so
// the shared renderer preserves overlays, shell context and existing renderers.
// With nil views it retains the standalone template-renderer fallback.
func WithDefaultFiberV3DashboardRenderer(adm *admin.Admin, views fiber3.Views, cfg admin.Config, opts ...DashboardRendererOption) error {
	return WithDefaultDashboardRenderer(adm, views, cfg, opts...)
}

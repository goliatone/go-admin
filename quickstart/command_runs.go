package quickstart

import (
	"context"

	"github.com/goliatone/go-admin/admin"
)

// CloseCommandRunUpdates closes go-admin subscriptions and observers before a
// host closes any injected messaging drivers or routers.
func CloseCommandRunUpdates(ctx context.Context, adm *admin.Admin) error {
	if adm == nil {
		return nil
	}
	return adm.CloseCommandRunRuntime(ctx)
}

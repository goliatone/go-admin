package quickstart

import (
	"context"
	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

// ConfigureActivityIngestion composes durable ingestion and both Activity readers
// before admin.Initialize. Build the Admin with NewAdminConfig and the existing
// WithScopeMode/WithDefaultScope/WithScopeConfig options; the bundle consumes that
// same normalized scope policy. Migrate go-users activity/scopes first, then call
// admin.EnsureActivityIngestionSchema explicitly. No startup DDL is performed.
// Required host inputs include producer verification/current policy, DB, an admin
// authorizer and ActivityPermission. Disabled options preserve legacy behavior.
func ConfigureActivityIngestion(ctx context.Context, adm *admin.Admin, opts admin.ActivityIngestionOptions) (*admin.ActivityIngestionRuntime, error) {
	if !opts.Enabled {
		return nil, nil
	}
	if adm == nil {
		return nil, admin.ErrActivityIngestionUnavailable
	}
	return adm.ConfigureActivityIngestion(ctx, opts)
}

// RegisterActivityIngestionRoutes mounts the configured producer endpoint on the
// root router outside browser-cookie groups. URLKit activity.ingest controls the
// actual URL, including absolute overrides and API roots/version. A disabled or
// unconfigured runtime adds no endpoint; enabled configuration fails earlier if
// migrations or authority/read dependencies are missing.
func RegisterActivityIngestionRoutes[T any](ctx context.Context, r router.Router[T], adm *admin.Admin) error {
	if adm == nil {
		return admin.ErrActivityIngestionUnavailable
	}
	runtime := adm.ActivityIngestion()
	if runtime == nil {
		return nil
	}
	return admin.RegisterActivityIngestionRoutes(ctx, r, adm, runtime.HTTP)
}

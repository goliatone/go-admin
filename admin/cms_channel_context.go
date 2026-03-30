package admin

import (
	"context"

	cmsadapter "github.com/goliatone/go-admin/admin/internal/cmsadapter"
)

func cmsContentChannelFromContext(ctx context.Context, fallback string) string {
	return cmsadapter.ResolveContextChannel(fallback, ctx, ContentChannelFromContext, EnvironmentFromContext)
}

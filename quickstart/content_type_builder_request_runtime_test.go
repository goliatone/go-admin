package quickstart

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/admin"
	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
)

func TestAdminContextFromRequestUsesActorLocaleAndChannelContext(t *testing.T) {
	ctx := router.NewMockContext()
	base := auth.WithActorContext(context.Background(), &auth.ActorContext{
		ActorID:        "actor-7",
		TenantID:       "tenant-1",
		OrganizationID: "org-2",
	})
	base = admin.WithLocale(base, "unused")
	ctx.On("Context").Return(base)
	ctx.QueriesM["requested_locale"] = "fr"
	ctx.QueriesM["content_channel"] = "preview"
	ctx.HeadersM["X-User-ID"] = "header-user"

	adminCtx := adminContextFromRequest(nil, ctx, "en")

	if adminCtx.UserID != "actor-7" {
		t.Fatalf("expected actor id to override header user id, got %q", adminCtx.UserID)
	}
	if adminCtx.TenantID != "tenant-1" || adminCtx.OrgID != "org-2" {
		t.Fatalf("expected tenant/org from actor, got %+v", adminCtx)
	}
	if adminCtx.Locale != "fr" {
		t.Fatalf("expected requested locale fr, got %q", adminCtx.Locale)
	}
	if adminCtx.Channel != "preview" || adminCtx.Environment != "preview" {
		t.Fatalf("expected preview channel/environment, got %+v", adminCtx)
	}
	if got := admin.LocaleFromContext(adminCtx.Context); got != "fr" {
		t.Fatalf("expected locale stored in admin context, got %q", got)
	}
	if got := admin.ContentChannelFromContext(adminCtx.Context); got != "preview" {
		t.Fatalf("expected content channel stored in admin context, got %q", got)
	}
}

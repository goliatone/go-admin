package admin

import (
	"context"
	"errors"
	"testing"

	auth "github.com/goliatone/go-auth"
	"github.com/goliatone/go-notifications/pkg/privacy"
)

func TestNotificationPermissionDefaultsAndOverrides(t *testing.T) {
	cfg := applyConfigDefaults(Config{})
	if cfg.NotificationsInspectPermission != PermAdminNotificationsInspect ||
		cfg.NotificationsReceiptPermission != PermAdminNotificationsReceiptsView ||
		cfg.NotificationsRetentionPurgePermission != PermAdminNotificationsRetentionPurge {
		t.Fatalf("unexpected notification permission defaults: %+v", cfg)
	}
	want := Config{
		NotificationsInspectPermission:        "custom.inspect",
		NotificationsReceiptPermission:        "custom.receipt",
		NotificationsRetentionPurgePermission: "custom.purge",
	}
	got := applyConfigDefaults(want)
	if got.NotificationsInspectPermission != want.NotificationsInspectPermission ||
		got.NotificationsReceiptPermission != want.NotificationsReceiptPermission ||
		got.NotificationsRetentionPurgePermission != want.NotificationsRetentionPurgePermission {
		t.Fatalf("custom notification permissions were replaced: %+v", got)
	}
}

func TestNotificationTrustedScopePolicy(t *testing.T) {
	system := AdminContext{Context: auth.WithActorContext(context.Background(), &auth.ActorContext{
		ActorID: "system-admin", Metadata: map[string]any{NotificationSystemAuthorityMetadataKey: true},
	})}
	implicitSystem := AdminContext{Context: auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: "unscoped-admin"})}
	tenant := AdminContext{Context: auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: "tenant-admin", TenantID: "tenant-1"})}
	malformed := AdminContext{Context: context.Background(), TenantID: "tenant-attacker"}

	if scope, err := notificationReadScope(system); err != nil || scope != "system" {
		t.Fatalf("system read scope: %q %v", scope, err)
	}
	if scope, err := notificationReadScope(tenant); err != nil || scope != "tenant:tenant-1" {
		t.Fatalf("tenant read scope: %q %v", scope, err)
	}
	if scope, err := notificationRetentionScope(system); err != nil || scope != "system" {
		t.Fatalf("system retention scope: %q %v", scope, err)
	}
	if _, err := notificationRetentionScope(implicitSystem); err == nil {
		t.Fatal("expected missing explicit system authority to be denied")
	}
	if _, err := notificationRetentionScope(tenant); err == nil {
		t.Fatal("expected tenant retention denial despite permission")
	}
	singleTenantSystem := AdminContext{
		Context:  WithNotificationSystemAuthority(auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: "single-system-admin"})),
		TenantID: "default-tenant",
	}
	if scope, err := notificationRetentionScope(singleTenantSystem); err != nil || scope != "system" {
		t.Fatalf("explicit single-tenant system authority: %q %v", scope, err)
	}
	if _, err := notificationReadScope(malformed); err == nil {
		t.Fatal("expected malformed actor denial")
	} else {
		var safe privacy.SafeError
		if !errors.As(err, &safe) || safe.Code != "notification_scope_denied" {
			t.Fatalf("expected safe scope error, got %T %v", err, err)
		}
	}
}

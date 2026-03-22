package services

import (
	"context"
	"testing"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

type senderViewerPolicyAuthorizer struct {
	allowed map[string]bool
}

func (a senderViewerPolicyAuthorizer) Can(_ context.Context, action string, _ string) bool {
	return a.allowed[action]
}

func TestResolveSenderViewerPolicyDefaults(t *testing.T) {
	t.Cleanup(appcfg.ResetActive)
	appcfg.ResetActive()

	policy := ResolveSenderViewerPolicy()
	if got := policy.PagePermissions(); len(got) != 1 || got[0] != "admin.esign.view" {
		t.Fatalf("expected default page permissions, got %+v", got)
	}
	if got := policy.CommentPermissions(); len(got) != 2 || got[0] != "admin.esign.edit" || got[1] != "admin.esign.view" {
		t.Fatalf("expected default comment permissions, got %+v", got)
	}
	if got := policy.AssetPermissionsFor("executed"); len(got) != 1 || got[0] != "admin.esign.download" {
		t.Fatalf("expected default executed asset permissions, got %+v", got)
	}
	if policy.CanExposeInProgressFieldValues(stores.AgreementStatusSent) {
		t.Fatalf("expected sent agreements to hide in-progress values by default")
	}
	if !policy.CanExposeInProgressFieldValues(stores.AgreementStatusCompleted) {
		t.Fatalf("expected completed agreements to expose field values by default")
	}
}

func TestResolveSenderViewerPolicyHonorsConfigOverride(t *testing.T) {
	t.Cleanup(appcfg.ResetActive)
	cfg := appcfg.Defaults()
	cfg.Signer.SenderViewer.PagePermissionsAll = []string{"admin.esign.viewer"}
	cfg.Signer.SenderViewer.CommentPermissionsAll = []string{"admin.esign.comment"}
	cfg.Signer.SenderViewer.AssetPermissions.Executed = []string{"admin.esign.executed"}
	cfg.Signer.SenderViewer.ShowInProgressFieldValues = true
	appcfg.SetActive(cfg)

	policy := ResolveSenderViewerPolicy()
	if got := policy.PagePermissions(); len(got) != 1 || got[0] != "admin.esign.viewer" {
		t.Fatalf("expected overridden page permissions, got %+v", got)
	}
	if got := policy.CommentPermissions(); len(got) != 1 || got[0] != "admin.esign.comment" {
		t.Fatalf("expected overridden comment permissions, got %+v", got)
	}
	if !policy.CanExposeInProgressFieldValues(stores.AgreementStatusInProgress) {
		t.Fatalf("expected override to expose in-progress field values")
	}
}

func TestResolveSenderViewerPolicyAuthorizationChecks(t *testing.T) {
	policy := SenderViewerPolicy{
		PagePermissionsAll:    []string{"admin.esign.view"},
		CommentPermissionsAll: []string{"admin.esign.edit", "admin.esign.view"},
		AssetPermissions: map[string][]string{
			"executed": {"admin.esign.download"},
		},
	}
	ctx := context.Background()
	authorizer := senderViewerPolicyAuthorizer{
		allowed: map[string]bool{
			"admin.esign.view":     true,
			"admin.esign.edit":     true,
			"admin.esign.download": false,
		},
	}

	if !policy.CanOpenSenderViewer(authorizer, ctx) {
		t.Fatalf("expected sender viewer open permission")
	}
	if !policy.CanWriteSenderComments(authorizer, ctx) {
		t.Fatalf("expected sender comment permission")
	}
	if policy.CanAccessSenderAsset(authorizer, ctx, "executed") {
		t.Fatalf("expected executed asset access to remain denied without download")
	}
	missing := policy.MissingAssetPermissions(authorizer, ctx, "executed")
	if len(missing) != 1 || missing[0] != "admin.esign.download" {
		t.Fatalf("expected missing download permission, got %+v", missing)
	}
}

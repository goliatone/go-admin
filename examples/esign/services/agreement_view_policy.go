package services

import (
	"context"
	"strings"

	coreadmin "github.com/goliatone/go-admin/admin"
	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

const senderViewerAuthorizerResource = "esign"

type SenderViewerPolicy struct {
	PagePermissionsAll        []string
	CommentPermissionsAll     []string
	ShowInProgressFieldValues bool
	AssetPermissions          map[string][]string
}

func ResolveSenderViewerPolicy() SenderViewerPolicy {
	cfg := appcfg.Active().Signer.SenderViewer
	return SenderViewerPolicy{
		PagePermissionsAll:        append([]string{}, cfg.PagePermissionsAll...),
		CommentPermissionsAll:     append([]string{}, cfg.CommentPermissionsAll...),
		ShowInProgressFieldValues: cfg.ShowInProgressFieldValues,
		AssetPermissions: map[string][]string{
			"preview":     append([]string{}, cfg.AssetPermissions.Preview...),
			"source":      append([]string{}, cfg.AssetPermissions.Source...),
			"executed":    append([]string{}, cfg.AssetPermissions.Executed...),
			"certificate": append([]string{}, cfg.AssetPermissions.Certificate...),
		},
	}
}

func (p SenderViewerPolicy) PagePermissions() []string {
	return append([]string{}, p.PagePermissionsAll...)
}

func (p SenderViewerPolicy) CommentPermissions() []string {
	return append([]string{}, p.CommentPermissionsAll...)
}

func (p SenderViewerPolicy) AssetPermissionsFor(assetType string) []string {
	assetType = normalizeSenderViewerAssetType(assetType)
	if assetType == "" {
		return nil
	}
	return append([]string{}, p.AssetPermissions[assetType]...)
}

func (p SenderViewerPolicy) CanOpenSenderViewer(authorizer coreadmin.Authorizer, ctx context.Context) bool {
	return senderViewerPermissionsAllowed(authorizer, ctx, p.PagePermissions())
}

func (p SenderViewerPolicy) CanWriteSenderComments(authorizer coreadmin.Authorizer, ctx context.Context) bool {
	return senderViewerPermissionsAllowed(authorizer, ctx, p.CommentPermissions())
}

func (p SenderViewerPolicy) CanAccessSenderAsset(authorizer coreadmin.Authorizer, ctx context.Context, assetType string) bool {
	return senderViewerPermissionsAllowed(authorizer, ctx, p.AssetPermissionsFor(assetType))
}

func (p SenderViewerPolicy) MissingPagePermissions(authorizer coreadmin.Authorizer, ctx context.Context) []string {
	return senderViewerMissingPermissions(authorizer, ctx, p.PagePermissions())
}

func (p SenderViewerPolicy) MissingCommentPermissions(authorizer coreadmin.Authorizer, ctx context.Context) []string {
	return senderViewerMissingPermissions(authorizer, ctx, p.CommentPermissions())
}

func (p SenderViewerPolicy) MissingAssetPermissions(authorizer coreadmin.Authorizer, ctx context.Context, assetType string) []string {
	return senderViewerMissingPermissions(authorizer, ctx, p.AssetPermissionsFor(assetType))
}

func (p SenderViewerPolicy) CanExposeInProgressFieldValues(agreementStatus string) bool {
	if p.ShowInProgressFieldValues {
		return true
	}
	return strings.EqualFold(strings.TrimSpace(agreementStatus), stores.AgreementStatusCompleted)
}

func senderViewerPermissionsAllowed(authorizer coreadmin.Authorizer, ctx context.Context, permissions []string) bool {
	if len(permissions) == 0 {
		return true
	}
	if authorizer == nil {
		return false
	}
	return coreadmin.CanAll(authorizer, ctx, senderViewerAuthorizerResource, permissions...)
}

func senderViewerMissingPermissions(authorizer coreadmin.Authorizer, ctx context.Context, permissions []string) []string {
	if len(permissions) == 0 {
		return nil
	}
	missing := make([]string, 0, len(permissions))
	for _, permission := range permissions {
		permission = strings.TrimSpace(permission)
		if permission == "" {
			continue
		}
		if authorizer != nil && authorizer.Can(ctx, permission, senderViewerAuthorizerResource) {
			continue
		}
		missing = append(missing, permission)
	}
	return missing
}

func normalizeSenderViewerAssetType(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "preview":
		return "preview"
	case "source":
		return "source"
	case "executed":
		return "executed"
	case "certificate":
		return "certificate"
	default:
		return ""
	}
}

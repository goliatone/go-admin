package modules

import (
	"context"
	"strings"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/services"
)

const eSignAuthorizerResource = "esign"

func sanitizeDocumentLineageDetailForPermissions(
	ctx context.Context,
	authorizer coreadmin.Authorizer,
	viewPermission string,
	detail services.DocumentLineageDetail,
) services.DocumentLineageDetail {
	if allowLineageLinkouts(ctx, authorizer, viewPermission) {
		return detail
	}
	if detail.SourceDocument != nil {
		detail.SourceDocument.URL = ""
	}
	if detail.GoogleSource != nil {
		detail.GoogleSource.WebURL = ""
	}
	detail.DiagnosticsURL = ""
	detail.PresentationWarnings = sanitizeLineagePresentationWarnings(detail.PresentationWarnings)
	return detail
}

func sanitizeAgreementLineageDetailForPermissions(
	ctx context.Context,
	authorizer coreadmin.Authorizer,
	viewPermission string,
	detail services.AgreementLineageDetail,
) services.AgreementLineageDetail {
	if allowLineageLinkouts(ctx, authorizer, viewPermission) {
		return detail
	}
	if detail.SourceDocument != nil {
		detail.SourceDocument.URL = ""
	}
	if detail.GoogleSource != nil {
		detail.GoogleSource.WebURL = ""
	}
	detail.DiagnosticsURL = ""
	detail.PresentationWarnings = sanitizeLineagePresentationWarnings(detail.PresentationWarnings)
	return detail
}

func allowLineageLinkouts(ctx context.Context, authorizer coreadmin.Authorizer, permission string) bool {
	permission = strings.TrimSpace(permission)
	if authorizer == nil || permission == "" {
		return true
	}
	return authorizer.Can(ctx, permission, eSignAuthorizerResource)
}

func sanitizeLineagePresentationWarnings(warnings []services.LineagePresentationWarning) []services.LineagePresentationWarning {
	if len(warnings) == 0 {
		return nil
	}
	out := make([]services.LineagePresentationWarning, 0, len(warnings))
	for _, warning := range warnings {
		warning.ActionLabel = ""
		warning.ActionURL = ""
		out = append(out, warning)
	}
	return out
}

package modules

import (
	"fmt"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/services"
)

func buildDocumentLineagePresentation(detail services.DocumentLineageDetail) map[string]any {
	sourceType := determinePresentationSourceType(detail.GoogleSource)
	hasSource := detail.SourceDocument != nil
	hasRevision := detail.SourceRevision != nil
	hasArtifact := detail.SourceArtifact != nil
	status := determinePresentationStatus(hasSource, hasRevision, detail.EmptyState)
	fingerprint := normalizePresentationFingerprint(detail.FingerprintStatus)
	warnings := normalizePresentationWarnings(detail.PresentationWarnings)

	return map[string]any{
		"resource_kind":          "document",
		"resource_id":            strings.TrimSpace(detail.DocumentID),
		"status":                 status,
		"source_type":            sourceType,
		"headline":               "Source Provenance",
		"summary":                documentPresentationSummary(status, hasArtifact),
		"has_lineage":            hasSource || hasRevision || hasArtifact,
		"has_google_source":      detail.GoogleSource != nil,
		"has_artifact":           hasArtifact,
		"has_fingerprint":        fingerprint["is_ready"] == true || fingerprint["is_pending"] == true,
		"has_candidate_warnings": len(detail.CandidateWarningSummary) > 0,
		"source":                 normalizePresentationSource(detail.SourceDocument, sourceType),
		"revision":               normalizePresentationRevision(detail.SourceRevision),
		"artifact":               normalizePresentationArtifact(detail.SourceArtifact),
		"google_source":          normalizePresentationGoogleSource(detail.GoogleSource),
		"fingerprint_status":     fingerprint,
		"fingerprint_processing": detail.FingerprintProcessing,
		"empty_state":            normalizePresentationEmptyState(detail.EmptyState),
		"warnings":               warnings,
		"primary_warning":        firstPresentationWarning(warnings),
		"diagnostics_url":        strings.TrimSpace(detail.DiagnosticsURL),
		"show_diagnostics_link":  strings.TrimSpace(detail.DiagnosticsURL) != "",
	}
}

func buildAgreementLineagePresentation(detail services.AgreementLineageDetail) map[string]any {
	sourceType := determinePresentationSourceType(detail.GoogleSource)
	hasRevision := detail.SourceRevision != nil
	hasArtifact := detail.LinkedDocumentArtifact != nil
	status := determinePresentationStatus(hasRevision, hasArtifact, detail.EmptyState)
	warnings := normalizePresentationWarnings(detail.PresentationWarnings)

	return map[string]any{
		"resource_kind":          "agreement",
		"resource_id":            strings.TrimSpace(detail.AgreementID),
		"status":                 status,
		"source_type":            sourceType,
		"headline":               "Pinned Source Provenance",
		"summary":                agreementPresentationSummary(status, detail.NewerSourceExists),
		"has_lineage":            hasRevision || hasArtifact,
		"has_google_source":      detail.GoogleSource != nil,
		"has_artifact":           hasArtifact,
		"has_candidate_warnings": len(detail.CandidateWarningSummary) > 0,
		"newer_source_exists":    detail.NewerSourceExists,
		"newer_source":           normalizePresentationNewerSource(detail.NewerSourceSummary),
		"source":                 normalizePresentationSource(detail.SourceDocument, sourceType),
		"revision":               normalizePresentationRevision(detail.SourceRevision),
		"artifact":               normalizePresentationArtifact(detail.LinkedDocumentArtifact),
		"google_source":          normalizePresentationGoogleSource(detail.GoogleSource),
		"fingerprint_processing": detail.FingerprintProcessing,
		"empty_state":            normalizePresentationEmptyState(detail.EmptyState),
		"warnings":               warnings,
		"primary_warning":        firstPresentationWarning(warnings),
		"diagnostics_url":        strings.TrimSpace(detail.DiagnosticsURL),
		"show_diagnostics_link":  strings.TrimSpace(detail.DiagnosticsURL) != "",
	}
}

func determinePresentationSourceType(source *services.SourceMetadataBaseline) string {
	if source != nil && strings.TrimSpace(source.ExternalFileID) != "" {
		return "google_drive"
	}
	return "upload"
}

func determinePresentationStatus(hasSource, hasRevision bool, emptyState services.LineageEmptyState) string {
	if strings.TrimSpace(emptyState.Kind) != services.LineageEmptyStateNone && !hasSource && !hasRevision {
		return "empty"
	}
	if hasSource && hasRevision {
		return "native"
	}
	if hasSource || hasRevision {
		return "partial"
	}
	return "empty"
}

func documentPresentationSummary(status string, hasArtifact bool) string {
	switch strings.TrimSpace(status) {
	case "empty":
		return "This document was uploaded directly and has no linked upstream source."
	case "partial":
		return "This document has partial source provenance and may require operator diagnostics."
	default:
		if hasArtifact {
			return "This document is linked to a tracked upstream source revision and signable artifact."
		}
		return "This document is linked to a tracked upstream source revision."
	}
}

func agreementPresentationSummary(status string, newerSourceExists bool) string {
	switch strings.TrimSpace(status) {
	case "empty":
		return ""
	case "partial":
		return ""
	default:
		if newerSourceExists {
			return "A newer source revision is available."
		}
		return ""
	}
}

func normalizePresentationSource(ref *services.LineageReference, sourceType string) map[string]any {
	if ref == nil || strings.TrimSpace(ref.ID) == "" {
		return nil
	}
	return map[string]any{
		"id":       strings.TrimSpace(ref.ID),
		"label":    firstNonEmpty(strings.TrimSpace(ref.Label), strings.TrimSpace(ref.ID)),
		"url":      strings.TrimSpace(ref.URL),
		"provider": strings.TrimSpace(sourceType),
	}
}

func normalizePresentationRevision(rev *services.SourceRevisionSummary) map[string]any {
	if rev == nil || strings.TrimSpace(rev.ID) == "" {
		return nil
	}
	return map[string]any{
		"id":                  strings.TrimSpace(rev.ID),
		"version_hint":        strings.TrimSpace(rev.ProviderRevisionHint),
		"modified_at":         formatPresentationTime(rev.ModifiedTime),
		"exported_at":         formatPresentationTime(rev.ExportedAt),
		"exported_by_user_id": strings.TrimSpace(rev.ExportedByUserID),
		"mime_type":           strings.TrimSpace(rev.SourceMimeType),
	}
}

func normalizePresentationArtifact(artifact *services.SourceArtifactSummary) map[string]any {
	if artifact == nil || strings.TrimSpace(artifact.ID) == "" {
		return nil
	}
	return map[string]any{
		"id":                   strings.TrimSpace(artifact.ID),
		"kind":                 strings.TrimSpace(artifact.ArtifactKind),
		"object_key":           strings.TrimSpace(artifact.ObjectKey),
		"sha256":               strings.TrimSpace(artifact.SHA256),
		"page_count":           artifact.PageCount,
		"size_bytes":           artifact.SizeBytes,
		"size_bytes_formatted": formatPresentationBytes(artifact.SizeBytes),
		"compatibility_tier":   strings.TrimSpace(artifact.CompatibilityTier),
		"compatibility_reason": strings.TrimSpace(artifact.CompatibilityReason),
		"normalization_status": strings.TrimSpace(artifact.NormalizationStatus),
	}
}

func normalizePresentationGoogleSource(source *services.SourceMetadataBaseline) map[string]any {
	if source == nil || strings.TrimSpace(source.ExternalFileID) == "" {
		return nil
	}
	return map[string]any{
		"account_id":          strings.TrimSpace(source.AccountID),
		"file_id":             strings.TrimSpace(source.ExternalFileID),
		"web_url":             strings.TrimSpace(source.WebURL),
		"title":               strings.TrimSpace(source.TitleHint),
		"modified_time":       formatPresentationTime(source.ModifiedTime),
		"mime_type":           strings.TrimSpace(source.SourceMimeType),
		"ingestion_mode":      strings.TrimSpace(source.SourceIngestionMode),
		"page_count_hint":     source.PageCountHint,
		"owner_email":         strings.TrimSpace(source.OwnerEmail),
		"source_version_hint": strings.TrimSpace(source.SourceVersionHint),
	}
}

func normalizePresentationFingerprint(status services.FingerprintStatusSummary) map[string]any {
	statusValue := strings.TrimSpace(status.Status)
	return map[string]any{
		"status":             statusValue,
		"status_label":       fingerprintStatusLabel(statusValue),
		"extract_version":    strings.TrimSpace(status.ExtractVersion),
		"evidence_available": status.EvidenceAvailable,
		"error_message":      strings.TrimSpace(status.ErrorMessage),
		"error_code":         strings.TrimSpace(status.ErrorCode),
		"is_pending":         statusValue == services.LineageFingerprintStatusPending,
		"is_ready":           statusValue == services.LineageFingerprintStatusReady,
		"is_failed":          statusValue == services.LineageFingerprintStatusFailed,
		"is_not_applicable":  statusValue == services.LineageFingerprintStatusNotApplicable,
		"is_unknown":         statusValue == "" || statusValue == services.LineageFingerprintStatusUnknown,
	}
}

func normalizePresentationEmptyState(state services.LineageEmptyState) map[string]any {
	return map[string]any{
		"kind":             strings.TrimSpace(state.Kind),
		"title":            strings.TrimSpace(state.Title),
		"description":      strings.TrimSpace(state.Description),
		"show_placeholder": strings.TrimSpace(state.Kind) != services.LineageEmptyStateNone,
	}
}

func normalizePresentationNewerSource(summary *services.NewerSourceSummary) map[string]any {
	if summary == nil {
		return nil
	}
	return map[string]any{
		"exists":                    summary.Exists,
		"pinned_source_revision_id": strings.TrimSpace(summary.PinnedSourceRevisionID),
		"latest_source_revision_id": strings.TrimSpace(summary.LatestSourceRevisionID),
		"summary":                   strings.TrimSpace(summary.Summary),
	}
}

func normalizePresentationWarnings(warnings []services.LineagePresentationWarning) []map[string]any {
	out := make([]map[string]any, 0, len(warnings))
	for _, warning := range warnings {
		evidence := make([]map[string]any, 0, len(warning.Evidence))
		for _, item := range warning.Evidence {
			evidence = append(evidence, map[string]any{
				"label":   strings.TrimSpace(item.Label),
				"details": strings.TrimSpace(item.Details),
			})
		}
		out = append(out, map[string]any{
			"id":                    strings.TrimSpace(warning.ID),
			"severity":              strings.TrimSpace(warning.Severity),
			"type":                  strings.TrimSpace(warning.Type),
			"title":                 strings.TrimSpace(warning.Title),
			"description":           strings.TrimSpace(warning.Description),
			"action_label":          strings.TrimSpace(warning.ActionLabel),
			"action_url":            strings.TrimSpace(warning.ActionURL),
			"review_action_visible": strings.TrimSpace(warning.ReviewActionVisible),
			"evidence":              evidence,
		})
	}
	return out
}

func firstPresentationWarning(warnings []map[string]any) map[string]any {
	if len(warnings) == 0 {
		return nil
	}
	return warnings[0]
}

func fingerprintStatusLabel(status string) string {
	switch strings.TrimSpace(status) {
	case services.LineageFingerprintStatusReady:
		return "Fingerprint Ready"
	case services.LineageFingerprintStatusPending:
		return "Fingerprint Pending"
	case services.LineageFingerprintStatusFailed:
		return "Fingerprint Failed"
	case services.LineageFingerprintStatusNotApplicable:
		return "Not Applicable"
	default:
		return "Fingerprint Unknown"
	}
}

func formatPresentationTime(value *time.Time) string {
	if value == nil || value.IsZero() {
		return ""
	}
	return value.UTC().Format("Jan 2, 2006 3:04 PM MST")
}

func formatPresentationBytes(bytes int64) string {
	if bytes <= 0 {
		return ""
	}
	size := float64(bytes)
	units := []string{"B", "KB", "MB", "GB"}
	index := 0
	for size >= 1024 && index < len(units)-1 {
		size = size / 1024
		index++
	}
	if index == 0 {
		return fmt.Sprintf("%.0f %s", size, units[index])
	}
	return fmt.Sprintf("%.1f %s", size, units[index])
}

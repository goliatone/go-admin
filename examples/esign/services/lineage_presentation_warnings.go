package services

import "strings"

const lineageDiagnosticsReviewActionLabel = "Review in diagnostics"

func BuildDocumentPresentationWarnings(detail DocumentLineageDetail) []LineagePresentationWarning {
	warnings := buildCandidatePresentationWarnings(detail.CandidateWarningSummary, detail.DiagnosticsURL)
	if detail.EmptyState.Kind != LineageEmptyStateNone {
		return warnings
	}
	switch detail.FingerprintProcessing.State {
	case LineageFingerprintProcessingFailed:
		description := firstNonEmpty(strings.TrimSpace(detail.FingerprintProcessing.LastErrorMessage), strings.TrimSpace(detail.FingerprintStatus.ErrorMessage))
		if description == "" {
			description = "Document fingerprinting failed. Candidate detection may be unavailable until fingerprint extraction succeeds."
		}
		warnings = append(warnings, LineagePresentationWarning{
			ID:          "fingerprint_failed_warning",
			Type:        "fingerprint_failed",
			Severity:    LineageWarningSeverityWarning,
			Title:       "Fingerprint Extraction Failed",
			Description: description,
		})
	case LineageFingerprintProcessingQueued, LineageFingerprintProcessingRunning, LineageFingerprintProcessingRetrying:
		warnings = append(warnings, LineagePresentationWarning{
			ID:          "fingerprint_pending_warning",
			Type:        "fingerprint_pending",
			Severity:    LineageWarningSeverityInfo,
			Title:       "Fingerprint Processing",
			Description: "Document fingerprinting is queued or in progress. Candidate detection may be incomplete.",
		})
	case LineageFingerprintProcessingStale:
		warnings = append(warnings, LineagePresentationWarning{
			ID:          "fingerprint_stale_warning",
			Type:        "fingerprint_stale",
			Severity:    LineageWarningSeverityWarning,
			Title:       "Fingerprint Processing Stalled",
			Description: "Fingerprint processing did not reach a terminal state and likely needs retry or repair.",
		})
	}
	return warnings
}

func BuildAgreementPresentationWarnings(detail AgreementLineageDetail) []LineagePresentationWarning {
	warnings := buildCandidatePresentationWarnings(detail.CandidateWarningSummary, detail.DiagnosticsURL)
	if detail.NewerSourceExists && detail.EmptyState.Kind == LineageEmptyStateNone {
		warnings = append(warnings, LineagePresentationWarning{
			ID:          "newer_source_warning",
			Type:        "newer_source_exists",
			Severity:    LineageWarningSeverityInfo,
			Title:       "Newer Source Available",
			Description: "A newer source revision exists. This agreement remains pinned to the earlier revision used when it was created.",
		})
	}
	return warnings
}

func buildCandidatePresentationWarnings(
	warnings []CandidateWarningSummary,
	diagnosticsURL string,
) []LineagePresentationWarning {
	out := make([]LineagePresentationWarning, 0, len(warnings))
	for _, warning := range warnings {
		evidence := append([]CandidateEvidenceSummary{}, warning.Evidence...)
		presentation := LineagePresentationWarning{
			ID:                  strings.TrimSpace(warning.ID),
			Type:                "candidate_relationship",
			Severity:            candidateWarningSeverity(warning.Status, warning.ConfidenceBand),
			Title:               humanizeLineageWarningTitle(warning.RelationshipType, warning.Status),
			Description:         strings.TrimSpace(warning.Summary),
			ReviewActionVisible: strings.TrimSpace(warning.ReviewActionVisible),
			Evidence:            evidence,
		}
		if shouldShowDiagnosticsReviewLink(presentation.ReviewActionVisible, diagnosticsURL) {
			presentation.ActionLabel = lineageDiagnosticsReviewActionLabel
			presentation.ActionURL = strings.TrimSpace(diagnosticsURL)
		}
		out = append(out, presentation)
	}
	return out
}

func candidateWarningSeverity(status, confidenceBand string) string {
	if strings.TrimSpace(status) == "pending_review" {
		switch strings.TrimSpace(confidenceBand) {
		case "high":
			return LineageWarningSeverityCritical
		case "medium":
			return LineageWarningSeverityWarning
		default:
			return LineageWarningSeverityInfo
		}
	}
	if strings.TrimSpace(status) == "confirmed" {
		return LineageWarningSeverityInfo
	}
	return LineageWarningSeverityNone
}

func shouldShowDiagnosticsReviewLink(reviewVisibility, diagnosticsURL string) bool {
	if strings.TrimSpace(diagnosticsURL) == "" {
		return false
	}
	switch strings.TrimSpace(reviewVisibility) {
	case "", LineageReviewVisibilityHidden:
		return false
	default:
		return true
	}
}

func humanizeLineageWarningTitle(relationshipType, status string) string {
	relationshipLabel := humanizeLineageWarningValue(relationshipType)
	statusLabel := humanizeLineageWarningValue(status)
	if relationshipLabel == "" {
		relationshipLabel = "Candidate relationship"
	}
	if statusLabel == "" {
		return relationshipLabel
	}
	return relationshipLabel + " - " + statusLabel
}

func humanizeLineageWarningValue(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	parts := strings.Split(value, "_")
	for i, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		parts[i] = strings.ToUpper(part[:1]) + part[1:]
	}
	return strings.Join(parts, " ")
}

package services

import (
	"strings"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

const (
	PDFCompatibilityReasonNormalizationFailed      = "normalize.failed"
	PDFCompatibilityReasonPreviewFallbackDisabled  = "preview_fallback.disabled"
	PDFCompatibilityReasonOriginalFallbackDisabled = "original_fallback.disallowed"
	PDFCompatibilityReasonUnsupported              = "unsupported"
)

type PDFCompatibilityStatus struct {
	Tier   PDFCompatibilityTier
	Reason string
}

func normalizePDFCompatibilityTier(raw string) PDFCompatibilityTier {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case string(PDFCompatibilityTierFull):
		return PDFCompatibilityTierFull
	case string(PDFCompatibilityTierLimited):
		return PDFCompatibilityTierLimited
	case string(PDFCompatibilityTierUnsupported):
		return PDFCompatibilityTierUnsupported
	default:
		return ""
	}
}

func normalizePDFNormalizationStatus(raw string) PDFNormalizationStatus {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case string(PDFNormalizationStatusNotRequested):
		return PDFNormalizationStatusNotRequested
	case string(PDFNormalizationStatusPending):
		return PDFNormalizationStatusPending
	case string(PDFNormalizationStatusCompleted):
		return PDFNormalizationStatusCompleted
	case string(PDFNormalizationStatusFailed):
		return PDFNormalizationStatusFailed
	default:
		return ""
	}
}

func resolveDocumentCompatibility(policy PDFPolicy, document stores.DocumentRecord) PDFCompatibilityStatus {
	policy = normalizePDFPolicy(policy)
	status := PDFCompatibilityStatus{
		Tier:   normalizePDFCompatibilityTier(document.PDFCompatibilityTier),
		Reason: strings.TrimSpace(document.PDFCompatibilityReason),
	}
	normalizationStatus := normalizePDFNormalizationStatus(document.PDFNormalizationStatus)
	if status.Tier == "" {
		switch normalizationStatus {
		case PDFNormalizationStatusFailed:
			status.Reason = coalesceCompatibilityReason(status.Reason, PDFCompatibilityReasonNormalizationFailed)
			if policy.CompatibilityMode == PDFCompatibilityModeStrict {
				status.Tier = PDFCompatibilityTierUnsupported
				status.Reason = coalesceCompatibilityReason(status.Reason, PDFCompatibilityReasonOriginalFallbackDisabled)
			} else if policy.PreviewFallbackEnabled {
				status.Tier = PDFCompatibilityTierLimited
			} else {
				status.Tier = PDFCompatibilityTierUnsupported
				status.Reason = PDFCompatibilityReasonPreviewFallbackDisabled
			}
		default:
			status.Tier = PDFCompatibilityTierFull
		}
	}
	if status.Tier == PDFCompatibilityTierLimited {
		if policy.CompatibilityMode == PDFCompatibilityModeStrict {
			status.Tier = PDFCompatibilityTierUnsupported
			status.Reason = PDFCompatibilityReasonOriginalFallbackDisabled
		} else if !policy.PreviewFallbackEnabled {
			status.Tier = PDFCompatibilityTierUnsupported
			status.Reason = PDFCompatibilityReasonPreviewFallbackDisabled
		}
	}
	if status.Tier == PDFCompatibilityTierUnsupported {
		status.Reason = coalesceCompatibilityReason(status.Reason, PDFCompatibilityReasonUnsupported)
	}
	return status
}

func coalesceCompatibilityReason(primary, fallback string) string {
	primary = strings.TrimSpace(primary)
	if primary != "" {
		return primary
	}
	return strings.TrimSpace(fallback)
}

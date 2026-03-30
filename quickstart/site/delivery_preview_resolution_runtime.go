package site

import (
	"strings"

	"github.com/goliatone/go-admin/admin"
)

func previewFallbackCandidates(
	capability deliveryCapability,
	records []admin.CMSContent,
	state RequestState,
) []admin.CMSContent {
	previewContentID := strings.TrimSpace(state.PreviewContentID)
	if previewContentID == "" || len(records) == 0 {
		return nil
	}

	candidates := make([]admin.CMSContent, 0, len(records))
	for _, record := range records {
		if strings.TrimSpace(record.ID) != previewContentID {
			continue
		}
		if !previewRecordMatchesEntityType(state.PreviewEntityType, capability, record) {
			continue
		}
		candidates = append(candidates, record)
	}
	return candidates
}

func (r *deliveryRuntime) resolvePreviewFallbackByRecordID(
	capabilities []deliveryCapability,
	recordsByType map[string][]admin.CMSContent,
	state RequestState,
) (*deliveryResolution, SiteRuntimeError, bool) {
	if !previewStateAllowsDraft(state) {
		return nil, SiteRuntimeError{}, false
	}
	previewContentID := strings.TrimSpace(state.PreviewContentID)
	if previewContentID == "" {
		return nil, SiteRuntimeError{}, false
	}

	for _, capability := range capabilities {
		candidates := previewFallbackCandidates(capability, recordsByType[capability.TypeSlug], state)
		if len(candidates) == 0 {
			continue
		}

		selected, missing, available, fallbackUsed := resolveLocaleRecord(candidates, state, capability, r.siteCfg.AllowLocaleFallback, r.siteCfg.DefaultLocale)
		if !missing && selected.ID == "" {
			continue
		}
		if missing && !r.siteCfg.AllowLocaleFallback {
			return nil, translationMissingSiteError(state.Locale, available, capability.TypeSlug, previewContentID), true
		}
		resolution := resolutionFromDetailRecord(capability, selected, state.Locale, available, fallbackUsed, candidates)
		return resolution, SiteRuntimeError{}, true
	}

	return nil, SiteRuntimeError{}, false
}

package site

import (
	"context"
	"errors"
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

		return r.resolvePreviewFallbackCandidates(capability, candidates, state)
	}

	return nil, SiteRuntimeError{}, false
}

func (r *deliveryRuntime) resolvePreviewFallbackByDirectContent(
	ctx context.Context,
	capabilities []deliveryCapability,
	state RequestState,
	cache *siteContentCache,
) (*deliveryResolution, SiteRuntimeError, bool) {
	if !previewStateAllowsDraft(state) {
		return nil, SiteRuntimeError{}, false
	}
	previewContentID := strings.TrimSpace(state.PreviewContentID)
	if previewContentID == "" || r == nil || r.contentSvc == nil {
		return nil, SiteRuntimeError{}, false
	}

	record, err := cache.Content(ctx, r.contentSvc, previewContentID, state.Locale)
	if err != nil {
		if errors.Is(err, admin.ErrNotFound) {
			return nil, SiteRuntimeError{}, false
		}
		return nil, SiteRuntimeError{Status: 500, Message: err.Error()}, true
	}
	if record == nil {
		return nil, SiteRuntimeError{}, false
	}

	for _, capability := range capabilities {
		if !previewRecordMatchesEntityType(state.PreviewEntityType, capability, *record) {
			continue
		}
		if !matchesCapabilityType(*record, capability.TypeSlug) {
			continue
		}
		if !recordVisibleForRequest(*record, capability, state) {
			continue
		}
		return r.resolvePreviewFallbackCandidates(capability, []admin.CMSContent{*record}, state)
	}
	return nil, SiteRuntimeError{}, false
}

func (r *deliveryRuntime) resolvePreviewFallbackCandidates(
	capability deliveryCapability,
	candidates []admin.CMSContent,
	state RequestState,
) (*deliveryResolution, SiteRuntimeError, bool) {
	previewContentID := strings.TrimSpace(state.PreviewContentID)
	selected, missing, available, fallbackUsed := resolveLocaleRecord(candidates, state, capability, r.siteCfg.AllowLocaleFallback, r.siteCfg.DefaultLocale)
	if !missing && selected.ID == "" {
		return nil, SiteRuntimeError{}, false
	}
	if missing && !r.siteCfg.AllowLocaleFallback {
		return nil, translationMissingSiteError(state.Locale, available, capability.TypeSlug, previewContentID), true
	}
	resolution := resolutionFromDetailRecord(capability, selected, state.Locale, available, fallbackUsed, candidates)
	return resolution, SiteRuntimeError{}, true
}

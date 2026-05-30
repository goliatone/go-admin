package site

import (
	"context"

	"github.com/goliatone/go-admin/admin"
)

func matchedSiteRuntimeResult(
	resolution *deliveryResolution,
	siteErr SiteRuntimeError,
	matched bool,
) (*deliveryResolution, SiteRuntimeError, bool) {
	if !matched {
		return nil, SiteRuntimeError{}, false
	}
	if hasSiteRuntimeError(siteErr) {
		return nil, siteErr, true
	}
	return resolution, SiteRuntimeError{}, true
}

func (r *deliveryRuntime) resolvePageCapabilities(
	ctx context.Context,
	capabilities []deliveryCapability,
	recordsByType map[string][]admin.CMSContent,
	state RequestState,
	requestPath string,
	cache *siteContentCache,
) (*deliveryResolution, SiteRuntimeError, bool) {
	for _, capability := range capabilities {
		if capability.normalizedKind() != "page" {
			continue
		}
		resolution, siteErr, matched := r.resolvePageKind(ctx, capability, recordsByType[capability.TypeSlug], state, requestPath, cache)
		if resolved, resolvedErr, ok := matchedSiteRuntimeResult(resolution, siteErr, matched); ok {
			return resolved, resolvedErr, true
		}
	}
	return nil, SiteRuntimeError{}, false
}

func (r *deliveryRuntime) resolvePageCandidateCapabilities(
	ctx context.Context,
	capabilities []deliveryCapability,
	recordsForCapability deliveryCapabilityRecordsLoader,
	state RequestState,
	requestPath string,
	cache *siteContentCache,
) (*deliveryResolution, SiteRuntimeError, bool) {
	for _, capability := range capabilities {
		records, err := recordsForCapability(capability)
		if err != nil {
			return nil, SiteRuntimeError{Status: 500, Message: err.Error()}, true
		}
		resolution, siteErr, matched := r.resolvePageKind(ctx, capability, records, state, requestPath, cache)
		if resolved, resolvedErr, ok := matchedSiteRuntimeResult(resolution, siteErr, matched); ok {
			return resolved, resolvedErr, true
		}
	}
	return nil, SiteRuntimeError{}, false
}

func (r *deliveryRuntime) resolveDetailCapabilities(
	ctx context.Context,
	capabilities []deliveryCapability,
	recordsByType map[string][]admin.CMSContent,
	state RequestState,
	requestPath string,
	cache *siteContentCache,
) (*deliveryResolution, SiteRuntimeError, bool) {
	for _, capability := range capabilities {
		kind := capability.normalizedKind()
		if kind != "detail" && kind != "hybrid" {
			continue
		}
		resolution, siteErr, matched := r.resolveDetailKind(ctx, capability, recordsByType[capability.TypeSlug], state, requestPath, cache)
		if resolved, resolvedErr, ok := matchedSiteRuntimeResult(resolution, siteErr, matched); ok {
			return resolved, resolvedErr, true
		}
	}
	return nil, SiteRuntimeError{}, false
}

func (r *deliveryRuntime) resolveDetailCandidateCapabilities(
	ctx context.Context,
	capabilities []deliveryCapability,
	recordsForCapability deliveryCapabilityRecordsLoader,
	state RequestState,
	requestPath string,
	cache *siteContentCache,
) (*deliveryResolution, SiteRuntimeError, bool) {
	for _, capability := range capabilities {
		records, err := recordsForCapability(capability)
		if err != nil {
			return nil, SiteRuntimeError{Status: 500, Message: err.Error()}, true
		}
		resolution, siteErr, matched := r.resolveDetailKind(ctx, capability, records, state, requestPath, cache)
		if resolved, resolvedErr, ok := matchedSiteRuntimeResult(resolution, siteErr, matched); ok {
			return resolved, resolvedErr, true
		}
	}
	return nil, SiteRuntimeError{}, false
}

func (r *deliveryRuntime) resolveCollectionCapabilities(
	capabilities []deliveryCapability,
	recordsByType map[string][]admin.CMSContent,
	state RequestState,
	requestPath string,
) (*deliveryResolution, bool) {
	for _, capability := range capabilities {
		kind := capability.normalizedKind()
		if kind != "collection" && kind != "hybrid" {
			continue
		}
		if resolution, matched := r.resolveCollectionKind(capability, recordsByType[capability.TypeSlug], state, requestPath); matched {
			return resolution, true
		}
	}
	return nil, false
}

func (r *deliveryRuntime) resolveCollectionCandidateCapabilities(
	capabilities []deliveryCapability,
	recordsForCapability deliveryCapabilityRecordsLoader,
	state RequestState,
	requestPath string,
) (*deliveryResolution, SiteRuntimeError, bool) {
	for _, capability := range capabilities {
		records, err := recordsForCapability(capability)
		if err != nil {
			return nil, SiteRuntimeError{Status: 500, Message: err.Error()}, true
		}
		if resolution, matched := r.resolveCollectionKind(capability, records, state, requestPath); matched {
			return resolution, SiteRuntimeError{}, true
		}
	}
	return nil, SiteRuntimeError{}, false
}

func (r *deliveryRuntime) resolvePreviewFallback(
	capabilities []deliveryCapability,
	recordsByType map[string][]admin.CMSContent,
	state RequestState,
) (*deliveryResolution, SiteRuntimeError, bool) {
	resolution, siteErr, matched := r.resolvePreviewFallbackByRecordID(capabilities, recordsByType, state)
	if !matched {
		return nil, SiteRuntimeError{}, false
	}
	if hasSiteRuntimeError(siteErr) {
		return nil, siteErr, true
	}
	return resolution, SiteRuntimeError{}, true
}

func (r *deliveryRuntime) resolvePreviewCandidateCapabilities(
	ctx context.Context,
	capabilities []deliveryCapability,
	recordsForCapability deliveryCapabilityRecordsLoader,
	state RequestState,
	cache *siteContentCache,
) (*deliveryResolution, SiteRuntimeError, bool) {
	if len(capabilities) == 0 {
		return nil, SiteRuntimeError{}, false
	}
	if resolution, siteErr, matched := r.resolvePreviewFallbackByDirectContent(ctx, capabilities, state, cache); matched {
		return resolution, siteErr, true
	}
	recordsByType := map[string][]admin.CMSContent{}
	for _, capability := range capabilities {
		records, err := recordsForCapability(capability)
		if err != nil {
			return nil, SiteRuntimeError{Status: 500, Message: err.Error()}, true
		}
		recordsByType[capability.TypeSlug] = records
	}
	return r.resolvePreviewFallback(capabilities, recordsByType, state)
}

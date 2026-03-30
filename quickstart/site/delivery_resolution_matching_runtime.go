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

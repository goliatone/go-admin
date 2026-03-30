package site

import (
	"context"
	"sort"
	"strings"

	"github.com/goliatone/go-admin/admin"
)

func (r *deliveryRuntime) resolve(ctx context.Context, state RequestState, requestPath string, cache *siteContentCache) (*deliveryResolution, SiteRuntimeError) {
	capabilities, err := r.capabilities(ctx)
	if err != nil {
		return nil, SiteRuntimeError{Status: 500, Message: err.Error()}
	}
	if len(capabilities) == 0 {
		return nil, SiteRuntimeError{}
	}
	contents, err := r.listSiteContentsCached(ctx, state.Locale, cache)
	if err != nil {
		return nil, SiteRuntimeError{Status: 500, Message: err.Error()}
	}
	recordsByType := r.recordsByType(capabilities, contents, state)

	if resolution, siteErr, matched := r.resolvePageCapabilities(ctx, capabilities, recordsByType, state, requestPath, cache); matched {
		if hasSiteRuntimeError(siteErr) {
			return nil, siteErr
		}
		return resolution, SiteRuntimeError{}
	}

	if resolution, siteErr, matched := r.resolveDetailCapabilities(ctx, capabilities, recordsByType, state, requestPath, cache); matched {
		if hasSiteRuntimeError(siteErr) {
			return nil, siteErr
		}
		return resolution, SiteRuntimeError{}
	}

	if resolution, matched := r.resolveCollectionCapabilities(capabilities, recordsByType, state, requestPath); matched {
		return resolution, SiteRuntimeError{}
	}

	if resolution, siteErr, matched := r.resolvePreviewFallback(capabilities, recordsByType, state); matched {
		if hasSiteRuntimeError(siteErr) {
			return nil, siteErr
		}
		return resolution, SiteRuntimeError{}
	}

	return nil, SiteRuntimeError{}
}

func (r *deliveryRuntime) capabilities(ctx context.Context) ([]deliveryCapability, error) {
	items, err := r.contentTypeSvc.ContentTypes(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]deliveryCapability, 0, len(items))
	for _, item := range items {
		capability, ok := capabilityFromContentType(item)
		if !ok {
			continue
		}
		out = append(out, capability)
	}
	sort.SliceStable(out, func(i, j int) bool {
		left := strings.TrimSpace(out[i].TypeSlug)
		right := strings.TrimSpace(out[j].TypeSlug)
		if left == right {
			return out[i].normalizedKind() < out[j].normalizedKind()
		}
		return left < right
	})
	return out, nil
}

func (r *deliveryRuntime) recordsByType(
	capabilities []deliveryCapability,
	contents []admin.CMSContent,
	state RequestState,
) map[string][]admin.CMSContent {
	out := make(map[string][]admin.CMSContent, len(capabilities))
	for _, capability := range capabilities {
		filtered := []admin.CMSContent{}
		for _, record := range contents {
			if !matchesCapabilityType(record, capability.TypeSlug) {
				continue
			}
			if !recordVisibleForRequest(record, capability, state) {
				continue
			}
			filtered = append(filtered, record)
		}
		out[capability.TypeSlug] = filtered
	}
	return out
}

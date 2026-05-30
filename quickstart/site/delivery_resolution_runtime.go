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
	recordsForCapability := r.scopedCapabilityRecordsLoader(ctx, state, cache)

	if resolution, siteErr, matched := r.resolvePageCandidateCapabilities(ctx, pageCandidateCapabilities(capabilities, requestPath), recordsForCapability, state, requestPath, cache); matched {
		if hasSiteRuntimeError(siteErr) {
			return nil, siteErr
		}
		return resolution, SiteRuntimeError{}
	}

	if resolution, siteErr, matched := r.resolveDetailCandidateCapabilities(ctx, detailCandidateCapabilities(capabilities, requestPath), recordsForCapability, state, requestPath, cache); matched {
		if hasSiteRuntimeError(siteErr) {
			return nil, siteErr
		}
		return resolution, SiteRuntimeError{}
	}

	if resolution, siteErr, matched := r.resolveCollectionCandidateCapabilities(collectionCandidateCapabilities(capabilities, requestPath), recordsForCapability, state, requestPath); matched {
		if hasSiteRuntimeError(siteErr) {
			return nil, siteErr
		}
		return resolution, SiteRuntimeError{}
	}

	if resolution, siteErr, matched := r.resolvePreviewCandidateCapabilities(ctx, previewCandidateCapabilities(capabilities, state), recordsForCapability, state, cache); matched {
		if hasSiteRuntimeError(siteErr) {
			return nil, siteErr
		}
		return resolution, SiteRuntimeError{}
	}

	return nil, SiteRuntimeError{}
}

type deliveryCapabilityRecordsLoader func(deliveryCapability) ([]admin.CMSContent, error)

func (r *deliveryRuntime) scopedCapabilityRecordsLoader(ctx context.Context, state RequestState, cache *siteContentCache) deliveryCapabilityRecordsLoader {
	loaded := map[string][]admin.CMSContent{}
	return func(capability deliveryCapability) ([]admin.CMSContent, error) {
		key := scopedCapabilityRecordsLoaderKey(capability, state.Locale)
		if records, ok := loaded[key]; ok {
			return cloneContentRecords(records), nil
		}
		items, err := r.listSiteContentsForCapabilityCached(ctx, capability, state.Locale, cache)
		if err != nil {
			return nil, err
		}
		filtered := filterCapabilityRecords(items, capability, state)
		loaded[key] = cloneContentRecords(filtered)
		return filtered, nil
	}
}

func scopedCapabilityRecordsLoaderKey(capability deliveryCapability, locale string) string {
	scope := strings.TrimSpace(capability.TypeID)
	if scope == "" {
		scope = strings.ToLower(strings.TrimSpace(capability.TypeSlug))
	}
	return strings.ToLower(strings.TrimSpace(locale)) + "|" + scope
}

func filterCapabilityRecords(contents []admin.CMSContent, capability deliveryCapability, state RequestState) []admin.CMSContent {
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
	return filtered
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

func pageCandidateCapabilities(capabilities []deliveryCapability, requestPath string) []deliveryCapability {
	out := []deliveryCapability{}
	for _, capability := range capabilities {
		if capability.normalizedKind() != "page" {
			continue
		}
		out = append(out, capability)
	}
	return out
}

func detailCandidateCapabilities(capabilities []deliveryCapability, requestPath string) []deliveryCapability {
	out := []deliveryCapability{}
	for _, capability := range capabilities {
		kind := capability.normalizedKind()
		if kind != "detail" && kind != "hybrid" {
			continue
		}
		if _, ok := matchRoutePattern(capability.detailRoutePattern(), requestPath); !ok {
			continue
		}
		out = append(out, capability)
	}
	return out
}

func collectionCandidateCapabilities(capabilities []deliveryCapability, requestPath string) []deliveryCapability {
	out := []deliveryCapability{}
	for _, capability := range capabilities {
		kind := capability.normalizedKind()
		if kind != "collection" && kind != "hybrid" {
			continue
		}
		if _, ok := matchRoutePattern(capability.listRoutePattern(), requestPath); !ok {
			continue
		}
		out = append(out, capability)
	}
	return out
}

func previewCandidateCapabilities(capabilities []deliveryCapability, state RequestState) []deliveryCapability {
	if !previewStateAllowsDraft(state) || strings.TrimSpace(state.PreviewContentID) == "" {
		return nil
	}
	out := []deliveryCapability{}
	for _, capability := range capabilities {
		if !previewEntityMatchesAnyType(state.PreviewEntityType, capability.TypeSlug) {
			continue
		}
		out = append(out, capability)
	}
	return out
}

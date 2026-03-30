package site

import (
	"strings"

	"github.com/goliatone/go-admin/admin"
)

func previewStateAllowsDraft(state RequestState) bool {
	return state.PreviewTokenPresent && state.PreviewTokenValid && state.IsPreview
}

func previewAllowsRecord(record admin.CMSContent, capability deliveryCapability, state RequestState) bool {
	if !previewStateAllowsDraft(state) {
		return false
	}
	if strings.TrimSpace(state.PreviewContentID) == "" || strings.TrimSpace(record.ID) == "" {
		return false
	}
	if strings.TrimSpace(state.PreviewContentID) != strings.TrimSpace(record.ID) {
		return false
	}
	return previewRecordMatchesEntityType(state.PreviewEntityType, capability, record)
}

func previewRecordMatchesEntityType(entityType string, capability deliveryCapability, record admin.CMSContent) bool {
	return previewEntityMatchesAnyType(
		entityType,
		capability.TypeSlug,
		record.ContentTypeSlug,
		record.ContentType,
	)
}

func previewEntityAllowsMenuDrafts(raw string) bool {
	return previewEntityMatchesAnyType(
		raw,
		"menu",
		"menus",
		"navigation",
		"menu_binding",
		"menu_bindings",
		"menu_view_profile",
		"menu_view_profiles",
	)
}

func previewEntityMatchesAnyType(entityType string, candidates ...string) bool {
	entityType = strings.ToLower(strings.TrimSpace(entityType))
	if entityType == "" {
		return false
	}
	tokenCandidates := []string{
		entityType,
		singularTypeSlug(entityType),
		pluralTypeSlug(entityType),
	}
	for _, tokenCandidate := range tokenCandidates {
		tokenCandidate = singularTypeSlug(tokenCandidate)
		if tokenCandidate == "" {
			continue
		}
		for _, candidate := range candidates {
			if tokenCandidate == singularTypeSlug(candidate) {
				return true
			}
		}
	}
	return false
}

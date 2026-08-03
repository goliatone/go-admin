package client

import "strings"
import "testing"

func TestContentListTemplateQuickFilterUsesCanonicalIncompletePredicate(t *testing.T) {
	template := mustReadClientTemplate(t, "resources/content/list.html")

	required := []string{
		`id="incomplete-translations-filter"`,
		`column: 'incomplete'`,
		`operator: 'eq'`,
		`value: 'true'`,
	}
	for _, fragment := range required {
		if strings.Contains(template, fragment) {
			continue
		}
		t.Fatalf("expected content list template fragment not found: %q", fragment)
	}
	if strings.Contains(template, `column: 'readiness_state'`) {
		t.Fatalf("expected quick filter to avoid legacy readiness_state predicate path")
	}
}

func TestContentListTemplateIncludesTranslationsQueueCellRenderers(t *testing.T) {
	template := mustReadClientTemplate(t, "resources/content/list.html")

	required := []string{
		`async function loadTranslationAssigneeLookup()`,
		`createTranslationsQueueCellRenderers`,
		`assignee_id: (value, record) =>`,
		`source_locale: (value) =>`,
		`target_locale: (value) =>`,
		`priority: (value) =>`,
		`status: (value) =>`,
		`panelName !== 'translations'`,
		`renderVocabularyStatusBadge`,
	}
	for _, fragment := range required {
		if strings.Contains(template, fragment) {
			continue
		}
		t.Fatalf("expected translations queue renderer fragment not found: %q", fragment)
	}
}

func TestContentListTemplateIncludesTranslationDatagridSummaryRenderers(t *testing.T) {
	template := mustReadClientTemplate(t, "resources/content/list.html")

	required := []string{
		`renderTranslationFamilyLink`,
		`renderTranslationFamilyMemberCount`,
		`renderTranslationAssignmentSummary`,
		`renderTranslationExchangeSummary`,
		`translation_family_url: (_value, record) =>`,
		`family_member_count: (_value, record) =>`,
		`translation_assignment_summary: (value) =>`,
		`translation_exchange_summary: (value) =>`,
	}
	for _, fragment := range required {
		if strings.Contains(template, fragment) {
			continue
		}
		t.Fatalf("expected translation datagrid renderer fragment not found: %q", fragment)
	}
}

func TestContentListTemplateDoesNotManufacturePreferencesEndpoint(t *testing.T) {
	template := mustReadClientTemplate(t, "resources/content/list.html")

	for _, fragment := range []string{
		`DefaultColumnVisibilityBehavior`,
		`const preferencesEndpoint = preferencesAPIPath;`,
		`if (preferencesEndpoint) {`,
		`requestedStateStoreMode === 'preferences' && !preferencesEndpoint`,
	} {
		if !strings.Contains(template, fragment) {
			t.Fatalf("expected capability-aware persistence fragment not found: %q", fragment)
		}
	}
	for _, fragment := range []string{
		"`${apiBasePath}/panels/preferences`",
		"`${basePath}/api/panels/preferences`",
	} {
		if strings.Contains(template, fragment) {
			t.Fatalf("template manufactured an unavailable preferences endpoint: %q", fragment)
		}
	}
}

func TestResourceListTemplatesUseLocalColumnVisibilityWithoutPreferencesCapability(t *testing.T) {
	for _, name := range []string{
		"resources/users/list.html",
		"resources/user-profiles/list.html",
	} {
		t.Run(name, func(t *testing.T) {
			template := mustReadClientTemplate(t, name)
			if !strings.Contains(template, "DefaultColumnVisibilityBehavior") ||
				!strings.Contains(template, "if (preferencesEndpoint) {") {
				t.Fatalf("%s does not provide a capability-aware local fallback", name)
			}
			if strings.Contains(template, "`${apiBasePath}/panels/preferences`") ||
				strings.Contains(template, "`${basePath}/api/panels/preferences`") {
				t.Fatalf("%s manufactures a preferences endpoint", name)
			}
		})
	}
}

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

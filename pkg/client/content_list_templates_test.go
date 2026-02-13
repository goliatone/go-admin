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

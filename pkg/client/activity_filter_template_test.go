package client

import (
	"strings"
	"testing"
)

func TestActivityFilterTemplateUsesOptionBackedControls(t *testing.T) {
	template := mustReadEmbeddedTemplate(t, "resources/activity/list.html")
	assertContainsAll(t, template,
		`<select id="filter-verb" name="verb" multiple`,
		`<select id="filter-channels" name="channels" multiple`,
		`<select id="filter-object-type" name="object_type"`,
		`<option value="">All verbs</option>`,
		`<option value="">All channels</option>`,
		`<option value="">All object types</option>`,
		`const filterOptionsPath = '{{ activity_filter_options_api_path|default:"" }}'`,
		"${apiPath}/filter-options",
		`filterOptionsPath,`,
	)
	for _, input := range []string{
		`<input id="filter-verb"`,
		`<input id="filter-channels"`,
		`<input id="filter-object-type"`,
	} {
		if strings.Contains(template, input) {
			t.Fatalf("legacy free-text control remains: %s", input)
		}
	}
}

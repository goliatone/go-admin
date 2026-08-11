package client

import (
	"strings"
	"testing"

	pongo2 "github.com/flosch/pongo2/v6"
)

func renderQuickFilters(t *testing.T, context pongo2.Context) string {
	t.Helper()
	set := pongo2.NewSet("client-quick-filters", templateFSLoader{fsys: Templates()})
	template, err := set.FromFile("partials/quick-filters.html")
	if err != nil {
		t.Fatalf("compile quick-filter partial: %v", err)
	}
	output, err := template.Execute(context)
	if err != nil {
		t.Fatalf("render quick-filter partial: %v", err)
	}
	return output
}

func TestQuickFiltersPreserveExplicitHiddenLabel(t *testing.T) {
	output := renderQuickFilters(t, pongo2.Context{
		"label":      "Hidden label",
		"show_label": false,
		"filters": []map[string]any{{
			"value": "", "label": "All", "href": "/items",
		}},
	})

	if strings.Contains(output, `class="quick-filters__label"`) {
		t.Fatalf("explicit show_label=false rendered the visible label: %s", output)
	}
	if !strings.Contains(output, `aria-label="Hidden label"`) {
		t.Fatalf("hidden visible label must still name the filter group: %s", output)
	}
}

func TestQuickFiltersRenderNumericZeroCount(t *testing.T) {
	output := renderQuickFilters(t, pongo2.Context{
		"filters": []map[string]any{{
			"value": "empty", "label": "Empty", "href": "/items?state=empty", "count": 0,
		}},
	})

	if !strings.Contains(output, `class="quick-filter__count">0</span>`) {
		t.Fatalf("numeric zero count must remain visible: %s", output)
	}
}

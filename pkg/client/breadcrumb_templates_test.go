package client

import (
	"strings"
	"testing"

	pongo2 "github.com/flosch/pongo2/v6"
)

func renderBreadcrumbPartial(t *testing.T, breadcrumbs []map[string]any) string {
	t.Helper()
	set := pongo2.NewSet("client-breadcrumbs", templateFSLoader{fsys: Templates()})
	tpl, err := set.FromFile("partials/breadcrumbs.html")
	if err != nil {
		t.Fatalf("parse breadcrumb partial: %v", err)
	}
	out, err := tpl.Execute(pongo2.Context{"breadcrumbs": breadcrumbs})
	if err != nil {
		t.Fatalf("render breadcrumb partial: %v", err)
	}
	return out
}

func TestTranslationTemplatesRenderBreadcrumbPartial(t *testing.T) {
	required := map[string][]string{
		"resources/translations/dashboard.html":          {`partials/admin-page-header.html`},
		"resources/translations/shell.html":              {`partials/admin-page-header.html`, `breadcrumbs=breadcrumbs`},
		"resources/translations/editor.html":             {`partials/admin-page-header.html`, `breadcrumbs=breadcrumbs`},
		"resources/translations/family-detail.html":      {`partials/admin-page-header.html`, `breadcrumbs=breadcrumbs`},
		"resources/translations/family-assignments.html": {`partials/admin-page-header.html`, `breadcrumbs=breadcrumbs`},
		"resources/translations/matrix.html":             {`partials/admin-page-header.html`, `breadcrumbs=breadcrumbs`},
		"resources/translations/exchange.html":           {`partials/admin-page-header.html`, `breadcrumbs=breadcrumbs`},
		"resources/shared/list-base.html":                {`partials/breadcrumbs.html`},
		"resources/shared/detail-base.html":              {`partials/breadcrumbs.html`},
	}

	for name, fragments := range required {
		template := mustReadClientTemplate(t, name)
		for _, fragment := range fragments {
			if !strings.Contains(template, fragment) {
				t.Fatalf("expected template %s to contain %q", name, fragment)
			}
		}
	}
}

func TestBreadcrumbPartialRendersSeparatorsOnlyBetweenItems(t *testing.T) {
	const separator = `aria-hidden="true" class="text-gray-400">/</li>`

	single := renderBreadcrumbPartial(t, []map[string]any{
		{"label": "Customers", "current": true},
	})
	if count := strings.Count(single, separator); count != 0 {
		t.Fatalf("single breadcrumb rendered %d separators, expected none: %s", count, single)
	}

	multiple := renderBreadcrumbPartial(t, []map[string]any{
		{"label": "Dashboard", "href": "/admin"},
		{"label": "Customers", "current": true},
	})
	if count := strings.Count(multiple, separator); count != 1 {
		t.Fatalf("two breadcrumbs rendered %d separators, expected one: %s", count, multiple)
	}
	first := strings.Index(multiple, "Dashboard")
	between := strings.Index(multiple, separator)
	last := strings.Index(multiple, "Customers")
	if first < 0 || between <= first || last <= between {
		t.Fatalf("separator did not render between breadcrumb labels: %s", multiple)
	}
}

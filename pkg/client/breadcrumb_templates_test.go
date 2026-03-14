package client

import (
	"strings"
	"testing"
)

func TestTranslationTemplatesRenderBreadcrumbPartial(t *testing.T) {
	required := map[string][]string{
		"resources/translations/dashboard.html":     {`partials/breadcrumbs.html`},
		"resources/translations/shell.html":         {`partials/breadcrumbs.html`},
		"resources/translations/editor.html":        {`partials/breadcrumbs.html`},
		"resources/translations/family-detail.html": {`partials/breadcrumbs.html`},
		"resources/translations/matrix.html":        {`partials/breadcrumbs.html`},
		"resources/translations/exchange.html":      {`partials/breadcrumbs.html`},
		"resources/shared/list-base.html":           {`partials/breadcrumbs.html`},
		"resources/shared/detail-base.html":         {`partials/breadcrumbs.html`},
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

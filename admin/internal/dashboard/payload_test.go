package dashboard

import "testing"

func TestSanitizeWidgetDataStripsBlockedKeysAndUnsafeHTML(t *testing.T) {
	out := SanitizeWidgetData(map[string]any{
		"chart_html":          "<html><body>legacy</body></html>",
		"chart_html_fragment": "<div>legacy</div>",
		"title":               "Safe",
		"danger":              "<script>alert(1)</script>",
		"nested": map[string]any{
			"chart_html": "legacy",
			"safe":       "ok",
			"bad":        "<body>x</body>",
		},
	})

	if _, exists := out["chart_html"]; exists {
		t.Fatalf("expected chart_html to be stripped")
	}
	if _, exists := out["chart_html_fragment"]; exists {
		t.Fatalf("expected chart_html_fragment to be stripped")
	}
	if out["danger"] != "" {
		t.Fatalf("expected script payload to be scrubbed, got %#v", out["danger"])
	}
	nested, ok := out["nested"].(map[string]any)
	if !ok {
		t.Fatalf("expected nested map, got %T", out["nested"])
	}
	if _, exists := nested["chart_html"]; exists {
		t.Fatalf("expected nested chart_html to be stripped")
	}
	if nested["bad"] != "" {
		t.Fatalf("expected nested html payload to be scrubbed")
	}
	if nested["safe"] != "ok" {
		t.Fatalf("expected safe nested value preserved")
	}
}

package admin

import "testing"

func TestDefaultPageMapperIncludesHiddenRouteKey(t *testing.T) {
	record := AdminPageRecord{
		ID:       "page-1",
		Title:    "Home",
		Slug:     "home",
		Path:     "/home",
		RouteKey: "pages/home",
		Data: map[string]any{
			"body": "hello",
		},
	}

	values := DefaultPageMapper{}.ToFormValues(record)

	if got := toString(values["route_key"]); got != "pages/home" {
		t.Fatalf("expected hidden route_key pages/home, got %q", got)
	}
}

func TestApplyRecordDefaultsPreservesHiddenRouteKeyFromRecordOrData(t *testing.T) {
	payload := map[string]any{}
	applyRecordDefaults(payload, AdminPageRecord{
		RouteKey: "pages/about",
	})
	if got := toString(payload["route_key"]); got != "pages/about" {
		t.Fatalf("expected route_key from record, got %q", got)
	}

	payload = map[string]any{}
	applyRecordDefaults(payload, AdminPageRecord{
		Data: map[string]any{
			"route_key": "pages/contact",
		},
	})
	if got := toString(payload["route_key"]); got != "pages/contact" {
		t.Fatalf("expected route_key from data fallback, got %q", got)
	}
}

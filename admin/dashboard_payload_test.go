package admin

import (
	"testing"
)

func TestEncodeWidgetPayloadRejectsMapRoot(t *testing.T) {
	_, err := encodeWidgetPayload(WidgetPayloadOf(map[string]any{"ok": true}))
	if err == nil {
		t.Fatalf("expected map-root payload to be rejected")
	}
}

func TestEncodeWidgetPayloadSerializesIntegersForTemplateContext(t *testing.T) {
	type payload struct {
		Span int `json:"span"`
	}
	out, err := encodeWidgetPayload(WidgetPayloadOf(payload{Span: 6}))
	if err != nil {
		t.Fatalf("encodeWidgetPayload: %v", err)
	}
	switch span := out["span"].(type) {
	case int:
		if span != 6 {
			t.Fatalf("expected span=6, got %d", span)
		}
	case int64:
		if span != 6 {
			t.Fatalf("expected span=6, got %d", span)
		}
	default:
		t.Fatalf("expected integer span type, got %#v (%T)", out["span"], out["span"])
	}
}

func TestEncodeWidgetPayloadSanitizesBlockedMarkup(t *testing.T) {
	type payload struct {
		ChartHTML  string `json:"chart_html"`
		FooterNote string `json:"footer_note"`
	}
	out, err := encodeWidgetPayload(WidgetPayloadOf(payload{
		ChartHTML:  "<html><body>bad</body></html>",
		FooterNote: "<script>alert(1)</script>",
	}))
	if err != nil {
		t.Fatalf("encodeWidgetPayload: %v", err)
	}
	if _, exists := out["chart_html"]; exists {
		t.Fatalf("expected blocked chart_html key to be removed")
	}
	if out["footer_note"] != "" {
		t.Fatalf("expected script payload to be scrubbed")
	}
}

func TestDecodeWidgetConfigRejectsUnknownFields(t *testing.T) {
	type cfg struct {
		Limit int `json:"limit"`
	}
	_, err := DecodeWidgetConfig[cfg](map[string]any{
		"limit": 5,
		"extra": true,
	})
	if err == nil {
		t.Fatalf("expected unknown field to fail strict decode")
	}
}

func TestEncodeWidgetPayloadTypedNilPointerReturnsEmptyPayload(t *testing.T) {
	type payload struct {
		Span int `json:"span"`
	}
	var typedNil *payload
	out, err := encodeWidgetPayload(WidgetPayloadOf(typedNil))
	if err != nil {
		t.Fatalf("encodeWidgetPayload: %v", err)
	}
	if len(out) != 0 {
		t.Fatalf("expected empty payload for typed nil pointer, got %#v", out)
	}
}

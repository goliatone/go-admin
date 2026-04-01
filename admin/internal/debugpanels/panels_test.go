package debugpanels

import "testing"

func TestNormalizePanelIDsTrimsLowercasesAndDeduplicates(t *testing.T) {
	got := NormalizePanelIDs([]string{" Requests ", "sql", "REQUESTS", "", " logs "})
	if len(got) != 3 || got[0] != "requests" || got[1] != "sql" || got[2] != "logs" {
		t.Fatalf("unexpected normalized panel ids: %#v", got)
	}
}

func TestPanelLabelNormalizesCommonTokens(t *testing.T) {
	if got := PanelLabel("sql.query_id"); got != "SQL Query ID" {
		t.Fatalf("expected SQL Query ID, got %q", got)
	}
}

func TestPanelMetaForFallsBackToGeneratedLabelAndDefaultSpan(t *testing.T) {
	meta := PanelMetaFor("custom.panel", map[string]PanelMeta{
		"requests": {Label: "Requests", Span: 2},
	}, 12)
	if meta.Label != "Custom Panel" || meta.Span != 12 {
		t.Fatalf("unexpected panel meta: %+v", meta)
	}
}

func TestPanelMetaForAppliesDefaultSpanToKnownPanel(t *testing.T) {
	meta := PanelMetaFor("requests", map[string]PanelMeta{
		"requests": {Label: "Requests"},
	}, 12)
	if meta.Label != "Requests" || meta.Span != 12 {
		t.Fatalf("unexpected panel meta: %+v", meta)
	}
}

package admin

import (
	"encoding/json"
	"os"
	"testing"
)

func TestTranslationDashboardContractFixtures(t *testing.T) {
	data, err := os.ReadFile("testdata/translation_dashboard_contract_fixtures.json")
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}

	fixture := map[string]any{}
	if err := json.Unmarshal(data, &fixture); err != nil {
		t.Fatalf("decode fixture: %v", err)
	}

	states := extractMap(fixture["states"])
	if len(states) != 4 {
		t.Fatalf("expected four dashboard states, got %d", len(states))
	}

	for _, stateKey := range []string{"empty", "healthy", "degraded", "alert_triggering"} {
		state := extractMap(states[stateKey])
		if len(state) == 0 {
			t.Fatalf("expected fixture state %q", stateKey)
		}
		assertTranslationDashboardFixtureState(t, stateKey, state)
	}
}

func assertTranslationDashboardFixtureState(t *testing.T, stateKey string, payload map[string]any) {
	t.Helper()

	data := extractMap(payload["data"])
	meta := extractMap(payload["meta"])
	if len(data) == 0 || len(meta) == 0 {
		t.Fatalf("expected data/meta for %s", stateKey)
	}

	cards := extractListMaps(data["cards"])
	if len(cards) != 5 {
		t.Fatalf("expected five cards for %s, got %d", stateKey, len(cards))
	}
	summary := extractMap(data["summary"])
	if len(summary) == 0 {
		t.Fatalf("expected summary for %s", stateKey)
	}
	tables := extractMap(data["tables"])
	if len(tables) != 2 {
		t.Fatalf("expected two tables for %s, got %d", stateKey, len(tables))
	}
	runbooks := extractListMaps(data["runbooks"])
	if len(runbooks) < 3 {
		t.Fatalf("expected runbooks for %s, got %+v", stateKey, runbooks)
	}

	contracts := extractMap(meta["contracts"])
	queryModels := extractMap(contracts["query_models"])
	if len(queryModels) != 2 {
		t.Fatalf("expected query models for %s, got %+v", stateKey, queryModels)
	}
	for _, tableID := range []string{
		translationDashboardTableTopOverdueAssignments,
		translationDashboardTableBlockedFamilies,
	} {
		model := extractMap(queryModels[tableID])
		if len(model) == 0 {
			t.Fatalf("expected query model %s for %s", tableID, stateKey)
		}
		links := extractMap(model["drilldown_links"])
		if len(links) == 0 {
			t.Fatalf("expected drilldown_links on query model %s", tableID)
		}
	}

	switch stateKey {
	case "empty":
		assertDashboardSummaryCount(t, summary, "my_tasks", 0)
		assertDashboardSummaryCount(t, summary, "blocked_families", 0)
		assertDashboardSummaryCount(t, summary, "missing_required_locales", 0)
		assertDashboardTableRows(t, tables, translationDashboardTableTopOverdueAssignments, 0)
		assertDashboardTableRows(t, tables, translationDashboardTableBlockedFamilies, 0)
		if degraded, _ := meta["degraded"].(bool); degraded {
			t.Fatalf("expected empty fixture not degraded")
		}
		if alerts := extractListMaps(data["alerts"]); len(alerts) != 0 {
			t.Fatalf("expected empty fixture alerts to be empty, got %+v", alerts)
		}
	case "healthy":
		assertDashboardSummaryCount(t, summary, "my_tasks", 3)
		assertDashboardSummaryCount(t, summary, "blocked_families", 0)
		assertDashboardTableRows(t, tables, translationDashboardTableTopOverdueAssignments, 0)
		assertDashboardTableRows(t, tables, translationDashboardTableBlockedFamilies, 0)
		alerts := extractListMaps(data["alerts"])
		if len(alerts) != 0 {
			t.Fatalf("expected healthy fixture alerts to be empty, got %+v", alerts)
		}
	case "degraded":
		if degraded, _ := meta["degraded"].(bool); !degraded {
			t.Fatalf("expected degraded fixture degraded=true")
		}
		reasons := extractListMaps(meta["degraded_reasons"])
		if len(reasons) == 0 {
			t.Fatalf("expected degraded reasons")
		}
		alerts := extractListMaps(data["alerts"])
		if len(alerts) == 0 || toString(alerts[0]["code"]) != "DEGRADED_DATA" {
			t.Fatalf("expected degraded alert, got %+v", alerts)
		}
		assertDashboardTableRows(t, tables, translationDashboardTableBlockedFamilies, 1)
		assertDashboardRowLinks(t, extractMap(tables[translationDashboardTableBlockedFamilies]), "family", "api")
	case "alert_triggering":
		assertDashboardSummaryCount(t, summary, "blocked_families", 2)
		assertDashboardSummaryCount(t, summary, "overdue_tasks", 2)
		alerts := extractListMaps(data["alerts"])
		if len(alerts) < 2 {
			t.Fatalf("expected alert-triggering alerts, got %+v", alerts)
		}
		foundCritical := false
		for _, alert := range alerts {
			if toString(alert["state"]) == translationDashboardAlertStateCritical {
				foundCritical = true
				break
			}
		}
		if !foundCritical {
			t.Fatalf("expected critical alert in alert_triggering state, got %+v", alerts)
		}
		assertDashboardTableRows(t, tables, translationDashboardTableTopOverdueAssignments, 2)
		assertDashboardTableRows(t, tables, translationDashboardTableBlockedFamilies, 2)
		assertDashboardRowLinks(t, extractMap(tables[translationDashboardTableTopOverdueAssignments]), "assignment", "queue")
		assertDashboardRowLinks(t, extractMap(tables[translationDashboardTableBlockedFamilies]), "family", "api")
	}
}

func assertDashboardSummaryCount(t *testing.T, summary map[string]any, key string, want int) {
	t.Helper()
	if got := toInt(summary[key]); got != want {
		t.Fatalf("expected summary[%s]=%d, got %d", key, want, got)
	}
}

func assertDashboardTableRows(t *testing.T, tables map[string]any, tableID string, want int) {
	t.Helper()
	table := extractMap(tables[tableID])
	rows := extractListMaps(table["rows"])
	if len(rows) != want {
		t.Fatalf("expected %s rows=%d, got %d", tableID, want, len(rows))
	}
}

func assertDashboardRowLinks(t *testing.T, table map[string]any, expectedLinkKeys ...string) {
	t.Helper()
	rows := extractListMaps(table["rows"])
	for _, row := range rows {
		links := extractMap(row["links"])
		for _, key := range expectedLinkKeys {
			link := extractMap(links[key])
			if got := toString(link["href"]); got == "" {
				t.Fatalf("expected %s link href on row %+v", key, row)
			}
			for _, required := range []string{"label", "relation", "resolver_key", "entity_type", "entity_id", "table_id"} {
				if got := toString(link[required]); got == "" {
					t.Fatalf("expected %s link %s on row %+v", key, required, row)
				}
			}
		}
	}
}

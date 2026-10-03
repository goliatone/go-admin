package client_test

import (
	"encoding/json"
	"testing"
	"time"

	admindata "github.com/goliatone/go-admin/data"
)

// dataExplorerContractFixture holds explorer presentation inputs built from
// the frozen data.Explore* wire types for the selections the Data console
// golden projects. The client explorer suite answers its reads with them.
// Regenerate with UPDATE_CONSOLE_CONTRACT=1 after a reviewed change.
const dataExplorerContractFixture = "assets/tests/fixtures/data-explorer-contract.json"

func dataExplorerSelection(scenario admindata.ScenarioRef) admindata.ExploreSelection {
	return admindata.ExploreSelection{Dataset: scenario.Dataset, Scenario: scenario, TargetID: "preview", Context: admindata.ExploreCatalog}
}

func dataExplorerEnvelope(selection admindata.ExploreSelection, state string) admindata.ExploreEnvelope {
	return admindata.ExploreEnvelope{Selection: selection, PresentationRevision: "3", ObservedAt: time.Date(2026, 10, 2, 12, 0, 0, 0, time.UTC),
		Provenance: "example", Completeness: "complete", State: state}
}

func dataExplorerTotal(value uint64) *uint64 { return &value }

func dataExplorerOrders() admindata.ExploreEntity {
	return admindata.ExploreEntity{ID: "orders", Label: "Orders", Description: "Purchases placed by synthetic customers.",
		Fields: []admindata.ExploreField{
			{ID: "id", Label: "Order", Type: "string"},
			{ID: "amount", Label: "Amount", Description: "Order total before tax.", Type: "integer", Unit: "USD cents"},
			{ID: "placed_on", Label: "Placed on", Type: "date"},
		},
		Relationships: []admindata.ExploreRelationship{{ID: "customer", Label: "Customer", EntityID: "people"}}}
}

func dataExplorerPeople() admindata.ExploreEntity {
	return admindata.ExploreEntity{ID: "people", Label: "People", Fields: []admindata.ExploreField{
		{ID: "id", Label: "Person", Type: "string"}, {ID: "email", Label: "Email", Description: "Contact address; withheld unless permitted.", Type: "string"},
	}}
}

// dataExplorerReady is the complete case: descriptions, both scenarios,
// scope-qualified counts (one unknown), a declared period and usages with
// effects for every lifecycle phase.
func dataExplorerReady(f dataConsoleFixtures) admindata.ExploreMetadata {
	return admindata.ExploreMetadata{
		ExploreEnvelope: dataExplorerEnvelope(dataExplorerSelection(f.ready), admindata.ExploreAvailable),
		Title:           "Customer corpus A",
		Summary:         "Synthetic customers and their orders for sales reporting checks.",
		Origin:          "Generated fixture",
		Entities:        []admindata.ExploreEntity{dataExplorerOrders(), dataExplorerPeople()},
		Scenarios: []admindata.ExploreScenario{
			{Scenario: f.ready, Title: "Ready", Summary: "Three orders on one day.", ExpectedOutcomes: []string{"Three orders totaling 250", "All orders on 2026-01-01 (UTC)"}},
			{Scenario: f.emptyHistory, Title: "Quiet", Summary: "No orders at all.", ExpectedOutcomes: []string{"No orders"}},
		},
		Inventory: []admindata.ExploreCount{
			{EntityID: "orders", Scope: "catalog_inventory", Total: dataExplorerTotal(3)},
			{EntityID: "orders", Scope: "selected_scenario", Total: dataExplorerTotal(3)},
			{EntityID: "people", Scope: "selected_scenario"},
		},
		Period:        &admindata.ExplorePeriod{Start: "2026-01-01", End: "2026-01-01", Timezone: "UTC"},
		Prerequisites: []string{"audience-definitions"},
		Attribution:   []string{"Synthetic data generated for go-admin examples"},
		Usages: []admindata.ExploreUsage{
			{SurfaceID: "sales-report", Kind: "report", Label: "Daily sales report", Href: "/admin/reports/sales", Effects: []admindata.ExploreEffect{
				{Phase: "prepare", Description: "Builds report inputs in the prepared stage."},
				{Phase: "verify", Description: "Checks the daily total."},
				{Phase: "activate", Description: "Report shows the scenario's orders."},
			}},
			{SurfaceID: "customer-search", Kind: "screen", Label: "Customer search", Effects: []admindata.ExploreEffect{{Phase: "activate", Description: "Search lists the scenario's people."}}},
		},
		UsageCompleteness: "partial",
	}
}

// dataExplorerQuiet answers the empty scenario: a zero scenario count stays
// distinct from the catalog inventory of three orders.
func dataExplorerQuiet(f dataConsoleFixtures) admindata.ExploreMetadata {
	quiet := dataExplorerReady(f)
	quiet.ExploreEnvelope = dataExplorerEnvelope(dataExplorerSelection(f.emptyHistory), admindata.ExploreAvailable)
	quiet.Inventory = []admindata.ExploreCount{
		{EntityID: "orders", Scope: "catalog_inventory", Total: dataExplorerTotal(3)},
		{EntityID: "orders", Scope: "selected_scenario", Total: dataExplorerTotal(0)},
	}
	quiet.Usages = []admindata.ExploreUsage{}
	quiet.UsageCompleteness = "unknown"
	return quiet
}

// dataExplorerSuppressed mirrors the service's suppressed reply: no entities,
// counts, usages or descriptions survive.
func dataExplorerSuppressed(selection admindata.ExploreSelection) admindata.ExploreMetadata {
	return admindata.ExploreMetadata{ExploreEnvelope: dataExplorerEnvelope(selection, admindata.ExploreSuppressed), Title: selection.Dataset.ID, Origin: "unknown",
		Entities: []admindata.ExploreEntity{}, Scenarios: []admindata.ExploreScenario{}, Inventory: []admindata.ExploreCount{}, Usages: []admindata.ExploreUsage{}, UsageCompleteness: "unknown"}
}

// dataExplorerUnsupported mirrors the service's reply for a provider without
// exploration: the dataset ID as title and unknown completeness.
func dataExplorerUnsupported(selection admindata.ExploreSelection) admindata.ExploreMetadata {
	out := dataExplorerSuppressed(selection)
	out.ExploreEnvelope = admindata.ExploreEnvelope{Selection: selection, PresentationRevision: "unknown", ObservedAt: time.Date(2026, 10, 2, 12, 0, 0, 0, time.UTC),
		Provenance: "example", Completeness: "unknown", State: admindata.ExploreUnsupported}
	return out
}

// dataExplorerHostile carries markup and quotes in every provider string.
func dataExplorerHostile(f dataConsoleFixtures) admindata.ExploreMetadata {
	hostile := `<img src=x onerror="window.__explorerXSS=1">"quoted" & 'single'`
	out := dataExplorerReady(f)
	out.ExploreEnvelope = dataExplorerEnvelope(dataExplorerSelection(f.reprofiled), admindata.ExploreAvailable)
	out.Title = "Corpus B " + hostile
	out.Summary = hostile
	out.Origin = hostile
	out.Entities = []admindata.ExploreEntity{{ID: "orders", Label: hostile, Description: hostile,
		Fields: []admindata.ExploreField{{ID: "id", Label: hostile, Description: hostile, Type: "string", Unit: hostile}}}}
	out.Scenarios = []admindata.ExploreScenario{{Scenario: f.reprofiled, Title: hostile, Summary: hostile, ExpectedOutcomes: []string{hostile}}}
	out.Inventory = []admindata.ExploreCount{{EntityID: "orders", Scope: "catalog_inventory", Total: dataExplorerTotal(7)}}
	out.Period = &admindata.ExplorePeriod{Start: hostile, Timezone: hostile}
	out.Prerequisites = []string{hostile}
	out.Attribution = []string{hostile}
	out.Usages = []admindata.ExploreUsage{{SurfaceID: "hostile", Kind: "workflow", Label: hostile, Href: "javascript:alert(1)",
		Effects: []admindata.ExploreEffect{{Phase: "prepare", Description: hostile}}}}
	return out
}

// dataExplorerSampleRequest identifies the read a fixture page answers.
type dataExplorerSampleRequest struct {
	Selection      admindata.ExploreSelection `json:"selection"`
	EntityID       string                     `json:"entity_id"`
	Cursor         string                     `json:"cursor"`
	RecordKey      string                     `json:"record_key,omitempty"`
	RelationshipID string                     `json:"relationship_id,omitempty"`
}

type dataExplorerSamplePage struct {
	Request  dataExplorerSampleRequest `json:"request"`
	Response admindata.ExploreSamples  `json:"response"`
}

func dataExplorerCell(value any) admindata.ExploreCell {
	return admindata.ExploreCell{State: "value", Value: value}
}

func dataExplorerOrderRow(key string, amount int) admindata.ExploreRow {
	return admindata.ExploreRow{RecordKey: key, Cells: map[string]admindata.ExploreCell{
		"id": dataExplorerCell(key), "amount": dataExplorerCell(amount), "placed_on": dataExplorerCell("2026-01-01"),
	}}
}

func dataExplorerSamples(selection admindata.ExploreSelection, entity admindata.ExploreEntity, rows []admindata.ExploreRow, total *uint64, next string) admindata.ExploreSamples {
	out := admindata.ExploreSamples{ExploreEnvelope: dataExplorerEnvelope(selection, admindata.ExploreAvailable), EntityID: entity.ID,
		Columns: entity.Fields, Rows: rows, Total: total, SamplingMethod: "declared fixture order"}
	if next != "" {
		out.NextCursor = &next
	}
	return out
}

// dataExplorerSamplePages pages Ready's three orders (120, 80 and 50 on the
// declared UTC day), keeps withheld/null/unknown people cells distinct, leaves
// Quiet empty, follows one declared relationship and carries hostile strings.
func dataExplorerSamplePages(f dataConsoleFixtures) []dataExplorerSamplePage {
	ready, quiet, hostile := dataExplorerSelection(f.ready), dataExplorerSelection(f.emptyHistory), dataExplorerSelection(f.reprofiled)
	orders, people := dataExplorerOrders(), dataExplorerPeople()
	request := func(selection admindata.ExploreSelection, entity, cursor string) dataExplorerSampleRequest {
		return dataExplorerSampleRequest{Selection: selection, EntityID: entity, Cursor: cursor}
	}
	peopleRows := []admindata.ExploreRow{
		{RecordKey: "person-1", Cells: map[string]admindata.ExploreCell{"id": dataExplorerCell("person-1"), "email": {State: "redacted"}}},
		{RecordKey: "person-2", Cells: map[string]admindata.ExploreCell{"id": dataExplorerCell("person-2"), "email": {State: "null"}}},
		{RecordKey: "person-3", Cells: map[string]admindata.ExploreCell{"id": dataExplorerCell("person-3"), "email": {State: "unknown"}}},
	}
	partial := dataExplorerSamples(ready, people, peopleRows, nil, "")
	partial.Completeness = "partial"
	empty := dataExplorerSamples(quiet, orders, []admindata.ExploreRow{}, dataExplorerTotal(0), "")
	empty.State = admindata.ExploreEmpty
	related := dataExplorerSamples(ready, people, peopleRows[:1], dataExplorerTotal(1), "")
	text := `<img src=x onerror="window.__explorerXSS=1">"quoted" & 'single'`
	hostileSamples := admindata.ExploreSamples{ExploreEnvelope: dataExplorerEnvelope(hostile, admindata.ExploreAvailable), EntityID: "orders",
		Columns:        []admindata.ExploreField{{ID: "id", Label: text, Description: text, Type: "string", Unit: text}},
		Rows:           []admindata.ExploreRow{{RecordKey: text, Cells: map[string]admindata.ExploreCell{"id": dataExplorerCell(text)}}},
		SamplingMethod: text}
	return []dataExplorerSamplePage{
		{Request: request(ready, "orders", ""), Response: dataExplorerSamples(ready, orders, []admindata.ExploreRow{dataExplorerOrderRow("order-1", 120), dataExplorerOrderRow("order-2", 80)}, dataExplorerTotal(3), "cursor-orders-2")},
		{Request: request(ready, "orders", "cursor-orders-2"), Response: dataExplorerSamples(ready, orders, []admindata.ExploreRow{dataExplorerOrderRow("order-3", 50)}, dataExplorerTotal(3), "")},
		{Request: request(ready, "people", ""), Response: partial},
		{Request: request(quiet, "orders", ""), Response: empty},
		{Request: dataExplorerSampleRequest{Selection: ready, EntityID: "orders", RecordKey: "order-1", RelationshipID: "customer"}, Response: related},
		{Request: request(hostile, "orders", ""), Response: hostileSamples},
	}
}

func dataExplorerContractDocument(t *testing.T) map[string]any {
	t.Helper()
	f := newDataConsoleFixtures()
	metadata := []admindata.ExploreMetadata{
		dataExplorerReady(f),
		dataExplorerQuiet(f),
		dataExplorerSuppressed(dataExplorerSelection(f.dstWeek)),
		dataExplorerHostile(f),
	}
	for _, item := range metadata {
		if err := item.Selection.Validate(); err != nil {
			t.Fatalf("fixture selection %s/%s invalid: %v", item.Selection.Dataset.ID, item.Selection.Scenario.ID, err)
		}
	}
	return map[string]any{
		"metadata": metadata,
		"samples":  dataExplorerSamplePages(f),
		"variants": map[string]any{
			"ready_unsupported": dataExplorerUnsupported(dataExplorerSelection(f.ready)),
			"ready_suppressed":  dataExplorerSuppressed(dataExplorerSelection(f.ready)),
		},
	}
}

func TestDataExplorerContractFixtureMatchesGoTypes(t *testing.T) {
	encoded, err := json.MarshalIndent(dataExplorerContractDocument(t), "", "  ")
	if err != nil {
		t.Fatalf("marshal data explorer contract: %v", err)
	}
	assertDataConsoleGolden(t, dataExplorerContractFixture, append(encoded, '\n'))
}

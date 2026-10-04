package client_test

import (
	"encoding/json"
	"testing"
	"time"

	admindata "github.com/goliatone/go-admin/data"
)

// dataInsightsContractFixture holds insight and comparison replies built from
// the frozen data.Insight* wire types for the selections the Data console
// golden projects (Ready, Quiet and dst-week on the preview target). The
// client insights suites answer their reads with them. Regenerate with
// UPDATE_CONSOLE_CONTRACT=1 after a reviewed change.
const dataInsightsContractFixture = "assets/tests/fixtures/data-insights-contract.json"

const dataInsightsMetricSet = "orders"

var dataInsightsObservedAt = time.Date(2026, 10, 3, 12, 0, 0, 0, time.UTC)

type dataInsightsRequest struct {
	Selection   admindata.ExploreSelection `json:"selection"`
	MetricSetID string                     `json:"metric_set_id"`
}

type dataInsightsCase struct {
	Name     string                    `json:"name"`
	Request  dataInsightsRequest       `json:"request"`
	Response admindata.ExploreInsights `json:"response"`
}

type dataComparisonRequest struct {
	Left        admindata.ExploreSelection `json:"left"`
	Right       admindata.ExploreSelection `json:"right"`
	MetricSetID string                     `json:"metric_set_id"`
}

type dataComparisonCase struct {
	Name     string                        `json:"name"`
	Request  dataComparisonRequest         `json:"request"`
	Response admindata.SelectionComparison `json:"response"`
}

type dataInsightsSelections struct {
	readyCatalog, readyPrepared, readyActive admindata.ExploreSelection
	quietCatalog, quietPrepared              admindata.ExploreSelection
	dstCatalog, dstPrepared                  admindata.ExploreSelection
	reprofiled                               admindata.ExploreSelection
}

func dataInsightsSelection(scenario admindata.ScenarioRef, context, receipt string, revision uint64, generation *uint64) admindata.ExploreSelection {
	return admindata.ExploreSelection{Dataset: scenario.Dataset, Scenario: scenario, TargetID: "preview", Context: context,
		ReceiptID: receipt, ContentRevision: revision, Generation: generation}
}

// newDataInsightsSelections mirrors the golden's projected selections: the
// catalog examples, each scenario row's prepared receipt and the preview
// target's active receipt at generation 3.
func newDataInsightsSelections(f dataConsoleFixtures) dataInsightsSelections {
	generation := uint64(3)
	return dataInsightsSelections{
		readyCatalog:  dataInsightsSelection(f.ready, admindata.ExploreCatalog, "", 0, nil),
		readyPrepared: dataInsightsSelection(f.ready, admindata.ExplorePrepared, "rcpt-ready-1", 2, nil),
		readyActive:   dataInsightsSelection(f.ready, admindata.ExploreActive, "rcpt-ready-1", 2, &generation),
		quietCatalog:  dataInsightsSelection(f.emptyHistory, admindata.ExploreCatalog, "", 0, nil),
		quietPrepared: dataInsightsSelection(f.emptyHistory, admindata.ExplorePrepared, "rcpt-empty-1", 1, nil),
		dstCatalog:    dataInsightsSelection(f.dstWeek, admindata.ExploreCatalog, "", 0, nil),
		dstPrepared:   dataInsightsSelection(f.dstWeek, admindata.ExplorePrepared, "rcpt-dst-1", 1, nil),
		reprofiled:    dataInsightsSelection(f.reprofiled, admindata.ExploreCatalog, "", 0, nil),
	}
}

var (
	dataInsightsDay  = admindata.ExplorePeriod{Start: "2026-01-01", End: "2026-01-01", Timezone: "UTC"}
	dataInsightsWeek = admindata.ExplorePeriod{Start: "2026-03-26", End: "2026-04-01", Timezone: "Europe/London"}

	dataInsightsOrders    = admindata.InsightMetricDefinition{ID: "orders.count", Label: "Orders", Kind: "count", Unit: "orders", Population: "scenario orders"}
	dataInsightsAmount    = admindata.InsightMetricDefinition{ID: "orders.amount", Label: "Order amount", Kind: "sum", Unit: "USD cents", Population: "scenario orders"}
	dataInsightsStatus    = admindata.InsightMetricDefinition{ID: "orders.status", Label: "Orders by status", Kind: "distribution", Unit: "orders", Population: "scenario orders"}
	dataInsightsCustomers = admindata.InsightMetricDefinition{ID: "customers.count", Label: "Customers", Kind: "count", Unit: "customers", Population: "scenario customers"}
)

func dataInsightsKnown(def admindata.InsightMetricDefinition, period admindata.ExplorePeriod, value float64, sampling string) admindata.InsightMetric {
	return admindata.InsightMetric{InsightMetricDefinition: def, TimeScope: period, Value: new(value), Status: "known",
		Buckets: []admindata.InsightBucket{}, SamplingMethod: sampling}
}

func dataInsightsMissing(def admindata.InsightMetricDefinition, period admindata.ExplorePeriod, status string) admindata.InsightMetric {
	return admindata.InsightMetric{InsightMetricDefinition: def, TimeScope: period, Status: status, Buckets: []admindata.InsightBucket{}, SamplingMethod: "unknown"}
}

func dataInsightsBucket(id, label string, value float64) admindata.InsightBucket {
	return admindata.InsightBucket{ID: id, Label: label, Value: new(value), Status: "known"}
}

func dataInsightsDistribution(period admindata.ExplorePeriod, total, denominator float64, sampling string, buckets ...admindata.InsightBucket) admindata.InsightMetric {
	metric := dataInsightsKnown(dataInsightsStatus, period, total, sampling)
	metric.Denominator = new(denominator)
	if buckets == nil {
		buckets = []admindata.InsightBucket{}
	}
	metric.Buckets = buckets
	return metric
}

func dataInsightsEnvelope(selection admindata.ExploreSelection, state, completeness string) admindata.ExploreEnvelope {
	provenance := "observed"
	if selection.Context == admindata.ExploreCatalog {
		provenance = "example"
	}
	envelope := admindata.ExploreEnvelope{Selection: selection, PresentationRevision: "3", ObservedAt: dataInsightsObservedAt,
		Provenance: provenance, Completeness: completeness, State: state}
	switch state {
	case admindata.ExploreUnsupported:
		envelope.PresentationRevision = "unknown"
		envelope.Reason = "not_supported"
	case admindata.ExploreSuppressed:
		envelope.Reason = "policy_suppressed"
	}
	return envelope
}

func dataInsightsResult(selection admindata.ExploreSelection, metrics []admindata.InsightMetric, coverage []admindata.InsightCoverage, work admindata.InsightWork) admindata.ExploreInsights {
	return admindata.ExploreInsights{ExploreEnvelope: dataInsightsEnvelope(selection, admindata.ExploreAvailable, "complete"),
		MetricSetID: dataInsightsMetricSet, Metrics: metrics, Coverage: coverage, Work: work}
}

func dataInsightsEvidence(selection admindata.ExploreSelection, ref, verification string) *admindata.InsightEvidence {
	return &admindata.InsightEvidence{Selection: selection, Ref: ref, VerificationID: verification}
}

// dataInsightsReady is Ready's composition: three orders totalling 250 on one
// UTC day, two paid and one refunded. A catalog example declares it (and its
// expected day is not coverage); prepared and active reads observe it, with
// the day covered by the receipt's passed verification.
func dataInsightsReady(selection admindata.ExploreSelection) admindata.ExploreInsights {
	sampling := "complete count of the immutable stage"
	if selection.Context == admindata.ExploreCatalog {
		sampling = "declared fixture"
	}
	metrics := []admindata.InsightMetric{
		dataInsightsKnown(dataInsightsOrders, dataInsightsDay, 3, sampling),
		dataInsightsKnown(dataInsightsAmount, dataInsightsDay, 250, sampling),
		dataInsightsDistribution(dataInsightsDay, 3, 3, sampling, dataInsightsBucket("paid", "Paid", 2), dataInsightsBucket("refunded", "Refunded", 1)),
	}
	coverage := []admindata.InsightCoverage{{LocalDay: "2026-01-01", Timezone: "UTC", Status: admindata.Uncovered, Reason: "expected_only"}}
	work := admindata.InsightWork{}
	if selection.Context != admindata.ExploreCatalog {
		coverage = []admindata.InsightCoverage{{LocalDay: "2026-01-01", Timezone: "UTC", Status: "covered", Evidence: dataInsightsEvidence(selection, "day-2026-01-01", "ver-ready")}}
		work = admindata.InsightWork{Queries: 2, Records: 3}
	}
	return dataInsightsResult(selection, metrics, coverage, work)
}

// dataInsightsQuiet is Quiet: no orders. Its zeros are known values; the
// prepared day is covered-empty only through the passed verification.
func dataInsightsQuiet(selection admindata.ExploreSelection) admindata.ExploreInsights {
	sampling := "complete count of the immutable stage"
	if selection.Context == admindata.ExploreCatalog {
		sampling = "declared fixture"
	}
	metrics := []admindata.InsightMetric{
		dataInsightsKnown(dataInsightsOrders, dataInsightsDay, 0, sampling),
		dataInsightsKnown(dataInsightsAmount, dataInsightsDay, 0, sampling),
		dataInsightsDistribution(dataInsightsDay, 0, 0, sampling),
	}
	coverage := []admindata.InsightCoverage{{LocalDay: "2026-01-01", Timezone: "UTC", Status: admindata.Uncovered, Reason: "expected_only"}}
	work := admindata.InsightWork{}
	if selection.Context != admindata.ExploreCatalog {
		coverage = []admindata.InsightCoverage{{LocalDay: "2026-01-01", Timezone: "UTC", Status: admindata.CoveredEmpty, Evidence: dataInsightsEvidence(selection, "day-2026-01-01", "ver-empty")}}
		work = admindata.InsightWork{Queries: 2, Records: 0}
	}
	out := dataInsightsResult(selection, metrics, coverage, work)
	out.State = admindata.ExploreEmpty
	return out
}

// dataInsightsDST spans a month boundary in Europe/London with every
// reportable coverage state, a gap day, an unknown category, an unavailable
// metric and a partial read.
func dataInsightsDST(selection admindata.ExploreSelection) admindata.ExploreInsights {
	sampling := "complete count of the immutable stage"
	status := dataInsightsDistribution(dataInsightsWeek, 12, 12, sampling,
		dataInsightsBucket("paid", "Paid", 9), dataInsightsBucket("refunded", "Refunded", 2),
		admindata.InsightBucket{ID: "pending", Label: "Pending", Status: "unknown"})
	metrics := []admindata.InsightMetric{
		dataInsightsKnown(dataInsightsOrders, dataInsightsWeek, 12, sampling),
		dataInsightsKnown(dataInsightsAmount, dataInsightsWeek, 5400.5, sampling),
		status,
		dataInsightsMissing(dataInsightsCustomers, dataInsightsWeek, "unavailable"),
	}
	day := func(local, state, ref string) admindata.InsightCoverage {
		entry := admindata.InsightCoverage{LocalDay: local, Timezone: "Europe/London", Status: state}
		if ref != "" {
			entry.Evidence = dataInsightsEvidence(selection, ref, "")
		}
		return entry
	}
	coverage := []admindata.InsightCoverage{
		day("2026-03-26", "covered", "stage-2026-03-26"),
		day("2026-03-27", "covered", "stage-2026-03-27"),
		day("2026-03-28", admindata.Partial, "stage-2026-03-28"),
		// 2026-03-29 (the DST change) is not reported.
		day("2026-03-30", admindata.Uncovered, ""),
		day("2026-03-31", admindata.Unavailable, ""),
		day("2026-04-01", "covered", "stage-2026-04-01"),
	}
	coverage[3].Reason = "no_evidence"
	out := dataInsightsResult(selection, metrics, coverage, admindata.InsightWork{Queries: 3, Records: 12})
	out.Completeness = "partial"
	out.Metrics[0].Denominator = new(float64(40))
	return out
}

func dataInsightsWithheld(selection admindata.ExploreSelection, state string) admindata.ExploreInsights {
	return admindata.ExploreInsights{ExploreEnvelope: dataInsightsEnvelope(selection, state, "unknown"), MetricSetID: dataInsightsMetricSet,
		Metrics: []admindata.InsightMetric{}, Coverage: []admindata.InsightCoverage{}}
}

// dataInsightsHostile carries markup and quotes in every provider string.
func dataInsightsHostile(selection admindata.ExploreSelection) admindata.ExploreInsights {
	hostile := `<img src=x onerror="window.__insightsXSS=1">"quoted" & 'single'`
	def := admindata.InsightMetricDefinition{ID: "orders.status", Label: hostile, Kind: "distribution", Unit: hostile, Population: hostile}
	metric := dataInsightsKnown(def, dataInsightsDay, 7, hostile)
	metric.Denominator = new(float64(7))
	metric.Buckets = []admindata.InsightBucket{dataInsightsBucket("hostile", hostile, 7)}
	count := dataInsightsKnown(admindata.InsightMetricDefinition{ID: "orders.count", Label: hostile, Kind: "count", Unit: hostile, Population: hostile}, dataInsightsDay, 7, hostile)
	coverage := []admindata.InsightCoverage{{LocalDay: "2026-01-01", Timezone: hostile, Status: admindata.Uncovered, Reason: hostile}}
	return dataInsightsResult(selection, []admindata.InsightMetric{count, metric}, coverage, admindata.InsightWork{})
}

func dataInsightsComparable(id string, left, right admindata.InsightMetric) admindata.InsightMetricComparison {
	out := admindata.InsightMetricComparison{ID: id, Left: &left, Right: &right, Compatibility: "comparable"}
	delta := *right.Value - *left.Value
	out.Delta = &delta
	if *left.Value == 0 {
		out.Reason = "zero_baseline"
	} else {
		percent := delta / *left.Value * 100
		out.PercentChange = &percent
	}
	return out
}

func dataInsightsIncompatible(id string, left, right *admindata.InsightMetric, reason string) admindata.InsightMetricComparison {
	return admindata.InsightMetricComparison{ID: id, Left: left, Right: right, Compatibility: "incompatible", Reason: reason}
}

func dataInsightsMetric(insights admindata.ExploreInsights, id string) *admindata.InsightMetric {
	for i := range insights.Metrics {
		if insights.Metrics[i].ID == id {
			metric := insights.Metrics[i]
			return &metric
		}
	}
	return nil
}

func dataInsightsDeclarations(outcomes []string, usages []admindata.ExploreUsage, completeness string) admindata.InsightDeclarations {
	if usages == nil {
		usages = []admindata.ExploreUsage{}
	}
	return admindata.InsightDeclarations{Usages: usages, UsageCompleteness: completeness, ExpectedOutcomes: outcomes}
}

func dataInsightsComparison(left, right admindata.ExploreInsights, metrics []admindata.InsightMetricComparison, id string) admindata.SelectionComparison {
	report := admindata.ExploreUsage{SurfaceID: "sales-report", Kind: "report", Label: "Daily sales report", Href: "/admin/reports/sales", Effects: []admindata.ExploreEffect{
		{Phase: "verify", Description: "Checks the daily total."},
		{Phase: "activate", Description: "Report shows the scenario's orders."},
	}}
	declarations := func(insights admindata.ExploreInsights) admindata.InsightDeclarations {
		switch insights.Selection.Scenario.ID {
		case "ready":
			return dataInsightsDeclarations([]string{"Three orders totaling 250", "All orders on 2026-01-01 (UTC)"}, []admindata.ExploreUsage{report}, "partial")
		case "empty-history":
			return dataInsightsDeclarations([]string{"No orders"}, []admindata.ExploreUsage{report}, "partial")
		default:
			return dataInsightsDeclarations([]string{}, nil, "unknown")
		}
	}
	return admindata.SelectionComparison{Left: left, Right: right, ComparisonID: id, ObservedAt: dataInsightsObservedAt, Metrics: metrics,
		LeftDeclarations: declarations(left), RightDeclarations: declarations(right)}
}

// dataInsightsComparisons covers comparable observed deltas (Ready → Quiet),
// a zero baseline (Quiet → active Ready), example values without deltas,
// mismatched periods/missing metrics, and a withheld side.
func dataInsightsComparisons(s dataInsightsSelections) []dataComparisonCase {
	readyPrepared, quietPrepared, readyActive := dataInsightsReady(s.readyPrepared), dataInsightsQuiet(s.quietPrepared), dataInsightsReady(s.readyActive)
	readyCatalog, quietCatalog, dst := dataInsightsReady(s.readyCatalog), dataInsightsQuiet(s.quietCatalog), dataInsightsDST(s.dstPrepared)
	request := func(left, right admindata.ExploreSelection) dataComparisonRequest {
		return dataComparisonRequest{Left: left, Right: right, MetricSetID: dataInsightsMetricSet}
	}
	pair := func(id string, left, right admindata.ExploreInsights) admindata.InsightMetricComparison {
		return dataInsightsComparable(id, *dataInsightsMetric(left, id), *dataInsightsMetric(right, id))
	}
	examples := func(id string) admindata.InsightMetricComparison {
		return dataInsightsIncompatible(id, dataInsightsMetric(readyCatalog, id), dataInsightsMetric(quietCatalog, id), "not_observed")
	}
	withheld := dataInsightsWithheld(s.readyPrepared, admindata.ExploreSuppressed)
	withheldRight := dataInsightsWithheld(s.quietPrepared, admindata.ExploreSuppressed)
	suppressed := admindata.SelectionComparison{Left: withheld, Right: withheldRight, ComparisonID: "comparison-withheld", ObservedAt: dataInsightsObservedAt,
		Metrics:          []admindata.InsightMetricComparison{},
		LeftDeclarations: dataInsightsDeclarations([]string{}, nil, "unknown"), RightDeclarations: dataInsightsDeclarations([]string{}, nil, "unknown")}
	return []dataComparisonCase{
		{Name: "ready_vs_quiet_prepared", Request: request(s.readyPrepared, s.quietPrepared), Response: dataInsightsComparison(readyPrepared, quietPrepared, []admindata.InsightMetricComparison{
			pair("orders.count", readyPrepared, quietPrepared),
			pair("orders.amount", readyPrepared, quietPrepared),
			dataInsightsIncompatible("orders.status", dataInsightsMetric(readyPrepared, "orders.status"), dataInsightsMetric(quietPrepared, "orders.status"), "denominator_mismatch"),
		}, "comparison-ready-quiet")},
		{Name: "quiet_prepared_vs_ready_active", Request: request(s.quietPrepared, s.readyActive), Response: dataInsightsComparison(quietPrepared, readyActive, []admindata.InsightMetricComparison{
			pair("orders.count", quietPrepared, readyActive),
			pair("orders.amount", quietPrepared, readyActive),
			dataInsightsIncompatible("orders.status", dataInsightsMetric(quietPrepared, "orders.status"), dataInsightsMetric(readyActive, "orders.status"), "denominator_mismatch"),
		}, "comparison-quiet-active")},
		{Name: "ready_active_vs_quiet_prepared", Request: request(s.readyActive, s.quietPrepared), Response: dataInsightsComparison(readyActive, quietPrepared, []admindata.InsightMetricComparison{
			pair("orders.count", readyActive, quietPrepared),
			pair("orders.amount", readyActive, quietPrepared),
			dataInsightsIncompatible("orders.status", dataInsightsMetric(readyActive, "orders.status"), dataInsightsMetric(quietPrepared, "orders.status"), "denominator_mismatch"),
		}, "comparison-active-quiet")},
		{Name: "ready_vs_quiet_catalog", Request: request(s.readyCatalog, s.quietCatalog), Response: dataInsightsComparison(readyCatalog, quietCatalog, []admindata.InsightMetricComparison{
			examples("orders.count"), examples("orders.amount"), examples("orders.status"),
		}, "comparison-ready-quiet-examples")},
		{Name: "ready_vs_dst_prepared", Request: request(s.readyPrepared, s.dstPrepared), Response: dataInsightsComparison(readyPrepared, dst, []admindata.InsightMetricComparison{
			dataInsightsIncompatible("orders.count", dataInsightsMetric(readyPrepared, "orders.count"), dataInsightsMetric(dst, "orders.count"), "partial_population"),
			dataInsightsIncompatible("orders.amount", dataInsightsMetric(readyPrepared, "orders.amount"), dataInsightsMetric(dst, "orders.amount"), "partial_population"),
			dataInsightsIncompatible("orders.status", dataInsightsMetric(readyPrepared, "orders.status"), dataInsightsMetric(dst, "orders.status"), "partial_population"),
			dataInsightsIncompatible("customers.count", nil, dataInsightsMetric(dst, "customers.count"), "missing_metric"),
		}, "comparison-ready-dst")},
		{Name: "withheld", Request: request(s.readyPrepared, s.quietPrepared), Response: suppressed},
	}
}

func dataInsightsContractDocument(t *testing.T) map[string]any {
	t.Helper()
	f := newDataConsoleFixtures()
	s := newDataInsightsSelections(f)
	single := func(name string, selection admindata.ExploreSelection, insights admindata.ExploreInsights) dataInsightsCase {
		return dataInsightsCase{Name: name, Request: dataInsightsRequest{Selection: selection, MetricSetID: dataInsightsMetricSet}, Response: insights}
	}
	insights := []dataInsightsCase{
		single("ready_catalog", s.readyCatalog, dataInsightsReady(s.readyCatalog)),
		single("ready_prepared", s.readyPrepared, dataInsightsReady(s.readyPrepared)),
		single("ready_active", s.readyActive, dataInsightsReady(s.readyActive)),
		single("quiet_catalog", s.quietCatalog, dataInsightsQuiet(s.quietCatalog)),
		single("quiet_prepared", s.quietPrepared, dataInsightsQuiet(s.quietPrepared)),
		single("dst_prepared", s.dstPrepared, dataInsightsDST(s.dstPrepared)),
		single("dst_catalog", s.dstCatalog, dataInsightsWithheld(s.dstCatalog, admindata.ExploreUnsupported)),
		single("reprofiled_catalog", s.reprofiled, dataInsightsHostile(s.reprofiled)),
	}
	comparisons := dataInsightsComparisons(s)
	for _, item := range insights {
		if err := item.Request.Selection.Validate(); err != nil {
			t.Fatalf("insights fixture %s selection invalid: %v", item.Name, err)
		}
		query := admindata.ExploreInsightsQuery{Selection: item.Request.Selection, MetricSetID: item.Request.MetricSetID}
		if err := query.Validate(); err != nil {
			t.Fatalf("insights fixture %s query invalid: %v", item.Name, err)
		}
	}
	for _, item := range comparisons {
		query := admindata.CompareSelectionsQuery{Left: item.Request.Left, Right: item.Request.Right, MetricSetID: item.Request.MetricSetID}
		if err := query.Validate(); err != nil {
			t.Fatalf("comparison fixture %s query invalid: %v", item.Name, err)
		}
	}
	return map[string]any{
		"metric_set_id": dataInsightsMetricSet,
		"insights":      insights,
		"comparisons":   comparisons,
		"variants": map[string]any{
			"ready_suppressed":  dataInsightsWithheld(s.readyCatalog, admindata.ExploreSuppressed),
			"ready_unsupported": dataInsightsWithheld(s.readyCatalog, admindata.ExploreUnsupported),
		},
	}
}

func TestDataInsightsContractFixtureMatchesGoTypes(t *testing.T) {
	encoded, err := json.MarshalIndent(dataInsightsContractDocument(t), "", "  ")
	if err != nil {
		t.Fatalf("marshal data insights contract: %v", err)
	}
	assertDataConsoleGolden(t, dataInsightsContractFixture, append(encoded, '\n'))
}

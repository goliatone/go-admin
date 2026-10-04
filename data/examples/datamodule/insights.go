package datamodule

import (
	"context"
	"github.com/goliatone/go-admin/data"
)

var _ data.InsightsProvider = (*Runtime)(nil)
var _ data.InsightAuthorizationRevision = (*Runtime)(nil)

// Synthetic domain policy is immutable: all isolated fields/metrics are allowed
// by the fixed allowlists in AuthorizeExplore. Host grants are checked separately.
func (*Runtime) InsightAuthorizationRevision(ctx context.Context, _ data.Principal) (string, error) {
	return "synthetic-orders-domain-v1", ctx.Err()
}

func orderMetrics() []data.InsightMetricDefinition {
	return []data.InsightMetricDefinition{
		{ID: "orders.count", Label: "Orders", Kind: "count", Unit: "orders", Population: "scenario orders"},
		{ID: "orders.amount", Label: "Order amount", Kind: "sum", Unit: "fixture amount", Population: "scenario orders"},
		{ID: "orders.by_day", Label: "Orders by day", Kind: "distribution", Unit: "orders", Population: "scenario orders"},
	}
}
func (r *Runtime) InsightMetricSets(ctx context.Context, p data.Principal, read data.ExploreRead) ([]data.InsightMetricSet, error) {
	if err := r.explorationRead(ctx, p, read); err != nil {
		return nil, err
	}
	return []data.InsightMetricSet{{ID: "orders", Metrics: orderMetrics(), Period: data.ExplorePeriod{Start: "2026-01-01", End: "2026-01-01", Timezone: "UTC"}, MaxQueries: 1, MaxRecords: 3, WorkEvidence: "Immutable synthetic stage contains at most three records; indexed stage query has LIMIT 4 and rejects excess"}}, nil
}
func (r *Runtime) ExploreInsights(ctx context.Context, p data.Principal, read data.ExploreRead, q data.ExploreInsightsQuery, budget data.InsightWork) (data.ExploreInsights, error) {
	if err := q.Validate(); err != nil {
		return data.ExploreInsights{}, err
	}
	if !q.Selection.Equal(read.Selection) || q.MetricSetID != "orders" {
		return data.ExploreInsights{}, data.Error(data.CodeGone)
	}
	if err := r.explorationRead(ctx, p, read); err != nil {
		return data.ExploreInsights{}, err
	}
	if budget.Queries < 1 || budget.Records < 3 {
		return data.ExploreInsights{}, data.Error(data.CodeUnavailable)
	}
	if q.From == "" {
		q.From = "2026-01-01"
		q.To = q.From
	}
	if q.From != "2026-01-01" || q.To != q.From {
		return data.ExploreInsights{}, data.Error(data.CodeInvalid)
	}
	records := r.fixtures[read.Selection.Scenario.ID]
	work := data.InsightWork{}
	if read.Selection.Context != data.ExploreCatalog {
		// Stage has a composite stage/id primary key. Fetch at most four records,
		// reject unexpected growth and never scan arbitrary application tables.
		rows, err := r.db.QueryContext(ctx, `SELECT id,amount,local_day FROM data_example_records WHERE stage=? ORDER BY id LIMIT 4`, read.Receipt.StageID)
		if err != nil {
			return data.ExploreInsights{}, err
		}
		defer rows.Close()
		records = []Record{}
		for rows.Next() {
			var record Record
			if err = rows.Scan(&record.ID, &record.Amount, &record.LocalDay); err != nil {
				return data.ExploreInsights{}, err
			}
			records = append(records, record)
		}
		if err = rows.Err(); err != nil {
			return data.ExploreInsights{}, err
		}
		work = data.InsightWork{Queries: 1, Records: len(records)}
	}
	if len(records) > 3 {
		return data.ExploreInsights{}, data.Error(data.CodeProvider)
	}
	count, total := float64(len(records)), float64(0)
	for _, record := range records {
		if record.LocalDay != "2026-01-01" {
			return data.ExploreInsights{}, data.Error(data.CodeProvider)
		}
		total += float64(record.Amount)
	}
	out := data.ExploreInsights{ExploreEnvelope: r.presentationEnvelope(), MetricSetID: "orders", Metrics: []data.InsightMetric{}, Coverage: []data.InsightCoverage{{LocalDay: q.From, Timezone: "UTC", Status: data.Uncovered, Reason: "expected_only"}}, Work: work}
	for _, definition := range orderMetrics() {
		value := count
		if definition.Kind == "sum" {
			value = total
		}
		metric := data.InsightMetric{InsightMetricDefinition: definition, TimeScope: data.ExplorePeriod{Start: q.From, End: q.To, Timezone: "UTC"}, Value: &value, Status: "known", Buckets: []data.InsightBucket{}, SamplingMethod: "complete scenario population"}
		if definition.Kind == "distribution" {
			denominator := count
			bucketValue := count
			metric.Denominator = &denominator
			metric.Buckets = []data.InsightBucket{{ID: "2026-01-01", Label: "2026-01-01 UTC", Status: "known", Value: &bucketValue}}
		}
		out.Metrics = append(out.Metrics, metric)
	}
	if read.Selection.Context != data.ExploreCatalog {
		out.Coverage[0].Reason = "not_verified"
		if v := read.Receipt.Verification; v != nil && v.Passed() && v.ContentRevision == read.Selection.ContentRevision {
			for _, coverage := range v.Coverage {
				if coverage.Sample.LocalDay == q.From && coverage.Sample.Timezone == "UTC" && coverage.Sample.EvidenceRef != "" {
					out.Coverage[0] = data.InsightCoverage{LocalDay: q.From, Timezone: "UTC", Status: coverage.Status, Evidence: &data.InsightEvidence{Selection: read.Selection, Ref: coverage.Sample.EvidenceRef, VerificationID: v.ID}}
				}
			}
		}
	}
	return out, nil
}

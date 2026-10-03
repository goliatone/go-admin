package datamodule

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strconv"
	"strings"

	"github.com/goliatone/go-admin/data"
)

var _ data.ExplorationProvider = (*Runtime)(nil)

func orderFields() []data.ExploreField {
	return []data.ExploreField{
		{ID: "id", Label: "Order", Description: "Synthetic order identifier", Type: "string"},
		{ID: "amount", Label: "Amount", Description: "Integer fixture amount; no currency is implied", Type: "integer", Unit: "fixture amount"},
		{ID: "local_day", Label: "Order day", Description: "Declared local order day in UTC", Type: "date"},
	}
}
func (*Runtime) AuthorizeExplore(ctx context.Context, p data.Principal, a data.ExploreAccess) error {
	if ctx.Err() != nil {
		return ctx.Err()
	}
	if !p.Valid() || a.Selection.TargetID != TargetID || a.EntityID != "" && a.EntityID != "orders" || a.RelationshipID != "" {
		return data.Error(data.CodeDenied)
	}
	if a.MetricSetID != "" && a.MetricSetID != "orders" {
		return data.Error(data.CodeDenied)
	}
	for _, id := range a.MetricIDs {
		if id != "orders.count" && id != "orders.amount" && id != "orders.by_day" {
			return data.Error(data.CodeDenied)
		}
	}
	for _, id := range a.Fields {
		if id != "id" && id != "amount" && id != "local_day" {
			return data.Error(data.CodeDenied)
		}
	}
	for _, id := range a.SurfaceIDs {
		if id != "synthetic-orders-target" && id != OrdersReportSurface {
			return data.Error(data.CodeDenied)
		}
	}
	// All demo fields are isolated synthetic values. This is the demo's domain
	// policy only; the service also requires current authenticated Data/target access.
	return nil
}
func (r *Runtime) explorationRead(ctx context.Context, p data.Principal, read data.ExploreRead) error {
	if err := read.Selection.Validate(); err != nil {
		return err
	}
	if err := r.AuthorizeExplore(ctx, p, data.ExploreAccess{Selection: read.Selection}); err != nil {
		return err
	}
	if read.Target != (data.TargetKey{ScopeKey: p.ScopeKey, TargetID: TargetID}) || read.Selection.Dataset != r.descriptor.Dataset {
		return data.Error(data.CodeGone)
	}
	found := false
	for _, scenario := range r.descriptor.Scenarios {
		found = found || scenario == read.Selection.Scenario
	}
	if !found {
		return data.Error(data.CodeStale)
	}
	if read.Selection.Context != data.ExploreCatalog {
		receipt := read.Receipt
		if receipt == nil || receipt.Target != read.Target || receipt.Dataset != read.Selection.Dataset || receipt.Scenario != read.Selection.Scenario || receipt.ID != read.Selection.ReceiptID || receipt.ContentRevision != read.Selection.ContentRevision {
			return data.Error(data.CodeGone)
		}
		if err := r.InspectReceipt(ctx, *receipt); err != nil {
			return err
		}
		if read.Selection.Context == data.ExploreActive {
			var stage string
			if err := r.db.QueryRowContext(ctx, `SELECT stage FROM data_example_routes WHERE scope=? AND target=?`, p.ScopeKey, TargetID).Scan(&stage); err != nil {
				if errors.Is(err, sql.ErrNoRows) {
					return data.Error(data.CodeStale)
				}
				return err
			}
			if stage != receipt.StageID {
				return data.Error(data.CodeStale)
			}
		}
	}
	return nil
}
func (*Runtime) presentationEnvelope() data.ExploreEnvelope {
	return data.ExploreEnvelope{PresentationRevision: "1", Completeness: "complete", State: data.ExploreAvailable}
}
func (r *Runtime) ExploreMetadata(ctx context.Context, p data.Principal, read data.ExploreRead) (data.ExploreMetadata, error) {
	if err := r.explorationRead(ctx, p, read); err != nil {
		return data.ExploreMetadata{}, err
	}
	inventory := uint64(3)
	scenarios := []data.ExploreScenario{}
	for _, ref := range r.descriptor.Scenarios {
		title, summary, outcomes := "Ready", "Exercise preparation, verification and activation with synthetic orders", []string{"Three orders totaling 250 fixture amount on 2026-01-01 UTC"}
		if ref.ID == "quiet" {
			title = "Quiet"
			summary = "Exercise an intentionally empty selected scenario"
			outcomes = []string{"Zero scenario orders; catalog inventory remains three"}
		}
		scenarios = append(scenarios, data.ExploreScenario{Scenario: ref, Title: title, Summary: summary, ExpectedOutcomes: outcomes})
	}
	return data.ExploreMetadata{ExploreEnvelope: r.presentationEnvelope(), Title: "Synthetic orders", Summary: "Small deterministic order fixtures for trying dataset lifecycle operations", Origin: "synthetic", Entities: []data.ExploreEntity{{ID: "orders", Label: "Orders", Description: "Isolated example order records; no production data", Fields: orderFields()}}, Scenarios: scenarios, Inventory: []data.ExploreCount{{EntityID: "orders", Scope: "catalog_inventory", Total: &inventory}}, Period: &data.ExplorePeriod{Start: "2026-01-01", End: "2026-01-01", Timezone: "UTC"}, Prerequisites: append([]string{}, r.descriptor.Prerequisites...), Attribution: append([]string{}, r.descriptor.Attribution...), Usages: []data.ExploreUsage{{SurfaceID: "synthetic-orders-target", Kind: "target", Label: "Kitchen sink synthetic-order target", Effects: []data.ExploreEffect{{Phase: "prepare", Description: "Write an isolated immutable order stage; active orders stay unchanged"}, {Phase: "verify", Description: "Check stage order count, amount total and declared UTC day"}, {Phase: "activate", Description: "Switch this managed target's order read route to the prepared stage"}}}}, UsageCompleteness: "partial"}, nil
}

// A process-local secret makes cursors opaque, unforgeable and invalid after a
// restart. Binding covers trusted actor/scope/current policy and exact selection;
// neither cursor nor record key is a bearer grant.
func (r *Runtime) explorationBinding(p data.Principal, q data.ExploreSamplesQuery) string {
	p.ExecutionID = ""
	p.CorrelationID = ""
	payload, _ := json.Marshal(struct {
		Principal data.Principal
		Selection data.ExploreSelection
		Entity    string
	}{p, q.Selection, q.EntityID})
	return r.explorationMAC(string(payload))
}
func (r *Runtime) explorationMAC(payload string) string {
	mac := hmac.New(sha256.New, r.explorationSecret[:])
	_, _ = mac.Write([]byte(payload))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}
func (r *Runtime) encodeExploreCursor(binding string, offset int) string {
	payload := base64.RawURLEncoding.EncodeToString([]byte(binding + ":" + strconv.Itoa(offset)))
	return payload + "." + r.explorationMAC(payload)
}
func (r *Runtime) decodeExploreCursor(binding, cursor string) (int, error) {
	if cursor == "" {
		return 0, nil
	}
	if len(cursor) > 512 {
		return 0, data.Error(data.CodeInvalid)
	}
	parts := strings.Split(cursor, ".")
	if len(parts) != 2 || !hmac.Equal([]byte(parts[1]), []byte(r.explorationMAC(parts[0]))) {
		return 0, data.Error(data.CodeInvalid)
	}
	raw, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return 0, data.Error(data.CodeInvalid)
	}
	prefix := binding + ":"
	if !strings.HasPrefix(string(raw), prefix) {
		return 0, data.Error(data.CodeInvalid)
	}
	offset, err := strconv.Atoi(strings.TrimPrefix(string(raw), prefix))
	if err != nil || offset < 1 || offset > 3 {
		return 0, data.Error(data.CodeInvalid)
	}
	return offset, nil
}
func (r *Runtime) ExploreSamples(ctx context.Context, p data.Principal, read data.ExploreRead, q data.ExploreSamplesQuery) (data.ExploreSamples, error) {
	if err := q.Validate(); err != nil {
		return data.ExploreSamples{}, err
	}
	if !q.Selection.Equal(read.Selection) || q.EntityID != "orders" {
		return data.ExploreSamples{}, data.Error(data.CodeGone)
	}
	if err := r.explorationRead(ctx, p, read); err != nil {
		return data.ExploreSamples{}, err
	}
	if q.Limit == 0 {
		q.Limit = data.ExploreDefaultLimit
	}
	binding := r.explorationBinding(p, q)
	offset, err := r.decodeExploreCursor(binding, q.Cursor)
	if err != nil {
		return data.ExploreSamples{}, err
	}
	records := r.fixtures[q.Selection.Scenario.ID]
	if read.Selection.Context != data.ExploreCatalog {
		records, err = queryRecords(ctx, r.db, read.Receipt.StageID)
		if err != nil {
			return data.ExploreSamples{}, err
		}
	}
	if len(records) > 3 || offset >= len(records) && offset > 0 {
		return data.ExploreSamples{}, data.Error(data.CodeInvalid)
	}
	total := uint64(len(records))
	out := data.ExploreSamples{ExploreEnvelope: r.presentationEnvelope(), EntityID: "orders", Columns: orderFields(), Rows: []data.ExploreRow{}, Total: &total, SamplingMethod: "declared fixture order"}
	if read.Selection.Context != data.ExploreCatalog {
		out.SamplingMethod = "immutable stage ordered by order identifier"
	}
	if total == 0 {
		out.State = data.ExploreEmpty
		return out, nil
	}
	end := min(offset+q.Limit, len(records))
	for _, row := range records[offset:end] {
		out.Rows = append(out.Rows, data.ExploreRow{RecordKey: r.explorationMAC(binding + ":" + row.ID), Cells: map[string]data.ExploreCell{"id": {State: "value", Value: row.ID}, "amount": {State: "value", Value: row.Amount}, "local_day": {State: "value", Value: row.LocalDay}}})
	}
	if end < len(records) {
		next := r.encodeExploreCursor(binding, end)
		out.NextCursor = &next
		out.Completeness = "partial"
	} else if offset > 0 {
		out.Completeness = "partial"
	}
	return out, nil
}
func (r *Runtime) ExploreRelated(ctx context.Context, p data.Principal, read data.ExploreRead, q data.ExploreRelatedQuery) (data.ExploreSamples, error) {
	if err := q.Validate(); err != nil {
		return data.ExploreSamples{}, err
	}
	if err := r.explorationRead(ctx, p, read); err != nil {
		return data.ExploreSamples{}, err
	}
	// No relationships are declared for these synthetic orders. The service never
	// calls this branch for an undeclared relationship or invents related records.
	return data.ExploreSamples{ExploreEnvelope: data.ExploreEnvelope{PresentationRevision: "1", Completeness: "unknown", State: data.ExploreUnsupported}, EntityID: q.EntityID, Rows: []data.ExploreRow{}, Columns: []data.ExploreField{}}, nil
}

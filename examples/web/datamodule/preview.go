package datamodule

import (
	"context"
	"database/sql"
	"errors"
	"github.com/goliatone/go-admin/data"
	"reflect"
)

const OrdersReportSurface = "synthetic-orders-report"

var _ data.ApplicationPreviewAdapter = (*Runtime)(nil)

func (*Runtime) PreviewGuarantees() data.PreviewGuarantees {
	return data.PreviewGuarantees{Durable: true, Isolation: true, ReadOnly: true, Retention: true, Cleanup: true}
}
func (r *Runtime) PreviewReadiness(ctx context.Context, p data.Principal, read data.ExploreRead) error {
	if read.Selection.Context != data.ExplorePrepared || read.Receipt == nil {
		return data.Error(data.CodeUnavailable)
	}
	return r.explorationRead(ctx, p, read)
}
func (r *Runtime) OpenPreview(ctx context.Context, w data.PreviewRecord, quota int) (data.PreviewRecord, error) {
	if err := data.RejectPreviewEffects(ctx); err != nil {
		return data.PreviewRecord{}, err
	}
	if w.Session.SurfaceID != OrdersReportSurface {
		return data.PreviewRecord{}, data.Error(data.CodeGone)
	}
	read := data.ExploreRead{Selection: w.Session.Selection, Target: w.Receipt.Target, Receipt: &w.Receipt}
	if err := r.PreviewReadiness(ctx, w.Principal, read); err != nil {
		return data.PreviewRecord{}, err
	}
	return r.Store.OpenPreviewRecord(ctx, w, quota)
}
func (r *Runtime) LookupPreview(ctx context.Context, id string) (data.PreviewRecord, error) {
	return r.Store.LookupPreviewRecord(ctx, id)
}
func (r *Runtime) InspectPreview(ctx context.Context, w data.PreviewRecord) error {
	// Physical inspection precedes the final authoritative session/receipt read.
	if err := r.InspectReceipt(ctx, w.Receipt); err != nil {
		return err
	}
	return r.Store.InspectPreviewRecord(ctx, w)
}
func (r *Runtime) EndPreview(ctx context.Context, id, state string) error {
	return r.Store.EndPreviewRecord(ctx, id, state)
}
func (r *Runtime) PrunePreviews(ctx context.Context, limit int) error {
	return r.Store.PrunePreviewRecords(ctx, limit)
}

// OrdersReport is the ordinary application report read model, shared by active
// and preview views. It is not an explorer sample envelope. Queries use an
// explicit physical stage and never a production/default connection.
type OrdersReport struct {
	Orders      []Record `json:"orders"`
	OrderCount  int      `json:"order_count"`
	AmountTotal int      `json:"amount_total"`
	Unit        string   `json:"unit"`
}

func (r *Runtime) reportStage(ctx context.Context, stage string) (OrdersReport, error) {
	rows, err := queryRecords(ctx, r.db, stage)
	if err != nil {
		return OrdersReport{}, err
	}
	if len(rows) > 100 {
		return OrdersReport{}, data.Error(data.CodeUnavailable)
	}
	report := OrdersReport{Orders: rows, OrderCount: len(rows), Unit: "fixture amount"}
	for _, row := range rows {
		report.AmountTotal += row.Amount
	}
	return report, nil
}
func (r *Runtime) PreviewOrdersReport(ctx context.Context, read data.PreviewReadContext) (OrdersReport, error) {
	installed, err := data.ApplicationPreviewFromContext(ctx)
	if err != nil {
		return OrdersReport{}, err
	}
	if installed.Session.SessionID != read.Session.SessionID || installed.Principal != read.Principal || !installed.Session.Selection.Equal(read.Session.Selection) || installed.Session.SurfaceID != OrdersReportSurface || read.Read.Receipt == nil {
		return OrdersReport{}, data.Error(data.CodeDenied)
	}
	record, err := r.LookupPreview(ctx, read.Session.SessionID)
	if err != nil {
		return OrdersReport{}, err
	}
	if !record.Authorizes(read.Principal) || !reflect.DeepEqual(record.Receipt, *read.Read.Receipt) {
		return OrdersReport{}, data.Error(data.CodeDenied)
	}
	if err = r.InspectPreview(ctx, record); err != nil {
		return OrdersReport{}, err
	}
	if err = r.PreviewReadiness(ctx, read.Principal, read.Read); err != nil {
		return OrdersReport{}, err
	}
	return r.reportStage(ctx, record.Receipt.StageID)
}
func (r *Runtime) ActiveOrdersReport(ctx context.Context, target data.TargetKey) (OrdersReport, error) {
	if err := data.RejectPreviewEffects(ctx); err != nil {
		return OrdersReport{}, err
	} // No active read is permitted from preview context.
	if target.TargetID != TargetID || target.ScopeKey == "" {
		return OrdersReport{}, data.Error(data.CodeDenied)
	}
	var stage string
	err := r.db.QueryRowContext(ctx, `SELECT stage FROM data_example_routes WHERE scope=? AND target=?`, target.ScopeKey, target.TargetID).Scan(&stage)
	if errors.Is(err, sql.ErrNoRows) {
		return OrdersReport{Orders: []Record{}, Unit: "fixture amount"}, nil
	}
	if err != nil {
		return OrdersReport{}, err
	}
	return r.reportStage(ctx, stage)
}

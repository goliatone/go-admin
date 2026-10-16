package quickstart

import (
	"context"
	"database/sql"
	"time"

	jobbun "github.com/goliatone/go-export/adapters/job/bun"
	"github.com/goliatone/go-export/export"
	job "github.com/goliatone/go-job"
	"github.com/goliatone/go-job/queue/adapters/postgres"
	"github.com/uptrace/bun"
)

type durableExportEvents struct{ events []export.ChangeEvent }

func (b *durableExportEvents) Emit(_ context.Context, event export.ChangeEvent) error {
	b.events = append(b.events, event)
	return nil
}

// TickSchedule admits a bounded chronological catch-up batch. The host resolves
// current schedule delegation before entering its authorized SQL transaction.
// Occurrence/owner/delegation/record/plan/queue/cursor share one commit. Operators
// install immutable native definitions with an ExportRequest JSON payload.
func (h *DurableExportHost) TickSchedule(ctx context.Context, namespace, id string, through time.Time, limit int) ([]postgres.Occurrence, error) {
	ctx, a, err := h.background(ctx, ExportBackgroundWork{Kind: ExportBackgroundSchedule, Namespace: namespace, ScheduleID: id})
	if err != nil {
		return nil, err
	}
	var items []postgres.Occurrence
	events := new(durableExportEvents)
	err = h.cfg.WithTransaction(ctx, a, func(ctx context.Context, tx bun.Tx) error {
		cfg := h.replay
		runner := *cfg.Service.Runner
		runner.Emitter = events
		cfg.Service.Runner = &runner
		cfg.WithTransaction = func(ctx context.Context, actor export.Actor, fn func(context.Context, bun.Tx) error) error {
			if actor.ID != a.ID || actor.Scope != a.Scope {
				return durableExportDenied()
			}
			return fn(ctx, tx)
		}
		svc, err := jobbun.NewScheduler(jobbun.Config{Replay: cfg, Queue: h.Queue})
		if err != nil {
			return err
		}
		items, err = h.Recurring.AdmitTx(ctx, tx.Tx, namespace, id, through, limit, func(ctx context.Context, sqlTx *sql.Tx, occ postgres.Occurrence, m *job.ExecutionMessage) (string, error) {
			if tx.Tx != sqlTx || occ.Namespace != namespace {
				return "", durableExportDenied()
			}
			var req export.ExportRequest
			if err := decodeDurableExportPayload(m, &req); err != nil {
				return "", err
			}
			req.IdempotencyKey = occ.ID
			rec, err := svc.RequestExport(ctx, a, req)
			return rec.ID, err
		})
		return err
	})
	if err != nil {
		return nil, err
	}
	// This matches the native service's postcommit activity contract. A failed
	// activity sink cannot roll back committed admission and is logged separately.
	if emitter := h.Bundle.Runner.Emitter; emitter != nil {
		for _, event := range events.events {
			if err := emitter.Emit(ctx, event); err != nil && h.Bundle.Runner.Logger != nil {
				h.Bundle.Runner.Logger.Error("postcommit recurring export activity failed", "error", err)
			}
		}
	}
	return items, nil
}

package quickstart

import (
	"context"
	"github.com/goliatone/go-export/export"
	"time"
)

// Keep the native service intact and hold one lease across each entire call,
// including artifact writes and transaction completion. Host History has its own
// scope-aware implementation and acquires the same gate independently.
type durableGatedExportService struct {
	export.Service
	gate *DurableExportRecoveryGate
}

func (s *durableGatedExportService) RequestExport(ctx context.Context, a export.Actor, r export.ExportRequest) (export.ExportRecord, error) {
	ctx, done, _, e := s.gate.enter(ctx)
	if e != nil {
		return export.ExportRecord{}, e
	}
	defer done()
	return s.Service.RequestExport(ctx, a, r)
}
func (s *durableGatedExportService) GenerateExport(ctx context.Context, a export.Actor, id string, r export.ExportRequest) (export.ExportResult, error) {
	ctx, done, _, e := s.gate.enter(ctx)
	if e != nil {
		return export.ExportResult{}, e
	}
	defer done()
	return s.Service.GenerateExport(ctx, a, id, r)
}
func (s *durableGatedExportService) CancelExport(ctx context.Context, a export.Actor, id string) (export.ExportRecord, error) {
	ctx, done, _, e := s.gate.enter(ctx)
	if e != nil {
		return export.ExportRecord{}, e
	}
	defer done()
	return s.Service.CancelExport(ctx, a, id)
}
func (s *durableGatedExportService) DeleteExport(ctx context.Context, a export.Actor, id string) error {
	ctx, done, _, e := s.gate.enter(ctx)
	if e != nil {
		return e
	}
	defer done()
	return s.Service.DeleteExport(ctx, a, id)
}
func (s *durableGatedExportService) Status(ctx context.Context, a export.Actor, id string) (export.ExportRecord, error) {
	ctx, done, _, e := s.gate.enter(ctx)
	if e != nil {
		return export.ExportRecord{}, e
	}
	defer done()
	return s.Service.Status(ctx, a, id)
}
func (s *durableGatedExportService) History(ctx context.Context, a export.Actor, f export.ProgressFilter) ([]export.ExportRecord, error) {
	ctx, done, _, e := s.gate.enter(ctx)
	if e != nil {
		return nil, e
	}
	defer done()
	return s.Service.History(ctx, a, f)
}
func (s *durableGatedExportService) DownloadMetadata(ctx context.Context, a export.Actor, id string) (export.DownloadInfo, error) {
	ctx, done, _, e := s.gate.enter(ctx)
	if e != nil {
		return export.DownloadInfo{}, e
	}
	defer done()
	return s.Service.DownloadMetadata(ctx, a, id)
}
func (s *durableGatedExportService) Cleanup(ctx context.Context, now time.Time) (int, error) {
	ctx, done, _, e := s.gate.enter(ctx)
	if e != nil {
		return 0, e
	}
	defer done()
	return s.Service.Cleanup(ctx, now)
}

var _ export.Service = (*durableGatedExportService)(nil)

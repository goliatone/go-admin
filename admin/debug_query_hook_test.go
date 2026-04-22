package admin

import (
	"context"
	"database/sql"
	"errors"
	"testing"
	"time"

	"github.com/uptrace/bun"
)

type stubSQLResult struct {
	rows int64
	err  error
}

func (s stubSQLResult) LastInsertId() (int64, error) { return 0, s.err }
func (s stubSQLResult) RowsAffected() (int64, error) { return s.rows, s.err }

func TestDebugQueryHookCapturesSQL(t *testing.T) {
	cfg := DebugConfig{
		CaptureSQL: true,
		Panels:     []string{DebugPanelSQL},
	}
	collector := NewDebugCollector(cfg)
	hook := NewDebugQueryHook(collector)

	event := &bun.QueryEvent{
		Query:     "SELECT 1",
		QueryArgs: []any{"value"},
		StartTime: time.Now().Add(-10 * time.Millisecond),
		Result:    stubSQLResult{rows: 2},
	}

	hook.AfterQuery(context.Background(), event)

	snapshot := collector.Snapshot()
	entries, ok := snapshot[DebugPanelSQL].([]SQLEntry)
	if !ok || len(entries) != 1 {
		t.Fatalf("expected sql snapshot entry, got %+v", snapshot[DebugPanelSQL])
	}
	if entries[0].Query != "SELECT 1" {
		t.Fatalf("expected sql query captured, got %+v", entries[0])
	}
	if entries[0].RowCount != 2 {
		t.Fatalf("expected row count 2, got %+v", entries[0].RowCount)
	}
}

func TestDebugQueryHookSuppressesNoRowsError(t *testing.T) {
	cfg := DebugConfig{
		CaptureSQL: true,
		Panels:     []string{DebugPanelSQL},
	}
	collector := NewDebugCollector(cfg)
	hook := NewDebugQueryHook(collector)

	event := &bun.QueryEvent{
		Query:     "SELECT missing",
		StartTime: time.Now().Add(-10 * time.Millisecond),
		Err:       sql.ErrNoRows,
	}

	hook.AfterQuery(context.Background(), event)

	snapshot := collector.Snapshot()
	entries, ok := snapshot[DebugPanelSQL].([]SQLEntry)
	if !ok || len(entries) != 1 {
		t.Fatalf("expected sql snapshot entry, got %+v", snapshot[DebugPanelSQL])
	}
	if entries[0].Error != "" {
		t.Fatalf("expected sql.ErrNoRows to be suppressed, got %q", entries[0].Error)
	}
}

func TestDebugQueryHookCapturesRealSQLError(t *testing.T) {
	cfg := DebugConfig{
		CaptureSQL: true,
		Panels:     []string{DebugPanelSQL},
	}
	collector := NewDebugCollector(cfg)
	hook := NewDebugQueryHook(collector)
	failure := errors.New("database unavailable")

	event := &bun.QueryEvent{
		Query:     "SELECT broken",
		StartTime: time.Now().Add(-10 * time.Millisecond),
		Err:       failure,
	}

	hook.AfterQuery(context.Background(), event)

	snapshot := collector.Snapshot()
	entries, ok := snapshot[DebugPanelSQL].([]SQLEntry)
	if !ok || len(entries) != 1 {
		t.Fatalf("expected sql snapshot entry, got %+v", snapshot[DebugPanelSQL])
	}
	if entries[0].Error != failure.Error() {
		t.Fatalf("expected real SQL error %q, got %q", failure.Error(), entries[0].Error)
	}
}

func TestDebugQueryHookKeyStableForDeduping(t *testing.T) {
	hook := &DebugQueryHook{}
	if hook.QueryHookKey() != debugQueryHookKey {
		t.Fatalf("expected query hook key %q, got %q", debugQueryHookKey, hook.QueryHookKey())
	}
}

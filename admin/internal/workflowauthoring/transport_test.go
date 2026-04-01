package workflowauthoring

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/goliatone/go-command/flow"
)

func TestVersionSummaryProjectsCanonicalFields(t *testing.T) {
	now := time.Date(2026, 4, 1, 13, 0, 0, 0, time.UTC)
	summary := VersionSummary(&flow.AuthoringMachineRecord{
		Version:             "2",
		ETag:                "machine:2",
		UpdatedAt:           now,
		PublishedAt:         CloneTimePtr(&now),
		PublishedDefinition: &flow.MachineDefinition{ID: "machine", Version: "2"},
	})
	if summary.Version != "2" || summary.ETag != "machine:2" {
		t.Fatalf("expected version/etag preserved, got %+v", summary)
	}
	if summary.UpdatedAt != now.Format(time.RFC3339) || summary.PublishedAt != now.Format(time.RFC3339) {
		t.Fatalf("expected RFC3339 timestamps, got %+v", summary)
	}
	if summary.IsDraft {
		t.Fatalf("expected non-draft summary when published definition is present")
	}
}

func TestDiffMachineDefinitionsReportsStableChanges(t *testing.T) {
	base := &flow.MachineDefinition{
		ID:      "machine",
		Version: "1",
		States: []flow.StateDefinition{
			{Name: "draft", Initial: true},
		},
	}
	target := &flow.MachineDefinition{
		ID:      "machine",
		Version: "2",
		States: []flow.StateDefinition{
			{Name: "draft", Initial: true},
			{Name: "published"},
		},
	}
	changes := DiffMachineDefinitions(base, target)
	if len(changes) == 0 {
		t.Fatalf("expected diff changes")
	}
	if changes[0].Path == "" {
		t.Fatalf("expected populated diff path, got %+v", changes)
	}
}

func TestUnavailableStoreReturnsConfiguredError(t *testing.T) {
	want := errors.New("unavailable")
	store := NewUnavailableStore(want)
	if _, err := store.List(context.Background(), flow.AuthoringListOptions{}); !errors.Is(err, want) {
		t.Fatalf("expected list error %v, got %v", want, err)
	}
	if _, err := store.Load(context.Background(), "machine"); !errors.Is(err, want) {
		t.Fatalf("expected load error %v, got %v", want, err)
	}
	if _, err := store.Save(context.Background(), &flow.AuthoringMachineRecord{}, ""); !errors.Is(err, want) {
		t.Fatalf("expected save error %v, got %v", want, err)
	}
	if _, err := store.Delete(context.Background(), "machine", "", false); !errors.Is(err, want) {
		t.Fatalf("expected delete error %v, got %v", want, err)
	}
}

package workflowauthoring

import (
	"testing"
	"time"

	"github.com/goliatone/go-command/flow"
)

func TestNormalizeMachineRecordNormalizesDefaultsAndSortsDiagnostics(t *testing.T) {
	now := time.Date(2026, 4, 1, 12, 30, 0, 0, time.FixedZone("offset", -7*60*60))
	rec, err := NormalizeMachineRecord(&flow.AuthoringMachineRecord{
		MachineID: " editorial.default ",
		Draft: flow.DraftMachineDocument{
			Definition: &flow.MachineDefinition{Name: " Editorial ", Version: "1"},
		},
		Diagnostics: []flow.ValidationDiagnostic{
			{Path: "states[1]"},
			{Path: "states[0]"},
		},
		UpdatedAt: now,
	})
	if err != nil {
		t.Fatalf("normalize: %v", err)
	}
	if rec.MachineID != "editorial.default" {
		t.Fatalf("expected trimmed machine id, got %q", rec.MachineID)
	}
	if rec.Name != "Editorial" {
		t.Fatalf("expected trimmed name from definition, got %q", rec.Name)
	}
	if rec.Version != "1" {
		t.Fatalf("expected default version 1, got %q", rec.Version)
	}
	if rec.ETag != "editorial.default:1" {
		t.Fatalf("expected default etag, got %q", rec.ETag)
	}
	if rec.Diagnostics[0].Path != "states[0]" || rec.Diagnostics[1].Path != "states[1]" {
		t.Fatalf("expected sorted diagnostics, got %+v", rec.Diagnostics)
	}
	if rec.UpdatedAt.Location() != time.UTC {
		t.Fatalf("expected UTC updated time, got %v", rec.UpdatedAt.Location())
	}
}

func TestMachineAndVersionRowsRoundTripAuthoringRecord(t *testing.T) {
	now := time.Date(2026, 4, 1, 12, 30, 0, 0, time.UTC)
	rec := &flow.AuthoringMachineRecord{
		MachineID: "editorial.default",
		Name:      "Editorial",
		Version:   "2",
		ETag:      "editorial.default:2",
		Draft: flow.DraftMachineDocument{
			Definition: &flow.MachineDefinition{
				ID:      "editorial.default",
				Name:    "Editorial",
				Version: "2",
				States: []flow.StateDefinition{
					{Name: "draft", Initial: true},
					{Name: "published"},
				},
			},
			DraftState: flow.DraftState{IsDraft: false, LastSavedAt: now},
		},
		Diagnostics: []flow.ValidationDiagnostic{
			{Path: "transitions[0]", Message: "ok"},
		},
		UpdatedAt:           now,
		PublishedAt:         CloneTimePtr(&now),
		PublishedDefinition: &flow.MachineDefinition{ID: "editorial.default", Name: "Editorial", Version: "2"},
		DeletedAt:           CloneTimePtr(&now),
	}

	machineRow, err := MachineRowFromRecord(rec)
	if err != nil {
		t.Fatalf("machine row: %v", err)
	}
	machineRoundTrip, err := MachineFromRow(machineRow)
	if err != nil {
		t.Fatalf("machine from row: %v", err)
	}
	if machineRoundTrip.MachineID != rec.MachineID || machineRoundTrip.Version != rec.Version {
		t.Fatalf("expected machine round trip to preserve ids/version, got %+v", machineRoundTrip)
	}
	if machineRoundTrip.PublishedDefinition == nil || machineRoundTrip.PublishedDefinition.ID != rec.PublishedDefinition.ID {
		t.Fatalf("expected published definition preserved, got %+v", machineRoundTrip.PublishedDefinition)
	}

	versionRow, err := VersionRowFromRecord(rec)
	if err != nil {
		t.Fatalf("version row: %v", err)
	}
	versionRoundTrip, err := VersionFromRow(versionRow)
	if err != nil {
		t.Fatalf("version from row: %v", err)
	}
	if versionRoundTrip.MachineID != rec.MachineID || versionRoundTrip.ETag != rec.ETag {
		t.Fatalf("expected version round trip to preserve machine/etag, got %+v", versionRoundTrip)
	}
	if len(versionRoundTrip.Diagnostics) != 1 || versionRoundTrip.Diagnostics[0].Path != "transitions[0]" {
		t.Fatalf("expected diagnostics preserved, got %+v", versionRoundTrip.Diagnostics)
	}
}

func TestParseCursorOffsetAndCloneTimePtrAreStable(t *testing.T) {
	if got := ParseCursorOffset(" 12 "); got != 12 {
		t.Fatalf("expected parsed cursor 12, got %d", got)
	}
	if got := ParseCursorOffset("-9"); got != 0 {
		t.Fatalf("expected negative cursor to clamp to 0, got %d", got)
	}
	now := time.Date(2026, 4, 1, 12, 30, 0, 0, time.FixedZone("offset", -7*60*60))
	clone := CloneTimePtr(&now)
	if clone == nil || clone.Location() != time.UTC {
		t.Fatalf("expected UTC clone, got %+v", clone)
	}
}

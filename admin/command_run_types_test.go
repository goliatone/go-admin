package admin

import (
	"encoding/json"
	"errors"
	"math"
	"strings"
	"testing"
	"time"
)

func TestCommandRunUpdateJSONRoundTripAndCloneIsolation(t *testing.T) {
	now := time.Date(2026, 7, 22, 12, 30, 0, 123, time.FixedZone("PDT", -7*60*60))
	current, total, duration := int64(2), int64(5), int64(1250)
	update, err := NormalizeCommandRunUpdate(CommandRunUpdate{
		SchemaVersion: CommandRunSchemaVersion,
		EventID:       " event-1 ",
		RunID:         " run-1 ",
		Revision:      3,
		CommandID:     " jobs.reindex ",
		DispatchID:    " dispatch-1 ",
		CorrelationID: " correlation-1 ",
		Phase:         " PROGRESS ",
		OccurredAt:    now,
		StartedAt:     &now,
		DurationMS:    &duration,
		Mode:          " queued ",
		Message:       " indexing ",
		Current:       &current,
		Total:         &total,
		Attempt:       1,
		MaxAttempts:   3,
		Scope: CommandRunScope{
			ApplicationID: " app ", EnvironmentID: " prod ", TenantID: " tenant-a ",
		},
		Metadata: map[string]any{"safe": map[string]any{"labels": []any{"one", "two"}}},
	}, CommandRunContractLimits{})
	if err != nil {
		t.Fatalf("normalize update: %v", err)
	}
	if update.EventID != "event-1" || update.Phase != CommandRunPhaseProgress {
		t.Fatalf("unexpected normalization: %+v", update)
	}
	if update.OccurredAt.Location() != time.UTC {
		t.Fatalf("occurred_at location = %v, want UTC", update.OccurredAt.Location())
	}

	encoded, err := json.Marshal(update)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var decoded CommandRunUpdate
	if err := json.Unmarshal(encoded, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if err := ValidateCommandRunUpdate(decoded, CommandRunContractLimits{}); err != nil {
		t.Fatalf("validate decoded update: %v", err)
	}

	clone := update.Clone()
	clone.Metadata["safe"].(map[string]any)["labels"].([]any)[0] = "changed"
	*clone.Current = 4
	if got := update.Metadata["safe"].(map[string]any)["labels"].([]any)[0]; got != "one" {
		t.Fatalf("source metadata mutated through clone: %v", got)
	}
	if *update.Current != 2 {
		t.Fatalf("source progress mutated through clone: %d", *update.Current)
	}
}

func TestCommandRunPhaseCoverageAndTerminal(t *testing.T) {
	phases := []CommandRunPhase{
		CommandRunPhaseSubmitted, CommandRunPhaseStarted, CommandRunPhaseCheckpoint,
		CommandRunPhaseProgress, CommandRunPhaseSucceeded, CommandRunPhaseFailed,
		CommandRunPhaseCanceled, CommandRunPhaseRejected,
	}
	for _, phase := range phases {
		if !phase.Valid() {
			t.Errorf("phase %q should be valid", phase)
		}
	}
	for _, phase := range []CommandRunPhase{CommandRunPhaseSucceeded, CommandRunPhaseFailed, CommandRunPhaseCanceled, CommandRunPhaseRejected} {
		if !phase.Terminal() {
			t.Errorf("phase %q should be terminal", phase)
		}
	}
	if CommandRunPhaseProgress.Terminal() || CommandRunPhase("unknown").Valid() {
		t.Fatal("non-terminal/unknown phase classification is incorrect")
	}
}

func TestNormalizeCommandRunUpdateValidation(t *testing.T) {
	base := validCommandRunUpdate()
	tests := map[string]func(*CommandRunUpdate){
		"schema":             func(u *CommandRunUpdate) { u.SchemaVersion = 2 },
		"event identity":     func(u *CommandRunUpdate) { u.EventID = " " },
		"run identity":       func(u *CommandRunUpdate) { u.RunID = "" },
		"command identity":   func(u *CommandRunUpdate) { u.CommandID = "" },
		"revision":           func(u *CommandRunUpdate) { u.Revision = 0 },
		"phase":              func(u *CommandRunUpdate) { u.Phase = "other" },
		"occurred time":      func(u *CommandRunUpdate) { u.OccurredAt = time.Time{} },
		"negative current":   func(u *CommandRunUpdate) { v := int64(-1); u.Current = &v },
		"invalid progress":   func(u *CommandRunUpdate) { a, b := int64(3), int64(2); u.Current, u.Total = &a, &b },
		"invalid attempts":   func(u *CommandRunUpdate) { u.Attempt, u.MaxAttempts = 2, 1 },
		"oversized identity": func(u *CommandRunUpdate) { u.EventID = strings.Repeat("e", defaultCommandRunMaxIDLength+1) },
		"oversized metadata": func(u *CommandRunUpdate) {
			u.Metadata = map[string]any{"value": strings.Repeat("x", defaultCommandRunMaxMetadataString+1)}
		},
		"unsafe metadata": func(u *CommandRunUpdate) { u.Metadata = map[string]any{"error": errors.New("secret")} },
		"non-finite":      func(u *CommandRunUpdate) { u.Metadata = map[string]any{"number": math.Inf(1)} },
	}
	for name, mutate := range tests {
		t.Run(name, func(t *testing.T) {
			update := base.Clone()
			mutate(&update)
			if _, err := NormalizeCommandRunUpdate(update, CommandRunContractLimits{}); !errors.Is(err, ErrInvalidCommandRunUpdate) {
				t.Fatalf("error = %v, want ErrInvalidCommandRunUpdate", err)
			}
		})
	}
}

func TestCommandRunMetadataBounds(t *testing.T) {
	base := validCommandRunUpdate()
	limits := DefaultCommandRunContractLimits()
	limits.MaxMetadataKeys = 3
	base.Metadata = map[string]any{"a": 1, "nested": map[string]any{"b": 2}}
	if _, err := NormalizeCommandRunUpdate(base, limits); err != nil {
		t.Fatalf("metadata at key limit: %v", err)
	}
	base.Metadata["c"] = 3
	if _, err := NormalizeCommandRunUpdate(base, limits); !errors.Is(err, ErrInvalidCommandRunUpdate) {
		t.Fatalf("key limit error = %v", err)
	}

	limits = DefaultCommandRunContractLimits()
	limits.MaxMetadataDepth = 2
	base.Metadata = map[string]any{"a": map[string]any{"b": map[string]any{"c": true}}}
	if _, err := NormalizeCommandRunUpdate(base, limits); !errors.Is(err, ErrInvalidCommandRunUpdate) {
		t.Fatalf("depth limit error = %v", err)
	}
}

func TestCommandRunSelectorScopeNormalizationAndAuthorization(t *testing.T) {
	scope := CommandRunScope{ApplicationID: " app ", EnvironmentID: " prod ", TenantID: " tenant-a ", OrganizationID: " org-1 "}
	selector := CommandRunSelector{Scope: CommandRunScope{ApplicationID: "app", EnvironmentID: "prod", TenantID: "tenant-a", OrganizationID: "org-1"}}
	if !selector.Matches(scope) {
		t.Fatal("exact normalized selector should match")
	}
	if (CommandRunSelector{Scope: CommandRunScope{ApplicationID: "app"}}).Matches(scope) {
		t.Fatal("missing tenant and organization authorization must not match scoped data")
	}
	if (CommandRunSelector{}).Matches(CommandRunScope{ApplicationID: "app"}) {
		t.Fatal("missing application authorization must not match application-scoped data")
	}
	if !(CommandRunSelector{Global: true}).Matches(scope) {
		t.Fatal("explicit global selector should match")
	}
	if err := (CommandRunSelector{Global: true, Scope: CommandRunScope{TenantID: "tenant-a"}}).Validate(); !errors.Is(err, ErrInvalidCommandRunSelector) {
		t.Fatalf("ambiguous global selector error = %v", err)
	}
	if (CommandRunSelector{}).Matches(CommandRunScope{TenantID: "tenant-a"}) {
		t.Fatal("empty selector must not authorize tenant-scoped data")
	}
	if !(CommandRunSelector{}).Matches(CommandRunScope{}) {
		t.Fatal("empty selector should match only unscoped data")
	}
}

func TestCommandRunRecordJSONIsFlat(t *testing.T) {
	record := CommandRunRecord{
		CommandRunUpdate: validCommandRunUpdate(),
		FirstOccurredAt:  time.Now().UTC(),
		UpdatedAt:        time.Now().UTC(),
	}
	encoded, err := json.Marshal(record)
	if err != nil {
		t.Fatalf("marshal record: %v", err)
	}
	var row map[string]any
	if err := json.Unmarshal(encoded, &row); err != nil {
		t.Fatalf("unmarshal row: %v", err)
	}
	if row["run_id"] != record.RunID {
		t.Fatalf("flat run_id = %v, want %q", row["run_id"], record.RunID)
	}
	if _, nested := row["CommandRunUpdate"]; nested {
		t.Fatal("embedded update must marshal as a flat row")
	}
}

func validCommandRunUpdate() CommandRunUpdate {
	return CommandRunUpdate{
		SchemaVersion: CommandRunSchemaVersion,
		EventID:       "event-1",
		RunID:         "run-1",
		Revision:      1,
		CommandID:     "jobs.reindex",
		Phase:         CommandRunPhaseSubmitted,
		OccurredAt:    time.Now().UTC(),
		Scope:         CommandRunScope{ApplicationID: "app", EnvironmentID: "test"},
	}
}

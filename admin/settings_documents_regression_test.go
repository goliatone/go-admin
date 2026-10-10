package admin

import (
	"context"
	"encoding/json"
	"errors"
	"math"
	"strings"
	"testing"

	"github.com/uptrace/bun"
)

func TestSettingsDocumentsNumericIdentityRoundTrip(t *testing.T) {
	settingsDocumentTestDBs(t, func(t *testing.T, db *bun.DB) {
		_, svc := settingsDocumentAdapter(t, db)
		target := SettingsDocumentTarget{Namespace: "review.identity", Scope: SettingsScopeSite}
		saved, err := svc.ApplyDocument(context.Background(), SettingsDocumentMutation{Target: target, Values: map[string]any{"days": json.Number("1e2")}})
		if err != nil {
			t.Fatal(err)
		}
		read, err := svc.ReadDocument(context.Background(), target)
		if err != nil {
			t.Fatal(err)
		}
		if saved.Identity != read.Identity {
			t.Errorf("identity changed after reload: saved=%v read=%v", saved.Overrides, read.Overrides)
		}
		again, err := svc.ApplyDocument(context.Background(), SettingsDocumentMutation{Target: target, ExpectedRevision: saved.Revision, Values: map[string]any{"days": json.Number("1e2")}})
		if err != nil {
			t.Fatal(err)
		}
		if again.Revision != saved.Revision {
			t.Errorf("identical resubmission advanced revision: %d -> %d", saved.Revision, again.Revision)
		}
	})
}
func TestSettingsDocumentsSizeBoundaryRoundTrip(t *testing.T) {
	settingsDocumentTestDBs(t, func(t *testing.T, db *bun.DB) {
		_, svc := settingsDocumentAdapter(t, db)
		target := SettingsDocumentTarget{Namespace: "review.limit", Scope: SettingsScopeSite}
		// 11-byte JSON envelope plus value exactly fills the configured 16 KiB.
		value := strings.Repeat("a", (16<<10)-11)
		raw, marshalErr := json.Marshal(map[string]any{"name": value})
		if marshalErr != nil {
			t.Fatal(marshalErr)
		}
		if len(raw) != (16 << 10) {
			t.Fatalf("bad fixture %d", len(raw))
		}
		saved, err := svc.ApplyDocument(context.Background(), SettingsDocumentMutation{Target: target, Values: map[string]any{"name": value}})
		if err != nil {
			t.Fatal(err)
		}
		reloaded, err := svc.ReadDocument(context.Background(), target)
		if err != nil {
			t.Fatal(err)
		}
		if reloaded.Identity != saved.Identity {
			t.Fatal("boundary identity changed")
		}
		if _, applyErr := svc.ApplyDocument(context.Background(), SettingsDocumentMutation{Target: target, ExpectedRevision: saved.Revision, Values: map[string]any{"name": value + "a"}}); applyErr == nil {
			t.Fatal("accepted oversized document")
		}
		after, err := svc.ReadDocument(context.Background(), target)
		if err != nil || after.Identity != saved.Identity {
			t.Fatalf("oversized write changed stored state: %+v %v", after, err)
		}
		changed, err := svc.ApplyDocument(context.Background(), SettingsDocumentMutation{Target: target, ExpectedRevision: saved.Revision, Values: map[string]any{"name": "Editable"}})
		if err != nil || changed.Revision != saved.Revision+1 {
			t.Fatalf("cannot edit boundary document: %+v %v", changed, err)
		}
	})
}
func TestSettingsDocumentsNumericEnumRoundTrip(t *testing.T) {
	settingsDocumentTestDBs(t, func(t *testing.T, db *bun.DB) {
		_, svc := settingsDocumentAdapter(t, db)
		svc.RegisterDefinition(SettingDefinition{Key: "days", Type: "number", Default: 30, Enum: []any{14, 30}})
		target := SettingsDocumentTarget{Namespace: "review.enum", Scope: SettingsScopeSite}
		saved, err := svc.ApplyDocument(context.Background(), SettingsDocumentMutation{Target: target, Values: map[string]any{"days": 14}})
		if err != nil {
			t.Fatal(err)
		}
		_, err = svc.ApplyDocument(context.Background(), SettingsDocumentMutation{Target: target, ExpectedRevision: saved.Revision, Values: saved.Overrides})
		if err != nil {
			t.Errorf("returned value fails own enum validation: %v", err)
		}
	})
}
func TestSettingsInvalidJSONNumber(t *testing.T) {
	ctx := context.Background()
	invalid := []any{json.Number("bogus"), json.Number(""), json.Number("01"), json.Number("+1"), json.Number(" 1"), json.Number("1."), json.Number("1e"), json.Number("NaN"), json.Number("null"), math.NaN(), math.Inf(1), float32(math.Inf(-1))}
	check := func(t *testing.T, apply func(any) error, read func() (any, error)) {
		t.Helper()
		for _, value := range invalid {
			var fields SettingsValidationErrors
			err := apply(value)
			if !errors.As(err, &fields) || fields.Fields["days"] == "" {
				t.Fatalf("%v: expected field validation, got %v", value, err)
			}
			actual, readErr := read()
			if readErr != nil || (actual != 30 && actual != json.Number("30")) {
				t.Fatalf("invalid number mutated state: %v %v", actual, readErr)
			}
		}
	}
	for _, kind := range []string{"memory", "options"} {
		t.Run(kind, func(t *testing.T) {
			svc := NewSettingsService()
			if kind == "options" {
				svc.UseAdapter(NewGoOptionsSettingsAdapter())
			}
			svc.RegisterDefinition(SettingDefinition{Key: "days", Type: "number", Default: 30})
			check(t, func(value any) error { return svc.Apply(ctx, SettingsBundle{Values: map[string]any{"days": value}}) }, func() (any, error) { value, err := svc.ResolveContext(ctx, "days", ""); return value.Value, err })
		})
	}
	settingsDocumentTestDBs(t, func(t *testing.T, db *bun.DB) {
		adapter, svc := settingsDocumentAdapter(t, db)
		if err := ensureSettingsSchema(db); err != nil {
			t.Fatal(err)
		}
		check(t, func(value any) error {
			return adapter.Apply(ctx, SettingsBundle{Values: map[string]any{"days": value}})
		}, func() (any, error) { value, err := adapter.ResolveContext(ctx, "days", ""); return value.Value, err })
		target := SettingsDocumentTarget{Namespace: "review.invalid", Scope: SettingsScopeSite}
		check(t, func(value any) error {
			_, err := svc.ApplyDocument(ctx, SettingsDocumentMutation{Target: target, Values: map[string]any{"days": value}})
			return err
		}, func() (any, error) {
			value, err := svc.ReadDocument(ctx, target)
			return value.Values["days"].Value, err
		})
	})
}

func TestSettingsDocumentsCanonicalNumbersAndDefaults(t *testing.T) {
	settingsDocumentTestDBs(t, func(t *testing.T, db *bun.DB) {
		_, svc := settingsDocumentAdapter(t, db)
		ctx := context.Background()
		svc.RegisterDefinition(SettingDefinition{Key: "nested", Type: "object", Default: map[string]any{"amount": json.Number("1.2300e2")}})
		target := SettingsDocumentTarget{Namespace: "review.nested", Scope: SettingsScopeSite}
		original, err := svc.ReadDocument(ctx, target)
		if err != nil {
			t.Fatal(err)
		}
		svc.RegisterDefinition(SettingDefinition{Key: "nested", Type: "object", Default: map[string]any{"amount": json.Number("123.00")}})
		defaultReload, err := svc.ReadDocument(ctx, target)
		if err != nil || defaultReload.Identity != original.Identity {
			t.Fatalf("equivalent defaults changed identity: %v", err)
		}
		values := map[string]any{"nested": map[string]any{"list": []any{json.Number("-0.00e50"), json.Number("1.23400e-2"), json.Number("9007199254740993")}}}
		saved, err := svc.ApplyDocument(ctx, SettingsDocumentMutation{Target: target, Values: values})
		if err != nil {
			t.Fatal(err)
		}
		reload, err := svc.ReadDocument(ctx, target)
		if err != nil || reload.Identity != saved.Identity {
			t.Fatalf("nested identity changed: %v", err)
		}
		normalized := map[string]any{"nested": map[string]any{"list": []any{0, json.Number("0.0123400"), int64(9007199254740993)}}}
		again, err := svc.ApplyDocument(ctx, SettingsDocumentMutation{Target: target, ExpectedRevision: saved.Revision, Values: normalized})
		if err != nil || again.Revision != saved.Revision || len(again.ChangedKeys) != 0 || again.Identity != saved.Identity {
			t.Fatalf("equivalent nested numbers changed: %+v %v", again, err)
		}
		for _, literal := range []string{"1e1000000000", "1e-1000000000", "1e999999999999999999999999999999999"} {
			if _, applyErr := svc.ApplyDocument(ctx, SettingsDocumentMutation{Target: target, ExpectedRevision: saved.Revision, Values: map[string]any{"days": json.Number(literal)}}); applyErr == nil {
				t.Fatalf("accepted unbounded exponent %s", literal)
			}
		}
		after, err := svc.ReadDocument(ctx, target)
		if err != nil || after.Identity != saved.Identity {
			t.Fatalf("oversized exponent mutated document: %v", err)
		}
	})
}

func TestSettingsNumericOptionsExactEquality(t *testing.T) {
	for _, kind := range []string{"enum", "options", "provider"} {
		t.Run(kind, func(t *testing.T) {
			svc := NewSettingsService()
			def := SettingDefinition{Key: "days", Type: "number", Default: 30}
			values := []any{14, int64(9007199254740993), json.Number("0.01234"), float32(0.1)}
			options := make([]SettingOption, len(values))
			for i, value := range values {
				options[i] = SettingOption{Value: value}
			}
			switch kind {
			case "enum":
				def.Enum = values
			case "options":
				def.Options = options
			case "provider":
				def.OptionsProvider = func(context.Context) ([]SettingOption, error) { return options, nil }
			}
			svc.RegisterDefinition(def)
			for _, value := range []any{json.Number("14.000e0"), float64(14), json.Number("9007199254740993"), json.Number("1.234e-2"), float64(0.1)} {
				if err := svc.Apply(context.Background(), SettingsBundle{Values: map[string]any{"days": value}}); err != nil {
					t.Fatalf("rejected exact option %v: %v", value, err)
				}
			}
			for _, value := range []any{json.Number("9007199254740992"), float64(9007199254740993), json.Number("0.0123400000000000001"), "14"} {
				if err := svc.Apply(context.Background(), SettingsBundle{Values: map[string]any{"days": value}}); err == nil {
					t.Fatalf("accepted unequal option %v", value)
				}
			}
		})
	}
}

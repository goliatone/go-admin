package quickstart

import (
	"context"
	"encoding/json"
	"errors"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/admin"
	command "github.com/goliatone/go-command"
	"github.com/goliatone/go-export/export"
	"github.com/uptrace/bun"
)

func inventoryFixture(t *testing.T) *legacyFixture {
	t.Helper()
	f := newLegacyFixture(t)
	f.cfg.LegacyAdoption.Inventory = func(ctx context.Context, tx bun.Tx, a export.Actor, profile, after string, limit int) ([]string, error) {
		if !f.allowProfile || profile != "profile-v2" {
			return nil, durableExportDenied()
		}
		if err := f.principal(ctx, a); err != nil {
			return nil, err
		}
		var ids []string
		err := tx.NewSelect().Table("legacy_test_resources").Column("id").Where("actor_id=? AND namespace=?", a.ID, "Group A").Where("id>?", after).Order("id ASC").Limit(limit).Scan(ctx, &ids)
		return ids, err
	}
	f.h = f.newHost()
	return f
}
func inventoryQuery() LegacyExportInventoryQuery {
	return LegacyExportInventoryQuery{ProfileRef: "profile-v2", Limit: 2}
}
func inventoryUnchanged(t *testing.T, f *legacyFixture, before map[string]string) {
	t.Helper()
	after, err := adoptionRecoveryState(f.db)
	adoptionRecoveryMust(t, err)
	if !reflect.DeepEqual(before, after) {
		t.Fatal("inventory changed durable state")
	}
}
func inventoryFailure(t *testing.T, f *legacyFixture, q LegacyExportInventoryQuery) {
	t.Helper()
	result, err := f.h.InventoryLegacyExports(context.Background(), f.actor, q)
	if err == nil || !reflect.DeepEqual(result, LegacyExportInventoryResult{}) {
		t.Fatalf("failure returned partial inventory: %#v %v", result, err)
	}
}
func TestLegacyExportInventoryPaginationAndApply(t *testing.T) {
	f := inventoryFixture(t)
	for _, id := range []string{"a", "b", "c"} {
		f.record(id, export.StateQueued)
	}
	f.record("foreign", export.StateQueued)
	_, err := f.db.Exec("UPDATE legacy_test_resources SET actor_id='other' WHERE id='foreign'")
	adoptionRecoveryMust(t, err)
	before, err := adoptionRecoveryState(f.db)
	adoptionRecoveryMust(t, err)
	q := inventoryQuery()
	first, err := f.h.InventoryLegacyExports(context.Background(), f.actor, q)
	adoptionRecoveryMust(t, err)
	if len(first.Entries) != 2 || first.Entries[0].ExportID != "a" || first.Entries[1].ExportID != "b" || !first.HasMore || first.NextAfter != "b" {
		t.Fatalf("unexpected first page: %#v", first)
	}
	q.After = first.NextAfter
	last, err := f.h.InventoryLegacyExports(context.Background(), f.actor, q)
	adoptionRecoveryMust(t, err)
	if len(last.Entries) != 1 || last.Entries[0].ExportID != "c" || last.HasMore || last.NextAfter != "" {
		t.Fatalf("unexpected last page: %#v", last)
	}
	for _, entry := range first.Entries {
		if entry.Review == nil || entry.Blocker != "" || !validLegacyDigest(entry.Review.PlanSHA256) {
			t.Fatal(entry)
		}
	}
	raw, err := json.Marshal(first)
	adoptionRecoveryMust(t, err)
	for _, secret := range []string{"actor-a", "synthetic-credential", "receiver.invalid", "request_payload", "foreign"} {
		if strings.Contains(string(raw), secret) {
			t.Fatalf("inventory leaked %s", secret)
		}
	}
	inventoryUnchanged(t, f, before)
	f.noAdoption()
	review := first.Entries[0].Review
	request := LegacyExportAdoptionRequest{ExportID: review.ExportID, ProfileRef: review.ProfileRef, RecordSHA256: review.RecordSHA256, PlanSHA256: review.PlanSHA256}
	out := f.apply(request)
	if out.ExportID != "a" || f.accepts.Load() != 1 {
		t.Fatal(out)
	}
	replay := f.apply(request)
	if !replay.Replayed || f.accepts.Load() != 1 {
		t.Fatal("inventory adoption replay renewed authority")
	}
}
func TestLegacyExportInventoryBlockersAndCompleted(t *testing.T) {
	f := inventoryFixture(t)
	f.record("a-adopted", export.StateQueued)
	f.apply(f.review("a-adopted"))
	f.record("b-published", export.StateQueued)
	_, err := f.db.Exec("INSERT INTO export_webhook_completion_plans (export_id,namespace,owner,request,digest) SELECT ?,namespace,owner,request,digest FROM export_webhook_completion_plans WHERE export_id=?", "b-published", "a-adopted")
	adoptionRecoveryMust(t, err)
	f.record("c-running", export.StateRunning)
	f.record("d-completed", export.StateCompleted)
	before, err := adoptionRecoveryState(f.db)
	adoptionRecoveryMust(t, err)
	q := inventoryQuery()
	q.Limit = 100
	result, err := f.h.InventoryLegacyExports(context.Background(), f.actor, q)
	adoptionRecoveryMust(t, err)
	if len(result.Entries) != 4 {
		t.Fatal(result)
	}
	for i, want := range []string{"already_adopted", "notification_intent", "unsupported_state", ""} {
		entry := result.Entries[i]
		if entry.Blocker != want || (entry.Review != nil) != (want == "") {
			t.Fatalf("bad blocker: %#v", entry)
		}
	}
	inventoryUnchanged(t, f, before)
}
func TestLegacyExportInventoryPoliciesAndNoPartialResult(t *testing.T) {
	for _, fault := range []string{"profile", "revoked_actor", "foreign_owner", "lookahead_owner", "fence", "target", "record_guard", "missing_artifact", "rollback", "query_error", "missing_callback", "repeated_callback", "callback_not_called"} {
		t.Run(fault, func(t *testing.T) {
			f := inventoryFixture(t)
			f.record("a", export.StateQueued)
			f.record("b", export.StateCompleted)
			switch fault {
			case "profile":
				f.allowProfile = false
			case "revoked_actor":
				_, err := f.db.Exec("UPDATE legacy_test_principals SET enabled=0")
				adoptionRecoveryMust(t, err)
			case "foreign_owner", "lookahead_owner":
				f.cfg.LegacyAdoption.Inventory = func(context.Context, bun.Tx, export.Actor, string, string, int) ([]string, error) {
					return []string{"a", "b"}, nil
				}
				_, err := f.db.Exec("UPDATE legacy_test_resources SET actor_id='foreign' WHERE id='b'")
				adoptionRecoveryMust(t, err)
			case "fence":
				_, err := f.db.Exec("UPDATE legacy_test_resources SET maintenance=0 WHERE id='b'")
				adoptionRecoveryMust(t, err)
			case "target":
				f.allowTarget = false
			case "record_guard":
				f.cfg.LegacyAdoption.Authorize = func(context.Context, bun.Tx, export.Actor, string, string) error { return nil }
				_, err := f.db.Exec("UPDATE legacy_test_resources SET actor_id='foreign' WHERE id='b'")
				adoptionRecoveryMust(t, err)
				f.cfg.LegacyAdoption.Inventory = func(context.Context, bun.Tx, export.Actor, string, string, int) ([]string, error) {
					return []string{"a", "b"}, nil
				}
			case "missing_artifact":
				_, err := f.db.Exec("UPDATE export_records SET artifact_key='' WHERE id='b'")
				adoptionRecoveryMust(t, err)
			case "rollback":
				f.rollback = true
			case "query_error":
				f.cfg.LegacyAdoption.Inventory = func(context.Context, bun.Tx, export.Actor, string, string, int) ([]string, error) {
					return nil, errors.New("source unavailable")
				}
			case "missing_callback":
				f.cfg.LegacyAdoption.Inventory = nil
			case "repeated_callback":
				original := f.cfg.WithTransaction
				f.cfg.WithTransaction = func(ctx context.Context, a export.Actor, fn func(context.Context, bun.Tx) error) error {
					return original(ctx, a, func(ctx context.Context, tx bun.Tx) error {
						if err := fn(ctx, tx); err != nil {
							return err
						}
						return fn(ctx, tx)
					})
				}
			case "callback_not_called":
				f.cfg.WithTransaction = func(context.Context, export.Actor, func(context.Context, bun.Tx) error) error { return nil }
			}
			f.h = f.newHost()
			before, err := adoptionRecoveryState(f.db)
			adoptionRecoveryMust(t, err)
			q := inventoryQuery()
			if fault == "lookahead_owner" {
				q.Limit = 1
			}
			inventoryFailure(t, f, q)
			inventoryUnchanged(t, f, before)
			f.noAdoption()
		})
	}
}
func TestLegacyExportInventoryRejectsMalformedSourcePage(t *testing.T) {
	for _, test := range []struct {
		name string
		ids  []string
	}{
		{"descending", []string{"b", "a"}}, {"duplicate", []string{"a", "a"}}, {"empty", []string{""}}, {"oversized", []string{"a", "b", "c", "d"}},
	} {
		t.Run(test.name, func(t *testing.T) {
			f := inventoryFixture(t)
			calls := 0
			f.cfg.LegacyAdoption.Authorize = func(context.Context, bun.Tx, export.Actor, string, string) error { calls++; return nil }
			f.cfg.LegacyAdoption.Inventory = func(context.Context, bun.Tx, export.Actor, string, string, int) ([]string, error) {
				return test.ids, nil
			}
			f.h = f.newHost()
			inventoryFailure(t, f, inventoryQuery())
			if calls != 0 {
				t.Fatal("malformed page reached record policy")
			}
			f.noAdoption()
		})
	}
	f := inventoryFixture(t)
	f.cfg.LegacyAdoption.Inventory = func(context.Context, bun.Tx, export.Actor, string, string, int) ([]string, error) {
		return []string{"a"}, nil
	}
	f.h = f.newHost()
	q := inventoryQuery()
	q.After = "a"
	inventoryFailure(t, f, q)
}
func TestLegacyExportInventoryCommandAndGate(t *testing.T) {
	f := inventoryFixture(t)
	f.record("a", export.StateQueued)
	handler := &InventoryLegacyExportsHandler{Service: f.h}
	bus := admin.NewCommandBus(true)
	_, err := admin.RegisterCommand(bus, handler)
	adoptionRecoveryMust(t, err)
	collector := command.NewResult[LegacyExportInventoryResult]()
	ctx := command.ContextWithResult(context.Background(), collector)
	message := InventoryLegacyExports{Actor: f.actor, Query: inventoryQuery()}
	adoptionRecoveryMust(t, handler.Execute(ctx, message))
	result, ok := collector.Load()
	if !ok || len(result.Entries) != 1 {
		t.Fatal(result, ok)
	}
	raw, err := json.Marshal(message)
	adoptionRecoveryMust(t, err)
	if strings.Contains(string(raw), f.actor.ID) {
		t.Fatal("serialized trusted actor")
	}
	for _, q := range []LegacyExportInventoryQuery{{ProfileRef: "profile-v2", Limit: 0}, {ProfileRef: "profile-v2", Limit: 101}, {ProfileRef: " bad", Limit: 2}, {ProfileRef: "profile-v2", After: " ", Limit: 2}} {
		inventoryFailure(t, f, q)
	}
	message.Actor = export.Actor{}
	if _, err := handler.Run(ctx, message); err == nil {
		t.Fatal("untrusted command accepted")
	}
	var nilHandler *InventoryLegacyExportsHandler
	if _, err := nilHandler.Run(ctx, InventoryLegacyExports{Actor: f.actor, Query: inventoryQuery()}); err == nil {
		t.Fatal("nil handler accepted")
	}
	g := gateEnableFixture(t, f, gatePolicy())
	inventoryFailure(t, f, inventoryQuery())
	gateResume(t, g)
	entered, release := make(chan struct{}), make(chan struct{})
	original := f.cfg.LegacyAdoption.Inventory
	f.cfg.LegacyAdoption.Inventory = func(ctx context.Context, tx bun.Tx, a export.Actor, p, after string, limit int) ([]string, error) {
		close(entered)
		<-release
		return original(ctx, tx, a, p, after, limit)
	}
	f.h = f.newHost()
	done := make(chan error, 1)
	go func() {
		_, err := f.h.InventoryLegacyExports(context.Background(), f.actor, inventoryQuery())
		done <- err
	}()
	<-entered
	deadline, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()
	if err := g.Seal(deadline, gateActor); !errors.Is(err, context.DeadlineExceeded) || !g.State().Sealed {
		t.Fatal("inventory escaped drain", err)
	}
	close(release)
	adoptionRecoveryMust(t, <-done)
	adoptionRecoveryMust(t, g.Seal(context.Background(), gateActor))
	f.noAdoption()
}

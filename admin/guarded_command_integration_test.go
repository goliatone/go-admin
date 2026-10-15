package admin

import (
	"context"
	"database/sql"
	"errors"
	"testing"

	auth "github.com/goliatone/go-auth"
	"github.com/goliatone/go-command"
	cmdrpc "github.com/goliatone/go-command/rpc"
)

// These are synthetic host entities/policy, not go-admin or go-users Group APIs.
// Group selection is trusted context; request GroupID is only a consistency check.
type guardedGroupKey struct{}
type guardedResourceCommand struct{ ResourceID, GroupID string }

func (guardedResourceCommand) Type() string { return "resources.operate" }

type guardedResourceService struct{ db *sql.DB }

func (s guardedResourceService) check(ctx context.Context, msg guardedResourceCommand) error {
	actor, ok := auth.ActorFromContext(ctx)
	group, _ := ctx.Value(guardedGroupKey{}).(string)
	if !ok || actor.ActorID == "" || group == "" || group != msg.GroupID {
		return ErrForbidden
	}
	var allowed bool
	err := s.db.QueryRowContext(ctx, `SELECT EXISTS (
  SELECT 1 FROM guarded_resources r JOIN guarded_grants g ON g.group_id = r.group_id
  WHERE r.id = ? AND r.group_id = ? AND g.user_id = ? AND g.permission = 'resources.operate'
 )`, msg.ResourceID, group, actor.ActorID).Scan(&allowed)
	if err != nil {
		return err
	}
	if !allowed {
		return ErrForbidden
	}
	return nil
}
func (s guardedResourceService) operate(ctx context.Context, msg guardedResourceCommand) error {
	if err := s.check(ctx, msg); err != nil {
		return err
	}
	_, err := s.db.ExecContext(ctx, "UPDATE guarded_resources SET operations = operations + 1 WHERE id = ? AND group_id = ?", msg.ResourceID, msg.GroupID)
	return err
}

type guardedResourceHandler struct{ service guardedResourceService }

func (h guardedResourceHandler) Execute(ctx context.Context, msg guardedResourceCommand) error {
	return h.service.operate(ctx, msg)
}

func TestGuardedCommandHostBoundaries(t *testing.T) {
	for _, route := range []string{"rpc", "bus", "service"} {
		t.Run(route, func(t *testing.T) {
			for _, scenario := range []string{"authorized", "group B authorized", "unauthenticated", "missing scope", "missing grant", "cross group resource", "forged group", "revoked grant", "reassigned resource", "hook denial"} {
				if scenario == "hook denial" && route != "rpc" {
					continue
				}
				t.Run(scenario, func(t *testing.T) {
					db := setupTestBunDB(t)
					defer mustClose(t, "db", db)
					_, err := db.Exec(`CREATE TABLE guarded_resources (id TEXT PRIMARY KEY, group_id TEXT, operations INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE guarded_grants (user_id TEXT, group_id TEXT, permission TEXT);
    INSERT INTO guarded_resources(id,group_id) VALUES ('resource-a','group-a'),('resource-b','group-b');
    INSERT INTO guarded_grants VALUES ('user-a','group-a','resources.operate'),('user-b','group-b','resources.operate');`)
					if err != nil {
						t.Fatal(err)
					}
					service := guardedResourceService{db.DB}
					hookCalls := 0
					adm := mustNewAdmin(t, Config{Commands: CommandConfig{RPC: RPCCommandConfig{
						PermissionMode: RPCCommandPermissionModeExact,
						Commands:       map[string]RPCCommandRule{"resources.operate": {Permission: "resources.operate", Resource: "resources"}},
					}}}, Dependencies{
						FeatureGate: featureGateFromKeys(FeatureCommands),
						Authorizer:  rpcExactPermissionAuthorizer{permissions: []string{"admin.commands.dispatch", "resources.operate"}},
						RPCCommandPolicyHook: func(ctx context.Context, input RPCCommandPolicyInput) error {
							hookCalls++
							if input.ActorID == "" {
								t.Fatal("hook missing trusted actor")
							}
							if scenario == "hook denial" {
								return ErrForbidden
							}
							resource, _ := input.Payload["resource_id"].(string)
							group, _ := input.Payload["group_id"].(string)
							return service.check(ctx, guardedResourceCommand{resource, group})
						},
					})
					bus := adm.Commands()
					t.Cleanup(bus.Reset)
					if _, err := RegisterCommand(bus, guardedResourceHandler{service}); err != nil {
						t.Fatal(err)
					}
					if err := RegisterMessageFactory(bus, "resources.operate", func(payload map[string]any, _ []string) (guardedResourceCommand, error) {
						resource, _ := payload["resource_id"].(string)
						group, _ := payload["group_id"].(string)
						return guardedResourceCommand{resource, group}, nil
					}); err != nil {
						t.Fatal(err)
					}
					ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: "user-a", Subject: "user-a"})
					ctx = context.WithValue(ctx, guardedGroupKey{}, "group-a")
					msg := guardedResourceCommand{"resource-a", "group-a"}
					allowed := scenario == "authorized" || scenario == "group B authorized"
					switch scenario {
					case "group B authorized":
						ctx = auth.WithActorContext(ctx, &auth.ActorContext{ActorID: "user-b", Subject: "user-b"})
						ctx = context.WithValue(ctx, guardedGroupKey{}, "group-b")
						msg = guardedResourceCommand{"resource-b", "group-b"}
					case "unauthenticated":
						ctx = context.WithValue(context.Background(), guardedGroupKey{}, "group-a")
					case "missing scope":
						ctx = context.WithValue(ctx, guardedGroupKey{}, "")
					case "missing grant":
						ctx = auth.WithActorContext(ctx, &auth.ActorContext{ActorID: "user-b", Subject: "user-b"})
					case "cross group resource":
						msg.ResourceID = "resource-b"
					case "forged group":
						msg.GroupID = "group-b"
					case "revoked grant":
						_, err = db.Exec("DELETE FROM guarded_grants WHERE user_id = 'user-a'")
					case "reassigned resource":
						_, err = db.Exec("UPDATE guarded_resources SET group_id = 'group-b' WHERE id = 'resource-a'")
					}
					if err != nil {
						t.Fatal(err)
					}
					switch route {
					case "service":
						err = service.operate(ctx, msg)
					case "bus":
						err = bus.DispatchByName(ctx, "resources.operate", map[string]any{"resource_id": msg.ResourceID, "group_id": msg.GroupID}, nil)
					case "rpc":
						_, err = adm.RPCServer().Invoke(ctx, RPCMethodCommandDispatch, &cmdrpc.RequestEnvelope[RPCCommandDispatchRequest]{Data: RPCCommandDispatchRequest{Name: "resources.operate", Payload: map[string]any{"resource_id": msg.ResourceID, "group_id": msg.GroupID}}})
					}
					if (err == nil) != allowed {
						t.Fatalf("allowed=%v err=%v", allowed, err)
					}
					if !allowed && !errors.Is(err, ErrForbidden) {
						t.Fatalf("want policy denial, got %v", err)
					}
					var operations int
					if err := db.QueryRow("SELECT sum(operations) FROM guarded_resources").Scan(&operations); err != nil {
						t.Fatal(err)
					}
					want := 0
					if allowed {
						want = 1
					}
					if operations != want {
						t.Fatalf("operations=%d want=%d", operations, want)
					}
					if route == "rpc" && scenario != "unauthenticated" && hookCalls != 1 {
						t.Fatalf("hook calls=%d", hookCalls)
					}
				})
			}
		})
	}
}

func TestCommandBusRequiresHostAuthorizationAndReplayPolicy(t *testing.T) {
	bus := NewCommandBus(true)
	t.Cleanup(bus.Reset)
	calls := 0
	if _, err := RegisterCommand(bus, command.CommandFunc[guardedResourceCommand](func(context.Context, guardedResourceCommand) error { calls++; return nil })); err != nil {
		t.Fatal(err)
	}
	if err := RegisterMessageFactory(bus, "resources.operate", func(map[string]any, []string) (guardedResourceCommand, error) { return guardedResourceCommand{}, nil }); err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 2; i++ {
		if _, err := bus.DispatchByNameWithOptions(context.Background(), "resources.operate", nil, nil,
			command.DispatchOptions{Mode: command.ExecutionModeInline, IdempotencyKey: "same-operation"}); err != nil {
			t.Fatal(err)
		}
	}
	if calls != 2 {
		t.Fatalf("raw dispatch calls=%d; host authorization and replay prevention must be supplied by the host", calls)
	}
}

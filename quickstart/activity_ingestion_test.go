package quickstart

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"io/fs"
	"math/big"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/admin"
	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
	urlkit "github.com/goliatone/go-urlkit"
	users "github.com/goliatone/go-users"
	usersactivity "github.com/goliatone/go-users/activity"
	"github.com/google/uuid"
	_ "github.com/lib/pq"
	_ "github.com/mattn/go-sqlite3"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
	"github.com/uptrace/bun/dialect/sqlitedialect"
)

type ingestionHostReaderAuth struct{}

func (ingestionHostReaderAuth) Wrap(c router.Context) error {
	if actor, ok := auth.ActorFromContext(c.Context()); !ok || actor == nil {
		return admin.ErrActivityIngestionUnauthenticated
	}
	return nil
}

type ingestionHostAuthority struct {
	principal admin.ActivityProducerPrincipal
	scope     admin.ScopeInput
	revoked   bool
}

func (a *ingestionHostAuthority) VerifyActivityProducer(_ context.Context, c admin.ActivityProducerCredential) (admin.ActivityProducerPrincipal, error) {
	if c.Bearer != "test-producer" {
		return admin.ActivityProducerPrincipal{}, admin.ErrActivityIngestionUnauthenticated
	}
	return a.principal, nil
}
func (a *ingestionHostAuthority) CheckActivityProducer(_ context.Context, p admin.ActivityProducerPrincipal, e admin.ActivityIngestionEvent) error {
	if a.revoked || p.CredentialID != a.principal.CredentialID || e.Channel != "billing" || e.Action != "invoice.approved" || e.Object.Type != "invoice" {
		return admin.ErrActivityIngestionForbidden
	}
	return nil
}
func (a *ingestionHostAuthority) AuthorizeActivityIngestion(_ context.Context, in admin.ActivityIngestionAuthorization) (admin.ActivityIngestionDecision, error) {
	return admin.ActivityIngestionDecision{Allowed: in.Event.Scope == a.scope, AllowProducerAttestation: true}, nil
}

func TestActivityIngestionHost(t *testing.T) {
	for _, postgres := range []bool{false, true} {
		name := "sqlite"
		if postgres {
			name = "postgres"
		}
		t.Run(name, func(t *testing.T) {
			ctx := context.Background()
			open := ingestionHostDatabase(t, postgres)
			db := open()
			prefix := "data/sql/migrations/"
			if !postgres {
				prefix += "sqlite/"
			}
			for _, migration := range []string{"00004_user_activity.up.sql", "00011_activity_scopes.tx.up.sql"} {
				raw, err := fs.ReadFile(users.GetMigrationsFS(), prefix+migration)
				if err != nil {
					t.Fatal(err)
				}
				if _, err := db.ExecContext(ctx, string(raw)); err != nil {
					t.Fatal(err)
				}
			}
			if err := admin.EnsureActivityIngestionSchema(ctx, db); err != nil {
				t.Fatal(err)
			}
			scope := admin.ScopeInput{TenantID: uuid.NewString(), OrgID: uuid.NewString()}
			actorID := uuid.NewString()
			authority := &ingestionHostAuthority{scope: scope, principal: admin.ActivityProducerPrincipal{ProducerID: "billing", CredentialID: "key-1", Issuer: "host", Audience: "activity", Purpose: admin.ActivityIngestionPurpose, NotBefore: time.Now().Add(-time.Hour), ExpiresAt: time.Now().Add(time.Hour)}}
			cfg := NewAdminConfig("/console", "Activity", "en", WithScopeMode(ScopeModeSingle), WithDefaultScope(scope.TenantID, scope.OrgID))
			// All missing route keys are backfilled without replacing this override.
			cfg.URLs.URLKit = &urlkit.Config{Groups: []urlkit.GroupConfig{{Name: "admin", Groups: []urlkit.GroupConfig{{Name: "api", Routes: map[string]string{admin.ActivityIngestionRouteKey: "/internal/events"}}}}}}
			start := func(db *bun.DB) (*admin.Admin, http.Handler) {
				t.Helper()
				// Each start models a new process, including the global command registry.
				resetCommandRegistryForTest(t)
				t.Cleanup(func() { resetCommandRegistryForTest(t) })
				adm, _, err := NewAdmin(cfg, AdapterHooks{}, WithAdapterFlags(AdapterFlags{}), WithFeatureSet(map[string]bool{"commands": true, "activity": true, "dashboard": true}), WithAdminDependencies(admin.Dependencies{Authenticator: ingestionHostReaderAuth{}, Authorizer: preferencesAPIHelperAuthorizer{admin.PermAdminActivityView: true}}))
				if err != nil {
					t.Fatal(err)
				}
				t.Cleanup(adm.Commands().Close)
				_, err = ConfigureActivityIngestion(ctx, adm, admin.ActivityIngestionOptions{Enabled: true, DB: db, Verifier: authority, Policy: authority, Issuer: "host", Audience: "activity", ReadPolicy: usersactivity.NewDefaultAccessPolicy(usersactivity.WithPolicyFilterOptions(usersactivity.WithMachineActivityEnabled(true))), Disclose: func(_ context.Context, e admin.ActivityIngestionEvent) (json.RawMessage, error) {
					return e.Metadata, nil
				}})
				if err != nil {
					t.Fatal(err)
				}
				server := router.NewHTTPServer()
				if err := adm.Initialize(server.Router()); err != nil {
					t.Fatal(err)
				}
				if err := RegisterActivityIngestionRoutes(ctx, server.Router(), adm); err != nil {
					t.Fatal(err)
				}
				if endpoint, err := adm.ActivityIngestionURL(); err != nil || endpoint != "/internal/events" {
					t.Fatal(endpoint, err)
				}
				return adm, server.WrappedRouter()
			}
			adm, handler := start(db)
			event := admin.ActivityIngestionEvent{SchemaVersion: 1, EventID: "stable-1", OccurredAt: time.Now().UTC().Truncate(time.Microsecond), Actor: admin.ActivityIngestionActor{Kind: "system"}, SubjectUserID: actorID, Action: "invoice.approved", Object: admin.ActivityIngestionObject{Type: "invoice", ID: "INV-42"}, Channel: "billing", Metadata: json.RawMessage(`{"large":9007199254740993,"huge":1e309}`)}
			post := func(e admin.ActivityIngestionEvent, status int) admin.ActivityIngestResult {
				t.Helper()
				raw, err := json.Marshal(e)
				if err != nil {
					t.Fatal(err)
				}
				req := httptest.NewRequestWithContext(t.Context(), "POST", "/internal/events", bytes.NewReader(raw))
				req.Header.Set("Authorization", "Bearer test-producer")
				req.Header.Set("Content-Type", "application/json")
				rr := httptest.NewRecorder()
				handler.ServeHTTP(rr, req)
				if rr.Code != status || rr.Header().Get("Cache-Control") != "no-store" {
					t.Fatal(rr.Code, rr.Body.String())
				}
				var result admin.ActivityIngestResult
				if status < 300 {
					if err := json.Unmarshal(rr.Body.Bytes(), &result); err != nil {
						t.Fatal(err)
					}
				}
				return result
			}
			first := post(event, 201)
			if first.Scope != scope || first.Replayed || first.ActivityID == uuid.Nil {
				t.Fatal("shared scope/commit", first)
			}
			checkReplay := func() {
				t.Helper()
				replay := post(event, 200)
				if !replay.Replayed || replay.ActivityID != first.ActivityID || !replay.ReceivedAt.Equal(first.ReceivedAt) || replay.Scope != first.Scope {
					t.Fatal("unstable replay", replay)
				}
			}
			checkReplay()
			changed := event
			changed.Object.ID = "INV-43"
			post(changed, 409)
			authority.revoked = true
			post(event, 403)
			authority.revoked = false
			reader := auth.WithActorContext(ctx, &auth.ActorContext{ActorID: actorID, Role: "admin", TenantID: scope.TenantID, OrganizationID: scope.OrgID})
			checkEntries := func(entries []admin.ActivityEntry) {
				t.Helper()
				if len(entries) != 1 || entries[0].Actor != "System" || entries[0].Metadata["large"] != json.Number("9007199254740993") {
					t.Fatal("machine identity/exact readback", entries)
				}
				n, ok := entries[0].Metadata["huge"].(json.Number)
				if !ok {
					t.Fatalf("number lost: %T", entries[0].Metadata["huge"])
				}
				got, ok := new(big.Rat).SetString(n.String())
				want, _ := new(big.Rat).SetString("1e309")
				if !ok || got.Cmp(want) != 0 {
					t.Fatal("number changed", n)
				}
			}
			request := httptest.NewRequestWithContext(reader, "GET", "/console/api/activity", nil)
			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, request)
			var response struct {
				Entries []admin.ActivityReadEntry `json:"entries"`
			}
			dec := json.NewDecoder(rr.Body)
			dec.UseNumber()
			if err := dec.Decode(&response); err != nil || rr.Code != 200 || len(response.Entries) != 1 {
				t.Fatal("API read", rr.Code, response, err)
			}
			if response.Entries[0].ActorHref != "" {
				t.Fatal("machine linked to subject")
			}
			checkEntries([]admin.ActivityEntry{response.Entries[0].ActivityEntry})
			found := false
			for _, provider := range adm.Dashboard().Providers() {
				if provider.Code == admin.WidgetActivityFeed {
					found = true
					payload, err := provider.Handler(admin.AdminContext{Context: reader}, nil)
					if err != nil {
						t.Fatal(err)
					}
					activity, ok := payload.Value().(admin.ActivityFeedWidgetPayload)
					if !ok {
						t.Fatalf("expected activity widget payload, got %T", payload.Value())
					}
					checkEntries(activity.Entries)
				}
			}
			if !found {
				t.Fatal("missing widget")
			}
			adm.Commands().Close()
			if err := db.Close(); err != nil {
				t.Fatal(err)
			}
			_, handler = start(open())
			checkReplay()
		})
	}
}

func ingestionHostDatabase(t *testing.T, postgres bool) func() *bun.DB {
	t.Helper()
	driver := "sqlite3"
	dsn := "file:" + filepath.Join(t.TempDir(), "host.db") + "?_busy_timeout=5000&_journal_mode=WAL"
	if postgres {
		driver = "postgres"
		dsn = os.Getenv("GO_ADMIN_TEST_POSTGRES_DSN")
		if dsn == "" {
			t.Skip("set GO_ADMIN_TEST_POSTGRES_DSN to a disposable PostgreSQL database")
		}
		base, err := sql.Open(driver, dsn)
		if err != nil {
			t.Fatal(err)
		}
		schema := "ingestion_host_" + strings.ReplaceAll(uuid.NewString(), "-", "")
		if _, err = base.ExecContext(t.Context(), `CREATE SCHEMA "`+schema+`"`); err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() {
			// Test contexts are canceled before cleanup; bound this cleanup separately.
			cleanupCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			if _, cleanupErr := base.ExecContext(cleanupCtx, `DROP SCHEMA "`+schema+`" CASCADE`); cleanupErr != nil {
				t.Errorf("drop ingestion host schema: %v", cleanupErr)
			}
			if closeErr := base.Close(); closeErr != nil {
				t.Errorf("close ingestion host schema connection: %v", closeErr)
			}
		})
		u, err := url.Parse(dsn)
		if err != nil {
			t.Fatal(err)
		}
		q := u.Query()
		q.Set("search_path", schema)
		u.RawQuery = q.Encode()
		dsn = u.String()
	}
	return func() *bun.DB {
		raw, err := sql.Open(driver, dsn)
		if err != nil {
			t.Fatal(err)
		}
		var db *bun.DB
		if postgres {
			db = bun.NewDB(raw, pgdialect.New())
		} else {
			db = bun.NewDB(raw, sqlitedialect.New())
		}
		t.Cleanup(func() {
			if err := db.Close(); err != nil {
				t.Errorf("close ingestion host database: %v", err)
			}
		})
		return db
	}
}

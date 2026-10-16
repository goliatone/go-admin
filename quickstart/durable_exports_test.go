package quickstart

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-export/export"
	job "github.com/goliatone/go-job"
	"github.com/uptrace/bun"
)

func durableTestConfig(t *testing.T) DurableExportHostConfig {
	return DurableExportHostConfig{DB: newScopeDriftDoctorBunDB(t), ArtifactRoot: t.TempDir(), Guard: durableTestGuard{}, ActorProvider: durableTestActor{}, Namespace: func(context.Context, export.Actor) (string, error) { return "scope", nil }, WithTransaction: func(context.Context, export.Actor, func(context.Context, bun.Tx) error) error {
		return durableExportDenied()
	}, AuthorizeRecordTransaction: func(context.Context, bun.Tx, export.Actor, string) error { return durableExportDenied() }, AcceptBackground: func(context.Context, bun.Tx, export.Actor, export.ExportRecord) error { return durableExportDenied() }, ResolveBackground: func(ctx context.Context, _ ExportBackgroundWork) (context.Context, export.Actor, error) {
		return ctx, export.Actor{}, nil
	}}
}

type durableTestActor struct{}

func (durableTestActor) FromContext(context.Context) (export.Actor, error) {
	return export.Actor{}, durableExportDenied()
}

func TestDurableExportHostFailsClosed(t *testing.T) {
	cfg := durableTestConfig(t)
	for name, change := range map[string]func(*DurableExportHostConfig){"missing-delegation-acceptance": func(c *DurableExportHostConfig) { c.AcceptBackground = nil }, "missing-background-resolver": func(c *DurableExportHostConfig) { c.ResolveBackground = nil }, "missing-transaction": func(c *DurableExportHostConfig) { c.WithTransaction = nil }, "missing-record-policy": func(c *DurableExportHostConfig) { c.AuthorizeRecordTransaction = nil }, "unobserved-poller": func(c *DurableExportHostConfig) {
		c.RecurringNamespaces = func(context.Context) ([]string, error) { return nil, nil }
	}, "unbounded-batch": func(c *DurableExportHostConfig) { c.OccurrenceBatch = 1001 }} {
		t.Run(name, func(t *testing.T) {
			c := cfg
			change(&c)
			if _, err := NewDurableExportHost(c); err == nil {
				t.Fatal("unsafe configuration accepted")
			}
		})
	}
	h, err := NewDurableExportHost(cfg)
	if err != nil {
		t.Fatal(err)
	}
	if err = h.Migrate(context.Background()); err == nil {
		t.Fatal("missing native tracker migration accepted")
	}
	if err = h.CheckReady(context.Background()); err == nil {
		t.Fatal("missing schema reported ready")
	}
	r := &recordingRouter{}
	if err = h.Bundle.Registrar.RegisterExportRoutes(r, admin.ExportRouteOptions{}); err == nil || len(r.routes) != 0 {
		t.Fatal("unguarded routes mounted")
	}
	if _, _, err = h.background(context.Background(), ExportBackgroundWork{Kind: ExportBackgroundGenerate, ExportID: "e"}); err == nil {
		t.Fatal("empty background actor accepted")
	}
	if err = h.ExecuteMessage(context.Background(), &job.ExecutionMessage{JobID: "unknown"}); err == nil {
		t.Fatal("unknown task accepted")
	}
	if err = h.Run(nil); err == nil { //nolint:staticcheck // Verify rejection of an invalid nil lifecycle context.
		t.Fatal("missing lifetime accepted")
	}
}

func TestExportBundleConfiguredRunnerPreservesRegistries(t *testing.T) {
	runner := export.NewRunner()
	bundle := NewExportBundle(WithExportRunner(runner))
	if bundle.Runner != runner {
		t.Fatal("configured runner discarded")
	}
	WithExportRunner(runner)(nil)
}

type durableTestGuard struct{}

func (durableTestGuard) AuthorizeExport(context.Context, export.Actor, export.ExportRequest, export.ResolvedDefinition) error {
	return durableExportDenied()
}
func (durableTestGuard) AuthorizeDownload(context.Context, export.Actor, string) error {
	return durableExportDenied()
}

package quickstart

import (
	"context"
	"path/filepath"
	"strings"
	"time"

	"github.com/goliatone/go-admin/admin"
	delivery "github.com/goliatone/go-export/adapters/delivery"
	deliverybun "github.com/goliatone/go-export/adapters/delivery/bun"
	"github.com/goliatone/go-export/adapters/exportapi"
	jobbun "github.com/goliatone/go-export/adapters/job/bun"
	replaybun "github.com/goliatone/go-export/adapters/replay/bun"
	storefs "github.com/goliatone/go-export/adapters/store/fs"
	trackerbun "github.com/goliatone/go-export/adapters/tracker/bun"
	"github.com/goliatone/go-export/export"
	job "github.com/goliatone/go-job"
	"github.com/goliatone/go-job/queue/adapters/postgres"
	"github.com/goliatone/go-job/queue/worker"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect"
)

// ExportBackgroundWork contains identifiers to resolve through current host
// policy. Message actor/role/session fields are deliberately absent.
type ExportBackgroundWork struct {
	Kind       string
	ExportID   string
	Namespace  string
	ScheduleID string
}

const (
	ExportBackgroundGenerate = "generate"
	ExportBackgroundWebhook  = "webhook"
	ExportBackgroundSchedule = "schedule"
)

// DurableExportWebhookConfig enables immutable completion plans and receipts.
// Target policy and links must be current host policy, not request-supplied URLs.
type DurableExportWebhookConfig struct {
	Sender          delivery.ReceiptWebhookSender
	Select          func(context.Context, export.Actor, export.ExportRecord) (deliverybun.ScheduleRequest, error)
	AuthorizeTarget func(context.Context, export.Actor, string, deliverybun.Target) error
	Link            func(export.ExportRecord) (string, error)
}

// DurableExportHostConfig supplies application-owned authorization. Transaction
// callbacks must use the supplied transaction for all guards and row sources.
// ResolveBackground authenticates a current durable delegation independently of
// browser credentials. AcceptBackground explicitly authorizes/persists that
// delegation with each new export; errors roll back all acceptance writes.
type DurableExportHostConfig struct {
	LegacyAdoption             *LegacyExportAdoptionConfig
	DB                         *bun.DB
	ArtifactRoot               string
	Guard                      export.Guard
	ActorProvider              export.ActorProvider
	Namespace                  func(context.Context, export.Actor) (string, error)
	WithTransaction            func(context.Context, export.Actor, func(context.Context, bun.Tx) error) error
	AuthorizeRecordTransaction func(context.Context, bun.Tx, export.Actor, string) error
	AcceptBackground           func(context.Context, bun.Tx, export.Actor, export.ExportRecord) error
	ResolveBackground          func(context.Context, ExportBackgroundWork) (context.Context, export.Actor, error)
	Webhooks                   *DurableExportWebhookConfig
	// RecurringNamespaces is a trusted operator catalog. A nil catalog disables
	// automatic polling; explicit TickSchedule remains available.
	RecurringNamespaces func(context.Context) ([]string, error)
	OnPollError         func(error)
	PollInterval        time.Duration
	ScheduleBatch       int
	OccurrenceBatch     int
	WorkerConcurrency   int
	RetryPolicy         worker.RetryPolicy
	Now                 func() time.Time
}

// DurableExportHost is a normal export bundle backed by the native durable
// services. Register Bundle's dependencies through the existing admin bootstrap.
// Call Migrate after the host's native export tracker migration, then Run under
// the application's lifecycle context. The host retains database ownership.
type DurableExportHost struct {
	export.Service
	Bundle    *ExportBundle
	Queue     *postgres.Storage
	Recurring *postgres.RecurringScheduler
	Worker    *worker.Worker
	Webhooks  *deliverybun.Service
	Tracker   *trackerbun.Tracker
	cfg       DurableExportHostConfig
	replay    replaybun.Config
	tasks     map[string]job.Task
}

type durableExportOwner struct {
	bun.BaseModel `bun:"table:admin_export_host_owners"`
	ExportID      string `bun:",pk"`
	Namespace     string `bun:",notnull"`
	ActorID       string `bun:",notnull"`
	TenantID      string `bun:",notnull"`
	WorkspaceID   string `bun:",notnull"`
}

func durableExportInvalid(message string) error {
	return export.NewError(export.KindValidation, message, nil)
}
func durableExportDenied() error {
	return export.NewError(export.KindAuthz, "export background authority unavailable", nil)
}

func NewDurableExportHost(cfg DurableExportHostConfig, opts ...ExportBundleOption) (*DurableExportHost, error) {
	if cfg.DB == nil || strings.TrimSpace(cfg.ArtifactRoot) == "" || cfg.Guard == nil || cfg.ActorProvider == nil || cfg.Namespace == nil || cfg.WithTransaction == nil || cfg.AuthorizeRecordTransaction == nil || cfg.AcceptBackground == nil || cfg.ResolveBackground == nil {
		return nil, durableExportInvalid("durable exports require database, artifact root, guards, transaction and explicit background policies")
	}
	if cfg.PollInterval < 0 || cfg.ScheduleBatch < 0 || cfg.ScheduleBatch > 1000 || cfg.OccurrenceBatch < 0 || cfg.OccurrenceBatch > 1000 || cfg.WorkerConcurrency < 0 {
		return nil, durableExportInvalid("invalid durable export runtime bounds")
	}
	if cfg.RecurringNamespaces != nil && cfg.OnPollError == nil {
		return nil, durableExportInvalid("recurring polling requires an error observer")
	}
	if cfg.DB.Dialect().Name() != dialect.PG && cfg.DB.Dialect().Name() != dialect.SQLite {
		return nil, durableExportInvalid("durable exports require PostgreSQL or SQLite")
	}
	if cfg.Webhooks != nil {
		copy := *cfg.Webhooks
		cfg.Webhooks = &copy
		if copy.Sender == nil || copy.Select == nil || copy.AuthorizeTarget == nil || copy.Link == nil {
			return nil, durableExportInvalid("durable webhooks require sender, plan and destination/link policies")
		}
	}
	if cfg.LegacyAdoption != nil {
		copy := *cfg.LegacyAdoption
		cfg.LegacyAdoption = &copy
		if copy.Authorize == nil || copy.Select == nil || cfg.Webhooks == nil {
			return nil, durableExportInvalid("legacy adoption requires explicit authorization, versioned profiles and webhooks")
		}
	}
	root, err := filepath.Abs(cfg.ArtifactRoot)
	if err != nil {
		return nil, err
	}
	cfg.ArtifactRoot = root
	if cfg.Now == nil {
		cfg.Now = func() time.Time { return time.Now().UTC() }
	}
	if cfg.PollInterval == 0 {
		cfg.PollInterval = time.Minute
	}
	if cfg.ScheduleBatch == 0 {
		cfg.ScheduleBatch = 100
	}
	if cfg.OccurrenceBatch == 0 {
		cfg.OccurrenceBatch = 100
	}
	if cfg.WorkerConcurrency == 0 {
		cfg.WorkerConcurrency = 1
	}
	if cfg.RetryPolicy == nil {
		cfg.RetryPolicy = worker.DefaultRetryPolicy{MaxAttempts: 5, Backoff: worker.BackoffConfig{Strategy: worker.BackoffExponential, Interval: time.Second, MaxInterval: time.Minute}}
	}
	tracker := trackerbun.NewTracker(cfg.DB)
	tracker.Now = cfg.Now
	store := storefs.NewDurableStore(root)
	bundleOpts := append([]ExportBundleOption{}, opts...)
	bundleOpts = append(bundleOpts, WithExportGuard(cfg.Guard), WithExportActorProvider(cfg.ActorProvider), WithExportTracker(tracker), WithExportStore(store), WithExportDeliveryPolicy(export.DeliveryPolicy{Default: export.DeliveryAsync}))
	bundle := NewExportBundle(bundleOpts...)
	queueOpts := []postgres.Option{postgres.WithClock(cfg.Now)}
	if cfg.DB.Dialect().Name() == dialect.SQLite {
		queueOpts = append(queueOpts, postgres.WithDialect(postgres.DialectSQLite))
	}
	q := postgres.NewStorage(cfg.DB.DB, queueOpts...)
	recurring, err := postgres.NewRecurringScheduler(q)
	if err != nil {
		return nil, err
	}
	h := &DurableExportHost{Bundle: bundle, Queue: q, Tracker: tracker, Recurring: recurring, cfg: cfg}
	rc := replaybun.Config{Service: export.ServiceConfig{Runner: bundle.Runner, Tracker: tracker, Store: store, Guard: cfg.Guard, DeliveryPolicy: export.DeliveryPolicy{Default: export.DeliveryAsync}, Now: cfg.Now}, Tracker: tracker, Namespace: cfg.Namespace, WithTransaction: cfg.WithTransaction}
	if cfg.Webhooks != nil {
		h.Webhooks, err = deliverybun.NewService(deliverybun.Config{DB: cfg.DB, Queue: q, Sender: cfg.Webhooks.Sender, Namespace: cfg.Namespace, AuthorizeTarget: cfg.Webhooks.AuthorizeTarget, Link: cfg.Webhooks.Link, Now: cfg.Now,
			Authorize: func(ctx context.Context, a export.Actor, id string) (context.Context, error) {
				err := cfg.WithTransaction(ctx, a, func(ctx context.Context, tx bun.Tx) error { return cfg.AuthorizeRecordTransaction(ctx, tx, a, id) })
				return ctx, err
			},
			WithAuthorizedTransaction: func(ctx context.Context, a export.Actor, id string, fn func(context.Context, bun.Tx, export.ExportRecord) error) error {
				return cfg.WithTransaction(ctx, a, func(ctx context.Context, tx bun.Tx) error {
					if err := cfg.AuthorizeRecordTransaction(ctx, tx, a, id); err != nil {
						return err
					}
					rec, err := tracker.WithTx(tx).Status(ctx, id)
					if err != nil {
						return err
					}
					return fn(ctx, tx, rec)
				})
			}})
		if err != nil {
			return nil, err
		}
		publisher, err := deliverybun.NewCompletionPublisher(deliverybun.CompletionConfig{Delivery: h.Webhooks, Select: cfg.Webhooks.Select, AuthorizeTransaction: cfg.AuthorizeRecordTransaction})
		if err != nil {
			return nil, err
		}
		rc, err = publisher.Bind(rc)
		if err != nil {
			return nil, err
		}
	}
	queued := rc.OnQueued
	rc.OnQueued = func(ctx context.Context, tx bun.Tx, a export.Actor, rec export.ExportRecord) error {
		ns, err := cfg.Namespace(ctx, a)
		if err != nil {
			return err
		}
		if ns == "" || a.ID == "" {
			return durableExportDenied()
		}
		owner := durableExportOwner{ExportID: rec.ID, Namespace: ns, ActorID: a.ID, TenantID: a.Scope.TenantID, WorkspaceID: a.Scope.WorkspaceID}
		if _, err = tx.NewInsert().Model(&owner).Exec(ctx); err != nil {
			return err
		}
		if err = cfg.AcceptBackground(ctx, tx, a, rec); err != nil {
			return err
		}
		if queued != nil {
			return queued(ctx, tx, a, rec)
		}
		return nil
	}
	h.replay = rc
	scheduler, err := jobbun.NewScheduler(jobbun.Config{Replay: rc, Queue: q})
	if err != nil {
		return nil, err
	}
	h.Service = scheduler
	bundle.Service = h
	registrar := bundle.Registrar.(*exportHTTPRegistrar)
	registrar.service = h
	registrar.asyncRequester = h
	registrar.requestDecoder = durableExportDecoder{registrar.requestDecoder}
	queryDecoder := registrar.queryRequestDecoder
	if queryDecoder == nil {
		queryDecoder = exportapi.QueryRequestDecoder{}
	}
	registrar.queryRequestDecoder = durableExportDecoder{queryDecoder}
	bundle.Registrar = durableExportRegistrar{exportHTTPRegistrar: registrar, host: h}
	if err = h.configureWorker(); err != nil {
		return nil, err
	}
	return h, nil
}

// Migrate adds native durable schemas and private namespace ownership. The
// tracker schema (including request_payload) remains a host migration contract.
// It is checked before any durable schema is changed or traffic is accepted.
func (h *DurableExportHost) Migrate(ctx context.Context) error {
	rows, err := h.cfg.DB.NewSelect().Table("export_records").Column("id", "request_payload").Where("1=0").Rows(ctx)
	if err != nil {
		return export.NewError(export.KindValidation, "native export tracker migration required", err)
	}
	if err = rows.Close(); err != nil {
		return err
	}
	for _, migrate := range []func(context.Context) error{func(ctx context.Context) error { return replaybun.Migrate(ctx, h.cfg.DB) }, h.Queue.Migrate, h.Recurring.Migrate} {
		if err = migrate(ctx); err != nil {
			return err
		}
	}
	if _, err = h.cfg.DB.NewCreateTable().Model((*durableExportOwner)(nil)).IfNotExists().Exec(ctx); err != nil {
		return err
	}
	if _, err = h.cfg.DB.NewCreateIndex().Model((*durableExportOwner)(nil)).Index("admin_export_host_owners_scope_idx").Column("namespace", "actor_id").IfNotExists().Exec(ctx); err != nil {
		return err
	}
	if h.Webhooks != nil {
		if err = deliverybun.Migrate(ctx, h.cfg.DB); err != nil {
			return err
		}
		if err = deliverybun.MigrateCompletion(ctx, h.cfg.DB); err != nil {
			return err
		}
	}
	if h.cfg.LegacyAdoption != nil {
		if _, err = h.cfg.DB.NewCreateTable().Model((*legacyExportReceipt)(nil)).IfNotExists().Exec(ctx); err != nil {
			return err
		}
	}
	return h.CheckReady(ctx)
}

// CheckReady validates the durable tables before routes or workers start.
func (h *DurableExportHost) CheckReady(ctx context.Context) error {
	tables := []string{"export_records", "export_replay_keys", "admin_export_host_owners", "queue_messages", "queue_dispatch_status", "queue_dlq", "queue_messages_schedules", "queue_messages_occurrences"}
	if h.Webhooks != nil {
		tables = append(tables, "export_webhook_operations", "export_webhook_targets", "export_webhook_completion_plans")
	}
	if h.cfg.LegacyAdoption != nil {
		tables = append(tables, "admin_export_legacy_adoptions")
	}
	for _, table := range tables {
		query := h.cfg.DB.NewSelect().Table(table).ColumnExpr("1").Where("1=0")
		if table == "export_records" {
			query = h.cfg.DB.NewSelect().Table(table).Column("id", "request_payload").Where("1=0")
		}
		rows, err := query.Rows(ctx)
		if err != nil {
			return export.NewError(export.KindValidation, "durable export schema not ready: "+table, err)
		}
		if err = rows.Close(); err != nil {
			return err
		}
	}
	return nil
}

// History authorizes before metadata reads and applies trusted namespace/owner
// predicates in SQL before a bounded native tracker lookup. Group namespaces do
// not have to be encoded as tenant/workspace identifiers.
func (h *DurableExportHost) History(ctx context.Context, a export.Actor, f export.ProgressFilter) ([]export.ExportRecord, error) {
	var records []export.ExportRecord
	err := h.cfg.WithTransaction(ctx, a, func(ctx context.Context, tx bun.Tx) error {
		ns, err := h.cfg.Namespace(ctx, a)
		if err != nil {
			return err
		}
		if ns == "" || a.ID == "" {
			return durableExportDenied()
		}
		query := tx.NewSelect().TableExpr("admin_export_host_owners AS o").ColumnExpr("o.export_id").Join("JOIN export_records AS r ON r.id=o.export_id").Where("o.namespace=? AND o.actor_id=? AND o.tenant_id=? AND o.workspace_id=?", ns, a.ID, a.Scope.TenantID, a.Scope.WorkspaceID).OrderExpr("r.created_at DESC, o.export_id").Limit(200)
		if f.Definition != "" {
			query = query.Where("r.definition=?", f.Definition)
		}
		if f.State != "" {
			query = query.Where("r.state=?", f.State)
		}
		if !f.Since.IsZero() {
			query = query.Where("r.created_at>=?", f.Since)
		}
		if !f.Until.IsZero() {
			query = query.Where("r.created_at<=?", f.Until)
		}
		var ids []string
		if err = query.Scan(ctx, &ids); err != nil {
			return err
		}
		for _, id := range ids {
			if err = h.cfg.AuthorizeRecordTransaction(ctx, tx, a, id); err != nil {
				return err
			}
			rec, err := h.Tracker.WithTx(tx).Status(ctx, id)
			if err != nil {
				return err
			}
			records = append(records, rec)
		}
		return nil
	})
	return records, err
}

type durableExportDecoder struct{ exportapi.RequestDecoder }

func (d durableExportDecoder) Decode(req exportapi.Request) (export.ExportRequest, error) {
	if req.Method() != "POST" {
		return export.ExportRequest{}, durableExportInvalid("durable exports require POST acceptance")
	}
	r, err := d.RequestDecoder.Decode(req)
	if err != nil {
		return r, err
	}
	if r.Delivery == export.DeliverySync {
		return r, durableExportInvalid("durable exports require asynchronous delivery")
	}
	r.Delivery = export.DeliveryAsync
	return r, nil
}

type durableExportRegistrar struct {
	*exportHTTPRegistrar
	host *DurableExportHost
}

func (r durableExportRegistrar) RegisterExportRoutes(router admin.AdminRouter, opts admin.ExportRouteOptions) error {
	if opts.Wrap == nil {
		return durableExportInvalid("durable export routes require authenticated middleware")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := r.host.CheckReady(ctx); err != nil {
		return err
	}
	return r.exportHTTPRegistrar.RegisterExportRoutes(router, opts)
}

var _ export.Service = (*DurableExportHost)(nil)

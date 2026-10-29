package admin

import (
	"context"
	"database/sql"
	"errors"
	"io/fs"
	"time"

	admindata "github.com/goliatone/go-admin/data"
	usersactivity "github.com/goliatone/go-users/activity"
	"github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
	"github.com/mattn/go-sqlite3"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect"
)

type activityIngestionReceiptRow struct {
	bun.BaseModel      `bun:"table:admin_activity_ingestion_receipts,alias:receipt"`
	ProducerID         string    `bun:",pk,notnull"`
	EventID            string    `bun:",pk,notnull"`
	TenantID           string    `bun:",notnull"`
	OrgID              string    `bun:",notnull"`
	FingerprintVersion int       `bun:",notnull"`
	Fingerprint        string    `bun:",notnull"`
	ResultVersion      int       `bun:",notnull"`
	ActivityID         uuid.UUID `bun:"type:uuid,notnull"`
	OccurredAt         time.Time `bun:",notnull"`
	ReceivedAt         time.Time `bun:",notnull"`
	ActorKind          string    `bun:",notnull"`
	Attribution        string    `bun:",notnull"`
	ActorID            uuid.UUID `bun:"type:uuid,notnull"`
	SubjectUserID      uuid.UUID `bun:"type:uuid,notnull"`
}

// BunActivityIngestionStore owns one DB and an un-enriched canonical go-users
// writer. It never falls back to ActivitySink or memory. Migrate explicitly before
// CheckReady and before registering routes. Custom stores must pass the same
// atomic/reservation/rollback/restart contract tests.
type BunActivityIngestionStore struct {
	db         *bun.DB
	repository *usersactivity.Repository
}

// NewBunActivityIngestionStore binds the receipt and canonical activity writer to
// the same SQLite/PostgreSQL DB. No DDL, probes, or global JSON overrides occur.
func NewBunActivityIngestionStore(db *bun.DB) (*BunActivityIngestionStore, error) {
	if db == nil || (db.Dialect().Name() != dialect.SQLite && db.Dialect().Name() != dialect.PG) {
		return nil, ErrActivityIngestionUnavailable
	}
	repository, err := usersactivity.NewRepository(usersactivity.RepositoryConfig{DB: db, MachineActivityFilter: excludeIngestedMachineActivity})
	if err != nil {
		return nil, err
	}
	return &BunActivityIngestionStore{db: db, repository: repository}, nil
}

// GetActivityIngestionMigrationsFS exposes the host-owned ordered migration input.
func GetActivityIngestionMigrationsFS() fs.FS { return admindata.ActivityIngestionMigrations() }

// EnsureActivityIngestionSchema is an explicit migration helper, never called by
// constructors or registrars. Apply go-users activity/scope migrations first.
func EnsureActivityIngestionSchema(ctx context.Context, db *bun.DB) error {
	if db == nil {
		return ErrActivityIngestionUnavailable
	}
	name := "sqlite"
	switch db.Dialect().Name() {
	case dialect.SQLite:
	case dialect.PG:
		name = "postgres"
	default:
		return ErrActivityIngestionUnavailable
	}
	raw, err := fs.ReadFile(GetActivityIngestionMigrationsFS(), "0001_receipts."+name+".up.sql")
	if err != nil {
		return err
	}
	_, err = db.ExecContext(ctx, string(raw))
	return err
}

// CheckReady verifies schema columns and producer-wide primary-key capability
// without creating or changing records. Readiness is required before exposure.
func (s *BunActivityIngestionStore) CheckReady(ctx context.Context) error {
	if s == nil || s.db == nil || s.repository == nil {
		return ErrActivityIngestionUnavailable
	}
	if _, err := s.db.NewSelect().Model((*activityIngestionReceiptRow)(nil)).Where("1 = 0").Exec(ctx); err != nil {
		return ErrActivityIngestionUnavailable
	}
	if _, err := s.db.NewSelect().Model((*usersactivity.LogEntry)(nil)).Where("1 = 0").Exec(ctx); err != nil {
		return ErrActivityIngestionUnavailable
	}
	var keys []string
	if s.db.Dialect().Name() == dialect.SQLite {
		if err := s.db.NewRaw("SELECT name FROM pragma_table_info('admin_activity_ingestion_receipts') WHERE pk > 0 ORDER BY pk").Scan(ctx, &keys); err != nil {
			return ErrActivityIngestionUnavailable
		}
	} else {
		if err := s.db.NewRaw(`SELECT a.attname FROM pg_index i JOIN unnest(i.indkey) WITH ORDINALITY k(attnum, pos) ON true JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=k.attnum WHERE i.indrelid='admin_activity_ingestion_receipts'::regclass AND i.indisprimary ORDER BY k.pos`).Scan(ctx, &keys); err != nil {
			return ErrActivityIngestionUnavailable
		}
	}
	if len(keys) != 2 || keys[0] != "producer_id" || keys[1] != "event_id" {
		return ErrActivityIngestionUnavailable
	}
	return nil
}
func (s *BunActivityIngestionStore) Binding(ctx context.Context, producer, event string) (*ScopeInput, error) {
	return activityIngestionBinding(ctx, s.db, producer, event)
}
func activityIngestionBinding(ctx context.Context, db bun.IDB, producer, event string) (*ScopeInput, error) {
	row := new(activityIngestionReceiptRow)
	err := db.NewSelect().Model(row).Column("tenant_id", "org_id").Where("producer_id = ? AND event_id = ?", producer, event).Scan(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &ScopeInput{TenantID: row.TenantID, OrgID: row.OrgID}, nil
}

// WithinTransaction commits only if all receipt and activity operations succeed.
// Only recognized lock/serialization contention is classified as retryable;
// arbitrary SQL and ambiguous commit errors are never automatically retried.
func (s *BunActivityIngestionStore) WithinTransaction(ctx context.Context, fn func(ActivityIngestionTransaction) error) error {
	err := s.db.RunInTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted}, func(ctx context.Context, tx bun.Tx) error {
		return fn(&bunActivityIngestionTx{tx: tx, repository: s.repository})
	})
	if activityIngestionIsContention(err) {
		return ErrActivityIngestionContention
	}
	return err
}

type bunActivityIngestionTx struct {
	tx         bun.Tx
	repository *usersactivity.Repository
}

func (t *bunActivityIngestionTx) Binding(ctx context.Context, p, e string) (*ScopeInput, error) {
	return activityIngestionBinding(ctx, t.tx, p, e)
}
func (t *bunActivityIngestionTx) Receipt(ctx context.Context, p, e string, scope ScopeInput) (*ActivityIngestionReceipt, error) {
	row := new(activityIngestionReceiptRow)
	err := t.tx.NewSelect().Model(row).Where("producer_id = ? AND event_id = ? AND tenant_id = ? AND org_id = ?", p, e, scope.TenantID, scope.OrgID).Scan(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	result := row.receipt()
	return &result, nil
}
func (t *bunActivityIngestionTx) Reserve(ctx context.Context, r ActivityIngestionReceipt) (bool, error) {
	row := activityIngestionReceiptRow{ProducerID: r.ProducerID, EventID: r.EventID, TenantID: r.Scope.TenantID, OrgID: r.Scope.OrgID, FingerprintVersion: r.FingerprintVersion, Fingerprint: r.Fingerprint, ResultVersion: r.ResultVersion, ActivityID: r.Result.ActivityID, OccurredAt: r.Result.OccurredAt, ReceivedAt: r.Result.ReceivedAt, ActorKind: r.ActorKind, Attribution: r.Attribution, ActorID: r.ActorID, SubjectUserID: r.SubjectUserID}
	result, err := t.tx.NewInsert().Model(&row).On("CONFLICT (producer_id, event_id) DO NOTHING").Exec(ctx)
	if err != nil {
		return false, err
	}
	count, err := result.RowsAffected()
	return count == 1, err
}
func (t *bunActivityIngestionTx) Append(ctx context.Context, record types.ActivityRecord) error {
	policy := usersactivity.NewRecordPolicy(usersactivity.RecordPolicyConfig{DataSanitizer: func(r types.ActivityRecord) map[string]any { return r.Data }})
	return t.repository.LogTx(ctx, t.tx, record, policy)
}
func (r activityIngestionReceiptRow) receipt() ActivityIngestionReceipt {
	scope := ScopeInput{TenantID: r.TenantID, OrgID: r.OrgID}
	return ActivityIngestionReceipt{ProducerID: r.ProducerID, EventID: r.EventID, Scope: scope, FingerprintVersion: r.FingerprintVersion, Fingerprint: r.Fingerprint, ResultVersion: r.ResultVersion, Result: ActivityIngestResult{ActivityID: r.ActivityID, EventID: r.EventID, Scope: scope, OccurredAt: r.OccurredAt.UTC(), ReceivedAt: r.ReceivedAt.UTC()}, ActorKind: r.ActorKind, Attribution: r.Attribution, ActorID: r.ActorID, SubjectUserID: r.SubjectUserID}
}
func activityIngestionIsContention(err error) bool {
	if err == nil {
		return false
	}
	var sqliteErr sqlite3.Error
	if errors.As(err, &sqliteErr) {
		return sqliteErr.Code == sqlite3.ErrBusy || sqliteErr.Code == sqlite3.ErrLocked
	}
	var code interface{ SQLState() string }
	if errors.As(err, &code) {
		return code.SQLState() == "40001" || code.SQLState() == "40P01"
	}
	return false
}

// excludeIngestedMachineActivity uses trusted receipt identity before pagination
// and counting. Legacy rows retain the host's metadata filter, including custom
// aliases; arbitrary ingested metadata cannot override a canonical actor kind.
func excludeIngestedMachineActivity(q *bun.SelectQuery, actorTypes, dataKeys []string) *bun.SelectQuery {
	const identity = "(CAST(id AS TEXT), CAST(tenant_id AS TEXT), CAST(org_id AS TEXT))"
	const receipts = "SELECT activity_id, tenant_id, org_id FROM admin_activity_ingestion_receipts"
	return q.WhereGroup(" AND ", func(q *bun.SelectQuery) *bun.SelectQuery {
		q = q.Where(identity + " IN (" + receipts + " WHERE actor_kind = 'user')")
		return q.WhereGroup(" OR ", func(q *bun.SelectQuery) *bun.SelectQuery {
			q = q.Where(identity + " NOT IN (" + receipts + ")")
			return usersactivity.ExcludeMachineActivity(q, actorTypes, dataKeys)
		})
	})
}

// ResolveActivityReadIdentities verifies receipt-to-row actor/subject bindings
// for an already authorized page. Missing associations mean legacy rows; failed
// or inconsistent lookups fail the page rather than assigning a human subject.
func (s *BunActivityIngestionStore) ResolveActivityReadIdentities(ctx context.Context, readCtx ActivityReadContext, records []types.ActivityRecord) (map[uuid.UUID]ActivityReadIdentity, error) {
	if len(records) > activityMaxLimit {
		return nil, ErrActivityIngestionUnavailable
	}
	if err := validateActivityReadPage(readCtx, types.ActivityPage{Records: records}); err != nil {
		return nil, err
	}
	result := map[uuid.UUID]ActivityReadIdentity{}
	if len(records) == 0 {
		return result, nil
	}
	ids := make([]uuid.UUID, 0, len(records))
	byID := map[uuid.UUID]types.ActivityRecord{}
	for _, r := range records {
		ids = append(ids, r.ID)
		byID[r.ID] = r
	}
	var rows []struct {
		activityIngestionReceiptRow `bun:",extend"`
		CanonicalActorID            uuid.UUID
		CanonicalSubjectID          uuid.UUID
		CanonicalID                 uuid.UUID
	}
	err := s.db.NewSelect().Model(&rows).ColumnExpr("receipt.*").ColumnExpr("canonical.id AS canonical_id, canonical.actor_id AS canonical_actor_id, canonical.user_id AS canonical_subject_id").Join("LEFT JOIN user_activity AS canonical ON CAST(canonical.id AS TEXT) = CAST(receipt.activity_id AS TEXT) AND canonical.tenant_id = receipt.tenant_id AND canonical.org_id = receipt.org_id").Where("receipt.tenant_id = ? AND receipt.org_id = ? AND receipt.activity_id IN (?)", readCtx.Scope.TenantID.String(), readCtx.Scope.OrgID.String(), bun.In(ids)).Scan(ctx)
	if err != nil {
		return nil, err
	}
	for _, row := range rows {
		r, ok := byID[row.ActivityID]
		if !ok || row.CanonicalID != r.ID || row.CanonicalActorID != r.ActorID || row.CanonicalSubjectID != r.UserID || row.ActorID != r.ActorID || row.SubjectUserID != r.UserID || (row.ActorKind != "user" && row.ActorKind != "system" && row.ActorKind != "job") {
			return nil, ErrActivityIngestionUnavailable
		}
		if (row.ActorKind == "user") != (r.ActorID != uuid.Nil) {
			return nil, ErrActivityIngestionUnavailable
		}
		result[row.ActivityID] = ActivityReadIdentity{ActorKind: row.ActorKind}
	}
	return result, nil
}

var _ ActivityIngestionStore = (*BunActivityIngestionStore)(nil)
var _ ActivityReadIdentityResolver = (*BunActivityIngestionStore)(nil)

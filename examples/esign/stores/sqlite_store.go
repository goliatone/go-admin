package stores

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	"github.com/uptrace/bun/driver/sqliteshim"
)

const defaultESignSQLiteFilename = "go-admin-esign.db"

// ResolveSQLiteDSN returns the preferred DSN for the e-sign example store.
func ResolveSQLiteDSN() string {
	cfg := appcfg.Active()
	if value := strings.TrimSpace(cfg.SQLite.DSN); value != "" {
		return value
	}
	filename := strings.TrimSuffix(defaultESignSQLiteFilename, ".db")
	filename = fmt.Sprintf("%s-%d.db", filename, os.Getpid())
	return "file:" + filepath.Join(os.TempDir(), filename) + "?cache=shared&_fk=1&_busy_timeout=5000"
}

// SQLiteStore persists e-sign domain data in SQLite while reusing InMemoryStore logic.
type SQLiteStore struct {
	*InMemoryStore
	db             *sql.DB
	backend        SQLitePersistenceBackend
	persistPayload func(context.Context, []byte) error
	ownsDB         bool
	mu             sync.Mutex
	batchDepth     int
	dirty          bool
}

// SQLitePersistenceBackend controls durable state loading/persistence for SQLiteStore.
// The default backend uses the legacy sqlite snapshot table, while runtime can inject
// a relational backend that writes canonical tables.
type SQLitePersistenceBackend interface {
	EnsureSchema(ctx context.Context, db *sql.DB) error
	LoadPayload(ctx context.Context, db *sql.DB) ([]byte, error)
	PersistPayload(ctx context.Context, db *sql.DB, payload []byte) error
}

type sqliteSnapshotPersistenceBackend struct{}

type sqliteStoreSnapshot struct {
	Documents                  map[string]DocumentRecord                 `json:"documents"`
	Agreements                 map[string]AgreementRecord                `json:"agreements"`
	Drafts                     map[string]DraftRecord                    `json:"drafts"`
	DraftWizardIndex           map[string]string                         `json:"draft_wizard_index"`
	Participants               map[string]ParticipantRecord              `json:"participants"`
	FieldDefinitions           map[string]FieldDefinitionRecord          `json:"field_definitions"`
	FieldInstances             map[string]FieldInstanceRecord            `json:"field_instances"`
	Recipients                 map[string]RecipientRecord                `json:"recipients"`
	Fields                     map[string]FieldRecord                    `json:"fields"`
	SigningTokens              map[string]SigningTokenRecord             `json:"signing_tokens"`
	TokenHashIndex             map[string]string                         `json:"token_hash_index"`
	SignatureArtifacts         map[string]SignatureArtifactRecord        `json:"signature_artifacts"`
	SignerProfiles             map[string]SignerProfileRecord            `json:"signer_profiles"`
	SignerProfileIndex         map[string]string                         `json:"signer_profile_index"`
	SavedSignerSignatures      map[string]SavedSignerSignatureRecord     `json:"saved_signatures"`
	FieldValues                map[string]FieldValueRecord               `json:"field_values"`
	AuditEvents                map[string]AuditEventRecord               `json:"audit_events"`
	AgreementArtifacts         map[string]AgreementArtifactRecord        `json:"agreement_artifacts"`
	EmailLogs                  map[string]EmailLogRecord                 `json:"email_logs"`
	JobRuns                    map[string]JobRunRecord                   `json:"job_runs"`
	JobRunDedupeIndex          map[string]string                         `json:"job_run_dedupe_index"`
	GoogleImportRuns           map[string]GoogleImportRunRecord          `json:"google_import_runs"`
	GoogleImportRunDedupeIndex map[string]string                         `json:"google_import_run_dedupe_index"`
	DocumentRemediationLeases  map[string]DocumentRemediationLeaseRecord `json:"document_remediation_leases"`
	RemediationDispatches      map[string]RemediationDispatchRecord      `json:"remediation_dispatches"`
	RemediationDispatchIndex   map[string]string                         `json:"remediation_dispatch_index"`
	AgreementReminderStates    map[string]AgreementReminderStateRecord   `json:"agreement_reminder_states"`
	OutboxMessages             map[string]OutboxMessageRecord            `json:"outbox_messages"`
	IntegrationCredentials     map[string]IntegrationCredentialRecord    `json:"integration_credentials"`
	IntegrationCredentialIndex map[string]string                         `json:"integration_credential_index"`
	MappingSpecs               map[string]MappingSpecRecord              `json:"mapping_specs"`
	IntegrationBindings        map[string]IntegrationBindingRecord       `json:"integration_bindings"`
	IntegrationBindingIndex    map[string]string                         `json:"integration_binding_index"`
	IntegrationSyncRuns        map[string]IntegrationSyncRunRecord       `json:"integration_sync_runs"`
	IntegrationCheckpoints     map[string]IntegrationCheckpointRecord    `json:"integration_checkpoints"`
	IntegrationCheckpointIndex map[string]string                         `json:"integration_checkpoint_index"`
	IntegrationConflicts       map[string]IntegrationConflictRecord      `json:"integration_conflicts"`
	IntegrationChangeEvents    map[string]IntegrationChangeEventRecord   `json:"integration_change_events"`
	IntegrationMutationClaims  map[string]time.Time                      `json:"integration_mutation_claims"`
	PlacementRuns              map[string]PlacementRunRecord             `json:"placement_runs"`
}

// NewSQLiteStore creates a SQLite-backed e-sign store.
func NewSQLiteStore(dsn string) (*SQLiteStore, error) {
	return newSQLiteStoreWithBackend(dsn, sqliteSnapshotPersistenceBackend{})
}

// NewPersistentStoreFromDB creates a store bound to an existing SQL handle.
// The caller controls SQL lifecycle; Close flushes but does not close db.
func NewPersistentStoreFromDB(db *sql.DB, backend SQLitePersistenceBackend) (*SQLiteStore, error) {
	if db == nil {
		return nil, fmt.Errorf("esign sqlite db is required")
	}
	if backend == nil {
		backend = sqliteSnapshotPersistenceBackend{}
	}
	mem, err := loadStoreStateFromBackend(context.Background(), db, backend)
	if err != nil {
		return nil, err
	}
	return &SQLiteStore{
		InMemoryStore: mem,
		db:            db,
		backend:       backend,
		ownsDB:        false,
	}, nil
}

// NewPersistentStoreFromMemory builds a durable store from a preloaded in-memory state
// and a payload persistence callback. This keeps SQLiteStore transactional semantics
// without requiring direct sql.DB ownership in the caller.
func NewPersistentStoreFromMemory(mem *InMemoryStore, persistPayload func(context.Context, []byte) error) (*SQLiteStore, error) {
	if mem == nil {
		mem = NewInMemoryStore()
	}
	return &SQLiteStore{
		InMemoryStore:  mem,
		persistPayload: persistPayload,
		ownsDB:         false,
	}, nil
}

func newSQLiteStoreWithBackend(dsn string, backend SQLitePersistenceBackend) (*SQLiteStore, error) {
	dsn = strings.TrimSpace(dsn)
	if dsn == "" {
		dsn = ResolveSQLiteDSN()
	}
	if dsn == "" {
		return nil, fmt.Errorf("esign sqlite dsn is required")
	}
	if backend == nil {
		backend = sqliteSnapshotPersistenceBackend{}
	}

	ensureSQLiteDSNDir(dsn)
	db, err := sql.Open(sqliteshim.ShimName, dsn)
	if err != nil {
		return nil, fmt.Errorf("open esign sqlite store: %w", err)
	}
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)
	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("ping esign sqlite store: %w", err)
	}
	if err := ConfigureSQLiteConnection(context.Background(), db); err != nil {
		_ = db.Close()
		return nil, err
	}
	mem, err := loadStoreStateFromBackend(context.Background(), db, backend)
	if err != nil {
		_ = db.Close()
		return nil, err
	}
	return &SQLiteStore{
		InMemoryStore: mem,
		db:            db,
		backend:       backend,
		ownsDB:        true,
	}, nil
}

// ConfigureSQLiteConnection applies pragmatic defaults for local concurrency.
func ConfigureSQLiteConnection(ctx context.Context, db *sql.DB) error {
	if db == nil {
		return nil
	}
	statements := []string{
		`PRAGMA journal_mode=WAL`,
		`PRAGMA synchronous=NORMAL`,
		`PRAGMA busy_timeout=5000`,
	}
	for _, stmt := range statements {
		if _, err := db.ExecContext(ctx, stmt); err != nil {
			return fmt.Errorf("configure sqlite pragma (%s): %w", stmt, err)
		}
	}
	return nil
}

func ensureSQLiteStoreSchema(ctx context.Context, db *sql.DB) error {
	if db == nil {
		return fmt.Errorf("esign sqlite db is nil")
	}
	const stmt = `CREATE TABLE IF NOT EXISTS esign_store_state (
		id INTEGER PRIMARY KEY CHECK (id = 1),
		snapshot_json TEXT NOT NULL,
		updated_at TEXT NOT NULL
	)`
	if _, err := db.ExecContext(ctx, stmt); err != nil {
		return fmt.Errorf("ensure esign sqlite state schema: %w", err)
	}
	return nil
}

func (sqliteSnapshotPersistenceBackend) EnsureSchema(ctx context.Context, db *sql.DB) error {
	return ensureSQLiteStoreSchema(ctx, db)
}

func (sqliteSnapshotPersistenceBackend) LoadPayload(ctx context.Context, db *sql.DB) ([]byte, error) {
	if db == nil {
		return nil, nil
	}
	var payload string
	err := db.QueryRowContext(ctx, `SELECT snapshot_json FROM esign_store_state WHERE id = 1`).Scan(&payload)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("load esign sqlite snapshot: %w", err)
	}
	payload = strings.TrimSpace(payload)
	if payload == "" {
		return nil, nil
	}
	return []byte(payload), nil
}

func (sqliteSnapshotPersistenceBackend) PersistPayload(ctx context.Context, db *sql.DB, payload []byte) error {
	if db == nil {
		return nil
	}
	_, err := db.ExecContext(
		ctx,
		`INSERT INTO esign_store_state (id, snapshot_json, updated_at)
		 VALUES (1, ?, ?)
		 ON CONFLICT(id) DO UPDATE SET
		   snapshot_json = excluded.snapshot_json,
		   updated_at = excluded.updated_at`,
		string(payload),
		time.Now().UTC().Format(time.RFC3339Nano),
	)
	if err != nil {
		return fmt.Errorf("persist esign sqlite snapshot: %w", err)
	}
	return nil
}

func loadSQLiteSnapshot(ctx context.Context, db *sql.DB) (*InMemoryStore, error) {
	mem := NewInMemoryStore()
	backend := sqliteSnapshotPersistenceBackend{}
	return loadStoreStateFromBackendWithPayload(ctx, db, backend, mem)
}

func loadStoreStateFromBackend(ctx context.Context, db *sql.DB, backend SQLitePersistenceBackend) (*InMemoryStore, error) {
	mem := NewInMemoryStore()
	return loadStoreStateFromBackendWithPayload(ctx, db, backend, mem)
}

func loadStoreStateFromBackendWithPayload(
	ctx context.Context,
	db *sql.DB,
	backend SQLitePersistenceBackend,
	mem *InMemoryStore,
) (*InMemoryStore, error) {
	if mem == nil {
		mem = NewInMemoryStore()
	}
	if db == nil || backend == nil {
		return mem, nil
	}
	if err := backend.EnsureSchema(ctx, db); err != nil {
		return nil, err
	}
	payload, err := backend.LoadPayload(ctx, db)
	if err != nil {
		return nil, err
	}
	payload = []byte(strings.TrimSpace(string(payload)))
	if len(payload) == 0 {
		return mem, nil
	}
	if err := mem.ApplySnapshotPayload(payload); err != nil {
		return nil, fmt.Errorf("decode esign sqlite snapshot: %w", err)
	}
	return mem, nil
}

func ensureSQLiteDSNDir(dsn string) {
	if !strings.HasPrefix(dsn, "file:") {
		return
	}
	raw := strings.TrimPrefix(dsn, "file:")
	if idx := strings.Index(raw, "?"); idx >= 0 {
		raw = raw[:idx]
	}
	raw = strings.TrimSpace(raw)
	if raw == "" || raw == ":memory:" || strings.HasPrefix(raw, ":memory:") {
		return
	}
	dir := filepath.Dir(raw)
	if dir == "" || dir == "." {
		return
	}
	_ = os.MkdirAll(dir, 0o755)
}

func (s *SQLiteStore) persist(ctx context.Context) error {
	if s == nil || s.InMemoryStore == nil {
		return nil
	}
	payload, err := s.InMemoryStore.SnapshotPayload()
	if err != nil {
		return err
	}
	if s.persistPayload != nil {
		return s.persistPayload(ctx, payload)
	}
	if s.db == nil {
		return nil
	}
	backend := s.backend
	if backend == nil {
		backend = sqliteSnapshotPersistenceBackend{}
	}
	if err := backend.PersistPayload(ctx, s.db, payload); err != nil {
		return err
	}
	return nil
}

func (s *SQLiteStore) persistMaybe(ctx context.Context) error {
	if s == nil {
		return nil
	}
	if s.batchDepth > 0 {
		s.dirty = true
		return nil
	}
	if err := s.persist(ctx); err != nil {
		s.dirty = true
		return err
	}
	s.dirty = false
	return nil
}

func (s *SQLiteStore) flushLocked(ctx context.Context) error {
	if s == nil || !s.dirty {
		return nil
	}
	if err := s.persist(ctx); err != nil {
		return err
	}
	s.dirty = false
	return nil
}

// Flush persists pending in-memory mutations to SQLite.
func (s *SQLiteStore) Flush(ctx context.Context) error {
	if s == nil {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.flushLocked(ctx)
}

// WithBatch defers SQLite persistence until fn returns; changes are still applied in memory immediately.
func (s *SQLiteStore) WithBatch(ctx context.Context, fn func() error) (err error) {
	if fn == nil {
		return nil
	}
	if s == nil {
		return fn()
	}
	s.mu.Lock()
	s.batchDepth++
	s.mu.Unlock()

	defer func() {
		s.mu.Lock()
		if s.batchDepth > 0 {
			s.batchDepth--
		}
		shouldFlush := s.batchDepth == 0 && s.dirty
		var flushErr error
		if shouldFlush {
			flushErr = s.flushLocked(ctx)
		}
		s.mu.Unlock()

		if panicValue := recover(); panicValue != nil {
			panic(panicValue)
		}
		if err != nil && flushErr != nil {
			err = errors.Join(err, flushErr)
			return
		}
		if err == nil {
			err = flushErr
		}
	}()

	err = fn()
	return err
}

// WithTx executes fn within an atomic transactional scope and persists once on commit.
func (s *SQLiteStore) WithTx(ctx context.Context, fn func(tx TxStore) error) error {
	if fn == nil {
		return nil
	}
	if s == nil {
		return invalidRecordError("transactions", "store", "not configured")
	}
	if err := s.InMemoryStore.WithTx(ctx, fn); err != nil {
		return err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.dirty = true
	if s.batchDepth > 0 {
		return nil
	}
	return s.flushLocked(ctx)
}

// Close closes the underlying SQLite connection.
func (s *SQLiteStore) Close() error {
	if s == nil || s.db == nil {
		return nil
	}
	s.mu.Lock()
	flushErr := s.flushLocked(context.Background())
	db := s.db
	s.db = nil
	s.mu.Unlock()

	closeErr := error(nil)
	if s.ownsDB {
		closeErr = db.Close()
	}
	if flushErr != nil && closeErr != nil {
		return errors.Join(flushErr, closeErr)
	}
	if flushErr != nil {
		return flushErr
	}
	return closeErr
}

func (s *SQLiteStore) Create(ctx context.Context, scope Scope, record DocumentRecord) (DocumentRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.Create(ctx, scope, record)
	if err != nil {
		return DocumentRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return DocumentRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) SaveMetadata(ctx context.Context, scope Scope, id string, patch DocumentMetadataPatch) (DocumentRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.SaveMetadata(ctx, scope, id, patch)
	if err != nil {
		return DocumentRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return DocumentRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) Delete(ctx context.Context, scope Scope, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.InMemoryStore.Delete(ctx, scope, id); err != nil {
		return err
	}
	return s.persistMaybe(ctx)
}

func (s *SQLiteStore) AcquireDocumentRemediationLease(
	ctx context.Context,
	scope Scope,
	documentID string,
	input DocumentRemediationLeaseAcquireInput,
) (DocumentRemediationLeaseClaim, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.AcquireDocumentRemediationLease(ctx, scope, documentID, input)
	if err != nil {
		return DocumentRemediationLeaseClaim{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return DocumentRemediationLeaseClaim{}, err
	}
	return out, nil
}

func (s *SQLiteStore) RenewDocumentRemediationLease(
	ctx context.Context,
	scope Scope,
	documentID string,
	input DocumentRemediationLeaseRenewInput,
) (DocumentRemediationLeaseClaim, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.RenewDocumentRemediationLease(ctx, scope, documentID, input)
	if err != nil {
		return DocumentRemediationLeaseClaim{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return DocumentRemediationLeaseClaim{}, err
	}
	return out, nil
}

func (s *SQLiteStore) ReleaseDocumentRemediationLease(
	ctx context.Context,
	scope Scope,
	documentID string,
	input DocumentRemediationLeaseReleaseInput,
) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.InMemoryStore.ReleaseDocumentRemediationLease(ctx, scope, documentID, input); err != nil {
		return err
	}
	return s.persistMaybe(ctx)
}

func (s *SQLiteStore) SaveRemediationDispatch(ctx context.Context, scope Scope, record RemediationDispatchRecord) (RemediationDispatchRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.SaveRemediationDispatch(ctx, scope, record)
	if err != nil {
		return RemediationDispatchRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return RemediationDispatchRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) GetRemediationDispatch(ctx context.Context, dispatchID string) (RemediationDispatchRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.InMemoryStore.GetRemediationDispatch(ctx, dispatchID)
}

func (s *SQLiteStore) GetRemediationDispatchByIdempotencyKey(ctx context.Context, scope Scope, key string) (RemediationDispatchRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.InMemoryStore.GetRemediationDispatchByIdempotencyKey(ctx, scope, key)
}

func (s *SQLiteStore) CreateDraft(ctx context.Context, scope Scope, record AgreementRecord) (AgreementRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.CreateDraft(ctx, scope, record)
	if err != nil {
		return AgreementRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return AgreementRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) CreateDraftSession(ctx context.Context, scope Scope, record DraftRecord) (DraftRecord, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, replay, err := s.InMemoryStore.CreateDraftSession(ctx, scope, record)
	if err != nil {
		return DraftRecord{}, false, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return DraftRecord{}, false, err
	}
	return out, replay, nil
}

func (s *SQLiteStore) UpdateDraftSession(ctx context.Context, scope Scope, id string, patch DraftPatch, expectedRevision int64) (DraftRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.UpdateDraftSession(ctx, scope, id, patch, expectedRevision)
	if err != nil {
		return DraftRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return DraftRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) DeleteDraftSession(ctx context.Context, scope Scope, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.InMemoryStore.DeleteDraftSession(ctx, scope, id); err != nil {
		return err
	}
	return s.persistMaybe(ctx)
}

func (s *SQLiteStore) DeleteExpiredDraftSessions(ctx context.Context, before time.Time) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	count, err := s.InMemoryStore.DeleteExpiredDraftSessions(ctx, before)
	if err != nil {
		return 0, err
	}
	if count > 0 {
		if err := s.persistMaybe(ctx); err != nil {
			return 0, err
		}
	}
	return count, nil
}

func (s *SQLiteStore) UpdateDraft(ctx context.Context, scope Scope, id string, patch AgreementDraftPatch, expectedVersion int64) (AgreementRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.UpdateDraft(ctx, scope, id, patch, expectedVersion)
	if err != nil {
		return AgreementRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return AgreementRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) Transition(ctx context.Context, scope Scope, id string, input AgreementTransitionInput) (AgreementRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.Transition(ctx, scope, id, input)
	if err != nil {
		return AgreementRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return AgreementRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) UpsertRecipientDraft(ctx context.Context, scope Scope, agreementID string, patch RecipientDraftPatch, expectedVersion int64) (RecipientRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.UpsertRecipientDraft(ctx, scope, agreementID, patch, expectedVersion)
	if err != nil {
		return RecipientRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return RecipientRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) UpsertParticipantDraft(ctx context.Context, scope Scope, agreementID string, patch ParticipantDraftPatch, expectedVersion int64) (ParticipantRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.UpsertParticipantDraft(ctx, scope, agreementID, patch, expectedVersion)
	if err != nil {
		return ParticipantRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return ParticipantRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) DeleteParticipantDraft(ctx context.Context, scope Scope, agreementID, participantID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.InMemoryStore.DeleteParticipantDraft(ctx, scope, agreementID, participantID); err != nil {
		return err
	}
	return s.persistMaybe(ctx)
}

func (s *SQLiteStore) UpsertFieldDefinitionDraft(ctx context.Context, scope Scope, agreementID string, patch FieldDefinitionDraftPatch) (FieldDefinitionRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.UpsertFieldDefinitionDraft(ctx, scope, agreementID, patch)
	if err != nil {
		return FieldDefinitionRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return FieldDefinitionRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) DeleteFieldDefinitionDraft(ctx context.Context, scope Scope, agreementID, fieldDefinitionID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.InMemoryStore.DeleteFieldDefinitionDraft(ctx, scope, agreementID, fieldDefinitionID); err != nil {
		return err
	}
	return s.persistMaybe(ctx)
}

func (s *SQLiteStore) UpsertFieldInstanceDraft(ctx context.Context, scope Scope, agreementID string, patch FieldInstanceDraftPatch) (FieldInstanceRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.UpsertFieldInstanceDraft(ctx, scope, agreementID, patch)
	if err != nil {
		return FieldInstanceRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return FieldInstanceRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) DeleteFieldInstanceDraft(ctx context.Context, scope Scope, agreementID, fieldInstanceID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.InMemoryStore.DeleteFieldInstanceDraft(ctx, scope, agreementID, fieldInstanceID); err != nil {
		return err
	}
	return s.persistMaybe(ctx)
}

func (s *SQLiteStore) TouchRecipientView(ctx context.Context, scope Scope, agreementID, recipientID string, viewedAt time.Time) (RecipientRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.TouchRecipientView(ctx, scope, agreementID, recipientID, viewedAt)
	if err != nil {
		return RecipientRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return RecipientRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) CompleteRecipient(ctx context.Context, scope Scope, agreementID, recipientID string, completedAt time.Time, expectedVersion int64) (RecipientRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.CompleteRecipient(ctx, scope, agreementID, recipientID, completedAt, expectedVersion)
	if err != nil {
		return RecipientRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return RecipientRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) DeclineRecipient(ctx context.Context, scope Scope, agreementID, recipientID, reason string, declinedAt time.Time, expectedVersion int64) (RecipientRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.DeclineRecipient(ctx, scope, agreementID, recipientID, reason, declinedAt, expectedVersion)
	if err != nil {
		return RecipientRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return RecipientRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) DeleteRecipientDraft(ctx context.Context, scope Scope, agreementID, recipientID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.InMemoryStore.DeleteRecipientDraft(ctx, scope, agreementID, recipientID); err != nil {
		return err
	}
	return s.persistMaybe(ctx)
}

func (s *SQLiteStore) UpsertFieldDraft(ctx context.Context, scope Scope, agreementID string, patch FieldDraftPatch) (FieldRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.UpsertFieldDraft(ctx, scope, agreementID, patch)
	if err != nil {
		return FieldRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return FieldRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) DeleteFieldDraft(ctx context.Context, scope Scope, agreementID, fieldID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.InMemoryStore.DeleteFieldDraft(ctx, scope, agreementID, fieldID); err != nil {
		return err
	}
	return s.persistMaybe(ctx)
}

func (s *SQLiteStore) CreateSigningToken(ctx context.Context, scope Scope, record SigningTokenRecord) (SigningTokenRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.CreateSigningToken(ctx, scope, record)
	if err != nil {
		return SigningTokenRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return SigningTokenRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) RevokeActiveSigningTokens(ctx context.Context, scope Scope, agreementID, recipientID string, revokedAt time.Time) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.RevokeActiveSigningTokens(ctx, scope, agreementID, recipientID, revokedAt)
	if err != nil {
		return 0, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return 0, err
	}
	return out, nil
}

func (s *SQLiteStore) CreateSignatureArtifact(ctx context.Context, scope Scope, record SignatureArtifactRecord) (SignatureArtifactRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.CreateSignatureArtifact(ctx, scope, record)
	if err != nil {
		return SignatureArtifactRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return SignatureArtifactRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) UpsertSignerProfile(ctx context.Context, scope Scope, record SignerProfileRecord) (SignerProfileRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.UpsertSignerProfile(ctx, scope, record)
	if err != nil {
		return SignerProfileRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return SignerProfileRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) DeleteSignerProfile(ctx context.Context, scope Scope, subject, key string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.InMemoryStore.DeleteSignerProfile(ctx, scope, subject, key); err != nil {
		return err
	}
	return s.persistMaybe(ctx)
}

func (s *SQLiteStore) CreateSavedSignerSignature(ctx context.Context, scope Scope, record SavedSignerSignatureRecord) (SavedSignerSignatureRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.CreateSavedSignerSignature(ctx, scope, record)
	if err != nil {
		return SavedSignerSignatureRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return SavedSignerSignatureRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) DeleteSavedSignerSignature(ctx context.Context, scope Scope, subject, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.InMemoryStore.DeleteSavedSignerSignature(ctx, scope, subject, id); err != nil {
		return err
	}
	return s.persistMaybe(ctx)
}

func (s *SQLiteStore) UpsertFieldValue(ctx context.Context, scope Scope, value FieldValueRecord, expectedVersion int64) (FieldValueRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.UpsertFieldValue(ctx, scope, value, expectedVersion)
	if err != nil {
		return FieldValueRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return FieldValueRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) Append(ctx context.Context, scope Scope, event AuditEventRecord) (AuditEventRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.Append(ctx, scope, event)
	if err != nil {
		return AuditEventRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return AuditEventRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) SaveAgreementArtifacts(ctx context.Context, scope Scope, record AgreementArtifactRecord) (AgreementArtifactRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.SaveAgreementArtifacts(ctx, scope, record)
	if err != nil {
		return AgreementArtifactRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return AgreementArtifactRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) CreateEmailLog(ctx context.Context, scope Scope, record EmailLogRecord) (EmailLogRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.CreateEmailLog(ctx, scope, record)
	if err != nil {
		return EmailLogRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return EmailLogRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) UpdateEmailLog(ctx context.Context, scope Scope, id string, patch EmailLogRecord) (EmailLogRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.UpdateEmailLog(ctx, scope, id, patch)
	if err != nil {
		return EmailLogRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return EmailLogRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) BeginJobRun(ctx context.Context, scope Scope, input JobRunInput) (JobRunRecord, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	record, reused, err := s.InMemoryStore.BeginJobRun(ctx, scope, input)
	if err != nil {
		return JobRunRecord{}, false, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return JobRunRecord{}, false, err
	}
	return record, reused, nil
}

func (s *SQLiteStore) MarkJobRunSucceeded(ctx context.Context, scope Scope, id string, completedAt time.Time) (JobRunRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.MarkJobRunSucceeded(ctx, scope, id, completedAt)
	if err != nil {
		return JobRunRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return JobRunRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) MarkJobRunFailed(ctx context.Context, scope Scope, id, failureReason string, nextRetryAt *time.Time, failedAt time.Time) (JobRunRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.MarkJobRunFailed(ctx, scope, id, failureReason, nextRetryAt, failedAt)
	if err != nil {
		return JobRunRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return JobRunRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) BeginGoogleImportRun(ctx context.Context, scope Scope, input GoogleImportRunInput) (GoogleImportRunRecord, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	record, created, err := s.InMemoryStore.BeginGoogleImportRun(ctx, scope, input)
	if err != nil {
		return GoogleImportRunRecord{}, false, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return GoogleImportRunRecord{}, false, err
	}
	return record, created, nil
}

func (s *SQLiteStore) MarkGoogleImportRunRunning(ctx context.Context, scope Scope, id string, startedAt time.Time) (GoogleImportRunRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.MarkGoogleImportRunRunning(ctx, scope, id, startedAt)
	if err != nil {
		return GoogleImportRunRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return GoogleImportRunRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) MarkGoogleImportRunSucceeded(ctx context.Context, scope Scope, id string, input GoogleImportRunSuccessInput) (GoogleImportRunRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.MarkGoogleImportRunSucceeded(ctx, scope, id, input)
	if err != nil {
		return GoogleImportRunRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return GoogleImportRunRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) MarkGoogleImportRunFailed(ctx context.Context, scope Scope, id string, input GoogleImportRunFailureInput) (GoogleImportRunRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.MarkGoogleImportRunFailed(ctx, scope, id, input)
	if err != nil {
		return GoogleImportRunRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return GoogleImportRunRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) UpsertAgreementReminderState(ctx context.Context, scope Scope, record AgreementReminderStateRecord) (AgreementReminderStateRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.UpsertAgreementReminderState(ctx, scope, record)
	if err != nil {
		return AgreementReminderStateRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return AgreementReminderStateRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) GetAgreementReminderState(ctx context.Context, scope Scope, agreementID, recipientID string) (AgreementReminderStateRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.InMemoryStore.GetAgreementReminderState(ctx, scope, agreementID, recipientID)
}

func (s *SQLiteStore) ClaimDueAgreementReminders(ctx context.Context, scope Scope, input AgreementReminderClaimInput) ([]AgreementReminderClaim, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.ClaimDueAgreementReminders(ctx, scope, input)
	if err != nil {
		return nil, err
	}
	if len(out) == 0 {
		return out, nil
	}
	if err := s.persistMaybe(ctx); err != nil {
		return nil, err
	}
	return out, nil
}

func (s *SQLiteStore) RenewAgreementReminderLease(ctx context.Context, scope Scope, agreementID, recipientID string, input AgreementReminderLeaseRenewInput) (AgreementReminderClaim, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.RenewAgreementReminderLease(ctx, scope, agreementID, recipientID, input)
	if err != nil {
		return AgreementReminderClaim{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return AgreementReminderClaim{}, err
	}
	return out, nil
}

func (s *SQLiteStore) MarkAgreementReminderSent(ctx context.Context, scope Scope, agreementID, recipientID string, input AgreementReminderMarkInput) (AgreementReminderStateRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.MarkAgreementReminderSent(ctx, scope, agreementID, recipientID, input)
	if err != nil {
		return AgreementReminderStateRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return AgreementReminderStateRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) MarkAgreementReminderSkipped(ctx context.Context, scope Scope, agreementID, recipientID string, input AgreementReminderMarkInput) (AgreementReminderStateRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.MarkAgreementReminderSkipped(ctx, scope, agreementID, recipientID, input)
	if err != nil {
		return AgreementReminderStateRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return AgreementReminderStateRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) MarkAgreementReminderFailed(ctx context.Context, scope Scope, agreementID, recipientID string, input AgreementReminderMarkInput) (AgreementReminderStateRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.MarkAgreementReminderFailed(ctx, scope, agreementID, recipientID, input)
	if err != nil {
		return AgreementReminderStateRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return AgreementReminderStateRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) PauseAgreementReminder(ctx context.Context, scope Scope, agreementID, recipientID string, pausedAt time.Time) (AgreementReminderStateRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.PauseAgreementReminder(ctx, scope, agreementID, recipientID, pausedAt)
	if err != nil {
		return AgreementReminderStateRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return AgreementReminderStateRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) ResumeAgreementReminder(ctx context.Context, scope Scope, agreementID, recipientID string, resumedAt time.Time, nextDueAt *time.Time) (AgreementReminderStateRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.ResumeAgreementReminder(ctx, scope, agreementID, recipientID, resumedAt, nextDueAt)
	if err != nil {
		return AgreementReminderStateRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return AgreementReminderStateRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) CleanupAgreementReminderInternalErrors(ctx context.Context, scope Scope, now time.Time, limit int) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	count, err := s.InMemoryStore.CleanupAgreementReminderInternalErrors(ctx, scope, now, limit)
	if err != nil {
		return 0, err
	}
	if count == 0 {
		return 0, nil
	}
	if err := s.persistMaybe(ctx); err != nil {
		return 0, err
	}
	return count, nil
}

func (s *SQLiteStore) EnqueueOutboxMessage(ctx context.Context, scope Scope, record OutboxMessageRecord) (OutboxMessageRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.EnqueueOutboxMessage(ctx, scope, record)
	if err != nil {
		return OutboxMessageRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return OutboxMessageRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) ClaimOutboxMessages(ctx context.Context, scope Scope, input OutboxClaimInput) ([]OutboxMessageRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.ClaimOutboxMessages(ctx, scope, input)
	if err != nil {
		return nil, err
	}
	if len(out) == 0 {
		return out, nil
	}
	if err := s.persistMaybe(ctx); err != nil {
		return nil, err
	}
	return out, nil
}

func (s *SQLiteStore) MarkOutboxMessageSucceeded(ctx context.Context, scope Scope, id string, publishedAt time.Time) (OutboxMessageRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.MarkOutboxMessageSucceeded(ctx, scope, id, publishedAt)
	if err != nil {
		return OutboxMessageRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return OutboxMessageRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) MarkOutboxMessageFailed(ctx context.Context, scope Scope, id, failureReason string, nextAttemptAt *time.Time, failedAt time.Time) (OutboxMessageRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.MarkOutboxMessageFailed(ctx, scope, id, failureReason, nextAttemptAt, failedAt)
	if err != nil {
		return OutboxMessageRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return OutboxMessageRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) UpsertIntegrationCredential(ctx context.Context, scope Scope, record IntegrationCredentialRecord) (IntegrationCredentialRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.UpsertIntegrationCredential(ctx, scope, record)
	if err != nil {
		return IntegrationCredentialRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return IntegrationCredentialRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) DeleteIntegrationCredential(ctx context.Context, scope Scope, provider, userID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.InMemoryStore.DeleteIntegrationCredential(ctx, scope, provider, userID); err != nil {
		return err
	}
	return s.persistMaybe(ctx)
}

func (s *SQLiteStore) ListIntegrationCredentials(ctx context.Context, scope Scope, provider string, baseUserIDPrefix string) ([]IntegrationCredentialRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.InMemoryStore.ListIntegrationCredentials(ctx, scope, provider, baseUserIDPrefix)
}

func (s *SQLiteStore) UpsertMappingSpec(ctx context.Context, scope Scope, record MappingSpecRecord) (MappingSpecRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.UpsertMappingSpec(ctx, scope, record)
	if err != nil {
		return MappingSpecRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return MappingSpecRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) PublishMappingSpec(ctx context.Context, scope Scope, id string, expectedVersion int64, publishedAt time.Time) (MappingSpecRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.PublishMappingSpec(ctx, scope, id, expectedVersion, publishedAt)
	if err != nil {
		return MappingSpecRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return MappingSpecRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) UpsertIntegrationBinding(ctx context.Context, scope Scope, record IntegrationBindingRecord) (IntegrationBindingRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.UpsertIntegrationBinding(ctx, scope, record)
	if err != nil {
		return IntegrationBindingRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return IntegrationBindingRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) CreateIntegrationSyncRun(ctx context.Context, scope Scope, record IntegrationSyncRunRecord) (IntegrationSyncRunRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.CreateIntegrationSyncRun(ctx, scope, record)
	if err != nil {
		return IntegrationSyncRunRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return IntegrationSyncRunRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) UpdateIntegrationSyncRunStatus(ctx context.Context, scope Scope, id, status, lastError, cursor string, completedAt *time.Time, expectedVersion int64) (IntegrationSyncRunRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.UpdateIntegrationSyncRunStatus(ctx, scope, id, status, lastError, cursor, completedAt, expectedVersion)
	if err != nil {
		return IntegrationSyncRunRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return IntegrationSyncRunRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) UpsertIntegrationCheckpoint(ctx context.Context, scope Scope, record IntegrationCheckpointRecord) (IntegrationCheckpointRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.UpsertIntegrationCheckpoint(ctx, scope, record)
	if err != nil {
		return IntegrationCheckpointRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return IntegrationCheckpointRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) CreateIntegrationConflict(ctx context.Context, scope Scope, record IntegrationConflictRecord) (IntegrationConflictRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.CreateIntegrationConflict(ctx, scope, record)
	if err != nil {
		return IntegrationConflictRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return IntegrationConflictRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) ResolveIntegrationConflict(ctx context.Context, scope Scope, id, status, resolutionJSON, resolvedByUserID string, resolvedAt time.Time, expectedVersion int64) (IntegrationConflictRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.ResolveIntegrationConflict(ctx, scope, id, status, resolutionJSON, resolvedByUserID, resolvedAt, expectedVersion)
	if err != nil {
		return IntegrationConflictRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return IntegrationConflictRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) AppendIntegrationChangeEvent(ctx context.Context, scope Scope, record IntegrationChangeEventRecord) (IntegrationChangeEventRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.AppendIntegrationChangeEvent(ctx, scope, record)
	if err != nil {
		return IntegrationChangeEventRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return IntegrationChangeEventRecord{}, err
	}
	return out, nil
}

func (s *SQLiteStore) ClaimIntegrationMutation(ctx context.Context, scope Scope, idempotencyKey string, firstSeenAt time.Time) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	claimed, err := s.InMemoryStore.ClaimIntegrationMutation(ctx, scope, idempotencyKey, firstSeenAt)
	if err != nil {
		return false, err
	}
	if !claimed {
		return false, nil
	}
	if err := s.persistMaybe(ctx); err != nil {
		return false, err
	}
	return true, nil
}

func (s *SQLiteStore) UpsertPlacementRun(ctx context.Context, scope Scope, record PlacementRunRecord) (PlacementRunRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out, err := s.InMemoryStore.UpsertPlacementRun(ctx, scope, record)
	if err != nil {
		return PlacementRunRecord{}, err
	}
	if err := s.persistMaybe(ctx); err != nil {
		return PlacementRunRecord{}, err
	}
	return out, nil
}

func ensureDocumentMap(in map[string]DocumentRecord) map[string]DocumentRecord {
	if in == nil {
		return map[string]DocumentRecord{}
	}
	return in
}

func ensureAgreementMap(in map[string]AgreementRecord) map[string]AgreementRecord {
	if in == nil {
		return map[string]AgreementRecord{}
	}
	return in
}

func ensureDraftMap(in map[string]DraftRecord) map[string]DraftRecord {
	if in == nil {
		return map[string]DraftRecord{}
	}
	return in
}

func ensureParticipantMap(in map[string]ParticipantRecord) map[string]ParticipantRecord {
	if in == nil {
		return map[string]ParticipantRecord{}
	}
	return in
}

func ensureFieldDefinitionMap(in map[string]FieldDefinitionRecord) map[string]FieldDefinitionRecord {
	if in == nil {
		return map[string]FieldDefinitionRecord{}
	}
	return in
}

func ensureFieldInstanceMap(in map[string]FieldInstanceRecord) map[string]FieldInstanceRecord {
	if in == nil {
		return map[string]FieldInstanceRecord{}
	}
	return in
}

func ensureRecipientMap(in map[string]RecipientRecord) map[string]RecipientRecord {
	if in == nil {
		return map[string]RecipientRecord{}
	}
	return in
}

func ensureFieldMap(in map[string]FieldRecord) map[string]FieldRecord {
	if in == nil {
		return map[string]FieldRecord{}
	}
	return in
}

func ensureSigningTokenMap(in map[string]SigningTokenRecord) map[string]SigningTokenRecord {
	if in == nil {
		return map[string]SigningTokenRecord{}
	}
	return in
}

func ensureSignatureArtifactMap(in map[string]SignatureArtifactRecord) map[string]SignatureArtifactRecord {
	if in == nil {
		return map[string]SignatureArtifactRecord{}
	}
	return in
}

func ensureSignerProfileMap(in map[string]SignerProfileRecord) map[string]SignerProfileRecord {
	if in == nil {
		return map[string]SignerProfileRecord{}
	}
	return in
}

func ensureSavedSignerSignatureMap(in map[string]SavedSignerSignatureRecord) map[string]SavedSignerSignatureRecord {
	if in == nil {
		return map[string]SavedSignerSignatureRecord{}
	}
	return in
}

func ensureFieldValueMap(in map[string]FieldValueRecord) map[string]FieldValueRecord {
	if in == nil {
		return map[string]FieldValueRecord{}
	}
	return in
}

func ensureAuditEventMap(in map[string]AuditEventRecord) map[string]AuditEventRecord {
	if in == nil {
		return map[string]AuditEventRecord{}
	}
	return in
}

func ensureAgreementArtifactMap(in map[string]AgreementArtifactRecord) map[string]AgreementArtifactRecord {
	if in == nil {
		return map[string]AgreementArtifactRecord{}
	}
	return in
}

func ensureEmailLogMap(in map[string]EmailLogRecord) map[string]EmailLogRecord {
	if in == nil {
		return map[string]EmailLogRecord{}
	}
	return in
}

func ensureJobRunMap(in map[string]JobRunRecord) map[string]JobRunRecord {
	if in == nil {
		return map[string]JobRunRecord{}
	}
	return in
}

func ensureGoogleImportRunMap(in map[string]GoogleImportRunRecord) map[string]GoogleImportRunRecord {
	if in == nil {
		return map[string]GoogleImportRunRecord{}
	}
	return in
}

func ensureDocumentRemediationLeaseMap(in map[string]DocumentRemediationLeaseRecord) map[string]DocumentRemediationLeaseRecord {
	if in == nil {
		return map[string]DocumentRemediationLeaseRecord{}
	}
	return in
}

func ensureRemediationDispatchMap(in map[string]RemediationDispatchRecord) map[string]RemediationDispatchRecord {
	if in == nil {
		return map[string]RemediationDispatchRecord{}
	}
	return in
}

func ensureAgreementReminderStateMap(in map[string]AgreementReminderStateRecord) map[string]AgreementReminderStateRecord {
	if in == nil {
		return map[string]AgreementReminderStateRecord{}
	}
	out := make(map[string]AgreementReminderStateRecord, len(in))
	for key, record := range in {
		record.TenantID = normalizeID(record.TenantID)
		record.OrgID = normalizeID(record.OrgID)
		record.AgreementID = normalizeID(record.AgreementID)
		record.RecipientID = normalizeID(record.RecipientID)

		normalizedKey := strings.TrimSpace(key)
		if record.TenantID != "" && record.OrgID != "" && record.AgreementID != "" && record.RecipientID != "" {
			normalizedKey = strings.Join([]string{
				record.TenantID,
				record.OrgID,
				record.AgreementID,
				record.RecipientID,
			}, "|")
		}
		if normalizedKey == "" {
			continue
		}
		if existing, exists := out[normalizedKey]; exists && !preferReminderStateRecord(record, existing) {
			continue
		}
		out[normalizedKey] = record
	}
	return out
}

func preferReminderStateRecord(candidate, existing AgreementReminderStateRecord) bool {
	if candidate.UpdatedAt.After(existing.UpdatedAt) {
		return true
	}
	if existing.UpdatedAt.After(candidate.UpdatedAt) {
		return false
	}
	if candidate.CreatedAt.After(existing.CreatedAt) {
		return true
	}
	if existing.CreatedAt.After(candidate.CreatedAt) {
		return false
	}
	candidateID := strings.TrimSpace(candidate.ID)
	existingID := strings.TrimSpace(existing.ID)
	if existingID == "" {
		return candidateID != ""
	}
	if candidateID == "" {
		return false
	}
	return candidateID < existingID
}

func ensureOutboxMessageMap(in map[string]OutboxMessageRecord) map[string]OutboxMessageRecord {
	if in == nil {
		return map[string]OutboxMessageRecord{}
	}
	return in
}

func ensureIntegrationCredentialMap(in map[string]IntegrationCredentialRecord) map[string]IntegrationCredentialRecord {
	if in == nil {
		return map[string]IntegrationCredentialRecord{}
	}
	return in
}

func ensureMappingSpecMap(in map[string]MappingSpecRecord) map[string]MappingSpecRecord {
	if in == nil {
		return map[string]MappingSpecRecord{}
	}
	return in
}

func ensureIntegrationBindingMap(in map[string]IntegrationBindingRecord) map[string]IntegrationBindingRecord {
	if in == nil {
		return map[string]IntegrationBindingRecord{}
	}
	return in
}

func ensureIntegrationSyncRunMap(in map[string]IntegrationSyncRunRecord) map[string]IntegrationSyncRunRecord {
	if in == nil {
		return map[string]IntegrationSyncRunRecord{}
	}
	return in
}

func ensureIntegrationCheckpointMap(in map[string]IntegrationCheckpointRecord) map[string]IntegrationCheckpointRecord {
	if in == nil {
		return map[string]IntegrationCheckpointRecord{}
	}
	return in
}

func ensureIntegrationConflictMap(in map[string]IntegrationConflictRecord) map[string]IntegrationConflictRecord {
	if in == nil {
		return map[string]IntegrationConflictRecord{}
	}
	return in
}

func ensureIntegrationChangeEventMap(in map[string]IntegrationChangeEventRecord) map[string]IntegrationChangeEventRecord {
	if in == nil {
		return map[string]IntegrationChangeEventRecord{}
	}
	return in
}

func ensurePlacementRunMap(in map[string]PlacementRunRecord) map[string]PlacementRunRecord {
	if in == nil {
		return map[string]PlacementRunRecord{}
	}
	return in
}

func ensureTimeMap(in map[string]time.Time) map[string]time.Time {
	if in == nil {
		return map[string]time.Time{}
	}
	return in
}

func ensureStringMap(in map[string]string) map[string]string {
	if in == nil {
		return map[string]string{}
	}
	return in
}

package admin

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	admindata "github.com/goliatone/go-admin/data"
	"io/fs"
	"maps"
	"slices"
	"time"

	"github.com/uptrace/bun"
)

const defaultSettingsDocumentMaxBytes = 64 << 10

// SettingsDocumentRecord is a portable named document. The primary key has no
// nullable components, so guarded creation has the same semantics on both DBs.
type SettingsDocumentRecord struct {
	bun.BaseModel `bun:"table:admin_settings_documents"`
	Namespace     string          `bun:",pk,notnull"`
	Scope         string          `bun:",pk,notnull"`
	UserID        string          `bun:",pk,notnull"`
	Revision      int64           `bun:",notnull"`
	Overrides     json.RawMessage `bun:"type:jsonb,notnull"`
	UpdatedAt     time.Time       `bun:",notnull"`
}

// EnsureSettingsDocumentSchema is an explicit host migration/bootstrap seam.
// Constructors never create this table: durable applications own its lifecycle.
func EnsureSettingsDocumentSchema(ctx context.Context, db bun.IDB) error {
	if db == nil {
		return serviceNotConfiguredDomainError("settings db", nil)
	}
	migration, err := fs.ReadFile(GetSettingsDocumentMigrationsFS(), "0001_settings_documents.up.sql")
	if err != nil {
		return err
	}
	_, err = db.ExecContext(ctx, string(migration))
	return err
}

func (a *BunSettingsAdapter) ReadDocument(ctx context.Context, target SettingsDocumentTarget) (SettingsDocumentSnapshot, error) {
	if a == nil {
		return SettingsDocumentSnapshot{}, serviceNotConfiguredDomainError("settings bun adapter", nil)
	}
	return a.ReadDocumentWithDB(ctx, a.db, target)
}
func (a *BunSettingsAdapter) ReadDocumentWithDB(ctx context.Context, db bun.IDB, target SettingsDocumentTarget) (SettingsDocumentSnapshot, error) {
	if err := target.Validate(); err != nil {
		return SettingsDocumentSnapshot{}, err
	}
	if err := ctx.Err(); err != nil {
		return SettingsDocumentSnapshot{}, err
	}
	if a == nil || db == nil {
		return SettingsDocumentSnapshot{}, serviceNotConfiguredDomainError("settings db", nil)
	}
	record := new(SettingsDocumentRecord)
	err := db.NewSelect().Model(record).Where("namespace = ? AND scope = ? AND user_id = ?", target.Namespace, string(target.Scope), target.UserID).Scan(ctx)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return SettingsDocumentSnapshot{}, err
	}
	if err == nil && len(record.Overrides) == 0 {
		return SettingsDocumentSnapshot{}, validationDomainError("invalid stored settings document", nil)
	}
	if record.Revision < 0 {
		return SettingsDocumentSnapshot{}, validationDomainError("invalid stored settings revision", nil)
	}
	a.mu.RLock()
	defs := cloneSettingDefinitions(a.definitions)
	limit := a.documentMaxBytes
	a.mu.RUnlock()
	return documentSnapshot(target, record.Revision, record.Overrides, defs, limit)
}
func (a *BunSettingsAdapter) ApplyDocument(ctx context.Context, mutation SettingsDocumentMutation) (SettingsDocumentSnapshot, error) {
	if a == nil || a.db == nil {
		return SettingsDocumentSnapshot{}, serviceNotConfiguredDomainError("settings db", nil)
	}
	var snapshot SettingsDocumentSnapshot
	err := a.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		var err error
		snapshot, err = a.ApplyDocumentTx(ctx, tx, mutation)
		return err
	})
	if err != nil {
		return SettingsDocumentSnapshot{}, err
	}
	return snapshot, nil
}
func (a *BunSettingsAdapter) ApplyDocumentTx(ctx context.Context, tx bun.Tx, mutation SettingsDocumentMutation) (SettingsDocumentSnapshot, error) {
	if tx.Tx == nil {
		return SettingsDocumentSnapshot{}, serviceNotConfiguredDomainError("settings transaction", nil)
	}
	if err := mutation.Validate(); err != nil {
		return SettingsDocumentSnapshot{}, err
	}
	if err := ctx.Err(); err != nil {
		return SettingsDocumentSnapshot{}, err
	}
	if a == nil {
		return SettingsDocumentSnapshot{}, serviceNotConfiguredDomainError("settings adapter", nil)
	}
	a.mu.RLock()
	defs := cloneSettingDefinitions(a.definitions)
	limit := a.documentMaxBytes
	a.mu.RUnlock()
	if err := validateDocumentMutationValues(ctx, defs, mutation); err != nil {
		return SettingsDocumentSnapshot{}, err
	}
	current, err := a.ReadDocumentWithDB(ctx, tx, mutation.Target)
	if err != nil {
		return SettingsDocumentSnapshot{}, err
	}
	if current.Revision != mutation.ExpectedRevision {
		return SettingsDocumentSnapshot{}, &SettingsRevisionConflict{ExpectedRevision: mutation.ExpectedRevision}
	}
	before, raw, revision, err := prepareSettingsDocumentPatch(current, mutation, limit)
	if err != nil {
		return SettingsDocumentSnapshot{}, err
	}
	target := mutation.Target
	record := &SettingsDocumentRecord{Namespace: target.Namespace, Scope: string(target.Scope), UserID: target.UserID, Revision: revision, Overrides: raw, UpdatedAt: time.Now().UTC()}
	if casErr := applySettingsDocumentCAS(ctx, tx, record, mutation.ExpectedRevision); casErr != nil {
		return SettingsDocumentSnapshot{}, casErr
	}
	snapshot, err := documentSnapshot(target, revision, raw, defs, limit)
	if err != nil {
		return SettingsDocumentSnapshot{}, err
	}
	snapshot.ChangedKeys, err = changedSettingsDocumentKeys(before, raw)
	if err != nil {
		return SettingsDocumentSnapshot{}, err
	}
	return snapshot, nil
}

var _ TransactionalSettingsDocumentAdapter = (*BunSettingsAdapter)(nil)
var _ ContextSettingsAdapter = (*BunSettingsAdapter)(nil)

// GetSettingsDocumentMigrationsFS exposes portable up/down migrations. Hosts
// using SkipSchemaEnsure install them through their own migration runner.
func GetSettingsDocumentMigrationsFS() fs.FS { return admindata.SettingsDocumentMigrations() }

func validateDocumentMutationValues(ctx context.Context, defs map[string]SettingDefinition, mutation SettingsDocumentMutation) error {
	errs := SettingsValidationErrors{Fields: map[string]string{}, Scope: mutation.Target.Scope}
	for key, value := range mutation.Values {
		def, ok := defs[key]
		if !ok {
			errs.Fields[key] = "unknown setting"
			continue
		}
		if !scopeAllowed(def, mutation.Target.Scope) {
			errs.Fields[key] = "scope not allowed"
			continue
		}
		if err := validateSetting(ctx, def, value); err != nil {
			errs.Fields[key] = err.Error()
		}
	}
	for _, key := range mutation.Reset {
		def, ok := defs[key]
		if !ok {
			errs.Fields[key] = "unknown setting"
			continue
		}
		if !scopeAllowed(def, mutation.Target.Scope) {
			errs.Fields[key] = "scope not allowed"
		}
	}
	if errs.hasErrors() {
		return errs
	}

	return nil
}

func applySettingsDocumentCAS(ctx context.Context, tx bun.Tx, record *SettingsDocumentRecord, expectedRevision int64) error {
	var result sql.Result
	var err error
	if expectedRevision == 0 {
		result, err = tx.NewInsert().Model(record).On("CONFLICT (namespace, scope, user_id) DO UPDATE").Set("revision = EXCLUDED.revision").Set("overrides = EXCLUDED.overrides").Set("updated_at = EXCLUDED.updated_at").Where("settings_document_record.revision = ?", expectedRevision).Exec(ctx)
	} else {
		result, err = tx.NewUpdate().Model(record).Column("revision", "overrides", "updated_at").WherePK().Where("revision = ?", expectedRevision).Exec(ctx)
	}
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected != 1 {
		return &SettingsRevisionConflict{ExpectedRevision: expectedRevision}
	}

	return nil
}

func changedSettingsDocumentKeys(before, raw []byte) ([]string, error) {
	var keys []string
	oldValues := map[string]json.RawMessage{}
	newValues := map[string]json.RawMessage{}
	if err := json.Unmarshal(before, &oldValues); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(raw, &newValues); err != nil {
		return nil, err
	}
	for key, value := range newValues {
		if !bytes.Equal(oldValues[key], value) {
			keys = append(keys, key)
		}
	}
	for key := range oldValues {
		if _, ok := newValues[key]; !ok {
			keys = append(keys, key)
		}
	}
	slices.Sort(keys)

	return keys, nil
}

func prepareSettingsDocumentPatch(current SettingsDocumentSnapshot, mutation SettingsDocumentMutation, limit int) ([]byte, []byte, int64, error) {
	before, err := json.Marshal(current.Overrides)
	if err != nil {
		return nil, nil, 0, err
	}
	maps.Copy(current.Overrides, mutation.Values)
	for _, key := range mutation.Reset {
		delete(current.Overrides, key)
	}
	raw, err := json.Marshal(current.Overrides)
	if err != nil {
		return nil, nil, 0, err
	}
	_, raw, err = canonicalSettingsDocument(raw, limit)
	if err != nil {
		return nil, nil, 0, err
	}
	revision := current.Revision
	if mutation.Touch || !bytes.Equal(before, raw) {
		revision++
	}

	return before, raw, revision, nil
}

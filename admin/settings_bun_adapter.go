package admin

import (
	"context"
	"database/sql"
	"encoding/json"
	"maps"
	"slices"
	"sync"
	"time"

	opts "github.com/goliatone/go-options"
	openapi "github.com/goliatone/go-options/schema/openapi"
	repository "github.com/goliatone/go-repository-bun"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
)

type SettingRecord struct {
	bun.BaseModel `bun:"table:admin_settings"`

	ID        uuid.UUID       `bun:",pk,type:uuid" json:"id"`
	Key       string          `bun:",notnull,unique:admin_settings_scope" json:"key"`
	Scope     string          `bun:",notnull,unique:admin_settings_scope" json:"scope"`
	UserID    string          `bun:",nullzero,unique:admin_settings_scope" json:"user_id"`
	Value     json.RawMessage `bun:"type:jsonb,nullzero" json:"value"`
	CreatedAt time.Time       `bun:",nullzero,notnull,default:current_timestamp" json:"created_at"`
	UpdatedAt time.Time       `bun:",nullzero,notnull,default:current_timestamp" json:"updated_at"`
}

// BunSettingsAdapter persists settings using go-repository-bun and resolves
// values through go-options to preserve provenance and validation surface.
type BunSettingsAdapter struct {
	mu               sync.RWMutex
	db               *bun.DB
	documentMaxBytes int
	repo             repository.Repository[*SettingRecord]
	definitions      map[string]SettingDefinition
	schemaOpts       []opts.Option
}

// BunSettingsAdapterConfig controls legacy startup DDL and document size bounds.
// Named document schema is always explicitly installed by the host.
type BunSettingsAdapterConfig struct {
	SkipSchemaEnsure bool
	DocumentMaxBytes int
}

func NewBunSettingsAdapter(db *bun.DB, repoOptions ...repository.Option) (*BunSettingsAdapter, error) {
	return NewBunSettingsAdapterWithConfig(db, BunSettingsAdapterConfig{}, repoOptions...)
}

func NewBunSettingsAdapterWithConfig(db *bun.DB, config BunSettingsAdapterConfig, repoOptions ...repository.Option) (*BunSettingsAdapter, error) {
	if db == nil {
		return nil, serviceNotConfiguredDomainError("settings bun db", map[string]any{"component": "settings"})
	}
	if config.DocumentMaxBytes < 0 {
		return nil, validationDomainError("invalid settings document size limit", nil)
	}
	if config.DocumentMaxBytes == 0 {
		config.DocumentMaxBytes = defaultSettingsDocumentMaxBytes
	}
	if !config.SkipSchemaEnsure {
		if err := ensureSettingsSchema(db); err != nil {
			return nil, err
		}
	}
	handlers := repository.ModelHandlers[*SettingRecord]{
		NewRecord: func() *SettingRecord { return &SettingRecord{} },
		GetID: func(r *SettingRecord) uuid.UUID {
			return r.ID
		},
		SetID: func(r *SettingRecord, id uuid.UUID) {
			r.ID = id
		},
		GetIdentifier: func() string { return "key" },
		GetIdentifierValue: func(r *SettingRecord) string {
			return r.Key
		},
	}
	return &BunSettingsAdapter{
		db:               db,
		documentMaxBytes: config.DocumentMaxBytes,
		repo:             newSettingsRepository(db, handlers, repoOptions...),
		definitions:      map[string]SettingDefinition{},
		schemaOpts:       []opts.Option{opts.WithScopeSchema(true), openapi.Option()},
	}, nil
}

// WithSchemaOptions appends schema merge options used during resolution.
func (a *BunSettingsAdapter) WithSchemaOptions(options ...opts.Option) {
	if len(options) == 0 {
		return
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	a.schemaOpts = append(a.schemaOpts, options...)
}

// RegisterDefinition records a setting definition.
func (a *BunSettingsAdapter) RegisterDefinition(def SettingDefinition) {
	if def.Key == "" {
		return
	}
	if len(def.AllowedScopes) == 0 {
		def.AllowedScopes = []SettingsScope{SettingsScopeSystem, SettingsScopeSite, SettingsScopeUser}
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	a.definitions[def.Key] = def
}

// Definitions returns sorted definitions.
func (a *BunSettingsAdapter) Definitions() []SettingDefinition {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return sortedSettingDefinitions(a.definitions)
}

// Apply validates and persists scoped settings.
func (a *BunSettingsAdapter) Apply(ctx context.Context, bundle SettingsBundle) error {
	if a == nil || a.repo == nil {
		return FeatureDisabledError{Feature: string(FeatureSettings)}
	}
	scope := bundle.Scope
	if scope == "" {
		scope = SettingsScopeSite
	}
	if scope == SettingsScopeUser && bundle.UserID == "" {
		return requiredFieldDomainError("user id", map[string]any{"scope": string(SettingsScopeUser)})
	}

	a.mu.RLock()
	defs := cloneSettingDefinitions(a.definitions)
	a.mu.RUnlock()

	sanitized, err := validateSettingsBundle(ctx, defs, scope, bundle.Values)
	if err != nil {
		return err
	}
	return a.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		keys := make([]string, 0, len(sanitized))
		for key := range sanitized {
			keys = append(keys, key)
		}
		slices.Sort(keys)
		for _, key := range keys {
			if err := a.upsertValueTx(ctx, tx, key, scope, bundle.UserID, sanitized[key]); err != nil {
				return err
			}
		}
		return nil
	})
}

// Resolve returns a setting value with provenance.
func (a *BunSettingsAdapter) Resolve(key, userID string) ResolvedSetting {
	value, err := a.ResolveContext(context.Background(), key, userID)
	if err != nil {
		return ResolvedSetting{Key: key, Scope: SettingsScopeDefault, Provenance: string(SettingsScopeDefault)}
	}
	return value
}

func (a *BunSettingsAdapter) ResolveContext(ctx context.Context, key, userID string) (ResolvedSetting, error) {
	values, err := a.ResolveAllContext(ctx, userID)
	if err != nil {
		return ResolvedSetting{}, err
	}
	value, ok := values[key]
	if !ok {
		return ResolvedSetting{}, validationDomainError("unknown setting", nil)
	}
	return value, nil
}

// ResolveAll retains the legacy error-suppressing contract. Durable callers
// should use ResolveAllContext or named document snapshots.
func (a *BunSettingsAdapter) ResolveAll(userID string) map[string]ResolvedSetting {
	values, err := a.ResolveAllContext(context.Background(), userID)
	if err != nil {
		return map[string]ResolvedSetting{}
	}
	return values
}

func (a *BunSettingsAdapter) ResolveAllContext(ctx context.Context, userID string) (map[string]ResolvedSetting, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	values, stack, err := a.resolveAllOptions(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := map[string]ResolvedSetting{}
	for key, def := range values.definitions {
		val, trace, err := stack.ResolveWithTrace(key)
		if err != nil {
			return nil, err
		}
		out[key] = resolvedFromTrace(def, key, val, trace, nil)
	}
	return out, nil
}

// Schema returns the go-options schema document for UI renderers.
func (a *BunSettingsAdapter) Schema(ctx context.Context, userID string) (opts.SchemaDocument, error) {
	_, optsStack, err := a.resolveAllOptions(ctx, userID)
	if err != nil {
		return opts.SchemaDocument{}, err
	}
	if optsStack == nil {
		return opts.SchemaDocument{}, nil
	}
	return optsStack.Schema()
}

func (a *BunSettingsAdapter) resolveAllOptions(ctx context.Context, userID string) (settingsSnapshot, *opts.Options[map[string]any], error) {
	if a == nil || a.repo == nil {
		return settingsSnapshot{}, nil, FeatureDisabledError{Feature: string(FeatureSettings)}
	}
	records, err := listAllSettingsRecords(ctx, a.repo)
	if err != nil {
		return settingsSnapshot{}, nil, err
	}
	a.mu.RLock()
	defs := cloneSettingDefinitions(a.definitions)
	schemaOpts := append([]opts.Option{}, a.schemaOpts...)
	a.mu.RUnlock()
	values := settingsSnapshot{
		system:      map[string]any{},
		site:        map[string]any{},
		user:        map[string]map[string]any{},
		definitions: defs,
	}
	for _, rec := range records {
		decoded, decodeErr := decodeSettingValue(rec.Value)
		if decodeErr != nil {
			return settingsSnapshot{}, nil, decodeErr
		}
		scope := SettingsScope(rec.Scope)
		switch scope {
		case SettingsScopeSystem:
			values.system[rec.Key] = decoded
		case SettingsScopeSite:
			values.site[rec.Key] = decoded
		case SettingsScopeUser:
			if values.user[rec.UserID] == nil {
				values.user[rec.UserID] = map[string]any{}
			}
			values.user[rec.UserID][rec.Key] = decoded
		}
	}
	optsStack, err := buildOptionsStack(values.definitions, values.system, values.site, values.user, schemaOpts, userID)
	return values, optsStack, err
}

func (a *BunSettingsAdapter) upsertValueTx(ctx context.Context, tx bun.Tx, key string, scope SettingsScope, userID string, value any) error {
	raw, err := json.Marshal(value)
	if err != nil {
		return err
	}
	criteria := []repository.SelectCriteria{
		repository.SelectBy("key", "=", key),
		repository.SelectBy("scope", "=", string(scope)),
		settingsLegacySelectJSON,
	}
	targetUser := ""
	if scope == SettingsScopeUser {
		targetUser = userID
	}
	if targetUser == "" {
		criteria = append(criteria, repository.SelectIsNull("user_id"))
	} else {
		criteria = append(criteria, repository.SelectBy("user_id", "=", targetUser))
	}
	record, err := a.repo.GetTx(ctx, tx, criteria...)
	switch {
	case err == nil:
		record.Value = raw
		record.Scope = string(scope)
		record.UserID = targetUser
		var criteria []repository.UpdateCriteria
		if a.db.Dialect().Name() == dialect.SQLite {
			// Store JSON bytes as BLOB to avoid SQLite JSONB numeric affinity. This also
			// repairs old numeric rows on edit without changing the schema/public type.
			criteria = append(criteria, func(q *bun.UpdateQuery) *bun.UpdateQuery { return q.Value("value", "?", raw) })
		}
		_, err = a.repo.UpdateTx(ctx, tx, record, criteria...)
		return err
	case repository.IsRecordNotFound(err):
		var criteria []repository.InsertCriteria
		if a.db.Dialect().Name() == dialect.SQLite {
			criteria = append(criteria, func(q *bun.InsertQuery) *bun.InsertQuery { return q.Value("value", "?", raw) })
		}
		_, err = a.repo.CreateTx(ctx, tx, &SettingRecord{
			Key:    key,
			Scope:  string(scope),
			UserID: targetUser,
			Value:  raw,
		}, criteria...)
		return err
	default:
		return err
	}
}

type settingsSnapshot struct {
	system      map[string]any
	site        map[string]any
	user        map[string]map[string]any
	definitions map[string]SettingDefinition
}

func cloneSettingDefinitions(defs map[string]SettingDefinition) map[string]SettingDefinition {
	out := make(map[string]SettingDefinition, len(defs))
	maps.Copy(out, defs)
	return out
}

func newSettingsRepository(
	db *bun.DB,
	handlers repository.ModelHandlers[*SettingRecord],
	repoOptions ...repository.Option,
) repository.Repository[*SettingRecord] {
	return repository.MustNewRepositoryWithConfig[*SettingRecord](db, handlers, repoOptions)
}

func listAllSettingsRecords(ctx context.Context, repo repository.Repository[*SettingRecord]) ([]*SettingRecord, error) {
	if repo == nil {
		return nil, nil
	}
	const pageSize = 200
	offset := 0
	out := make([]*SettingRecord, 0, pageSize)
	for {
		records, total, err := repo.List(
			ctx,
			settingsLegacySelectJSON,
			repository.SelectOrderAsc("id"),
			repository.SelectPaginate(pageSize, offset),
		)
		if err != nil {
			return nil, err
		}
		if len(records) == 0 {
			break
		}
		out = append(out, records...)
		offset += len(records)
		if total > 0 && offset >= total {
			break
		}
		if len(records) < pageSize {
			break
		}
	}
	return out, nil
}

func decodeSettingValue(raw json.RawMessage) (any, error) {
	if len(raw) == 0 {
		return nil, nil
	}
	var out any
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func newSettingsDB() (*bun.DB, error) {
	sqldb, err := sql.Open(sqliteshim.ShimName, ":memory:")
	if err != nil {
		return nil, err
	}
	sqldb.SetMaxOpenConns(1)
	sqldb.SetMaxIdleConns(1)
	return bun.NewDB(sqldb, sqlitedialect.New()), nil
}

func ensureSettingsSchema(db *bun.DB) error {
	ctx := context.Background()
	if _, err := db.NewCreateTable().IfNotExists().Model((*SettingRecord)(nil)).Exec(ctx); err != nil {
		return err
	}
	if _, err := db.NewCreateIndex().
		IfNotExists().
		Model((*SettingRecord)(nil)).
		Index("admin_settings_scope_idx").
		Column("key", "scope", "user_id").
		Unique().
		Exec(ctx); err != nil {
		return err
	}
	return nil
}

// Old SQLite JSONB columns may already contain INTEGER/REAL storage classes.
// Cast only the read projection, preserving the public json.RawMessage field.
func settingsLegacySelectJSON(q *bun.SelectQuery) *bun.SelectQuery {
	if q.DB().Dialect().Name() == dialect.SQLite {
		return q.Column("id", "key", "scope", "user_id", "created_at", "updated_at").ColumnExpr("CAST(?TableAlias.value AS TEXT) AS value")
	}
	return q
}

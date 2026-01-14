package admin

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"sync"
	"time"

	opts "github.com/goliatone/go-options"
	openapi "github.com/goliatone/go-options/schema/openapi"
	repository "github.com/goliatone/go-repository-bun"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
)

type SettingRecord struct {
	bun.BaseModel `bun:"table:admin_settings"`

	ID        uuid.UUID       `bun:",pk,type:uuid"`
	Key       string          `bun:",notnull,unique:admin_settings_scope"`
	Scope     string          `bun:",notnull,unique:admin_settings_scope"`
	UserID    string          `bun:",nullzero,unique:admin_settings_scope"`
	Value     json.RawMessage `bun:"type:jsonb,nullzero"`
	CreatedAt time.Time       `bun:",nullzero,notnull,default:current_timestamp"`
	UpdatedAt time.Time       `bun:",nullzero,notnull,default:current_timestamp"`
}

// BunSettingsAdapter persists settings using go-repository-bun and resolves
// values through go-options to preserve provenance and validation surface.
type BunSettingsAdapter struct {
	mu          sync.RWMutex
	repo        repository.Repository[*SettingRecord]
	definitions map[string]SettingDefinition
	schemaOpts  []opts.Option
}

func NewBunSettingsAdapter(db *bun.DB, opts ...repository.Option) (*BunSettingsAdapter, error) {
	if db == nil {
		return nil, errors.New("settings: bun DB is required")
	}
	if err := ensureSettingsSchema(db); err != nil {
		return nil, err
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
		repo:        repository.MustNewRepositoryWithOptions(db, handlers, opts...),
		definitions: map[string]SettingDefinition{},
		schemaOpts:  []opts.Option{opts.WithScopeSchema(true), openapi.Option()},
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
		return errors.New("user id required for user scope settings")
	}

	a.mu.RLock()
	defs := cloneSettingDefinitions(a.definitions)
	a.mu.RUnlock()

	errs := SettingsValidationErrors{Fields: map[string]string{}, Scope: scope}
	sanitized := map[string]any{}
	for key, val := range bundle.Values {
		def, ok := defs[key]
		if !ok {
			errs.Fields[key] = "unknown setting"
			continue
		}
		if !scopeAllowed(def, scope) {
			errs.Fields[key] = "scope not allowed"
			continue
		}
		if err := validateSetting(ctx, def, val); err != nil {
			errs.Fields[key] = err.Error()
			continue
		}
		sanitized[key] = val
	}
	if errs.hasErrors() {
		return errs
	}
	for key, val := range sanitized {
		if err := a.upsertValue(ctx, key, scope, bundle.UserID, val); err != nil {
			return err
		}
	}
	return nil
}

// Resolve returns a setting value with provenance.
func (a *BunSettingsAdapter) Resolve(key, userID string) ResolvedSetting {
	values, optsStack, err := a.resolveAllOptions(context.Background(), userID)
	if err != nil || optsStack == nil {
		return ResolvedSetting{Key: key, Scope: SettingsScopeDefault, Provenance: string(SettingsScopeDefault)}
	}
	def := values.definitions[key]
	val, trace, traceErr := optsStack.ResolveWithTrace(key)
	return resolvedFromTrace(def, key, val, trace, traceErr)
}

// ResolveAll resolves every definition for the given user.
func (a *BunSettingsAdapter) ResolveAll(userID string) map[string]ResolvedSetting {
	values, optsStack, err := a.resolveAllOptions(context.Background(), userID)
	if err != nil || optsStack == nil {
		return map[string]ResolvedSetting{}
	}
	out := map[string]ResolvedSetting{}
	for key, def := range values.definitions {
		val, trace, traceErr := optsStack.ResolveWithTrace(key)
		out[key] = resolvedFromTrace(def, key, val, trace, traceErr)
	}
	return out
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
	records, _, err := a.repo.List(ctx)
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
		decoded, err := decodeSettingValue(rec.Value)
		if err != nil {
			return settingsSnapshot{}, nil, err
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

func (a *BunSettingsAdapter) upsertValue(ctx context.Context, key string, scope SettingsScope, userID string, value any) error {
	raw, err := json.Marshal(value)
	if err != nil {
		return err
	}
	criteria := []repository.SelectCriteria{
		repository.SelectBy("key", "=", key),
		repository.SelectBy("scope", "=", string(scope)),
	}
	targetUser := ""
	if scope == SettingsScopeUser {
		targetUser = userID
	}
	criteria = append(criteria, repository.SelectBy("user_id", "=", targetUser))
	record, err := a.repo.Get(ctx, criteria...)
	switch {
	case err == nil:
		record.Value = raw
		record.Scope = string(scope)
		record.UserID = targetUser
		_, err = a.repo.Update(ctx, record)
		return err
	case repository.IsRecordNotFound(err):
		_, err = a.repo.Create(ctx, &SettingRecord{
			Key:    key,
			Scope:  string(scope),
			UserID: targetUser,
			Value:  raw,
		})
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
	for k, v := range defs {
		out[k] = v
	}
	return out
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

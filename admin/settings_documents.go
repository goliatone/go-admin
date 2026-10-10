package admin

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"math"
	"strings"
	"unicode/utf8"

	"github.com/uptrace/bun"
)

// SettingsDocumentTarget identifies an independent application-owned document.
// Namespace is bound by the host (for example "crm.company"), never inferred
// from caller input. Scope describes the document, not an inheritance request.
type SettingsDocumentTarget struct {
	Namespace string        `json:"namespace"`
	Scope     SettingsScope `json:"scope"`
	UserID    string        `json:"user_id,omitempty"`
}

func (t SettingsDocumentTarget) Validate() error {
	if !validSettingsDocumentID(t.Namespace) {
		return validationDomainError("invalid settings namespace", nil)
	}
	switch t.Scope {
	case SettingsScopeSite, SettingsScopeSystem:
		if t.UserID != "" {
			return validationDomainError("user id is only valid for user settings", nil)
		}
	case SettingsScopeUser:
		if !validSettingsDocumentID(t.UserID) {
			return requiredFieldDomainError("user id", nil)
		}
	default:
		return unsupportedScopeDomainError(string(t.Scope), nil)
	}
	return nil
}

// SettingsDocumentMutation patches overrides. Reset removes an override; it does
// not erase revision history. Touch advances revision even with unchanged values
// when another host-owned domain mutation shares this transaction.
type SettingsDocumentMutation struct {
	Target           SettingsDocumentTarget `json:"target"`
	ExpectedRevision int64                  `json:"expected_revision"`
	Values           map[string]any         `json:"values,omitempty"`
	Reset            []string               `json:"reset,omitempty"`
	Touch            bool                   `json:"touch,omitempty"`
}

func (m SettingsDocumentMutation) Validate() error {
	if err := m.Target.Validate(); err != nil {
		return err
	}
	if m.ExpectedRevision < 0 || m.ExpectedRevision == math.MaxInt64 {
		return validationDomainError("invalid settings revision", nil)
	}
	seen := map[string]bool{}
	for _, key := range m.Reset {
		if key == "" || seen[key] {
			return validationDomainError("invalid duplicate settings reset", nil)
		}
		if _, ok := m.Values[key]; ok {
			return validationDomainError("setting cannot be updated and reset together", nil)
		}
		seen[key] = true
	}
	return nil
}

// SettingsDocumentSnapshot is a detached, coherent document read. Values resolves
// this document's overrides over registered defaults; other documents are not
// implicitly inherited. Identity also covers effective defaults for cache use.
type SettingsDocumentSnapshot struct {
	Target      SettingsDocumentTarget     `json:"target"`
	Revision    int64                      `json:"revision"`
	Overrides   map[string]any             `json:"overrides"`
	Values      map[string]ResolvedSetting `json:"values"`
	Identity    string                     `json:"identity"`
	ChangedKeys []string                   `json:"changed_keys,omitempty"`
}

// SettingsRevisionConflict is returned for guarded creation or stale updates.
// It contains only the expected revision; hosts may re-read after rollback.
type SettingsRevisionConflict struct{ ExpectedRevision int64 }

func (e *SettingsRevisionConflict) Error() string { return "settings revision conflict" }
func (e *SettingsRevisionConflict) Unwrap() error {
	return conflictDomainError(e.Error(), map[string]any{"expected_revision": e.ExpectedRevision})
}

// SettingsDocumentAdapter is optional; SettingsAdapter remains source-compatible.
// Document methods do not emit best-effort activity. Hosts own audit/idempotency.
type SettingsDocumentAdapter interface {
	ReadDocument(context.Context, SettingsDocumentTarget) (SettingsDocumentSnapshot, error)
	ApplyDocument(context.Context, SettingsDocumentMutation) (SettingsDocumentSnapshot, error)
}

// TransactionalSettingsDocumentAdapter joins a host-owned Bun transaction. Reads
// accept bun.IDB for use in existing query transactions. ApplyDocumentTx requires
// a real transaction and never commits/rolls it back. On ANY error the caller must
// roll back the transaction; returned success is provisional until host commit.
type TransactionalSettingsDocumentAdapter interface {
	SettingsDocumentAdapter
	ReadDocumentWithDB(context.Context, bun.IDB, SettingsDocumentTarget) (SettingsDocumentSnapshot, error)
	ApplyDocumentTx(context.Context, bun.Tx, SettingsDocumentMutation) (SettingsDocumentSnapshot, error)
}

// ContextSettingsAdapter optionally propagates resolution errors and cancellation.
type ContextSettingsAdapter interface {
	ResolveContext(context.Context, string, string) (ResolvedSetting, error)
	ResolveAllContext(context.Context, string) (map[string]ResolvedSetting, error)
}

func (s *SettingsService) documentAdapter() (SettingsDocumentAdapter, error) {
	if s == nil {
		return nil, FeatureDisabledError{Feature: string(FeatureSettings)}
	}
	s.mu.RLock()
	enabled, adapter := s.enabled, s.adapter
	s.mu.RUnlock()
	if !enabled {
		return nil, FeatureDisabledError{Feature: string(FeatureSettings)}
	}
	capability, ok := adapter.(SettingsDocumentAdapter)
	if !ok {
		return nil, serviceNotConfiguredDomainError("settings document adapter", nil)
	}
	return capability, nil
}

func (s *SettingsService) ReadDocument(ctx context.Context, target SettingsDocumentTarget) (SettingsDocumentSnapshot, error) {
	a, err := s.documentAdapter()
	if err != nil {
		return SettingsDocumentSnapshot{}, err
	}
	return a.ReadDocument(ctx, target)
}
func (s *SettingsService) ApplyDocument(ctx context.Context, mutation SettingsDocumentMutation) (SettingsDocumentSnapshot, error) {
	a, err := s.documentAdapter()
	if err != nil {
		return SettingsDocumentSnapshot{}, err
	}
	return a.ApplyDocument(ctx, mutation)
}
func (s *SettingsService) ReadDocumentWithDB(ctx context.Context, db bun.IDB, target SettingsDocumentTarget) (SettingsDocumentSnapshot, error) {
	a, err := s.documentAdapter()
	if err != nil {
		return SettingsDocumentSnapshot{}, err
	}
	txa, ok := a.(TransactionalSettingsDocumentAdapter)
	if !ok {
		return SettingsDocumentSnapshot{}, serviceNotConfiguredDomainError("transactional settings document adapter", nil)
	}
	return txa.ReadDocumentWithDB(ctx, db, target)
}
func (s *SettingsService) ApplyDocumentTx(ctx context.Context, tx bun.Tx, mutation SettingsDocumentMutation) (SettingsDocumentSnapshot, error) {
	a, err := s.documentAdapter()
	if err != nil {
		return SettingsDocumentSnapshot{}, err
	}
	txa, ok := a.(TransactionalSettingsDocumentAdapter)
	if !ok {
		return SettingsDocumentSnapshot{}, serviceNotConfiguredDomainError("transactional settings document adapter", nil)
	}
	return txa.ApplyDocumentTx(ctx, tx, mutation)
}

// ResolveAllContext fails explicitly when an installed adapter has no error-aware
// read capability; it never silently degrades a durable read to defaults.
func (s *SettingsService) ResolveAllContext(ctx context.Context, userID string) (map[string]ResolvedSetting, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	if s == nil {
		return nil, FeatureDisabledError{Feature: string(FeatureSettings)}
	}
	s.mu.RLock()
	enabled, adapter := s.enabled, s.adapter
	s.mu.RUnlock()
	if !enabled {
		return nil, FeatureDisabledError{Feature: string(FeatureSettings)}
	}
	if adapter != nil {
		a, ok := adapter.(ContextSettingsAdapter)
		if !ok {
			return nil, serviceNotConfiguredDomainError("context settings adapter", nil)
		}
		return a.ResolveAllContext(ctx, userID)
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	options, err := s.buildOptionsLocked(userID)
	if err != nil {
		return nil, err
	}
	out := map[string]ResolvedSetting{}
	for key, def := range s.definitions {
		val, trace, err := options.ResolveWithTrace(key)
		if err != nil {
			return nil, err
		}
		out[key] = resolvedFromTrace(def, key, val, trace, nil)
	}
	return out, nil
}
func (s *SettingsService) ResolveContext(ctx context.Context, key, userID string) (ResolvedSetting, error) {
	values, err := s.ResolveAllContext(ctx, userID)
	if err != nil {
		return ResolvedSetting{}, err
	}
	value, ok := values[key]
	if !ok {
		return ResolvedSetting{}, validationDomainError("unknown setting", nil)
	}
	return value, nil
}

func documentSnapshot(target SettingsDocumentTarget, revision int64, raw []byte, defs map[string]SettingDefinition, limit int) (SettingsDocumentSnapshot, error) {
	overrides, _, err := canonicalSettingsDocument(raw, limit)
	if err != nil {
		return SettingsDocumentSnapshot{}, err
	}
	snapshot := SettingsDocumentSnapshot{Target: target, Revision: revision, Overrides: overrides, Values: map[string]ResolvedSetting{}}
	// Clone defaults too: callers must not be able to mutate adapter definitions.
	defaults := map[string]any{}
	for key, def := range defs {
		defaults[key] = def.Default
	}
	encoded, err := json.Marshal(defaults)
	if err != nil {
		return SettingsDocumentSnapshot{}, err
	}
	if decodeErr := decodeDocumentJSON(encoded, &defaults); decodeErr != nil {
		return SettingsDocumentSnapshot{}, decodeErr
	}
	if normalizeErr := normalizeSettingsDocumentNumbers(defaults, limit); normalizeErr != nil {
		return SettingsDocumentSnapshot{}, normalizeErr
	}
	for key := range defs {
		value, scope := defaults[key], SettingsScopeDefault
		if override, ok := snapshot.Overrides[key]; ok {
			value, scope = override, target.Scope
		}
		snapshot.Values[key] = ResolvedSetting{Key: key, Value: value, Scope: scope, Provenance: string(scope)}
	}
	encoded, err = json.Marshal(struct {
		Target    SettingsDocumentTarget
		Revision  int64
		Overrides map[string]any
		Values    map[string]ResolvedSetting
	}{target, revision, snapshot.Overrides, snapshot.Values})
	if err != nil {
		return SettingsDocumentSnapshot{}, err
	}
	digest := sha256.Sum256(encoded)
	snapshot.Identity = "settings:" + hex.EncodeToString(digest[:])
	return snapshot, nil
}

// Preserve exact JSON numbers; float64 decoding can silently rewrite unrelated
// large integer overrides during a later patch.
func decodeDocumentJSON(raw []byte, dst any) error {
	if !json.Valid(raw) {
		return validationDomainError("invalid settings document JSON", nil)
	}
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.UseNumber()
	return decoder.Decode(dst)
}

func validSettingsDocumentID(value string) bool {
	return value != "" && utf8.ValidString(value) && strings.TrimSpace(value) == value && len(value) <= 200 && !strings.ContainsAny(value, "\x00\r\n")
}

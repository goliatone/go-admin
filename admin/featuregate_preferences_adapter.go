package admin

import (
	"context"
	"strings"

	"github.com/goliatone/go-featuregate/adapters/optionsadapter"
	"github.com/goliatone/go-featuregate/ferrors"
	"github.com/goliatone/go-options/pkg/state"
)

var (
	// ErrPreferencesStoreRequired indicates a missing preferences store.
	ErrPreferencesStoreRequired = optionsadapter.ErrPreferencesStoreRequired
	// ErrPreferencesScopeMetadataInvalid indicates malformed options scope metadata.
	ErrPreferencesScopeMetadataInvalid = optionsadapter.ErrPreferencesScopeMetadataInvalid
	// ErrPreferencesPathInvalid indicates an invalid flatten/unflatten path.
	ErrPreferencesPathInvalid = optionsadapter.ErrPreferencesPathInvalid
)

// PreferencesOption customizes the PreferencesStore adapter.
type PreferencesOption func(*PreferencesStoreAdapter)

// PreferencesStoreAdapter adapts admin.PreferencesStore into a state.Store.
type PreferencesStoreAdapter struct {
	delegate      *optionsadapter.PreferencesStoreAdapter
	keyPrefix     string
	keys          []string
	deleteMissing bool
}

// NewPreferencesStoreAdapter constructs a new adapter for PreferencesStore.
func NewPreferencesStoreAdapter(store PreferencesStore, opts ...PreferencesOption) *PreferencesStoreAdapter {
	adapter := &PreferencesStoreAdapter{deleteMissing: true}
	for _, opt := range opts {
		if opt != nil {
			opt(adapter)
		}
	}

	upstreamOpts := make([]optionsadapter.PreferencesOption, 0, 3)
	if prefix := strings.TrimSpace(adapter.keyPrefix); prefix != "" {
		upstreamOpts = append(upstreamOpts, optionsadapter.WithKeyPrefix(prefix))
	}
	if len(adapter.keys) > 0 {
		upstreamOpts = append(upstreamOpts, optionsadapter.WithKeys(adapter.keys...))
	}
	// Keep historical go-admin behavior: Save deletes keys missing from snapshot.
	upstreamOpts = append(upstreamOpts, optionsadapter.WithDeleteMissing(adapter.deleteMissing))

	var bridge optionsadapter.PreferencesStore
	if store != nil {
		bridge = &preferencesStoreBridge{store: store}
	}
	adapter.delegate = optionsadapter.NewPreferencesStoreAdapter(bridge, upstreamOpts...)
	return adapter
}

// WithKeyPrefix overrides the key prefix used for domain names.
func WithKeyPrefix(prefix string) PreferencesOption {
	return func(adapter *PreferencesStoreAdapter) {
		if adapter == nil {
			return
		}
		adapter.keyPrefix = strings.TrimSpace(prefix)
	}
}

// WithKeys restricts loads to the provided feature keys (without prefix).
func WithKeys(keys ...string) PreferencesOption {
	return func(adapter *PreferencesStoreAdapter) {
		if adapter == nil {
			return
		}
		cleaned := make([]string, 0, len(keys))
		for _, key := range keys {
			key = strings.TrimSpace(key)
			if key == "" {
				continue
			}
			cleaned = append(cleaned, key)
		}
		adapter.keys = cleaned
	}
}

// WithDeleteMissing controls whether Save deletes persisted keys missing in snapshot.
func WithDeleteMissing(enabled bool) PreferencesOption {
	return func(adapter *PreferencesStoreAdapter) {
		if adapter == nil {
			return
		}
		adapter.deleteMissing = enabled
	}
}

// Load implements state.Store.
func (a *PreferencesStoreAdapter) Load(ctx context.Context, ref state.Ref) (map[string]any, state.Meta, bool, error) {
	if a == nil || a.delegate == nil {
		return nil, state.Meta{}, false, prefStoreRequiredError(ref, "load")
	}
	return a.delegate.Load(ctx, ref)
}

// Save implements state.Store.
func (a *PreferencesStoreAdapter) Save(ctx context.Context, ref state.Ref, snapshot map[string]any, meta state.Meta) (state.Meta, error) {
	_ = meta // upstream adapter currently ignores state.Meta.
	if a == nil || a.delegate == nil {
		return state.Meta{}, prefStoreRequiredError(ref, "save")
	}
	return a.delegate.Save(ctx, ref, snapshot, state.Meta{})
}

func prefStoreRequiredError(ref state.Ref, operation string) error {
	meta := map[string]any{
		ferrors.MetaAdapter:   "options_preferences",
		ferrors.MetaStore:     "preferences",
		ferrors.MetaOperation: operation,
		ferrors.MetaScope:     ref.Scope,
	}
	if domain := strings.TrimSpace(ref.Domain); domain != "" {
		meta[ferrors.MetaDomain] = domain
	}
	return ferrors.WrapSentinel(ErrPreferencesStoreRequired, "optionsadapter: preferences store is required", meta)
}

type preferencesStoreBridge struct {
	store PreferencesStore
}

func (b *preferencesStoreBridge) Resolve(ctx context.Context, input optionsadapter.PreferencesResolveInput) (optionsadapter.PreferencesSnapshot, error) {
	if b == nil || b.store == nil {
		return optionsadapter.PreferencesSnapshot{}, ErrPreferencesStoreRequired
	}
	levels := make([]PreferenceLevel, 0, len(input.Levels))
	for _, level := range input.Levels {
		levels = append(levels, PreferenceLevel(level))
	}
	snapshot, err := b.store.Resolve(ctx, PreferencesResolveInput{
		Scope:  fromUpstreamScope(input.Scope),
		Levels: levels,
		Keys:   append([]string(nil), input.Keys...),
	})
	if err != nil {
		return optionsadapter.PreferencesSnapshot{}, err
	}
	return optionsadapter.PreferencesSnapshot{Effective: snapshot.Effective}, nil
}

func (b *preferencesStoreBridge) Upsert(ctx context.Context, input optionsadapter.PreferencesUpsertInput) (optionsadapter.PreferencesSnapshot, error) {
	if b == nil || b.store == nil {
		return optionsadapter.PreferencesSnapshot{}, ErrPreferencesStoreRequired
	}
	snapshot, err := b.store.Upsert(ctx, PreferencesUpsertInput{
		Scope:  fromUpstreamScope(input.Scope),
		Level:  PreferenceLevel(input.Level),
		Values: input.Values,
	})
	if err != nil {
		return optionsadapter.PreferencesSnapshot{}, err
	}
	return optionsadapter.PreferencesSnapshot{Effective: snapshot.Effective}, nil
}

func (b *preferencesStoreBridge) Delete(ctx context.Context, input optionsadapter.PreferencesDeleteInput) error {
	if b == nil || b.store == nil {
		return ErrPreferencesStoreRequired
	}
	return b.store.Delete(ctx, PreferencesDeleteInput{
		Scope: fromUpstreamScope(input.Scope),
		Level: PreferenceLevel(input.Level),
		Keys:  append([]string(nil), input.Keys...),
	})
}

func fromUpstreamScope(scope optionsadapter.PreferenceScope) PreferenceScope {
	return PreferenceScope{
		TenantID: scope.TenantID,
		OrgID:    scope.OrgID,
		UserID:   scope.UserID,
	}
}

var _ optionsadapter.PreferencesStore = (*preferencesStoreBridge)(nil)
var _ state.Store[map[string]any] = (*PreferencesStoreAdapter)(nil)

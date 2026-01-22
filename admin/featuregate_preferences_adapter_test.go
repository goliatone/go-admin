package admin

import (
	"context"
	"errors"
	"reflect"
	"testing"

	"github.com/goliatone/go-featuregate/ferrors"
	opts "github.com/goliatone/go-options"
	"github.com/goliatone/go-options/pkg/state"
)

type stubPreferencesStore struct {
	resolveInputs []PreferencesResolveInput
	upsertInputs  []PreferencesUpsertInput
	deleteInputs  []PreferencesDeleteInput
	snapshot      PreferenceSnapshot
	resolveErr    error
}

func (s *stubPreferencesStore) Resolve(ctx context.Context, input PreferencesResolveInput) (PreferenceSnapshot, error) {
	_ = ctx
	s.resolveInputs = append(s.resolveInputs, input)
	if s.resolveErr != nil {
		return PreferenceSnapshot{}, s.resolveErr
	}
	return s.snapshot, nil
}

func (s *stubPreferencesStore) Upsert(ctx context.Context, input PreferencesUpsertInput) (PreferenceSnapshot, error) {
	_ = ctx
	s.upsertInputs = append(s.upsertInputs, input)
	return PreferenceSnapshot{}, nil
}

func (s *stubPreferencesStore) Delete(ctx context.Context, input PreferencesDeleteInput) error {
	_ = ctx
	s.deleteInputs = append(s.deleteInputs, input)
	return nil
}

func TestPreferencesStoreAdapterLoadRequiresStore(t *testing.T) {
	adapter := NewPreferencesStoreAdapter(nil)
	_, _, _, err := adapter.Load(context.Background(), state.Ref{
		Domain: "feature_flags",
		Scope:  opts.NewScope("system", 10),
	})
	if err == nil {
		t.Fatalf("expected error for missing store")
	}
	if !errors.Is(err, ErrPreferencesStoreRequired) {
		t.Fatalf("expected ErrPreferencesStoreRequired, got %v", err)
	}
}

func TestPreferencesStoreAdapterLoadAppliesKeysAndPrefix(t *testing.T) {
	store := &stubPreferencesStore{
		snapshot: PreferenceSnapshot{
			Effective: map[string]any{
				"feature_flags.users.signup": true,
			},
		},
	}
	adapter := NewPreferencesStoreAdapter(store, WithKeys("users.signup"))
	ref := state.Ref{Domain: "feature_flags", Scope: opts.NewScope("system", 10)}

	snapshot, _, ok, err := adapter.Load(context.Background(), ref)
	if err != nil {
		t.Fatalf("load error: %v", err)
	}
	if !ok {
		t.Fatalf("expected snapshot to be present")
	}
	if len(store.resolveInputs) != 1 {
		t.Fatalf("expected one resolve call, got %d", len(store.resolveInputs))
	}
	expectedKeys := []string{"feature_flags.users.signup"}
	if !reflect.DeepEqual(store.resolveInputs[0].Keys, expectedKeys) {
		t.Fatalf("expected resolve keys %v, got %v", expectedKeys, store.resolveInputs[0].Keys)
	}
	users, ok := snapshot["users"].(map[string]any)
	if !ok || users["signup"] != true {
		t.Fatalf("expected users.signup true, got %v", snapshot)
	}
}

func TestPreferencesStoreAdapterSavePersistsAndDeletes(t *testing.T) {
	store := NewInMemoryPreferencesStore()
	adapter := NewPreferencesStoreAdapter(store)
	ref := state.Ref{Domain: "feature_flags", Scope: opts.NewScope("system", 10)}
	ctx := context.Background()

	first := map[string]any{
		"users": map[string]any{
			"signup":         true,
			"password_reset": true,
		},
	}
	if _, err := adapter.Save(ctx, ref, first, state.Meta{}); err != nil {
		t.Fatalf("save error: %v", err)
	}
	loaded, _, ok, err := adapter.Load(ctx, ref)
	if err != nil || !ok {
		t.Fatalf("load error: %v", err)
	}
	users, ok := loaded["users"].(map[string]any)
	if !ok || users["signup"] != true || users["password_reset"] != true {
		t.Fatalf("expected both feature values, got %v", loaded)
	}

	second := map[string]any{
		"users": map[string]any{
			"signup": false,
		},
	}
	if _, err := adapter.Save(ctx, ref, second, state.Meta{}); err != nil {
		t.Fatalf("save error: %v", err)
	}
	loaded, _, ok, err = adapter.Load(ctx, ref)
	if err != nil || !ok {
		t.Fatalf("load error: %v", err)
	}
	users, ok = loaded["users"].(map[string]any)
	if !ok || users["signup"] != false {
		t.Fatalf("expected signup false, got %v", loaded)
	}
	if _, exists := users["password_reset"]; exists {
		t.Fatalf("expected password_reset to be deleted, got %v", loaded)
	}
}

func TestPreferencesStoreAdapterSaveUsesKeyPrefix(t *testing.T) {
	store := &stubPreferencesStore{}
	adapter := NewPreferencesStoreAdapter(store, WithKeyPrefix("custom.flags"))
	ref := state.Ref{Domain: "feature_flags", Scope: opts.NewScope("system", 10)}

	if _, err := adapter.Save(context.Background(), ref, map[string]any{
		"users": map[string]any{"signup": true},
	}, state.Meta{}); err != nil {
		t.Fatalf("save error: %v", err)
	}
	if len(store.upsertInputs) != 1 {
		t.Fatalf("expected one upsert call, got %d", len(store.upsertInputs))
	}
	values := store.upsertInputs[0].Values
	if _, ok := values["custom.flags.users.signup"]; !ok {
		t.Fatalf("expected prefixed key custom.flags.users.signup, got %v", values)
	}
}

func TestPreferencesStoreAdapterLoadRejectsMissingScopeMetadata(t *testing.T) {
	store := NewInMemoryPreferencesStore()
	adapter := NewPreferencesStoreAdapter(store)
	ref := state.Ref{
		Domain: "feature_flags",
		Scope:  opts.NewScope("tenant", 20),
	}
	_, _, _, err := adapter.Load(context.Background(), ref)
	if err == nil {
		t.Fatalf("expected error for missing scope metadata")
	}
	rich, ok := ferrors.As(err)
	if !ok || rich.TextCode != ferrors.TextCodeScopeMetadataMissing {
		t.Fatalf("expected scope metadata missing error, got %v", err)
	}
}

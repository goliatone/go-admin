package quickstart

import (
	"context"
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-users/pkg/types"
	"github.com/goliatone/go-users/preferences"
	"github.com/google/uuid"
)

// GoUsersPreferencesStore bridges go-users preferences into the admin preferences contract.
type GoUsersPreferencesStore struct {
	repo     types.PreferenceRepository
	resolver *preferences.Resolver
}

// NewGoUsersPreferencesStore builds a preferences store backed by go-users.
func NewGoUsersPreferencesStore(repo types.PreferenceRepository) (*GoUsersPreferencesStore, error) {
	if repo == nil {
		return nil, fmt.Errorf("preferences repository required")
	}
	resolver, err := preferences.NewResolver(preferences.ResolverConfig{Repository: repo})
	if err != nil {
		return nil, err
	}
	return &GoUsersPreferencesStore{repo: repo, resolver: resolver}, nil
}

func (s *GoUsersPreferencesStore) Get(ctx context.Context, userID string) (map[string]any, error) {
	uid, err := uuid.Parse(strings.TrimSpace(userID))
	if err != nil || uid == uuid.Nil {
		return map[string]any{}, nil
	}
	if s == nil || s.repo == nil || s.resolver == nil {
		return map[string]any{}, fmt.Errorf("preferences store not configured")
	}
	snap, err := s.resolver.Resolve(ctx, preferences.ResolveInput{
		UserID: uid,
		Scope:  types.ScopeFilter{},
		Levels: []types.PreferenceLevel{types.PreferenceLevelUser},
	})
	if err != nil {
		return nil, err
	}
	return flattenPreferences(snap.Effective), nil
}

func (s *GoUsersPreferencesStore) Save(ctx context.Context, userID string, prefs map[string]any) error {
	uid, err := uuid.Parse(strings.TrimSpace(userID))
	if err != nil || uid == uuid.Nil {
		return fmt.Errorf("invalid user id")
	}
	if s == nil || s.repo == nil {
		return fmt.Errorf("preferences store not configured")
	}
	for key, val := range prefs {
		_, err := s.repo.UpsertPreference(ctx, types.PreferenceRecord{
			Key:    strings.ToLower(strings.TrimSpace(key)),
			UserID: uid,
			Level:  types.PreferenceLevelUser,
			Value:  map[string]any{"value": val},
		})
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *GoUsersPreferencesStore) Clear(ctx context.Context, userID string, keys []string) error {
	uid, err := uuid.Parse(strings.TrimSpace(userID))
	if err != nil || uid == uuid.Nil {
		return fmt.Errorf("invalid user id")
	}
	if s == nil || s.repo == nil {
		return fmt.Errorf("preferences store not configured")
	}
	for _, key := range keys {
		key = strings.ToLower(strings.TrimSpace(key))
		if key == "" {
			continue
		}
		if err := s.repo.DeletePreference(ctx, uid, types.ScopeFilter{}, types.PreferenceLevelUser, key); err != nil {
			return err
		}
	}
	return nil
}

func flattenPreferences(input map[string]any) map[string]any {
	if len(input) == 0 {
		return map[string]any{}
	}
	out := map[string]any{}
	for key, val := range input {
		if asMap, ok := val.(map[string]any); ok {
			if v, exists := asMap["value"]; exists {
				out[key] = v
				continue
			}
		}
		out[key] = val
	}
	return out
}

var _ admin.PreferencesStore = (*GoUsersPreferencesStore)(nil)
var _ admin.PreferencesClearer = (*GoUsersPreferencesStore)(nil)

package quickstart

import (
	"context"
	"fmt"
	"net/http"
	"sort"
	"strings"

	"github.com/goliatone/go-admin/admin"
	goerrors "github.com/goliatone/go-errors"
	"github.com/goliatone/go-users/command"
	"github.com/goliatone/go-users/pkg/types"
	"github.com/goliatone/go-users/preferences"
	"github.com/google/uuid"
)

// GoUsersPreferencesStore bridges go-users preferences into the admin preferences contract.
type GoUsersPreferencesStore struct {
	repo     types.PreferenceRepository
	resolver *preferences.Resolver
	upsert   *command.PreferenceUpsertCommand
	deleter  *command.PreferenceDeleteCommand
}

// NewGoUsersPreferencesStore builds a preferences store backed by go-users.
func NewGoUsersPreferencesStore(repo types.PreferenceRepository) (*GoUsersPreferencesStore, error) {
	if repo == nil {
		return nil, preferenceValidationError("preferences repository required", map[string]any{
			"field": "repository",
		})
	}
	resolver, err := preferences.NewResolver(preferences.ResolverConfig{Repository: repo})
	if err != nil {
		return nil, err
	}
	cmdCfg := command.PreferenceCommandConfig{Repository: repo}
	return &GoUsersPreferencesStore{
		repo:     repo,
		resolver: resolver,
		upsert:   command.NewPreferenceUpsertCommand(cmdCfg),
		deleter:  command.NewPreferenceDeleteCommand(cmdCfg),
	}, nil
}

func (s *GoUsersPreferencesStore) Resolve(ctx context.Context, input admin.PreferencesResolveInput) (admin.PreferenceSnapshot, error) {
	if s == nil || s.repo == nil || s.resolver == nil {
		return admin.PreferenceSnapshot{}, preferenceConfigError("preferences store not configured")
	}
	scope, err := toUsersScope(input.Scope)
	if err != nil {
		return admin.PreferenceSnapshot{}, err
	}
	userID, err := parseUserUUID(input.Scope.UserID)
	if err != nil {
		return admin.PreferenceSnapshot{}, err
	}
	keys := normalizePreferenceKeys(input.Keys)
	levels, err := toUsersLevels(resolveAdminLevels(input.Levels))
	if err != nil {
		return admin.PreferenceSnapshot{}, err
	}
	base := cloneAnyMap(input.Base)
	snap, err := s.resolver.Resolve(ctx, preferences.ResolveInput{
		UserID: userID,
		Scope:  scope,
		Levels: levels,
		Keys:   keys,
		Base:   base,
	})
	if err != nil {
		return admin.PreferenceSnapshot{}, err
	}
	effective := flattenPreferences(snap.Effective)
	out := admin.PreferenceSnapshot{Effective: effective}

	var versionsByLevel map[types.PreferenceLevel]map[string]int
	if input.IncludeVersion || input.IncludeTraces {
		versions, perLevel, err := s.preferenceVersions(ctx, userID, scope, levels, keys, effective)
		if err != nil {
			return admin.PreferenceSnapshot{}, err
		}
		if input.IncludeVersion {
			out.Versions = versions
		}
		versionsByLevel = perLevel
	}
	if input.IncludeTraces {
		out.Traces = toAdminTraces(snap.Traces, versionsByLevel)
	}
	return out, nil
}

func (s *GoUsersPreferencesStore) Upsert(ctx context.Context, input admin.PreferencesUpsertInput) (admin.PreferenceSnapshot, error) {
	if s == nil || s.repo == nil || s.upsert == nil {
		return admin.PreferenceSnapshot{}, preferenceConfigError("preferences store not configured")
	}
	scope, err := toUsersScope(input.Scope)
	if err != nil {
		return admin.PreferenceSnapshot{}, err
	}
	userID, err := parseRequiredUserUUID(input.Scope.UserID)
	if err != nil {
		return admin.PreferenceSnapshot{}, err
	}
	level, err := toUsersLevel(normalizeAdminLevel(input.Level))
	if err != nil {
		return admin.PreferenceSnapshot{}, err
	}
	updates := normalizePreferenceValues(input.Values)
	if len(updates) == 0 {
		return admin.PreferenceSnapshot{Effective: map[string]any{}}, nil
	}

	for key, val := range updates {
		record := types.PreferenceRecord{}
		err := s.upsert.Execute(ctx, command.PreferenceUpsertInput{
			UserID: userID,
			Scope:  scope,
			Level:  level,
			Key:    key,
			Value:  map[string]any{"value": val},
			Actor:  types.ActorRef{ID: userID},
			Result: &record,
		})
		if err != nil {
			return admin.PreferenceSnapshot{}, err
		}
	}
	return admin.PreferenceSnapshot{Effective: cloneAnyMap(updates)}, nil
}

func (s *GoUsersPreferencesStore) Delete(ctx context.Context, input admin.PreferencesDeleteInput) error {
	if s == nil || s.repo == nil || s.deleter == nil {
		return preferenceConfigError("preferences store not configured")
	}
	scope, err := toUsersScope(input.Scope)
	if err != nil {
		return err
	}
	userID, err := parseRequiredUserUUID(input.Scope.UserID)
	if err != nil {
		return err
	}
	level, err := toUsersLevel(normalizeAdminLevel(input.Level))
	if err != nil {
		return err
	}
	keys := normalizePreferenceKeys(input.Keys)
	for _, key := range keys {
		if err := s.deleter.Execute(ctx, command.PreferenceDeleteInput{
			UserID: userID,
			Scope:  scope,
			Level:  level,
			Key:    key,
			Actor:  types.ActorRef{ID: userID},
		}); err != nil {
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

func flattenPreferenceValue(val any) any {
	if asMap, ok := val.(map[string]any); ok {
		if v, exists := asMap["value"]; exists {
			return v
		}
	}
	return val
}

func normalizePreferenceKeys(keys []string) []string {
	if len(keys) == 0 {
		return nil
	}
	out := make([]string, 0, len(keys))
	seen := map[string]bool{}
	for _, key := range keys {
		key = strings.ToLower(strings.TrimSpace(key))
		if key == "" || seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, key)
	}
	sort.Strings(out)
	return out
}

func normalizePreferenceValues(values map[string]any) map[string]any {
	if len(values) == 0 {
		return map[string]any{}
	}
	out := map[string]any{}
	for key, val := range values {
		key = strings.ToLower(strings.TrimSpace(key))
		if key == "" {
			continue
		}
		out[key] = val
	}
	return out
}

var adminLevelOrder = []admin.PreferenceLevel{
	admin.PreferenceLevelSystem,
	admin.PreferenceLevelTenant,
	admin.PreferenceLevelOrg,
	admin.PreferenceLevelUser,
}

func resolveAdminLevels(levels []admin.PreferenceLevel) []admin.PreferenceLevel {
	if len(levels) == 0 {
		return append([]admin.PreferenceLevel(nil), adminLevelOrder...)
	}
	allowed := map[admin.PreferenceLevel]bool{}
	for _, level := range levels {
		allowed[level] = true
	}
	out := make([]admin.PreferenceLevel, 0, len(adminLevelOrder))
	for _, level := range adminLevelOrder {
		if allowed[level] {
			out = append(out, level)
		}
	}
	return out
}

func normalizeAdminLevel(level admin.PreferenceLevel) admin.PreferenceLevel {
	if level == "" {
		return admin.PreferenceLevelUser
	}
	return level
}

func toUsersLevel(level admin.PreferenceLevel) (types.PreferenceLevel, error) {
	switch level {
	case admin.PreferenceLevelSystem:
		return types.PreferenceLevelSystem, nil
	case admin.PreferenceLevelTenant:
		return types.PreferenceLevelTenant, nil
	case admin.PreferenceLevelOrg:
		return types.PreferenceLevelOrg, nil
	case admin.PreferenceLevelUser:
		return types.PreferenceLevelUser, nil
	default:
		return "", preferenceValidationError("unsupported preference level", map[string]any{
			"level": string(level),
		})
	}
}

func toUsersLevels(levels []admin.PreferenceLevel) ([]types.PreferenceLevel, error) {
	if len(levels) == 0 {
		return nil, nil
	}
	out := make([]types.PreferenceLevel, 0, len(levels))
	for _, level := range levels {
		mapped, err := toUsersLevel(level)
		if err != nil {
			return nil, err
		}
		out = append(out, mapped)
	}
	return out, nil
}

func toAdminLevel(level types.PreferenceLevel) admin.PreferenceLevel {
	switch level {
	case types.PreferenceLevelSystem:
		return admin.PreferenceLevelSystem
	case types.PreferenceLevelTenant:
		return admin.PreferenceLevelTenant
	case types.PreferenceLevelOrg:
		return admin.PreferenceLevelOrg
	case types.PreferenceLevelUser:
		return admin.PreferenceLevelUser
	default:
		return ""
	}
}

func parseUserUUID(raw string) (uuid.UUID, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return uuid.Nil, nil
	}
	parsed, err := uuid.Parse(raw)
	if err != nil {
		return uuid.Nil, preferenceValidationError("invalid user id", map[string]any{
			"field": "user_id",
		})
	}
	return parsed, nil
}

func parseRequiredUserUUID(raw string) (uuid.UUID, error) {
	userID, err := parseUserUUID(raw)
	if err != nil {
		return uuid.Nil, err
	}
	if userID == uuid.Nil {
		return uuid.Nil, preferenceValidationError("user id required", map[string]any{
			"field": "user_id",
		})
	}
	return userID, nil
}

func parseScopeUUID(raw string, field string) (uuid.UUID, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return uuid.Nil, nil
	}
	parsed, err := uuid.Parse(raw)
	if err != nil {
		return uuid.Nil, preferenceValidationError(fmt.Sprintf("invalid %s id", field), map[string]any{
			"field": fmt.Sprintf("%s_id", field),
		})
	}
	return parsed, nil
}

func toUsersScope(scope admin.PreferenceScope) (types.ScopeFilter, error) {
	tenantID, err := parseScopeUUID(scope.TenantID, "tenant")
	if err != nil {
		return types.ScopeFilter{}, err
	}
	orgID, err := parseScopeUUID(scope.OrgID, "org")
	if err != nil {
		return types.ScopeFilter{}, err
	}
	return types.ScopeFilter{TenantID: tenantID, OrgID: orgID}, nil
}

func toAdminTraces(traces []types.PreferenceTrace, versions map[types.PreferenceLevel]map[string]int) []admin.PreferenceTrace {
	if len(traces) == 0 {
		return nil
	}
	out := make([]admin.PreferenceTrace, 0, len(traces))
	for _, trace := range traces {
		converted := admin.PreferenceTrace{Key: trace.Key}
		for _, layer := range trace.Layers {
			convertedLayer := admin.PreferenceTraceLayer{
				Level: toAdminLevel(layer.Level),
				Scope: admin.PreferenceScope{
					UserID:   uuidToString(layer.UserID),
					TenantID: uuidToString(layer.Scope.TenantID),
					OrgID:    uuidToString(layer.Scope.OrgID),
				},
				Found: layer.Found,
				Value: flattenPreferenceValue(layer.Value),
			}
			if versions != nil {
				if levelVersions, ok := versions[layer.Level]; ok {
					convertedLayer.Version = levelVersions[trace.Key]
				}
			}
			converted.Layers = append(converted.Layers, convertedLayer)
		}
		out = append(out, converted)
	}
	return out
}

func (s *GoUsersPreferencesStore) preferenceVersions(ctx context.Context, userID uuid.UUID, scope types.ScopeFilter, levels []types.PreferenceLevel, keys []string, effective map[string]any) (map[string]int, map[types.PreferenceLevel]map[string]int, error) {
	levelOrder := levels
	if len(levelOrder) == 0 {
		levelOrder = []types.PreferenceLevel{
			types.PreferenceLevelSystem,
			types.PreferenceLevelTenant,
			types.PreferenceLevelOrg,
			types.PreferenceLevelUser,
		}
	}
	lookupKeys := keys
	if len(lookupKeys) == 0 {
		for key := range effective {
			lookupKeys = append(lookupKeys, key)
		}
		sort.Strings(lookupKeys)
	}
	versionsByLevel := map[types.PreferenceLevel]map[string]int{}
	for _, level := range levelOrder {
		if !shouldResolveLevel(level, userID, scope) {
			continue
		}
		records, err := s.repo.ListPreferences(ctx, types.PreferenceFilter{
			UserID: userID,
			Scope:  scope,
			Level:  level,
			Keys:   lookupKeys,
		})
		if err != nil {
			return nil, nil, err
		}
		if len(records) == 0 {
			continue
		}
		levelVersions := map[string]int{}
		for _, record := range records {
			levelVersions[record.Key] = record.Version
		}
		versionsByLevel[level] = levelVersions
	}

	effectiveVersions := map[string]int{}
	for _, level := range levelOrder {
		levelVersions := versionsByLevel[level]
		for key, version := range levelVersions {
			effectiveVersions[key] = version
		}
	}
	for _, key := range lookupKeys {
		if _, ok := effectiveVersions[key]; !ok {
			effectiveVersions[key] = 0
		}
	}
	return effectiveVersions, versionsByLevel, nil
}

func shouldResolveLevel(level types.PreferenceLevel, userID uuid.UUID, scope types.ScopeFilter) bool {
	switch level {
	case types.PreferenceLevelUser:
		return userID != uuid.Nil
	case types.PreferenceLevelTenant:
		return scope.TenantID != uuid.Nil
	case types.PreferenceLevelOrg:
		return scope.OrgID != uuid.Nil
	default:
		return true
	}
}

func uuidToString(id uuid.UUID) string {
	if id == uuid.Nil {
		return ""
	}
	return id.String()
}

func preferenceConfigError(message string) error {
	return goerrors.New(message, goerrors.CategoryInternal).
		WithCode(http.StatusInternalServerError)
}

func preferenceValidationError(message string, metadata map[string]any) error {
	err := goerrors.New(message, goerrors.CategoryValidation).
		WithCode(http.StatusBadRequest)
	if len(metadata) > 0 {
		return err.WithMetadata(metadata)
	}
	return err
}

var _ admin.PreferencesStore = (*GoUsersPreferencesStore)(nil)

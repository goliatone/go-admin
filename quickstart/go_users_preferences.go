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
	"github.com/goliatone/go-users/pkg/authctx"
	"github.com/goliatone/go-users/pkg/types"
	"github.com/goliatone/go-users/preferences"
	"github.com/google/uuid"
)

// GoUsersPreferencesStore bridges go-users preferences into the admin preferences contract.
type GoUsersPreferencesStore struct {
	repo     types.PreferenceRepository
	resolver *preferences.Resolver
	upsert   *command.PreferenceUpsertManyCommand
	deleter  *command.PreferenceDeleteManyCommand
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
		upsert:   command.NewPreferenceUpsertManyCommand(cmdCfg),
		deleter:  command.NewPreferenceDeleteManyCommand(cmdCfg),
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
		UserID:          userID,
		Scope:           scope,
		Levels:          levels,
		Keys:            keys,
		Base:            base,
		OutputMode:      types.PreferenceOutputRawValue,
		IncludeVersions: input.IncludeVersion,
	})
	if err != nil {
		return admin.PreferenceSnapshot{}, err
	}
	out := admin.PreferenceSnapshot{Effective: snap.Effective}
	if out.Effective == nil {
		out.Effective = map[string]any{}
	}
	if input.IncludeVersion {
		out.Versions = resolvedPreferenceVersions(snap.EffectiveVersions, keys, out.Effective)
	}
	if input.IncludeTraces {
		out.Traces = toAdminTraces(snap.Traces)
	}
	return out, nil
}

func (s *GoUsersPreferencesStore) Upsert(ctx context.Context, input admin.PreferencesUpsertInput) (admin.PreferenceSnapshot, error) {
	if s == nil || s.repo == nil || s.upsert == nil {
		return admin.PreferenceSnapshot{}, preferenceConfigError("preferences store not configured")
	}
	level := normalizeAdminLevel(input.Level)
	if err := validateAdminScope(level, input.Scope); err != nil {
		return admin.PreferenceSnapshot{}, err
	}
	scope, err := toUsersScope(input.Scope)
	if err != nil {
		return admin.PreferenceSnapshot{}, err
	}
	actorID, err := resolvePreferenceActorID(ctx, input.Scope)
	if err != nil {
		return admin.PreferenceSnapshot{}, err
	}
	usersLevel, err := toUsersLevel(level)
	if err != nil {
		return admin.PreferenceSnapshot{}, err
	}
	userID := uuid.Nil
	if level == admin.PreferenceLevelUser {
		userID, err = parseRequiredUserUUID(input.Scope.UserID)
		if err != nil {
			return admin.PreferenceSnapshot{}, err
		}
	}
	updates := normalizePreferenceValues(input.Values)
	if len(updates) == 0 {
		return admin.PreferenceSnapshot{Effective: map[string]any{}}, nil
	}

	if err := s.upsert.Execute(ctx, command.PreferenceUpsertManyInput{
		UserID: userID,
		Scope:  scope,
		Level:  usersLevel,
		Values: wrapPreferenceValues(updates),
		Actor:  types.ActorRef{ID: actorID},
		Mode:   types.PreferenceBulkModeBestEffort,
	}); err != nil {
		return admin.PreferenceSnapshot{}, err
	}
	return admin.PreferenceSnapshot{Effective: cloneAnyMap(updates)}, nil
}

func (s *GoUsersPreferencesStore) Delete(ctx context.Context, input admin.PreferencesDeleteInput) error {
	if s == nil || s.repo == nil || s.deleter == nil {
		return preferenceConfigError("preferences store not configured")
	}
	level := normalizeAdminLevel(input.Level)
	if err := validateAdminScope(level, input.Scope); err != nil {
		return err
	}
	scope, err := toUsersScope(input.Scope)
	if err != nil {
		return err
	}
	actorID, err := resolvePreferenceActorID(ctx, input.Scope)
	if err != nil {
		return err
	}
	usersLevel, err := toUsersLevel(level)
	if err != nil {
		return err
	}
	userID := uuid.Nil
	if level == admin.PreferenceLevelUser {
		userID, err = parseRequiredUserUUID(input.Scope.UserID)
		if err != nil {
			return err
		}
	}
	keys := normalizePreferenceKeys(input.Keys)
	if len(keys) == 0 {
		return nil
	}
	if err := s.deleter.Execute(ctx, command.PreferenceDeleteManyInput{
		UserID: userID,
		Scope:  scope,
		Level:  usersLevel,
		Keys:   keys,
		Actor:  types.ActorRef{ID: actorID},
		Mode:   types.PreferenceBulkModeBestEffort,
	}); err != nil {
		return err
	}
	return nil
}

func wrapPreferenceValues(values map[string]any) map[string]any {
	if len(values) == 0 {
		return map[string]any{}
	}
	out := make(map[string]any, len(values))
	for key, val := range values {
		out[key] = map[string]any{"value": val}
	}
	return out
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

func resolvePreferenceActorID(ctx context.Context, scope admin.PreferenceScope) (uuid.UUID, error) {
	if actor, _, err := authctx.ResolveActor(ctx); err == nil && actor.ID != uuid.Nil {
		return actor.ID, nil
	}
	if fallback, err := parseUserUUID(scope.UserID); err != nil {
		return uuid.Nil, err
	} else if fallback != uuid.Nil {
		return fallback, nil
	}
	return uuid.Nil, preferenceValidationError("actor id required", map[string]any{
		"field": "actor_id",
	})
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

func toAdminTraces(traces []types.PreferenceTrace) []admin.PreferenceTrace {
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
				Found:   layer.Found,
				Value:   layer.Value,
				Version: layer.Version,
			}
			converted.Layers = append(converted.Layers, convertedLayer)
		}
		out = append(out, converted)
	}
	return out
}

func resolvedPreferenceVersions(versions map[string]int, keys []string, effective map[string]any) map[string]int {
	if len(versions) == 0 && len(keys) == 0 && len(effective) == 0 {
		return map[string]int{}
	}
	out := make(map[string]int, len(versions))
	for key, version := range versions {
		out[key] = version
	}
	if len(keys) > 0 {
		for _, key := range keys {
			if _, ok := out[key]; !ok {
				out[key] = 0
			}
		}
		return out
	}
	for key := range effective {
		if _, ok := out[key]; !ok {
			out[key] = 0
		}
	}
	return out
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

func validateAdminScope(level admin.PreferenceLevel, scope admin.PreferenceScope) error {
	switch level {
	case admin.PreferenceLevelSystem:
		return nil
	case admin.PreferenceLevelTenant:
		if strings.TrimSpace(scope.TenantID) == "" {
			return preferenceValidationError("tenant id required", map[string]any{
				"field": "tenant_id",
				"level": string(level),
			})
		}
	case admin.PreferenceLevelOrg:
		if strings.TrimSpace(scope.OrgID) == "" {
			return preferenceValidationError("org id required", map[string]any{
				"field": "org_id",
				"level": string(level),
			})
		}
	case admin.PreferenceLevelUser:
		if strings.TrimSpace(scope.UserID) == "" {
			return preferenceValidationError("user id required", map[string]any{
				"field": "user_id",
				"level": string(level),
			})
		}
	default:
		return preferenceValidationError("unsupported preference level", map[string]any{
			"level": string(level),
		})
	}
	return nil
}

var _ admin.PreferencesStore = (*GoUsersPreferencesStore)(nil)

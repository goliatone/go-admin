package setup

import (
	"context"
	"database/sql"
	"fmt"
	"io/fs"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/web/helpers"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/pkg/admin"
	auth "github.com/goliatone/go-auth"
	persistence "github.com/goliatone/go-persistence-bun"
	users "github.com/goliatone/go-users"
	"github.com/goliatone/go-users/activity"
	"github.com/goliatone/go-users/command"
	"github.com/goliatone/go-users/pkg/types"
	"github.com/goliatone/go-users/preferences"
	"github.com/goliatone/go-users/profile"
	"github.com/goliatone/go-users/registry"
	userssvc "github.com/goliatone/go-users/service"
	"github.com/google/uuid"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
)

// ResolveUsersDSN returns the SQLite DSN shared with the rest of the example (CMS).
func ResolveUsersDSN() string {
	if env := strings.TrimSpace(os.Getenv("CMS_DATABASE_DSN")); env != "" {
		return env
	}
	return defaultCMSDSN()
}

// SetupUsers wires a go-users stack against the shared SQLite DB (runs migrations).
func SetupUsers(ctx context.Context, dsn string) (stores.UserDependencies, *userssvc.Service, *OnboardingNotifier, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if strings.TrimSpace(dsn) == "" {
		dsn = ResolveUsersDSN()
	}

	registerSQLiteDrivers("sqlite3", sqliteshim.ShimName)

	sqlDB, err := sql.Open("sqlite3", dsn)
	if err != nil {
		return stores.UserDependencies{}, nil, nil, err
	}
	sqlDB.SetMaxOpenConns(1)
	sqlDB.SetMaxIdleConns(1)

	client, err := persistence.New(persistentConfig{
		driver:      "sqlite3",
		server:      dsn,
		pingTimeout: 5 * time.Second,
	}, sqlDB, sqlitedialect.New())
	if err != nil {
		return stores.UserDependencies{}, nil, nil, err
	}

	migrationsFS, err := fs.Sub(users.MigrationsFS, "data/sql/migrations")
	if err != nil {
		return stores.UserDependencies{}, nil, nil, err
	}
	client.RegisterDialectMigrations(
		migrationsFS,
		persistence.WithDialectSourceLabel("."),
		persistence.WithValidationTargets("postgres", "sqlite"),
	)
	if err := client.Migrate(ctx); err != nil {
		return stores.UserDependencies{}, nil, nil, err
	}

	authRepoManager := auth.NewRepositoryManager(client.DB())

	activityRepo, err := activity.NewRepository(activity.RepositoryConfig{DB: client.DB()})
	if err != nil {
		return stores.UserDependencies{}, nil, nil, err
	}
	profileRepo, err := profile.NewRepository(profile.RepositoryConfig{DB: client.DB()})
	if err != nil {
		return stores.UserDependencies{}, nil, nil, err
	}
	preferenceRepo, err := preferences.NewRepository(preferences.RepositoryConfig{DB: client.DB()})
	if err != nil {
		return stores.UserDependencies{}, nil, nil, err
	}
	roleRegistry, err := registry.NewRoleRegistry(registry.RoleRegistryConfig{DB: client.DB()})
	if err != nil {
		return stores.UserDependencies{}, nil, nil, err
	}
	notifier := &OnboardingNotifier{}

	inventoryRepo := &inventoryRepositoryAdapter{users: authRepoManager.Users()}
	authRepo := newAuthAdapter(authRepoManager.Users())
	scopeResolver := helpers.NewScopeResolver()

	service := userssvc.New(userssvc.Config{
		AuthRepository:       authRepo,
		InventoryRepository:  inventoryRepo,
		ActivityRepository:   activityRepo,
		ActivitySink:         activityRepo,
		ProfileRepository:    profileRepo,
		PreferenceRepository: preferenceRepo,
		RoleRegistry:         roleRegistry,
		ScopeResolver:        scopeResolver,
		AuthorizationPolicy:  helpers.NewScopeAuthorizationPolicy(),
		Logger:               types.NopLogger{},
		Hooks: types.Hooks{
			AfterActivity: notifier.HandleActivity,
		},
	})

	deps := stores.UserDependencies{
		DB:             client.DB(),
		RepoManager:    authRepoManager,
		AuthRepo:       authRepo,
		InventoryRepo:  inventoryRepo,
		RoleRegistry:   roleRegistry,
		ActivitySink:   activityRepo,
		ActivityRepo:   activityRepo,
		ProfileRepo:    profileRepo,
		PreferenceRepo: preferenceRepo,
	}

	if err := SeedUsers(ctx, deps, preferenceRepo); err != nil {
		return stores.UserDependencies{}, nil, nil, err
	}

	notifier.Activity = activityRepo

	return deps, service, notifier, nil
}

// SeedUsers inserts the demo users into SQLite and seeds preferences.
func SeedUsers(ctx context.Context, deps stores.UserDependencies, preferenceRepo *preferences.Repository) error {
	if deps.RepoManager == nil {
		return nil
	}
	usersRepo := deps.RepoManager.Users()
	now := time.Now().UTC()
	seeds := []struct {
		Username  string
		Email     string
		Role      auth.UserRole
		Status    auth.UserStatus
		LastLogin time.Time
	}{
		{"admin", "admin@example.com", auth.RoleAdmin, auth.UserStatusActive, now.Add(-2 * time.Hour)},
		{"jane.smith", "jane@example.com", auth.RoleMember, auth.UserStatusActive, now.Add(-5 * time.Hour)},
		{"john.doe", "john@example.com", auth.RoleMember, auth.UserStatusActive, now.Add(-24 * time.Hour)},
		{"viewer", "viewer@example.com", auth.RoleGuest, auth.UserStatusActive, now.Add(-72 * time.Hour)},
		{"inactive.user", "inactive@example.com", auth.RoleGuest, auth.UserStatusSuspended, now.Add(-120 * time.Hour)},
	}

	for _, seed := range seeds {
		user, err := usersRepo.GetByIdentifier(ctx, seed.Username)
		if err != nil || user == nil {
			user = &auth.User{
				ID:        uuid.New(),
				Username:  seed.Username,
				Email:     seed.Email,
				Role:      seed.Role,
				Status:    seed.Status,
				CreatedAt: ptrTime(now.Add(-30 * 24 * time.Hour)),
				Metadata:  map[string]any{},
			}
			user, err = usersRepo.Create(ctx, user)
			if err != nil {
				return err
			}
		}
		if strings.TrimSpace(user.PasswordHash) == "" && deps.AuthRepo != nil {
			if err := setDefaultPassword(ctx, deps.AuthRepo, user.ID, user.Username); err != nil {
				return err
			}
		}
		if seed.LastLogin.After(time.Time{}) {
			user.LoggedInAt = ptrTime(seed.LastLogin)
			_, _ = usersRepo.Update(ctx, user)
		}

		if deps.ProfileRepo != nil {
			if err := seedUserProfile(ctx, deps.ProfileRepo, user); err != nil {
				return err
			}
		}
	}

	if preferenceRepo != nil {
		if err := seedUserPreferences(ctx, preferenceRepo, deps.RepoManager.Users()); err != nil {
			return err
		}
	}
	return nil
}

func seedUserProfile(ctx context.Context, repo types.ProfileRepository, user *auth.User) error {
	if repo == nil || user == nil || user.ID == uuid.Nil {
		return nil
	}

	scope := types.ScopeFilter{}
	existing, err := repo.GetProfile(ctx, user.ID, scope)
	if err != nil {
		return err
	}

	seed := types.UserProfile{
		UserID:      user.ID,
		DisplayName: seedDisplayName(user.Username),
		Locale:      "en",
		Timezone:    "UTC",
		Bio:         seedProfileBio(user.Username),
		AvatarURL:   "",
		Contact: map[string]any{
			"email": user.Email,
		},
		Metadata: map[string]any{
			"username": user.Username,
		},
		Scope:     scope,
		CreatedBy: user.ID,
		UpdatedBy: user.ID,
	}

	if existing == nil {
		_, err := repo.UpsertProfile(ctx, seed)
		return err
	}

	merged := *existing
	changed := false
	if strings.TrimSpace(merged.DisplayName) == "" && strings.TrimSpace(seed.DisplayName) != "" {
		merged.DisplayName = seed.DisplayName
		changed = true
	}
	if strings.TrimSpace(merged.Locale) == "" && strings.TrimSpace(seed.Locale) != "" {
		merged.Locale = seed.Locale
		changed = true
	}
	if strings.TrimSpace(merged.Timezone) == "" && strings.TrimSpace(seed.Timezone) != "" {
		merged.Timezone = seed.Timezone
		changed = true
	}
	if strings.TrimSpace(merged.Bio) == "" && strings.TrimSpace(seed.Bio) != "" {
		merged.Bio = seed.Bio
		changed = true
	}
	if strings.TrimSpace(merged.AvatarURL) == "" && strings.TrimSpace(seed.AvatarURL) != "" {
		merged.AvatarURL = seed.AvatarURL
		changed = true
	}
	if merged.Contact == nil {
		merged.Contact = map[string]any{}
	}
	if strings.TrimSpace(toString(merged.Contact["email"])) == "" && strings.TrimSpace(user.Email) != "" {
		merged.Contact["email"] = user.Email
		changed = true
	}
	if merged.Metadata == nil {
		merged.Metadata = map[string]any{}
	}
	if strings.TrimSpace(toString(merged.Metadata["username"])) == "" && strings.TrimSpace(user.Username) != "" {
		merged.Metadata["username"] = user.Username
		changed = true
	}

	if !changed {
		return nil
	}

	merged.UpdatedBy = user.ID
	_, err = repo.UpsertProfile(ctx, merged)
	return err
}

func seedDisplayName(username string) string {
	trimmed := strings.TrimSpace(username)
	if trimmed == "" {
		return ""
	}
	trimmed = strings.ReplaceAll(trimmed, ".", " ")
	trimmed = strings.ReplaceAll(trimmed, "_", " ")
	trimmed = strings.ReplaceAll(trimmed, "-", " ")
	parts := strings.Fields(trimmed)
	for i, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		lower := strings.ToLower(part)
		parts[i] = strings.ToUpper(lower[:1]) + lower[1:]
	}
	return strings.Join(parts, " ")
}

func seedProfileBio(username string) string {
	switch strings.ToLower(strings.TrimSpace(username)) {
	case "admin":
		return "Demo admin account for the go-admin example app."
	case "viewer":
		return "Demo viewer account with limited permissions."
	default:
		return "Demo account for the go-admin example app."
	}
}

func seedUserPreferences(ctx context.Context, repo *preferences.Repository, usersRepo auth.Users) error {
	users, _, err := usersRepo.List(ctx)
	if err != nil {
		return err
	}
	for _, user := range users {
		if user == nil {
			continue
		}
		uid := user.ID
		_, _ = repo.UpsertPreference(ctx, types.PreferenceRecord{
			Key:    "theme",
			UserID: uid,
			Level:  types.PreferenceLevelUser,
			Value:  map[string]any{"value": "admin"},
		})
		_, _ = repo.UpsertPreference(ctx, types.PreferenceRecord{
			Key:    "theme_variant",
			UserID: uid,
			Level:  types.PreferenceLevelUser,
			Value:  map[string]any{"value": "light"},
		})
	}
	return nil
}

func setDefaultPassword(ctx context.Context, repo types.AuthRepository, id uuid.UUID, username string) error {
	if repo == nil || id == uuid.Nil {
		return nil
	}
	password := strings.TrimSpace(username) + ".pwd"
	if strings.TrimSpace(password) == ".pwd" {
		password = uuid.NewString()
	}
	hash, err := auth.HashPassword(password)
	if err != nil {
		return err
	}
	return repo.ResetPassword(ctx, id, hash)
}

// inventoryRepositoryAdapter adapts auth.Users to types.UserInventoryRepository.
type inventoryRepositoryAdapter struct {
	users auth.Users
}

func (i *inventoryRepositoryAdapter) ListUsers(ctx context.Context, filter types.UserInventoryFilter) (types.UserInventoryPage, error) {
	if i == nil || i.users == nil {
		return types.UserInventoryPage{}, nil
	}
	records, _, err := i.users.List(ctx)
	if err != nil {
		return types.UserInventoryPage{}, err
	}
	out := make([]types.AuthUser, 0, len(records))
	keyword := strings.ToLower(strings.TrimSpace(filter.Keyword))
	role := strings.ToLower(strings.TrimSpace(filter.Role))

	statusMap := map[types.LifecycleState]bool{}
	for _, status := range filter.Statuses {
		statusMap[status] = true
	}

	for _, user := range records {
		if user == nil {
			continue
		}
		if len(statusMap) > 0 {
			if !statusMap[types.LifecycleState(user.Status)] {
				continue
			}
		}
		if role != "" && !strings.EqualFold(string(user.Role), role) {
			continue
		}
		if len(filter.UserIDs) > 0 && !containsUUID(filter.UserIDs, user.ID) {
			continue
		}
		if keyword != "" && !strings.Contains(strings.ToLower(user.Username), keyword) && !strings.Contains(strings.ToLower(user.Email), keyword) {
			continue
		}
		out = append(out, types.AuthUser{
			ID:        user.ID,
			Email:     user.Email,
			Username:  user.Username,
			FirstName: user.FirstName,
			LastName:  user.LastName,
			Status:    types.LifecycleState(user.Status),
			Role:      string(user.Role),
			Metadata:  user.Metadata,
			CreatedAt: user.CreatedAt,
			UpdatedAt: user.UpdatedAt,
			Raw:       user,
		})
	}

	limit := filter.Pagination.Limit
	if limit <= 0 {
		limit = len(out)
	}
	offset := filter.Pagination.Offset
	if offset < 0 {
		offset = 0
	}
	if offset > len(out) {
		offset = len(out)
	}
	end := offset + limit
	if end > len(out) {
		end = len(out)
	}

	return types.UserInventoryPage{
		Users:      out[offset:end],
		Total:      len(out),
		NextOffset: end,
		HasMore:    end < len(out),
	}, nil
}

func containsUUID(list []uuid.UUID, target uuid.UUID) bool {
	for _, id := range list {
		if id == target {
			return true
		}
	}
	return false
}

// newAuthAdapter wraps auth.Users into a go-users AuthRepository.
func newAuthAdapter(usersRepo auth.Users) types.AuthRepository {
	return &authRepositoryAdapter{users: usersRepo}
}

type authRepositoryAdapter struct {
	users auth.Users
}

func (a *authRepositoryAdapter) GetByID(ctx context.Context, id uuid.UUID) (*types.AuthUser, error) {
	if a == nil || a.users == nil {
		return nil, types.ErrMissingAuthRepository
	}
	user, err := a.users.GetByID(ctx, id.String())
	if err != nil {
		return nil, err
	}
	return a.toAuthUser(user), nil
}

func (a *authRepositoryAdapter) GetByIdentifier(ctx context.Context, identifier string) (*types.AuthUser, error) {
	if a == nil || a.users == nil {
		return nil, types.ErrMissingAuthRepository
	}
	user, err := a.users.GetByIdentifier(ctx, identifier)
	if err != nil {
		return nil, err
	}
	return a.toAuthUser(user), nil
}

func (a *authRepositoryAdapter) Create(ctx context.Context, input *types.AuthUser) (*types.AuthUser, error) {
	if a == nil || a.users == nil {
		return nil, types.ErrMissingAuthRepository
	}
	record := a.fromAuthUser(input)
	created, err := a.users.Create(ctx, record)
	if err != nil {
		return nil, err
	}
	return a.toAuthUser(created), nil
}

func (a *authRepositoryAdapter) Update(ctx context.Context, input *types.AuthUser) (*types.AuthUser, error) {
	if a == nil || a.users == nil {
		return nil, types.ErrMissingAuthRepository
	}
	record := a.fromAuthUser(input)
	updated, err := a.users.Update(ctx, record)
	if err != nil {
		return nil, err
	}
	return a.toAuthUser(updated), nil
}

func (a *authRepositoryAdapter) UpdateStatus(ctx context.Context, actor types.ActorRef, id uuid.UUID, next types.LifecycleState, opts ...types.TransitionOption) (*types.AuthUser, error) {
	if a == nil || a.users == nil {
		return nil, types.ErrMissingAuthRepository
	}
	user, err := a.users.GetByID(ctx, id.String())
	if err != nil {
		return nil, err
	}
	user.Status = auth.UserStatus(next)
	if user.Metadata == nil {
		user.Metadata = map[string]any{}
	}
	cfg := types.TransitionConfig{}
	for _, opt := range opts {
		if opt != nil {
			opt(&cfg)
		}
	}
	if cfg.Reason != "" {
		user.Metadata["transition_reason"] = cfg.Reason
	}
	if len(cfg.Metadata) > 0 {
		for k, v := range cfg.Metadata {
			user.Metadata[k] = v
		}
	}
	updated, err := a.users.Update(ctx, user)
	if err != nil {
		return nil, err
	}
	return a.toAuthUser(updated), nil
}

func (a *authRepositoryAdapter) AllowedTransitions(context.Context, uuid.UUID) ([]types.LifecycleTransition, error) {
	return []types.LifecycleTransition{
		{From: types.LifecycleStatePending, To: types.LifecycleStateActive},
		{From: types.LifecycleStatePending, To: types.LifecycleStateDisabled},
		{From: types.LifecycleStateActive, To: types.LifecycleStateSuspended},
		{From: types.LifecycleStateSuspended, To: types.LifecycleStateActive},
		{From: types.LifecycleStateActive, To: types.LifecycleStateDisabled},
		{From: types.LifecycleStateActive, To: types.LifecycleStateArchived},
		{From: types.LifecycleStateDisabled, To: types.LifecycleStateArchived},
	}, nil
}

func (a *authRepositoryAdapter) ResetPassword(ctx context.Context, id uuid.UUID, passwordHash string) error {
	if a == nil || a.users == nil {
		return types.ErrMissingAuthRepository
	}
	return a.users.ResetPassword(ctx, id, passwordHash)
}

func (a *authRepositoryAdapter) toAuthUser(user *auth.User) *types.AuthUser {
	if user == nil {
		return nil
	}
	return &types.AuthUser{
		ID:        user.ID,
		Role:      string(user.Role),
		Status:    types.LifecycleState(user.Status),
		Email:     user.Email,
		Username:  user.Username,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Metadata:  user.Metadata,
		CreatedAt: user.CreatedAt,
		UpdatedAt: user.UpdatedAt,
		Raw:       user,
	}
}

func (a *authRepositoryAdapter) fromAuthUser(user *types.AuthUser) *auth.User {
	if user == nil {
		return nil
	}
	out := &auth.User{
		ID:        user.ID,
		Role:      auth.UserRole(user.Role),
		Status:    auth.UserStatus(user.Status),
		Email:     user.Email,
		Username:  user.Username,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Metadata:  user.Metadata,
	}
	if user.CreatedAt != nil {
		out.CreatedAt = user.CreatedAt
	}
	if user.UpdatedAt != nil {
		out.UpdatedAt = user.UpdatedAt
	}
	if raw, ok := user.Raw.(*auth.User); ok && raw != nil {
		out.PasswordHash = raw.PasswordHash
		out.LoginAttempts = raw.LoginAttempts
		out.LoginAttemptAt = raw.LoginAttemptAt
		out.LoggedInAt = raw.LoggedInAt
		out.SuspendedAt = raw.SuspendedAt
		out.ResetedAt = raw.ResetedAt
		out.ProfilePicture = raw.ProfilePicture
		out.Phone = raw.Phone
		out.EmailValidated = raw.EmailValidated
		if out.Metadata == nil && raw.Metadata != nil {
			out.Metadata = raw.Metadata
		}
	}
	return out
}

func ptrTime(t time.Time) *time.Time {
	return &t
}

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
		return nil, fmt.Errorf("preferences repository required")
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
		return admin.PreferenceSnapshot{}, fmt.Errorf("preferences store not configured")
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
		return admin.PreferenceSnapshot{}, fmt.Errorf("preferences store not configured")
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
		return fmt.Errorf("preferences store not configured")
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
		return "", fmt.Errorf("unsupported preference level")
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
		return uuid.Nil, fmt.Errorf("invalid user id")
	}
	return parsed, nil
}

func parseRequiredUserUUID(raw string) (uuid.UUID, error) {
	userID, err := parseUserUUID(raw)
	if err != nil {
		return uuid.Nil, err
	}
	if userID == uuid.Nil {
		return uuid.Nil, fmt.Errorf("user id required")
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
		return uuid.Nil, fmt.Errorf("invalid %s id", field)
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

// OnboardingNotifier fans out invite/reset activity into notifications.
type OnboardingNotifier struct {
	Notifications admin.NotificationService
	Activity      types.ActivitySink
}

// HandleActivity attaches to go-users hooks to emit example notifications.
func (n *OnboardingNotifier) HandleActivity(ctx context.Context, record types.ActivityRecord) {
	if n == nil {
		return
	}
	if n.Notifications == nil {
		return
	}

	switch record.Verb {
	case "user.invite":
		email := fmt.Sprint(record.Data["email"])
		n.Notifications.Add(ctx, admin.Notification{
			Title:   "User invited",
			Message: fmt.Sprintf("Invite sent to %s (expires %v)", email, record.Data["expires_at"]),
			Read:    false,
		})
	case "user.password.reset":
		email := fmt.Sprint(record.Data["user_email"])
		n.Notifications.Add(ctx, admin.Notification{
			Title:   "Password reset",
			Message: fmt.Sprintf("Password reset completed for %s", email),
			Read:    false,
		})
	case "user.password.reset.request":
		email := fmt.Sprint(record.Data["user_email"])
		n.Notifications.Add(ctx, admin.Notification{
			Title:   "Password reset requested",
			Message: fmt.Sprintf("Reset link requested for %s", email),
			Read:    false,
		})
	}
}

// NewGoUsersActivityAdapter bridges go-users activity sink/repo into admin.
func NewGoUsersActivityAdapter(sink types.ActivitySink, repo types.ActivityRepository) admin.ActivitySink {
	if sink == nil || repo == nil {
		return nil
	}
	return admin.NewActivitySinkAdapter(&activityLoggerAdapter{sink: sink}, &activityListerAdapter{repo: repo})
}

type activityLoggerAdapter struct {
	sink types.ActivitySink
}

func (l *activityLoggerAdapter) Log(ctx context.Context, record admin.ActivityRecord) error {
	if l == nil || l.sink == nil {
		return nil
	}
	return l.sink.Log(ctx, toUsersRecord(record))
}

type activityListerAdapter struct {
	repo types.ActivityRepository
}

func (l *activityListerAdapter) ListRecords(ctx context.Context, limit int, filters ...admin.ActivityFilter) ([]admin.ActivityRecord, error) {
	if l == nil || l.repo == nil {
		return nil, nil
	}
	page, err := l.repo.ListActivity(ctx, toUsersFilter(limit, filters...))
	if err != nil {
		return nil, err
	}
	out := make([]admin.ActivityRecord, 0, len(page.Records))
	for _, rec := range page.Records {
		out = append(out, fromUsersRecord(rec))
		if limit > 0 && len(out) >= limit {
			break
		}
	}
	return out, nil
}

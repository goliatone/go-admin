package setup

import (
	"context"
	"database/sql"
	"fmt"
	"io/fs"
	"os"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/web/helpers"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/pkg/admin"
	auth "github.com/goliatone/go-auth"
	persistence "github.com/goliatone/go-persistence-bun"
	users "github.com/goliatone/go-users"
	"github.com/goliatone/go-users/activity"
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
		_, _ = s.repo.UpsertPreference(ctx, types.PreferenceRecord{
			Key:    strings.ToLower(strings.TrimSpace(key)),
			UserID: uid,
			Level:  types.PreferenceLevelUser,
			Value:  map[string]any{"value": val},
		})
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

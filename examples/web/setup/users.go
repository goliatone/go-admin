package setup

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/web/helpers"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/quickstart"
	auth "github.com/goliatone/go-auth"
	persistence "github.com/goliatone/go-persistence-bun"
	repository "github.com/goliatone/go-repository-bun"
	"github.com/goliatone/go-users/activity"
	"github.com/goliatone/go-users/command"
	"github.com/goliatone/go-users/passwordreset"
	"github.com/goliatone/go-users/pkg/types"
	"github.com/goliatone/go-users/preferences"
	"github.com/goliatone/go-users/profile"
	"github.com/goliatone/go-users/registry"
	userssvc "github.com/goliatone/go-users/service"
	"github.com/goliatone/go-users/tokens"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
)

// UserMigrationsPhase identifies which migrations should be registered.
type UserMigrationsPhase int

const (
	UserMigrationsAuth UserMigrationsPhase = iota
	UserMigrationsCore
)

// UserMigrationsRegistrar registers migrations for the given phase.
type UserMigrationsRegistrar func(*persistence.Client, UserMigrationsPhase) error

// ResolveUsersDSN returns the SQLite DSN shared with the rest of the example (CMS).
func ResolveUsersDSN() string {
	if env := strings.TrimSpace(os.Getenv("CMS_DATABASE_DSN")); env != "" {
		return env
	}
	return defaultCMSDSN()
}

// SetupUsers wires a go-users stack against the shared SQLite DB (runs migrations).
func SetupUsers(ctx context.Context, dsn string, opts ...persistence.ClientOption) (stores.UserDependencies, *userssvc.Service, *OnboardingNotifier, error) {
	return SetupUsersWithMigrations(ctx, dsn, nil, opts...)
}

// SetupUsersWithMigrations wires a go-users stack with a custom migrations registrar.
func SetupUsersWithMigrations(ctx context.Context, dsn string, registrar UserMigrationsRegistrar, opts ...persistence.ClientOption) (stores.UserDependencies, *userssvc.Service, *OnboardingNotifier, error) {
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

	pcfg := persistentConfig{
		driver:      "sqlite3",
		server:      dsn,
		pingTimeout: 5 * time.Second,
	}
	newClient := func() (*persistence.Client, error) {
		RegisterSeedModels()
		return persistence.New(pcfg, sqlDB, sqlitedialect.New(), opts...)
	}

	client, err := newClient()
	if err != nil {
		return stores.UserDependencies{}, nil, nil, err
	}

	if registrar == nil {
		registrar = QuickstartUserMigrations()
	}
	if err := registrar(client, UserMigrationsAuth); err != nil {
		return stores.UserDependencies{}, nil, nil, err
	}
	if err := client.Migrate(ctx); err != nil {
		return stores.UserDependencies{}, nil, nil, err
	}
	if err := ensureUsersExternalID(ctx, sqlDB); err != nil {
		return stores.UserDependencies{}, nil, nil, err
	}

	client, err = newClient()
	if err != nil {
		return stores.UserDependencies{}, nil, nil, err
	}
	if err := registrar(client, UserMigrationsCore); err != nil {
		return stores.UserDependencies{}, nil, nil, err
	}
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
	secureLinks, err := NewSecureLinkManager()
	if err != nil {
		return stores.UserDependencies{}, nil, nil, err
	}
	tokenRepo, err := tokens.NewRepository(tokens.RepositoryConfig{DB: client.DB()})
	if err != nil {
		return stores.UserDependencies{}, nil, nil, err
	}
	resetRepo, err := passwordreset.NewRepository(passwordreset.RepositoryConfig{DB: client.DB()})
	if err != nil {
		return stores.UserDependencies{}, nil, nil, err
	}
	notifier := &OnboardingNotifier{}

	inventoryRepo := &inventoryRepositoryAdapter{users: authRepoManager.Users()}
	authRepo := newAuthAdapter(authRepoManager.Users())
	scopeResolver := helpers.NewScopeResolver()

	service := userssvc.New(userssvc.Config{
		AuthRepository:          authRepo,
		InventoryRepository:     inventoryRepo,
		ActivityRepository:      activityRepo,
		ActivitySink:            activityRepo,
		ProfileRepository:       profileRepo,
		PreferenceRepository:    preferenceRepo,
		RoleRegistry:            roleRegistry,
		ScopeResolver:           scopeResolver,
		AuthorizationPolicy:     helpers.NewScopeAuthorizationPolicy(),
		Logger:                  types.NopLogger{},
		SecureLinkManager:       secureLinks,
		UserTokenRepository:     tokenRepo,
		PasswordResetRepository: resetRepo,
		InviteLinkRoute:         command.SecureLinkRouteInviteAccept,
		RegistrationLinkRoute:   command.SecureLinkRouteRegister,
		PasswordResetLinkRoute:  command.SecureLinkRoutePasswordReset,
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
		SecureLinks:    secureLinks,
		UserTokenRepo:  tokenRepo,
		ResetRepo:      resetRepo,
	}

	seedCfg := SeedConfigFromEnv()
	if err := LoadSeedGroup(ctx, client, seedCfg, SeedGroupUsers); err != nil {
		return stores.UserDependencies{}, nil, nil, err
	}
	if seedCfg.Enabled {
		if err := rewriteSeedScope(ctx, client.DB(), quickstart.ScopeConfigFromEnv()); err != nil {
			return stores.UserDependencies{}, nil, nil, err
		}
		if err := ensureTranslationExchangeSeedPermissions(ctx, deps.RoleRegistry); err != nil {
			return stores.UserDependencies{}, nil, nil, err
		}
		if err := ensureSeedUserProfiles(ctx, deps); err != nil {
			return stores.UserDependencies{}, nil, nil, err
		}
	}

	notifier.Activity = activityRepo

	return deps, service, notifier, nil
}

// QuickstartUserMigrations returns a registrar that uses quickstart defaults.
func QuickstartUserMigrations() UserMigrationsRegistrar {
	return quickstartUserMigrations
}

func quickstartUserMigrations(client *persistence.Client, phase UserMigrationsPhase) error {
	switch phase {
	case UserMigrationsAuth:
		return quickstart.RegisterUserMigrations(
			client,
			quickstart.WithUserMigrationsCoreEnabled(false),
			quickstart.WithUserMigrationsAuthBootstrapEnabled(false),
			quickstart.WithUserMigrationsAuthExtrasEnabled(false),
		)
	case UserMigrationsCore:
		return quickstart.RegisterUserMigrations(
			client,
			quickstart.WithUserMigrationsAuthEnabled(false),
		)
	default:
		return nil
	}
}

// SeedUsers inserts the demo users into SQLite and seeds preferences.
func SeedUsers(ctx context.Context, deps stores.UserDependencies, preferenceRepo *preferences.Repository) error {
	if deps.RepoManager == nil {
		return nil
	}
	usersRepo := deps.RepoManager.Users()
	now := time.Now().UTC()
	seededUsers := map[string]*auth.User{}
	seeds := []struct {
		Username  string
		Email     string
		Role      auth.UserRole
		Status    auth.UserStatus
		LastLogin time.Time
	}{
		{"superadmin", "superadmin@example.com", auth.RoleOwner, auth.UserStatusActive, now.Add(-1 * time.Hour)},
		{"admin", "admin@example.com", auth.RoleAdmin, auth.UserStatusActive, now.Add(-2 * time.Hour)},
		{"jane.smith", "jane@example.com", auth.RoleMember, auth.UserStatusActive, now.Add(-5 * time.Hour)},
		{"translator", "translator@example.com", auth.RoleMember, auth.UserStatusActive, now.Add(-6 * time.Hour)},
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

		if user != nil {
			seededUsers[seed.Username] = user
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
	if err := seedDebugRoles(ctx, deps.RoleRegistry, seededUsers); err != nil {
		return err
	}
	return nil
}

func ensureSeedUserProfiles(ctx context.Context, deps stores.UserDependencies) error {
	if deps.ProfileRepo == nil || deps.RepoManager == nil {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	usersRepo := deps.RepoManager.Users()
	users, _, err := usersRepo.List(ctx)
	if err != nil {
		return err
	}
	for _, user := range users {
		if user == nil {
			continue
		}
		if err := seedUserProfile(ctx, deps.ProfileRepo, user); err != nil {
			return err
		}
	}
	return nil
}

func ensureUsersExternalID(ctx context.Context, db *sql.DB) error {
	if db == nil {
		return nil
	}

	var hasUsers bool
	if err := db.QueryRowContext(ctx, "SELECT 1 FROM sqlite_master WHERE type='table' AND name='users'").
		Scan(&hasUsers); err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("users table missing before go-auth migrations")
		}
		return err
	}

	rows, err := db.QueryContext(ctx, "PRAGMA table_info(users)")
	if err != nil {
		return err
	}
	defer rows.Close()

	var hasExternalID bool
	var hasExternalIDProvider bool
	for rows.Next() {
		var cid int
		var name string
		var colType string
		var notNull int
		var defaultValue sql.NullString
		var pk int
		if scanErr := rows.Scan(&cid, &name, &colType, &notNull, &defaultValue, &pk); scanErr != nil {
			return scanErr
		}
		switch strings.ToLower(strings.TrimSpace(name)) {
		case "external_id":
			hasExternalID = true
		case "external_id_provider":
			hasExternalIDProvider = true
		}
	}
	if err := rows.Err(); err != nil {
		return err
	}

	if !hasExternalID {
		if _, err := db.ExecContext(ctx, "ALTER TABLE users ADD COLUMN external_id TEXT"); err != nil {
			return err
		}
		hasExternalID = true
	}
	if !hasExternalIDProvider {
		if _, err := db.ExecContext(ctx, "ALTER TABLE users ADD COLUMN external_id_provider TEXT"); err != nil {
			return err
		}
		hasExternalIDProvider = true
	}
	if hasExternalID && hasExternalIDProvider {
		if _, err := db.ExecContext(ctx, "DROP INDEX IF EXISTS users_external_id_unique"); err != nil {
			return err
		}
		if _, err := db.ExecContext(ctx, `CREATE UNIQUE INDEX IF NOT EXISTS users_external_id_unique
ON users (external_id_provider, external_id)
WHERE external_id IS NOT NULL AND external_id != ''
AND external_id_provider IS NOT NULL AND external_id_provider != ''`); err != nil {
			return err
		}
	}

	return nil
}

func seedUserProfile(ctx context.Context, repo types.ProfileRepository, user *auth.User) error {
	if repo == nil || user == nil || user.ID == uuid.Nil {
		return nil
	}

	scope := seedScopeDefaults()
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

func seedDebugRoles(ctx context.Context, registry types.RoleRegistry, users map[string]*auth.User) error {
	if registry == nil {
		return nil
	}
	scope := seedScopeDefaults()
	roleSeeds := []struct {
		Key         string
		Name        string
		Permissions []string
	}{
		{
			Key:  "superadmin",
			Name: "Super Admin",
			Permissions: []string{
				"admin.dashboard.view",
				"admin.users.view",
				"admin.users.create",
				"admin.users.edit",
				"admin.users.delete",
				"admin.roles.view",
				"admin.roles.create",
				"admin.roles.edit",
				"admin.roles.delete",
				"admin.activity.view",
				"admin.settings.view",
				"admin.settings.edit",
				"admin.jobs.view",
				"admin.jobs.edit",
				"admin.search.view",
				"admin.preferences.view",
				"admin.preferences.edit",
				"admin.profile.view",
				"admin.profile.edit",
				"admin.debug.view",
				"admin.debug.repl",
				"admin.debug.repl.exec",
				"admin.translations.view",
				"admin.translations.edit",
				"admin.translations.manage",
				"admin.translations.assign",
				"admin.translations.approve",
				"admin.translations.claim",
				"admin.translations.export",
				"admin.translations.import.view",
				"admin.translations.import.validate",
				"admin.translations.import.apply",
			},
		},
		{
			Key:  "admin",
			Name: "Admin",
			Permissions: []string{
				"admin.dashboard.view",
				"admin.users.view",
				"admin.users.create",
				"admin.users.edit",
				"admin.roles.view",
				"admin.roles.create",
				"admin.roles.edit",
				"admin.activity.view",
				"admin.settings.view",
				"admin.search.view",
				"admin.preferences.view",
				"admin.profile.view",
				"admin.profile.edit",
				"admin.debug.view",
				"admin.debug.repl",
			},
		},
		{
			Key:  "editor",
			Name: "Editor",
			Permissions: []string{
				"admin.dashboard.view",
				"admin.search.view",
				"admin.profile.view",
				"admin.profile.edit",
			},
		},
		{
			Key:  "translator",
			Name: "Translator",
			Permissions: []string{
				"admin.search.view",
				"admin.profile.view",
				"admin.profile.edit",
			},
		},
		{
			Key:  "user",
			Name: "User",
			Permissions: []string{
				"admin.dashboard.view",
				"admin.profile.view",
				"admin.profile.edit",
			},
		},
		{
			Key:         "guest",
			Name:        "Guest",
			Permissions: []string{},
		},
	}
	roles := map[string]*types.RoleDefinition{}
	for _, seed := range roleSeeds {
		role, err := ensureSeedRole(ctx, registry, scope, seed.Key, seed.Name, seed.Permissions)
		if err != nil {
			return err
		}
		if role != nil {
			roles[seed.Key] = role
		}
	}

	assignments := map[string]string{
		"superadmin":    "superadmin",
		"admin":         "admin",
		"jane.smith":    "editor",
		"translator":    "translator",
		"john.doe":      "user",
		"viewer":        "guest",
		"inactive.user": "guest",
	}
	for username, roleKey := range assignments {
		user := users[username]
		if user == nil || user.ID == uuid.Nil {
			continue
		}
		role := roles[roleKey]
		if role == nil || role.ID == uuid.Nil {
			continue
		}
		if err := registry.AssignRole(ctx, user.ID, role.ID, role.Scope, user.ID); err != nil {
			return err
		}
	}
	return nil
}

func ensureSeedRole(ctx context.Context, registry types.RoleRegistry, scope types.ScopeFilter, key, name string, permissions []string) (*types.RoleDefinition, error) {
	key = strings.TrimSpace(key)
	if key == "" || registry == nil {
		return nil, nil
	}
	page, err := registry.ListRoles(ctx, types.RoleFilter{
		RoleKey:       key,
		IncludeSystem: true,
		Scope:         scope,
	})
	if err != nil {
		return nil, err
	}
	if len(page.Roles) == 0 {
		return registry.CreateRole(ctx, types.RoleMutation{
			Name:        name,
			RoleKey:     key,
			Permissions: cloneRolePermissions(permissions),
			Scope:       scope,
		})
	}

	role := page.Roles[0]
	merged, changed := mergeRolePermissions(role.Permissions, permissions)
	if changed || (strings.TrimSpace(name) != "" && strings.TrimSpace(name) != strings.TrimSpace(role.Name)) {
		updated, err := registry.UpdateRole(ctx, role.ID, types.RoleMutation{
			Name:        name,
			RoleKey:     key,
			Permissions: merged,
			Scope:       role.Scope,
		})
		if err != nil {
			return nil, err
		}
		return updated, nil
	}
	return &role, nil
}

func mergeRolePermissions(existing, required []string) ([]string, bool) {
	out := append([]string(nil), existing...)
	seen := map[string]bool{}
	for _, perm := range existing {
		perm = strings.TrimSpace(perm)
		if perm == "" {
			continue
		}
		seen[strings.ToLower(perm)] = true
	}
	changed := false
	for _, perm := range required {
		perm = strings.TrimSpace(perm)
		if perm == "" {
			continue
		}
		key := strings.ToLower(perm)
		if seen[key] {
			continue
		}
		out = append(out, perm)
		seen[key] = true
		changed = true
	}
	return out, changed
}

func cloneRolePermissions(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	out := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		out = append(out, value)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func ensureTranslationExchangeSeedPermissions(ctx context.Context, registry types.RoleRegistry) error {
	if registry == nil {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}

	required := []string{
		"admin.translations.view",
		"admin.translations.edit",
		"admin.translations.manage",
		"admin.translations.assign",
		"admin.translations.approve",
		"admin.translations.claim",
		"admin.translations.export",
		"admin.translations.import.view",
		"admin.translations.import.validate",
		"admin.translations.import.apply",
	}
	scope := seedScopeDefaults()
	for _, roleKey := range []string{"superadmin", "owner"} {
		page, err := registry.ListRoles(ctx, types.RoleFilter{
			RoleKey:       roleKey,
			IncludeSystem: true,
			Scope:         scope,
		})
		if err != nil {
			return err
		}
		if len(page.Roles) == 0 {
			continue
		}

		role := page.Roles[0]
		merged, changed := mergeRolePermissions(role.Permissions, required)
		if !changed {
			continue
		}
		if _, err := registry.UpdateRole(ctx, role.ID, types.RoleMutation{
			Name:        role.Name,
			RoleKey:     role.RoleKey,
			Permissions: merged,
			Scope:       role.Scope,
		}); err != nil {
			return err
		}
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
	hash, err := hashPassword(password)
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
	pagination := normalizeInventoryPagination(filter.Pagination)
	records, total, err := i.users.List(ctx, inventorySelectCriteria(filter, pagination)...)
	if err != nil {
		return types.UserInventoryPage{}, err
	}
	out := make([]types.AuthUser, 0, len(records))
	for _, user := range records {
		if user == nil {
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
	nextOffset := pagination.Offset + len(out)
	if nextOffset > total {
		nextOffset = total
	}
	return types.UserInventoryPage{
		Users:      out,
		Total:      total,
		NextOffset: nextOffset,
		HasMore:    nextOffset < total,
	}, nil
}

func normalizeInventoryPagination(p types.Pagination) types.Pagination {
	const (
		defaultInventoryLimit = 50
		maxInventoryLimit     = 200
	)
	limit := p.Limit
	if limit <= 0 {
		limit = defaultInventoryLimit
	}
	if limit > maxInventoryLimit {
		limit = maxInventoryLimit
	}
	offset := p.Offset
	if offset < 0 {
		offset = 0
	}
	return types.Pagination{Limit: limit, Offset: offset}
}

func inventorySelectCriteria(filter types.UserInventoryFilter, pagination types.Pagination) []repository.SelectCriteria {
	criteria := []repository.SelectCriteria{
		repository.SelectOrderAsc("id"),
		repository.SelectPaginate(pagination.Limit, pagination.Offset),
	}

	if role := strings.ToLower(strings.TrimSpace(filter.Role)); role != "" {
		criteria = append(criteria, repository.SelectRawProcessor(func(q *bun.SelectQuery) *bun.SelectQuery {
			return q.Where("LOWER(?TableAlias.role) = ?", role)
		}))
	}

	statuses := make([]string, 0, len(filter.Statuses))
	for _, status := range filter.Statuses {
		raw := strings.ToLower(strings.TrimSpace(string(status)))
		if raw != "" {
			statuses = append(statuses, raw)
		}
	}
	if len(statuses) > 0 {
		criteria = append(criteria, repository.SelectColumnIn("status", statuses))
	}

	if len(filter.UserIDs) > 0 {
		criteria = append(criteria, repository.SelectColumnIn("id", filter.UserIDs))
	}

	if keyword := strings.ToLower(strings.TrimSpace(filter.Keyword)); keyword != "" {
		like := "%" + keyword + "%"
		criteria = append(criteria, repository.SelectRawProcessor(func(q *bun.SelectQuery) *bun.SelectQuery {
			return q.WhereGroup(" AND ", func(group *bun.SelectQuery) *bun.SelectQuery {
				return group.
					Where("LOWER(?TableAlias.username) LIKE ?", like).
					WhereOr("LOWER(?TableAlias.email) LIKE ?", like)
			})
		}))
	}

	return criteria
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
type GoUsersPreferencesStore = quickstart.GoUsersPreferencesStore

// NewGoUsersPreferencesStore builds a preferences store backed by go-users.
func NewGoUsersPreferencesStore(repo types.PreferenceRepository) (*GoUsersPreferencesStore, error) {
	return quickstart.NewGoUsersPreferencesStore(repo)
}

var _ admin.PreferencesStore = (*GoUsersPreferencesStore)(nil)

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
	case "user.invite.consumed":
		email := fmt.Sprint(record.Data["email"])
		n.Notifications.Add(ctx, admin.Notification{
			Title:   "Invite accepted",
			Message: fmt.Sprintf("Invite accepted by %s", email),
			Read:    false,
		})
	case "user.registration.requested":
		email := fmt.Sprint(record.Data["email"])
		n.Notifications.Add(ctx, admin.Notification{
			Title:   "Registration requested",
			Message: fmt.Sprintf("Registration link requested for %s (expires %v)", email, record.Data["expires_at"]),
			Read:    false,
		})
	case "user.registration.completed":
		email := fmt.Sprint(record.Data["email"])
		n.Notifications.Add(ctx, admin.Notification{
			Title:   "Registration completed",
			Message: fmt.Sprintf("Registration completed for %s", email),
			Read:    false,
		})
	case "user.password.reset":
		email := fmt.Sprint(record.Data["user_email"])
		n.Notifications.Add(ctx, admin.Notification{
			Title:   "Password reset",
			Message: fmt.Sprintf("Password reset completed for %s", email),
			Read:    false,
		})
	case "user.password.reset.requested":
		email := fmt.Sprint(record.Data["user_email"])
		n.Notifications.Add(ctx, admin.Notification{
			Title:   "Password reset requested",
			Message: fmt.Sprintf("Reset link requested for %s (expires %v)", email, record.Data["expires_at"]),
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

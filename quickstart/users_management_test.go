package quickstart

import (
	"context"
	"errors"
	"reflect"
	"testing"

	"github.com/goliatone/go-admin/admin"
	authlib "github.com/goliatone/go-auth"
	userstypes "github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
)

type stubAuthRepo struct{}

type stubInventoryRepo struct{}

type stubRoleRegistry struct{}

type stubProfileRepo struct{}

type captureInventoryRepo struct {
	stubInventoryRepo
	filter userstypes.UserInventoryFilter
}

type captureRoleRegistry struct {
	stubRoleRegistry
	filters       []userstypes.RoleFilter
	roles         []userstypes.RoleDefinition
	filterByScope bool
}

type captureProfileRepo struct {
	stubProfileRepo
	scope userstypes.ScopeFilter
}

func (stubAuthRepo) GetByID(ctx context.Context, id uuid.UUID) (*userstypes.AuthUser, error) {
	_, _ = ctx, id
	return nil, nil
}

func (stubAuthRepo) GetByIdentifier(ctx context.Context, identifier string) (*userstypes.AuthUser, error) {
	_, _ = ctx, identifier
	return nil, nil
}

func (stubAuthRepo) Create(ctx context.Context, input *userstypes.AuthUser) (*userstypes.AuthUser, error) {
	_, _ = ctx, input
	return nil, nil
}

func (stubAuthRepo) Update(ctx context.Context, input *userstypes.AuthUser) (*userstypes.AuthUser, error) {
	_, _ = ctx, input
	return nil, nil
}

func (stubAuthRepo) UpdateStatus(ctx context.Context, actor userstypes.ActorRef, id uuid.UUID, next userstypes.LifecycleState, opts ...userstypes.TransitionOption) (*userstypes.AuthUser, error) {
	_, _, _, _, _ = ctx, actor, id, next, opts
	return nil, nil
}

func (stubAuthRepo) AllowedTransitions(ctx context.Context, id uuid.UUID) ([]userstypes.LifecycleTransition, error) {
	_, _ = ctx, id
	return nil, nil
}

func (stubAuthRepo) ResetPassword(ctx context.Context, id uuid.UUID, passwordHash string) error {
	_, _, _ = ctx, id, passwordHash
	return nil
}

func (stubInventoryRepo) ListUsers(ctx context.Context, filter userstypes.UserInventoryFilter) (userstypes.UserInventoryPage, error) {
	_, _ = ctx, filter
	return userstypes.UserInventoryPage{}, nil
}

func (r *captureInventoryRepo) ListUsers(ctx context.Context, filter userstypes.UserInventoryFilter) (userstypes.UserInventoryPage, error) {
	_ = ctx
	r.filter = filter
	return userstypes.UserInventoryPage{}, nil
}

func (stubRoleRegistry) CreateRole(ctx context.Context, input userstypes.RoleMutation) (*userstypes.RoleDefinition, error) {
	_, _ = ctx, input
	return &userstypes.RoleDefinition{}, nil
}

func (stubRoleRegistry) UpdateRole(ctx context.Context, id uuid.UUID, input userstypes.RoleMutation) (*userstypes.RoleDefinition, error) {
	_, _, _ = ctx, id, input
	return &userstypes.RoleDefinition{}, nil
}

func (stubRoleRegistry) DeleteRole(ctx context.Context, id uuid.UUID, scope userstypes.ScopeFilter, actor uuid.UUID) error {
	_, _, _, _ = ctx, id, scope, actor
	return nil
}

func (stubRoleRegistry) AssignRole(ctx context.Context, userID, roleID uuid.UUID, scope userstypes.ScopeFilter, actor uuid.UUID) error {
	_, _, _, _, _ = ctx, userID, roleID, scope, actor
	return nil
}

func (stubRoleRegistry) UnassignRole(ctx context.Context, userID, roleID uuid.UUID, scope userstypes.ScopeFilter, actor uuid.UUID) error {
	_, _, _, _, _ = ctx, userID, roleID, scope, actor
	return nil
}

func (stubRoleRegistry) ListRoles(ctx context.Context, filter userstypes.RoleFilter) (userstypes.RolePage, error) {
	_, _ = ctx, filter
	return userstypes.RolePage{}, nil
}

func (r *captureRoleRegistry) ListRoles(ctx context.Context, filter userstypes.RoleFilter) (userstypes.RolePage, error) {
	_ = ctx
	r.filters = append(r.filters, filter)
	roles := append([]userstypes.RoleDefinition{}, r.roles...)
	if r.filterByScope {
		roles = rolesMatchingScope(roles, filter.Scope)
	}
	return userstypes.RolePage{Roles: roles, Total: len(roles)}, nil
}

func (stubRoleRegistry) GetRole(ctx context.Context, id uuid.UUID, scope userstypes.ScopeFilter) (*userstypes.RoleDefinition, error) {
	_, _, _ = ctx, id, scope
	return &userstypes.RoleDefinition{}, nil
}

func (stubRoleRegistry) ListAssignments(ctx context.Context, filter userstypes.RoleAssignmentFilter) ([]userstypes.RoleAssignment, error) {
	_, _ = ctx, filter
	return nil, nil
}

func (stubProfileRepo) GetProfile(ctx context.Context, userID uuid.UUID, scope userstypes.ScopeFilter) (*userstypes.UserProfile, error) {
	_, _, _ = ctx, userID, scope
	return nil, nil
}

func (r *captureProfileRepo) GetProfile(ctx context.Context, userID uuid.UUID, scope userstypes.ScopeFilter) (*userstypes.UserProfile, error) {
	_, _ = ctx, userID
	r.scope = scope
	return nil, nil
}

func (stubProfileRepo) UpsertProfile(ctx context.Context, profile userstypes.UserProfile) (*userstypes.UserProfile, error) {
	_ = ctx
	return &profile, nil
}

func stubScopeResolver(ctx context.Context) userstypes.ScopeFilter {
	_ = ctx
	return userstypes.ScopeFilter{}
}

func testActorContext() context.Context {
	actorID := uuid.NewString()
	return authlib.WithActorContext(context.Background(), &authlib.ActorContext{
		ActorID: actorID,
		Subject: actorID,
	})
}

func TestWithGoUsersUserManagementValidation(t *testing.T) {
	cases := []struct {
		name    string
		cfg     GoUsersUserManagementConfig
		missing []string
	}{
		{
			name:    "missing_all",
			cfg:     GoUsersUserManagementConfig{},
			missing: []string{"AuthRepo", "InventoryRepo", "RoleRegistry"},
		},
		{
			name:    "missing_inventory_and_role",
			cfg:     GoUsersUserManagementConfig{AuthRepo: stubAuthRepo{}},
			missing: []string{"InventoryRepo", "RoleRegistry"},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			options := adminOptions{}
			WithGoUsersUserManagement(tc.cfg)(&options)
			err := options.err()
			if err == nil {
				t.Fatalf("expected validation error")
			}
			if !errors.Is(err, ErrGoUsersUserManagementConfig) {
				t.Fatalf("expected ErrGoUsersUserManagementConfig, got %v", err)
			}
			var cfgErr GoUsersUserManagementConfigError
			if !errors.As(err, &cfgErr) {
				t.Fatalf("expected GoUsersUserManagementConfigError, got %T", err)
			}
			if !reflect.DeepEqual(cfgErr.Missing, tc.missing) {
				t.Fatalf("expected missing %v, got %v", tc.missing, cfgErr.Missing)
			}
		})
	}
}

func TestWithGoUsersUserManagementWiresDependencies(t *testing.T) {
	options := adminOptions{}
	cfg := GoUsersUserManagementConfig{
		AuthRepo:      stubAuthRepo{},
		InventoryRepo: stubInventoryRepo{},
		RoleRegistry:  stubRoleRegistry{},
		ProfileRepo:   stubProfileRepo{},
		ScopeResolver: stubScopeResolver,
	}

	WithGoUsersUserManagement(cfg)(&options)
	if err := options.err(); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if options.deps.UserRepository == nil || options.deps.RoleRepository == nil {
		t.Fatalf("expected user and role repositories to be set")
	}
	if _, ok := options.deps.UserRepository.(*admin.GoUsersUserRepository); !ok {
		t.Fatalf("expected GoUsersUserRepository, got %T", options.deps.UserRepository)
	}
	if _, ok := options.deps.RoleRepository.(*admin.GoUsersRoleRepository); !ok {
		t.Fatalf("expected GoUsersRoleRepository, got %T", options.deps.RoleRepository)
	}
	if options.deps.ProfileStore == nil {
		t.Fatalf("expected profile store to be set")
	}
	if _, ok := options.deps.ProfileStore.(*admin.GoUsersProfileStore); !ok {
		t.Fatalf("expected GoUsersProfileStore, got %T", options.deps.ProfileStore)
	}
	if options.deps.BulkUserImport == nil {
		t.Fatalf("expected bulk user import command to be set")
	}
	if options.registerUserRoleBulkRoutes {
		t.Fatalf("expected legacy bulk role routes registration to remain disabled by default")
	}
}

func TestWithGoUsersUserManagementSkipsProfileStoreWhenMissing(t *testing.T) {
	options := adminOptions{}
	cfg := GoUsersUserManagementConfig{
		AuthRepo:      stubAuthRepo{},
		InventoryRepo: stubInventoryRepo{},
		RoleRegistry:  stubRoleRegistry{},
		ScopeResolver: stubScopeResolver,
	}

	WithGoUsersUserManagement(cfg)(&options)
	if err := options.err(); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if options.deps.ProfileStore != nil {
		t.Fatalf("expected profile store to be unset when ProfileRepo is nil")
	}
	if options.deps.BulkUserImport == nil {
		t.Fatalf("expected bulk user import command to be set")
	}
}

func TestGoUsersUserManagementDefaultsMissingResolverFromSingleTenantConfig(t *testing.T) {
	tenantID := uuid.New()
	orgID := uuid.New()
	inventory := &captureInventoryRepo{}
	roles := &captureRoleRegistry{}
	profiles := &captureProfileRepo{}
	options := adminOptions{}

	WithGoUsersUserManagement(GoUsersUserManagementConfig{
		AuthRepo:      stubAuthRepo{},
		InventoryRepo: inventory,
		RoleRegistry:  roles,
		ProfileRepo:   profiles,
	})(&options)
	if err := options.err(); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	finalizeGoUsersUserManagement(NewAdminConfig("/admin", "Admin", "en",
		WithScopeMode(ScopeModeSingle),
		WithDefaultScope(tenantID.String(), orgID.String()),
	), &options)

	ctx := testActorContext()
	if _, _, err := options.deps.UserRepository.List(ctx, admin.ListOptions{Page: 1, PerPage: 10}); err != nil {
		t.Fatalf("user list: %v", err)
	}
	if _, _, err := options.deps.RoleRepository.List(ctx, admin.ListOptions{Page: 1, PerPage: 10}); err != nil {
		t.Fatalf("role list: %v", err)
	}
	if _, err := options.deps.ProfileStore.Get(ctx, uuid.NewString()); err != nil {
		t.Fatalf("profile get: %v", err)
	}

	assertScope(t, "user inventory", inventory.filter.Scope, tenantID, orgID)
	if len(roles.filters) == 0 {
		t.Fatalf("expected role registry to be called")
	}
	assertScope(t, "role list", roles.filters[0].Scope, tenantID, orgID)
	assertScope(t, "profile", profiles.scope, tenantID, orgID)
}

func TestGoUsersUserManagementKeepsExplicitResolverPrecedence(t *testing.T) {
	defaultTenantID := uuid.New()
	defaultOrgID := uuid.New()
	explicitTenantID := uuid.New()
	explicitOrgID := uuid.New()
	inventory := &captureInventoryRepo{}
	roles := &captureRoleRegistry{}
	profiles := &captureProfileRepo{}
	options := adminOptions{}

	WithGoUsersUserManagement(GoUsersUserManagementConfig{
		AuthRepo:      stubAuthRepo{},
		InventoryRepo: inventory,
		RoleRegistry:  roles,
		ProfileRepo:   profiles,
		ScopeResolver: func(context.Context) userstypes.ScopeFilter {
			return userstypes.ScopeFilter{TenantID: explicitTenantID, OrgID: explicitOrgID}
		},
	})(&options)
	if err := options.err(); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	finalizeGoUsersUserManagement(NewAdminConfig("/admin", "Admin", "en",
		WithScopeMode(ScopeModeSingle),
		WithDefaultScope(defaultTenantID.String(), defaultOrgID.String()),
	), &options)

	ctx := testActorContext()
	if _, _, err := options.deps.UserRepository.List(ctx, admin.ListOptions{Page: 1, PerPage: 10}); err != nil {
		t.Fatalf("user list: %v", err)
	}
	if _, _, err := options.deps.RoleRepository.List(ctx, admin.ListOptions{Page: 1, PerPage: 10}); err != nil {
		t.Fatalf("role list: %v", err)
	}
	if _, err := options.deps.ProfileStore.Get(ctx, uuid.NewString()); err != nil {
		t.Fatalf("profile get: %v", err)
	}

	assertScope(t, "user inventory", inventory.filter.Scope, explicitTenantID, explicitOrgID)
	assertScope(t, "role list", roles.filters[0].Scope, explicitTenantID, explicitOrgID)
	assertScope(t, "profile", profiles.scope, explicitTenantID, explicitOrgID)
}

func TestGoUsersUserManagementMultiTenantOmittedResolverDoesNotInjectDefaults(t *testing.T) {
	inventory := &captureInventoryRepo{}
	roles := &captureRoleRegistry{}
	options := adminOptions{}

	WithGoUsersUserManagement(GoUsersUserManagementConfig{
		AuthRepo:      stubAuthRepo{},
		InventoryRepo: inventory,
		RoleRegistry:  roles,
	})(&options)
	if err := options.err(); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	finalizeGoUsersUserManagement(NewAdminConfig("/admin", "Admin", "en",
		WithScopeMode(ScopeModeMulti),
		WithDefaultScope(uuid.NewString(), uuid.NewString()),
	), &options)

	ctx := testActorContext()
	if _, _, err := options.deps.UserRepository.List(ctx, admin.ListOptions{Page: 1, PerPage: 10}); err != nil {
		t.Fatalf("user list: %v", err)
	}
	if _, _, err := options.deps.RoleRepository.List(ctx, admin.ListOptions{Page: 1, PerPage: 10}); err != nil {
		t.Fatalf("role list: %v", err)
	}

	assertScope(t, "user inventory", inventory.filter.Scope, uuid.Nil, uuid.Nil)
	assertScope(t, "role list", roles.filters[0].Scope, uuid.Nil, uuid.Nil)
}

func TestGoUsersUserManagementPreservesDependencyOptionOrder(t *testing.T) {
	sentinelUser := admin.NewGoUsersUserRepository(nil, nil, nil)
	sentinelRole := admin.NewGoUsersRoleRepository(nil, nil)
	sentinelProfile := admin.NewGoUsersProfileStore(nil, nil)
	goUsersCfg := GoUsersUserManagementConfig{
		AuthRepo:      stubAuthRepo{},
		InventoryRepo: stubInventoryRepo{},
		RoleRegistry:  stubRoleRegistry{},
		ProfileRepo:   stubProfileRepo{},
	}
	cfg := NewAdminConfig("/admin", "Admin", "en")

	t.Run("admin_dependencies_before_go_users_are_overwritten", func(t *testing.T) {
		options := adminOptions{}
		WithAdminDependencies(admin.Dependencies{
			UserRepository: sentinelUser,
			RoleRepository: sentinelRole,
			ProfileStore:   sentinelProfile,
		})(&options)
		WithGoUsersUserManagement(goUsersCfg)(&options)
		finalizeGoUsersUserManagement(cfg, &options)

		if options.deps.UserRepository == sentinelUser || options.deps.RoleRepository == sentinelRole || options.deps.ProfileStore == sentinelProfile {
			t.Fatalf("expected go-users option to overwrite earlier admin dependencies")
		}
	})

	t.Run("admin_dependencies_after_go_users_win", func(t *testing.T) {
		options := adminOptions{}
		WithGoUsersUserManagement(goUsersCfg)(&options)
		WithAdminDependencies(admin.Dependencies{
			UserRepository: sentinelUser,
			RoleRepository: sentinelRole,
			ProfileStore:   sentinelProfile,
		})(&options)
		finalizeGoUsersUserManagement(cfg, &options)

		if options.deps.UserRepository != sentinelUser {
			t.Fatalf("expected later user repository dependency to win")
		}
		if options.deps.RoleRepository != sentinelRole {
			t.Fatalf("expected later role repository dependency to win")
		}
		if options.deps.ProfileStore != sentinelProfile {
			t.Fatalf("expected later profile store dependency to win")
		}
	})
}

func TestGoUsersUserManagementRoleListUsesDefaultScopeForSeededRoles(t *testing.T) {
	tenantID := uuid.New()
	orgID := uuid.New()
	roleID := uuid.New()
	roles := &captureRoleRegistry{
		filterByScope: true,
		roles: []userstypes.RoleDefinition{
			{
				ID:      roleID,
				Name:    "Editor",
				RoleKey: "editor",
				Scope: userstypes.ScopeFilter{
					TenantID: tenantID,
					OrgID:    orgID,
				},
			},
		},
	}
	options := adminOptions{}

	WithGoUsersUserManagement(GoUsersUserManagementConfig{
		AuthRepo:      stubAuthRepo{},
		InventoryRepo: stubInventoryRepo{},
		RoleRegistry:  roles,
	})(&options)
	if err := options.err(); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	finalizeGoUsersUserManagement(NewAdminConfig("/admin", "Admin", "en",
		WithScopeMode(ScopeModeSingle),
		WithDefaultScope(tenantID.String(), orgID.String()),
	), &options)

	listed, total, err := options.deps.RoleRepository.List(testActorContext(), admin.ListOptions{Page: 1, PerPage: 10})
	if err != nil {
		t.Fatalf("role list: %v", err)
	}
	if total != 1 || len(listed) != 1 {
		t.Fatalf("expected one scoped role, got total=%d len=%d", total, len(listed))
	}
	if listed[0].ID != roleID.String() || listed[0].RoleKey != "editor" {
		t.Fatalf("unexpected role record: %#v", listed[0])
	}
	if len(roles.filters) == 0 {
		t.Fatalf("expected role registry to be called")
	}
	assertScope(t, "seeded role list", roles.filters[0].Scope, tenantID, orgID)
}

func assertScope(t *testing.T, label string, scope userstypes.ScopeFilter, tenantID, orgID uuid.UUID) {
	t.Helper()
	if scope.TenantID != tenantID || scope.OrgID != orgID {
		t.Fatalf("%s scope = tenant %s org %s, want tenant %s org %s", label, scope.TenantID, scope.OrgID, tenantID, orgID)
	}
}

func rolesMatchingScope(roles []userstypes.RoleDefinition, scope userstypes.ScopeFilter) []userstypes.RoleDefinition {
	out := make([]userstypes.RoleDefinition, 0, len(roles))
	for _, role := range roles {
		if role.Scope.TenantID == scope.TenantID && role.Scope.OrgID == scope.OrgID {
			out = append(out, role)
		}
	}
	return out
}

func TestNewUsersModuleDefaultsMenuParentToMainGroup(t *testing.T) {
	module := NewUsersModule(admin.WithUserProfilesPanel())
	items := module.MenuItems("en")
	if len(items) == 0 {
		t.Fatalf("expected users module menu items")
	}
	for _, item := range items {
		if got := item.ParentID; got != NavigationGroupMainID {
			t.Fatalf("expected parent %q, got %q", NavigationGroupMainID, got)
		}
	}
}

func TestNewUsersModuleAllowsMenuParentOverride(t *testing.T) {
	module := NewUsersModule(admin.WithUserMenuParent("custom.parent"))
	items := module.MenuItems("en")
	if len(items) == 0 {
		t.Fatalf("expected users module menu items")
	}
	for _, item := range items {
		if got := item.ParentID; got != "custom.parent" {
			t.Fatalf("expected overridden parent custom.parent, got %q", got)
		}
	}
}

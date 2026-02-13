package quickstart

import (
	"context"
	"errors"
	"reflect"
	"testing"

	"github.com/goliatone/go-admin/admin"
	userstypes "github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
)

type stubAuthRepo struct{}

type stubInventoryRepo struct{}

type stubRoleRegistry struct{}

type stubProfileRepo struct{}

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

func (stubProfileRepo) UpsertProfile(ctx context.Context, profile userstypes.UserProfile) (*userstypes.UserProfile, error) {
	_ = ctx
	return &profile, nil
}

func stubScopeResolver(ctx context.Context) userstypes.ScopeFilter {
	_ = ctx
	return userstypes.ScopeFilter{}
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

func TestWithLegacyUserRoleBulkRoutesEnablesLegacyRoutes(t *testing.T) {
	options := adminOptions{}

	if options.registerUserRoleBulkRoutes {
		t.Fatalf("expected legacy bulk role routes registration to be disabled by default")
	}

	WithLegacyUserRoleBulkRoutes()(&options)
	if !options.registerUserRoleBulkRoutes {
		t.Fatalf("expected legacy bulk role routes registration to be enabled")
	}
}

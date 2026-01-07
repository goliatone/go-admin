package admin

import (
	"context"
	"testing"

	auth "github.com/goliatone/go-auth"
	users "github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
)

func TestUserManagementServiceFiltersRoleAssignments(t *testing.T) {
	roleID := uuid.NewString()
	userRepo := &recordingUserRepo{}
	roleRepo := &recordingRoleRepo{}
	service := NewUserManagementService(userRepo, roleRepo)
	service.WithRoleAssignmentLookup(UUIDRoleAssignmentLookup{})

	record, err := service.SaveUser(context.Background(), UserRecord{
		Email:    "rolefilter@example.com",
		Username: "rolefilter",
		Role:     "member",
		Roles:    []string{roleID, "member"},
	})
	if err != nil {
		t.Fatalf("save user: %v", err)
	}
	if len(roleRepo.assigned) != 1 || roleRepo.assigned[0] != roleID {
		t.Fatalf("expected only UUID role assignment, got %+v", roleRepo.assigned)
	}
	if len(record.Roles) != 1 || record.Roles[0] != roleID {
		t.Fatalf("expected filtered roles, got %+v", record.Roles)
	}
	if len(userRepo.created.Roles) != 1 || userRepo.created.Roles[0] != roleID {
		t.Fatalf("expected persisted roles to be filtered, got %+v", userRepo.created.Roles)
	}
}

func TestGoUsersRoleAssignmentLookupSkipsNonUUID(t *testing.T) {
	roleID := uuid.New()
	registry := &recordingRoleRegistry{}
	roleRepo := NewGoUsersRoleRepository(registry, func(context.Context) users.ScopeFilter {
		return users.ScopeFilter{}
	})
	userRepo := &recordingUserRepo{}
	service := NewUserManagementService(userRepo, roleRepo)

	if _, ok := service.roleLookup.(UUIDRoleAssignmentLookup); !ok {
		t.Fatalf("expected UUIDRoleAssignmentLookup default, got %T", service.roleLookup)
	}

	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: uuid.NewString()})
	record, err := service.SaveUser(ctx, UserRecord{
		Email:    "gousers@example.com",
		Username: "gousers",
		Role:     "member",
		Roles:    []string{roleID.String(), "member"},
	})
	if err != nil {
		t.Fatalf("save user: %v", err)
	}
	if len(registry.assigned) != 1 || registry.assigned[0] != roleID {
		t.Fatalf("expected only UUID assignment, got %+v", registry.assigned)
	}
	if len(record.Roles) != 1 || record.Roles[0] != roleID.String() {
		t.Fatalf("expected filtered roles, got %+v", record.Roles)
	}
}

type recordingUserRepo struct {
	created UserRecord
	updated UserRecord
}

func (r *recordingUserRepo) List(context.Context, ListOptions) ([]UserRecord, int, error) {
	return nil, 0, nil
}

func (r *recordingUserRepo) Get(context.Context, string) (UserRecord, error) {
	return UserRecord{}, ErrNotFound
}

func (r *recordingUserRepo) Create(_ context.Context, user UserRecord) (UserRecord, error) {
	r.created = user
	return user, nil
}

func (r *recordingUserRepo) Update(_ context.Context, user UserRecord) (UserRecord, error) {
	r.updated = user
	return user, nil
}

func (r *recordingUserRepo) Delete(context.Context, string) error {
	return nil
}

func (r *recordingUserRepo) Search(context.Context, string, int) ([]UserRecord, error) {
	return nil, nil
}

type recordingRoleRepo struct {
	assigned   []string
	unassigned []string
}

func (r *recordingRoleRepo) List(context.Context, ListOptions) ([]RoleRecord, int, error) {
	return nil, 0, nil
}

func (r *recordingRoleRepo) Get(context.Context, string) (RoleRecord, error) {
	return RoleRecord{}, ErrNotFound
}

func (r *recordingRoleRepo) Create(_ context.Context, role RoleRecord) (RoleRecord, error) {
	return role, nil
}

func (r *recordingRoleRepo) Update(_ context.Context, role RoleRecord) (RoleRecord, error) {
	return role, nil
}

func (r *recordingRoleRepo) Delete(context.Context, string) error {
	return nil
}

func (r *recordingRoleRepo) Assign(_ context.Context, _ string, roleID string) error {
	r.assigned = append(r.assigned, roleID)
	return nil
}

func (r *recordingRoleRepo) Unassign(_ context.Context, _ string, roleID string) error {
	r.unassigned = append(r.unassigned, roleID)
	return nil
}

func (r *recordingRoleRepo) RolesForUser(context.Context, string) ([]RoleRecord, error) {
	return nil, nil
}

type recordingRoleRegistry struct {
	assigned []uuid.UUID
}

func (r *recordingRoleRegistry) CreateRole(context.Context, users.RoleMutation) (*users.RoleDefinition, error) {
	return &users.RoleDefinition{}, nil
}

func (r *recordingRoleRegistry) UpdateRole(context.Context, uuid.UUID, users.RoleMutation) (*users.RoleDefinition, error) {
	return &users.RoleDefinition{}, nil
}

func (r *recordingRoleRegistry) DeleteRole(context.Context, uuid.UUID, users.ScopeFilter, uuid.UUID) error {
	return nil
}

func (r *recordingRoleRegistry) AssignRole(_ context.Context, _ uuid.UUID, roleID uuid.UUID, _ users.ScopeFilter, _ uuid.UUID) error {
	r.assigned = append(r.assigned, roleID)
	return nil
}

func (r *recordingRoleRegistry) UnassignRole(context.Context, uuid.UUID, uuid.UUID, users.ScopeFilter, uuid.UUID) error {
	return nil
}

func (r *recordingRoleRegistry) ListRoles(context.Context, users.RoleFilter) (users.RolePage, error) {
	return users.RolePage{}, nil
}

func (r *recordingRoleRegistry) GetRole(context.Context, uuid.UUID, users.ScopeFilter) (*users.RoleDefinition, error) {
	return nil, ErrNotFound
}

func (r *recordingRoleRegistry) ListAssignments(context.Context, users.RoleAssignmentFilter) ([]users.RoleAssignment, error) {
	return nil, nil
}

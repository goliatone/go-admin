package admin

import (
	"context"
	"errors"
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

func TestUserManagementServiceDeleteUserRollsBackRoleCleanupFailure(t *testing.T) {
	userRepo := &recordingUserRepo{}
	roleRepo := &recordingRoleRepo{
		rolesForUser: []RoleRecord{
			{ID: "role-1", Name: "Role 1"},
			{ID: "role-2", Name: "Role 2"},
		},
		unassignErrByID: map[string]error{
			"role-2": errors.New("role registry down"),
		},
	}
	service := NewUserManagementService(userRepo, roleRepo)

	err := service.DeleteUser(context.Background(), "user-1")
	if err == nil || !errors.Is(err, roleRepo.unassignErrByID["role-2"]) {
		t.Fatalf("expected role cleanup failure, got %v", err)
	}
	if len(userRepo.deleted) != 0 {
		t.Fatalf("expected user delete to be skipped when role cleanup fails, got %+v", userRepo.deleted)
	}
	if got := roleRepo.unassigned; len(got) != 2 || got[0] != "role-1" || got[1] != "role-2" {
		t.Fatalf("expected ordered unassign attempts before failure, got %+v", got)
	}
	if got := roleRepo.assigned; len(got) != 1 || got[0] != "role-1" {
		t.Fatalf("expected successful unassigns to be rolled back, got %+v", got)
	}
}

func TestUserManagementServiceDeleteUserRestoresRolesWhenDeleteFails(t *testing.T) {
	deleteErr := errors.New("disable user failed")
	userRepo := &recordingUserRepo{deleteErr: deleteErr}
	roleRepo := &recordingRoleRepo{
		rolesForUser: []RoleRecord{
			{ID: "role-1", Name: "Role 1"},
			{ID: "role-2", Name: "Role 2"},
		},
	}
	service := NewUserManagementService(userRepo, roleRepo)

	err := service.DeleteUser(context.Background(), "user-1")
	if err == nil || !errors.Is(err, deleteErr) {
		t.Fatalf("expected delete failure, got %v", err)
	}
	if len(userRepo.deleted) != 1 || userRepo.deleted[0] != "user-1" {
		t.Fatalf("expected one delete attempt, got %+v", userRepo.deleted)
	}
	if got := roleRepo.unassigned; len(got) != 2 {
		t.Fatalf("expected role cleanup before delete, got %+v", got)
	}
	if got := roleRepo.assigned; len(got) != 2 {
		t.Fatalf("expected roles to be restored after delete failure, got %+v", got)
	}
}

func TestUserManagementServiceDeleteUserRecordsActivityAfterSuccessfulCleanup(t *testing.T) {
	userRepo := &recordingUserRepo{}
	roleRepo := &recordingRoleRepo{
		rolesForUser: []RoleRecord{
			{ID: "role-1", Name: "Role 1"},
		},
	}
	activity := &recordingSink{}
	service := NewUserManagementService(userRepo, roleRepo)
	service.WithActivitySink(activity)

	if err := service.DeleteUser(context.Background(), "user-1"); err != nil {
		t.Fatalf("delete user: %v", err)
	}
	if len(userRepo.deleted) != 1 || userRepo.deleted[0] != "user-1" {
		t.Fatalf("expected successful delete call, got %+v", userRepo.deleted)
	}
	if len(activity.entries) != 1 {
		t.Fatalf("expected one delete activity entry, got %d", len(activity.entries))
	}
	if activity.entries[0].Action != "user.delete" || activity.entries[0].Object != "user:user-1" {
		t.Fatalf("unexpected delete activity entry: %+v", activity.entries[0])
	}
}

type recordingUserRepo struct {
	created   UserRecord
	updated   UserRecord
	deleted   []string
	deleteErr error
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

func (r *recordingUserRepo) Delete(_ context.Context, id string) error {
	r.deleted = append(r.deleted, id)
	return r.deleteErr
}

func (r *recordingUserRepo) Search(context.Context, string, int) ([]UserRecord, error) {
	return nil, nil
}

type recordingRoleRepo struct {
	assigned        []string
	unassigned      []string
	rolesForUser    []RoleRecord
	rolesForUserErr error
	assignErrByID   map[string]error
	unassignErrByID map[string]error
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
	if err, ok := r.assignErrByID[roleID]; ok {
		return err
	}
	return nil
}

func (r *recordingRoleRepo) Unassign(_ context.Context, _ string, roleID string) error {
	r.unassigned = append(r.unassigned, roleID)
	if err, ok := r.unassignErrByID[roleID]; ok {
		return err
	}
	return nil
}

func (r *recordingRoleRepo) RolesForUser(context.Context, string) ([]RoleRecord, error) {
	if r.rolesForUserErr != nil {
		return nil, r.rolesForUserErr
	}
	out := make([]RoleRecord, len(r.rolesForUser))
	copy(out, r.rolesForUser)
	return out, nil
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

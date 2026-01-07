package admin

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
)

// RoleAssignmentLookup decides whether a role ID should be treated as an assignable custom role.
type RoleAssignmentLookup interface {
	IsAssignable(ctx context.Context, roleID string) (bool, error)
}

// UUIDRoleAssignmentLookup treats only UUID role IDs as assignable.
type UUIDRoleAssignmentLookup struct{}

func (UUIDRoleAssignmentLookup) IsAssignable(_ context.Context, roleID string) (bool, error) {
	roleID = strings.TrimSpace(roleID)
	if roleID == "" {
		return false, nil
	}
	if _, err := uuid.Parse(roleID); err != nil {
		return false, nil
	}
	return true, nil
}

// RoleRepositoryLookup uses a RoleRepository to validate assignable IDs.
type RoleRepositoryLookup struct {
	Roles RoleRepository
}

func (l RoleRepositoryLookup) IsAssignable(ctx context.Context, roleID string) (bool, error) {
	if l.Roles == nil {
		return false, nil
	}
	roleID = strings.TrimSpace(roleID)
	if roleID == "" {
		return false, nil
	}
	if _, err := l.Roles.Get(ctx, roleID); err != nil {
		if errors.Is(err, ErrNotFound) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func defaultRoleAssignmentLookup(roles RoleRepository) RoleAssignmentLookup {
	if roles == nil {
		return nil
	}
	if _, ok := roles.(*GoUsersRoleRepository); ok {
		return UUIDRoleAssignmentLookup{}
	}
	return nil
}

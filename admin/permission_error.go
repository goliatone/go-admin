package admin

import "fmt"

// PermissionDeniedError describes a missing authorization permission.
type PermissionDeniedError struct {
	Permission string
	Resource   string
}

func (e PermissionDeniedError) Error() string {
	if e.Permission == "" {
		return ErrForbidden.Error()
	}
	if e.Resource == "" {
		return fmt.Sprintf("missing permission %s", e.Permission)
	}
	return fmt.Sprintf("missing permission %s for %s", e.Permission, e.Resource)
}

func (e PermissionDeniedError) Unwrap() error {
	return ErrForbidden
}

func permissionDenied(permission, resource string) error {
	return PermissionDeniedError{Permission: permission, Resource: resource}
}

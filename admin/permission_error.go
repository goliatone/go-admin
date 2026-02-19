package admin

import (
	"fmt"
	"strings"
)

// PermissionDeniedError describes a missing authorization permission.
type PermissionDeniedError struct {
	Permission     string
	Resource       string
	Hint           string
	ReauthRequired bool
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
	hint, reauthRequired := permissionDeniedHint(permission, resource)
	return PermissionDeniedError{
		Permission:     permission,
		Resource:       resource,
		Hint:           hint,
		ReauthRequired: reauthRequired,
	}
}

func permissionDeniedHint(permission, resource string) (string, bool) {
	permission = strings.ToLower(strings.TrimSpace(permission))
	resource = strings.ToLower(strings.TrimSpace(resource))
	if permission == "" && resource == "" {
		return "", false
	}
	if strings.HasPrefix(permission, "admin.translations.") || resource == "translations" {
		return "Grant the missing translation permission to the current role and reload the page.", false
	}
	return "Grant the missing permission to the current role and reload the page.", false
}

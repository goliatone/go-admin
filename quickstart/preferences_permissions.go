package quickstart

import "fmt"

// PermissionDefinition describes a permission entry for registration.
type PermissionDefinition struct {
	Key         string
	Description string
}

// PermissionRegisterFunc registers a permission definition with a host registry.
type PermissionRegisterFunc func(def PermissionDefinition) error

// PreferencesPermissions returns the default permissions for preferences.
func PreferencesPermissions() []PermissionDefinition {
	return []PermissionDefinition{
		{Key: "admin.preferences.view", Description: "View user preferences"},
		{Key: "admin.preferences.edit", Description: "Edit user preferences"},
	}
}

// RegisterPreferencesPermissions registers the default preferences permissions.
func RegisterPreferencesPermissions(register PermissionRegisterFunc) error {
	if register == nil {
		return fmt.Errorf("permission registry required")
	}
	for _, def := range PreferencesPermissions() {
		if err := register(def); err != nil {
			return err
		}
	}
	return nil
}

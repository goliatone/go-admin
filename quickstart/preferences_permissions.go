package quickstart

import "fmt"

import "github.com/goliatone/go-admin/admin"

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

// TranslationExchangePermissions returns default permissions for translation exchange flows.
func TranslationExchangePermissions() []PermissionDefinition {
	return []PermissionDefinition{
		{Key: admin.PermAdminTranslationsExport, Description: "Export translation exchange payloads"},
		{Key: admin.PermAdminTranslationsImportValidate, Description: "Validate translation exchange imports"},
		{Key: admin.PermAdminTranslationsImportApply, Description: "Apply translation exchange imports"},
		{Key: admin.PermAdminTranslationsImportView, Description: "Download/view translation exchange templates"},
	}
}

// RegisterTranslationExchangePermissions registers translation exchange permissions.
func RegisterTranslationExchangePermissions(register PermissionRegisterFunc) error {
	if register == nil {
		return fmt.Errorf("permission registry required")
	}
	for _, def := range TranslationExchangePermissions() {
		if err := register(def); err != nil {
			return err
		}
	}
	return nil
}

// TranslationQueuePermissions returns default permissions for translation queue flows.
func TranslationQueuePermissions() []PermissionDefinition {
	return []PermissionDefinition{
		{Key: admin.PermAdminTranslationsView, Description: "View translation queue and assignment status"},
		{Key: admin.PermAdminTranslationsEdit, Description: "Submit queue work for review and update assignment payload"},
		{Key: admin.PermAdminTranslationsManage, Description: "Archive/manage queue assignments and bulk lifecycle actions"},
		{Key: admin.PermAdminTranslationsAssign, Description: "Assign/release queue assignments"},
		{Key: admin.PermAdminTranslationsApprove, Description: "Approve/reject queue review submissions"},
		{Key: admin.PermAdminTranslationsClaim, Description: "Claim open-pool queue assignments"},
	}
}

// RegisterTranslationQueuePermissions registers translation queue permissions.
func RegisterTranslationQueuePermissions(register PermissionRegisterFunc) error {
	if register == nil {
		return fmt.Errorf("permission registry required")
	}
	for _, def := range TranslationQueuePermissions() {
		if err := register(def); err != nil {
			return err
		}
	}
	return nil
}

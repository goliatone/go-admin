package quickstart

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-users/command"
	userstypes "github.com/goliatone/go-users/pkg/types"
)

const (
	UserRoleBulkAssignRouteKey   = "users.bulk.assign_role"
	UserRoleBulkUnassignRouteKey = "users.bulk.unassign_role"
)

var ErrGoUsersUserManagementConfig = errors.New("go-users user management config invalid")

// GoUsersUserManagementConfig captures go-users adapters used by quickstart user management.
type GoUsersUserManagementConfig struct {
	AuthRepo      userstypes.AuthRepository
	InventoryRepo userstypes.UserInventoryRepository
	RoleRegistry  userstypes.RoleRegistry
	ProfileRepo   userstypes.ProfileRepository
	ScopeResolver func(context.Context) userstypes.ScopeFilter
}

type GoUsersUserManagementConfigError struct {
	Missing []string
}

func (e GoUsersUserManagementConfigError) Error() string {
	if len(e.Missing) == 0 {
		return ErrGoUsersUserManagementConfig.Error()
	}
	return fmt.Sprintf("%s (missing: %s)", ErrGoUsersUserManagementConfig.Error(), strings.Join(e.Missing, ", "))
}

func (e GoUsersUserManagementConfigError) Unwrap() error {
	return ErrGoUsersUserManagementConfig
}

// WithGoUsersUserManagement wires go-users repositories into admin dependencies.
func WithGoUsersUserManagement(cfg GoUsersUserManagementConfig) AdminOption {
	return func(opts *adminOptions) {
		if opts == nil {
			return
		}
		if err := validateGoUsersUserManagementConfig(cfg); err != nil {
			opts.addError(err)
			return
		}
		opts.deps.UserRepository = admin.NewGoUsersUserRepository(cfg.AuthRepo, cfg.InventoryRepo, cfg.ScopeResolver)
		opts.deps.RoleRepository = admin.NewGoUsersRoleRepository(cfg.RoleRegistry, cfg.ScopeResolver)
		if cfg.ProfileRepo != nil {
			opts.deps.ProfileStore = admin.NewGoUsersProfileStore(cfg.ProfileRepo, cfg.ScopeResolver)
		}
		if opts.deps.BulkUserImport == nil {
			create := command.NewUserCreateCommand(command.UserCreateCommandConfig{Repository: cfg.AuthRepo})
			opts.deps.BulkUserImport = command.NewBulkUserImportCommand(create)
		}
	}
}

// NewUsersModule returns the built-in user management module with options applied.
func NewUsersModule(opts ...admin.UserManagementModuleOption) *admin.UserManagementModule {
	return admin.NewUserManagementModule(opts...)
}

func validateGoUsersUserManagementConfig(cfg GoUsersUserManagementConfig) error {
	missing := []string{}
	if cfg.AuthRepo == nil {
		missing = append(missing, "AuthRepo")
	}
	if cfg.InventoryRepo == nil {
		missing = append(missing, "InventoryRepo")
	}
	if cfg.RoleRegistry == nil {
		missing = append(missing, "RoleRegistry")
	}
	if len(missing) > 0 {
		return GoUsersUserManagementConfigError{Missing: missing}
	}
	return nil
}

func registerUserRoleBulkRoutes(adm *admin.Admin, cfg admin.Config) error {
	if adm == nil {
		return nil
	}
	hook := func(r admin.AdminRouter) error {
		if !featureEnabled(adm.FeatureGate(), string(admin.FeatureUsers)) {
			return nil
		}
		return RegisterUserRoleBulkRoutes(r, cfg, adm)
	}
	if router := adm.PublicRouter(); router != nil {
		return hook(router)
	}
	adm.AddInitHook(hook)
	return nil
}

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

const (
	goUsersScopeResolverSourceDefaulted = "defaulted"
	goUsersScopeResolverSourceExplicit  = "explicit"
	goUsersScopeResolverSourceUnknown   = "unknown"
)

// GoUsersUserManagementConfig captures go-users adapters used by quickstart user management.
type GoUsersUserManagementConfig struct {
	AuthRepo      userstypes.AuthRepository                    `json:"auth_repo"`
	InventoryRepo userstypes.UserInventoryRepository           `json:"inventory_repo"`
	RoleRegistry  userstypes.RoleRegistry                      `json:"role_registry"`
	ProfileRepo   userstypes.ProfileRepository                 `json:"profile_repo"`
	ScopeResolver func(context.Context) userstypes.ScopeFilter `json:"scope_resolver"`
}

type GoUsersUserManagementConfigError struct {
	Missing []string `json:"missing"`
}

type goUsersUserManagementWiring struct {
	source       string
	explicit     func(context.Context) userstypes.ScopeFilter
	defaulted    func(context.Context) userstypes.ScopeFilter
	userRepo     *admin.GoUsersUserRepository
	roleRepo     *admin.GoUsersRoleRepository
	profileStore *admin.GoUsersProfileStore
	profileWired bool
	finalized    bool
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
		wiring := newGoUsersUserManagementWiring(cfg)
		userRepo := admin.NewGoUsersUserRepository(cfg.AuthRepo, cfg.InventoryRepo, wiring.resolve)
		roleRepo := admin.NewGoUsersRoleRepository(cfg.RoleRegistry, wiring.resolve)
		opts.deps.UserRepository = userRepo
		opts.deps.RoleRepository = roleRepo
		wiring.userRepo = userRepo
		wiring.roleRepo = roleRepo
		if cfg.ProfileRepo != nil {
			profileStore := admin.NewGoUsersProfileStore(cfg.ProfileRepo, wiring.resolve)
			opts.deps.ProfileStore = profileStore
			wiring.profileStore = profileStore
			wiring.profileWired = true
		}
		if opts.deps.BulkUserImport == nil {
			create := command.NewUserCreateCommand(command.UserCreateCommandConfig{Repository: cfg.AuthRepo})
			opts.deps.BulkUserImport = command.NewBulkUserImportCommand(create)
		}
		opts.goUsersUserManagement = wiring
	}
}

// NewUsersModule returns the built-in user management module with options applied.
func NewUsersModule(opts ...admin.UserManagementModuleOption) *admin.UserManagementModule {
	moduleOpts := []admin.UserManagementModuleOption{
		admin.WithUserMenuParent(NavigationGroupMainID),
	}
	moduleOpts = append(moduleOpts, opts...)
	return admin.NewUserManagementModule(moduleOpts...)
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

func newGoUsersUserManagementWiring(cfg GoUsersUserManagementConfig) *goUsersUserManagementWiring {
	wiring := &goUsersUserManagementWiring{
		source: goUsersScopeResolverSourceDefaulted,
	}
	if cfg.ScopeResolver != nil {
		wiring.source = goUsersScopeResolverSourceExplicit
		wiring.explicit = cfg.ScopeResolver
	}
	return wiring
}

func (w *goUsersUserManagementWiring) resolve(ctx context.Context) userstypes.ScopeFilter {
	if w == nil {
		return userstypes.ScopeFilter{}
	}
	if w.explicit != nil {
		return w.explicit(ctx)
	}
	if w.defaulted != nil {
		return w.defaulted(ctx)
	}
	return userstypes.ScopeFilter{}
}

func finalizeGoUsersUserManagement(cfg admin.Config, opts *adminOptions) {
	if opts == nil || opts.goUsersUserManagement == nil {
		return
	}
	opts.goUsersUserManagement.finalize(cfg)
}

func (w *goUsersUserManagementWiring) finalize(cfg admin.Config) {
	if w == nil || w.explicit != nil {
		return
	}
	w.defaulted = ScopeBuilder(cfg)
	w.finalized = true
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

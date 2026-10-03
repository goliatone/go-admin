package main

import (
	"errors"
	"os"
	"path/filepath"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/data"
	appcfg "github.com/goliatone/go-admin/examples/web/config"
	"github.com/goliatone/go-admin/examples/web/datamodule"
	"github.com/goliatone/go-admin/examples/web/setup"
	"github.com/goliatone/go-admin/examples/web/stores"
)

// newExampleDataModule demonstrates all application-owned dependencies. Neither
// the module nor quickstart implicitly selects a provider, database or write gate.
func newExampleDataModule(adm *coreadmin.Admin, cfg coreadmin.Config, options appcfg.AdminDataConfig, users stores.UserDependencies, environment string, isDevelopment bool) (*coreadmin.DataModule, func() error, error) {
	filename, err := filepath.Abs(options.StorePath)
	if err != nil {
		return nil, nil, err
	}
	if err = os.MkdirAll(filepath.Dir(filename), 0700); err != nil {
		return nil, nil, err
	}
	runtime, err := datamodule.Open(filename)
	if err != nil {
		return nil, nil, err
	}
	enabled := func() bool { return options.Enabled && featureEnabled(adm.FeatureGate(), "data") }
	access := setup.DataConsoleAccess{Config: cfg, Users: users, Environment: environment, Enabled: enabled}
	service, err := data.NewService(data.ServiceConfig{
		Providers: map[string]data.Provider{"kitchen-sink": runtime}, Target: runtime, Store: runtime.Store,
		Policy: access, Resolve: access.Resolve,
		Preview: data.ApplicationPreviewConfig{Adapter: runtime, Enabled: isDevelopment, ApplicationID: "go-admin-web", EnvironmentID: environment, Lifetime: options.PreviewLifetime, Surfaces: []data.PreviewSurface{{ID: datamodule.OrdersReportSurface, Label: "Synthetic orders report", Kind: "report", EntityID: "orders", Fields: []string{"id", "amount", "local_day"}}}},
		// This example's adapter has focused conformance tests. Enabling another
		// application's adapters requires that application's own evidence.
		WritesEnabled: options.WritesEnabled && isDevelopment,
	})
	if err != nil {
		return nil, nil, errors.Join(err, runtime.Close())
	}
	module, err := coreadmin.NewDataModule(coreadmin.DataModuleConfig{
		BasePath: cfg.BasePath,
		Service:  service, TargetID: datamodule.TargetID, Enabled: enabled, ResolveIdentity: access.Identity,
		MenuParent:      setup.NavigationGroupMain,
		PreviewSurfaces: map[string]coreadmin.DataPreviewSurface{datamodule.OrdersReportSurface: syntheticPreviewSurface(runtime)},
	})
	if err != nil {
		return nil, nil, errors.Join(err, runtime.Close())
	}
	if err = adm.RegisterModule(&syntheticOrdersReportModule{runtime: runtime, access: access}); err != nil {
		return nil, nil, errors.Join(err, module.Close(), runtime.Close())
	}
	return module, func() error { return errors.Join(module.Close(), runtime.Close()) }, nil
}

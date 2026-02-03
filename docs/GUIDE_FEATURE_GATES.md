# Feature Gates Guide

This guide explains how feature gating works in go-admin, how to configure it,
and how to use gates to control modules, routes, and UI surfaces.

## Overview

go-admin uses `github.com/goliatone/go-featuregate` to resolve feature gates.
Each gate is a boolean keyed by string. go-admin reads feature gates in a few
places:

- Module manifests (`Manifest().FeatureFlags`) during module loading.
- Boot steps (`FeatureGates.Require`) when registering routes and handlers.
- Service bindings (search, settings, jobs, media, export, bulk) when called.

When a gated feature is disabled, go-admin returns `FeatureDisabledError`, which
is mapped to a 404 response by default.

## Key Concepts

- Feature gate key: A string identifier (for example `"search"` or `"debug"`).
- Feature gate: A resolver that answers enabled/disabled for keys and scopes.
- Defaults: Base enablement map used to build the gate.
- Overrides: Runtime mutations stored in a gate override store.
- Scope: Feature gates can be resolved at system/tenant/org/user scopes.
  go-admin uses **system scope** for core and module gating by default.

Note: go-admin does not parse environment variables directly. Your host app
decides how to build defaults (env, config files, etc).

## Built-in Feature Keys

Core admin features are defined in `admin.FeatureKey`:

- `dashboard`
- `search`
- `export`
- `cms`
- `jobs`
- `commands`
- `settings`
- `notifications`
- `media`
- `bulk`
- `preferences`
- `profile`
- `users`
- `tenants`
- `organizations`

Common feature keys used by modules or optional flows:

- Debug module: `debug` (or custom key via `DebugConfig.FeatureKey`).
- Onboarding: `users.invite`, `users.password_reset`, `users.signup`.

## Where Gating Is Enforced

### Module registration

Modules declare feature keys in `Manifest().FeatureFlags`. When loading modules,
go-admin checks those keys (system scope). If disabled, the module fails fast
with `FeatureDisabledError`.

If you want feature-disabled modules to be skipped instead of erroring, use the
quickstart module registrar (`quickstart.NewModuleRegistrar`), which filters
modules by gates.

### Route registration and handlers

Boot steps (search, jobs, settings, etc) call `FeatureGates.Require(key)`.
When a gate is disabled, handlers return `FeatureDisabledError` and the response
is a 404.

### Feature dependency validation

On initialization, go-admin validates feature dependencies:

- `jobs` requires `commands`
- `bulk` requires `commands` and `jobs`
- `media`, `export`, and `bulk` require `cms`

Invalid combinations return `InvalidFeatureConfigError` with issue details.

## Manual Setup (Custom Gate)

Use a go-featuregate resolver and pass it via `admin.Dependencies`:

```go
import (
    "github.com/goliatone/go-admin/admin"
    "github.com/goliatone/go-featuregate/adapters/configadapter"
    "github.com/goliatone/go-featuregate/resolver"
)

defaults := map[string]bool{
    string(admin.FeatureDashboard): true,
    string(admin.FeatureCMS):       true,
    string(admin.FeatureSearch):    false,
}

gate := resolver.New(resolver.WithDefaults(
    configadapter.NewDefaultsFromBools(defaults),
))

adm, err := admin.New(cfg, admin.Dependencies{
    FeatureGate: gate,
})
if err != nil {
    return err
}

// Register modules before Initialize.
// adm.RegisterModule(...)

if err := adm.Initialize(router); err != nil {
    return err
}
```

If you do not supply a gate, `admin.New` builds an empty default gate, which
means most optional features are disabled.

## Quickstart Setup

`quickstart.NewAdmin` builds a feature gate automatically. You can override its
defaults with `WithFeatureDefaults`:

```go
import (
    "github.com/goliatone/go-admin/admin"
    "github.com/goliatone/go-admin/quickstart"
)

cfg := quickstart.NewAdminConfig("/admin", "Admin", "en")
adm, _, err := quickstart.NewAdmin(
    cfg,
    hooks,
    quickstart.WithFeatureDefaults(map[string]bool{
        string(admin.FeatureSearch): false,
        string(admin.FeatureBulk):   false,
    }),
)
```

Use the minimal feature set when you want a slim surface:

```go
adm, _, err := quickstart.NewAdmin(
    cfg,
    hooks,
    quickstart.WithFeatureDefaults(quickstart.DefaultMinimalFeatures()),
)
```

To supply your own gate, pass it through `WithAdminDependencies`:

```go
adm, _, err := quickstart.NewAdmin(
    cfg,
    hooks,
    quickstart.WithAdminDependencies(admin.Dependencies{
        FeatureGate: gate,
    }),
)
```

## Feature Catalog (Descriptions)

The Feature Flags UI can render descriptions when you provide a catalog config file.
Set `Config.FeatureCatalogPath` to a YAML or JSON file and go-admin will load it
at startup. The file is a map of feature keys to descriptions (flat or nested).

Example (`feature_catalog.yaml`):

```yaml
dashboard: "Dashboard widgets and layout."
search: "Global admin search endpoints and UI."
"users.signup": "Allow self-service signups."
```

When a catalog entry exists, the feature flags API includes `description` for
that flag. For localization later, supply a custom resolver via
`admin.Dependencies.FeatureCatalogResolver`.

## Runtime Overrides (Feature Flags API)

Runtime overrides are only available when the configured gate implements
`MutableFeatureGate`. The quickstart gate includes override support by default
because it wires a preferences store and passes it to the resolver.

The override routes are:

- `POST <basePath>/api/feature-flags`
- `DELETE <basePath>/api/feature-flags`

Permission required: `admin.feature_flags.update` (config:
`FeatureFlagsUpdatePermission`).

### Enable a feature

```json
{
  "key": "search",
  "enabled": true,
  "scope": "system"
}
```

### Disable a feature

```json
{
  "key": "search",
  "scope": "system"
}
```

Supported scope values: `system`, `tenant`, `org`, `user`. For non-system scopes,
provide one of `scope_id`, `tenant_id`, `org_id`, or `user_id`. If you omit an ID,
go-admin attempts to use the value from the authenticated context.

Notes:

- Keys are normalized; aliases are rejected.
- `users.self_registration` is not supported; use `users.signup`.

### Custom gate with overrides

If you build your own gate and still want runtime overrides, compose a resolver
with a preferences-backed override store:

```go
import (
    "github.com/goliatone/go-admin/admin"
    goauthadapter "github.com/goliatone/go-auth/adapters/featuregate"
    "github.com/goliatone/go-featuregate/adapters/configadapter"
    "github.com/goliatone/go-featuregate/adapters/optionsadapter"
    "github.com/goliatone/go-featuregate/resolver"
)

defaults := map[string]bool{
    string(admin.FeatureDashboard): true,
    string(admin.FeatureSearch):    false,
}

prefsStore := admin.NewInMemoryPreferencesStore() // replace with real store
stateStore := admin.NewPreferencesStoreAdapter(prefsStore)

gate := resolver.New(
    resolver.WithDefaults(configadapter.NewDefaultsFromBools(defaults)),
    resolver.WithScopeResolver(goauthadapter.NewScopeResolver()),
    resolver.WithOverrideStore(optionsadapter.NewStore(stateStore)),
)
```

## Checking Gates in Code

Use the configured gate directly:

```go
import (
    "github.com/goliatone/go-admin/admin"
    fggate "github.com/goliatone/go-featuregate/gate"
)

gate := adm.FeatureGate()
enabled, err := gate.Enabled(ctx, string(admin.FeatureSearch),
    fggate.WithScopeSet(fggate.ScopeSet{System: true}),
)
if err != nil {
    return err
}
if !enabled {
    return admin.FeatureDisabledError{Feature: string(admin.FeatureSearch)}
}
```

For boot steps or custom route wiring, use the boot `FeatureGates` interface
and `Require` to return `FeatureDisabledError` consistently:

```go
if err := ctx.Gates().Require("search"); err != nil {
    return responder.WriteError(c, err)
}
```

## Checking Gates in Templates (Quickstart)

Quickstart exposes go-featuregate template helpers when you pass a gate into
the view engine:

```go
views, err := quickstart.NewViewEngine(
    templatesFS,
    quickstart.WithViewFeatureGate(adm.FeatureGate()),
)
```

To support scoped checks in templates, pass feature context into the view
context using `quickstart.WithFeatureTemplateContext` (quickstart does this for
auth UI views by default).

## Related Guides

- Module gating: `docs/GUIDE_MODULES.md`
- Debug module gating: `docs/GUIDE_DEBUG_MODULE.md`
- Preferences gating: `docs/GUIDE_MOD_PREFERENCES.md`
- Onboarding gating: `docs/GUIDE_ONBOARDING.md`

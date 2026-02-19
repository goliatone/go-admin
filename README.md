# Go Admin

`go-admin` is a feature-gated admin orchestration runtime for Go services. It wires modules, panels, commands, navigation, and route surfaces while letting hosts swap dependencies (auth, persistence, CMS container, activity, media, export, settings).

The repo provides two modules:
- Core: `github.com/goliatone/go-admin` (dependency-light, framework-agnostic orchestration)
- Quickstart: `github.com/goliatone/go-admin/quickstart` (opinionated defaults + adapters for faster bootstrap)

## When to use core vs quickstart

- Use core when you need strict control over dependencies, router/runtime wiring, and module registration.
- Use quickstart when you want a working admin quickly with prewired defaults (feature gates, adapter hooks, Fiber/view helpers, theme/form/dashboard integrations) and then override selectively.

## Runtime lifecycle (core mental model)

1. Build `admin.Config` (title/base path, locales, URLs, permissions, feature-related config).
2. Construct `*admin.Admin` with `admin.New(cfg, deps)`.
3. Optionally register custom modules before boot with `adm.RegisterModule(...)`.
4. Call `adm.Initialize(router)` once to run prepare + boot steps and mount routes.

`Initialize` runs the boot pipeline (panels, dashboard, search, settings, jobs, notifications, translation routes, etc.) and auto-registers built-in modules according to feature gates.

Quickstart follows the same lifecycle, but uses `quickstart.NewAdminConfig(...)` and `quickstart.NewAdmin(...)` to preload defaults and adapter wiring.

```go
cfg := quickstart.NewAdminConfig("/admin", "Admin", "en")

adm, _, err := quickstart.NewAdmin(
	cfg,
	quickstart.AdapterHooks{},
	quickstart.WithFeatureDefaults(quickstart.DefaultMinimalFeatures()),
)
if err != nil {
	panic(err)
}

server := router.NewHTTPServer()
if err := adm.Initialize(server.Router()); err != nil {
	panic(err)
}
```

Core-only wiring is the same shape, but you construct directly from `admin.New`:

```go
cfg := admin.Config{BasePath: "/admin", Title: "Admin", DefaultLocale: "en"}
adm, err := admin.New(cfg, admin.Dependencies{})
if err != nil {
	panic(err)
}

if err := adm.RegisterModule(myModule); err != nil {
	panic(err)
}

server := router.NewHTTPServer()
if err := adm.Initialize(server.Router()); err != nil {
	panic(err)
}
```

## Key extension points

- Features: provide/override feature defaults with your gate implementation (core) or `quickstart.WithFeatureDefaults(...)`.
- Modules: register host modules with `RegisterModule`; control startup validation behavior with `WithModuleStartupPolicy`.
- URLs: use `Config.URLs` + URLKit route names instead of hardcoding paths.
- Commands: register typed commands and message factories for panel/API dispatch.
- Panels: control canonical UI ownership (`PanelUIRouteMode*`) and canonical entry behavior (`PanelEntryMode*`).

## URL Configuration

`Config.URLs` is the canonical URL surface. It exposes separate namespaces for
admin and public URLs, each with its own base path, API prefix, and version.
Defaults preserve `/admin` for the admin UI and `/api/v1` for the public API.
If you need full control, set `Config.URLs.URLKit` to a custom URLKit config.

Example:

```go
cfg := admin.Config{
	BasePath: "/admin", // legacy fallback + theme tokens
	URLs: admin.URLConfig{
		Admin: admin.URLNamespaceConfig{
			BasePath:   "/admin",
			APIPrefix:  "api",
			APIVersion: "",
		},
		Public: admin.URLNamespaceConfig{
			BasePath:   "",
			APIPrefix:  "api",
			APIVersion: "v1",
		},
	},
}
```

## Panel Entry Modes

Panels can customize what the canonical panel URL (`/admin/<panel>`) renders.

- `PanelEntryModeList` (default): render the panel list/datagrid view.
- `PanelEntryModeDetailCurrentUser`: resolve the current authenticated user ID
  and render the panel detail view for that record.

Use `PanelBuilder.WithEntryMode(...)` in module/panel registration. This is
complementary to `PanelUIRouteMode`:

- `PanelUIRouteModeCanonical`: quickstart canonical panel UI routes are
  registered and honor `EntryMode`.
- `PanelUIRouteModeCustom`: module-owned routes are responsible for entry
  behavior.

## CMS CRUD Alignment (Read/Write Split)

Admin page CRUD now uses an explicit admin read model (`AdminPageRecord`) plus split read/write services. List and detail reads go through `AdminPageReadService`, while writes (create/update/delete/publish) use `AdminPageWriteService` via `PageApplicationService` so HTML and JSON paths stay aligned.

See `docs/GUIDE_CMS.md` for include flags, locale resolution, blocks payload rules, and view-backed fallback guidance. Migration notes live in `CHANGELOG.md`.

## Commands (go-command)

Commands are message-driven: define a message type with a stable `Type()` string, implement a `command.Commander[Msg]`, and register a message factory for name-based dispatch from HTTP/panels.

```go
type PublishPageMsg struct {
	IDs []string
}

func (PublishPageMsg) Type() string { return "pages.publish" }

type PublishPageCommand struct {
	store *Store
}

func (c *PublishPageCommand) Execute(ctx context.Context, msg PublishPageMsg) error {
	return c.store.Publish(ctx, msg.IDs)
}

adm.Commands().Register(&PublishPageCommand{store: store})
admin.RegisterMessageFactory(adm.Commands(), "pages.publish", func(payload map[string]any, ids []string) (PublishPageMsg, error) {
	return PublishPageMsg{IDs: ids}, nil
})
```

CLI/cron metadata is optional via `command.CLICommand` (`CLIOptions`) and `command.CronCommand` (`CronOptions`).

## References

- Quickstart API and helpers: `quickstart/README.md`
- Canonical `ADMIN_*` flags: `ENVS_REF.md`
- CMS and translation workflow guide: `docs/GUIDE_CMS.md`
- Persisted workflow runtime: `docs/WORKFLOW_PERSISTENCE.md`
- End-to-end examples: `examples/web/main.go`, `examples/esign/main.go`

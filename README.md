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
- Modules: register host modules with `RegisterModule`; mounted modules must expose `RouteContractProvider` so routing ownership stays explicit.
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

## Routing Policy

`admin/routing` is the canonical routing policy package.

- Hosts own absolute roots; modules declare relative route tables.
- Mounted modules must implement `admin.RouteContractProvider`.
- Startup routing validation is strict fail-fast in every environment.
- Public API mounts are opt-in and only exist when a module declares `PublicAPIRoutes`.

Operationally, the supported diagnostics are in-process:

- `adm.RoutingReport()` for effective roots, resolved module mounts, warnings, and conflicts.
- `adm.RoutingPlanner().Manifest()` for deterministic route-manifest export.

A stable HTTP JSON routing report endpoint is not part of the first release of
the clean-break routing API. Use the in-process report/manifest APIs or
quickstart doctor output instead.

See `GUIDE_ROUTING.md` for the external-module contract, release policy,
and CI manifest-review guidance.

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

### Command Routing Observability

For queued command flows (for example `esign.pdf.remediate`), dispatch logs include routing fields:
- `command_id`
- `execution_mode`
- `dispatch_id`
- `correlation_id`

See `GUIDE_BKG_CMD_OBSERVABILITY.md` for dispatch/remediation metrics, alert signals, and activity/audit lifecycle contracts.

## FSM Lifecycle Activity Projection

When you use `go-command/flow` state machines and want lifecycle audit events in the admin-local feed, wire the FSM lifecycle hook to an admin activity sink adapter:

```go
import (
	"context"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-command/flow"
)

hook := &flow.LifecycleActivityHook[MyMsg]{
	Sink: coreadmin.NewFSMLifecycleActivitySinkAdapter(adm.ActivityFeed()),
}

machine, err := flow.NewStateMachineFromDefinition(
	definition,
	store,
	req,
	resolvers,
	actions,
	flow.WithExecutionPolicy[MyMsg](flow.ExecutionPolicyLightweight),
	flow.WithLifecycleHooks[MyMsg](hook),
	flow.WithHookFailureMode[MyMsg](flow.HookFailureModeFailOpen), // or FailClosed
)
if err != nil {
	panic(err)
}

_, err = machine.ApplyEvent(context.Background(), flow.ApplyEventRequest[MyMsg]{
	EntityID: "entity-1",
	Event:    "approve",
	Msg:      MyMsg{EntityID: "entity-1"},
})
```

Mapping behavior:

- `LifecycleActivityEnvelope.Verb` -> `ActivityEntry.Action` (for example `fsm.transition.attempted|committed|rejected`)
- `LifecycleActivityEnvelope.ObjectType` + `ObjectID` -> `ActivityEntry.Object`
- Envelope metadata is copied into `ActivityEntry.Metadata` (including correlation fields like `machine_id`, `machine_version`, `entity_id`, `execution_id`, `event`, `transition_id`, `phase`)

## References

- Quickstart API and helpers: `quickstart/README.md`
- Routing policy contract and CI review workflow: `GUIDE_ROUTING.md`
- Routing incidents and operational context: `REPORT_ROUTES.md`
- Example runtime config conventions: `examples/web/config/app.json` and `examples/web/README.md`
- CMS and translation workflow guide: `docs/GUIDE_CMS.md`
- Background command routing observability: `GUIDE_BKG_CMD_OBSERVABILITY.md`
- Persisted workflow runtime: `docs/WORKFLOW_PERSISTENCE.md`
- End-to-end examples: `examples/web/main.go`, `examples/esign/main.go`

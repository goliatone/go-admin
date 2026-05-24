# Guide: Workflows, State Machines, and Panel Actions

This guide is the canonical reference for workflow definitions, the
`go-command/flow` state-machine adapter, persisted workflow runtime bindings,
and workflow-backed panel actions in `go-admin`.

Use it when adding a workflow to a panel, wiring CMS content lifecycle rules,
loading workflow config from quickstart, debugging `_action_state`, or exposing
workflow management APIs.

## Table Of Contents

- [Core Model](#core-model)
- [State Machine Engine](#state-machine-engine)
- [Workflow Definitions](#workflow-definitions)
- [Default CMS Workflows](#default-cms-workflows)
- [Quickstart Workflow Config](#quickstart-workflow-config)
- [Persisted Workflow Runtime](#persisted-workflow-runtime)
- [Dynamic Panel Resolution](#dynamic-panel-resolution)
- [Panel Action Availability](#panel-action-availability)
- [Workflow Action Execution](#workflow-action-execution)
- [Status Updates Through Forms](#status-updates-through-forms)
- [Authorization And Policy](#authorization-and-policy)
- [Management APIs](#management-apis)
- [Persistence And Migrations](#persistence-and-migrations)
- [Diagnostics And Errors](#diagnostics-and-errors)
- [Testing Checklist](#testing-checklist)
- [Key Files](#key-files)

## Core Model

Workflow support has four layers:

1. Workflow engine: `admin.WorkflowEngine` applies events and returns transition
   snapshots.
2. FSM adapter: `admin.FSMWorkflowEngine` compiles `admin.WorkflowDefinition`
   values into `go-command/flow` state machines.
3. Runtime service: `admin.WorkflowRuntimeService` persists workflow
   definitions and scope bindings, then registers active definitions into the
   engine.
4. Panel integration: panels use snapshots to expose `_action_state`, execute
   workflow-backed row actions, and persist the next record status.

The engine contract is intentionally small:

```go
type WorkflowEngine interface {
    ApplyEvent(ctx context.Context, input admin.WorkflowApplyEventRequest) (*admin.WorkflowApplyEventResponse, error)
    Snapshot(ctx context.Context, input admin.WorkflowSnapshotRequest) (*admin.WorkflowSnapshot, error)
}
```

`Snapshot` answers "what transitions are available for this entity state?"
`ApplyEvent` executes one transition and returns the canonical FSM response.

## State Machine Engine

`admin.NewFSMWorkflowEngine(...)` creates the canonical engine adapter backed by
`go-command/flow`.

By default it uses:

- in-memory state store
- in-memory idempotency store
- lightweight execution policy
- fail-open hook failure mode
- resolver registries for guards and dynamic targets
- an action registry for workflow-side effects

Common options:

```go
workflow := admin.NewFSMWorkflowEngine(
    admin.WithFSMWorkflowActivitySink(adm.ActivityFeed()),
    admin.WithFSMWorkflowExecutionPolicy(flow.ExecutionPolicyLightweight),
    admin.WithFSMWorkflowHookFailureMode(flow.HookFailureModeFailOpen),
)
```

The engine implements:

- `WorkflowRegistrar`: `RegisterWorkflow(entityType, definition)`
- `WorkflowUnregistrar`: `UnregisterWorkflow(entityType)`
- `WorkflowDefinitionChecker`: `HasWorkflow(entityType)`
- `WorkflowDefinitionProvider`: `WorkflowDefinition(entityType)`

`ApplyEvent` and `Snapshot` seed missing FSM state from the request's current or
expected state before delegating to `go-command/flow`. This lets panel records
remain the persisted source for the visible `status` field while the FSM store
tracks transition state and version metadata.

## Workflow Definitions

A workflow definition declares a machine identity, initial state, and
transitions:

```go
workflow := admin.NewFSMWorkflowEngine()

err := workflow.RegisterWorkflow("editorial.news", admin.WorkflowDefinition{
    EntityType:     "editorial.news",
    MachineVersion: "1",
    InitialState:   "draft",
    Transitions: []admin.WorkflowTransition{
        {Name: "submit_for_approval", From: "draft", To: "approval"},
        {Name: "publish", From: "approval", To: "published"},
        {Name: "retract", From: "published", To: "draft"},
    },
})
```

Rules:

- `EntityType`/registration ID is the machine identity.
- `InitialState` is required.
- Each transition requires `Name` and `From`.
- Each transition requires either `To` or `DynamicTo`, but not both.
- `Guard` references a registered guard resolver.
- `DynamicTo` references a registered dynamic target resolver.
- `MachineVersion` defaults to `"1"` when omitted.

Register guards and dynamic targets before registering definitions that use
them:

```go
_ = workflow.RegisterGuard("content.ready_to_publish",
    func(ctx context.Context, msg admin.WorkflowMessage, exec admin.WorkflowExecutionContext) error {
        if msg.Payload["ready"] == true {
            return nil
        }
        return &flow.GuardRejection{
            Code:    "content.not_ready",
            Message: "content is not ready to publish",
        }
    },
)
```

## Default CMS Workflows

If no workflow engine is provided, `go-admin` lazily creates an
`FSMWorkflowEngine` and registers default CMS workflows.

Current default definitions:

- `content`: `draft -> approval -> published`
- `block_definitions`: `draft -> active -> deprecated -> active`
- `content_types`: `draft -> active -> deprecated -> active`

To start from defaults and override only part of the set:

```go
workflow := admin.NewFSMWorkflowEngine()
admin.RegisterDefaultCMSWorkflows(workflow)

_ = workflow.RegisterWorkflow("editorial.news", admin.WorkflowDefinition{
    EntityType:   "editorial.news",
    InitialState: "draft",
    Transitions: []admin.WorkflowTransition{
        {Name: "submit_for_approval", From: "draft", To: "approval"},
        {Name: "publish", From: "approval", To: "published"},
    },
})

adm.WithWorkflow(workflow).WithCMSWorkflowDefaults()
```

CMS demo panels use `admin.DefaultCMSWorkflowActions()` unless overridden with
`adm.WithCMSWorkflowActions(...)`.

Default workflow action names include:

- `submit_for_approval`
- `publish`

Additional workflow-aware action names recognized by the panel runtime include:

- `request_approval`
- `approve`
- `reject`
- `unpublish`
- `archive`

## Quickstart Workflow Config

Quickstart can load workflow definitions and binding seeds from JSON or YAML.

```yaml
schema_version: 1

workflows:
  editorial.default:
    machine_version: "1"
    initial_state: draft
    transitions:
      - name: submit_for_approval
        from: draft
        to: approval
      - name: publish
        from: approval
        to: published

bindings:
  - scope_type: trait
    scope_ref: editorial
    workflow_id: editorial.default
    priority: 100
    status: active
```

Load it at startup:

```go
adm, _, err := quickstart.NewAdmin(
    cfg,
    hooks,
    quickstart.WithWorkflowConfigFile("workflow_config.yaml"),
)
```

Validation fails fast for:

- unsupported schema versions
- missing `initial_state`
- missing transition fields
- duplicate transition names
- bindings that reference unknown workflow IDs
- invalid binding scope/status values

`trait_defaults` is still accepted in config and converted into canonical trait
bindings when the config is seeded into a runtime. Prefer explicit `bindings`
for new config because that is the runtime model.

## Persisted Workflow Runtime

`WorkflowRuntimeService` stores workflow definitions and scope bindings. It can
use in-memory repositories or Bun-backed repositories.

```go
runtime := admin.NewWorkflowRuntimeService(
    admin.NewInMemoryWorkflowDefinitionRepository(),
    admin.NewInMemoryWorkflowBindingRepository(),
)

adm.WithWorkflow(admin.NewFSMWorkflowEngine())
adm.WithWorkflowRuntime(runtime)
```

When bound to an engine, the runtime registers active workflow definitions into
the engine. Draft and deprecated definitions remain persisted but are not
registered for execution.

Runtime binding resolution order:

1. active `content_type` binding matching the content type slug or ID
2. active `trait` binding matching the first declared panel trait
3. active `global` binding

Within a scope, lower `priority` wins. Environment-specific bindings only match
that environment; empty-environment bindings are global fallbacks.

Workflow updates and binding updates use optimistic version checks. Workflow
rollback restores an older revision by writing a new current version.

## Dynamic Panel Resolution

Dynamic CMS panels resolve their workflow assignment in this order:

1. content type capability `workflow_id`
2. aliases `workflowId` and `workflow-id`
3. legacy capability `workflow`
4. persisted runtime binding resolution
5. no workflow

Example content type capabilities:

```json
{
  "panel_traits": ["editorial"],
  "workflow_id": "editorial.news"
}
```

Legacy capability still works:

```json
{
  "workflow": "legacy.pages"
}
```

For trait-based assignment, create a runtime binding:

```yaml
bindings:
  - scope_type: trait
    scope_ref: editorial
    workflow_id: editorial.default
    priority: 100
    status: active
```

Important behavior:

- explicit `workflow_id` or legacy `workflow` always wins over runtime bindings
- missing workflow definitions do not fail panel registration
- missing workflow definitions log `workflow not found` with
  `resolved_workflow_id`, `resolution_source`, and traits
- direct `Admin.WithTraitWorkflowDefaults(...)` is not used as a dynamic panel
  fallback by the current resolver; use workflow config/runtime bindings for
  trait fallback behavior

When a workflow ID differs from the panel name, the panel uses an internal
workflow alias. The UI and API still refer to the panel name, while the FSM
engine receives the resolved workflow ID as `MachineID`.

## Panel Action Availability

Workflow action availability is server-authored and returned through the shared
action-state contract.

List records:

```json
{
  "id": "post_123",
  "status": "published",
  "_action_state": {
    "publish": {
      "enabled": false,
      "reason_code": "INVALID_STATUS",
      "reason": "transition \"publish\" is not available from state \"published\"",
      "available_transitions": ["unpublish"]
    },
    "unpublish": {
      "enabled": true,
      "available_transitions": ["unpublish"]
    }
  }
}
```

Detail responses use the same shape under `data._action_state`.

Availability evaluation order:

1. scope and required context
2. permissions
3. workflow snapshot
4. translation readiness
5. `Action.Guard`
6. `WithActionStateResolver(...)`

Built-in workflow checks call `Snapshot` once per record when the panel has a
workflow-backed action. If the action name matches an allowed transition event,
the action remains enabled. Otherwise it is disabled with
`ActionDisabledReasonCodeInvalidStatus`.

Use canonical reason codes from `admin/action_state_reason_codes.go`, including:

- `INVALID_STATUS`
- `MISSING_CONTEXT`
- `PERMISSION_DENIED`
- `TRANSLATION_MISSING`
- `PRECONDITION_FAILED`
- `INVALID_SELECTION`

## Workflow Action Execution

Panel action routes execute workflow-backed row actions before command fallback.

Execution flow:

1. Resolve the primary record ID from query/body selection.
2. Load the record through `panel.Get(...)`.
3. Read the current state from `record["status"]`.
4. Call `Snapshot` with guards enabled and blocked transitions included.
5. Match the action name to an available transition.
6. Authorize the action permission if one is configured.
7. Apply translation policy when configured.
8. Build an `ApplyEvent` request.
9. Call `ApplyEvent`.
10. Persist the returned next state with `repo.Update(id, {"status": next})`.
11. Return an action response containing the workflow envelope and updated
    record when available.

Action aliases:

- `submit_for_approval` also matches `request_approval`
- `request_approval` also matches `submit_for_approval`
- `publish` also matches `approve`
- `approve` also matches `publish`

If an action is declared as a workflow action but no matching transition is
available, execution returns `WORKFLOW_INVALID_TRANSITION`.

## Status Updates Through Forms

Panel updates can also drive workflow transitions when a form changes the
record `status` field.

The workflow update hook:

1. loads the existing record
2. compares current `status` with requested `status`
3. resolves the transition event explicitly from `record["transition"]` or from
   a snapshot target-state match
4. checks `WorkflowAuthorizer`
5. applies translation policy
6. calls `ApplyEvent`
7. replaces the submitted `status` with the FSM response's current state

This keeps form updates and row actions on the same engine contract.

## Authorization And Policy

Workflow transitions can be guarded separately from CRUD permissions.

Panel-level workflow authorization:

```go
workflowAuth := admin.NewRoleWorkflowAuthorizer(
    "admin",
    admin.WithWorkflowPermission("admin", "edit"),
    admin.WithWorkflowExtraCheck(func(ctx context.Context, req admin.WorkflowApplyEventRequest) bool {
        return req.Msg.EntityID != ""
    }),
)

builder.WithWorkflowAuthorizer(workflowAuth)
```

The content type builder has a separate option:

```go
admin.NewContentTypeBuilderModule(
    admin.WithContentTypeBuilderWorkflow(workflow),
    admin.WithContentTypeBuilderWorkflowAuthorizer(workflowAuth),
)
```

Translation policy can block publish/promote transitions until required
translations are ready. The action-state layer advertises that block, and the
runtime execution path enforces it again before applying the event.

## Management APIs

When `WorkflowRuntime` is configured, go-admin exposes workflow management
routes under the admin API group:

- `GET /admin/api/workflows`
- `POST /admin/api/workflows`
- `PUT /admin/api/workflows/:id`
- `GET /admin/api/workflows/bindings`
- `POST /admin/api/workflows/bindings`
- `PUT /admin/api/workflows/bindings/:id`
- `DELETE /admin/api/workflows/bindings/:id`

Workflow update payloads require `expected_version`. Rollback is performed by
sending `rollback_to_version` to `PUT /admin/api/workflows/:id`.

RPC workflow authoring APIs are also available when the RPC transport is
configured. They use the same runtime service and authoring store, with
permissions such as `admin.workflows.read`, `admin.workflows.write`,
`admin.workflows.bindings.read`, and `admin.workflows.bindings.write`.

## Persistence And Migrations

Workflow runtime migrations live under `data/sql/migrations` and are exposed by
`admin.GetWorkflowRuntimeMigrationsFS()`.

Core tables:

- `workflows`
- `workflow_bindings`
- `workflow_revisions`
- `workflow_authoring_machines`
- `workflow_authoring_versions`

SQLite and Postgres have scope uniqueness migrations for active bindings:

- `data/sql/migrations/sqlite/0004_workflow_bindings_active_unique.up.sql`
- `data/sql/migrations/postgres/0004_workflow_bindings_active_unique.up.sql`

The Bun repositories are:

- `admin.NewBunWorkflowDefinitionRepository(db)`
- `admin.NewBunWorkflowBindingRepository(db)`
- `admin.NewBunWorkflowAuthoringStore(db)`

The web example wires persistent runtime support in
`examples/web/setup/workflow_runtime.go`.

## Diagnostics And Errors

Common runtime errors:

- missing machine: workflow machine not found
- invalid transition: action/event is unavailable from current state
- guard rejection: guard resolver denied the transition
- version conflict: state version or expected version mismatch
- idempotency conflict: same idempotency key with different request metadata
- workflow validation errors: invalid definition or binding payload

Error mapping preserves structured `error.text_code` values. Workflow-backed
actions return workflow-specific failures instead of a generic action lookup
failure.

Use the action diagnostics surfaces when debugging action state:

- Debug dashboard panel: `Actions`
- structured logger scope: `admin.actions`
- dynamic panel workflow logs: `admin.dynamic_panel_factory`
- runtime logs: `admin.workflow.runtime`

## Testing Checklist

Before considering a workflow-backed panel complete:

1. Register the workflow definition and confirm `HasWorkflow(id)` is true.
2. Confirm dynamic panel capabilities or runtime bindings resolve the expected
   workflow ID.
3. Confirm list rows include `_action_state` for workflow actions.
4. Confirm detail payload includes the same action-state behavior.
5. Confirm unavailable actions stay visible and disabled.
6. Confirm executing a stale action returns `WORKFLOW_INVALID_TRANSITION`.
7. Confirm successful execution updates the record `status`.
8. Confirm form status updates run through `ApplyEvent`.
9. Confirm permissions and translation policy are enforced at execution time.
10. Confirm runtime workflow/binding updates require `expected_version`.

Focused package checks:

```bash
go test ./admin -run 'TestFSMWorkflowEngine|TestWorkflowRuntimeService|TestWorkflowEngineForContentType|TestActionPhase8'
go test ./quickstart -run 'TestAdminBootstrap.*Workflow|TestSeedWorkflowRuntimeFromConfig'
go test ./examples/web -run 'TestActionPhase8|TestSeedWorkflowRuntimeFromConfig|TestWorkflow'
```

## Key Files

- `admin/internal/cmsboot/types.go`: workflow interfaces and canonical envelope aliases.
- `admin/workflow_fsm.go`: `go-command/flow` FSM adapter.
- `admin/workflow_runtime_service.go`: persisted workflow and binding service.
- `admin/internal/workflowcore/persistence.go`: persisted workflow and binding types.
- `admin/repository_workflow.go`: in-memory workflow repositories.
- `admin/repository_workflow_bun.go`: Bun workflow repositories.
- `admin/cms_workflow.go`: default CMS workflow definitions and actions.
- `admin/dynamic_panel_factory.go`: content type workflow resolution and aliases.
- `admin/action_state_runtime.go`: `_action_state` workflow availability.
- `admin/boot_bindings.go`: workflow-backed action execution and state persistence.
- `admin/workflow_helpers.go`: request builders, metadata, and snapshot helpers.
- `admin/workflow_authorizer.go`: role/permission workflow authorizer.
- `quickstart/workflow_config.go`: YAML/JSON workflow config parser.
- `quickstart/workflow_runtime_seed.go`: config-to-runtime seeding.
- `examples/web/workflow_config.yaml`: current example workflow config.

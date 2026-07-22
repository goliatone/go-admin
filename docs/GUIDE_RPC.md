# Guide: RPC Transport and Command Dispatch

This guide is the canonical wiring reference for enabling the admin RPC
transport, exposing command dispatch over RPC, wiring UI commands to RPC, and
using workflow authoring RPC endpoints.

Use it when replacing custom command endpoints, exposing admin commands to the
client runtime, or enabling workflow authoring over the shared RPC transport.
For panel CRUD and canonical panel action routes, see `docs/GUIDE_CRUD.md`. For
workflow/state-machine behavior, see `docs/GUIDE_WORKFLOW.md`. For choosing
between DataGrid actions, enhanced SSR actions, RPC, and sync, see
`docs/GUIDE_FRONTEND.md`.

## What It Provides

- Admin RPC server and transport boundaries.
- Quickstart `WithRPCTransport(...)` setup.
- Core RPC method contract for command dispatch and command listing.
- Command allowlist, permission, and unauthenticated exposure rules.
- Trusted identity, payload enrichment, and metadata sanitization behavior.
- Client `data-command-*` wiring for RPC commands.
- Workflow authoring and workflow binding RPC endpoint summary.
- Validation checklist and focused test commands.

## Table Of Contents

- [What It Provides](#what-it-provides)
- [Core Model](#core-model)
- [Admin RPC Backend](#admin-rpc-backend)
- [Quickstart Transport](#quickstart-transport)
- [RPC Transport Hardening Defaults](#rpc-transport-hardening-defaults)
- [Core RPC Methods](#core-rpc-methods)
- [Command Dispatch Contract](#command-dispatch-contract)
- [Command Rules And Permissions](#command-rules-and-permissions)
- [Unauthenticated RPC Exposure](#unauthenticated-rpc-exposure)
- [Trusted Identity And Metadata](#trusted-identity-and-metadata)
- [Host Policy Hooks](#host-policy-hooks)
- [Client Command Runtime Wiring](#client-command-runtime-wiring)
- [Browser RPC CSRF](#browser-rpc-csrf)
- [Queued Commands And Feedback](#queued-commands-and-feedback)
- [Workflow RPC Endpoints](#workflow-rpc-endpoints)
- [Discovery Endpoint](#discovery-endpoint)
- [Error And Validation Contract](#error-and-validation-contract)
- [Validation Checklist](#validation-checklist)

## Core Model

RPC support has three layers:

1. Admin runtime: `admin.New(...)` creates or accepts a `go-command/rpc`
   server and registers built-in endpoint definitions.
2. HTTP transport: quickstart can mount the RPC server through Fiber using
   `quickstart.WithRPCTransport(...)`.
3. Client command runtime: HTML actions can use `data-command-transport="rpc"`
   to dispatch through `admin.commands.dispatch` instead of panel action
   routes.

The RPC server is not a replacement for the command bus. It is a transport
boundary in front of the same admin command bus used by panel actions, queued
commands, and host code.

## Admin RPC Backend

The admin constructor resolves command infrastructure before boot:

- `Dependencies.RPCServer` can provide a host-owned `*cmdrpc.Server`.
- If no server is provided, go-admin creates one with recover failure mode.
- `Admin.RPCServer()` exposes the server for direct invocation or custom
  transport mounting.
- Core RPC endpoints and workflow RPC endpoints are registered during admin
  construction.
- If a host-provided server already has a method registered, go-admin leaves
  that method alone.

The built-in command RPC endpoint dispatches by command name:

```go
result, err := adm.RPCServer().Invoke(ctx, admin.RPCMethodCommandDispatch,
    &cmdrpc.RequestEnvelope[admin.RPCCommandDispatchRequest]{
        Data: admin.RPCCommandDispatchRequest{
            Name:    "articles.publish",
            IDs:     []string{"article_123"},
            Payload: map[string]any{"reason": "ready"},
        },
    },
)
```

Direct server invocation is useful for tests and in-process adapters. Browser
clients should use the mounted transport described below.

## Quickstart Transport

Quickstart mounts the RPC server with `WithRPCTransport(...)`.

Minimal protected setup:

```go
adm, _, err := quickstart.NewAdmin(
    cfg,
    quickstart.AdapterHooks{},
    quickstart.WithAdminDependencies(admin.Dependencies{
        Authenticator: authn,
        Authorizer:    authz,
    }),
    quickstart.WithRPCTransport(quickstart.RPCTransportConfig{
        Enabled: true,
        CommandRules: map[string]admin.RPCCommandRule{
            "articles.publish": {
                Permission: "admin.articles.publish",
                Resource:   "commands",
            },
        },
    }),
)
```

By default, the invoke path is the admin API base plus `/rpc`, for example:

```text
POST /admin/api/rpc
```

If discovery is enabled, quickstart also mounts:

```text
GET /admin/api/rpc/endpoints
```

Custom path:

```go
quickstart.WithRPCTransport(quickstart.RPCTransportConfig{
    Enabled:    true,
    InvokePath: "/admin/api/commands/rpc",
})
```

The quickstart transport currently requires a Fiber-backed go-router adapter
when explicitly enabled. Prefer `quickstart.WithRPCTransport(...)` for app-level
RPC mounting because it applies the admin defaults, path normalization, auth
middleware, discovery settings, and command exposure checks together. Direct
`rpcfiber.MountFiber(...)` usage is for lower-level adapters or custom
transport integration where the host intentionally owns those guardrails.

## RPC Transport Hardening Defaults

RPC transport is intentionally closed by default:

- Transport mounting is opt-in with `WithRPCTransport(...)`.
- When enabled, quickstart requires an authenticator by default.
- Unauthenticated mode requires `AllowUnauthenticated: true`.
- Discovery is disabled by default.
- Unauthenticated discovery is rejected.
- Command dispatch is deny-by-default until command rules are configured.
- Each command rule needs a permission unless the rule explicitly allows
  unauthenticated dispatch.
- Authenticated command dispatch requires both `admin.commands.dispatch` on the
  default `commands` resource and the permission configured on the selected
  command rule.
- Command rules default to resource-role permission checks. Use exact
  permission mode for operational or capability grants that must not be inferred
  from generic resource roles.

Keep these defaults for production hosts. Only enable unauthenticated RPC for a
specific command when the command is intentionally public and safe to execute
without an actor.

## Core RPC Methods

Core methods:

- `admin.commands.dispatch`: dispatch a named command through the admin command
  bus.
- `admin.commands.list`: list registered command names when discovery is
  enabled.

`admin.commands.list` is hidden unless `commands.rpc.discovery_enabled` is
true. When enabled, it still requires an authenticated actor and
`admin.commands.read` on the default `commands` resource. If
`commands.rpc.permission_mode` is `exact`, discovery requires
`admin.commands.read` to be covered by stored resolved-permission data, such as
an exact `admin.commands.read` grant or an admin wildcard grant.

## Command Dispatch Contract

Transport requests use the `go-command/rpc` envelope. For HTTP clients, the
shape is:

```json
{
  "method": "admin.commands.dispatch",
  "params": {
    "data": {
      "name": "articles.publish",
      "ids": ["article_123"],
      "payload": {
        "reason": "ready"
      },
      "options": {
        "correlation_id": "cmd_123",
        "metadata": {
          "correlation_id": "cmd_123"
        }
      }
    }
  }
}
```

Dispatch data:

- `name`: command bus dispatch name. Required.
- `payload`: command payload map. Optional, defaults to `{}`.
- `ids`: selected or target IDs passed to the message factory.
- `options`: `command.DispatchOptions`, including correlation and metadata.

Successful responses include command receipt metadata:

```json
{
  "data": {
    "receipt": {
      "Accepted": true,
      "Mode": "inline",
      "CommandID": "articles.publish",
      "DispatchID": "dispatch_123",
      "CorrelationID": "cmd_123"
    }
  }
}
```

Message factories and command handlers are the same ones used by panel action
routes:

```go
if err := admin.RegisterMessageFactory(adm.Commands(), "articles.publish",
    func(payload map[string]any, ids []string) (ArticlePublishMsg, error) {
        reason, _ := payload["reason"].(string)
        return ArticlePublishMsg{
            IDs:    append([]string{}, ids...),
            Reason: reason,
        }, nil
    },
); err != nil {
    return err
}

if _, err := admin.RegisterCommand(adm.Commands(), NewArticlePublishCommand(repo)); err != nil {
    return err
}
```

## Command Rules And Permissions

`RPCCommandRule` maps a command name to the permission required for RPC
dispatch:

```go
type RPCCommandRule struct {
    Permission           string
    Resource             string
    PermissionMode       admin.RPCCommandPermissionMode
    AllowUnauthenticated bool
}
```

Rules can be supplied through quickstart transport config:

```go
quickstart.WithRPCTransport(quickstart.RPCTransportConfig{
    Enabled: true,
    CommandRules: map[string]admin.RPCCommandRule{
        "articles.publish": {
            Permission: "admin.articles.publish",
            Resource:   "commands",
        },
    },
})
```

Or through core config:

```go
cfg.Commands.RPC.Commands = map[string]admin.RPCCommandRule{
    "articles.publish": {
        Permission: "admin.articles.publish",
        Resource:   "commands",
    },
}
```

Command rule keys are exact-name allowlists. If `articles.publish` is not
configured, RPC dispatch returns not found even when the command exists in the
command bus.

If `Resource` is omitted, it defaults to `commands`. If `Permission` is omitted,
the rule must set `AllowUnauthenticated: true`.

`PermissionMode` controls how the rule is authorized:

| Mode | Behavior | Use when |
| --- | --- | --- |
| `resource_role` | Calls the configured `Authorizer.Can(ctx, permission, resource)` and lets the authorizer map the permission to a resource/action capability. This is the default for compatibility. | CRUD-style permissions where resource roles are the source of truth. |
| `exact` | Requires the permission to be covered by stored resolved-permission data from `ResolvedPermissionsFromAuthorizer(ctx, authorizer)`. Exact grants match literally, and admin wildcard grants such as `admin.*` or `admin.commands.*` can cover admin permissions. Resource roles and normalized action aliases do not grant access. | Operational commands, capability grants, transport permissions, or other non-CRUD permissions. |

You can set a default mode for command dispatch, all command rules, and command
discovery:

```go
cfg.Commands.RPC.PermissionMode = admin.RPCCommandPermissionModeExact
```

Or set it per command:

```go
cfg.Commands.RPC.Commands = map[string]admin.RPCCommandRule{
    "search.reindex": {
        Permission:     "admin.operations.search.manage",
        Resource:       "search",
        PermissionMode: admin.RPCCommandPermissionModeExact,
    },
}
```

Exact mode requires an authorizer that exposes resolved permissions, such as
`admin.GoAuthAuthorizer` configured with `ResolvePermissions`. If the
authorizer cannot resolve permissions, exact mode denies the request.

## Unauthenticated RPC Exposure

Unauthenticated RPC has two gates:

1. Transport gate: `RPCTransportConfig.AllowUnauthenticated` disables the
   default requirement for auth middleware.
2. Command gate: the specific `RPCCommandRule` must also set
   `AllowUnauthenticated: true`.

Example:

```go
quickstart.WithRPCTransport(quickstart.RPCTransportConfig{
    Enabled:              true,
    AllowUnauthenticated: true,
    CommandRules: map[string]admin.RPCCommandRule{
        "public.contact.submit": {
            AllowUnauthenticated: true,
        },
    },
})
```

Unauthenticated mode rejects discovery, and it rejects startup unless at least
one command rule explicitly allows unauthenticated dispatch. This prevents
accidentally opening a transport with no intended public command.

## Trusted Identity And Metadata

RPC dispatch does not trust client-supplied actor, tenant, organization, roles,
permissions, headers, query, or scope metadata.

The endpoint resolves trusted identity from request context and transport
metadata:

- actor ID and subject
- tenant ID
- organization ID
- request ID
- correlation ID

It then enriches the command payload with trusted identity fields:

- `actor_id`
- `user_id`
- `tenant`
- `tenant_id`
- `org_id`
- `organization_id`

It also sanitizes `DispatchOptions.Metadata`:

- Metadata keys are preserved only when they are in
  `commands.rpc.metadata_allowlist`.
- Reserved identity and authorization keys are stripped from client metadata.
- Trusted identity fields are written back into metadata after sanitization.
- Default metadata allowlist is `request_id` and `correlation_id`.

Use a custom metadata allowlist only for non-authoritative values that command
handlers can safely consume.

```go
cfg.Commands.RPC.MetadataAllowlist = []string{
    "request_id",
    "correlation_id",
    "source_widget",
}
```

## Host Policy Hooks

Authorization answers whether the actor has a permission. Hosts can add
business-rule checks with `RPCCommandPolicyHook`.

Quickstart:

```go
quickstart.WithRPCTransport(quickstart.RPCTransportConfig{
    Enabled: true,
    CommandRules: map[string]admin.RPCCommandRule{
        "articles.publish": {Permission: "admin.articles.publish"},
    },
    Authorize: func(ctx context.Context, input admin.RPCCommandPolicyInput) error {
        if input.TenantID == "" {
            return admin.ErrForbidden
        }
        return nil
    },
})
```

Core dependency:

```go
adm, err := admin.New(cfg, admin.Dependencies{
    RPCCommandPolicyHook: func(ctx context.Context, input admin.RPCCommandPolicyInput) error {
        return checkCommandScope(ctx, input.CommandName, input.IDs, input.TenantID)
    },
})
```

Good fits:

- tenant or organization scope checks
- resource ownership checks
- command-specific guardrails that need repository lookups
- public command rate-limit or precondition checks

Policy hooks run after the rule/permission check and before command dispatch.

## Client Command Runtime Wiring

The shared command runtime supports two transports:

- `action`: posts to canonical panel action routes.
- `rpc`: posts to the configured RPC endpoint and calls
  `admin.commands.dispatch`.

HTML button:

```html
<button
  type="button"
  data-command-name="publish"
  data-command-transport="rpc"
  data-command-dispatch="articles.publish"
  data-command-success="Article published"
  data-command-refresh="#article-status-panel"
  data-command-payload-source="detail"
>
  Publish
</button>
```

HTML form:

```html
<form
  data-command-name="request_review"
  data-command-transport="rpc"
  data-command-dispatch="articles.request_review"
  data-command-success="Review requested"
  data-command-refresh="#review-panel"
>
  <input type="hidden" name="reviewer_id" value="{{ reviewer.id }}">
  <button type="submit">Request review</button>
</form>
```

Runtime attributes:

- `data-command-name`: local UI action name.
- `data-command-transport="rpc"`: selects RPC dispatch.
- `data-command-dispatch`: command bus name. Defaults to
  `data-command-name` when omitted.
- `data-command-success`: success toast.
- `data-command-failure`: fallback failure message.
- `data-command-refresh`: comma-separated selectors to refresh after success.
- `data-command-confirm`: confirmation message.
- `data-command-reason-title`: prompts for a required reason.
- `data-command-payload-*`: static payload fields.

The runtime builds the RPC request with:

- method `admin.commands.dispatch`
- `name` from `data-command-dispatch`
- `ids` from the mounted `recordId`, when available
- payload from scope values, form fields, and static payload attributes
- correlation ID in dispatch options metadata

By default, the RPC endpoint is `${apiBasePath}/rpc`. Pass `rpcEndpoint` to the
runtime mount when a screen uses a custom invoke path.

Use panel action routes for canonical row/detail/bulk actions emitted by panel
schemas. Use RPC runtime commands for custom page interactions, cross-panel
commands, and command flows that are not naturally owned by one panel action
route.

## Browser RPC CSRF

Cookie-backed browser RPC calls use the same CSRF contract as other unsafe
admin API requests. Same-origin `POST`, `PUT`, `PATCH`, and `DELETE` requests
must include the admin shell token as `X-CSRF-Token` when
`meta[name="csrf-token"]` is present.

The shared client transport does this automatically. Prefer `httpRequest(...)`
or the `data-command-transport="rpc"` runtime for browser-originated admin RPC.
If a screen has to use custom `fetch`, create mutable `Headers`, keep
`credentials: 'same-origin'`, and call `appendCSRFHeader(endpoint, init,
headers)` before sending the request.

This is incomplete for a cookie-backed browser RPC call:

```js
fetch('/admin/api/rpc', {
  method: 'POST',
  credentials: 'same-origin',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify(envelope),
});
```

A `400 Bad Request` immediately after a browser click can indicate CSRF
rejection before `admin.commands.dispatch` or command policy runs. This browser
CSRF requirement does not apply to non-browser clients using an explicit
authorization mechanism such as Bearer tokens, unless the host transport also
requires CSRF for those clients.

## Queued Commands And Feedback

RPC dispatch uses `DispatchByNameWithOptions`, so it participates in the admin
command execution policy.

When a command returns a queued receipt:

- the client marks the command as accepted
- the pending state is keyed by correlation ID
- feedback events can move inline status to completed, failed, retry scheduled,
  or stale
- fragment refresh can wait for feedback instead of running immediately

Configure command execution and queue routing separately:

```go
quickstart.WithCommandExecutionPolicy(admin.CommandExecutionPolicy{
    PerCommand: map[string]command.ExecutionMode{
        "articles.publish": command.ExecutionModeQueued,
    },
})
```

RPC only exposes the command transport. Hosts still own queue workers, feedback
streams, and any command-specific reconciliation behavior.

When Command Runs is enabled, inline dispatch is observed automatically.
Queued execution needs both sides of the `go-command` lifecycle contract:

```go
if err := dispatcher.RegisterObservedExecutor(command.ExecutionModeQueued, queueExecutor); err != nil {
    return err
}

// In the worker, preserve the accepted receipt's DispatchRunContext.
return dispatcher.RunObservedCommand(ctx, runContext, func(runCtx context.Context) error {
    return executeQueuedCommand(runCtx)
})
```

The observed executor emits acceptance/rejection. `RunObservedCommand` emits
started, progress/checkpoint, and terminal worker phases with the same run,
dispatch, and correlation lineage. Registering an unobserved queued executor or
calling the handler directly leaves the Command Runs row at acceptance because
go-admin cannot infer remote worker execution.

`Admin.PublishCommandStatus` remains a compatibility escape hatch for existing
launcher integrations. It is not a replacement for observed queued execution;
the observer-owned canonical update is authoritative and the projector safely
deduplicates/rejects stale revisions.

## Workflow RPC Endpoints

When the admin RPC server is present, go-admin registers workflow RPC endpoints
alongside core command endpoints. They use the same workflow runtime service
and authoring store as the HTTP management APIs.

Authoring methods are provided by `go-command/flow` and include list, get, save
draft, validate, publish, delete, list versions, get version, diff versions, and
export. Export currently returns a precondition failure because the capability
is not implemented.

Workflow authoring permissions:

- read methods require `admin.workflows.read` on `workflows`
- write methods require `admin.workflows.write` on `workflows`

Binding methods:

- `fsm.bindings.list`: requires `admin.workflows.bindings.read`
- `fsm.bindings.upsert`: requires `admin.workflows.bindings.write`
- `fsm.bindings.delete`: requires `admin.workflows.bindings.write`
- `fsm.bindings.resolve`: requires `admin.workflows.bindings.read`

Binding permissions are checked against the `workflows` resource.

Use `docs/GUIDE_WORKFLOW.md` for workflow definitions, runtime binding
semantics, migrations, and panel action availability.

## Discovery Endpoint

Discovery is disabled by default. Enable it only when an authenticated tool or
admin UI needs endpoint metadata:

```go
quickstart.WithRPCTransport(quickstart.RPCTransportConfig{
    Enabled:          true,
    DiscoveryEnabled: true,
})
```

Discovery mounting creates:

```text
GET /admin/api/rpc/endpoints
```

Discovery still uses auth middleware by default. Unauthenticated discovery is
not allowed by quickstart exposure validation.

## Error And Validation Contract

Common RPC failures:

- missing command name: validation error
- command not configured in `commands.rpc.commands`: not found
- unauthenticated request for a protected rule: forbidden
- missing permission: permission denied
- missing command bus or workflow runtime: service unavailable
- policy hook rejection: hook error is returned
- command factory or handler failure: structured command error is returned

The Debug Console Commands panel applies this policy during discovery. It only
advertises a dispatch action when the catalog command has a matching
`commands.rpc.commands` rule and a registered name-based dispatcher. Commands
with missing transport or dispatcher wiring remain visible with readiness
diagnostics, rather than exposing a panel action that can only return 404. A
direct RPC request for a command omitted from the allowlist still returns not
found, preserving the deny-by-default transport contract.

Commands and policy hooks should return typed domain errors when the client
needs to distinguish validation, permission, conflict, stale state, or missing
dependency cases. Do not rely on ad hoc error strings for user-facing flows.

Runtime enforcement must still happen in command handlers and policy hooks.
RPC command rules expose a command to transport callers; they do not replace
domain validation or ownership checks.

## Validation Checklist

- RPC transport is enabled only where intended.
- The host has an authenticator unless unauthenticated mode is explicit.
- Discovery is off unless required.
- Every exposed command has a command rule.
- Anonymous command rules are narrow and explicit.
- Authorizer permits the expected permission/resource pair.
- Host policy hook covers tenant, organization, ownership, or public-command
  checks that permissions alone cannot express.
- Message factories validate command-specific payload and selection rules.
- Client uses `data-command-dispatch` for the command bus name.
- Client refresh selectors match the fragments affected by the command.
- Queued commands have correlation IDs and feedback reconciliation where the UI
  needs async completion state.

Focused tests:

```bash
/opt/homebrew/bin/go test ./admin -run 'TestAdminRPC'
/opt/homebrew/bin/go test ./quickstart -run 'TestWithRPCTransport'
(cd pkg/client/assets && node --test tests/command_runtime.test.mjs)
```

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
- [Go-first typed commands](#go-first-typed-commands)
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
        "CorrelationID": "cmd_123",
        "Metadata": {
          "correlation_id": "cmd_123"
        }
      }
    }
  }
}
```

Dispatch data:

- `command_id`: canonical command bus dispatch name.
- `name`: compatibility alias, used when `command_id` is empty. Supply one of them.
- `payload`: command payload map. Optional, defaults to `{}`.
- `ids`: selected or target IDs passed to the message factory.
- `options`: `command.DispatchOptions`, including correlation and metadata.

The transport sanitizes accepted options before calling the command bus.
Name-based dispatch then resolves one effective option snapshot before message
construction and installs it in the factory context. Precedence is:

1. Admin RPC identity comes from authenticated context. Request ID comes from
   context, then envelope metadata. Correlation comes from context, then envelope
   metadata, then explicit dispatch options, then the resolved request ID.
2. The bus merges explicit non-empty options over context options and applies
   execution policy/defaults. Client options remain untrusted; sanitization does
   not turn all context metadata into authenticated data.
3. Transport metadata uses transport-over-envelope merging. Headers can carry
   tracing values but cannot authenticate an actor or authorize work.

The same snapshot reaches the factory, handler `DispatchRunContext`, receipt,
observer, and queued executor. Context-aware factories can read it with
`command.DispatchOptionsFromContext(ctx)`. The caller's context values,
deadline, and cancellation are preserved for construction and inline
execution.

Do not derive trusted actor, tenant, organization, or authorization state from
`payload` or option metadata supplied by a client. RPC permissions and policy
hooks authorize the transport request; command handlers must derive application
identity/scope from authenticated context and enforce domain authorization
again.

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
routes. The following legacy registration remains supported:

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

For new modules, stage the handler and factory in an owner-scoped
`CommandRegistrationSet` and retain the handle until module shutdown. Commit
validates the complete declaration and publishes an isolated runtime
atomically; closing it removes only that owner's dispatch names and catalog
entries. See the owned-set migration example in the root `README.md`.

## Go-first typed commands

Typed named dispatch is opt-in. Existing `RegisterMessageFactory` and owned map
factories retain their normalization and number types, including on mixed hosts.
Define a public object input and result independently of the internal command message:

```go
declaration := cmdrpc.CommandContractFor[PublicInput, PublicResult](commandID)
binding, err := admin.NewRPCCommandBinding[PublicInput, PublicResult](declaration, wirePolicy)
if err != nil { return err }
set, err := adm.Commands().NewRegistrationSet("resource-module")
if err != nil { return err }
if err = admin.RegisterSetCommand(set, handler); err != nil { return err }
if err = admin.RegisterSetTypedRPCCommand(set, binding,
    func(ctx context.Context, input PublicInput, ids []string) (InternalMessage, error) {
        // Authorize from trusted context, including before queued acceptance.
        return buildMessageFromTrustedContext(ctx, input, ids)
    }); err != nil { return err }
handle, err := set.Commit() // retain and Close when this owner stops
```

These APIs are also exposed by `pkg/admin`. The wire policy supplies explicit
safe integer bounds, enum declarations and necessary custom-wire overrides.
Export the same declaration and policy using `admin.ExportRPCContracts`; this
runs without a service or listener. For receipt-only commands, declare `Result:
nil` and use an `any` result binding. An explicitly declared result is required
from inline handlers and validated before egress; queued execution returns its
receipt without claiming that result exists.

Typed input is decoded from original JSON before legacy aliases or identity
injection can change it. Public camel-case tags remain intact. Context-owned
actor/user/tenant/org fields and the reserved metadata aliases are rejected at
binding/export and in typed payloads, including nested unknown objects. Other
unknown fields retain Go JSON decoding behavior. Wide integers require actual
string encoding or explicit safe bounds; schema-only conversions cannot make
lossy JSON safe. Direct canonical envelope callers remain supported, but an
already-rounded caller map cannot recover its original numeric token. Typed named
requests reject repeated `data` or `payload` wrappers, including case aliases,
before dispatch. Duplicate fields inside a DTO retain Go JSON semantics; legacy
commands retain their existing decoder. Raw bytes belong to one invocation, so
nested canonical calls use their own payload while preserving trusted context.

The existing route, canonical request/response DTOs, allowlist and permission
checks remain authoritative. A separate legacy-shaped policy-hook view never
becomes the typed decode source. Handler, builder, decoder and result contract
belong to one owned generation; close the old handle before committing a
replacement. No global contract catalog is introduced.

The runnable [protected consumer recipe](../examples/rpc-contract/README.md)
provides selected offline export, explicit `go:generate`, strict generated TS,
real authenticated HTTP, direct/service parity and non-writing regeneration
checks. Generated clients preserve `{data?: T}`; named dispatch returns
`{data?: CommandDispatchResponse<Result>}` with optional result/status/validation
fields and canonical receipt casing. Check presence rather than truthiness,
retain application `data`/`result` fields, and distinguish queued acceptance from
completion. Keep the existing browser CSRF request preparation and service
permissions. Network failure after commit is unknown and is never automatically
replayed. Structural compatibility comparison is available through the published
[command CLI](https://github.com/goliatone/go-command/blob/main/cmd/rpc-tsgen/README.md)
using `-mode compare -baseline <baseline.json> -manifest <candidate.json>`.
Add `-fail-on-breaking` to fail CI on potentially breaking changes while retaining
the JSON report. Comparison is non-writing and does not establish semantic
compatibility. The [release matrix](../.ctx/specs/rpc-error-adoption/support/evidence/compatibility-matrix.md)
distinguishes the comparison proof from the protected admin graph.

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

For an API host using `NewGoAuthAuthenticator`, configure an authentication error
handler that writes HTTP 401 JSON if login redirects are unsuitable:

```go
authn := admin.NewGoAuthAuthenticator(routeAuth, authCfg,
    admin.WithAuthErrorHandler(func(c router.Context, _ error) error {
        return c.JSON(http.StatusUnauthorized, map[string]any{"error": "unauthorized"})
    }),
)
```

With go-auth's identity provider configured, protected HTTP routes resolve the
signed user ID after JWT validation and require a matching active account.
`FindIdentityByIdentifier` must support that ID lookup. A missing or disabled
account, mismatched identity, or provider error rejects the request before RPC
policy hooks and dispatch. Test providers must contain the identities used to
mint tokens. Keep authentication causes in server/test diagnostics while returning
a generic authentication error to clients.

The Fiber RPC transport returns command invocation failures, including permission
and policy denials, in an HTTP 200 error envelope. Legacy mode uses
`error.code = RPC_INVOKE_FAILED`; structured opt-in uses the classifications
described under [Error And Validation Contract](#error-and-validation-contract).
Clients must check the error envelope and the accepted receipt; HTTP status alone
does not prove that a command ran. Authentication failures happen in middleware
before RPC invocation. The host-selected authentication handler controls their
response. These existing transport semantics are distinct from panel CRUD errors.

The raw `CommandBus` registers and dispatches typed messages; it does not
require an authenticated actor or authorize direct calls. Put current grant,
Group selection and resource ownership checks in the host service, then call
that service from the typed handler. Invoke the same policy from
`RPCCommandPolicyHook` for early transport rejection. A hook alone does not
protect direct service or bus calls.

For generic Groups A/B, resolve selection from trusted context and compare it
with the requested Group before checking the current grant and stored resource
owner. Keep Groups independent of tenant/organization fields. Recheck current
policy before returning a replayed result. The command dispatch RPC endpoint is
non-idempotent; receipt acceptance does not establish durable deduplication,
resource ownership, or endpoint replay protection. Those are host responsibilities.

The SQLite fixture in `admin/guarded_command_integration_test.go` demonstrates
typed registration, RPC hooks, direct service checks, revoked grants and
reassigned resources with synthetic Groups A/B. Existing RPC tests cover exact
permission denial and metadata sanitization.
`quickstart/rpc_guarded_http_test.go` additionally exercises signed JWT validation,
current-account lookup failures, registered module startup and HTTP RPC allow/deny
paths, with synthetic accounts, host Group selection, grants and resources.
Authentication denials assert zero policy hooks and mutations. The fixtures do
not certify native Group persistence or a production identity/freshness/session
composition; those still require host integration against the corresponding
package contracts.

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
- correlation ID in `options.CorrelationID` and `options.Metadata.correlation_id`

By default, the RPC endpoint is `${apiBasePath}/rpc`. Pass `rpcEndpoint` to the
runtime mount when a screen uses a custom invoke path.

Use the Go DTO field names for dispatch options. In particular,
`options.correlation_id` does not decode into `DispatchOptions.CorrelationID`;
putting the ID only in metadata does not populate the receipt correlation field.

Trusted server context or envelope metadata may override the client option. The
runtime moves its provisional inline status to the effective receipt correlation
ID and uses that ID for completion and queued feedback. Status subscribers receive
`previousCorrelationId` on that move and should replace their old key with
`event.entry.correlationId`; the controller retains one entry, not an alias.

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
Supplying `fetchImpl` to the command runtime changes request execution only;
the runtime still prepares headers through the shared CSRF transport. Other
clients that need an injected fetch should call `httpRequestWith(fetchImpl,
endpoint, init)`. If a low-level screen must use native `fetch` directly,
create mutable `Headers`, keep `credentials: 'same-origin'`, and call
`appendCSRFHeader(endpoint, init, headers)` before sending the request.

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

RPC dispatch uses `DispatchByNameWithOutcome`, so it participates in the admin
command execution policy and preserves optional inline results. A result-reported
operational failure remains `data.result`; callers must inspect that result as
well as the transport error and receipt. Receipt-only and result-discarding direct
bus APIs retain their stricter failure behavior.

When a command returns a queued receipt:

- the client marks the command as accepted
- the pending state is keyed by the effective receipt correlation ID
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

### Opt-in structured errors

Existing mounts retain legacy codes and HTTP statuses. Both modes remove raw
`details.cause`; keep diagnostic errors in server-side callbacks instead. Enable
admin classification explicitly on each transport:

```go
quickstart.WithRPCTransport(quickstart.RPCTransportConfig{
    Enabled:     true,
    ErrorMapper: admin.DefaultRPCErrorMapper,
    CommandRules: map[string]admin.RPCCommandRule{
        "articles.publish": {
            Permission: "admin.articles.publish",
            Resource:   "commands",
        },
    },
})
```

Keep the authenticator, authorizer and host service checks from the protected
setup above. `admin.DefaultRPCErrorMapper` is also exported by `pkg/admin`.
Use the compatible dependencies in the [root module](../go.mod) and
[quickstart module](../quickstart/go.mod); adopt their coordinated release rather
than changing only one module.

| Boundary | Legacy mode | Structured opt-in | HTTP status |
| --- | --- | --- | --- |
| Parse or payload decode | Existing `RPC_INVALID_REQUEST` / `RPC_INVALID_PARAMS` | Same transport code | 400 |
| Missing or unknown method | `RPC_METHOD_REQUIRED` / `RPC_METHOD_NOT_FOUND` | Same transport code | 400 / 404 |
| Returned pre-invoke rejection | `RPC_PREINVOKE_REJECTED` | Safe mapped application code | 400 |
| Returned invocation failure | `RPC_INVOKE_FAILED` | Safe mapped application code | 200 |
| Successful invocation | Existing data envelope | Same data envelope | 200 |

The admin mapper reuses domain classification through runner wrappers and emits
fixed messages for validation, forbidden/not-found, conflict, failed precondition,
rate limiting, unavailability, cancellation/deadline and internal errors. It
preserves explicit canonical RPC codes, including `OUTCOME_UNKNOWN` and `INTERNAL`,
before classifying nested admin causes. Context cancellation/deadline causes still
take precedence, and known runner wrappers remain transparent. Default output omits diagnostic messages,
metadata, validation values and retry hints. A custom `cmdrpc.ErrorMapper` may
project explicitly allowlisted, bounded public details; keep validation details
field-addressable. Do not copy `ErrorPresenter.Present` metadata into the wire
error. A custom mapper returning nil declines to the upstream default classifier;
a nil `ErrorMapper` setting selects legacy mode. Malformed or panicking custom
projections fall back safely at the router boundary.

Successful responses and explicitly public handler error envelopes pass through.
A panic reaching the RPC boundary produces a safe internal failure in structured
mode. Existing command-runner behavior remains independent: a runner-consumed
panic in a result-producing command can surface as a missing-result/unavailable
failure. Neither failure contains panic text or proves rollback.

`AfterInvoke` receives the invocation's diagnostic error; it does not cover every
pre-invocation failure. Custom mounts can use `rpcfiber.WithErrorObserver` for
private stage diagnostics. Diagnostic callbacks must not write a response or
copy causes into client-visible fields. Authentication and CSRF middleware errors
outside the RPC handler keep their existing presenters and statuses.

### Migration and outcome handling

1. Adopt the coordinated root/quickstart release. Verify code that depended on
   `details.cause` now uses private diagnostics.
2. Keep legacy mode initially, then opt selected mounts into
   `admin.DefaultRPCErrorMapper`. Update code-specific UI handling from the legacy
   invocation code to canonical classifications. Browser consumers must check the
   HTTP-200 error envelope; the shared runtime preserves its code and safe message.
3. Keep shared browser transport and CSRF handling enabled. Error mapping does
   not replace authentication, CSRF, command allowlists or service authorization.
   Explicit typed endpoints must enforce host permissions; `EndpointSpec.Permissions`
   is descriptive and does not itself authorize dispatch.
4. Treat an accepted queued receipt as queue acceptance, not completion. Preserve
   command/dispatch/correlation IDs and reconcile through the host's status or
   feedback path. Cancellation, deadline, network failure and `OUTCOME_UNKNOWN`
   do not prove that a mutation rolled back. Do not automatically replay it.
   Idempotency/correlation IDs alone do not establish durable deduplication.


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
GOWORK=off go test ./admin -run 'Test(AdminRPC|DefaultRPCErrorMapper|GuardedCommandHostBoundaries)'
go test -race ./quickstart -run 'Test(RPCErrorAdoptionProtectedLiveParity|WithRPCTransport|RPCTransportErrorMapper)'
(cd pkg/client/assets && node --test --test-concurrency=1 tests/command_runtime.test.mjs tests/csrf_transport.test.mjs tests/command_launcher.test.mjs tests/error_helpers.test.mjs)
```

## Activity ingestion command reuse

`activity.ingest.v1` delegates to the reusable authorized ingestion service.
Future RPC/WS/broker adapters must verify producer/actor evidence into trusted
context on every event and call `DispatchActivityIngestion` inline. Queue, delay,
deduplication and cached-result overrides are rejected before executor selection;
ordinary RPC/browser identity is insufficient. HTTP is the only supplied producer
ingress. See [command reuse](GUIDE_ACTIVITY.md#command-reuse-disclosure-and-reads)
for typed results and the exact-number payload boundary.

## Compatibility and support boundary

Use the coordinated root and quickstart artifacts and the providers selected by
[their module manifests](../go.mod) and [quickstart/go.mod](../quickstart/go.mod).
The [verified release matrix](../.ctx/specs/rpc-error-adoption/support/evidence/compatibility-matrix.md)
records exact versions, toolchains and proof scope; it is evidence for those
combinations, not a promise that arbitrary provider mixes work.

- Go minimums come from each module's `go` directive and the selected dependency
  graph. A newer-toolchain pass does not establish minimum-toolchain coverage.
- The generated-client proof uses the TypeScript compiler pinned by the
  [client tool configuration](../pkg/client/assets/package.json), with strict,
  exact optional property and unchecked index checks. Other compiler versions
  are unverified unless recorded in the matrix.
- Native Fiber adapters and quickstart wrappers that forward startup validation
  support strict readiness. Opaque routers/wrappers without the optional
  capabilities cannot provide that guarantee; strict startup rejects them.
- Legacy scaffold/dynamic dispatch remain supported. Full typed export requires
  explicit declarations; unsupported dynamic/custom JSON shapes need an explicit
  wire contract and runtime enforcement. Discovery does not substitute for export.
- Local replacements are development evidence only. A downstream release must
  repeat the proof against published dependencies with no local replacements.

## Strict exposure readiness

Enable finalized startup checks explicitly:

```go
quickstart.WithRPCTransport(quickstart.RPCTransportConfig{
    Enabled:       true,
    StrictStartup: true,
    // Supply the host's command rules and authentication configuration.
})
```

Register commands and modules before starting the router. Native Fiber adapters
run the check after physical route publication, including host-owned adapters
started through `WrappedRouter().Listener(...)`. Supported quickstart host surfaces
forward the lifecycle capability. An unsupported router or wrapper cannot provide
strict startup assurance and must implement/forward `StartupValidatorRegistrar`.

`adm.RPCExposureReadiness()` returns the same report used by the `rpc_exposure`
Doctor check and the strict startup validator. Reading it never mounts/seals
routes, executes handlers/factories, resolves actor permissions or adds rules.

| State | Meaning and action |
| --- | --- |
| `disabled` | RPC transport is not configured as enabled. |
| `pending` | Routes are still collecting/finalizing. Complete host registration and start through the router lifecycle; a diagnostics read does not start it. |
| `ready` | Declared exposure, endpoint structure, required policy capabilities and configured physical mounts pass. Request authorization still runs normally. |
| `invalid` | Fix the reported configuration, registration, endpoint or route issue. |
| `unverifiable` | Supply supported route introspection or explicit structural validation for a custom endpoint. Strict startup rejects this state. |

`command_registration_gaps` requires a usable handler and named dispatcher.
`rpc_command_rule_gaps` applies to explicit catalog exposure declarations; private
catalog commands are ignored. Register only intended commands and add explicit
rules. Diagnostics never expose every registered command automatically.

Exact permission mode checks for a resolved-permission provider, including a
configured resolver on `GoAuthAuthorizer`; it does not inspect any actor's grants.
A protected transport with no intended named exposure and discovery disabled can
remain deny-all without a permission resolver. Endpoint `Permissions` metadata is
not enforcement: custom endpoints must retain their own authorization guards.

Custom endpoint wrappers must implement go-command's optional `EndpointValidator`
to attest their actual handler/types/factory without executing them. Forwarding an
embedded definition alone does not validate a wrapper's changed carrier or service
wiring. The protected RPC fixture demonstrates explicit adapter validation.

`rpc_mount_mismatch`, `rpc_mount_conflict` and `rpc_mount_shadowed` identify missing,
unexpected, preoccupied or unreachable invoke/discovery paths. Match the configured
URL to the host's actual mount prefix. Discovery remains off by default.

Router validation failures are sticky. The optional `router.StartupInitializer`
provides `Initialize() error` for hosts that need synchronous validation before
starting a native listener. Quickstart-owned servers forward it. `Serve` returns
`StartupValidationError`;
`Init` and `WrappedRouter` panic with that typed error because their existing
signatures cannot return errors. Correct the configuration and construct a new
server after rejection. `rpc_startup_rejected` keeps Doctor/readiness from claiming
that a rejected server can start merely because registrations were repaired later.

For the protected candidate proof, use `python3 examples/rpc-contract/verify.py`.
When deliberately testing an unreleased router selected through the development
workspace, pass `--allow-local-router`; evidence records the replacement and source
hashes. Remove that replacement, update module requirements to the released router,
and rerun without the flag before preparing the admin release.

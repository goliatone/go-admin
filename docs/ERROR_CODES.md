# Error Codes

This is the default domain code catalog from `admin.DomainErrorCodes()` in
`admin/error_codes.go`. HTTP statuses are the registered defaults; a boundary
may map an error to a more specific status. Hosts can add codes through
`admin.RegisterDomainErrorCodes(...)`; those application codes are not listed here.

The go-admin API envelope is `admin.ErrorResponse` with a nested
`admin.PresentedError`: `error.text_code`, `error.category`, `error.code`, and a
presenter-controlled message. Validation output exposes field/message pairs,
not rejected values. Causes are omitted. Presenter mappers own the client-safe
metadata contract; locations/stacks are included only when error configuration
opts into diagnostics. This envelope is distinct from directly marshaling an
upstream go-errors value. See `admin/error_response.go` and
`admin/error_presenter.go` for presentation behavior.

## Core codes

| Text code | HTTP | Category | Description |
| --- | --- | --- | --- |
| ACTIVITY_ACTOR_CONTEXT_INVALID | 400 | validation | Activity access requires auth actor_id to be a UUID. |
| ADMIN_CSRF_INVALID | 400 | bad_input | The request is missing a valid CSRF token for a cookie-authenticated admin session. |
| AUTOSAVE_CONFLICT | 409 | conflict | Autosave payload version is stale compared to the latest server state. |
| CLEAR_KEYS_NOT_SUPPORTED | 400 | bad_input | Clearing preference keys is not supported for this scope. |
| CONFLICT | 409 | conflict | The request conflicts with an existing resource or state. |
| CONSOLE_CLIENT_OUTDATED | 409 | conflict | The console page assets do not implement a capability this action requires; reload the page. |
| CONTENT_TYPE_SCHEMA_BREAKING | 409 | bad_input | Content type schema changes are breaking. |
| FEATURE_ALIAS_DISABLED | 400 | bad_input | Feature alias overrides are disabled. |
| FEATURE_DISABLED | 404 | not_found | The requested feature is disabled. |
| FEATURE_ENABLED_REQUIRED | 400 | bad_input | Feature must be enabled to apply overrides. |
| FEATURE_KEY_REQUIRED | 400 | bad_input | Feature key is required. |
| FORBIDDEN | 403 | authorization | The request is not authorized. |
| INVALID_FEATURE_CONFIG | 400 | validation | Feature configuration is invalid or missing dependencies. |
| INVALID_SELECTION | 400 | bad_input | The requested bulk selection is invalid for the action. |
| INVALID_STATUS | 409 | conflict | The requested action is invalid for the current resource state. |
| INVALID_STATUS_TRANSITION | 409 | conflict | The requested action is invalid for the current resource state. |
| MENU_VALIDATION_CYCLE | 400 | validation | Menu tree contains a cycle. |
| MENU_VALIDATION_DEPTH | 400 | validation | Menu tree exceeds maximum supported depth. |
| MENU_VALIDATION_INVALID_TARGET | 400 | validation | Menu item target is invalid. |
| MISSING_CONTEXT | 400 | bad_input | Required resource context is missing for the requested action. |
| MISSING_PANEL | 400 | bad_input | Required debug panel identifier is missing. |
| NOT_FOUND | 404 | not_found | The requested resource was not found. |
| PATH_CONFLICT | 409 | conflict | The requested path or slug conflicts with an existing resource. |
| PERMISSION_DENIED | 403 | authorization | The request is not authorized for the current translation operation. |
| POLICY_BLOCKED | 409 | conflict | The requested action is blocked by translation policy or lifecycle rules. |
| PRECONDITION_FAILED | 409 | conflict | The requested action cannot complete because one or more preconditions are not met. |
| RATE_LIMITED | 429 | rate_limit | The request is currently rate limited. |
| RAW_UI_NOT_SUPPORTED | 400 | bad_input | Raw preferences UI is not supported for this module. |
| RESOURCE_IN_USE | 409 | conflict | The requested action cannot complete because the resource is in use. |
| SCOPE_INVALID | 400 | bad_input | Scope is invalid. |
| SCOPE_METADATA_MISSING | 400 | bad_input | Scope metadata is missing. |
| SERVICE_UNAVAILABLE | 503 | internal | A required service or integration is not configured for the requested operation. |
| TEMPORARILY_UNAVAILABLE | 503 | internal | The requested action is temporarily unavailable. |
| TRANSLATION_EXCHANGE_DUPLICATE_ROW | 409 | conflict | Translation exchange payload contains duplicate linkage rows. |
| TRANSLATION_EXCHANGE_INVALID_PAYLOAD | 400 | bad_input | Translation exchange payload is invalid. |
| TRANSLATION_EXCHANGE_MISSING_LINKAGE | 409 | conflict | Translation exchange row linkage could not be resolved. |
| TRANSLATION_EXCHANGE_STALE_SOURCE_HASH | 409 | conflict | Translation exchange row source hash is stale. |
| TRANSLATION_EXCHANGE_UNSUPPORTED_FORMAT | 400 | bad_input | Translation exchange format is not supported. |
| TRANSLATION_EXISTS | 409 | conflict | Translation for the requested locale already exists. |
| TRANSLATION_MISSING | 400 | validation | Required translations are missing for this workflow transition. |
| TRANSLATION_QUEUE_CONFLICT | 409 | conflict | Translation queue assignment conflicts with an active assignment. |
| TRANSLATION_QUEUE_VERSION_CONFLICT | 409 | conflict | Translation queue assignment version does not match the expected value. |
| VALIDATION_ERROR | 400 | validation | Validation failed for the submitted payload. |
| VERSION_CONFLICT | 409 | conflict | The request version or idempotency state conflicts with the current server state. |
| WORKFLOW_INVALID_TRANSITION | 400 | bad_input | Workflow transition is invalid for the current state. |
| WORKFLOW_NOT_FOUND | 404 | not_found | Workflow definition is missing for the entity type. |

## Debug/REPL codes

| Text code | HTTP | Category | Description |
| --- | --- | --- | --- |
| REPL_APP_DISABLED | 403 | authorization | App REPL is disabled. |
| REPL_DEBUG_DISABLED | 403 | authorization | Debug module is disabled. |
| REPL_DISABLED | 403 | authorization | REPL is disabled. |
| REPL_EXEC_PERMISSION_DENIED | 403 | authorization | REPL exec permission denied. |
| REPL_IP_DENIED | 403 | authorization | REPL access denied by IP policy. |
| REPL_OVERRIDE_DENIED | 403 | authorization | REPL override denied. |
| REPL_PERMISSION_DENIED | 403 | authorization | REPL permission denied. |
| REPL_READ_ONLY | 403 | authorization | REPL exec disabled while read-only. |
| REPL_ROLE_DENIED | 403 | authorization | REPL role not allowed. |
| REPL_SESSION_LIMIT | 429 | rate_limit | REPL session limit reached. |
| REPL_SHELL_DISABLED | 403 | authorization | Shell REPL is disabled. |

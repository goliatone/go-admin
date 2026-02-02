# Error Codes

This document lists the domain error codes emitted by go-admin API responses.

Each error includes:
- `error.text_code`: stable identifier for client handling.
- `error.category`: coarse error category.
- `error.code`: HTTP status code.

## Core codes

| Text code | HTTP | Category | Description |
| --- | --- | --- | --- |
| VALIDATION_ERROR | 400 | validation | Validation failed for the submitted payload. |
| INVALID_FEATURE_CONFIG | 400 | validation | Feature configuration is invalid or missing dependencies. |
| WORKFLOW_INVALID_TRANSITION | 400 | bad_input | Workflow transition is invalid for the current state. |
| FEATURE_ENABLED_REQUIRED | 400 | bad_input | Feature must be enabled to apply overrides. |
| FEATURE_ALIAS_DISABLED | 400 | bad_input | Feature alias overrides are disabled. |
| FEATURE_KEY_REQUIRED | 400 | bad_input | Feature key is required. |
| SCOPE_METADATA_MISSING | 400 | bad_input | Scope metadata is missing. |
| SCOPE_INVALID | 400 | bad_input | Scope is invalid. |
| MISSING_PANEL | 400 | bad_input | Required debug panel identifier is missing. |
| RAW_UI_NOT_SUPPORTED | 400 | bad_input | Raw preferences UI is not supported for this module. |
| CLEAR_KEYS_NOT_SUPPORTED | 400 | bad_input | Clearing preference keys is not supported for this scope. |
| FORBIDDEN | 403 | authorization | The request is not authorized. |
| FEATURE_DISABLED | 404 | not_found | The requested feature is disabled. |
| NOT_FOUND | 404 | not_found | The requested resource was not found. |
| WORKFLOW_NOT_FOUND | 404 | not_found | Workflow definition is missing for the entity type. |
| REPL_SESSION_LIMIT | 429 | rate_limit | REPL session limit reached. |

## Debug/REPL codes

| Text code | HTTP | Category | Description |
| --- | --- | --- | --- |
| REPL_DEBUG_DISABLED | 403 | authorization | Debug module is disabled. |
| REPL_SHELL_DISABLED | 403 | authorization | Shell REPL is disabled. |
| REPL_APP_DISABLED | 403 | authorization | App REPL is disabled. |
| REPL_DISABLED | 403 | authorization | REPL is disabled. |
| REPL_OVERRIDE_DENIED | 403 | authorization | REPL override denied. |
| REPL_ROLE_DENIED | 403 | authorization | REPL role not allowed. |
| REPL_PERMISSION_DENIED | 403 | authorization | REPL permission denied. |
| REPL_EXEC_PERMISSION_DENIED | 403 | authorization | REPL exec permission denied. |
| REPL_READ_ONLY | 403 | authorization | REPL exec disabled while read-only. |
| REPL_IP_DENIED | 403 | authorization | REPL access denied by IP policy. |

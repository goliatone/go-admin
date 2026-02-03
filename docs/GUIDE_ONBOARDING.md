# Onboarding Workflow Guide

This guide covers the securelink-driven onboarding workflow (invite, password reset,
and self-registration) plus the quickstart helpers that wire UI + API routes. It also
documents token lifecycle storage and the error response shape used by go-admin.

## Overview

The onboarding flow is split across:

- go-users: token issuance/validation + replay protection + activity logging.
- go-auth: auth primitives (password hashing, login throttling).
- go-admin/quickstart: HTTP wiring (routes, UI templates, and error mapping).

Secure links are generated via `go-urlkit/securelink` adapters. Tokens are never stored
raw; only `jti` + lifecycle metadata are persisted for replay protection.

## Feature gates

Use these feature gate keys (system scope) to gate onboarding UI + APIs. Enable them
via the configured FeatureGate defaults or runtime overrides (quickstart:
`WithFeatureDefaults(...)` or `MutableFeatureGate.Set/Unset`).

- `users.invite`: allow invite issuance + acceptance UI.
- `users.password_reset`: allow password reset UI and endpoints.
- `users.signup`: allow self-registration UI and endpoints.

The auth UI (login template + links) uses `users.password_reset` and `users.signup`.
Alias policy: `users.self_registration` is not supported; use `users.signup`.

## Securelink configuration (quickstart)

Quickstart can build securelink managers from environment:

- `ADMIN_SECURELINK_KEY`: required signing key (empty disables manager in quickstart).
- `ADMIN_SECURELINK_BASE_URL`: default `http://localhost:8080`.
- `ADMIN_SECURELINK_QUERY_KEY`: default `token`.
- `ADMIN_SECURELINK_AS_QUERY`: default `true` (token in query string).
- `ADMIN_SECURELINK_EXPIRATION`: default `72h` (Go duration).

Key helpers:

- `SecureLinkConfigFromEnv(basePath string)` builds config + default routes.
- `NewSecureLinkManager(cfg)` returns a go-users compatible manager.
- `NewNotificationsSecureLinkManager(cfg)` returns a go-notifications manager.
- `ApplySecureLinkManager(cfg *userssvc.Config, manager, opts...)` wires routes/manager.

### Securelink route map

Securelink payloads reference route keys, which map to public-facing paths:

- `invite` -> `<basePath>/invite`
- `register` -> `<basePath>/register`
- `password-reset` -> `<basePath>/password-reset/confirm`

`basePath` typically matches `admin.Config.BasePath` (or `ADMIN_BASE_PATH`).

## Onboarding API routes

Quickstart registers the onboarding API under `<basePath>/api/onboarding`:

- `POST /invite`
- `GET /invite/verify`
- `POST /invite/accept`
- `POST /register`
- `POST /register/confirm`
- `POST /password/reset/request`
- `POST /password/reset/confirm`
- `GET /token/metadata`

Use `RegisterOnboardingRoutes` plus `WithOnboardingRoutePaths` to override defaults.

## Auth + registration UI routes

Quickstart provides UI route helpers:

- `RegisterAuthUIRoutes`: login/logout/password reset UI.
- `RegisterRegistrationUIRoutes`: registration UI (separate route).

Defaults (when base path is `/admin`):

- `/admin/login`
- `/admin/logout`
- `/admin/password-reset` (request page)
- `/admin/password-reset/confirm` (apply token page)
- `/admin/register`

All of these are overrideable via `WithAuthUI*` and `WithRegistrationUI*` options.

## Token lifecycle + replay protection

Securelink payloads include:

- `action` (`invite`, `password_reset`, `register`)
- `user_id` + optional `email`
- `jti` (unique token ID)
- `issued_at`, `expires_at` (RFC3339)
- optional scope (`tenant_id`, `org_id`)

go-users persists lifecycle data for replay protection. Expected fields:

- `user_token` table (invite/registration):
  - `type`, `user_id`, `jti`, `expires_at`, `used_at`
  - optional `status`, `scope_tenant_id`, `scope_org_id`
- `password_reset` table:
  - `jti`, `issued_at`, `expires_at`, `used_at`
  - optional `scope_tenant_id`, `scope_org_id`

Tokens are single-use: on successful consume, `used_at` is set and the `jti` can no
longer be reused. Raw tokens are never stored or logged.

## Error response shape + text codes

go-admin uses go-errors for API error responses. JSON shape:

```json
{
  "error": {
    "category": "authz",
    "code": 403,
    "text_code": "FEATURE_DISABLED",
    "message": "registration disabled",
    "metadata": {
      "path": "/admin/api/onboarding/register",
      "method": "POST"
    },
    "timestamp": "2024-06-01T12:00:00Z"
  }
}
```

`metadata` includes request context and may include:

- `fields` for validation errors.
- `issues` for missing feature dependencies.

Common onboarding/auth `text_code` values (not all emitted by every handler):

- `FEATURE_DISABLED`, `FEATURES_MISSING`
- `RESET_NOT_ALLOWED`, `RESET_RATE_LIMIT`, `TOO_MANY_ATTEMPTS`
- `TOKEN_REQUIRED`, `TOKEN_PASSWORD_REQUIRED`, `TOKEN_MALFORMED`, `TOKEN_EXPIRED`
- `TOKEN_NOT_FOUND`, `INVITE_EXPIRED`, `INVITE_USED`
- `USER_NOT_FOUND`, `EMAIL_REQUIRED`, `IDENTIFIER_REQUIRED`, `INVALID_PAYLOAD`
- `ACCOUNT_LOCKED`, `ACCOUNT_DISABLED`, `ACCOUNT_SUSPENDED`, `ACCOUNT_ARCHIVED`
- `VERIFICATION_REQUIRED`, `VERIFICATION_EXPIRED`

Quickstart uses `goerrors.MapToError` with `DefaultErrorMappers()` and accepts
additional mappers via `WithFiberErrorMappers(...)`.

## Default UI + override hooks

Use quickstart options to override routes, templates, and view context:

```go
secureCfg := quickstart.SecureLinkConfigFromEnv(cfg.BasePath)

if err := quickstart.RegisterAuthUIRoutes(
	r,
	cfg,
	auther,
	authCookieName,
	quickstart.WithAuthUITemplates("login_custom", "password_reset_custom"),
	quickstart.WithAuthUIPasswordResetConfirmTemplate("password_reset_confirm_custom"),
	quickstart.WithAuthUIRegisterPath(path.Join(cfg.BasePath, "signup")),
	quickstart.WithAuthUIViewContextBuilder(func(ctx router.ViewContext, _ router.Context) router.ViewContext {
		ctx["marketing_banner"] = "Welcome"
		return ctx
	}),
); err != nil {
	return err
}

if err := quickstart.RegisterRegistrationUIRoutes(
	r,
	cfg,
	quickstart.WithRegistrationUITemplate("signup"),
	quickstart.WithRegistrationUIViewContextBuilder(func(ctx router.ViewContext, _ router.Context) router.ViewContext {
		ctx["token_query_key"] = secureCfg.QueryKey
		ctx["token_as_query"] = secureCfg.AsQuery
		return ctx
	}),
); err != nil {
	return err
}
```

Default view context keys include:

- `base_path`, `password_reset_path`, `password_reset_confirm_path`, `register_path`
- `feature_ctx`, `feature_scope`, `feature_snapshot` (feature template helpers)
- `registration_mode` (registration UI only)

Templates should use the feature helpers (`feature`, `feature_any`, `feature_all`,
`feature_none`, `feature_if`, `feature_class`) instead of legacy flags.

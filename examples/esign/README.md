# go-admin E-Sign Example (Phase 0 Scaffold)

Backend-first flagship e-sign scaffold wired through quickstart.

## Command Reference

All commands map directly to `examples/esign/taskfile`.

### `dev:serve`

Build shared client assets and run the e-sign example server.

```bash
cd examples/esign
./taskfile dev:serve
```

### `dev:test`

Run backend tests for the e-sign example package.

```bash
cd examples/esign
./taskfile dev:test
```

### `dev:cover`

Run tests with coverage output.

```bash
cd examples/esign
./taskfile dev:cover
```

### `version:*`

Use the same version helper tasks as other examples:

- `version:get`
- `version:set`
- `version:bump`
- `version:upsert`

### `release`

Run the release helper flow defined in the taskfile.

### `release:verify`

Run backend release-gate validation (checklist enforcement + SLO validation profile).

```bash
cd examples/esign
./taskfile release:verify
```

### `smoke:e2e`

Run reusable local smoke flow:
upload source pdf, create document, create agreement, send, complete signer journey, verify completion-recipient artifact access.

```bash
cd examples/esign
./taskfile smoke:e2e
```

Optional overrides:

```bash
BASE_URL=http://localhost:8082 \
TENANT_ID=tenant-smoke \
ORG_ID=org-smoke \
ADMIN_IDENTIFIER=admin@example.com \
ADMIN_PASSWORD=admin.pwd \
./taskfile smoke:e2e
```

## Local Defaults

`dev:serve` sets:

- `ESIGN_FEATURE_ENABLED=true`
- `ESIGN_GOOGLE_FEATURE_ENABLED=false`
- `ESIGN_ACTIVITY_FEATURE_ENABLED=true`
- `ADMIN_PUBLIC_API=true`
- `ADMIN_API_VERSION=v1`

The e-sign runtime now uses SQLite-backed storage by default:

- e-sign domain store (agreements/documents/signing/audit/email/job state)
- admin activity backend (sink + repository)

That means `/admin/activity` and `/admin/api/v1/activity` work by default when
`ESIGN_ACTIVITY_FEATURE_ENABLED=true`.

Optional database DSN override:

- `ESIGN_DATABASE_DSN` (falls back to `CONTENT_DATABASE_DSN`, then a file in `/tmp`)

## Web Entrypoint And Auth Flow

Phase 16 wiring enables the admin shell/login flow for the e-sign runtime.

- `http://localhost:8082/` redirects to `/admin`.
- `http://localhost:8082/admin` and `http://localhost:8082/admin/` are authenticated shell entrypoints.
- Unauthenticated shell access redirects to `/admin/login`.
- `http://localhost:8082/admin/esign` renders the e-sign landing page inside the go-admin shell.
- `http://localhost:8082/admin/esign/status` remains a backend status endpoint.
- Public signer routes stay outside admin auth, for example:
  - `http://localhost:8082/api/v1/esign/signing/session/:token`

### Template Path Context

The signer pages now use shared quickstart path-context wiring instead of local
string concatenation. Runtime handlers inject:

- `base_path`
- `api_base_path`
- `asset_base_path`

via `quickstart.WithPathViewContext(...)`, which keeps asset URLs aligned with
`quickstart.NewStaticAssets(...)` when `cfg.BasePath` changes.

### Demo Login Credentials (Env-Backed Provider)

By default:

- `identifier`: `admin@example.com`
- `password`: `admin.pwd`

Override with environment variables:

- `ESIGN_ADMIN_EMAIL`
- `ESIGN_ADMIN_PASSWORD`
- `ESIGN_ADMIN_ID`
- `ESIGN_ADMIN_ROLE`
- `ESIGN_AUTH_SIGNING_KEY`
- `ESIGN_AUTH_CONTEXT_KEY`

## Environment Variables Reference

### Feature Flags

| Variable | Default | Description |
|----------|---------|-------------|
| `ESIGN_FEATURE_ENABLED` | `true` | Enable/disable e-sign module |
| `ESIGN_GOOGLE_FEATURE_ENABLED` | `false` | Enable/disable Google Drive integration |
| `ESIGN_ACTIVITY_FEATURE_ENABLED` | `true` | Enable/disable activity feed |

### Database

| Variable | Default | Description |
|----------|---------|-------------|
| `ESIGN_DATABASE_DSN` | SQLite file in `/tmp` | Database connection string for e-sign domain store |
| `CONTENT_DATABASE_DSN` | (fallback) | Fallback if `ESIGN_DATABASE_DSN` not set |

### Authentication

| Variable | Default | Description |
|----------|---------|-------------|
| `ESIGN_ADMIN_EMAIL` | `admin@example.com` | Demo admin email/identifier |
| `ESIGN_ADMIN_PASSWORD` | `admin.pwd` | Demo admin password |
| `ESIGN_ADMIN_ID` | `esign-admin` | Demo admin user ID |
| `ESIGN_ADMIN_ROLE` | `admin` | Demo admin role |
| `ESIGN_AUTH_SIGNING_KEY` | (internal default) | JWT signing key |
| `ESIGN_AUTH_CONTEXT_KEY` | (internal default) | Auth context key |

### Email Transport

| Variable | Default | Description |
|----------|---------|-------------|
| `ESIGN_EMAIL_TRANSPORT` | `deterministic` | Transport mode: `deterministic`, `smtp`, `mailpit` |
| `ESIGN_EMAIL_SMTP_HOST` | `localhost` | SMTP server host |
| `ESIGN_EMAIL_SMTP_PORT` | `587` | SMTP server port |
| `ESIGN_EMAIL_SMTP_USERNAME` | (empty) | SMTP username |
| `ESIGN_EMAIL_SMTP_PASSWORD` | (empty) | SMTP password |
| `ESIGN_EMAIL_FROM_NAME` | `E-Sign` | Default sender name |
| `ESIGN_EMAIL_FROM_ADDRESS` | `noreply@example.com` | Default sender address |
| `ESIGN_EMAIL_SMTP_TIMEOUT_SECONDS` | `30` | SMTP connection timeout |
| `ESIGN_EMAIL_SMTP_DISABLE_STARTTLS` | `false` | Disable STARTTLS (auto-set for mailpit) |
| `ESIGN_EMAIL_SMTP_INSECURE_TLS` | `false` | Skip TLS certificate verification |

### Google Integration

Required when `ESIGN_GOOGLE_FEATURE_ENABLED=true`:

| Variable | Default | Description |
|----------|---------|-------------|
| `ESIGN_GOOGLE_PROVIDER_MODE` | (none) | Provider mode: `real` or `deterministic` |
| `ESIGN_GOOGLE_CLIENT_ID` | (required for real) | Google OAuth client ID |
| `ESIGN_GOOGLE_CLIENT_SECRET` | (required for real) | Google OAuth client secret |
| `ESIGN_GOOGLE_CREDENTIAL_ACTIVE_KEY` | (required) | Encryption key for stored OAuth tokens |
| `ESIGN_GOOGLE_CREDENTIAL_ACTIVE_KEY_ID` | `v1` | Key ID for key rotation |
| `ESIGN_GOOGLE_CREDENTIAL_KEYS_JSON` | (empty) | JSON object of legacy keys for rotation: `{"v0":"old-key"}` |
| `ESIGN_GOOGLE_TOKEN_ENDPOINT` | Google default | OAuth token endpoint URL |
| `ESIGN_GOOGLE_REVOKE_ENDPOINT` | Google default | OAuth revoke endpoint URL |
| `ESIGN_GOOGLE_DRIVE_BASE_URL` | Google default | Drive API base URL |
| `ESIGN_GOOGLE_USERINFO_ENDPOINT` | Google default | UserInfo endpoint URL |
| `ESIGN_GOOGLE_HEALTH_ENDPOINT` | Google default | Health check endpoint URL |
| `ESIGN_GOOGLE_HTTP_TIMEOUT_SECONDS` | `30` | HTTP client timeout |

#### Generating the Google Credential Key

The `ESIGN_GOOGLE_CREDENTIAL_ACTIVE_KEY` is used to encrypt Google OAuth tokens at rest (AES-256-GCM, derived via SHA-256).

**For development**, any string works:

```bash
export ESIGN_GOOGLE_CREDENTIAL_ACTIVE_KEY="my-dev-secret-key"
```

**For production**, generate a secure random key:

```bash
# Using openssl
openssl rand -base64 32

# Using /dev/urandom
head -c 32 /dev/urandom | base64
```

Then set it:

```bash
export ESIGN_GOOGLE_CREDENTIAL_ACTIVE_KEY="<generated-value>"
```

**Important**: Keep this key secret. You cannot decrypt stored credentials without it.

### Public API

| Variable | Default | Description |
|----------|---------|-------------|
| `ESIGN_PUBLIC_BASE_URL` | (empty) | Public base URL for signer links in emails |

### Runtime Profile

| Variable | Default | Description |
|----------|---------|-------------|
| `ESIGN_RUNTIME_PROFILE` | (empty) | Set to `production` or `prod` to enforce production validation |
| `ESIGN_STORAGE_ENCRYPTION_ALGORITHM` | `aws:kms` | Storage encryption algorithm |

### Admin Framework (inherited from quickstart)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8082` | Server listen port |
| `ADMIN_DEBUG` | `false` | Enable debug mode |
| `ADMIN_DEBUG_SLOG` | `true` | Enable slog debug handler |
| `ADMIN_PUBLIC_API` | `false` | Enable public API endpoints |
| `ADMIN_API_VERSION` | (empty) | API version prefix |
| `ADMIN_SCOPE_MODE` | `single` | Scope mode: `single` or `multi` |
| `ADMIN_DEFAULT_TENANT_ID` | (empty) | Default tenant ID for single-tenant mode |
| `ADMIN_DEFAULT_ORG_ID` | (empty) | Default org ID for single-tenant mode |
| `ADMIN_ERROR_STACKTRACE` | `false` | Include stack traces in errors |
| `ADMIN_ERROR_EXPOSE_INTERNAL` | `false` | Expose internal error messages |

### Debug Configuration (when `ADMIN_DEBUG=true`)

| Variable | Description |
|----------|-------------|
| `ADMIN_DEBUG_ALLOWED_IPS` | Comma-separated allowed IPs |
| `ADMIN_DEBUG_ALLOWED_ORIGINS` | Comma-separated allowed origins |
| `ADMIN_DEBUG_APP_ID` | Application ID |
| `ADMIN_DEBUG_APP_NAME` | Application name |
| `ADMIN_DEBUG_ENVIRONMENT` | Environment name |
| `ADMIN_DEBUG_REMOTE` | Enable remote debugging |
| `ADMIN_DEBUG_TOKEN_TTL` | Debug token TTL |
| `ADMIN_DEBUG_SESSION_TRACKING` | Enable session tracking |
| `ADMIN_DEBUG_SESSION_COOKIE` | Session cookie name |
| `ADMIN_DEBUG_SESSION_EXPIRY` | Session inactivity expiry |
| `ADMIN_DEBUG_SQL` | Capture SQL queries |
| `ADMIN_DEBUG_LOGS` | Capture logs |
| `ADMIN_DEBUG_JS_ERRORS` | Capture JS errors |
| `ADMIN_DEBUG_REQUEST_BODY` | Capture request bodies |
| `ADMIN_DEBUG_TOOLBAR` | Enable debug toolbar |
| `ADMIN_DEBUG_TOOLBAR_PANELS` | Comma-separated toolbar panels |
| `ADMIN_DEBUG_LAYOUT` | Debug layout mode |
| `ADMIN_DEBUG_REPL` | Enable REPL |
| `ADMIN_DEBUG_REPL_READONLY` | REPL read-only mode |

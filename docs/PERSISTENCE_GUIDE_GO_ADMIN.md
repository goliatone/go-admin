# go-admin Persistence Guide

This guide defines the go-admin-native persistence approach for application projects that need durable data across restarts and deployment environments.

Use this guide when you want:

1. SQLite in development.
2. Postgres in production.
3. A shared infrastructure approach based on `go-persistence-bun` and `go-repository-bun`.
4. A repeatable migration lifecycle and repository wiring model across applications.

## Goals

1. One persistence architecture shared by all go-admin apps.
2. Consistent startup/bootstrap behavior.
3. Dialect-aware migrations with parity validation for `sqlite` and `postgres`.
4. Domain repositories implemented with `go-repository-bun`.
5. Clear ownership boundaries between app code, quickstart helpers, and persistence packages.

## Non-goals

1. Supporting additional primary SQL dialects in the standard path.
2. Allowing per-app ad-hoc migration planners.
3. Keeping legacy snapshot stores as a long-term persistence layer.

## Canonical Stack

1. `go-persistence-bun`: SQL connection + Bun integration + migration orchestration.
2. `go-repository-bun`: strongly typed repository implementations backed by model handlers.
3. App persistence package: dialect selection, DSN resolution, client lifecycle, repository factory.
4. App stores/services: domain contracts consumed by modules and handlers.

## Runtime Configuration Contract

Prefer a typed config with explicit dialect and DSNs:

```yaml
runtime:
  repository_dialect: sqlite # sqlite|postgres

sqlite:
  dsn: file:data/app.sqlite?_busy_timeout=5000&_foreign_keys=on

postgres:
  dsn: postgres://user:pass@localhost:5432/app?sslmode=disable

migrations:
  local_dir: data/sql/migrations
  local_only: false
```

Recommended policy:

1. Default to `sqlite` in local development.
2. Default to `postgres` in production/staging profiles.
3. Require DSN for selected dialect at startup.
4. Do not use legacy application-specific DSN aliases in runtime resolution.

## Hard-Cutover Policy (No Legacy Bridge Code)

For application persistence rollouts, use hard cutover semantics:

1. Do not introduce or keep legacy compatibility bridges in runtime paths (no long-lived alias fallback, no dual-write adapters, no fake transaction wrappers).
2. Legacy snapshot payloads are not a source-of-truth runtime layer; if imported at all, import must be strict, complete, and non-lossy.
3. Any migration logic added for cutover must fail fast on incomplete coverage and must not silently drop sections.
4. Transitional config aliases are removed as part of cutover; no deferred alias-removal window.
5. Completion criteria for a phase require removing temporary compatibility code in the same phase, not deferring cleanup.

## Bootstrap Flow (Canonical)

1. Load and validate runtime config.
2. Resolve dialect (`sqlite|postgres`) from config.
3. Open SQL DB + Bun DB for dialect.
4. Build `persistence.Client`.
5. Register ordered migration sources.
6. Run migrations before constructing app services/modules.
7. Build repositories and domain stores.
8. Inject stores into modules/services.

## Migration Source Strategy

Use source-stable ordered sources and validation targets. The app-local source
should be last.

Typical source order:

1. `go-auth` (if used by app).
2. `go-users` tracks (core/auth/auth_extras as needed).
3. `go-services` (if used by app).
4. `go-notifications` when enabled.
5. `<app>-local` migrations.

Source keys and order values are migration ABI once released. Do not rename keys
or renumber sources without a repair plan.

Canonical service-stack identities:

1. `go-auth`: key `go-auth`, order `10`.
2. `go-users`: key `go-users`, order `20`, depends on `go-auth` when auth is present.
3. `go-services`: key `go-services`, order `30`, depends on `go-users` when users is present.
4. `go-notifications`: key `go-notifications`, order `50`, depends on the nearest present built-in source.
5. `app-local`: key `app-local`, order `100`, depends on `go-notifications` in fresh graphs.

Multiple services app-local sources must use explicit stable keys and sparse
orders through `WithServiceMigrationsStableAppSource(...)`,
`WithServiceMigrationsAppSources(...)`, or `Config.AppMigrations`; those
configured `SourceKey` and `Order` values are persisted as migration identity
and must be set together.

Canonical quickstart user identities:

1. `go-auth`: key `go-auth`, order `10`.
2. `go-users-auth`: key `go-users-auth`, order `20`.
3. `go-users-auth-extras`: key `go-users-auth-extras`, order `30`, depends on `go-users-auth` when present.
4. `go-users`: key `go-users`, order `40`, depends on `go-auth` in combined mode or `go-users-auth-extras` in standalone mode.
5. `go-notifications`: key `go-notifications`, order `50`, depends on the nearest present built-in source.

When adopting notifications into a persisted graph whose last source is order
50 or later, take a database backup and use an explicit permanent suffix order
plus dependency on that last source. Call
`notifications.AdoptAdditiveOrderedMigrationGraph` before migration. Insertion
before a persisted source is rejected, adoption cannot repair drift, and
restore from the backup is the rollback path for forward-only or destructive
migrations.

Dependency edges must only reference source keys present in the selected graph.
Selecting a dependent source directly, such as running only `go-users`, must also
select its predecessor source names.

Existing databases with positional `ord_*` markers must be repaired before
deploying wrappers that generate `ordsrc_*` names. Register the current stable
graph, then run:

```go
err := client.GetMigrations().BackfillStableOrderedMigrationMarkers(
    ctx,
    client.DB(),
    []persistence.OrderedMigrationSource{
        {Name: "go-auth", Root: legacyAuthRoot},
        {Name: "go-users", Root: legacyUsersRoot},
        {Name: "go-services", Root: legacyServicesRoot},
        {Name: "app-local", Root: legacyAppRoot},
    },
)
```

The legacy source list must match the historical positional registration order.
By default the repair inserts source-stable applied markers and keeps legacy
rows; cleanup of old markers is an explicit operator choice in
`go-persistence-bun`.

Required migration options:

1. `WithValidationTargets("postgres", "sqlite")`
2. `WithValidateOnMigrate(true)`
3. A dialect validation contract requiring:
   - mandatory targets: `postgres`, `sqlite`
   - up/down pairs
   - version parity across targets

Focused validation commands:

```bash
go test ./modules/services -run 'Migration|Schema|Backfill' -count=1
go test ./quickstart -run 'Migration|UserMigrations' -count=1
go test ./modules/services ./quickstart -count=1
```

Path resolution guardrails for `migrations.local_dir`:

1. Treat `migrations.local_dir` as app-root relative (`examples/<app>/data/sql/migrations`), not module/store-package relative.
2. When config is loaded from `examples/<app>/config/app.json`, resolve app-local migrations from `config/../<local_dir>` first.
3. Do not prefix `stores/` (or other package directories) when resolving app-local migration roots.
4. Keep an explicit regression test for this resolution behavior so config with `local_dir: data/sql/migrations` cannot drift to `stores/data/sql/migrations`.

## Repository Pattern

Domain contracts stay app-owned. Implement storage adapters with `go-repository-bun`.

Pattern:

1. Define app domain models.
2. Define `ModelHandlers` per model.
3. Create repositories through a central factory.
4. Compose repositories into a domain store object implementing app interfaces.

Keep orchestration code free of SQL specifics:

1. No raw SQL in handlers/services except adapter boundary.
2. No dialect branching outside persistence adapter/bootstrap.
3. No migrations executed from module registration code.

## Suggested Package Layout

```text
internal/persistence/
  bootstrap.go          # dialect + DSN resolution, open db/client
  migrations.go         # ordered source registration
  repository_factory.go # go-repository-bun constructors
  store.go              # domain store implementation
  health.go             # connectivity/schema checks

cmd/migrate/
  main.go               # status|up|down|rollback-all|validate-dialects|validate-fixtures
```

## Minimal Bootstrap Skeleton

```go
type Dialect string

const (
    DialectSQLite   Dialect = "sqlite"
    DialectPostgres Dialect = "postgres"
)

type BootstrapResult struct {
    SQLDB   *sql.DB
    BunDB   *bun.DB
    Client  *persistence.Client
    Dialect Dialect
}

func Bootstrap(ctx context.Context, cfg Config) (*BootstrapResult, error) {
    dialect := resolveDialect(cfg.Runtime.RepositoryDialect)
    dsn := resolveDSN(cfg, dialect)

    sqlDB, bunDB, err := openDialectDB(dsn, dialect)
    if err != nil {
        return nil, err
    }

    client, err := persistence.New(newPersistenceConfig(dialect, dsn), sqlDB, bunDB.Dialect())
    if err != nil {
        return nil, err
    }

    if err := registerOrderedSources(client, cfg.Migrations.LocalDir); err != nil {
        return nil, err
    }
    if err := client.Migrate(ctx); err != nil {
        return nil, err
    }

    return &BootstrapResult{SQLDB: sqlDB, BunDB: bunDB, Client: client, Dialect: dialect}, nil
}
```

## CLI Migration Lifecycle

Standardize command surface:

1. `status`
2. `up`
3. `down`
4. `rollback-all`
5. `validate-dialects`
6. `validate-fixtures`

Use the same ordered migration source registration logic as runtime bootstrap to avoid drift.

## Testing Matrix

Minimum required coverage:

1. Repository parity tests for SQLite and Postgres.
2. Migration validation tests (`validate-dialects` contract).
3. Integration tests proving data survives process restart.
4. Guardrail tests preventing:
   - dialect-specific branching in non-adapter layers
   - legacy migration planner reintroduction
   - direct SQL leakage into handlers/services

## Operational Runbook

1. Local:
   - run `cmd/migrate validate-dialects`
   - run `cmd/migrate up`
   - run app and smoke test
2. CI:
   - run dialect validation
   - run migration lifecycle (`up -> status -> rollback-all -> status`)
   - run fixture validation
3. Deploy:
   - run migrations before app rollout
   - block startup if selected dialect DSN missing

## Revisioned application settings

Use named settings documents for application workflows that require optimistic
concurrency and a shared transaction with domain writes, audit and replay. The
optional `SettingsDocumentAdapter` capability keeps existing `SettingsAdapter`
implementers compatible. `BunSettingsAdapter` implements it and the optional
`TransactionalSettingsDocumentAdapter`/`ContextSettingsAdapter` capabilities.

Install `admin.GetSettingsDocumentMigrationsFS()` through the host's ordered
migration runner. Its portable up/down SQL targets SQLite and PostgreSQL. For
explicit test/bootstrap setup, `admin.EnsureSettingsDocumentSchema(ctx, db)`
installs the same schema. Constructors never install the document table.
`NewBunSettingsAdapterWithConfig` with `SkipSchemaEnsure: true` also suppresses
legacy `admin_settings` startup DDL. The existing constructor retains its legacy
bootstrap behavior. Document and legacy stores are independent; there is no
automatic import or dual write.

```go
adapter, err := admin.NewBunSettingsAdapterWithConfig(db,
    admin.BunSettingsAdapterConfig{
        SkipSchemaEnsure: true,
        DocumentMaxBytes: 16 << 10,
    })
if err != nil { return err }
settings := admin.NewSettingsService()
settings.UseAdapter(adapter)
settings.RegisterDefinition(admin.SettingDefinition{
    Key: "display_name", Type: "string", Default: configuredName,
    AllowedScopes: []admin.SettingsScope{admin.SettingsScopeSite},
    ApplicationManaged: true,
})

// Host service binds the target and authorizes the actor/operation, including
// retries. This example runs after domain validation and replay lookup.
target := admin.SettingsDocumentTarget{
    Namespace: "crm.company", Scope: admin.SettingsScopeSite,
}
err = db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
    snapshot, err := settings.ApplyDocumentTx(ctx, tx,
        admin.SettingsDocumentMutation{
            Target: target, ExpectedRevision: expectedRevision,
            Values: map[string]any{"display_name": requestedName},
        })
    if err != nil { return err }
    // Host operations MUST use this same tx and return errors to roll it back.
    if err := audit.RecordTx(ctx, tx, snapshot.ChangedKeys); err != nil { return err }
    return replay.RecordTx(ctx, tx, snapshot)
})
```

Targets require a namespace and explicit system/site/user scope. User scope also
requires a user ID; other scopes require an empty user ID. Namespaces can represent
sections or other host-bound partitions. Host services own authorization and must
never accept arbitrary targets from an untrusted transport. Definitions apply to
the adapter's documents; use separate adapter/definition registries for different
sets of allowed keys. A single-customer deployment can use named site documents.

`ReadDocument` returns a detached snapshot with revision, stored `Overrides`,
effective `Values`/provenance and `Identity`. It resolves only this document over
registered defaults; it does not implicitly inherit other documents or legacy
bundles. Identity covers target, revision, overrides and effective defaults. JSON
numbers in documents are `json.Number`, preserving exact large integers. Numeric
spellings normalize to plain decimal JSON: `1e2` and `100.00` both become `100`;
negative zero becomes `0`. This applies recursively and to defaults, so equivalent
values preserve identity and no-op revisions across SQLite/PostgreSQL. Hosts
convert them into their domain types without float64 round trips. Changed keys
are sorted and contain no values; the host still allowlists audit metadata.

`DocumentMaxBytes` measures compact canonical override JSON, excluding database
formatting. Exact-limit writes remain readable/editable on both databases.
Exponent expansion counts against that limit and is checked before allocation;
a tiny literal with an enormous exponent is rejected. Reads allow a bounded JSONB
formatting envelope before applying the same canonical size check. Numeric enum,
options and provider comparisons use exact values across supported native types
and `json.Number`; numeric strings stay distinct. Invalid `json.Number` literals
and non-finite floats fail field validation before any settings adapter mutates.

Absent documents read as revision 0. Edits require the expected revision, and
stale edits return `*admin.SettingsRevisionConflict` (structured conflict/409).
`Reset: []string{"display_name"}` removes an override, restoring the configured
default while retaining revision identity. No-op patches preserve revision.
`Touch: true` advances revision even without changed values; use it for related
host domain changes such as loyalty conversion publication in the same transaction.
A no-op still checks/guards the revision through the database write statement.

`ApplyDocument` owns a transaction when no host writes need to participate.
`ApplyDocumentTx` requires a real `bun.Tx`, never commits/rolls it back and emits no
best-effort activity. ANY error requires rollback; a returned snapshot is
provisional until commit. `ReadDocumentWithDB(ctx, tx, target)` joins existing query
transactions. Use an appropriate host transaction isolation level when combining
multiple documents/domain reads into one operation. Database contention/errors and
cancellation propagate; hosts retry entire transactions when the driver requires
it, never just the failed statement inside an aborted transaction.

The document path does not register a generic HTTP route or command. Host typed
commands delegate to host services for permissions, catalogs, domain invariants,
transaction boundaries and idempotency. The legacy bundle route cannot access
named documents. `ApplicationManaged` additionally rejects legacy bundle writes
for registered keys, including direct service/adapter calls. Framework activity
for ordinary legacy saves remains best-effort telemetry, not transactional audit.
Legacy Bun bundles now save atomically; SQLite numeric JSON values are safely
stored/read without changing the existing public model or schema.

Use `SettingsService.ResolveContext`/`ResolveAllContext` for error-aware legacy
reads. They report unsupported capability for third-party adapters that only
implement legacy error-suppressing methods. Existing `Resolve`/`ResolveAll` remain
compatible. Neither legacy method exposes named application documents.

Focused verification: `go test ./admin -run 'Test(SettingsDocuments|SettingsDocumentService|BunSettings)'`.
Set `GOADMIN_SETTINGS_POSTGRES_DSN` to a disposable PostgreSQL database to also
run the same semantics, host rollback, migration and simultaneous-writer tests.
Each PostgreSQL test uses and removes its own isolated schema.

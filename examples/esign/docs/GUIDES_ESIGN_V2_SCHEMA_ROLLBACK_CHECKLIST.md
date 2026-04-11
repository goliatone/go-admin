# E-Sign Track C V2 Schema Rollback Checklist

This checklist is required before enabling Track C schema changes in production.

## Preconditions

1. Staging database snapshot/backup is completed and verified.
2. `examples/esign/release/trackc_contract_guard.json` matches the current contract hash.
3. Migration tests pass:

```sh
"/Users/goliatone/.g/go/bin/go" test ./examples/esign/stores -run 'TestMigrationsApplySeedAndRollbackSQLite|TestV2MigrationBackfillPreservesAuditTerminalOutcomesAndArtifactPointers'
```

## Rollback Rehearsal Steps

1. Apply migrations to staging candidate DB.
2. Seed/restore representative data including:
   - completed agreements,
   - append-only audit history,
   - signature artifact pointers/hashes.
3. Execute contract regression tests:

```sh
"/Users/goliatone/.g/go/bin/go" test ./examples/esign/services ./examples/esign/stores ./examples/esign/modules
```

4. Execute rollback (`RollbackAll` in migration client or operator rollback procedure).
5. Re-run smoke verification against restored schema.
6. Re-apply migrations and re-run verification to confirm repeatability.

## Required Evidence Artifact

Attach one rehearsal artifact in `docs/artifacts/` and link it from release gate docs.

Required fields:

1. Rehearsal date/time and environment.
2. Operator and reviewer names.
3. Backup artifact reference.
4. Commands executed.
5. Pass/fail outcomes with logs.
6. Any deviations and remediation actions.

Current evidence:

- `docs/artifacts/ESIGN_V2_SCHEMA_ROLLBACK_REHEARSAL_2026-02-15.md`

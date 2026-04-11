# E-Sign Backup, Restore, and Rollback Validation

This guide captures validated procedures for metadata backup/restore and migration rollback drills.

## 1) Automated Validation

Run the backend validation tests:

```sh
"/Users/goliatone/.g/go/bin/go" test ./examples/esign/stores -run 'TestMigrationsApplySeedAndRollbackSQLite|TestMigrationsBackupAndRestoreSQLite'
```

Coverage from these tests:
- Core migrations apply cleanly.
- Fixture seed data exists post-migrate.
- Full migration rollback removes migrated tables.
- SQLite backup (`VACUUM INTO`) and restore open correctly with seeded records present.

## 2) Manual Drill Procedure (SQLite)

1. Apply migrations and seed data in a temporary DB.
2. Execute backup:
   - `VACUUM INTO '/path/to/esign_backup.db';`
3. Open backup DB using the same runtime version and validate:
   - expected tables exist (`documents`, `agreements`, `recipients`, etc.)
   - record counts are non-zero for seeded entities.
4. Execute rollback drill in source DB:
   - run rollback-all operation
   - verify migrated tables are removed.

## 3) Exit Criteria

- Backup file is produced and readable.
- Restored DB contains expected schema and records.
- Rollback leaves DB in pre-migration state.
- Drill evidence includes command output, timestamp, and operator initials.

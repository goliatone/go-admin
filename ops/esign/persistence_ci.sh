#!/usr/bin/env bash

set -euo pipefail

mode="${1:-sqlite}"
timeout="${ESIGN_MIGRATE_TIMEOUT:-45s}"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

run_migrate() {
  (cd "${repo_root}" && go run ./examples/esign/cmd/migrate --timeout "${timeout}" "$@")
}

postgres_schema_suffix() {
  printf '%s_%s' "$(date +%s)" "${RANDOM}"
}

create_isolated_postgres_schema() {
  local base_dsn
  local schema_name
  base_dsn="${1:-}"
  schema_name="${2:-}"

  if [[ -z "${base_dsn}" || -z "${schema_name}" ]]; then
    echo "base dsn and schema name are required" >&2
    exit 1
  fi
  if ! command -v psql >/dev/null 2>&1; then
    echo "psql is required for postgres persistence CI checks" >&2
    exit 1
  fi
  PGPASSWORD="" psql "${base_dsn}" -v ON_ERROR_STOP=1 -q -c "SET client_min_messages TO WARNING; CREATE SCHEMA \"${schema_name}\";"
}

drop_isolated_postgres_schema() {
  local base_dsn
  local schema_name
  base_dsn="${1:-}"
  schema_name="${2:-}"

  if [[ -z "${base_dsn}" || -z "${schema_name}" ]]; then
    return 0
  fi
  if ! command -v psql >/dev/null 2>&1; then
    return 0
  fi
  PGPASSWORD="" psql "${base_dsn}" -v ON_ERROR_STOP=1 -q -c "SET client_min_messages TO WARNING; DROP SCHEMA IF EXISTS \"${schema_name}\" CASCADE;" >/dev/null
}

postgres_schema_dsn() {
  local base_dsn
  local schema_name
  base_dsn="${1:-}"
  schema_name="${2:-}"

  if [[ "${base_dsn}" == *"?"* ]]; then
    printf '%s&search_path=%s\n' "${base_dsn}" "${schema_name}"
    return 0
  fi
  printf '%s?search_path=%s\n' "${base_dsn}" "${schema_name}"
}

run_persistence_test() {
  local pattern
  local output
  pattern="${1:-}"
  if [[ -z "${pattern}" ]]; then
    echo "test pattern is required" >&2
    exit 1
  fi
  output="$(cd "${repo_root}" && go test -count=1 -v ./examples/esign/internal/persistence -run "${pattern}" 2>&1)"
  echo "${output}"
  if grep -q "no tests to run" <<<"${output}"; then
    echo "expected restart persistence test to run, but go test reported no tests to run for pattern: ${pattern}" >&2
    exit 1
  fi
}

run_persistence_package() {
  local output
  output="$(cd "${repo_root}" && go test -count=1 -v ./examples/esign/internal/persistence/... 2>&1)"
  echo "${output}"
}

run_sqlite_checks() {
  local db_path
  local sqlite_dsn

  db_path="${TMPDIR:-/tmp}/go-admin-esign-persistence-${RANDOM}.sqlite"
  sqlite_dsn="file:${db_path}?_busy_timeout=5000&_foreign_keys=on"

  export APP_RUNTIME__PROFILE=development
  export APP_RUNTIME__REPOSITORY_DIALECT=sqlite
  export APP_PERSISTENCE__SQLITE__DSN="${sqlite_dsn}"
  export APP_PERSISTENCE__POSTGRES__DSN=""
  export APP_SQLITE__DSN=""
  export APP_POSTGRES__DSN=""

  echo "[persistence-ci] sqlite: validate local dev flow"
  run_persistence_test 'TestPhase8RestartPersistenceSQLiteSurvivesRestart'

  echo "[persistence-ci] sqlite: migration contract gates"
  run_migrate validate-dialects
  run_migrate validate-fixtures

  echo "[persistence-ci] sqlite: up -> status"
  run_migrate up
  run_migrate status
}

run_postgres_checks() {
  local dsn
  local cli_schema
  local cli_dsn

  dsn="${ESIGN_CI_POSTGRES_DSN:-}"
  if [[ -z "${dsn}" ]]; then
    echo "ESIGN_CI_POSTGRES_DSN is required for postgres mode" >&2
    exit 1
  fi

  export APP_RUNTIME__PROFILE=production
  export APP_RUNTIME__REPOSITORY_DIALECT=postgres
  export APP_PERSISTENCE__POSTGRES__DSN="${dsn}"
  export APP_PERSISTENCE__SQLITE__DSN=""
  export APP_SQLITE__DSN=""
  export APP_POSTGRES__DSN=""

  echo "[persistence-ci] postgres: validate staging/prod-like flow"
  export ESIGN_TEST_POSTGRES_DSN="${dsn}"
  run_persistence_test 'TestPhase8RestartPersistencePostgresSurvivesRestartWhenDSNProvided'

  cli_schema="esign_persistence_ci_$(postgres_schema_suffix)"
  create_isolated_postgres_schema "${dsn}" "${cli_schema}"
  trap "drop_isolated_postgres_schema '${dsn}' '${cli_schema}'" RETURN
  cli_dsn="$(postgres_schema_dsn "${dsn}" "${cli_schema}")"
  export APP_PERSISTENCE__POSTGRES__DSN="${cli_dsn}"

  echo "[persistence-ci] postgres: migration contract gates"
  run_migrate validate-dialects
  run_migrate validate-fixtures

  echo "[persistence-ci] postgres: clean bootstrap up -> status"
  run_migrate up
  run_migrate status

  echo "[persistence-ci] postgres: full persistence behavior suite"
  run_persistence_package
}

case "${mode}" in
  sqlite)
    run_sqlite_checks
    ;;
  postgres)
    run_postgres_checks
    ;;
  all)
    run_sqlite_checks
    run_postgres_checks
    ;;
  *)
    echo "usage: $0 [sqlite|postgres|all]" >&2
    exit 2
    ;;
esac

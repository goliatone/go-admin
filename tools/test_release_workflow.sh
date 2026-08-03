#!/bin/bash

# shellcheck disable=SC2034,SC2329

set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
fixture_root=$(mktemp -d "${TMPDIR:-/tmp}/go-admin-release-test.XXXXXX")

function cleanup {
    if [ -n "${fixture_root}" ] && [ -d "${fixture_root}" ]; then
        rm -rf "${fixture_root}"
    fi
}
trap cleanup EXIT

# shellcheck disable=SC1091
source "${repo_root}/taskfile"

function assert_file_content {
    local path=$1
    local expected=$2
    local actual

    actual=$(cat "${path}")
    if [ "${actual}" != "${expected}" ]; then
        echo "unexpected content in ${path}: expected ${expected}, got ${actual}" >&2
        return 1
    fi
}

function test_go_quality_cache_stays_outside_repository {
    (
        unset GOCACHE GOTMPDIR
        GO_QUALITY_GOCACHE=""
        GO_QUALITY_GOTMPDIR=""

        _go:quality:prepare_env

        case "${GOCACHE}" in
            "${repo_root}"|"${repo_root}"/*)
                echo "default Go build cache must be outside the repository: ${GOCACHE}" >&2
                return 1
                ;;
        esac
        case "${GOTMPDIR}" in
            "${repo_root}"|"${repo_root}"/*)
                echo "default Go build temp directory must be outside the repository: ${GOTMPDIR}" >&2
                return 1
                ;;
        esac
    )
}

function test_module_discovery {
    local module_fixture="${fixture_root}/module-discovery"
    local modules

    mkdir -p "${module_fixture}/quickstart" "${module_fixture}/examples"
    : > "${module_fixture}/quickstart/go.mod"
    : > "${module_fixture}/examples/go.mod"

    modules=$(cd "${module_fixture}" && _go:module_dirs)
    if [ "${modules}" != $'.\nquickstart\nexamples' ]; then
        echo "unexpected workspace module order: ${modules}" >&2
        return 1
    fi
}

function test_repository_module_boundaries {
    local forbidden_imports

    if grep -q 'github.com/goliatone/go-admin/quickstart' "${repo_root}/go.mod"; then
        echo "published root module must not require quickstart" >&2
        return 1
    fi
    grep -q '^replace github.com/goliatone/go-admin => \.\.$' "${repo_root}/examples/go.mod"
    grep -q '^replace github.com/goliatone/go-admin/quickstart => ../quickstart$' "${repo_root}/examples/go.mod"
    grep -q '^[[:space:]]*\./examples$' "${repo_root}/go.work"

    forbidden_imports=$(
        find "${repo_root}" \
            \( -type d \( \
                -path "${repo_root}/examples" -o \
                -name .git -o \
                -name .ctx -o \
                -name .tmp -o \
                -name node_modules \
            \) \) -prune -o \
            -type f -name '*.go' \
            -exec grep -Hn 'github\.com/goliatone/go-admin/examples' {} + || true
    )
    if [ -n "${forbidden_imports}" ]; then
        echo "published root and quickstart packages must not import the examples module:" >&2
        echo "${forbidden_imports}" >&2
        return 1
    fi
}

function test_real_quickstart_sync {
    local snapshot_dir="${fixture_root}/real-quickstart-sync"
    local path

    mkdir -p "${snapshot_dir}/quickstart"
    for path in go.mod go.sum quickstart/go.mod quickstart/go.sum; do
        cp "${repo_root}/${path}" "${snapshot_dir}/${path}"
    done

    (cd "${repo_root}" && quickstart:sync:check 0.999.0)

    for path in go.mod go.sum quickstart/go.mod quickstart/go.sum; do
        if ! cmp -s "${repo_root}/${path}" "${snapshot_dir}/${path}"; then
            echo "quickstart sync check did not restore ${path}" >&2
            return 1
        fi
    done
}

function test_quickstart_sync_without_published_tag {
    local sync_fixture="${fixture_root}/quickstart-sync"

    mkdir -p "${sync_fixture}/quickstart"
    printf '%s\n' \
        'module github.com/goliatone/go-admin' \
        '' \
        'go 1.26.5' > "${sync_fixture}/go.mod"
    printf '%s\n' \
        'package admin' \
        '' \
        'const Name = "admin"' > "${sync_fixture}/admin.go"
    printf '%s\n' \
        'module github.com/goliatone/go-admin/quickstart' \
        '' \
        'go 1.26.5' \
        '' \
        'require github.com/goliatone/go-admin v0.121.2' > "${sync_fixture}/quickstart/go.mod"
    printf '%s\n' \
        'package quickstart' \
        '' \
        'import root "github.com/goliatone/go-admin"' \
        '' \
        'const RootName = root.Name' > "${sync_fixture}/quickstart/quickstart.go"

    (cd "${sync_fixture}" && quickstart:sync 0.999.0)

    if ! grep -q 'github.com/goliatone/go-admin v0.999.0' "${sync_fixture}/quickstart/go.mod"; then
        echo "quickstart requirement was not advanced" >&2
        return 1
    fi
    if grep -Eq '^[[:space:]]*replace[[:space:]]+github\.com/goliatone/go-admin([[:space:]]|$)' "${sync_fixture}/quickstart/go.mod"; then
        echo "temporary quickstart replacement leaked into publishable metadata" >&2
        return 1
    fi
    if grep -q 'github.com/goliatone/go-admin/quickstart' "${sync_fixture}/go.mod"; then
        echo "root module acquired a quickstart dependency" >&2
        return 1
    fi
}

function test_examples_sync_tracks_coordinated_version {
    local sync_fixture="${fixture_root}/examples-sync"

    mkdir -p "${sync_fixture}/quickstart" "${sync_fixture}/examples"
    printf '%s\n' \
        'module github.com/goliatone/go-admin' \
        '' \
        'go 1.26.5' > "${sync_fixture}/go.mod"
    printf '%s\n' 'package admin' '' 'const Name = "admin"' > "${sync_fixture}/admin.go"
    printf '%s\n' \
        'module github.com/goliatone/go-admin/quickstart' \
        '' \
        'go 1.26.5' \
        '' \
        'require github.com/goliatone/go-admin v0.121.2' > "${sync_fixture}/quickstart/go.mod"
    printf '%s\n' \
        'package quickstart' \
        '' \
        'import root "github.com/goliatone/go-admin"' \
        '' \
        'const Name = root.Name' > "${sync_fixture}/quickstart/quickstart.go"
    printf '%s\n' \
        'module github.com/goliatone/go-admin/examples' \
        '' \
        'go 1.26.5' \
        '' \
        'require (' \
        '    github.com/goliatone/go-admin v0.121.2' \
        '    github.com/goliatone/go-admin/quickstart v0.121.2' \
        ')' \
        '' \
        'replace github.com/goliatone/go-admin => ..' \
        '' \
        'replace github.com/goliatone/go-admin/quickstart => ../quickstart' > "${sync_fixture}/examples/go.mod"
    printf '%s\n' \
        'package examples' \
        '' \
        'import (' \
        '    root "github.com/goliatone/go-admin"' \
        '    "github.com/goliatone/go-admin/quickstart"' \
        ')' \
        '' \
        'const Name = root.Name + quickstart.Name' > "${sync_fixture}/examples/example.go"

    (cd "${sync_fixture}" && examples:sync 0.999.0)

    grep -q 'github.com/goliatone/go-admin v0.999.0' "${sync_fixture}/examples/go.mod"
    grep -q 'github.com/goliatone/go-admin/quickstart v0.999.0' "${sync_fixture}/examples/go.mod"
    grep -q '^replace github.com/goliatone/go-admin => \.\.$' "${sync_fixture}/examples/go.mod"
    grep -q '^replace github.com/goliatone/go-admin/quickstart => ../quickstart$' "${sync_fixture}/examples/go.mod"
}

function test_quickstart_sync_runs_tests {
    local sync_fixture="${fixture_root}/quickstart-sync-test-failure"
    local status

    mkdir -p "${sync_fixture}/quickstart"
    printf '%s\n' \
        'module github.com/goliatone/go-admin' \
        '' \
        'go 1.26.5' > "${sync_fixture}/go.mod"
    printf '%s\n' \
        'package admin' \
        '' \
        'const Name = "admin"' > "${sync_fixture}/admin.go"
    printf '%s\n' \
        'module github.com/goliatone/go-admin/quickstart' \
        '' \
        'go 1.26.5' \
        '' \
        'require github.com/goliatone/go-admin v0.121.2' > "${sync_fixture}/quickstart/go.mod"
    printf '%s\n' \
        'package quickstart' \
        '' \
        'import root "github.com/goliatone/go-admin"' \
        '' \
        'const RootName = root.Name' > "${sync_fixture}/quickstart/quickstart.go"
    printf '%s\n' \
        'package quickstart' \
        '' \
        'import "testing"' \
        '' \
        'func TestReleaseGate(t *testing.T) { t.Fatal("release test gate") }' > "${sync_fixture}/quickstart/release_gate_test.go"

    (cd "${sync_fixture}" && quickstart:sync 0.999.0) \
        > "${sync_fixture}/expected-test-failure.log" 2>&1 && status=0 || status=$?
    if [ "${status}" -eq 0 ]; then
        echo "quickstart sync ignored a failing package test" >&2
        return 1
    fi
}

function test_quickstart_sync_check_restores_after_interruption {
    local sync_fixture="${fixture_root}/quickstart-sync-interrupted"
    local status

    mkdir -p "${sync_fixture}/quickstart"
    printf '%s\n' 'root mod' > "${sync_fixture}/go.mod"
    printf '%s\n' 'root sum' > "${sync_fixture}/go.sum"
    printf '%s\n' 'quickstart mod' > "${sync_fixture}/quickstart/go.mod"
    printf '%s\n' 'quickstart sum' > "${sync_fixture}/quickstart/go.sum"

    (
        cd "${sync_fixture}" || exit 1
        function quickstart:sync {
            printf '%s\n' 'changed root mod' > go.mod
            printf '%s\n' 'changed quickstart mod' > quickstart/go.mod
            /bin/sh -c 'kill -TERM "$PPID"'
        }
        quickstart:sync:check 0.999.0
    ) && status=0 || status=$?

    if [ "${status}" -ne 143 ]; then
        echo "interrupted quickstart sync returned unexpected status: ${status}" >&2
        return 1
    fi
    assert_file_content "${sync_fixture}/go.mod" 'root mod'
    assert_file_content "${sync_fixture}/go.sum" 'root sum'
    assert_file_content "${sync_fixture}/quickstart/go.mod" 'quickstart mod'
    assert_file_content "${sync_fixture}/quickstart/go.sum" 'quickstart sum'
}

function test_release_client_preflight_accepts_supported_node_versions {
    local candidate
    local status

    for candidate in 22.12.0 26.5.0 99.0.0; do
        (
            function command { return 0; }
            function node { printf 'v%s\n' "${candidate}"; }
            function npm { printf '%s\n' 11.17.0; }
            function gh { return 0; }
            release:client:preflight
        ) || {
            echo "browser release rejected supported Node v${candidate}" >&2
            return 1
        }
    done

    for candidate in 22.11.99 21.99.99 invalid; do
        (
            function command { return 0; }
            function node { printf 'v%s\n' "${candidate}"; }
            function npm { printf '%s\n' 11.17.0; }
            function gh { return 0; }
            release:client:preflight
        ) >/dev/null 2>&1 && status=0 || status=$?
        if [ "${status}" -eq 0 ]; then
            echo "browser release accepted unsupported Node v${candidate}" >&2
            return 1
        fi
    done
}

function test_transaction_rollback {
    local transaction_fixture="${fixture_root}/transaction"
    local git_log="${fixture_root}/git.log"
    local status

    mkdir -p "${transaction_fixture}/quickstart" "${transaction_fixture}/examples" "${transaction_fixture}/pkg/client/assets"
    printf '%s\n' '0.121.2' > "${transaction_fixture}/.version"
    printf '%s\n' 'old changelog' > "${transaction_fixture}/CHANGELOG.md"
    printf '%s\n' 'old root mod' > "${transaction_fixture}/go.mod"
    printf '%s\n' 'old root sum' > "${transaction_fixture}/go.sum"
    printf '%s\n' 'old quickstart mod' > "${transaction_fixture}/quickstart/go.mod"
    printf '%s\n' 'old quickstart sum' > "${transaction_fixture}/quickstart/go.sum"
    printf '%s\n' 'old examples mod' > "${transaction_fixture}/examples/go.mod"
    printf '%s\n' 'old examples sum' > "${transaction_fixture}/examples/go.sum"
    printf '%s\n' 'old client package' > "${transaction_fixture}/pkg/client/assets/package.json"
    printf '%s\n' 'old client lock' > "${transaction_fixture}/pkg/client/assets/package-lock.json"
    printf '%s\n' 'manual notes' > "${transaction_fixture}/.release-notes.md"

    (
        cd "${transaction_fixture}" || exit 1
        VERSION_FILE=.version
        release_notes_file=.release-notes.md
        release_state_dir="${fixture_root}/transaction-state"
        release_original_head=original-head
        release_commit_created=1
        release_root_tag_created=1
        release_quickstart_tag_created=1
        release_tag=v9.9.9
        quickstart_tag=quickstart/v9.9.9
        mkdir -p "${release_state_dir}"
        release:transaction:backup "${release_state_dir}" "${release_notes_file}"

        function git {
            printf '%s\n' "$*" >> "${git_log}"
            return 0
        }

        trap 'release:transaction:finish "$?"' EXIT
        printf '%s\n' '9.9.9' > .version
        printf '%s\n' 'new changelog' > CHANGELOG.md
        printf '%s\n' 'new root mod' > go.mod
        printf '%s\n' 'new root sum' > go.sum
        printf '%s\n' 'new quickstart mod' > quickstart/go.mod
        printf '%s\n' 'new quickstart sum' > quickstart/go.sum
        printf '%s\n' 'new examples mod' > examples/go.mod
        printf '%s\n' 'new examples sum' > examples/go.sum
        printf '%s\n' 'new client package' > pkg/client/assets/package.json
        printf '%s\n' 'new client lock' > pkg/client/assets/package-lock.json
        rm -f .release-notes.md
        exit 23
    ) && status=0 || status=$?

    if [ "${status}" -ne 23 ]; then
        echo "rollback changed the original failure status: ${status}" >&2
        return 1
    fi

    assert_file_content "${transaction_fixture}/.version" '0.121.2'
    assert_file_content "${transaction_fixture}/CHANGELOG.md" 'old changelog'
    assert_file_content "${transaction_fixture}/go.mod" 'old root mod'
    assert_file_content "${transaction_fixture}/go.sum" 'old root sum'
    assert_file_content "${transaction_fixture}/quickstart/go.mod" 'old quickstart mod'
    assert_file_content "${transaction_fixture}/quickstart/go.sum" 'old quickstart sum'
    assert_file_content "${transaction_fixture}/examples/go.mod" 'old examples mod'
    assert_file_content "${transaction_fixture}/examples/go.sum" 'old examples sum'
    assert_file_content "${transaction_fixture}/pkg/client/assets/package.json" 'old client package'
    assert_file_content "${transaction_fixture}/pkg/client/assets/package-lock.json" 'old client lock'
    assert_file_content "${transaction_fixture}/.release-notes.md" 'manual notes'

    grep -q '^tag -d quickstart/v9.9.9$' "${git_log}"
    grep -q '^tag -d v9.9.9$' "${git_log}"
    grep -q '^reset --mixed original-head$' "${git_log}"

    if [ -d "${fixture_root}/transaction-state" ]; then
        echo "release transaction state directory was not cleaned" >&2
        return 1
    fi
}

function test_release_client_prepare_uses_tagged_source {
    local tagged_source="${fixture_root}/tagged-client-source"
    local current_source="${fixture_root}/current-client-source"
    local destination="${fixture_root}/tagged-client-assets"
    local resolved_destination
    local prepare_log="${fixture_root}/tagged-client-prepare.log"
    local commit=0123456789abcdef0123456789abcdef01234567

    mkdir -p "${tagged_source}/pkg/client/assets/scripts" "${current_source}" "${destination}"
    resolved_destination=$(cd "${destination}" && pwd -P)
    printf '%s\n' 'tagged' > "${tagged_source}/source-marker"
    printf '%s\n' '{}' > "${tagged_source}/pkg/client/assets/package-lock.json"
    printf '%s\n' 'export {}' > "${tagged_source}/pkg/client/assets/scripts/prepare-release-assets.mjs"
    printf '%s\n' 'current' > "${current_source}/source-marker"

    (
        cd "${current_source}" || exit 1
        function git {
            local arg
            local output
            case "${1:-}" in
                rev-list)
                    printf '%s\n' "${commit}"
                    return 0
                ;;
                archive)
                    for arg in "$@"; do
                        case "${arg}" in
                            --output=*) output=${arg#--output=} ;;
                        esac
                    done
                    [ -n "${output:-}" ] || return 1
                    tar -cf "${output}" -C "${tagged_source}" .
                    return $?
                ;;
            esac
            return 1
        }
        function npm {
            [ "${PWD}" != "${current_source}/pkg/client/assets" ]
            [ -f "${PWD}/../../../source-marker" ]
            [ "$(cat "${PWD}/../../../source-marker")" = tagged ]
            [ "$*" = 'ci --ignore-scripts' ]
        }
        function release:client:prepare {
            [ "$(cat source-marker)" = tagged ]
            [ "${1}" = 1.2.3 ]
            [ "${2}" = "${destination}" ]
            [ "${3}" = "${commit}" ]
            printf '%s\n' "$*" > "${prepare_log}"
            : > "${destination}/client.tgz"
        }

        release:client:prepare_tag v1.2.3 "${destination}"
    )

    assert_file_content "${prepare_log}" "1.2.3 ${resolved_destination} ${commit}"
    [ -f "${destination}/client.tgz" ]
}

function test_release_client_prepare_rejects_tag_skew {
    local destination="${fixture_root}/skewed-client-assets"
    local npm_log="${fixture_root}/skewed-client-npm.log"
    local status

    mkdir -p "${destination}"
    (
        function git {
            case "${4:-}" in
                quickstart/*) printf '%s\n' fedcba9876543210fedcba9876543210fedcba98 ;;
                *) printf '%s\n' 0123456789abcdef0123456789abcdef01234567 ;;
            esac
        }
        function npm {
            : > "${npm_log}"
        }
        release:client:prepare_tag v1.2.3 "${destination}"
    ) >/dev/null 2>&1 && status=0 || status=$?

    if [ "${status}" -eq 0 ]; then
        echo "browser release accepted skewed root and quickstart tags" >&2
        return 1
    fi
    if [ -e "${npm_log}" ]; then
        echo "browser release installed dependencies after detecting tag skew" >&2
        return 1
    fi
}

function test_postpush_asset_failure_preserves_release {
    local state_dir="${fixture_root}/postpush-state"
    local operation_log="${fixture_root}/postpush-operations.log"
    local error_log="${fixture_root}/postpush-error.log"
    local status

    mkdir -p "${state_dir}"
    (
        release_state_dir="${state_dir}"
        release_original_head=release-head
        release_notes_file=.release-notes.md
        release_remote_published=1
        release_root_tag_created=1
        release_quickstart_tag_created=1
        release_tag=v1.2.3
        quickstart_tag=quickstart/v1.2.3
        function git { printf 'git %s\n' "$*" >> "${operation_log}"; }
        function release:transaction:restore { printf '%s\n' restore >> "${operation_log}"; }
        release:transaction:finish 37
    ) 2> "${error_log}" && status=0 || status=$?

    if [ "${status}" -ne 37 ]; then
        echo "post-push asset failure changed the original status: ${status}" >&2
        return 1
    fi
    if [ -e "${operation_log}" ]; then
        echo "post-push asset failure attempted to roll back a published release" >&2
        return 1
    fi
    if [ -d "${state_dir}" ]; then
        echo "post-push asset failure did not clean its local snapshot" >&2
        return 1
    fi
    grep -q './taskfile release:client:publish v1.2.3' "${error_log}"
}

function test_failed_restore_preserves_snapshot {
    local state_dir="${fixture_root}/failed-restore-state"
    local error_log="${fixture_root}/failed-restore.log"
    local status

    mkdir -p "${state_dir}"
    (
        release_state_dir="${state_dir}"
        release_original_head=original-head
        release_notes_file=.release-notes.md
        release_root_tag_created=0
        release_quickstart_tag_created=0

        function git {
            return 0
        }
        function release:transaction:restore {
            return 1
        }

        trap 'release:transaction:finish "$?"' EXIT
        exit 29
    ) 2> "${error_log}" && status=0 || status=$?

    if [ "${status}" -ne 29 ]; then
        echo "failed restoration changed the original status: ${status}" >&2
        return 1
    fi
    if [ ! -d "${state_dir}" ]; then
        echo "failed restoration deleted its recovery snapshot" >&2
        return 1
    fi
    grep -q "Recovery snapshot preserved at: ${state_dir}" "${error_log}"
}

function test_release_ignores_untracked_input {
    local git_log="${fixture_root}/untracked-preflight-git.log"

    function git {
        printf '%s\n' "$*" >> "${git_log}"
        case "${1:-}" in
            status)
                return 0
            ;;
            ls-files)
                printf 'scratch.go\0'
                return 97
            ;;
        esac
        return 1
    }

    release:worktree:assert_clean
    if grep -q '^ls-files' "${git_log}"; then
        echo "release preflight inspected untracked input" >&2
        return 1
    fi
}

function test_release_rejects_tracked_input {
    local status

    function git {
        case "${1:-}" in
            status)
                if [ "${2:-}" = "--porcelain" ]; then
                    printf ' M go.mod\n'
                fi
                return 0
            ;;
        esac
        return 1
    }

    release:worktree:assert_clean && status=0 || status=$?
    if [ "${status}" -eq 0 ]; then
        echo "release preflight accepted tracked input" >&2
        return 1
    fi
}

function test_release_rejects_tag_skew {
    local mode
    local status

    for mode in version commit; do
        function git {
            case "${1:-}" in
                tag)
                    if [ "${2:-}" = "--list" ]; then
                        case "${3:-}" in
                            quickstart/*)
                                if [ "${mode}" = version ]; then
                                    printf '%s\n' 'quickstart/v0.121.1'
                                else
                                    printf '%s\n' 'quickstart/v0.121.2'
                                fi
                            ;;
                            *) printf '%s\n' 'v0.121.2' ;;
                        esac
                    fi
                    return 0
                ;;
                rev-list)
                    case "${4:-}" in
                        quickstart/*) printf '%s\n' 'quickstart-commit' ;;
                        *) printf '%s\n' 'root-commit' ;;
                    esac
                    return 0
                ;;
            esac
            return 1
        }

        release:tags:assert_aligned && status=0 || status=$?
        if [ "${status}" -eq 0 ]; then
            echo "release accepted ${mode} skew between coordinated tags" >&2
            return 1
        fi
    done
}

function test_release_failure_end_to_end {
    local release_fixture="${fixture_root}/release-e2e"
    local git_log="${fixture_root}/release-git.log"
    local status

    mkdir -p "${release_fixture}/quickstart" "${release_fixture}/examples"
    printf '%s\n' '0.121.2' > "${release_fixture}/.version"
    printf '%s\n' 'old changelog' > "${release_fixture}/CHANGELOG.md"
    printf '%s\n' 'manual notes' > "${release_fixture}/.release-notes.md"
    printf '%s\n' \
        'module github.com/goliatone/go-admin' \
        '' \
        'go 1.26.5' > "${release_fixture}/go.mod"
    printf '%s\n' \
        'package admin' \
        '' \
        'const Name = "admin"' > "${release_fixture}/admin.go"
    printf '%s\n' \
        'module github.com/goliatone/go-admin/quickstart' \
        '' \
        'go 1.26.5' \
        '' \
        'require github.com/goliatone/go-admin v0.121.2' > "${release_fixture}/quickstart/go.mod"
    printf '%s\n' \
        'package quickstart' \
        '' \
        'import root "github.com/goliatone/go-admin"' \
        '' \
        'const RootName = root.Name' > "${release_fixture}/quickstart/quickstart.go"
    printf '%s\n' \
        'module github.com/goliatone/go-admin/examples' \
        '' \
        'go 1.26.5' \
        '' \
        'require (' \
        '    github.com/goliatone/go-admin v0.121.2' \
        '    github.com/goliatone/go-admin/quickstart v0.121.2' \
        ')' \
        '' \
        'replace github.com/goliatone/go-admin => ..' \
        '' \
        'replace github.com/goliatone/go-admin/quickstart => ../quickstart' > "${release_fixture}/examples/go.mod"
    printf '%s\n' \
        'package examples' \
        '' \
        'import (' \
        '    root "github.com/goliatone/go-admin"' \
        '    "github.com/goliatone/go-admin/quickstart"' \
        ')' \
        '' \
        'const Name = root.Name + quickstart.RootName' > "${release_fixture}/examples/example.go"

    (
        cd "${release_fixture}" || exit 1
        VERSION_FILE=.version

        function git {
            local previous=""
            local arg

            printf '%s\n' "$*" >> "${git_log}"
            case "${1:-}" in
                status|fetch|pull|add|commit)
                    return 0
                ;;
                rev-parse)
                    if [ "${2:-}" = "HEAD" ]; then
                        printf '%s\n' 'original-head'
                        return 0
                    fi
                    return 1
                ;;
                symbolic-ref)
                    printf '%s\n' 'main'
                    return 0
                ;;
                ls-files)
                    if [ "${2:-}" = "--others" ]; then
                        return 0
                    fi
                    return 1
                ;;
                rev-list)
                    printf '%s\n' 'release-commit'
                    return 0
                ;;
                cliff)
                    for arg in "$@"; do
                        if [ "${previous}" = "--output" ]; then
                            printf '%s\n' 'generated changelog' > "${arg}"
                        fi
                        previous=${arg}
                    done
                    return 0
                ;;
                tag)
                    if [ "${2:-}" = "--list" ]; then
                        case "${3:-}" in
                            quickstart/*) printf '%s\n' 'quickstart/v0.121.2' ;;
                            *) printf '%s\n' 'v0.121.2' ;;
                        esac
                    fi
                    return 0
                ;;
                push)
                    return 71
                ;;
                reset)
                    return 0
                ;;
            esac
            echo "unexpected git invocation: $*" >&2
            return 1
        }

        release patch
    ) && status=0 || status=$?

    if [ "${status}" -ne 1 ]; then
        echo "release failure returned unexpected status: ${status}" >&2
        return 1
    fi

    assert_file_content "${release_fixture}/.version" '0.121.2'
    assert_file_content "${release_fixture}/CHANGELOG.md" 'old changelog'
    assert_file_content "${release_fixture}/.release-notes.md" 'manual notes'
    if ! grep -q 'github.com/goliatone/go-admin v0.121.2' "${release_fixture}/quickstart/go.mod"; then
        echo "failed release did not restore the quickstart requirement" >&2
        return 1
    fi
    if grep -Eq '^[[:space:]]*replace[[:space:]]+github\.com/goliatone/go-admin([[:space:]]|$)' "${release_fixture}/quickstart/go.mod"; then
        echo "failed release left a quickstart replacement" >&2
        return 1
    fi
    grep -q 'github.com/goliatone/go-admin v0.121.2' "${release_fixture}/examples/go.mod"
    grep -q 'github.com/goliatone/go-admin/quickstart v0.121.2' "${release_fixture}/examples/go.mod"

    grep -q '^push --atomic origin HEAD:main refs/tags/v0.121.3 refs/tags/quickstart/v0.121.3$' "${git_log}"
    grep -q '^tag -d quickstart/v0.121.3$' "${git_log}"
    grep -q '^tag -d v0.121.3$' "${git_log}"
    grep -q '^reset --mixed original-head$' "${git_log}"
}

function test_release_commit_failure_restores_index {
    local release_fixture="${fixture_root}/release-commit-failure"
    local git_log="${fixture_root}/release-commit-failure-git.log"
    local index_state="${fixture_root}/release-commit-failure-index"
    local status

    mkdir -p "${release_fixture}/quickstart"
    printf '%s\n' '0.121.2' > "${release_fixture}/.version"
    printf '%s\n' 'old changelog' > "${release_fixture}/CHANGELOG.md"
    printf '%s\n' 'manual notes' > "${release_fixture}/.release-notes.md"
    printf '%s\n' \
        'module github.com/goliatone/go-admin' \
        '' \
        'go 1.26.5' > "${release_fixture}/go.mod"
    printf '%s\n' \
        'package admin' \
        '' \
        'const Name = "admin"' > "${release_fixture}/admin.go"
    printf '%s\n' \
        'module github.com/goliatone/go-admin/quickstart' \
        '' \
        'go 1.26.5' \
        '' \
        'require github.com/goliatone/go-admin v0.121.2' > "${release_fixture}/quickstart/go.mod"
    printf '%s\n' \
        'package quickstart' \
        '' \
        'import root "github.com/goliatone/go-admin"' \
        '' \
        'const RootName = root.Name' > "${release_fixture}/quickstart/quickstart.go"
    printf '%s\n' 'clean' > "${index_state}"

    (
        cd "${release_fixture}" || exit 1
        VERSION_FILE=.version

        function git {
            local previous=""
            local arg

            printf '%s\n' "$*" >> "${git_log}"
            case "${1:-}" in
                status|fetch|pull)
                    return 0
                ;;
                symbolic-ref)
                    printf '%s\n' 'main'
                    return 0
                ;;
                ls-files)
                    if [ "${2:-}" = "--others" ]; then
                        return 0
                    fi
                    return 1
                ;;
                tag)
                    if [ "${2:-}" = "--list" ]; then
                        case "${3:-}" in
                            quickstart/*) printf '%s\n' 'quickstart/v0.121.2' ;;
                            *) printf '%s\n' 'v0.121.2' ;;
                        esac
                    fi
                    return 0
                ;;
                rev-list)
                    printf '%s\n' 'release-commit'
                    return 0
                ;;
                rev-parse)
                    if [ "${2:-}" = "HEAD" ]; then
                        printf '%s\n' 'original-head'
                        return 0
                    fi
                    return 1
                ;;
                cliff)
                    for arg in "$@"; do
                        if [ "${previous}" = "--output" ]; then
                            printf '%s\n' 'generated changelog' > "${arg}"
                        fi
                        previous=${arg}
                    done
                    return 0
                ;;
                add)
                    printf '%s\n' 'staged' > "${index_state}"
                    return 0
                ;;
                commit)
                    return 77
                ;;
                reset)
                    printf '%s\n' 'clean' > "${index_state}"
                    return 0
                ;;
            esac
            echo "unexpected git invocation: $*" >&2
            return 1
        }

        release patch
    ) && status=0 || status=$?

    if [ "${status}" -ne 1 ]; then
        echo "commit failure returned unexpected status: ${status}" >&2
        return 1
    fi
    assert_file_content "${index_state}" 'clean'
    assert_file_content "${release_fixture}/.version" '0.121.2'
    assert_file_content "${release_fixture}/CHANGELOG.md" 'old changelog'
    assert_file_content "${release_fixture}/.release-notes.md" 'manual notes'
    grep -q '^reset --mixed original-head$' "${git_log}"
}

function test_release_success_end_to_end {
    local release_fixture="${fixture_root}/release-success"
    local git_log="${fixture_root}/release-success-git.log"
    local client_log="${fixture_root}/release-success-client.log"
    local publish_log="${fixture_root}/release-success-publish.log"

    mkdir -p "${release_fixture}/quickstart" "${release_fixture}/examples" "${release_fixture}/pkg/client/assets/scripts"
    printf '%s\n' '0.121.2' > "${release_fixture}/.version"
    printf '%s\n' 'old changelog' > "${release_fixture}/CHANGELOG.md"
    printf '%s\n' 'manual notes' > "${release_fixture}/.release-notes.md"
    printf '%s\n' \
        'module github.com/goliatone/go-admin' \
        '' \
        'go 1.26.5' > "${release_fixture}/go.mod"
    printf '%s\n' \
        'package admin' \
        '' \
        'const Name = "admin"' > "${release_fixture}/admin.go"
    printf '%s\n' \
        'module github.com/goliatone/go-admin/quickstart' \
        '' \
        'go 1.26.5' \
        '' \
        'require github.com/goliatone/go-admin v0.121.2' > "${release_fixture}/quickstart/go.mod"
    printf '%s\n' \
        'package quickstart' \
        '' \
        'import root "github.com/goliatone/go-admin"' \
        '' \
        'const RootName = root.Name' > "${release_fixture}/quickstart/quickstart.go"
    printf '%s\n' \
        'module github.com/goliatone/go-admin/examples' \
        '' \
        'go 1.26.5' \
        '' \
        'require (' \
        '    github.com/goliatone/go-admin v0.121.2' \
        '    github.com/goliatone/go-admin/quickstart v0.121.2' \
        ')' \
        '' \
        'replace github.com/goliatone/go-admin => ..' \
        '' \
        'replace github.com/goliatone/go-admin/quickstart => ../quickstart' > "${release_fixture}/examples/go.mod"
    printf '%s\n' \
        'package examples' \
        '' \
        'import (' \
        '    root "github.com/goliatone/go-admin"' \
        '    "github.com/goliatone/go-admin/quickstart"' \
        ')' \
        '' \
        'const Name = root.Name + quickstart.RootName' > "${release_fixture}/examples/example.go"
    printf '%s\n' '{"name":"@goliatone/go-admin-client","version":"0.121.2"}' > "${release_fixture}/pkg/client/assets/package.json"
    printf '%s\n' '{"name":"@goliatone/go-admin-client","version":"0.121.2","lockfileVersion":3}' > "${release_fixture}/pkg/client/assets/package-lock.json"
    printf '%s\n' 'export {}' > "${release_fixture}/pkg/client/assets/scripts/prepare-release-assets.mjs"

    (
        cd "${release_fixture}" || exit 1
        VERSION_FILE=.version

        function release:client:preflight {
            printf '%s\n' preflight >> "${client_log}"
        }
        function release:client:version:set {
            printf '%s\n' "package=${1}" > pkg/client/assets/package.json
            printf '%s\n' "lock=${1}" > pkg/client/assets/package-lock.json
            printf 'version %s\n' "${1}" >> "${client_log}"
        }
        function release:client:publish {
            printf 'publish %s\n' "${1}" >> "${client_log}"
            printf '%s\n' publish >> "${publish_log}"
        }

        function git {
            local previous=""
            local arg

            printf '%s\n' "$*" >> "${git_log}"
            case "${1:-}" in
                status|fetch|pull|add|commit|reset)
                    return 0
                ;;
                push)
                    printf '%s\n' push >> "${publish_log}"
                    return 0
                ;;
                rev-parse)
                    if [ "${2:-}" = "HEAD" ]; then
                        printf '%s\n' 'original-head'
                        return 0
                    fi
                    return 1
                ;;
                symbolic-ref)
                    printf '%s\n' 'main'
                    return 0
                ;;
                ls-files)
                    if [ "${2:-}" = "--others" ]; then
                        return 0
                    fi
                    return 1
                ;;
                rev-list)
                    printf '%s\n' 'release-commit'
                    return 0
                ;;
                cliff)
                    for arg in "$@"; do
                        if [ "${previous}" = "--output" ]; then
                            printf '%s\n' 'generated changelog' > "${arg}"
                        fi
                        previous=${arg}
                    done
                    return 0
                ;;
                tag)
                    if [ "${2:-}" = "--list" ]; then
                        case "${3:-}" in
                            quickstart/*) printf '%s\n' 'quickstart/v0.121.2' ;;
                            *) printf '%s\n' 'v0.121.2' ;;
                        esac
                    fi
                    return 0
                ;;
            esac
            echo "unexpected git invocation: $*" >&2
            return 1
        }

        release patch
    )

    assert_file_content "${release_fixture}/.version" '0.121.3'
    assert_file_content "${release_fixture}/CHANGELOG.md" 'generated changelog'
    if [ -e "${release_fixture}/.release-notes.md" ]; then
        echo "successful release did not consume manual notes" >&2
        return 1
    fi
    if ! grep -q 'github.com/goliatone/go-admin v0.121.3' "${release_fixture}/quickstart/go.mod"; then
        echo "successful release did not advance quickstart" >&2
        return 1
    fi
    if grep -Eq '^[[:space:]]*replace[[:space:]]+github\.com/goliatone/go-admin([[:space:]]|$)' "${release_fixture}/quickstart/go.mod"; then
        echo "successful release left a quickstart replacement" >&2
        return 1
    fi
    grep -q 'github.com/goliatone/go-admin v0.121.3' "${release_fixture}/examples/go.mod"
    grep -q 'github.com/goliatone/go-admin/quickstart v0.121.3' "${release_fixture}/examples/go.mod"
    assert_file_content "${release_fixture}/pkg/client/assets/package.json" 'package=0.121.3'
    assert_file_content "${release_fixture}/pkg/client/assets/package-lock.json" 'lock=0.121.3'
    grep -q '^preflight$' "${client_log}"
    grep -q '^version 0.121.3$' "${client_log}"
    grep -q '^publish v0.121.3$' "${client_log}"
    assert_file_content "${publish_log}" $'push\npublish'
    grep -q '^add pkg/client/assets/package.json pkg/client/assets/package-lock.json$' "${git_log}"
    grep -q '^push --atomic origin HEAD:main refs/tags/v0.121.3 refs/tags/quickstart/v0.121.3$' "${git_log}"
    if grep -q '^reset --mixed' "${git_log}"; then
        echo "successful release unexpectedly rolled back" >&2
        return 1
    fi
}

test_go_quality_cache_stays_outside_repository
test_module_discovery
test_repository_module_boundaries
test_real_quickstart_sync
test_quickstart_sync_without_published_tag
test_examples_sync_tracks_coordinated_version
test_quickstart_sync_runs_tests
test_quickstart_sync_check_restores_after_interruption
test_release_client_preflight_accepts_supported_node_versions
test_transaction_rollback
test_release_client_prepare_uses_tagged_source
test_release_client_prepare_rejects_tag_skew
test_postpush_asset_failure_preserves_release
test_failed_restore_preserves_snapshot
test_release_ignores_untracked_input
test_release_rejects_tracked_input
test_release_rejects_tag_skew
test_release_failure_end_to_end
test_release_commit_failure_restores_index
test_release_success_end_to_end

echo "release workflow tests passed"

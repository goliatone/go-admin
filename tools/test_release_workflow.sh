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
    if grep -q 'github.com/goliatone/go-admin/quickstart' "${repo_root}/go.mod"; then
        echo "published root module must not require quickstart" >&2
        return 1
    fi
    grep -q '^replace github.com/goliatone/go-admin => \.\.$' "${repo_root}/examples/go.mod"
    grep -q '^replace github.com/goliatone/go-admin/quickstart => ../quickstart$' "${repo_root}/examples/go.mod"
    grep -q '^[[:space:]]*\./examples$' "${repo_root}/go.work"
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

function test_transaction_rollback {
    local transaction_fixture="${fixture_root}/transaction"
    local git_log="${fixture_root}/git.log"
    local status

    mkdir -p "${transaction_fixture}/quickstart"
    printf '%s\n' '0.121.2' > "${transaction_fixture}/.version"
    printf '%s\n' 'old changelog' > "${transaction_fixture}/CHANGELOG.md"
    printf '%s\n' 'old root mod' > "${transaction_fixture}/go.mod"
    printf '%s\n' 'old root sum' > "${transaction_fixture}/go.sum"
    printf '%s\n' 'old quickstart mod' > "${transaction_fixture}/quickstart/go.mod"
    printf '%s\n' 'old quickstart sum' > "${transaction_fixture}/quickstart/go.sum"
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
    assert_file_content "${transaction_fixture}/.release-notes.md" 'manual notes'

    grep -q '^tag -d quickstart/v9.9.9$' "${git_log}"
    grep -q '^tag -d v9.9.9$' "${git_log}"
    grep -q '^reset --mixed original-head$' "${git_log}"

    if [ -d "${fixture_root}/transaction-state" ]; then
        echo "release transaction state directory was not cleaned" >&2
        return 1
    fi
}

function test_release_failure_end_to_end {
    local release_fixture="${fixture_root}/release-e2e"
    local git_log="${fixture_root}/release-git.log"
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
                tag)
                    if [ "${2:-}" = "--list" ]; then
                        printf '%s\n' 'v0.121.2'
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

    grep -q '^push --atomic origin HEAD:main refs/tags/v0.121.3 refs/tags/quickstart/v0.121.3$' "${git_log}"
    grep -q '^tag -d quickstart/v0.121.3$' "${git_log}"
    grep -q '^tag -d v0.121.3$' "${git_log}"
    grep -q '^reset --mixed original-head$' "${git_log}"
}

function test_release_success_end_to_end {
    local release_fixture="${fixture_root}/release-success"
    local git_log="${fixture_root}/release-success-git.log"

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

    (
        cd "${release_fixture}" || exit 1
        VERSION_FILE=.version

        function git {
            local previous=""
            local arg

            printf '%s\n' "$*" >> "${git_log}"
            case "${1:-}" in
                status|fetch|pull|add|commit|push|reset)
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
                tag)
                    if [ "${2:-}" = "--list" ]; then
                        printf '%s\n' 'v0.121.2'
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
    grep -q '^push --atomic origin HEAD:main refs/tags/v0.121.3 refs/tags/quickstart/v0.121.3$' "${git_log}"
    if grep -q '^reset --mixed' "${git_log}"; then
        echo "successful release unexpectedly rolled back" >&2
        return 1
    fi
}

test_module_discovery
test_repository_module_boundaries
test_quickstart_sync_without_published_tag
test_transaction_rollback
test_release_failure_end_to_end
test_release_success_end_to_end

echo "release workflow tests passed"

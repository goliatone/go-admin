#!/bin/bash

# shellcheck disable=SC2034,SC2329

set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
fixture_root=$(mktemp -d "${TMPDIR:-/tmp}/go-admin-release-test.XXXXXX")
fixture_root=$(cd "${fixture_root}" && pwd -P)

function cleanup {
    if [ -n "${fixture_root}" ] && [ -d "${fixture_root}" ]; then
        # Downloaded Go modules have read-only directories. Change only this
        # fixture's directories, without following its deliberate symlinks.
        find "${fixture_root}" -type d -exec chmod u+w {} +
        rm -rf "${fixture_root}"
    fi
}
trap cleanup EXIT

# shellcheck disable=SC1091
source "${repo_root}/taskfile"

# Keep the production artifact gate available for the real isolated graph check.
eval "$(declare -f release:modules:validate | sed '1s/release:modules:validate/test_release_modules_validate_real/')"

# Synthetic release fixtures exercise orchestration and rollback without the
# repository's full publishable asset tree. The Go releasecheck tests cover the
# real local-proxy artifact implementation; this override records invocation.
function release:modules:validate {
    if [ -n "${RELEASE_MODULE_VALIDATION_LOG:-}" ]; then
        printf '%s %s\n' "${1}" "${2}" >> "${RELEASE_MODULE_VALIDATION_LOG}"
    fi
}

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

function test_track_release_source {
    (
        cd "${1}" || exit 1
        command git init -q || exit 1
        # Notes are intentionally untracked, just as in the real checkout.
        printf '.release-notes.md\nevidence/\nnode_modules/\n' > .gitignore
        command git add -- . || exit 1
        command git -c user.name=ReleaseFixture -c user.email=release@example.invalid \
            -c commit.gpgsign=false commit -qm baseline
    )
}

function test_release_tests_do_not_require_documentation {
    local source_fixture="${fixture_root}/optional-documentation"
    local error_log="${fixture_root}/optional-documentation.log"
    mkdir -p "${source_fixture}/quickstart"
    printf 'module github.com/goliatone/go-admin\n\ngo 1.26.5\n' > "${source_fixture}/go.mod"
    printf 'package goadmin\n' > "${source_fixture}/root.go"
    printf 'package quickstart\n' > "${source_fixture}/quickstart/quickstart.go"
    cp "${repo_root}/documentation_contract_test.go" "${source_fixture}/"
    cp "${repo_root}/quickstart/documentation_contract_test.go" "${source_fixture}/quickstart/"
    printf 'package goadmin\nimport "testing"\nfunc TestRuntime(t *testing.T) {}\n' > "${source_fixture}/runtime_test.go"

    (
        cd "${source_fixture}" || exit 1
        # Exercise the same default test selection as release preparation,
        # first without any documentation, then with broken/stale prose.
        GOWORK=off go test -mod=readonly ./... -count=1 || exit 1
        mkdir docs
        printf '[missing](missing.md)\nWithLegacyUserRoleBulkRoutes\n' > README.md
        cp README.md docs/README.md
        cp README.md quickstart/README.md
        GOWORK=off go test -mod=readonly ./... -count=1 || exit 1
        if GOWORK=off go test -mod=readonly -tags=doccheck . -count=1 > "${error_log}" 2>&1; then
            echo "explicit documentation check accepted broken documentation" >&2
            exit 1
        fi
        grep -q 'TestCurrentDocumentationRelativeLinksResolve' "${error_log}" || exit 1
        if GOWORK=off go test -mod=readonly -tags=doccheck ./quickstart -count=1 > "${error_log}" 2>&1; then
            echo "explicit quickstart documentation check accepted stale documentation" >&2
            exit 1
        fi
        grep -q 'TestREADMEHasNoKnownStaleContracts' "${error_log}" || exit 1

        # Documentation isolation must not hide a failing code test.
        printf 'package goadmin\nimport "testing"\nfunc TestRuntime(t *testing.T) { t.Fatal("runtime release gate") }\n' > runtime_test.go
        if GOWORK=off go test -mod=readonly ./... -count=1 > "${error_log}" 2>&1; then
            echo "default release tests accepted a failing runtime test" >&2
            exit 1
        fi
        grep -q 'runtime release gate' "${error_log}"
    )
}

function test_release_source_isolation {
    local source_fixture="${fixture_root}/isolated-source"
    local clean_state="${fixture_root}/isolated-clean"
    local dirty_state="${fixture_root}/isolated-dirty"
    local escape_state="${fixture_root}/isolated-escape"
    local state
    local asset
    mkdir -p "${source_fixture}" "${clean_state}" "${dirty_state}" "${escape_state}"
    printf 'module github.com/goliatone/go-admin\n\ngo 1.26.5\n' > "${source_fixture}/go.mod"
    printf 'package fixture\nconst Good = true\n' > "${source_fixture}/fixture.go"
    printf 'retained fixture\n' > "${source_fixture}/fixture.txt"
    printf '0.1.0\n' > "${source_fixture}/.version"
    for asset in console/index.js styles/console.css debug/index.js debug/toolbar-bootstrap.js \
        styles/debug.css third-party/iconoir/iconoir.css third-party/iconoir/LICENSE \
        third-party/simple-datatables/style.css third-party/simple-datatables/LICENSE \
        third-party/echarts/echarts.min.js third-party/echarts/LICENSE third-party/echarts/NOTICE; do
        mkdir -p "${source_fixture}/pkg/client/assets/dist/$(dirname "${asset}")"
        printf 'tracked asset\n' > "${source_fixture}/pkg/client/assets/dist/${asset}"
    done
    test_track_release_source "${source_fixture}"
    (
        cd "${source_fixture}" || exit 1
        release:source:capture "${clean_state}"
        mkdir -p evidence/baseline node_modules/dependency
        printf 'package broken\nvar _ MissingSnapshotType\n' > evidence/baseline/snapshot.go
        printf 'package broken\nimport _ "scratch.invalid/dependency"\n' > node_modules/dependency/dependency.go
        printf 'package fixture\nvar _ MissingScratchType\n' > scratch.go
        printf 'invalid ambient workspace\n' > go.work
        mkdir -p examples pkg/client/assets/scripts
        printf 'invalid untracked examples module\n' > examples/go.mod
        printf 'invalid untracked client package\n' > pkg/client/assets/package.json
        printf 'untracked client script\n' > pkg/client/assets/scripts/prepare-release-assets.mjs
        release:source:capture "${dirty_state}"
        cmp "${clean_state}/source-hashes" "${dirty_state}/source-hashes"
        [ ! -e "${dirty_state}/prepared-source/evidence" ]
        [ ! -e "${dirty_state}/prepared-source/node_modules" ]
        [ ! -e "${dirty_state}/prepared-source/scratch.go" ]
        [ ! -e "${dirty_state}/prepared-source/go.work" ]
        [ ! -e "${dirty_state}/examples-module.present" ]
        [ ! -e "${dirty_state}/prepared-source/pkg/client/assets/package.json" ]
        release_source_version_path=.version
        release_client_enabled=0
        release:source:prepare 0.1.1 "${clean_state}"
        release:source:prepare 0.1.1 "${dirty_state}"
        cmp "${clean_state}/prepared-source/go.mod" "${dirty_state}/prepared-source/go.mod"
        assert_file_content .version 0.1.0
        assert_file_content fixture.txt 'retained fixture'
        (cd "${dirty_state}/prepared-source" && GOWORK=off go list -mod=readonly ./...) > "${dirty_state}/packages"
        assert_file_content "${dirty_state}/packages" github.com/goliatone/go-admin
        for state in "${clean_state}" "${dirty_state}"; do
            (
                cd "${repo_root}" || exit 1
                GOWORK=off go run -mod=readonly -buildvcs=false ./cmd/go-admin-release-check \
                    -module-root "${state}/prepared-source" -version v0.1.1 -module-proxy "${state}/proxy"
            )
        done
        cmp "${clean_state}/proxy/github.com/goliatone/go-admin/@v/v0.1.1.zip" \
            "${dirty_state}/proxy/github.com/goliatone/go-admin/@v/v0.1.1.zip"
        rm "${dirty_state}/prepared-source/pkg/client/assets/dist/console/index.js"
        if (
            cd "${repo_root}" || exit 1
            GOWORK=off go run -mod=readonly -buildvcs=false ./cmd/go-admin-release-check \
                -module-root "${dirty_state}/prepared-source" -version v0.1.1
        ); then
            echo "release accepted a missing shipped asset" >&2; exit 1
        fi
        cp "${clean_state}/prepared-source/pkg/client/assets/dist/console/index.js" \
            "${dirty_state}/prepared-source/pkg/client/assets/dist/console/index.js"

        printf 'unexpected mutation\n' > "${dirty_state}/prepared-source/fixture.txt"
        if release:source:assert_prepared "${dirty_state}"; then
            echo "release accepted a changed tracked fixture" >&2; exit 1
        fi
        rm "${dirty_state}/prepared-source/fixture.txt"
        if release:source:assert_prepared "${dirty_state}"; then
            echo "release accepted a missing tracked fixture" >&2; exit 1
        fi
        ln -s "${fixture_root}" escaping-link
        command git add -- escaping-link
        if release:source:capture "${escape_state}"; then
            echo "release accepted an escaping tracked symlink" >&2; exit 1
        fi
        mkdir tmp
        state=$(TMPDIR="${source_fixture}/tmp" release:state:create)
        case "${state}/" in "${source_fixture}/"*) exit 1 ;; esac
        release:transaction:cleanup "${state}"
    )
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

function test_go_quality_all_lints_full_repository {
    (
        local lint_fixture="${fixture_root}/quality-full-lint"
        mkdir -p "${lint_fixture}"
        export QUALITY_TEST_LINT_LOG="${lint_fixture}/lint.log"
        export QUALITY_TEST_LINT_EXIT=0
        local security_log="${lint_fixture}/security.log"
        cat > "${lint_fixture}/golangci-lint" <<'LINT'
#!/bin/bash
printf '%s\n' "$*" >> "${QUALITY_TEST_LINT_LOG}"
exit "${QUALITY_TEST_LINT_EXIT}"
LINT
        chmod +x "${lint_fixture}/golangci-lint"

        function _go:golangci_lint:ensure { printf '%s\n' "${lint_fixture}/golangci-lint"; }
        function _go:quality:prepare_env { :; }
        function go:fmt { :; }
        function go:fix { :; }
        function go:fmt:check { :; }
        function go:test { :; }
        function go:race { :; }
        function go:security:all { printf 'security\n' >> "${security_log}"; }

        go:quality:all ./... ./quickstart/... ./examples/...
        assert_file_content "${QUALITY_TEST_LINT_LOG}" 'run ./... ./quickstart/... ./examples/...'
        assert_file_content "${security_log}" 'security'

        : > "${QUALITY_TEST_LINT_LOG}"
        : > "${security_log}"
        QUALITY_TEST_LINT_EXIT=1
        if go:quality:all ./... ./quickstart/... ./examples/...; then
            echo "full quality gate ignored lint failure" >&2
            return 1
        fi
        assert_file_content "${QUALITY_TEST_LINT_LOG}" 'run ./... ./quickstart/... ./examples/...'
        assert_file_content "${security_log}" ''

        : > "${QUALITY_TEST_LINT_LOG}"
        QUALITY_TEST_LINT_EXIT=0
        GO_LINT_NEW_FROM_REV=quality-test-base
        go:quality:pr ./... ./quickstart/... ./examples/...
        assert_file_content "${QUALITY_TEST_LINT_LOG}" 'run --new-from-rev=quality-test-base --whole-files ./... ./quickstart/... ./examples/...'
    )
}

function test_go_file_discovery_excludes_external_workspaces {
    local source_fixture="${fixture_root}/source-discovery"
    local path
    local files

    for path in admin quickstart examples pkg/client/assets \
        evidence/frozen .ctx/support .claude/worktrees/other .codex/worktrees/other \
        .git .gocache .tmp node_modules/pkg pkg/client/assets/node_modules/pkg; do
        mkdir -p "${source_fixture}/${path}"
        printf 'package fixture\n' > "${source_fixture}/${path}/fixture.go"
    done

    files=$(cd "${source_fixture}" && _go:files)
    if [ "${files}" != $'./admin/fixture.go\n./examples/fixture.go\n./pkg/client/assets/fixture.go\n./quickstart/fixture.go' ]; then
        echo "unexpected maintained Go file list: ${files}" >&2
        return 1
    fi
}

function test_go_package_discovery_excludes_evidence {
    local package_fixture="${fixture_root}/package-discovery"
    local packages

    mkdir -p "${package_fixture}/admin" "${package_fixture}/evidence/frozen" \
        "${package_fixture}/pkg/client/node_modules/dependency"
    printf 'module quality.test/fixture\n\ngo 1.26\n' > "${package_fixture}/go.mod"
    printf 'package fixture\n' > "${package_fixture}/fixture.go"
    printf 'package admin\n' > "${package_fixture}/admin/admin.go"
    printf 'package frozen\nvar _ MissingSnapshotType\n' > "${package_fixture}/evidence/frozen/frozen.go"
    printf 'package dependency\nvar _ MissingDependencyType\n' > "${package_fixture}/pkg/client/node_modules/dependency/dependency.go"

    packages=$(cd "${package_fixture}" && GOWORK=off _go:run_in_module printf '%s\n' ./...)
    if [ "${packages}" != $'.\n./admin' ]; then
        echo "unexpected maintained Go packages: ${packages}" >&2
        return 1
    fi
    (cd "${package_fixture}" && GOWORK=off _go:run_in_module "$(_go:bin)" test ./...)
    packages=$(cd "${package_fixture}" && _go:run_in_module printf '%s\n' ./evidence/frozen)
    if [ "${packages}" != './evidence/frozen' ]; then
        echo "explicit package target changed: ${packages}" >&2
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
    local forbidden_imports

    if grep -Eq 'github\.com/goliatone/go-admin/(quickstart|examples)([[:space:]]|$)' "${repo_root}/go.mod"; then
        echo "published root module must not require quickstart or examples" >&2
        return 1
    fi
    grep -q '^replace github.com/goliatone/go-admin => \.\.$' "${repo_root}/examples/go.mod"
    grep -q '^replace github.com/goliatone/go-admin/quickstart => ../quickstart$' "${repo_root}/examples/go.mod"
    grep -q '^[[:space:]]*\./examples$' "${repo_root}/go.work"

    forbidden_imports=$(
        find "${repo_root}" \
            \( -type d \( \
                -path "${repo_root}/examples" -o \
                -name '.*' -o \
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
    local state_dir="${fixture_root}/real-isolated-release"
    local path

    mkdir -p "${snapshot_dir}/quickstart" "${state_dir}"
    for path in go.mod go.sum quickstart/go.mod quickstart/go.sum; do
        cp "${repo_root}/${path}" "${snapshot_dir}/${path}"
    done

    (
        cd "${repo_root}" || exit 1
        release_source_version_path=.version
        release_client_enabled=0
        release:source:capture "${state_dir}" || exit 1
        release:source:prepare 0.999.0 "${state_dir}" || exit 1
        # Only this disposable tree gets an index. The maintained checkout is
        # neither staged nor committed, even when its working sources are dirty.
        cd "${state_dir}/prepared-source" || exit 1
        command git init -q || exit 1
        # These paths were tracked in the source, even when current ignore rules match.
        command git add -f --pathspec-from-file="${state_dir}/source-paths" --pathspec-file-nul || exit 1
        for path in go.sum quickstart/go.sum examples/go.sum; do
            [ ! -f "${path}" ] || command git add -- "${path}" || exit 1
        done
        test_release_modules_validate_real v0.999.0 "${state_dir}"
    )

    for path in go.mod go.sum quickstart/go.mod quickstart/go.sum; do
        if ! cmp -s "${repo_root}/${path}" "${snapshot_dir}/${path}"; then
            echo "quickstart sync check did not restore ${path}" >&2
            return 1
        fi
    done
}

function test_isolated_release_faults {
    local fault
    local source_fixture
    local error_log
    local status
    for fault in capture prepare source drift apply proxy interrupt; do
        source_fixture="${fixture_root}/fault-${fault}"
        error_log="${fixture_root}/fault-${fault}.log"
        mkdir -p "${source_fixture}/quickstart"
        printf '0.1.0\n' > "${source_fixture}/.version"
        printf 'old changelog\n' > "${source_fixture}/CHANGELOG.md"
        printf 'manual notes\n' > "${source_fixture}/.release-notes.md"
        printf 'module github.com/goliatone/go-admin\n\ngo 1.26.5\n' > "${source_fixture}/go.mod"
        printf 'package fixture\nconst Name = "root"\n' > "${source_fixture}/fixture.go"
        printf 'retained\n' > "${source_fixture}/fixture.txt"
        printf 'module github.com/goliatone/go-admin/quickstart\n\ngo 1.26.5\n\nrequire github.com/goliatone/go-admin v0.1.0\n' > "${source_fixture}/quickstart/go.mod"
        printf 'package quickstart\nimport root "github.com/goliatone/go-admin"\nconst Name = root.Name\n' > "${source_fixture}/quickstart/quickstart.go"
        test_track_release_source "${source_fixture}"
        (
            cd "${source_fixture}" || exit 1
            VERSION_FILE=.version
            # Keep remote publication and history generation synthetic.
            function git {
                case "${1:-}" in
                    fetch|pull) return 0 ;;
                    cliff) printf 'generated\n' > CHANGELOG.md; return 0 ;;
                    push) echo 'unexpected publication' >&2; return 98 ;;
                esac
                command git "$@"
            }
            eval "$(declare -f release:source:prepare | sed '1s/release:source:prepare/test_prepare_before_fault/')"
            function release:source:prepare {
                case "${fault}" in
                    prepare) return 1 ;;
                    interrupt) /bin/sh -c 'kill -TERM "$PPID"'; return 1 ;;
                esac
                test_prepare_before_fault "$@" || return 1
                if [ "${fault}" = source ]; then
                    printf 'changed\n' > "${2}/prepared-source/fixture.txt"
                    release:source:assert_prepared "${2}" || return 1
                fi
                if [ "${fault}" = drift ]; then
                    printf 'concurrent edit\n' > "${source_fixture}/fixture.txt"
                fi
            }
            if [ "${fault}" = capture ]; then
                function release:source:capture { return 1; }
            fi
            function cp {
                case "$*" in
                    *prepared-source/go.mod*)
                        if [ "${fault}" = apply ]; then return 1; fi ;;
                esac
                command cp "$@"
            }
            function release:modules:validate { return 1; }
            release patch
        ) > "${error_log}" 2>&1 && status=0 || status=$?
        if [ "${status}" -eq 0 ]; then
            echo "isolated release ignored ${fault} failure" >&2; return 1
        fi
        if [ "${fault}" = interrupt ] && [ "${status}" -ne 143 ]; then
            cat "${error_log}" >&2; return 1
        fi
        assert_file_content "${source_fixture}/.version" 0.1.0
        assert_file_content "${source_fixture}/CHANGELOG.md" 'old changelog'
        assert_file_content "${source_fixture}/.release-notes.md" 'manual notes'
        grep -q 'go-admin v0.1.0' "${source_fixture}/quickstart/go.mod"
        if [ "${fault}" = drift ]; then
            assert_file_content "${source_fixture}/fixture.txt" 'concurrent edit'
        else
            assert_file_content "${source_fixture}/fixture.txt" retained
        fi
        if [ -n "$(cd "${source_fixture}" && command git diff --cached --name-only)" ]; then
            echo "${fault} failure left a staged release" >&2; return 1
        fi
        [ -f "${source_fixture}/fixture.go" ]
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

function test_release_go_selection_is_controlled {
    local source_fixture="${fixture_root}/controlled-go-selection"
    local error_log="${fixture_root}/controlled-go-selection.log"
    local module
    local flags

    mkdir -p "${source_fixture}/quickstart"
    printf 'module github.com/goliatone/go-admin\n\ngo 1.26.5\n' > "${source_fixture}/go.mod"
    printf 'module github.com/goliatone/go-admin/quickstart\n\ngo 1.26.5\n' > "${source_fixture}/quickstart/go.mod"
    for module in . quickstart; do
        cat > "${source_fixture}/${module}/runtime_test.go" <<'GO'
package gate
import ("os"; "testing")
func TestReleaseGate(t *testing.T) {
    if testing.Short() { t.Skip("short mode") }
    if _, err := os.Stat("fail"); err == nil { t.Fatal("runtime gate failed") }
}
GO
        printf '//go:build doccheck\n\npackage gate\nimport "testing"\nfunc TestDocumentation(t *testing.T) { t.Fatal("documentation selected") }\n' \
            > "${source_fixture}/${module}/documentation_test.go"
    done
    # Cache a success, then change a non-source input: release checks must run
    # again and must not accept inherited test filtering or documentation tags.
    (cd "${source_fixture}" && GOFLAGS=-tags=doccheck quickstart:sync 0.999.0)
    for module in . quickstart; do
        : > "${source_fixture}/${module}/fail"
        for flags in '-run=^$' '-skip=TestReleaseGate' '-short' '-count=0' '-list=.' '-tags=doccheck'; do
            if (cd "${source_fixture}" && GOFLAGS="${flags}" GOWORK=/missing/go.work quickstart:sync 0.999.0) > "${error_log}" 2>&1; then
                echo "release accepted a failing ${module} test with GOFLAGS=${flags}" >&2
                return 1
            fi
            grep -q 'runtime gate failed' "${error_log}" || return 1
        done
        printf 'GOFLAGS=-run=^$\n' > "${source_fixture}/goenv"
        if (cd "${source_fixture}" && unset GOFLAGS && export GOENV="${source_fixture}/goenv" && quickstart:sync 0.999.0) > "${error_log}" 2>&1; then
            echo "release accepted persisted GOFLAGS" >&2
            return 1
        fi
        grep -q 'runtime gate failed' "${error_log}" || return 1
        rm "${source_fixture}/${module}/fail"
    done
}

function test_release_root_only_preparation_controls_selection {
    local state_dir="${fixture_root}/root-only-selection"
    local error_log="${fixture_root}/root-only-selection.log"
    mkdir -p "${state_dir}/prepared-source"
    printf 'module example.com/root\n\ngo 1.26.5\n' > "${state_dir}/prepared-source/go.mod"
    printf 'package root\nimport "testing"\nfunc TestRuntime(t *testing.T) { t.Fatal("root-only gate") }\n' \
        > "${state_dir}/prepared-source/runtime_test.go"
    if (
        function release:source:assert_prepared { return 0; }
        GOFLAGS=-run=^$ release:source:prepare 0.999.0 "${state_dir}"
    ) > "${error_log}" 2>&1; then
        echo "root-only preparation accepted a failing code test" >&2
        return 1
    fi
    grep -q 'root-only gate' "${error_log}"
}

function test_release_staged_consumer_controls_selection {
    local source_fixture="${fixture_root}/staged-selection-source"
    local state_dir="${fixture_root}/staged-selection-state"
    local error_log="${fixture_root}/staged-selection.log"
    mkdir -p "${source_fixture}/quickstart" "${state_dir}"
    printf 'module example.com/consumer\n\ngo 1.26.5\n' > "${source_fixture}/quickstart/go.mod"
    printf 'package consumer\nimport "testing"\nfunc TestRuntime(t *testing.T) { t.Fatal("consumer gate") }\n' \
        > "${source_fixture}/quickstart/runtime_test.go"
    if (
        cd "${source_fixture}" || exit 1
        function git {
            [ "${1:-}" = checkout-index ] || return 1
            cp -R "${source_fixture}/." "${3#--prefix=}"
        }
        function go {
            [ "${GOFLAGS:-}" = -buildvcs=false ] && [ "${GOWORK:-}" = off ] || return 1
            case "${1}" in
                run) return 0 ;;
                env) printf 'off\n' ;;
                mod) return 0 ;;
                test) command go "$@" ;;
                *) return 1 ;;
            esac
        }
        GOFLAGS=-run=^$ test_release_modules_validate_real v0.999.0 "${state_dir}"
    ) > "${error_log}" 2>&1; then
        echo "staged consumer validation accepted a failing code test" >&2
        return 1
    fi
    grep -q 'consumer gate' "${error_log}"
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

    for candidate in 24.21.0 26.5.0 99.0.0; do
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

    for candidate in 24.20.99 22.12.0 21.99.99 invalid; do
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

function test_release_client_preflight_accepts_supported_npm_versions {
    local candidate
    local status

    for candidate in 11.17.0 11.18.0 12.0.0; do
        (
            function command { return 0; }
            function node { printf '%s\n' v24.21.0; }
            function npm { printf '%s\n' "${candidate}"; }
            function gh { return 0; }
            release:client:preflight
        ) || {
            echo "browser release rejected supported npm ${candidate}" >&2
            return 1
        }
    done

    for candidate in 11.16.99 10.99.99 invalid; do
        (
            function command { return 0; }
            function node { printf '%s\n' v24.21.0; }
            function npm { printf '%s\n' "${candidate}"; }
            function gh { return 0; }
            release:client:preflight
        ) >/dev/null 2>&1 && status=0 || status=$?
        if [ "${status}" -eq 0 ]; then
            echo "browser release accepted unsupported npm ${candidate}" >&2
            return 1
        fi
    done
}

function test_transaction_cleanup_removes_readonly_module_cache {
    local state_dir="${fixture_root}/readonly-transaction-state"

    mkdir -p "${state_dir}/module-cache/example.org/dependency@v1.0.0"
    printf '%s\n' 'package dependency' > "${state_dir}/module-cache/example.org/dependency@v1.0.0/dependency.go"
    chmod -R a-w "${state_dir}/module-cache"

    release:transaction:cleanup "${state_dir}"

    if [ -e "${state_dir}" ]; then
        echo "release transaction cleanup left a read-only module cache behind" >&2
        return 1
    fi
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
    local npm_log="${fixture_root}/tagged-client-npm.log"
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
            [ "${GOFLAGS:-}" = -buildvcs=false ] && [ "${GOWORK:-}" = off ] || return 1
            [ "${PWD}" != "${current_source}/pkg/client/assets" ]
            [ -f "${PWD}/../../../source-marker" ]
            [ "$(cat "${PWD}/../../../source-marker")" = tagged ]
            printf '%s\n' "$*" >> "${npm_log}"
            case "$*" in
                'ci --ignore-scripts --include=dev'|'test'|'run test:public') return 0 ;;
                *) return 1 ;;
            esac
        }
        function node {
            [ "$(cat source-marker)" = tagged ]
            [ "$*" = "pkg/client/assets/scripts/prepare-release-assets.mjs --version 1.2.3 --destination ${resolved_destination} --commit ${commit}" ]
            printf '%s\n' "1.2.3 ${resolved_destination} ${commit}" > "${prepare_log}"
            : > "${destination}/client.tgz"
        }

        release:client:prepare_tag v1.2.3 "${destination}"

        # Retry publication must fail before packaging or touching GitHub when
        # tests of the requested tag fail, even if the current checkout works.
        function release:client:preflight { return 0; }
        function npm { [ "$*" != test ]; }
        function node { : > "${prepare_log}.unexpected-pack"; }
        function gh { : > "${prepare_log}.unexpected-upload"; }
        if release:client:publish v1.2.3; then
            echo "tagged-source publication ignored failing frontend tests" >&2
            exit 1
        fi
        [ ! -e "${prepare_log}.unexpected-pack" ] && [ ! -e "${prepare_log}.unexpected-upload" ]
    )

    assert_file_content "${prepare_log}" "1.2.3 ${resolved_destination} ${commit}"
    assert_file_content "${npm_log}" $'ci --ignore-scripts --include=dev\ntest\nrun test:public'
    [ -f "${destination}/client.tgz" ]
}

function test_release_client_failure_blocks_artifacts {
    local source_fixture="${fixture_root}/client-test-failure"
    local failed_command
    local error_log="${fixture_root}/client-test-failure.log"
    mkdir -p "${source_fixture}/pkg/client/assets"
    for failed_command in 'ci --ignore-scripts --include=dev' test 'run test:public'; do
        if (
            cd "${source_fixture}" || exit 1
            function npm { [ "$*" != "${failed_command}" ]; }
            function node { : > "${source_fixture}/packed"; }
            release:client:prepare 1.2.3 "${source_fixture}/artifacts"
        ) > "${error_log}" 2>&1; then
            echo "client preparation ignored failing ${failed_command}" >&2
            return 1
        fi
        [ ! -e "${source_fixture}/packed" ] || return 1
    done
}

function test_release_staged_client_isolated_validation {
    local source_fixture="${fixture_root}/staged-client-source"
    local state_dir
    local expected_status
    local npm_log="${fixture_root}/staged-client-npm.log"
    mkdir -p "${source_fixture}/pkg/client/assets/scripts"
    printf 'tracked\n' > "${source_fixture}/pkg/client/assets/output.css"
    for expected_status in 0 1; do
        state_dir="${fixture_root}/staged-client-state-${expected_status}"
        mkdir "${state_dir}"
        if (
            cd "${source_fixture}" || exit 1
            function git {
                [ "${1:-}" = checkout-index ] || return 1
                cp -R "${source_fixture}/." "${3#--prefix=}"
            }
            function go {
                case "${1}" in
                    run) return 0 ;;
                    env) printf 'off\n' ;;
                    *) return 1 ;;
                esac
            }
            function npm {
                [ "${PWD}" = "${state_dir}/client-source/pkg/client/assets" ] || return 1
                printf '%s\n' "$*" >> "${npm_log}"
                printf 'generated\n' > output.css
                [ "$*" != test ] || return "${expected_status}"
            }
            function node {
                [ "${PWD}" = "${state_dir}/client-source" ] || return 1
                : > "${state_dir}/client-assets/packed"
            }
            release_client_enabled=1 test_release_modules_validate_real v1.2.3 "${state_dir}"
        ); then
            [ "${expected_status}" -eq 0 ] || return 1
            [ -f "${state_dir}/client-assets/packed" ] || return 1
        else
            [ "${expected_status}" -eq 1 ] || return 1
            [ ! -e "${state_dir}/client-assets/packed" ] || return 1
        fi
        assert_file_content "${source_fixture}/pkg/client/assets/output.css" tracked
        assert_file_content "${state_dir}/module-source/pkg/client/assets/output.css" tracked
    done
    assert_file_content "${npm_log}" $'ci --ignore-scripts --include=dev\ntest\nrun test:public\nci --ignore-scripts --include=dev\ntest'
}

function test_release_client_checks_precede_publication {
    local source_fixture
    local operation_log
    local error_log
    local test_status
    # Mock Git/source-integrity operations only in this orchestration test.
    # The production staged validator and client test routine remain active.
    for test_status in 0 1; do
        source_fixture="${fixture_root}/client-publication-${test_status}"
        operation_log="${fixture_root}/client-publication-${test_status}.log"
        error_log="${fixture_root}/client-publication-${test_status}.error"
        mkdir -p "${source_fixture}/pkg/client/assets/scripts"
        printf '1.2.2\n' > "${source_fixture}/.version"
        printf 'original changelog\n' > "${source_fixture}/CHANGELOG.md"
        printf 'module example.com/release\n\ngo 1.26.5\n' > "${source_fixture}/go.mod"
        printf '{}\n' > "${source_fixture}/pkg/client/assets/package.json"
        printf '{}\n' > "${source_fixture}/pkg/client/assets/package-lock.json"
        : > "${source_fixture}/pkg/client/assets/scripts/prepare-release-assets.mjs"
        if (
            cd "${source_fixture}" || exit 1
            VERSION_FILE=.version
            function git {
                case "${1}" in
                    status|fetch|pull|add|reset) return 0 ;;
                    symbolic-ref) printf 'main\n' ;;
                    rev-list) printf 'original-head\n' ;;
                    rev-parse) [ "${2}" = HEAD ] && printf 'original-head\n' ;;
                    ls-files) [ "${4}" != .release-notes.md ] ;;
                    checkout-index) cp -R "${source_fixture}/." "${3#--prefix=}" ;;
                    cliff) printf 'new changelog\n' > CHANGELOG.md ;;
                    tag)
                        if [ "${2}" = --list ]; then
                            case "${3}" in quickstart/*) printf 'quickstart/v1.2.2\n' ;; *) printf 'v1.2.2\n' ;; esac
                        else
                            printf 'tag\n' >> "${operation_log}"
                        fi
                        ;;
                    commit|push) printf '%s\n' "${1}" >> "${operation_log}" ;;
                    *) return 1 ;;
                esac
            }
            function release:source:capture {
                mkdir "${1}/prepared-source" || return 1
                cp -R "${source_fixture}/." "${1}/prepared-source/"
            }
            function release:source:assert_prepared { return 0; }
            function release:source:assert_current { return 0; }
            function release:source:assert_index { return 0; }
            function release:source:assert_staged { return 0; }
            function release:source:fingerprint { printf 'fixture\n'; }
            function release:client:preflight { return 0; }
            function release:client:version:set { return 0; }
            function release:modules:validate { test_release_modules_validate_real "$@"; }
            function release:client:publish { printf 'publish\n' >> "${operation_log}"; }
            function go {
                case "${1}" in
                    mod|test|run) return 0 ;;
                    env) printf 'off\n' ;;
                    *) return 1 ;;
                esac
            }
            function npm {
                if [ "$*" = test ]; then
                    printf 'frontend-test\n' >> "${operation_log}"
                    return "${test_status}"
                fi
            }
            function node { printf 'pack\n' >> "${operation_log}"; }
            release patch
        ) > "${error_log}" 2>&1; then
            [ "${test_status}" -eq 0 ] || { cat "${error_log}"; return 1; }
            assert_file_content "${operation_log}" $'frontend-test\npack\ncommit\ntag\ntag\npush\npublish'
        else
            [ "${test_status}" -eq 1 ] || { cat "${error_log}"; return 1; }
            assert_file_content "${operation_log}" frontend-test
            assert_file_content "${source_fixture}/.version" 1.2.2
            assert_file_content "${source_fixture}/CHANGELOG.md" 'original changelog'
        fi
    done
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

    test_track_release_source "${release_fixture}"

    (
        cd "${release_fixture}" || exit 1
        VERSION_FILE=.version

        function git {
            local previous=""
            local arg

            printf '%s\n' "$*" >> "${git_log}"
            case "${1:-}" in
                checkout-index|hash-object|diff)
                    command git "$@"
                    return $?
                ;;
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
                    if [ "${2:-}" = "--stage" ] || [ "${2:-}" = "-z" ] || [ "${2:-}" = "--error-unmatch" ]; then
                        command git "$@"
                        return $?
                    fi
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

    test_track_release_source "${release_fixture}"

    (
        cd "${release_fixture}" || exit 1
        VERSION_FILE=.version

        function git {
            local previous=""
            local arg

            printf '%s\n' "$*" >> "${git_log}"
            case "${1:-}" in
                checkout-index|hash-object|diff)
                    command git "$@"
                    return $?
                ;;
                status|fetch|pull)
                    return 0
                ;;
                symbolic-ref)
                    printf '%s\n' 'main'
                    return 0
                ;;
                ls-files)
                    if [ "${2:-}" = "--stage" ] || [ "${2:-}" = "-z" ] || [ "${2:-}" = "--error-unmatch" ]; then
                        command git "$@"
                        return $?
                    fi
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
    local module_validation_log="${fixture_root}/release-success-module-validation.log"

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

    test_track_release_source "${release_fixture}"

    (
        cd "${release_fixture}" || exit 1
        VERSION_FILE=.version
        RELEASE_MODULE_VALIDATION_LOG="${module_validation_log}"

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
                checkout-index|hash-object|diff)
                    command git "$@"
                    return $?
                ;;
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
                    if [ "${2:-}" = "--stage" ] || [ "${2:-}" = "-z" ] || [ "${2:-}" = "--error-unmatch" ]; then
                        command git "$@"
                        return $?
                    fi
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
    grep -q '^v0.121.3 ' "${module_validation_log}"
    if grep -q '^reset --mixed' "${git_log}"; then
        echo "successful release unexpectedly rolled back" >&2
        return 1
    fi
}

release_tests_run=0
for release_test in \
    test_release_tests_do_not_require_documentation \
    test_release_source_isolation \
    test_isolated_release_faults \
    test_go_quality_cache_stays_outside_repository \
    test_go_quality_all_lints_full_repository \
    test_go_file_discovery_excludes_external_workspaces \
    test_go_package_discovery_excludes_evidence \
    test_module_discovery \
    test_repository_module_boundaries \
    test_real_quickstart_sync \
    test_quickstart_sync_without_published_tag \
    test_examples_sync_tracks_coordinated_version \
    test_quickstart_sync_runs_tests \
    test_release_go_selection_is_controlled \
    test_release_root_only_preparation_controls_selection \
    test_release_staged_consumer_controls_selection \
    test_quickstart_sync_check_restores_after_interruption \
    test_release_client_preflight_accepts_supported_node_versions \
    test_release_client_preflight_accepts_supported_npm_versions \
    test_transaction_cleanup_removes_readonly_module_cache \
    test_transaction_rollback \
    test_release_client_prepare_uses_tagged_source \
    test_release_client_failure_blocks_artifacts \
    test_release_staged_client_isolated_validation \
    test_release_client_checks_precede_publication \
    test_release_client_prepare_rejects_tag_skew \
    test_postpush_asset_failure_preserves_release \
    test_failed_restore_preserves_snapshot \
    test_release_ignores_untracked_input \
    test_release_rejects_tracked_input \
    test_release_rejects_tag_skew \
    test_release_failure_end_to_end \
    test_release_commit_failure_restores_index \
    test_release_success_end_to_end
do
    if [ -n "${RELEASE_TEST_FILTER:-}" ] && ! [[ "${release_test}" =~ ${RELEASE_TEST_FILTER} ]]; then
        continue
    fi
    printf 'Running %s\n' "${release_test}"
    "${release_test}"
    release_tests_run=$((release_tests_run + 1))
done
if [ "${release_tests_run}" -eq 0 ]; then
    echo "No release tests matched RELEASE_TEST_FILTER." >&2
    exit 1
fi

echo "release workflow tests passed"

# Development and CI/CD Guide

This guide documents the current Go development quality workflow for `go-admin`,
both locally and in GitHub Actions.

It is focused on the lint/test/quality path that now centers on
`golangci-lint`, while keeping security scanning and broader test workflows
separate.

## 1. Purpose

Use this guide to standardize:

- local development commands
- the expected pull request validation flow
- the main-branch quality gate
- how to work incrementally in a large codebase with existing lint debt
- what remains to finish the migration from standalone tools to the unified
  lint workflow

## 2. Current Quality Model

The repository now uses these layers:

- Formatting: `gofmt`
- Tests: `go test`
- Lint and maintainability checks: `golangci-lint`
- Security scans: `govulncheck`, `gosec`
- Example-specific and productization workflows: separate GitHub Actions jobs

The canonical files for this workflow are:

- `.golangci.yml`
- `.golangci-lint-version`
- `.github/workflows/go-quality.yml`
- `taskfile`
- `tools/quality/baseline.sh`

## 3. What Runs Where

### 3.1 Local workflow

Local development should optimize for fast iteration:

- use targeted tests first
- use `go:lint:new` for change-scoped lint feedback
- use `go:lint:report` when you need to inspect the current backlog
- use `go:quality:pr` before opening or updating a PR

### 3.2 GitHub workflow

GitHub uses three lint modes:

- `Lint New Issues`: blocking on pull requests and merge queue
- `Lint Full Repository (Advisory)`: non-blocking backlog visibility on pull requests
- `Lint Full Repository`: blocking on `main` and manual workflow runs

This split keeps PR feedback fast and fair while still making the repository
backlog visible.

## 4. Local Setup

### 4.1 Install the quality tools

Install the repo-managed Go quality tools:

```bash
./taskfile go:tools:all
```

This installs:

- `golangci-lint`
- `govulncheck`
- `gosec`

If you only need the linter:

```bash
./taskfile go:tools:golangci-lint
```

### 4.2 Verify your branch baseline

The incremental lint flow compares against `origin/main` by default. Before
using `go:lint:new`, make sure your local refs are current:

```bash
git fetch origin main
```

If needed, override the comparison base:

```bash
GO_LINT_NEW_FROM_REV=origin/main ./taskfile go:lint:new
GO_LINT_NEW_FROM_REV=HEAD~1 ./taskfile go:lint:new
```

## 5. Local Tutorial

This is the recommended day-to-day workflow for backend changes.

### Step 1: Find the code you need

```bash
rg -n "SymbolName|TypeName|route_name" admin quickstart examples
```

### Step 2: Make the change

Keep the change narrow. Prefer structural fixes over localized patches.

### Step 3: Format and run focused tests

```bash
./taskfile go:fmt
go test ./admin/... -run TestName
```

Use package-targeted tests before broader runs whenever possible.

### Step 4: Run change-scoped lint checks

```bash
./taskfile go:lint:new
```

This is the default local lint command for large branches. It catches new
problems introduced by your changes without forcing you to fix the full repo
backlog.

### Step 5: Inspect backlog findings when needed

If you are cleaning up an area or validating refactor opportunities, run:

```bash
./taskfile go:lint:report
```

This reports findings but does not fail on them. Use it to identify:

- duplicate helper logic
- oversized functions
- deeply nested conditionals
- dead code and redundant abstractions

### Step 6: Autofix what is safe

For linters and formatters that support fixes:

```bash
./taskfile go:lint:fix
```

Review the diff after running autofix. Do not assume every fix is worth keeping.

### Step 7: Run the PR-equivalent local gate

Before pushing:

```bash
./taskfile go:quality:pr
```

This runs:

- formatting check
- tests
- change-scoped linting

### Step 8: Run the full quality gate when working on cleanup or release prep

```bash
./taskfile go:quality:all
```

This runs:

- formatting check
- tests
- race tests
- full `golangci-lint`
- `govulncheck`
- `gosec`

Use this before major merges, release prep, or when modifying shared
infrastructure.

## 6. Command Reference

### 6.1 Lint commands

```bash
./taskfile go:lint
```

Runs full `golangci-lint` across the default package set.

```bash
./taskfile go:lint:new
```

Runs `golangci-lint` only against issues introduced after
`GO_LINT_NEW_FROM_REV`.

```bash
./taskfile go:lint:report
```

Runs full `golangci-lint` but does not fail the shell on findings.

```bash
./taskfile go:lint:fix
```

Runs autofix-capable lints and formatters.

### 6.2 Quality commands

```bash
./taskfile go:quality:pr
```

Best local approximation of the blocking PR gate.

```bash
./taskfile go:quality:all
```

Full quality and security pass.

```bash
./taskfile go:quality:baseline
```

Baseline-aware quality run for backlog-managed adoption.

### 6.3 Baseline commands

```bash
./taskfile go:baseline:update:golangci-lint
```

Writes or refreshes `ops/quality/baselines/golangci-lint.txt`.

```bash
./taskfile go:baseline:update:gosec
```

Writes or refreshes `ops/quality/baselines/gosec.txt`.

Use baselines deliberately. Refresh them only after intentional cleanup or
when you are formally accepting the current backlog.

## 7. How to Interpret Lint Findings

The current lint config is intentionally pragmatic. It targets maintainability
and correctness rather than style purity.

### 7.1 Duplication

Primary linter:

- `dupl`

What to do:

- extract shared helper logic only when the duplication reflects the same
  domain operation
- avoid abstracting unrelated code just to silence a linter
- prefer a well-named helper or small adapter over copy-pasted branching logic

Good candidates:

- repeated module registration setup
- duplicated object resolver branches
- repeated permission or routing normalization logic

### 7.2 Large or complex functions

Primary linters:

- `gocyclo`
- `funlen`
- `nestif`

What to do:

- split orchestration from transformation
- move branch-specific behavior into small helpers
- replace deep nesting with guard clauses
- separate parsing, validation, and persistence concerns

Good candidates:

- handlers doing validation plus data loading plus rendering
- large module `Register` methods
- one-file services that own several unrelated responsibilities

### 7.3 Dead code and redundant abstractions

Primary linters:

- `unused`
- `staticcheck`
- `ineffassign`
- `unconvert`

What to do:

- delete unused exported helpers when they are not part of a real external contract
- remove stale interfaces that only wrap one implementation without adding a seam
- collapse unnecessary conversions and assignments
- treat `staticcheck` findings as design cleanup opportunities, not only bug reports

### 7.4 Correctness issues

Primary linters:

- `govet`
- `staticcheck`
- `errcheck`

What to do:

- fix these first
- do not suppress unless the code is intentionally correct and the reason is documented
- if a suppression is required, use a specific `nolint` with explanation

## 8. GitHub Actions Workflow

The GitHub workflow file is `.github/workflows/go-quality.yml`.

### 8.1 Pull request behavior

On pull requests:

- `Lint New Issues` is required and blocks merge
- `Lint Full Repository (Advisory)` runs with `--issues-exit-code=0`
- advisory output is for backlog visibility, not for merge blocking

This means:

- new lint regressions are not allowed
- pre-existing backlog does not force unrelated PRs to clean the whole repo

### 8.2 Main branch behavior

On push to `main`:

- `Lint Full Repository` runs as a blocking job

This is stricter than the PR gate and protects the default branch from drifting.

### 8.3 Other CI workflows

This guide only covers the Go quality pipeline. Other workflows in the
repository still exist for:

- example E2E productization checks
- e-sign persistence verification
- feature-specific or domain-specific validation

Keep those workflows separate unless there is a clear operational benefit to
consolidating them.

## 9. Recommended Team Workflow

Use this as the default developer sequence:

1. Fetch `origin/main`.
2. Implement the change.
3. Run targeted tests.
4. Run `./taskfile go:lint:new`.
5. Run `./taskfile go:quality:pr`.
6. Push branch and open PR.
7. Review advisory backlog results only if they touch the same area.

When doing cleanup work:

1. Run `./taskfile go:lint:report`.
2. Pick one category at a time: duplication, complexity, or dead code.
3. Refactor in small slices.
4. Re-run package tests and `./taskfile go:lint`.
5. Avoid mixing cleanup with unrelated feature work unless the cleanup is
   required to land the change safely.

## 10. Migration Status

Completed:

- `golangci-lint` is the canonical maintainability linter
- `go vet` and `staticcheck` are covered through `golangci-lint`
- local `taskfile` targets now support full, incremental, report, fix, and baseline modes
- GitHub Actions has PR blocking, PR advisory, and main-branch strict modes
- legacy `staticcheck`-named task aliases have been removed

Still in transition:

- the backlog is visible but not yet systematically reduced
- pre-commit automation is not yet standardized
- security scanning remains adjacent rather than fully documented as part of one operator playbook

## 11. Future Work

When a task is completed, keep it in this list and change its checkbox from
`- [ ]` to `- [x]` so the migration history stays visible.

- [x] Task CICD-001: Remove or rename legacy `staticcheck`-named task aliases once all local docs/scripts use `go:lint*` targets directly.
- [ ] Task CICD-002: Decide whether `ops/quality/baselines/golangci-lint.txt` should become a committed baseline for CI-assisted incremental rollout or remain a local-only migration tool.
- [ ] Task CICD-003: Add a repo-supported pre-commit hook or pre-commit framework config that runs `go:fmt:check` and `go:lint:new`.
- [ ] Task CICD-004: Add a dedicated GitHub Actions workflow or extend the current quality workflow to report `govulncheck` and `gosec` with the same operator-facing conventions as the lint pipeline.
- [ ] Task CICD-005: Reduce the current duplication backlog in `admin/` by extracting repeated resolver and module-registration patterns only where the abstractions are semantically real.
- [ ] Task CICD-006: Break up oversized functions and large files flagged by `funlen`, `gocyclo`, and `nestif`, starting with shared infrastructure packages before example apps.
- [ ] Task CICD-007: Audit existing `nolint` directives and require every remaining suppression to be specific, justified, and still valid under the current configuration.
- [ ] Task CICD-008: Review and tune linter thresholds after the first cleanup wave so the configuration stays strict enough to matter but not noisy enough to be ignored.
- [ ] Task CICD-009: Document ownership and policy for refreshing lint and security baselines so baseline updates do not become a way to hide regressions.

## 12. Definition of Done For This Workflow

The migration is fully complete when:

- developers use `go:lint`, `go:lint:new`, and `go:quality:pr` as the normal path
- PRs are blocked only by real new regressions
- the backlog is being reduced intentionally rather than ignored
- legacy standalone lint commands are no longer the source of truth
- local and GitHub workflows are documented in one place and stay current

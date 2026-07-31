# Repository Agent Guidance

Important, the user wants to review all code changes before manually committing to git, agents should never use git unless directly prompted.

## Project Context

This repository uses `.ctx/` as the canonical feature context system. For meaningful feature work, read `.ctx/README.md` and the relevant `.ctx/specs/<feature>/` files before making changes. Keep `REQUIREMENTS.md`, `DESIGN.md`, and `TASKS.md` aligned with implementation.

## Release Notes

Manual release notes are temporary and optional.

- Write next-release migration or operator notes in `.release-notes.md`.
- Do not commit `.release-notes.md`; it is ignored by git.
- `./taskfile release [patch|minor|major]` automatically includes non-empty `.release-notes.md` content in the generated `CHANGELOG.md`.
- After `git cliff` successfully writes the changelog, the release task removes `.release-notes.md`.
- Use `RELEASE_NOTES_FILE=path` or `./taskfile release --notes path` only for another untracked scratch file.
- Keep release note text ready to appear verbatim in `CHANGELOG.md`; include headings such as `## Migration Notes` when useful.
- Release preflight ignores untracked files, rejects tracked working-tree changes, validates coordinated root and quickstart tags, tests the publishable graph, and advances examples development metadata.
- Failed releases restore the temporary notes file together with version, changelog, and module metadata; inspect the warning if automatic rollback reports an incomplete restore.

Use this path for migration guidance that should ship with a release but should not depend on remembering a special commit message.

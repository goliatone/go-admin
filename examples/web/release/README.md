# Translation Release Artifacts

This package keeps two translation release artifacts:

- `translation_release_checklist.json`: the real release template for the next rollout. It is intentionally incomplete and should fail validation until the current release is signed off.
- `testdata/translation_release_checklist_approved_sample.json`: a checked-in approved sample that demonstrates the finished release shape with repo-local evidence references.

Tests verify both behaviors:

- the template remains pending,
- the approved sample stays valid and its evidence references continue to resolve.

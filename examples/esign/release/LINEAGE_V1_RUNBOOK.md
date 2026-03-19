# Lineage V1 Runbook

## Fresh-Environment Bootstrap

1. Start from an empty database and run the normal e-sign persistence bootstrap so the lineage tables and parity columns are created by migrations.
2. Run `"/Users/goliatone/.g/go/bin/go" test ./examples/esign/modules -run 'TestValidateLineageRuntimeWiring|TestValidateGoogleRuntimeWiring' -count=1` to confirm startup validation still rejects missing lineage wiring.
3. Run `"/Users/goliatone/.g/go/bin/go" test ./examples/esign/release -run TestRunLineageValidationProfileCoversSlice4Contracts -count=1` to validate clean migrations, Google import lineage linkage, unchanged re-import reuse, changed-source revision creation, agreement provenance propagation, fingerprint generation, candidate review actions, and detail contract stability.

## Retry Failed Fingerprint Jobs

1. Identify the `source_revision_id` and `artifact_id` from the document lineage detail or diagnostics page.
2. Confirm the artifact object exists and the PDF bytes are readable before retrying.
3. Re-run the fingerprint build path for that revision and artifact; a healthy retry must move the status from `failed` or `pending` to `ready` without creating duplicate fingerprint rows for the same extract version.
4. Re-open the document detail and confirm the fingerprint warning clears or downgrades.

## Diagnose Candidate False Positives

1. Open the lineage diagnostics view for the affected source document and inspect the candidate evidence bundle.
2. Compare `title_similarity`, `owner_match`, `folder_match`, and any text-similarity evidence before deciding whether the relationship is real.
3. Confirm whether the candidate came from identity resolution during import or reconciliation after fingerprinting; the evidence JSON records the reason.
4. If the relationship is clearly wrong, reject it and verify the warning no longer appears on the current document detail page.

## Candidate Confirm-Reject Flow

1. Only trusted operators should review candidates; the review action requires an actor id and writes audit evidence into the relationship record.
2. Use `confirm` only when both source documents are the same logical document and handle attachment is safe.
3. Use `reject` for false positives or sibling drafts that must remain distinct.
4. After either action, reload the affected document detail page and confirm pending candidate warnings are suppressed.

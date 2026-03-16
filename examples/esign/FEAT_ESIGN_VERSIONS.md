# E-Sign Agreement Versions - Technical Design

## Document Status

- Status: Proposed
- Authors: Codex
- Intended audience: e-sign maintainers and implementers
- Last updated: 2026-03-15

## Summary

This design adds a versioned edit workflow to `examples/esign` without breaking the current legal integrity model.

The MVP does not mutate a sent or completed agreement in place. Instead, it creates a new linked agreement revision:

- `correction` for `sent` or `in_progress` agreements
- `amendment` for `completed` agreements

This is the smallest implementation that fits the current architecture:

- draft authoring already exists and should remain the only editable surface
- sent agreements are intentionally immutable today
- audit events are append-only
- executed and certificate artifacts are hash-based and immutable

The result is a workflow where users can "edit after send" and "edit after signing" from the product perspective, while the backend preserves immutable records and explicit lineage between versions.

## Goals

- Add an MVP correction flow for in-flight agreements.
- Add an MVP amendment flow for completed agreements.
- Reuse the existing draft authoring, send, audit, token, and artifact systems.
- Preserve the original signed agreement and its audit trail.
- Record explicit lineage between related agreements and documents.
- Keep the implementation small enough to ship quickly and iterate later.

## Non-Goals

- No in-place mutation of `sent`, `in_progress`, or `completed` agreements.
- No page-level signature invalidation in MVP.
- No tracked-changes PDF renderer in MVP.
- No per-field legal attestation or partial signer carry-forward in MVP.
- No merge/rebase model for concurrent edits by multiple admins.
- No new parallel authoring system outside the existing draft/sync flow.

## Current Repository Constraints

The current implementation already enforces several constraints that this design should preserve:

- agreement editing is draft-only at the action layer in [`examples/esign/modules/action_state.go`](/Users/goliatone/Development/GO/src/github.com/goliatone/go-admin/examples/esign/modules/action_state.go)
- agreement editing is draft-only in persistence and services in [`examples/esign/stores/memory.go`](/Users/goliatone/Development/GO/src/github.com/goliatone/go-admin/examples/esign/stores/memory.go) and [`examples/esign/services/agreement_service.go`](/Users/goliatone/Development/GO/src/github.com/goliatone/go-admin/examples/esign/services/agreement_service.go)
- signer completion and agreement completion are agreement-scoped, not revision-scoped by page
- audit events are append-only in [`examples/esign/services/audit_trail.go`](/Users/goliatone/Development/GO/src/github.com/goliatone/go-admin/examples/esign/services/audit_trail.go)
- executed and certificate artifacts are immutable and hash-based in [`examples/esign/services/artifact_pipeline.go`](/Users/goliatone/Development/GO/src/github.com/goliatone/go-admin/examples/esign/services/artifact_pipeline.go)
- documents are already modeled as immutable source assets

These constraints strongly favor a superseding-agreement model over in-place edits.

## Product Semantics

### Correction

A correction is used when the agreement has been sent but is not yet completed.

Examples:

- fix a typo
- update a date
- replace the underlying PDF
- move or add signing fields

Product behavior:

- sender selects `Request Correction`
- system creates a new editable draft derived from the current agreement
- sender updates document and placements
- sender sends the corrected revision
- original in-flight agreement is voided as superseded
- all signers are asked to sign the new revision from scratch

### Amendment

An amendment is used when the original agreement is already completed.

Examples:

- change a term after signing
- add an addendum
- correct a signed contract through a follow-on document

Product behavior:

- sender selects `Request Amendment`
- system creates a new linked draft derived from the original agreement
- sender edits the amendment document and placements
- sender sends the amendment for approval/signature
- original completed agreement remains unchanged
- amendment is linked to the original by agreement lineage and parent artifact hash

## Core MVP Decisions

### 1. Do Not Reopen Sent Agreements

The MVP will not temporarily move a `sent` agreement back to `draft`.

Instead:

- original agreement remains a permanent historical record
- new agreement carries the correction
- legal and operational history stays explicit

### 2. Invalidate All Signatures On Correction

The MVP invalidates the entire in-flight agreement by superseding it, not only modified pages.

Reason:

- the current signer completion model is agreement-scoped
- field values, signature artifacts, and completion state are not tracked by revision/page lineage
- full invalidation is substantially smaller and safer to ship

### 3. Always Create A New Document Record For Changed Content

If the sender edits document content, the corrected or amended revision must point to a new `document_id`.

The existing `documents` table already behaves like immutable source storage. The MVP should keep that contract.

### 4. Reuse Existing Draft Authoring

The edit UI for corrections and amendments should reuse the current agreement draft authoring and sync workflow.

The new work is in:

- bootstrapping a draft from an existing agreement
- linking the new agreement to the previous one
- changing available actions based on status and workflow kind

### 5. Store Structured Diff Metadata, Not Rendered Track Changes

The MVP will store machine-readable change summaries in audit metadata.

Examples:

- old/new document IDs
- old/new document hashes
- participant additions/removals/changes
- field additions/removals/moves
- changed title/message

The UI can render a human summary from audit metadata. A PDF diff renderer is deferred.

## MVP Data Model Changes

### Agreement Fields

Add the following fields to `agreements`:

- `workflow_kind TEXT NOT NULL DEFAULT 'standard'`
  - allowed values: `standard`, `correction`, `amendment`
- `root_agreement_id TEXT NOT NULL DEFAULT ''`
  - first agreement in the lineage chain
- `parent_agreement_id TEXT NOT NULL DEFAULT ''`
  - immediate prior agreement for corrections and amendments
- `parent_executed_sha256 TEXT NOT NULL DEFAULT ''`
  - executed artifact hash of the parent when applicable

Purpose:

- `workflow_kind` distinguishes ordinary agreements from corrections/amendments
- `root_agreement_id` makes lineage queries cheap
- `parent_agreement_id` links one revision to the previous agreement
- `parent_executed_sha256` provides the cryptographic chain needed for amendment history

Notes:

- for the first standard agreement, `root_agreement_id` should equal `id`
- for correction children, `parent_agreement_id` points to the superseded in-flight agreement
- for amendment children, `parent_agreement_id` points to the completed agreement being amended

### Audit Events

Add new agreement audit event types:

- `agreement.correction_requested`
- `agreement.correction_draft_created`
- `agreement.corrected_from`
- `agreement.superseded_by_correction`
- `agreement.amendment_requested`
- `agreement.amendment_draft_created`
- `agreement.amended_from`

These events should carry metadata such as:

- `actor_id`
- `actor_type`
- `source_agreement_id`
- `new_agreement_id`
- `root_agreement_id`
- `parent_agreement_id`
- `workflow_kind`
- `old_document_id`
- `new_document_id`
- `old_document_sha256`
- `new_document_sha256`
- `change_summary`

### Optional Dedicated Revision Table

The MVP does not require a new `agreement_versions` table.

The lineage can be expressed directly on `agreements` plus audit events. A separate table can be added later if history querying becomes cumbersome.

## Workflow Design

### Correction Flow

Preconditions:

- agreement status is `sent` or `in_progress`
- actor has existing edit/send permissions

Flow:

1. User invokes `Request Correction`.
2. Backend loads the source agreement, recipients, fields, and current document reference.
3. Backend creates a new draft agreement:
   - `workflow_kind = correction`
   - `root_agreement_id = source.root_agreement_id` or `source.id`
   - `parent_agreement_id = source.id`
   - `parent_executed_sha256 = ''`
   - status starts as `draft`
4. Backend copies title, message, recipients, and field placements into the new draft.
5. Backend records `agreement.correction_requested` on the source and `agreement.corrected_from` on the new draft.
6. UI opens the new draft in the existing authoring flow.
7. Sender edits document and/or field placements.
8. Sender sends the corrected draft.
9. Backend voids the source agreement with a system reason such as `superseded_by_correction`.
10. Backend records lineage audit events on both agreements.
11. New signer tokens and invitations are issued for the corrected agreement.

Result:

- original in-flight agreement remains visible as voided/superseded
- corrected agreement becomes the active version
- all signers sign the corrected agreement anew

### Amendment Flow

Preconditions:

- agreement status is `completed`
- actor has existing edit/send permissions

Flow:

1. User invokes `Request Amendment`.
2. Backend loads the completed agreement and its executed artifact hash.
3. Backend creates a new draft agreement:
   - `workflow_kind = amendment`
   - `root_agreement_id = source.root_agreement_id` or `source.id`
   - `parent_agreement_id = source.id`
   - `parent_executed_sha256 = source executed artifact sha256`
4. Backend copies title/message, recipients, and optionally field placements.
5. Backend records `agreement.amendment_requested` on the source and `agreement.amended_from` on the new draft.
6. UI opens the new draft in the existing authoring flow.
7. Sender edits the amendment document and sends it.

Result:

- original completed agreement remains unchanged
- amendment agreement has its own send/sign/complete lifecycle
- amendment certificate references the parent executed hash

### Authoring Bootstrap Rules

The MVP needs one new backend capability: create a draft from an existing agreement.

Suggested service surface:

```go
type AgreementRevisionKind string

const (
    AgreementRevisionCorrection AgreementRevisionKind = "correction"
    AgreementRevisionAmendment  AgreementRevisionKind = "amendment"
)

type CreateAgreementRevisionInput struct {
    SourceAgreementID string
    Kind              AgreementRevisionKind
    CreatedByUserID   string
    IPAddress         string
}
```

Behavior:

- create a new draft agreement record
- copy draft-editable state from the source agreement
- do not copy signer completion state
- do not copy field values
- do not copy signature artifacts
- do not copy signing tokens
- optionally copy document reference initially; if sender uploads a replacement document, the new draft points to the new document

## Action And Command Changes

### New Agreement Actions

Add new actions to the agreement panel:

- `request_correction`
  - enabled for `sent`, `in_progress`
- `request_amendment`
  - enabled for `completed`

Existing action behavior remains:

- `edit` stays draft-only
- `send` stays draft-only
- `resend` applies only to the currently active in-flight agreement
- `void` still applies to `sent` and `in_progress`

### New Commands

Add commands:

- `esign.agreements.request_correction`
- `esign.agreements.request_amendment`

Each command should:

- validate source agreement status
- call the new revision bootstrap service
- return the new draft/agreement ID for redirect into authoring

### Sending A Corrected Draft

The existing send flow should remain mostly unchanged.

Additional behavior for correction drafts:

- after successful send, void the parent in-flight agreement in the same transaction boundary if feasible
- append explicit supersession audit events
- ensure the UI treats the new agreement as the current active version

If transactional coupling is too invasive for the first pass, use:

- send correction draft successfully
- append audit event
- then void parent through a follow-up service step guarded by idempotency

But the preferred MVP is one service operation that keeps the chain consistent.

## Audit Trail And Diff Contract

### Change Summary Shape

The MVP should record a structured `change_summary` object in audit metadata.

Suggested shape:

```json
{
  "document_changed": true,
  "title_changed": false,
  "message_changed": true,
  "participants": {
    "added": [],
    "removed": [],
    "updated": [{"participant_id":"p1","fields":["email","name","signing_stage"]}]
  },
  "fields": {
    "added": ["f9"],
    "removed": ["f2"],
    "moved": [{"field_id":"f3","from":{"page":1,"x":100,"y":200},"to":{"page":2,"x":90,"y":140}}],
    "updated": [{"field_id":"f5","fields":["required","type"]}]
  },
  "document": {
    "old_document_id": "doc_old",
    "new_document_id": "doc_new",
    "old_sha256": "abc",
    "new_sha256": "def"
  }
}
```

This does not need a separate diff engine in MVP. It can be computed by comparing the source agreement snapshot to the revision draft at send time.

### Audit Trail Rendering

The audit trail renderer should be extended to recognize the new event types and render human-readable entries such as:

- "Correction requested by Alice"
- "Agreement superseded by corrected revision agr_123"
- "Amendment requested against completed agreement agr_001"

The current audit trail remains append-only.

## Artifact And Certificate Changes

### Correction Artifacts

No artifact change is required for the superseded parent agreement.

The corrected agreement generates its own:

- executed artifact
- certificate artifact

The parent in-flight agreement usually has no final executed artifact yet, so no hash chain is required.

### Amendment Certificate

The amendment certificate should include:

- `parent_agreement_id`
- `root_agreement_id`
- `parent_executed_sha256`

The certificate renderer already includes executed hash metadata. The MVP should extend that metadata block rather than invent a second certificate type.

## Frontend MVP Scope

### Agreement Detail

Add:

- `Request Correction` button for `sent` and `in_progress`
- `Request Amendment` button for `completed`
- lineage summary panel:
  - current workflow kind
  - root agreement ID
  - parent agreement ID
  - related agreements links

For superseded agreements, show a banner such as:

- "This agreement was superseded by correction X."

### Draft Authoring

No new editor is required.

The existing draft/sync authoring flow should open with copied participants and fields from the source agreement.

### Signing Experience

No special signer-side diff UI is required in MVP.

For corrections:

- signer simply receives a new invitation for the corrected agreement
- the old link should become invalid because the old agreement was voided/superseded

For amendments:

- signer receives a normal invitation for the amendment agreement

## API And Transport Changes

Minimum transport additions:

- command endpoints for `request_correction` and `request_amendment`
- agreement detail payload includes:
  - `workflow_kind`
  - `root_agreement_id`
  - `parent_agreement_id`
  - `parent_executed_sha256`
  - `superseded_by_agreement_id` if derived in the repository payload
  - `related_agreements` summary if convenient for the detail page

No new public signer API contract is required for MVP.

## Repository Implementation Map

The MVP should primarily touch these areas:

- store models and contracts
  - `examples/esign/stores/models.go`
  - `examples/esign/stores/contracts.go`
- persistence implementations and migrations
  - `examples/esign/stores/memory.go`
  - `examples/esign/internal/persistence/store_relational_tx.go`
  - `examples/esign/internal/persistence/store_methods.go`
  - `examples/esign/data/sql/migrations/...`
- agreement lifecycle services
  - `examples/esign/services/agreement_service.go`
  - `examples/esign/services/audit_trail.go`
  - `examples/esign/services/artifact_pipeline.go`
- admin commands and message factories
  - `examples/esign/commands/registry.go`
  - `examples/esign/commands/messages.go`
  - `examples/esign/commands/handlers.go`
  - `examples/esign/commands/factories.go`
- panel actions and repository payload mapping
  - `examples/esign/modules/action_state.go`
  - `examples/esign/modules/esign_module.go`
  - `examples/esign/modules/panel_repositories.go`
- route/contract coverage and flow tests
  - `examples/esign/modules/*test.go`
  - `examples/esign/services/*test.go`
  - `examples/esign/handlers/*test.go`

## Permissions And Policy

The MVP can reuse existing admin edit/send permissions:

- correction requires the same permission level as editing and sending an agreement
- amendment requires the same permission level as editing and sending an agreement

No new permission codes are required unless the product later wants separate control over post-send editing.

## Observability

Add:

- structured logs for correction/amendment creation
- counters for:
  - correction requests
  - amendment requests
  - correction sends
  - amendment sends
  - superseded agreements
- audit coverage tests for lineage events

## Rollout And Migration

Migration approach:

1. Add new nullable/defaulted agreement columns.
2. Backfill existing agreements:
   - `workflow_kind = standard`
   - `root_agreement_id = id`
   - `parent_agreement_id = ''`
   - `parent_executed_sha256 = ''`
3. Add new actions and commands.
4. Add service support for bootstrapping revision drafts.
5. Update agreement detail UI with lineage affordances.

This is backward-compatible with existing agreements.

## Verification Requirements

The MVP is complete when the following are covered:

- service tests for correction bootstrap from `sent` and `in_progress`
- service tests for amendment bootstrap from `completed`
- tests proving draft copy excludes field values, tokens, and signature artifacts
- send tests proving correction children can be sent successfully
- tests proving source in-flight agreement is voided as superseded after correction send
- tests proving amendment children preserve parent completed agreement unchanged
- audit trail tests for new lineage event types
- artifact/certificate tests proving amendment metadata includes `parent_executed_sha256`
- action-state tests for `request_correction` and `request_amendment`
- detail/repository tests proving lineage fields are exposed to the UI

## MVP Delivery Checklist

- migration adds agreement lineage columns
- repository and store models expose new fields
- agreement panel publishes new actions with correct guards
- commands are registered for correction and amendment requests
- agreement service can create revision drafts from an existing agreement
- agreement detail payload includes lineage metadata
- correction send voids the superseded parent agreement
- amendment certificate includes the parent executed hash
- audit trail renders lineage events
- integration and contract tests cover the new flows

## Future Improvements

- selective invalidation only for modified pages instead of full agreement supersession
- tracked-changes PDF or visual diff rendering
- explicit `agreement_versions` table for richer lineage queries
- signer-facing diff review before re-signing a correction
- automated carry-forward of unaffected participant approvals
- richer lineage UI with full version graph and compare view
- field-level and page-level change attestations in the certificate
- separate permissions for correction vs amendment workflows
- more explicit amendment templates and addenda generation
- background reconciliation for stale lineage inconsistencies

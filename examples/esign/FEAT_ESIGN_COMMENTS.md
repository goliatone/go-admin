# E-Sign Comments And Review Mode - Implementation Plan

## Document Status

- Status: Proposed
- Authors: Codex
- Intended audience: e-sign maintainers and implementers
- Last updated: 2026-03-15

## Summary

This plan delivers a review and comments workflow for `examples/esign` that supports back-and-forth document negotiation before signature completion.

The design intentionally layers on top of the agreement revision model proposed in [`examples/esign/FEAT_ESIGN_VERSIONS.md`](/Users/goliatone/Development/GO/src/github.com/goliatone/go-admin/examples/esign/FEAT_ESIGN_VERSIONS.md):

- drafts remain the only editable content surface
- comments and review state are scoped to a single agreement revision
- if feedback requires changing an in-flight or completed agreement, the system creates a new `correction` or `amendment` draft
- signer and reviewer collaboration happens around one revision at a time

This keeps the legal integrity model intact while enabling practical contract negotiation and client review.

Implementation must also align with the packages and ownership boundaries already used by `examples/esign`:

- admin action availability stays in `go-admin` panel/action contracts
- admin-triggered business operations stay on the existing typed `go-command` command bus
- domain mutations stay in `examples/esign/services`
- audit remains the canonical event history
- admin activity remains a projection of audit through the existing `go-admin` activity sink integration
- public signer/reviewer interactions continue to use the existing signer session and unified review page surfaces

The MVP must not introduce a second workflow runtime or a second source of truth for agreement/review state.

## Goals

- Allow senders to invite external participants into a document review flow before signing.
- Support shared, document-anchored comment threads and replies.
- Expose comments and review state inside the unified signer review page.
- Allow review gating before send or before sign.
- Integrate review mode with correction and amendment workflows.
- Preserve append-only audit history for review actions.

## Non-Goals

- No real-time collaborative document editing.
- No in-place mutation of sent or completed agreements.
- No tracked-changes PDF renderer in MVP.
- No comment participation across multiple revisions in a single shared thread.
- No public anonymous comments without a signer/reviewer session.
- No full document redlining or merge/rebase model for concurrent edits.
- No adoption of `go-command/flow` FSM as the primary state engine for agreement or review state in MVP.

## Product Semantics

### Review Mode

Review mode is a collaboration layer attached to a draft or revision draft.

It enables:

- shared comments visible to invited reviewers
- comment threads anchored to document locations or fields
- explicit review decisions such as `approve` or `request_changes`
- optional gating before send or before sign

It does not make sent agreements editable. If review feedback requires changing a sent or completed agreement, the sender must create a correction or amendment draft first.

### Review Gates

Support two product-level gates:

- `approve_before_send`
  - sender cannot send the agreement until required review participants approve
- `approve_before_sign`
  - agreement may be sent, but signing is blocked until the required review state is satisfied

The MVP should prefer `approve_before_send` first because it is operationally smaller and avoids exposing too much state in signer sessions early.

### Comment Visibility Classes

The plan should distinguish two comment classes:

- `shared`
  - visible to sender and invited external participants for that agreement revision
- `internal`
  - visible only to the sender's team and never shown on signer/reviewer pages

MVP should ship `shared` comments for the review flow. `internal` comments can reuse the same storage model later with stricter visibility rules.

## Core Delivery Decisions

### 1. Comments Are Revision-Scoped

Comment threads belong to one agreement ID and one document snapshot.

Reason:

- comments should describe the exact content under review
- corrections and amendments create new immutable agreement revisions
- carrying comments across revisions implicitly creates ambiguity about what text was being discussed

### 2. Reuse The Existing Unified Signer Review Route

The current `/sign/:token/review` route in [`examples/esign/runtime_web.go`](/Users/goliatone/Development/GO/src/github.com/goliatone/go-admin/examples/esign/runtime_web.go) should remain the public entrypoint for signer and reviewer interactions.

The review/comments feature extends the session payload and page UI instead of creating a separate public collaboration app.

### 3. Comments Are Workflow Metadata, Not Signed Payload

Comments, replies, and approvals should be recorded in audit metadata and review tables, but they should not become part of the executed artifact hash.

The legally binding payload remains the executed agreement document and certificate artifacts.

### 4. Review State Is Separate From Agreement Status

Agreement lifecycle state and review lifecycle state should be modeled separately.

Examples:

- agreement may be `draft` while review is `in_review`
- agreement may be `sent` while review gate is `approve_before_sign`
- agreement may be `completed` while prior review history remains queryable

### 5. Start With Threaded Comments, Not Visual Diff

MVP should support:

- pinned comments on page coordinates
- field-anchored comments
- general agreement-level comments
- replies, resolution, and change requests

Diff and tracked-changes rendering are deferred and can later reuse the revision metadata in the versions design.

### 6. Reuse Existing Command, Service, Audit, And Activity Layers

The current e-sign architecture already has the right separation of concerns:

- `go-admin` action guards decide which admin actions are available
- typed `go-command` commands dispatch admin-initiated operations
- domain services execute transactional state changes
- audit events are appended as the canonical history
- admin activity is projected from audit into the shared activity feed

The comments/review feature should plug into that existing stack instead of introducing:

- a new workflow runtime
- a second transition store
- direct UI-owned state machines for domain truth
- an activity stream that diverges from audit history

### 7. Keep Public Review On Existing Signer Routes

The public review experience should remain attached to the current signer API and unified review page:

- token-scoped HTTP handlers remain the public write/read surface
- `/sign/:token/review` remains the public review/sign entrypoint
- signer/reviewer APIs are extensions of the current signing namespace, not a separate collaboration app

This keeps transport, authz, rate limiting, and session resolution aligned with the current signing implementation.

## MVP Scope

### Included

- review session model for a single agreement revision
- shared comments and threaded replies
- page, field, and agreement-level comment anchors
- review decision actions: `approve`, `request_changes`
- sender-side review panel on agreement detail or draft surface
- signer/reviewer page comments panel on `/sign/:token/review`
- audit events for review lifecycle and comment events
- notifications for review requested, comment activity, and review approval
- integration with correction/amendment drafts

### Deferred

- carry-forward unresolved comments into the next revision automatically
- side-by-side document compare
- tracked-changes rendering
- inline text selection anchors within PDF text content
- @mentions and team inbox routing
- comment attachments
- per-clause structured approval matrix
- real-time websockets

## Data Model Changes

### Agreement Fields

Add lightweight review fields to `agreements`:

- `review_status TEXT NOT NULL DEFAULT 'none'`
  - allowed values: `none`, `in_review`, `changes_requested`, `approved`, `closed`
- `review_gate TEXT NOT NULL DEFAULT 'none'`
  - allowed values: `none`, `approve_before_send`, `approve_before_sign`
- `comments_enabled BOOLEAN NOT NULL DEFAULT FALSE`

These fields support fast list/detail rendering, but the source of truth for participant decisions should live in dedicated review records.

### New Review Table

Add `agreement_reviews`:

- `id`
- `agreement_id`
- `status`
- `gate`
- `requested_by_user_id`
- `opened_at`
- `closed_at`
- `last_activity_at`

Purpose:

- normalize review lifecycle away from the agreement row
- support reopening review without mutating audit history

### Review Participant Table

Add `agreement_review_participants`:

- `id`
- `review_id`
- `recipient_id` or external reviewer identity reference
- `email`
- `display_name`
- `role`
- `can_comment`
- `can_approve`
- `decision_status`
- `decision_at`

Suggested decision values:

- `pending`
- `approved`
- `changes_requested`
- `dismissed`

### Comment Thread Table

Add `agreement_comment_threads`:

- `id`
- `agreement_id`
- `review_id`
- `document_id`
- `visibility`
- `anchor_type`
  - `agreement`, `page`, `field`
- `page_number`
- `field_id`
- `anchor_x`
- `anchor_y`
- `status`
  - `open`, `resolved`
- `created_by_actor_type`
- `created_by_actor_id`
- `created_at`
- `resolved_by_actor_type`
- `resolved_by_actor_id`
- `resolved_at`

### Comment Message Table

Add `agreement_comment_messages`:

- `id`
- `thread_id`
- `body`
- `message_kind`
  - `comment`, `reply`, `system`
- `created_by_actor_type`
- `created_by_actor_id`
- `created_at`

System messages allow timelines such as:

- "Alice requested changes"
- "Sender marked this thread resolved"

## Audit Trail Changes

Add review-related agreement audit event types:

- `agreement.review_requested`
- `agreement.review_reopened`
- `agreement.review_approved`
- `agreement.review_changes_requested`
- `agreement.review_closed`
- `agreement.comment_thread_created`
- `agreement.comment_replied`
- `agreement.comment_resolved`
- `agreement.comment_reopened`

Audit metadata should include:

- `review_id`
- `thread_id`
- `participant_id`
- `actor_id`
- `actor_type`
- `anchor_type`
- `page_number`
- `field_id`
- `visibility`
- `review_gate`
- `review_status`

The existing audit renderer should summarize these events in human-readable form without storing large message bodies inline in the audit record.

## Permissions And Policy

Reuse existing send/edit permissions for sender-side review orchestration.

Add review capability checks at the participant/session level:

- `can_comment`
- `can_reply`
- `can_resolve`
- `can_request_changes`
- `can_approve_review`
- `can_sign`

MVP rule set:

- senders/admins can always manage review state and resolve any thread
- review participants can comment and reply
- only allowed reviewers can approve or request changes
- signers without review permissions can still use the existing sign flow when review gate conditions are satisfied

No new global permission codes are required in MVP unless product wants to disable external review for some tenants.

## Workflow Design

### Flow A: Draft Review Before Send

1. Sender creates or edits a draft agreement.
2. Sender enables comments and requests review.
3. Backend creates an `agreement_review` record and participant rows.
4. Reviewers receive a review link to the unified signer review page.
5. Reviewers add comments, reply, resolve, approve, or request changes.
6. Sender updates the draft through the existing authoring flow.
7. Once required participants approve, sender sends the agreement.

Result:

- review history is preserved on the draft revision
- send remains blocked until review requirements are met

### Flow B: Review During Signing

This is phase-two scope.

1. Sender sends agreement with `review_gate = approve_before_sign`.
2. Recipient opens `/sign/:token/review`.
3. Session exposes both signing fields and comment capabilities.
4. Recipient can comment or request changes before signing.
5. Signing action remains disabled until review blockers are cleared for that participant/session.

Result:

- one public page supports both review and sign
- recipient does not have to switch to a separate collaboration experience

### Flow C: Correction/Amendment Review

1. Source agreement requires change after send or completion.
2. Sender creates a `correction` or `amendment` draft using the versions flow.
3. New revision starts with fresh review state and no shared comments.
4. Sender requests review on the new revision.
5. Review and approval proceed against the new immutable revision.

Result:

- review semantics stay aligned with immutable revision lineage
- comments do not silently migrate onto changed content

## API And Command Changes

### New Commands

Add commands:

- `esign.agreements.request_review`
- `esign.agreements.reopen_review`
- `esign.agreements.close_review`
- `esign.agreements.approve_review`
- `esign.agreements.request_review_changes`
- `esign.agreements.create_comment_thread`
- `esign.agreements.reply_comment_thread`
- `esign.agreements.resolve_comment_thread`
- `esign.agreements.reopen_comment_thread`

### New Query Surfaces

Add review and comments payloads to:

- agreement detail/admin repository payload
- signer session bootstrap payload for `/sign/:token/review`

Minimum signer payload additions:

- `review.status`
- `review.gate`
- `review.capabilities`
- `review.participant_status`
- `review.blockers`
- `review.comments_enabled`
- `review.threads`

### Transport Notes

MVP can use the existing JSON APIs and command handlers rather than inventing a dedicated realtime channel.

Admin-side review orchestration should use the existing `go-admin` command bus pattern already used by agreement send/void/revision commands.

Public signer/reviewer interactions should stay on the existing signer handler surface and call the same domain services underneath.

Polling is sufficient for:

- thread refresh
- participant decision status
- review completion state

## Frontend Surfaces

### Admin Agreement Detail / Draft Surface

Add:

- `Request Review` action on drafts and revision drafts
- review summary card
- participant decision list
- comment thread panel
- comment filters: `open`, `resolved`, `all`
- banner when review is blocking send

### Unified Signer Review Page

Extend the existing public page to render:

- review banner with current status
- side panel with threads
- page pins and field-linked threads
- approve/request changes actions when allowed
- disabled sign CTA with explanation when review gate blocks signing

The page should degrade gracefully:

- if comments are disabled, the existing signing experience remains unchanged
- if review is enabled but user lacks comment permissions, show read-only review state

### Notification Templates

Add notifications for:

- review requested
- new shared comment
- review approved
- changes requested
- review reopened

Email templates can stay minimal in MVP and link back to the existing review page.

## Repository Implementation Map

The implementation will primarily touch:

- store models and contracts
  - `examples/esign/stores/models.go`
  - `examples/esign/stores/contracts.go`
- persistence implementations and migrations
  - `examples/esign/stores/memory.go`
  - `examples/esign/internal/persistence/store_relational_tx.go`
  - `examples/esign/internal/persistence/store_methods.go`
  - `examples/esign/data/sql/migrations/...`
- agreement and review lifecycle services
  - `examples/esign/services/agreement_service.go`
  - `examples/esign/services/audit_trail.go`
  - new review/comment service module
- signer session/bootstrap
  - `examples/esign/services/signing_service.go`
  - `examples/esign/runtime_web.go`
- admin commands and message factories
  - `examples/esign/commands/registry.go`
  - `examples/esign/commands/messages.go`
  - `examples/esign/commands/handlers.go`
  - `examples/esign/commands/factories.go`
- panel actions and repository payload mapping
  - `examples/esign/modules/action_state.go`
  - `examples/esign/modules/esign_module.go`
  - `examples/esign/modules/panel_repositories.go`
- templates and frontend assets for signer/admin review UI
  - existing e-sign signer templates
  - existing e-sign module assets
- route and flow tests
  - `examples/esign/modules/*test.go`
  - `examples/esign/services/*test.go`
  - `examples/esign/handlers/*test.go`
  - `examples/esign/runtime_web_test.go`

## Architecture Alignment

### Existing Stack To Reuse

The feature should follow the same execution model already used by `examples/esign`:

1. `go-admin` panel/action guards determine action availability.
2. Admin actions dispatch typed `go-command` commands.
3. Command handlers call e-sign domain services.
4. Services persist domain changes and append audit events.
5. `AuditActivityProjector` mirrors canonical audit events into the shared admin activity feed.

This keeps one source of truth for:

- lifecycle state
- review state
- lineage state
- audit history
- admin activity feed

### Admin Flows

Admin-initiated review operations should be implemented as typed commands, following the existing command registration/factory/handler pattern already used for:

- `esign.agreements.send`
- `esign.agreements.void`
- `esign.agreements.request_correction`
- `esign.agreements.request_amendment`

The new review/comment commands should fit into the same stack rather than bypassing it.

### Public Signer/Reviewer Flows

Public reviewer/signer interactions should remain on the current signer API surface:

- signer token resolution stays in the signer handlers and services
- review/comment reads and writes are exposed as additional signer endpoints under the existing signing namespace
- `/sign/:token/review` remains the canonical public page

This avoids introducing a second public collaboration runtime with different auth, rate limiting, or session semantics.

### Audit First, Activity Second

Review and comment actions should first append canonical audit events.

The admin activity feed should continue to be derived from audit via the existing activity projector. Avoid writing separate activity-only records for review/comment events unless a specific flow is not audit-backed.

This keeps:

- certificate/audit rendering coherent
- admin activity coherent
- observability and debugging easier
- legal/event history explicit

### Why Not Use FSM In MVP

`go-command/flow` FSM is a useful shared orchestration package, but using it as the primary review/revision state engine in MVP would introduce a second workflow system with its own:

- state store
- transition semantics
- snapshots and idempotency boundaries
- guard definitions
- runtime contracts

That would overlap with the domain state and service logic already present in `examples/esign`.

For MVP, review and revision transitions should stay as explicit service methods with typed command wrappers.

## Delivery Phases

### Phase 1. Data Model And Service Foundations

Outcome:

- persistence can represent review state, participants, threads, and messages

Tasks:

- add agreement review fields and new tables
- extend store contracts for review/comment CRUD
- add service APIs for opening review, listing threads, and recording decisions
- add audit event support for review lifecycle

Exit criteria:

- review records persist in memory and relational stores
- audit events render for review state transitions
- service tests cover open/reopen/approve/request-changes flows

### Phase 2. Admin Review Workflow

Outcome:

- senders can request and manage review on draft agreements

Tasks:

- add `Request Review` and related actions
- expose review summary in agreement detail payloads
- add admin-side thread listing and resolution commands
- enforce `approve_before_send` gating in send flow

Exit criteria:

- sender cannot send gated drafts without satisfying review approvals
- admin surfaces show participant decisions and open threads
- contract tests cover action availability and failure reasons

### Phase 3. Shared Comment Threads

Outcome:

- participants can create and reply to shared comments tied to a document revision

Tasks:

- implement thread creation and reply endpoints
- support agreement, page, and field anchors
- add resolution and reopen behavior
- add notification fan-out for shared activity

Exit criteria:

- comments appear in correct revision scope
- thread lifecycle works end-to-end
- unauthorized users cannot access shared threads

### Phase 4. Signer Review Page Integration

Outcome:

- `/sign/:token/review` supports comments and review decisions

Tasks:

- extend signer session payload with review metadata
- render review banner, comments panel, and pins in the signer page
- expose approve/request-changes actions where permitted
- keep normal signing flow unchanged when comments are disabled

Exit criteria:

- existing signer review page continues to work without review mode
- comment-capable sessions render review metadata and threads correctly
- runtime route tests cover review payload and page rendering

### Phase 5. Correction And Amendment Integration

Outcome:

- review mode works cleanly with immutable revision lineage

Tasks:

- ensure revision bootstrap initializes fresh review state
- expose lineage banners in review surfaces
- optionally include prior revision change summary in review payload
- add tests proving comments do not leak across revisions

Exit criteria:

- correction/amendment drafts can enter review mode
- parent comments remain attached to parent agreement only
- audit trail shows both lineage and review events coherently

### Phase 6. Notifications, Observability, And Polish

Outcome:

- feature is operable and measurable in production-like environments

Tasks:

- add metrics for reviews opened, approvals, changes requested, comment activity
- add structured logs for review transitions
- add email templates for review notifications
- add UX polish for empty states, blockers, and stale thread states

Exit criteria:

- observability captures core review funnel activity
- notification flows are covered by tests
- smoke coverage includes one review-enabled path

## Next Work (V2)

V2 should revisit whether `go-command/flow` FSM should be introduced only if the product and implementation needs clearly exceed what the current command/service model can handle cleanly.

### Conditions That May Justify FSM

Consider FSM in V2 if one or more of these become true:

- review lifecycle rules become tenant-configurable or admin-authored rather than code-defined
- different customers need materially different review policies, gates, escalation paths, or approval chains
- the product needs dry-run transition simulation, blocker introspection, or explainable next-state evaluation as a first-class feature
- review, revision, signing, escalation, and exception handling become a larger composed workflow that is hard to keep coherent in handwritten service guards
- multiple domains need the same reusable workflow runtime rather than e-sign alone
- product wants authoring/simulation tooling for workflow definitions using the existing `go-command/flow` authoring and RPC surfaces

### Conditions That Do Not Justify FSM On Their Own

These by themselves are not enough reason to introduce FSM:

- adding more review statuses
- adding more comment actions
- adding notifications or reminders
- adding UI complexity on the signer review page
- needing stronger test coverage around transition rules

Those can still be handled cleanly in the current service-driven model.

### If FSM Is Introduced Later

If V2 adopts FSM, it should be introduced as an adapter around the e-sign domain, not as a parallel system that bypasses e-sign services.

Recommended constraints:

- agreement and review persistence remain owned by `examples/esign/stores`
- audit remains canonical
- activity remains projected from audit
- FSM orchestrates transition eligibility and execution policy, but domain services still own writes and side effects
- migration should be incremental, starting with review lifecycle only, not agreement/signing state wholesale

The default assumption should remain: do not adopt FSM unless there is a clear requirement for configurable or reusable workflow orchestration that the current architecture cannot support without excessive duplication.

## Verification Requirements

The feature is complete when the following are covered:

- service tests for review open, close, reopen, approve, and request-changes flows
- service tests for comment thread creation, reply, resolve, and reopen
- send flow tests proving `approve_before_send` blocks send until satisfied
- signer session tests proving review metadata is exposed only when appropriate
- runtime web tests proving `/sign/:token/review` renders comment-capable sessions
- permission tests for sender, reviewer, signer, and unauthorized actors
- correction/amendment tests proving review state is reset per revision
- audit trail tests for review and comment events
- notification tests for review requested and changes requested flows

## MVP Delivery Checklist

- migrations add review fields and comment tables
- store contracts expose review and comment primitives
- agreement service can open and manage review state
- draft send flow enforces `approve_before_send`
- admin agreement detail exposes review summary and threads
- public signer review route exposes review metadata and comments
- comments can be created, replied to, resolved, and reopened
- audit trail renders review lifecycle and comment events
- correction and amendment drafts support fresh review sessions
- integration and runtime tests cover at least one full review path

## Future Improvements

- `approve_before_sign` rollout after draft review stabilizes
- unresolved-thread gating before signing
- automatic carry-forward of unresolved comments into a new revision draft
- signer-facing change summary or diff view for corrections
- @mentions and internal-only team discussion threads
- comment attachments and clause libraries
- real-time updates over websocket or SSE
- visual compare view between parent and child revisions
- certificate appendix summarizing review completion metadata

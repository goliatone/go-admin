# Agreement Form Runtime Internal Boundaries

This document defines the extraction seams introduced for the agreement authoring runtime.

## Public Entrypoints

- `agreement-form-runtime.ts`
  - Keeps the public runtime surface stable.
  - Owns config normalization, runtime creation, startup, and teardown.

- `agreement-form.ts`
  - Keeps the page controller and bootstrap surface stable.
  - Delegates init and destroy to the shared runtime entrypoint.

## Internal Modules

- `refs.ts`
  - Collects and validates required/optional DOM references.
  - This is the default boundary for static agreement-form DOM queries.

- `context.ts`
  - Defines the normalized runtime config and shared runtime context contracts.

- `runtime.ts`
  - Minimal lifecycle coordinator with explicit `start()` and `destroy()`.
  - No feature logic or page-specific side effects.

- `composition.ts`
  - Internal controller assembly and runtime composition boundary.
  - Owns feature wiring, shared callbacks, and the agreement runtime coordinator that the public entrypoint delegates to.

- `boot.ts`
  - Boot orchestration glue.
  - Starts runtime side effects in an explicit order and tears down runtime-owned controllers.

- `ui-utils.ts`
  - Shared page-level DOM formatting helpers such as HTML escaping and toast rendering.
  - No runtime orchestration or storage/network behavior.

- `ownership-ui.ts`
  - Renders active-tab ownership UI state.
  - May enable/disable controlled form actions, but does not own storage or sync behavior.

- `telemetry.ts`
  - Wizard telemetry emitter and counter dispatch helpers.
  - No direct feature orchestration.

- `state-manager.ts`
  - Wizard state shape, normalization, persistence, and listener notifications.
  - Constructor is side-effect free. Storage hydration happens in `start()`.

- `draft-sync-service.ts`
  - Draft CRUD transport and server sync adapter.
  - No DOM logic and no startup side effects.

- `active-tab-controller.ts`
  - Active-tab claim ownership, storage/broadcast coordination, and lifecycle events.
  - Constructor is side-effect free. Event listeners and ownership evaluation happen in `start()`.

- `sync-controller.ts`
  - Debounced sync orchestration, retry flow, and ownership enforcement.
  - Starts active-tab coordination explicitly through `start()`.

- `document-selection.ts`
  - Document listing, search/typeahead, selection, remediation, and title autofill behavior.
  - Async document loading is triggered explicitly during runtime side-effect startup.

- `participants.ts`
  - Participant add/remove/update flow and signer derivation.
  - Owns participant DOM binding and resume restoration for participant rows.

- `field-definitions.ts`
  - Manual field definitions, generated rule definitions, signer assignment syncing, and rule preview rendering.
  - Provides the placement-definition feed consumed by the placement editor.

- `placement-editor.ts`
  - Placement sidebar rendering, PDF viewer, overlay drag/resize/delete flow, linked placement propagation, and auto-placement suggestion review.
  - Owns placement state and placement form serialization behind an explicit controller boundary.

- `form-payload.ts`
  - Canonical agreement payload composition for save/send flows.
  - Reads current DOM-backed authoring state but does not own submission transport.

- `state-binding.ts`
  - Change tracking, debounced persistence triggers, and initial UI restoration after resume/bootstrap.
  - Keeps page event binding out of the top-level runtime coordinator.

- `wizard-validation.ts`
  - Step-specific validation rules for the agreement authoring flow.
  - Encapsulates user-facing validation errors without owning navigation or transport.

- `resume-flow.ts`
  - Resume-dialog orchestration, bootstrap reconciliation against saved drafts, and snapshot preservation/discard decisions.
  - Owns resumable draft lifecycle behavior but not sync transport internals.

- `feedback.ts`
  - Sync-status badge updates, conflict dialog rendering, relative-time formatting, and user-facing/API error normalization.
  - Centralizes runtime feedback surfaces without owning sync transport or business validation rules.

- `runtime-actions.ts`
  - Create-success cleanup, sync retry/conflict handlers, active-tab control actions, and form-state sync scheduling.
  - Owns runtime-level event wiring that coordinates extracted controllers.

- `wizard-navigation.ts`
  - Step UI, navigation controls, and step transition orchestration.
  - Delegates validation and step-specific initialization through injected callbacks.

- `send-readiness.ts`
  - Review-step summary rendering and send validation messaging.
  - Does not own transport or sync behavior.

- `form-submit.ts`
  - Final save/send submit flow, draft readiness checks, and send transport orchestration.
  - Depends on sync and validation callbacks, but not on runtime-local globals.

## Boot Phase Order

1. Normalize page config.
2. Collect required and optional refs.
3. Construct pure services and controllers.
4. Restore persisted state through `WizardStateManager.start()`.
5. Render initial wizard UI.
6. Bind page events.
7. Start side effects:
   - active-tab ownership coordination
   - resumable state prompt evaluation
   - document loading and typeahead preload
   - review/send readiness when the user navigates into the review step

## Dependency Rules

- `agreement-form-runtime.ts` may compose internal modules but should not re-introduce feature-specific constructors with immediate side effects.
- `composition.ts` is the only internal module that may coordinate multiple feature controllers in one place; feature logic should remain inside the extracted modules.
- `refs.ts` is the default place for required DOM lookups. Dynamic lookups are allowed only when the target is optional or runtime-created.
- `ownership-ui.ts` depends on `refs.ts`, but not on sync/storage/network code.
- `sync-controller.ts` depends on `state-manager.ts`, `draft-sync-service.ts`, and `active-tab-controller.ts`.
- `active-tab-controller.ts` may perform storage, timer, and broadcast work only after `start()`.
- `draft-sync-service.ts` may perform network work only from explicit method calls.

## Current Extraction Scope

Phase 1 and Phase 2 boundaries are now explicit:

- refs/context/boot/runtime
- composition coordinator and shared UI helpers
- ownership UI
- telemetry
- state persistence
- draft transport
- active-tab ownership
- sync orchestration
- document selection
- participants
- field definitions and rules
- placement editing and auto-placement orchestration
- canonical form payload composition
- page state binding and initial UI restoration
- wizard step validation
- resume dialog and bootstrap reconciliation
- sync status and user-facing feedback surfaces
- runtime-level sync/bootstrap event wiring
- wizard navigation
- send readiness
- submit flow

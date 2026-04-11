# E-Sign Launch Window Playbook

This playbook defines rollback and incident response operations for the initial production launch window.

## Scope

- Track A flagship e-sign flows: upload, send, sign, finalize, artifact generation, delivery.
- Launch window command center roles: BE on-call, FE on-call, QA lead, Ops lead.

## Pre-Launch (T-60 to T-15 minutes)

1. Confirm current release artifact SHA and deployment manifest.
2. Confirm checklist readiness in `examples/esign/release/phase12_release_checklist.json`.
3. Verify alert channels and on-call routing are active.
4. Confirm rollback inputs from `docs/GUIDES_ESIGN_BACKUP_RESTORE_ROLLBACK.md` are current.
5. Verify incident escalation channel and primary incident commander assignment.

## Go-Live (T0 to T+30 minutes)

1. Deploy e-sign release to production.
2. Run smoke flow:
   - upload document
   - create draft agreement
   - send agreement
   - signer completes
   - executed + certificate artifacts available
3. Check SLO/alerts dashboard for immediate regressions.
4. Confirm no `high` severity security exceptions opened post-deploy.

## Incident Response During Launch Window

1. Create incident ticket and assign commander.
2. Capture correlation IDs and impacted agreement IDs.
3. Follow scenario-specific mitigations in `docs/GUIDES_ESIGN_OPERATOR_RUNBOOKS.md`.
4. If impact breaches launch thresholds, execute rollback decision gate.

## Rollback Decision Gate

Trigger rollback if any condition persists beyond agreed threshold:

1. SLO breach sustained with customer impact.
2. Artifact pipeline failures block completion workflows.
3. Security incident with unresolved high-severity exposure.

Rollback steps:

1. Freeze new send operations via feature control.
2. Execute release rollback plan from `docs/GUIDES_ESIGN_BACKUP_RESTORE_ROLLBACK.md`.
3. Validate post-rollback health checks and smoke flow.
4. Publish incident status update and next review time.

## Handoff and Closure

1. Produce launch summary with:
   - rollout timeline
   - incidents and mitigations
   - SLO status and alerts
2. Update release checklist evidence references.
3. Confirm ownership transfer to steady-state on-call.

# E-Sign Operator Runbooks

This runbook covers common operator incidents for the e-sign app.

## 1) Token Issues (`TOKEN_EXPIRED`, `TOKEN_REVOKED`, `TOKEN_INVALID`)

### Symptoms
- Signer sees `410`/expired or invalid token error in signer session/submit endpoints.
- Admin timeline shows repeated token validation failures.

### Checks
1. Confirm agreement status is still eligible for signing (`sent` or `in_progress`).
2. Confirm recipient has not already completed/declined.
3. Review recent token rotation or resend events in agreement timeline.

### Mitigation
1. Use admin panel action `rotate_token` for the recipient.
2. Trigger `resend` if signer still needs a fresh email link.
3. Verify no cross-tenant/org mismatch is present in request context.

## 1.1) Signer-Link Web Journey Failures (`/sign/:token`)

### Symptoms
- Recipient opens signer link but cannot load the session page.
- Session page loads, but submit flow fails before completion.

### Checks
1. Confirm `GET /sign/:token` returns the signer session page (not the token error template).
2. Confirm signer APIs succeed in sequence:
3. `POST /api/v1/esign/signing/consent/:token`
4. `POST /api/v1/esign/signing/field-values/signature/:token`
5. `POST /api/v1/esign/signing/submit/:token` (with `Idempotency-Key` header)
6. Confirm observability counters:
7. `signer_link_open_rate`
8. `signer_submit_conversion_rate`

### Mitigation
1. Rotate token and resend if session load fails due token lifecycle state.
2. Verify required fields/signature payload validity before submit retry.
3. Use correlation id from submit logs to trace state machine/audit transitions.

## 2) Resend Failures

### Symptoms
- Resend action returns typed error or job retries remain in `retrying`/`failed`.
- Delivery section on agreement detail shows terminal failure.

### Checks
1. Inspect agreement status and recipient role (`signer` vs `cc`).
2. Inspect job run records (`jobs.esign.email_send_signing_request`) and attempt counts.
3. Confirm provider failure class (transient vs permanent).

### Mitigation
1. For transient failures, re-queue resend and monitor retries.
2. For permanent failures (invalid address/access issue), correct recipient data and resend.
3. Capture correlation ID from logs/audit metadata for incident traceability.

## 3) Artifact Failures (executed/certificate generation)

### Symptoms
- Agreement reaches completion path but executed/certificate artifact status is `failed`.
- Job runs for PDF generation remain `failed` after retries.

### Checks
1. Inspect `jobs.esign.pdf_generate_executed` and `jobs.esign.pdf_generate_certificate`.
2. Verify object storage/security settings and renderer availability.
3. Confirm agreement is terminal (`completed`) and required signer data is present.

### Mitigation
1. Retry failed artifact jobs after root-cause correction.
2. Validate generated object keys/hash metadata after success.
3. Confirm `cc` distribution status once artifacts are available.

## 4) Telemetry Checklist For Any Incident

1. Capture `correlation_id` from API/command/job logs.
2. Check SLO widget and active alerts in dashboard.
3. Attach job run ID, agreement ID, and correlation ID in incident notes.

## 5) Google Integration Incidents (`esign_google`)

For OAuth/access-revoked/retry/Shared Drive troubleshooting steps, use:

- `docs/GUIDES_ESIGN_GOOGLE_TROUBLESHOOTING.md`

## 6) Provider Misconfiguration and Recovery

### Symptoms
- Startup validation fails for production profile provider settings.
- Google integration status shows degraded provider state.

### Checks
1. In production profile:
2. `ESIGN_EMAIL_TRANSPORT` is non-deterministic.
3. `ESIGN_GOOGLE_PROVIDER_MODE=real` when `ESIGN_GOOGLE_FEATURE_ENABLED=true`.
4. Required Google env vars exist: `ESIGN_GOOGLE_CLIENT_ID`, `ESIGN_GOOGLE_CLIENT_SECRET`.
5. Confirm `/admin/api/v1/esign/integrations/google/status` includes healthy provider status.

### Mitigation
1. Correct runtime env configuration and restart service.
2. For local/test deterministic flows, set explicit opt-in:
3. `ESIGN_GOOGLE_PROVIDER_MODE=deterministic`
4. If provider health remains degraded, disable `esign_google` temporarily and follow incident escalation.

## 7) Signer Runtime (V2 Only)

**Legacy Mode Removed**: As of Track C v2 production cutover, all legacy signer
runtime paths have been removed. The v1 recipient model, legacy signer mode,
runtime kill-switches, and `?flow=` URL parameter overrides no longer exist in
the codebase. All signer routing uses the unified v2 participant model with
stage-based orchestration.

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ESIGN_PUBLIC_BASE_URL` | Base URL for signer links in emails | (required) |

### Routing Behavior

1. **Entry Point (`/sign/:token`)**
   - Always serves the unified signer review experience.
2. **Review Route (`/sign/:token/review`)**
   - Canonical signing surface for consent, field completion, and submit.
3. **Terminal Routes**
   - Completion: `/sign/:token/complete`
   - Declined: `/sign/:token/declined`

### Troubleshooting

1. Verify signer links resolve to `/sign/:token` or `/sign/:token/review`.
2. Confirm `ESIGN_PUBLIC_BASE_URL` is set correctly for environment.
3. If a signer page fails to load, inspect runtime logs for token validation,
   session boot, and viewer bootstrap errors.

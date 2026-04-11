# E-Sign Google Integration Troubleshooting

This guide covers operator troubleshooting for the optional `esign_google` backend integration.

## 1) OAuth Connect Failures

### Symptoms
- Admin connect endpoint fails with `GOOGLE_PERMISSION_DENIED` or `GOOGLE_SCOPE_VIOLATION`.
- Status endpoint remains disconnected after connect attempt.

### Checks
1. Confirm feature gate `esign_google` is enabled.
2. Confirm requested scopes are least-privilege:
3. `https://www.googleapis.com/auth/drive.readonly`
4. `https://www.googleapis.com/auth/userinfo.email`
5. Confirm OAuth client redirect URI matches runtime configuration.
6. Confirm provider mode and runtime profile compatibility:
7. Production requires `ESIGN_GOOGLE_PROVIDER_MODE=real`.

### Mitigation
1. Re-run connect flow with corrected OAuth client/scopes.
2. If scope mismatch persists, disconnect and reconnect to force clean token issuance.
3. Capture API correlation ID and attach it to incident notes.

## 2) Access Revoked / Disconnected

### Symptoms
- Search/browse/import calls fail with `GOOGLE_ACCESS_REVOKED`.
- Status endpoint returns disconnected state.

### Checks
1. Verify stored integration credential exists for `(tenant_id, org_id, user_id, provider=google)`.
2. Verify token payload decrypts successfully and is non-empty.
3. Confirm Google account/app access has not been revoked externally.

### Mitigation
1. Run disconnect to clear stale credentials.
2. Reconnect OAuth from admin integration settings.
3. Re-run failed search/import action after reconnect.

## 3) Import Retry / Rate-Limit Failures

### Symptoms
- Import fails with `GOOGLE_RATE_LIMITED`.
- `jobs.esign.google_drive_import` shows failure spikes.

### Checks
1. Review dashboard alerts:
2. `google.import_failures_detected`
3. `google.auth_churn_high`
4. Validate provider/job failure rates in observability snapshot payload.

### Mitigation
1. Retry import after provider cooldown window.
2. Batch imports with reduced concurrency if repeated rate limits occur.
3. Escalate to provider quota review if failures persist.

## 4) Permission-Denied Edge Cases (Including Shared Drive)

### Symptoms
- Browse/search works, but import/export fails with `GOOGLE_PERMISSION_DENIED`.
- Shared Drive files are visible but export is denied.

### Checks
1. Confirm connected account has export permission for target file.
2. Confirm file is in an accessible Drive/Shared Drive location.
3. Validate selected file ID still exists and has not moved to restricted scope.

### Mitigation
1. Re-select file from accessible folder or Shared Drive location.
2. Request access grant from Shared Drive/file owner.
3. Re-run import after access propagation.

## 5) Credential Key Rotation Runbook

Use the Google integration service keyring cipher and credential re-encryption path:

1. Deploy runtime with new active key id/material while keeping previous key available for decrypt fallback.
2. Execute scoped credential rotation using `RotateCredentialEncryption`.
3. Verify persisted encrypted token values are written with the new key id prefix.
4. Validate search/import flows after rotation.

## 6) Provider Degraded Mode / Health Check Failures

### Symptoms
- Google status endpoint returns `degraded=true`.
- Connect/search/browse/import fail with `GOOGLE_PROVIDER_DEGRADED`.

### Checks
1. Confirm configured health endpoint is reachable (`ESIGN_GOOGLE_HEALTH_ENDPOINT` or default `https://www.googleapis.com/generate_204`).
2. Confirm token/revoke/drive endpoints are correct and reachable from runtime network.
3. Confirm provider mode is `real` in production and `deterministic` only in explicit local/test usage.

### Mitigation
1. Restore network/provider endpoint availability and retry operation.
2. If outage persists, keep integration feature enabled but treat Google import as degraded path and communicate user impact.
3. After recovery, validate with status endpoint then run browse/import smoke checks.

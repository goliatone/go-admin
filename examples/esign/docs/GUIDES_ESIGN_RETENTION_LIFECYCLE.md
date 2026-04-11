# E-Sign Retention and Data Lifecycle Checks

This guide validates retention policy behavior for artifacts, logs, and PII metadata.

## 1) Retention Controls

Current defaults in `examples/esign/stores/data_policy.go`:
- Artifact TTL: `365d`
- Log TTL: `180d`
- PII metadata TTL: `90d`

PII minimization rules:
- IP addresses are masked (`/24` IPv4, `/64` IPv6).
- user-agent is truncated.
- direct PII fields (email/name/raw signature payload) are removed from minimized metadata outputs.

## 2) Automated Lifecycle Validation

Run:

```sh
"/Users/goliatone/.g/go/bin/go" test ./examples/esign/stores -run 'TestRetentionPolicyLifecycleControls|TestMinimizeAuditMetadata|TestRetentionLifecyclePeriodicCheck'
```

Validated outcomes:
- TTL boundaries correctly mark records due for purge.
- Metadata minimization preserves required audit fields only.
- Periodic lifecycle sweep (`EvaluateLifecycleCheck`) reports due counts for artifacts/logs/PII.

## 3) Periodic Ops Check

1. Run retention validation tests on each release candidate.
2. Execute scheduled lifecycle sweep and collect due-count report.
3. Confirm purge jobs/processes match due-count expectations.
4. Record audit trail for retention checks (date, build SHA, operator).

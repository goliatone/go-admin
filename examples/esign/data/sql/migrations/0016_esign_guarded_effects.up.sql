ALTER TABLE agreements
    ADD COLUMN delivery_status TEXT NOT NULL DEFAULT '';

ALTER TABLE agreements
    ADD COLUMN delivery_effect_id TEXT NOT NULL DEFAULT '';

ALTER TABLE agreements
    ADD COLUMN last_delivery_error TEXT NOT NULL DEFAULT '';

ALTER TABLE agreements
    ADD COLUMN last_delivery_attempt_at TIMESTAMP NULL;

ALTER TABLE signing_tokens
    ADD COLUMN activated_at TIMESTAMP NULL;

CREATE TABLE guarded_effects (
    effect_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    subject_type TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL DEFAULT '',
    correlation_id TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 0,
    guard_policy TEXT NOT NULL DEFAULT '',
    prepare_payload_json TEXT NOT NULL DEFAULT '',
    dispatch_payload_json TEXT NOT NULL DEFAULT '',
    result_payload_json TEXT NOT NULL DEFAULT '',
    error_json TEXT NOT NULL DEFAULT '',
    dispatch_id TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dispatched_at TIMESTAMP NULL,
    finalized_at TIMESTAMP NULL,
    aborted_at TIMESTAMP NULL,
    retry_at TIMESTAMP NULL,
    CONSTRAINT uq_guarded_effects_scope_effect UNIQUE (tenant_id, org_id, effect_id)
);

CREATE UNIQUE INDEX idx_guarded_effects_scope_idempotency
    ON guarded_effects (tenant_id, org_id, idempotency_key)
    WHERE idempotency_key <> '';

CREATE INDEX idx_guarded_effects_scope_subject
    ON guarded_effects (tenant_id, org_id, subject_type, subject_id, created_at DESC);

CREATE INDEX idx_guarded_effects_scope_status
    ON guarded_effects (tenant_id, org_id, status, updated_at DESC);

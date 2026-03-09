CREATE TABLE IF NOT EXISTS agreement_reminder_states (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    agreement_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    sent_count INTEGER NOT NULL DEFAULT 0 CHECK (sent_count >= 0),
    first_sent_at TIMESTAMP NULL,
    last_sent_at TIMESTAMP NULL,
    last_viewed_at TIMESTAMP NULL,
    last_manual_resend_at TIMESTAMP NULL,
    next_due_at TIMESTAMP NULL,
    last_reason_code TEXT NOT NULL DEFAULT '',
    last_error TEXT NOT NULL DEFAULT '',
    locked_by TEXT NOT NULL DEFAULT '',
    lock_until TIMESTAMP NULL,
    last_evaluated_at TIMESTAMP NULL,
    last_attempted_send_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT uq_agreement_reminder_states_scope_target UNIQUE (tenant_id, org_id, agreement_id, recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_agreement_reminder_states_scope_claim
    ON agreement_reminder_states (tenant_id, org_id, status, next_due_at, lock_until);

CREATE INDEX IF NOT EXISTS idx_agreement_reminder_states_scope_agreement
    ON agreement_reminder_states (tenant_id, org_id, agreement_id, recipient_id);

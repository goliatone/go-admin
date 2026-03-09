DROP TABLE IF EXISTS agreement_reminder_states;

CREATE TABLE agreement_reminder_states (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    agreement_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'terminal')),
    terminal_reason TEXT NOT NULL DEFAULT '',
    policy_version TEXT NOT NULL DEFAULT 'r1',
    sent_count INTEGER NOT NULL DEFAULT 0 CHECK (sent_count >= 0),
    first_sent_at TIMESTAMP NULL,
    last_sent_at TIMESTAMP NULL,
    last_viewed_at TIMESTAMP NULL,
    last_manual_resend_at TIMESTAMP NULL,
    next_due_at TIMESTAMP NULL,
    last_reason_code TEXT NOT NULL DEFAULT '',
    last_error_code TEXT NOT NULL DEFAULT '',
    last_error_internal_encrypted TEXT NOT NULL DEFAULT '',
    last_error_internal_expires_at TIMESTAMP NULL,
    lease_seq INTEGER NOT NULL DEFAULT 0 CHECK (lease_seq >= 0),
    claimed_at TIMESTAMP NULL,
    last_heartbeat_at TIMESTAMP NULL,
    sweep_id TEXT NOT NULL DEFAULT '',
    worker_id TEXT NOT NULL DEFAULT '',
    last_evaluated_at TIMESTAMP NULL,
    last_attempted_send_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT uq_agreement_reminder_states_scope_target UNIQUE (tenant_id, org_id, agreement_id, recipient_id),
    CONSTRAINT ck_agreement_reminder_active_next_due
        CHECK (
            (status = 'active' AND next_due_at IS NOT NULL) OR
            (status != 'active' AND next_due_at IS NULL)
        )
);

CREATE INDEX IF NOT EXISTS idx_agreement_reminder_states_scope_claim
    ON agreement_reminder_states (tenant_id, org_id, status, next_due_at, last_heartbeat_at);

CREATE INDEX IF NOT EXISTS idx_agreement_reminder_states_scope_agreement
    ON agreement_reminder_states (tenant_id, org_id, agreement_id, recipient_id);

CREATE INDEX IF NOT EXISTS idx_agreement_reminder_states_error_ttl
    ON agreement_reminder_states (tenant_id, org_id, last_error_internal_expires_at);

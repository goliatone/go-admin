ALTER TABLE agreement_review_participants ADD COLUMN IF NOT EXISTS participant_type TEXT NOT NULL DEFAULT 'recipient';
ALTER TABLE agreement_review_participants ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '';
ALTER TABLE agreement_review_participants ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL DEFAULT '';

ALTER TABLE agreement_review_participants
    DROP CONSTRAINT IF EXISTS uq_agreement_review_participants_recipient;

DROP INDEX IF EXISTS uq_agreement_review_participants_recipient;
DROP INDEX IF EXISTS uq_agreement_review_participants_external_email;

CREATE UNIQUE INDEX IF NOT EXISTS uq_agreement_review_participants_recipient
ON agreement_review_participants (tenant_id, org_id, review_id, recipient_id)
WHERE recipient_id <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_agreement_review_participants_external_email
ON agreement_review_participants (tenant_id, org_id, review_id, email)
WHERE participant_type = 'external' AND email <> '';

CREATE TABLE IF NOT EXISTS review_session_tokens (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    agreement_id TEXT NOT NULL,
    review_id TEXT NOT NULL,
    participant_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_review_session_tokens_agreement FOREIGN KEY (agreement_id) REFERENCES agreements(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_session_tokens_review FOREIGN KEY (review_id) REFERENCES agreement_reviews(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_session_tokens_participant FOREIGN KEY (participant_id) REFERENCES agreement_review_participants(id) ON DELETE CASCADE,
    CONSTRAINT uq_review_session_tokens_token_hash UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS idx_review_session_tokens_scope_participant
ON review_session_tokens (tenant_id, org_id, agreement_id, participant_id, created_at);

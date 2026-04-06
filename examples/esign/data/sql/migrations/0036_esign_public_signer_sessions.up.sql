CREATE TABLE public_signer_session_tokens (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    subject_kind TEXT NOT NULL,
    agreement_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL DEFAULT '',
    review_id TEXT NOT NULL DEFAULT '',
    participant_id TEXT NOT NULL DEFAULT '',
    signing_token_id TEXT NOT NULL DEFAULT '',
    review_token_id TEXT NOT NULL DEFAULT '',
    token_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_public_signer_sessions_agreement FOREIGN KEY (agreement_id) REFERENCES agreements(id) ON DELETE CASCADE,
    CONSTRAINT uq_public_signer_sessions_token_hash UNIQUE (token_hash)
);

CREATE INDEX idx_public_signer_sessions_signer_scope
ON public_signer_session_tokens (tenant_id, org_id, agreement_id, recipient_id, created_at);

CREATE INDEX idx_public_signer_sessions_review_scope
ON public_signer_session_tokens (tenant_id, org_id, agreement_id, participant_id, created_at);

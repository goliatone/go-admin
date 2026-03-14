PRAGMA foreign_keys=OFF;

ALTER TABLE signing_tokens RENAME TO signing_tokens_old;

CREATE TABLE signing_tokens (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    agreement_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'superseded', 'aborted', 'revoked', 'expired')),
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activated_at TIMESTAMP NULL,
    CONSTRAINT uq_signing_tokens_scope_id UNIQUE (tenant_id, org_id, id),
    CONSTRAINT uq_signing_tokens_hash UNIQUE (token_hash),
    CONSTRAINT fk_signing_tokens_agreement_scope FOREIGN KEY (tenant_id, org_id, agreement_id)
        REFERENCES agreements (tenant_id, org_id, id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_signing_tokens_recipient_scope FOREIGN KEY (tenant_id, org_id, recipient_id)
        REFERENCES recipients (tenant_id, org_id, id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

INSERT INTO signing_tokens (
    id,
    tenant_id,
    org_id,
    agreement_id,
    recipient_id,
    token_hash,
    status,
    expires_at,
    revoked_at,
    created_at,
    activated_at
)
SELECT
    id,
    tenant_id,
    org_id,
    agreement_id,
    recipient_id,
    token_hash,
    status,
    expires_at,
    revoked_at,
    created_at,
    activated_at
FROM signing_tokens_old;

DROP TABLE signing_tokens_old;

CREATE INDEX IF NOT EXISTS idx_signing_tokens_scope_expiry
    ON signing_tokens (tenant_id, org_id, expires_at);

PRAGMA foreign_keys=ON;

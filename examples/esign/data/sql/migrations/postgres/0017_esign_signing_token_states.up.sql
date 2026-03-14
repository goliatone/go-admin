ALTER TABLE signing_tokens
    DROP CONSTRAINT IF EXISTS signing_tokens_status_check;

ALTER TABLE signing_tokens
    DROP CONSTRAINT IF EXISTS fk_signing_tokens_recipient_scope;

ALTER TABLE signing_tokens
    ADD CONSTRAINT signing_tokens_status_check
    CHECK (status IN ('pending', 'active', 'superseded', 'aborted', 'revoked', 'expired'));

ALTER TABLE signing_tokens
    ADD CONSTRAINT fk_signing_tokens_recipient_scope
    FOREIGN KEY (tenant_id, org_id, recipient_id)
    REFERENCES participants (tenant_id, org_id, id)
    ON UPDATE CASCADE
    ON DELETE CASCADE;

DROP INDEX IF EXISTS ux_translation_exchange_apply_ledger_scope_payload;
CREATE UNIQUE INDEX IF NOT EXISTS ux_translation_exchange_apply_ledger_scope_payload
    ON translation_exchange_apply_ledger(tenant_id, org_id, linkage_key, payload_hash);

ALTER TABLE translation_exchange_apply_ledger DROP COLUMN lease_expires_at;
ALTER TABLE translation_exchange_apply_ledger DROP COLUMN claim_token;
ALTER TABLE translation_exchange_apply_ledger DROP COLUMN status;

DROP INDEX IF EXISTS ux_exchange_jobs_active_scope_request_hash;
CREATE INDEX IF NOT EXISTS ix_exchange_jobs_scope_request_hash
    ON exchange_jobs(tenant_id, org_id, created_by, kind, request_hash);

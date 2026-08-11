DROP INDEX IF EXISTS ix_exchange_jobs_scope_request_hash;

WITH ranked_jobs AS (
    SELECT job_id,
           ROW_NUMBER() OVER (
               PARTITION BY COALESCE(tenant_id, ''), COALESCE(org_id, ''), created_by, kind, request_hash
               ORDER BY created_at ASC, job_id ASC
           ) AS row_number
    FROM exchange_jobs
    WHERE request_hash IS NOT NULL
      AND request_hash <> ''
      AND deleted_at IS NULL
)
UPDATE exchange_jobs
SET request_hash = NULL
WHERE job_id IN (SELECT job_id FROM ranked_jobs WHERE row_number > 1);

CREATE UNIQUE INDEX IF NOT EXISTS ux_exchange_jobs_active_scope_request_hash
    ON exchange_jobs(COALESCE(tenant_id, ''), COALESCE(org_id, ''), created_by, kind, request_hash)
    WHERE request_hash IS NOT NULL AND request_hash <> '' AND deleted_at IS NULL;

ALTER TABLE translation_exchange_apply_ledger ADD COLUMN status TEXT NOT NULL DEFAULT 'applied';
ALTER TABLE translation_exchange_apply_ledger ADD COLUMN claim_token TEXT;
ALTER TABLE translation_exchange_apply_ledger ADD COLUMN lease_expires_at TEXT;

DROP INDEX IF EXISTS ux_translation_exchange_apply_ledger_scope_payload;

WITH ranked_ledger AS (
    SELECT ledger_id,
           ROW_NUMBER() OVER (
               PARTITION BY COALESCE(tenant_id, ''), COALESCE(org_id, ''), linkage_key, payload_hash
               ORDER BY applied_at ASC, ledger_id ASC
           ) AS row_number
    FROM translation_exchange_apply_ledger
)
DELETE FROM translation_exchange_apply_ledger
WHERE ledger_id IN (SELECT ledger_id FROM ranked_ledger WHERE row_number > 1);

CREATE UNIQUE INDEX IF NOT EXISTS ux_translation_exchange_apply_ledger_scope_payload
    ON translation_exchange_apply_ledger(COALESCE(tenant_id, ''), COALESCE(org_id, ''), linkage_key, payload_hash);

PRAGMA foreign_keys=OFF;

ALTER TABLE signature_artifacts RENAME TO signature_artifacts_old;

CREATE TABLE signature_artifacts (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    agreement_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    artifact_type TEXT NOT NULL CHECK (artifact_type IN ('typed', 'drawn')),
    object_key TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_signature_artifacts_scope_id UNIQUE (tenant_id, org_id, id),
    CONSTRAINT fk_signature_artifacts_agreement_scope FOREIGN KEY (tenant_id, org_id, agreement_id)
        REFERENCES agreements (tenant_id, org_id, id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_signature_artifacts_recipient_scope FOREIGN KEY (tenant_id, org_id, recipient_id)
        REFERENCES recipients (tenant_id, org_id, id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

INSERT INTO signature_artifacts (
    id, tenant_id, org_id, agreement_id, recipient_id, artifact_type, object_key, sha256, created_at
)
SELECT
    id, tenant_id, org_id, agreement_id, recipient_id, artifact_type, object_key, sha256, created_at
FROM signature_artifacts_old;

DROP TABLE signature_artifacts_old;

CREATE INDEX IF NOT EXISTS idx_signature_artifacts_scope_agreement
    ON signature_artifacts (tenant_id, org_id, agreement_id, created_at DESC);

ALTER TABLE field_values RENAME TO field_values_old;

CREATE TABLE field_values (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    agreement_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    field_id TEXT NOT NULL,
    value_text TEXT NOT NULL DEFAULT '',
    value_bool INTEGER NULL CHECK (value_bool IN (0, 1)),
    signature_artifact_id TEXT NULL,
    version BIGINT NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_field_values_scope_id UNIQUE (tenant_id, org_id, id),
    CONSTRAINT uq_field_values_scope_field_recipient UNIQUE (tenant_id, org_id, agreement_id, recipient_id, field_id),
    CONSTRAINT fk_field_values_agreement_scope FOREIGN KEY (tenant_id, org_id, agreement_id)
        REFERENCES agreements (tenant_id, org_id, id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_field_values_recipient_scope FOREIGN KEY (tenant_id, org_id, recipient_id)
        REFERENCES recipients (tenant_id, org_id, id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_field_values_field_scope FOREIGN KEY (tenant_id, org_id, field_id)
        REFERENCES fields (tenant_id, org_id, id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_field_values_signature_scope FOREIGN KEY (tenant_id, org_id, signature_artifact_id)
        REFERENCES signature_artifacts (tenant_id, org_id, id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

INSERT INTO field_values (
    id, tenant_id, org_id, agreement_id, recipient_id, field_id, value_text, value_bool,
    signature_artifact_id, version, created_at, updated_at
)
SELECT
    id, tenant_id, org_id, agreement_id, recipient_id, field_id, value_text, value_bool,
    signature_artifact_id, version, created_at, updated_at
FROM field_values_old;

DROP TABLE field_values_old;

CREATE INDEX IF NOT EXISTS idx_field_values_scope_agreement
    ON field_values (tenant_id, org_id, agreement_id, recipient_id);

ALTER TABLE email_logs RENAME TO email_logs_old;

CREATE TABLE email_logs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    agreement_id TEXT NOT NULL,
    recipient_id TEXT NULL,
    template_code TEXT NOT NULL,
    provider_message_id TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
    failure_reason TEXT NOT NULL DEFAULT '',
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    attempt_count INTEGER NOT NULL DEFAULT 1,
    max_attempts INTEGER NOT NULL DEFAULT 1,
    correlation_id TEXT NOT NULL DEFAULT '',
    next_retry_at TIMESTAMP NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT '1970-01-01T00:00:00Z',
    CONSTRAINT uq_email_logs_scope_id UNIQUE (tenant_id, org_id, id),
    CONSTRAINT fk_email_logs_agreement_scope FOREIGN KEY (tenant_id, org_id, agreement_id)
        REFERENCES agreements (tenant_id, org_id, id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_email_logs_recipient_scope FOREIGN KEY (tenant_id, org_id, recipient_id)
        REFERENCES recipients (tenant_id, org_id, id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

INSERT INTO email_logs (
    id, tenant_id, org_id, agreement_id, recipient_id, template_code, provider_message_id,
    status, failure_reason, sent_at, created_at, attempt_count, max_attempts, correlation_id,
    next_retry_at, updated_at
)
SELECT
    id, tenant_id, org_id, agreement_id, recipient_id, template_code, provider_message_id,
    status, failure_reason, sent_at, created_at, attempt_count, max_attempts, correlation_id,
    next_retry_at, updated_at
FROM email_logs_old;

DROP TABLE email_logs_old;

CREATE INDEX IF NOT EXISTS idx_email_logs_scope_status_created
    ON email_logs (tenant_id, org_id, status, created_at DESC);

PRAGMA foreign_keys=ON;

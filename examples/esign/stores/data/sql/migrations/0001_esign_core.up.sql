CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    source_object_key TEXT NOT NULL,
    source_sha256 TEXT NOT NULL,
    size_bytes BIGINT NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
    page_count INTEGER NOT NULL DEFAULT 0 CHECK (page_count >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_documents_scope_id UNIQUE (tenant_id, org_id, id)
);

CREATE INDEX IF NOT EXISTS idx_documents_scope_created_at
    ON documents (tenant_id, org_id, created_at DESC);

CREATE TABLE IF NOT EXISTS agreements (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'in_progress', 'completed', 'voided', 'declined', 'expired')),
    title TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL DEFAULT '',
    version BIGINT NOT NULL DEFAULT 1 CHECK (version > 0),
    sent_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    voided_at TIMESTAMP NULL,
    declined_at TIMESTAMP NULL,
    expired_at TIMESTAMP NULL,
    created_by_user_id TEXT NOT NULL DEFAULT '',
    updated_by_user_id TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_agreements_scope_id UNIQUE (tenant_id, org_id, id),
    CONSTRAINT fk_agreements_document_scope FOREIGN KEY (tenant_id, org_id, document_id)
        REFERENCES documents (tenant_id, org_id, id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_agreements_scope_status
    ON agreements (tenant_id, org_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS recipients (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    agreement_id TEXT NOT NULL,
    email TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL CHECK (role IN ('signer', 'cc')),
    signing_order INTEGER NOT NULL CHECK (signing_order > 0),
    first_view_at TIMESTAMP NULL,
    last_view_at TIMESTAMP NULL,
    declined_at TIMESTAMP NULL,
    decline_reason TEXT NOT NULL DEFAULT '',
    completed_at TIMESTAMP NULL,
    version BIGINT NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_recipients_scope_id UNIQUE (tenant_id, org_id, id),
    CONSTRAINT uq_recipients_scope_agreement_email UNIQUE (tenant_id, org_id, agreement_id, email),
    CONSTRAINT uq_recipients_scope_agreement_order UNIQUE (tenant_id, org_id, agreement_id, signing_order),
    CONSTRAINT fk_recipients_agreement_scope FOREIGN KEY (tenant_id, org_id, agreement_id)
        REFERENCES agreements (tenant_id, org_id, id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_recipients_scope_role
    ON recipients (tenant_id, org_id, agreement_id, role, signing_order);

CREATE TABLE IF NOT EXISTS signing_tokens (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    agreement_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
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

CREATE INDEX IF NOT EXISTS idx_signing_tokens_scope_expiry
    ON signing_tokens (tenant_id, org_id, expires_at);

CREATE TABLE IF NOT EXISTS fields (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    agreement_id TEXT NOT NULL,
    recipient_id TEXT NULL,
    field_type TEXT NOT NULL CHECK (field_type IN ('signature', 'name', 'date_signed', 'text', 'checkbox', 'initials')),
    page_number INTEGER NOT NULL CHECK (page_number > 0),
    pos_x REAL NOT NULL DEFAULT 0,
    pos_y REAL NOT NULL DEFAULT 0,
    width REAL NOT NULL DEFAULT 0,
    height REAL NOT NULL DEFAULT 0,
    required INTEGER NOT NULL DEFAULT 0 CHECK (required IN (0, 1)),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_fields_scope_id UNIQUE (tenant_id, org_id, id),
    CONSTRAINT fk_fields_agreement_scope FOREIGN KEY (tenant_id, org_id, agreement_id)
        REFERENCES agreements (tenant_id, org_id, id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_fields_recipient_scope FOREIGN KEY (tenant_id, org_id, recipient_id)
        REFERENCES recipients (tenant_id, org_id, id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_fields_scope_agreement
    ON fields (tenant_id, org_id, agreement_id, page_number);

CREATE TABLE IF NOT EXISTS signature_artifacts (
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

CREATE INDEX IF NOT EXISTS idx_signature_artifacts_scope_agreement
    ON signature_artifacts (tenant_id, org_id, agreement_id, created_at DESC);

CREATE TABLE IF NOT EXISTS field_values (
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

CREATE INDEX IF NOT EXISTS idx_field_values_scope_agreement
    ON field_values (tenant_id, org_id, agreement_id, recipient_id);

CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    agreement_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    actor_type TEXT NOT NULL,
    actor_id TEXT NOT NULL DEFAULT '',
    ip_address TEXT NOT NULL DEFAULT '',
    user_agent TEXT NOT NULL DEFAULT '',
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_audit_events_scope_id UNIQUE (tenant_id, org_id, id),
    CONSTRAINT fk_audit_events_agreement_scope FOREIGN KEY (tenant_id, org_id, agreement_id)
        REFERENCES agreements (tenant_id, org_id, id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_audit_events_scope_agreement_created
    ON audit_events (tenant_id, org_id, agreement_id, created_at DESC);

CREATE TABLE IF NOT EXISTS email_logs (
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

CREATE INDEX IF NOT EXISTS idx_email_logs_scope_status_created
    ON email_logs (tenant_id, org_id, status, created_at DESC);

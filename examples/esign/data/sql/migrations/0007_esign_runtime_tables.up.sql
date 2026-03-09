CREATE TABLE IF NOT EXISTS signer_profiles (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    profile_key TEXT NOT NULL,
    full_name TEXT NOT NULL DEFAULT '',
    initials TEXT NOT NULL DEFAULT '',
    typed_signature TEXT NOT NULL DEFAULT '',
    drawn_signature_data_url TEXT NOT NULL DEFAULT '',
    drawn_initials_data_url TEXT NOT NULL DEFAULT '',
    remember BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    CONSTRAINT uq_signer_profiles_scope_subject_key UNIQUE (tenant_id, org_id, subject, profile_key)
);

CREATE INDEX IF NOT EXISTS idx_signer_profiles_scope_subject_expires
    ON signer_profiles (tenant_id, org_id, subject, expires_at DESC);

CREATE TABLE IF NOT EXISTS saved_signer_signatures (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    signature_type TEXT NOT NULL CHECK (signature_type IN ('signature', 'initials')),
    label TEXT NOT NULL DEFAULT '',
    object_key TEXT NOT NULL,
    thumbnail_data_url TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_saved_signer_signatures_scope_subject_type
    ON saved_signer_signatures (tenant_id, org_id, subject, signature_type, created_at DESC);

CREATE TABLE IF NOT EXISTS agreement_artifacts (
    agreement_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    executed_object_key TEXT NOT NULL DEFAULT '',
    executed_sha256 TEXT NOT NULL DEFAULT '',
    certificate_object_key TEXT NOT NULL DEFAULT '',
    certificate_sha256 TEXT NOT NULL DEFAULT '',
    correlation_id TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_agreement_artifacts_agreement_scope FOREIGN KEY (tenant_id, org_id, agreement_id)
      REFERENCES agreements (tenant_id, org_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS job_runs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    job_name TEXT NOT NULL,
    dedupe_key TEXT NOT NULL,
    agreement_id TEXT NOT NULL DEFAULT '',
    recipient_id TEXT NULL,
    correlation_id TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    attempt_count INTEGER NOT NULL DEFAULT 1 CHECK (attempt_count > 0),
    max_attempts INTEGER NOT NULL DEFAULT 1 CHECK (max_attempts > 0),
    last_error TEXT NOT NULL DEFAULT '',
    next_retry_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT uq_job_runs_scope_dedupe UNIQUE (tenant_id, org_id, job_name, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_job_runs_scope_status_updated
    ON job_runs (tenant_id, org_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS google_import_runs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    google_file_id TEXT NOT NULL,
    source_version_hint TEXT NOT NULL DEFAULT '',
    dedupe_key TEXT NOT NULL,
    document_title TEXT NOT NULL DEFAULT '',
    agreement_title TEXT NOT NULL DEFAULT '',
    created_by_user_id TEXT NOT NULL DEFAULT '',
    correlation_id TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    document_id TEXT NOT NULL DEFAULT '',
    agreement_id TEXT NOT NULL DEFAULT '',
    source_mime_type TEXT NOT NULL DEFAULT '',
    ingestion_mode TEXT NOT NULL DEFAULT '',
    error_code TEXT NOT NULL DEFAULT '',
    error_message TEXT NOT NULL DEFAULT '',
    error_details_json TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    CONSTRAINT uq_google_import_runs_scope_dedupe UNIQUE (tenant_id, org_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_google_import_runs_scope_status_updated
    ON google_import_runs (tenant_id, org_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS outbox_messages (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    message_key TEXT NOT NULL DEFAULT '',
    payload_json TEXT NOT NULL DEFAULT '',
    headers_json TEXT NOT NULL DEFAULT '',
    correlation_id TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    max_attempts INTEGER NOT NULL DEFAULT 10 CHECK (max_attempts > 0),
    last_error TEXT NOT NULL DEFAULT '',
    available_at TIMESTAMP NOT NULL,
    locked_at TIMESTAMP NULL,
    locked_by TEXT NOT NULL DEFAULT '',
    published_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_outbox_messages_scope_status_available
    ON outbox_messages (tenant_id, org_id, status, available_at, created_at);

CREATE TABLE IF NOT EXISTS placement_runs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    agreement_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT '',
    reason_code TEXT NOT NULL DEFAULT '',
    resolver_order_json TEXT NOT NULL DEFAULT '[]',
    executed_resolvers_json TEXT NOT NULL DEFAULT '[]',
    resolver_scores_json TEXT NOT NULL DEFAULT '[]',
    suggestions_json TEXT NOT NULL DEFAULT '[]',
    selected_suggestion_ids_json TEXT NOT NULL DEFAULT '[]',
    unresolved_definition_ids_json TEXT NOT NULL DEFAULT '[]',
    selected_source TEXT NOT NULL DEFAULT '',
    policy_json TEXT NOT NULL DEFAULT '',
    max_budget DOUBLE PRECISION NOT NULL DEFAULT 0,
    budget_used DOUBLE PRECISION NOT NULL DEFAULT 0,
    max_time_ms BIGINT NOT NULL DEFAULT 0,
    elapsed_ms BIGINT NOT NULL DEFAULT 0,
    manual_override_count INTEGER NOT NULL DEFAULT 0,
    created_by_user_id TEXT NOT NULL DEFAULT '',
    version BIGINT NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP NULL,
    CONSTRAINT fk_placement_runs_agreement_scope FOREIGN KEY (tenant_id, org_id, agreement_id)
      REFERENCES agreements (tenant_id, org_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_placement_runs_scope_agreement_created
    ON placement_runs (tenant_id, org_id, agreement_id, created_at DESC);

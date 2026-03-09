CREATE TABLE integration_mapping_specs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    name TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    external_schema_json TEXT NOT NULL DEFAULT '{}',
    rules_json TEXT NOT NULL DEFAULT '[]',
    compiled_json TEXT NOT NULL DEFAULT '{}',
    compiled_hash TEXT NOT NULL DEFAULT '',
    published_at TIMESTAMP NULL,
    created_by_user_id TEXT NOT NULL DEFAULT '',
    updated_by_user_id TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT uq_integration_mapping_specs_scope UNIQUE (tenant_id, org_id, provider, name, version)
);

CREATE INDEX idx_integration_mapping_specs_scope_provider
    ON integration_mapping_specs (tenant_id, org_id, provider, status);

CREATE TABLE integration_bindings (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    entity_kind TEXT NOT NULL,
    external_id TEXT NOT NULL,
    internal_id TEXT NOT NULL,
    provenance_json TEXT NOT NULL DEFAULT '{}',
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT uq_integration_bindings_scope_external UNIQUE (tenant_id, org_id, provider, entity_kind, external_id)
);

CREATE INDEX idx_integration_bindings_scope_internal
    ON integration_bindings (tenant_id, org_id, provider, entity_kind, internal_id);

CREATE TABLE integration_sync_runs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    direction TEXT NOT NULL,
    mapping_spec_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    cursor TEXT NOT NULL DEFAULT '',
    last_error TEXT NOT NULL DEFAULT '',
    attempt_count INTEGER NOT NULL DEFAULT 1 CHECK (attempt_count > 0),
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP NULL,
    created_by_user_id TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_integration_sync_runs_mapping_scope FOREIGN KEY (tenant_id, org_id, mapping_spec_id)
      REFERENCES integration_mapping_specs (tenant_id, org_id, id)
      ON DELETE RESTRICT
);

CREATE INDEX idx_integration_sync_runs_scope_status
    ON integration_sync_runs (tenant_id, org_id, provider, status, started_at);

CREATE TABLE integration_checkpoints (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    run_id TEXT NOT NULL,
    checkpoint_key TEXT NOT NULL,
    cursor TEXT NOT NULL DEFAULT '',
    payload_json TEXT NOT NULL DEFAULT '{}',
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT uq_integration_checkpoints_scope UNIQUE (tenant_id, org_id, run_id, checkpoint_key),
    CONSTRAINT fk_integration_checkpoints_run_scope FOREIGN KEY (tenant_id, org_id, run_id)
      REFERENCES integration_sync_runs (tenant_id, org_id, id)
      ON DELETE CASCADE
);

CREATE TABLE integration_conflicts (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    run_id TEXT NOT NULL,
    binding_id TEXT NULL,
    provider TEXT NOT NULL,
    entity_kind TEXT NOT NULL,
    external_id TEXT NOT NULL,
    internal_id TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'ignored')),
    reason TEXT NOT NULL,
    payload_json TEXT NOT NULL DEFAULT '{}',
    resolution_json TEXT NOT NULL DEFAULT '',
    resolved_by_user_id TEXT NOT NULL DEFAULT '',
    resolved_at TIMESTAMP NULL,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_integration_conflicts_run_scope FOREIGN KEY (tenant_id, org_id, run_id)
      REFERENCES integration_sync_runs (tenant_id, org_id, id)
      ON DELETE CASCADE,
    CONSTRAINT fk_integration_conflicts_binding_scope FOREIGN KEY (tenant_id, org_id, binding_id)
      REFERENCES integration_bindings (tenant_id, org_id, id)
      ON DELETE SET NULL
);

CREATE INDEX idx_integration_conflicts_scope_status
    ON integration_conflicts (tenant_id, org_id, provider, status, created_at);

CREATE TABLE integration_change_events (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    agreement_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    event_type TEXT NOT NULL,
    source_event_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    payload_json TEXT NOT NULL DEFAULT '{}',
    emitted_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT uq_integration_change_events_dedupe UNIQUE (tenant_id, org_id, provider, idempotency_key)
);

CREATE INDEX idx_integration_change_events_scope_agreement
    ON integration_change_events (tenant_id, org_id, agreement_id, emitted_at);

CREATE TABLE integration_mutation_claims (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    first_seen_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT uq_integration_mutation_claims_scope UNIQUE (tenant_id, org_id, idempotency_key)
);

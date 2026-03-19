-- Version 1 lineage tables for document provenance tracking
-- All tables include tenant_id and org_id for proper multi-tenant scoping

-- source_documents: Canonical logical document identity within our system
CREATE TABLE IF NOT EXISTS source_documents (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    provider_kind TEXT NOT NULL CHECK (provider_kind IN ('google_drive', 'onedrive', 'dropbox', 'box', 'local')),
    canonical_title TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'merged')),
    lineage_confidence TEXT NOT NULL DEFAULT 'exact' CHECK (lineage_confidence IN ('exact', 'high', 'medium', 'low', 'none')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_source_documents_scope_id UNIQUE (tenant_id, org_id, id)
);

CREATE INDEX IF NOT EXISTS idx_source_documents_scope_status
    ON source_documents (tenant_id, org_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_source_documents_scope_provider
    ON source_documents (tenant_id, org_id, provider_kind, created_at DESC);

-- source_handles: Observed external identities for a source document
-- Tracks cross-drive and cross-account identity changes
CREATE TABLE IF NOT EXISTS source_handles (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    source_document_id TEXT NOT NULL,
    provider_kind TEXT NOT NULL CHECK (provider_kind IN ('google_drive', 'onedrive', 'dropbox', 'box', 'local')),
    external_file_id TEXT NOT NULL,
    account_id TEXT NOT NULL DEFAULT '',
    drive_id TEXT NOT NULL DEFAULT '',
    web_url TEXT NOT NULL DEFAULT '',
    handle_status TEXT NOT NULL DEFAULT 'active' CHECK (handle_status IN ('active', 'superseded', 'suspected_duplicate')),
    valid_from TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valid_to TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_source_handles_scope_id UNIQUE (tenant_id, org_id, id),
    CONSTRAINT fk_source_handles_document_scope FOREIGN KEY (tenant_id, org_id, source_document_id)
        REFERENCES source_documents (tenant_id, org_id, id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_source_handles_scope_document
    ON source_handles (tenant_id, org_id, source_document_id, handle_status);

CREATE INDEX IF NOT EXISTS idx_source_handles_scope_external
    ON source_handles (tenant_id, org_id, provider_kind, external_file_id, account_id);

CREATE INDEX IF NOT EXISTS idx_source_handles_validity
    ON source_handles (tenant_id, org_id, handle_status, valid_from, valid_to);

CREATE UNIQUE INDEX IF NOT EXISTS uq_source_handles_active_provider_file_account
    ON source_handles (tenant_id, org_id, provider_kind, external_file_id, account_id)
    WHERE handle_status = 'active' AND valid_to IS NULL;

-- source_revisions: Observed upstream revisions or snapshots
CREATE TABLE IF NOT EXISTS source_revisions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    source_document_id TEXT NOT NULL,
    source_handle_id TEXT NOT NULL,
    provider_revision_hint TEXT NOT NULL DEFAULT '',
    modified_time TIMESTAMP NULL,
    exported_at TIMESTAMP NULL,
    exported_by_user_id TEXT NOT NULL DEFAULT '',
    source_mime_type TEXT NOT NULL DEFAULT '',
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_source_revisions_scope_id UNIQUE (tenant_id, org_id, id),
    CONSTRAINT fk_source_revisions_document_scope FOREIGN KEY (tenant_id, org_id, source_document_id)
        REFERENCES source_documents (tenant_id, org_id, id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_source_revisions_handle_scope FOREIGN KEY (tenant_id, org_id, source_handle_id)
        REFERENCES source_handles (tenant_id, org_id, id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_source_revisions_scope_document
    ON source_revisions (tenant_id, org_id, source_document_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_source_revisions_scope_handle
    ON source_revisions (tenant_id, org_id, source_handle_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_source_revisions_modified_time
    ON source_revisions (tenant_id, org_id, modified_time DESC);

-- source_artifacts: Derived immutable artifacts from a source revision
CREATE TABLE IF NOT EXISTS source_artifacts (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    source_revision_id TEXT NOT NULL,
    artifact_kind TEXT NOT NULL CHECK (artifact_kind IN ('signable_pdf', 'preview_pdf', 'html_snapshot', 'text_extract')),
    object_key TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    page_count INTEGER NOT NULL DEFAULT 0 CHECK (page_count >= 0),
    size_bytes BIGINT NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
    compatibility_tier TEXT NOT NULL DEFAULT '',
    compatibility_reason TEXT NOT NULL DEFAULT '',
    normalization_status TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_source_artifacts_scope_id UNIQUE (tenant_id, org_id, id),
    CONSTRAINT uq_source_artifacts_revision_kind_sha256 UNIQUE (source_revision_id, artifact_kind, sha256),
    CONSTRAINT fk_source_artifacts_revision_scope FOREIGN KEY (tenant_id, org_id, source_revision_id)
        REFERENCES source_revisions (tenant_id, org_id, id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_source_artifacts_scope_revision
    ON source_artifacts (tenant_id, org_id, source_revision_id, artifact_kind);

CREATE INDEX IF NOT EXISTS idx_source_artifacts_scope_sha256
    ON source_artifacts (tenant_id, org_id, sha256);

-- source_fingerprints: Multiple fingerprints for exact and approximate reconciliation
CREATE TABLE IF NOT EXISTS source_fingerprints (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    source_revision_id TEXT NOT NULL,
    artifact_id TEXT NOT NULL,
    extract_version TEXT NOT NULL,
    raw_sha256 TEXT NOT NULL DEFAULT '',
    normalized_text_sha256 TEXT NOT NULL DEFAULT '',
    simhash64 TEXT NOT NULL DEFAULT '',
    minhash_json TEXT NOT NULL DEFAULT '[]',
    chunk_hashes_json TEXT NOT NULL DEFAULT '[]',
    token_count INTEGER NOT NULL DEFAULT 0 CHECK (token_count >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_source_fingerprints_scope_id UNIQUE (tenant_id, org_id, id),
    CONSTRAINT fk_source_fingerprints_revision_scope FOREIGN KEY (tenant_id, org_id, source_revision_id)
        REFERENCES source_revisions (tenant_id, org_id, id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_source_fingerprints_artifact_scope FOREIGN KEY (tenant_id, org_id, artifact_id)
        REFERENCES source_artifacts (tenant_id, org_id, id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_source_fingerprints_scope_revision
    ON source_fingerprints (tenant_id, org_id, source_revision_id);

CREATE INDEX IF NOT EXISTS idx_source_fingerprints_scope_artifact
    ON source_fingerprints (tenant_id, org_id, artifact_id, extract_version);

CREATE INDEX IF NOT EXISTS idx_source_fingerprints_normalized_hash
    ON source_fingerprints (normalized_text_sha256);

-- source_relationships: Explicit or inferred lineage relationships
CREATE TABLE IF NOT EXISTS source_relationships (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    left_source_document_id TEXT NOT NULL,
    right_source_document_id TEXT NOT NULL,
    relationship_type TEXT NOT NULL CHECK (relationship_type IN ('same_logical_doc', 'copied_from', 'transferred_from', 'forked_from', 'partial_overlap')),
    confidence_band TEXT NOT NULL DEFAULT 'medium' CHECK (confidence_band IN ('exact', 'high', 'medium', 'low', 'none')),
    confidence_score REAL NOT NULL DEFAULT 0.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'confirmed', 'rejected', 'superseded')),
    evidence_json TEXT NOT NULL DEFAULT '{}',
    created_by_user_id TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_source_relationships_scope_id UNIQUE (tenant_id, org_id, id),
    CONSTRAINT fk_source_relationships_left_scope FOREIGN KEY (tenant_id, org_id, left_source_document_id)
        REFERENCES source_documents (tenant_id, org_id, id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_source_relationships_right_scope FOREIGN KEY (tenant_id, org_id, right_source_document_id)
        REFERENCES source_documents (tenant_id, org_id, id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_source_relationships_scope_left
    ON source_relationships (tenant_id, org_id, left_source_document_id, status);

CREATE INDEX IF NOT EXISTS idx_source_relationships_scope_right
    ON source_relationships (tenant_id, org_id, right_source_document_id, status);

CREATE INDEX IF NOT EXISTS idx_source_relationships_status
    ON source_relationships (tenant_id, org_id, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_source_relationships_scope_tuple
    ON source_relationships (tenant_id, org_id, left_source_document_id, right_source_document_id, relationship_type, status);

CREATE INDEX IF NOT EXISTS idx_documents_source_document
    ON documents (tenant_id, org_id, source_document_id);

CREATE INDEX IF NOT EXISTS idx_documents_source_revision
    ON documents (tenant_id, org_id, source_revision_id);

CREATE INDEX IF NOT EXISTS idx_documents_source_artifact
    ON documents (tenant_id, org_id, source_artifact_id);

CREATE INDEX IF NOT EXISTS idx_agreements_source_revision
    ON agreements (tenant_id, org_id, source_revision_id);

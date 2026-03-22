-- Version 2 source-management foundations: synced source comments and search index state

CREATE TABLE IF NOT EXISTS source_comment_threads (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    source_document_id TEXT NOT NULL,
    source_revision_id TEXT NOT NULL,
    provider_kind TEXT NOT NULL CHECK (provider_kind IN ('google_drive', 'onedrive', 'dropbox', 'box', 'local')),
    provider_comment_id TEXT NOT NULL,
    thread_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'deleted')),
    anchor_kind TEXT NOT NULL DEFAULT 'document' CHECK (anchor_kind IN ('document', 'page', 'text_range')),
    anchor_json TEXT NOT NULL DEFAULT '{}',
    author_json TEXT NOT NULL DEFAULT '{}',
    body_preview TEXT NOT NULL DEFAULT '',
    message_count INTEGER NOT NULL DEFAULT 0 CHECK (message_count >= 0),
    reply_count INTEGER NOT NULL DEFAULT 0 CHECK (reply_count >= 0),
    sync_status TEXT NOT NULL DEFAULT 'pending_sync' CHECK (sync_status IN ('not_configured', 'pending_sync', 'synced', 'failed', 'stale')),
    resolved_at TIMESTAMP NULL,
    last_synced_at TIMESTAMP NULL,
    last_activity_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_source_comment_threads_scope_id UNIQUE (tenant_id, org_id, id),
    CONSTRAINT uq_source_comment_threads_provider_comment UNIQUE (tenant_id, org_id, source_revision_id, provider_kind, provider_comment_id),
    CONSTRAINT fk_source_comment_threads_document_scope FOREIGN KEY (tenant_id, org_id, source_document_id)
        REFERENCES source_documents (tenant_id, org_id, id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_source_comment_threads_revision_scope FOREIGN KEY (tenant_id, org_id, source_revision_id)
        REFERENCES source_revisions (tenant_id, org_id, id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_source_comment_threads_scope_document
    ON source_comment_threads (tenant_id, org_id, source_document_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_source_comment_threads_scope_revision
    ON source_comment_threads (tenant_id, org_id, source_revision_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_source_comment_threads_sync_status
    ON source_comment_threads (tenant_id, org_id, sync_status, updated_at DESC);

CREATE TABLE IF NOT EXISTS source_comment_messages (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    source_comment_thread_id TEXT NOT NULL,
    source_revision_id TEXT NOT NULL,
    provider_message_id TEXT NOT NULL,
    provider_parent_message_id TEXT NOT NULL DEFAULT '',
    message_kind TEXT NOT NULL DEFAULT 'comment' CHECK (message_kind IN ('comment', 'reply', 'system')),
    body_text TEXT NOT NULL DEFAULT '',
    body_preview TEXT NOT NULL DEFAULT '',
    author_json TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_source_comment_messages_scope_id UNIQUE (tenant_id, org_id, id),
    CONSTRAINT uq_source_comment_messages_provider_message UNIQUE (tenant_id, org_id, source_comment_thread_id, provider_message_id),
    CONSTRAINT fk_source_comment_messages_thread_scope FOREIGN KEY (tenant_id, org_id, source_comment_thread_id)
        REFERENCES source_comment_threads (tenant_id, org_id, id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_source_comment_messages_revision_scope FOREIGN KEY (tenant_id, org_id, source_revision_id)
        REFERENCES source_revisions (tenant_id, org_id, id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_source_comment_messages_thread
    ON source_comment_messages (tenant_id, org_id, source_comment_thread_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_source_comment_messages_revision
    ON source_comment_messages (tenant_id, org_id, source_revision_id, created_at ASC);

CREATE TABLE IF NOT EXISTS source_comment_sync_states (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    source_document_id TEXT NOT NULL,
    source_revision_id TEXT NOT NULL,
    provider_kind TEXT NOT NULL CHECK (provider_kind IN ('google_drive', 'onedrive', 'dropbox', 'box', 'local')),
    sync_status TEXT NOT NULL DEFAULT 'pending_sync' CHECK (sync_status IN ('not_configured', 'pending_sync', 'synced', 'failed', 'stale')),
    thread_count INTEGER NOT NULL DEFAULT 0 CHECK (thread_count >= 0),
    message_count INTEGER NOT NULL DEFAULT 0 CHECK (message_count >= 0),
    payload_sha256 TEXT NOT NULL DEFAULT '',
    payload_json TEXT NOT NULL DEFAULT '{}',
    last_attempt_at TIMESTAMP NULL,
    last_synced_at TIMESTAMP NULL,
    error_code TEXT NOT NULL DEFAULT '',
    error_message TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_source_comment_sync_states_scope_id UNIQUE (tenant_id, org_id, id),
    CONSTRAINT uq_source_comment_sync_states_revision_provider UNIQUE (tenant_id, org_id, source_revision_id, provider_kind),
    CONSTRAINT fk_source_comment_sync_states_document_scope FOREIGN KEY (tenant_id, org_id, source_document_id)
        REFERENCES source_documents (tenant_id, org_id, id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_source_comment_sync_states_revision_scope FOREIGN KEY (tenant_id, org_id, source_revision_id)
        REFERENCES source_revisions (tenant_id, org_id, id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_source_comment_sync_states_status
    ON source_comment_sync_states (tenant_id, org_id, sync_status, updated_at DESC);

CREATE TABLE IF NOT EXISTS source_search_documents (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    source_document_id TEXT NOT NULL,
    source_revision_id TEXT NOT NULL DEFAULT '',
    result_kind TEXT NOT NULL CHECK (result_kind IN ('source_document', 'source_revision')),
    provider_kind TEXT NOT NULL CHECK (provider_kind IN ('google_drive', 'onedrive', 'dropbox', 'box', 'local')),
    canonical_title TEXT NOT NULL DEFAULT '',
    relationship_state TEXT NOT NULL DEFAULT '',
    comment_sync_status TEXT NOT NULL DEFAULT 'not_configured' CHECK (comment_sync_status IN ('not_configured', 'pending_sync', 'synced', 'failed', 'stale')),
    comment_count INTEGER NOT NULL DEFAULT 0 CHECK (comment_count >= 0),
    has_comments BOOLEAN NOT NULL DEFAULT FALSE,
    search_text TEXT NOT NULL DEFAULT '',
    metadata_json TEXT NOT NULL DEFAULT '{}',
    indexed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_source_search_documents_scope_id UNIQUE (tenant_id, org_id, id),
    CONSTRAINT uq_source_search_documents_scope_tuple UNIQUE (tenant_id, org_id, result_kind, source_document_id, source_revision_id),
    CONSTRAINT fk_source_search_documents_document_scope FOREIGN KEY (tenant_id, org_id, source_document_id)
        REFERENCES source_documents (tenant_id, org_id, id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_source_search_documents_scope_document
    ON source_search_documents (tenant_id, org_id, source_document_id, result_kind, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_source_search_documents_scope_revision
    ON source_search_documents (tenant_id, org_id, source_revision_id, result_kind, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_source_search_documents_scope_comment_status
    ON source_search_documents (tenant_id, org_id, comment_sync_status, has_comments, updated_at DESC);

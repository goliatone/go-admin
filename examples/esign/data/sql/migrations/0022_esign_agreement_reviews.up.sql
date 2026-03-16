ALTER TABLE agreements ADD COLUMN review_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE agreements ADD COLUMN review_gate TEXT NOT NULL DEFAULT 'none';
ALTER TABLE agreements ADD COLUMN comments_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE agreement_reviews (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    agreement_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'none',
    gate TEXT NOT NULL DEFAULT 'none',
    requested_by_user_id TEXT NOT NULL DEFAULT '',
    opened_at TIMESTAMP NULL,
    closed_at TIMESTAMP NULL,
    last_activity_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_agreement_reviews_agreement FOREIGN KEY (agreement_id) REFERENCES agreements(id) ON DELETE CASCADE,
    CONSTRAINT uq_agreement_reviews_agreement UNIQUE (tenant_id, org_id, agreement_id)
);

CREATE INDEX idx_agreement_reviews_scope_agreement ON agreement_reviews (tenant_id, org_id, agreement_id);

CREATE TABLE agreement_review_participants (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    review_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'reviewer',
    can_comment BOOLEAN NOT NULL DEFAULT TRUE,
    can_approve BOOLEAN NOT NULL DEFAULT TRUE,
    decision_status TEXT NOT NULL DEFAULT 'pending',
    decision_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_agreement_review_participants_review FOREIGN KEY (review_id) REFERENCES agreement_reviews(id) ON DELETE CASCADE,
    CONSTRAINT fk_agreement_review_participants_recipient FOREIGN KEY (recipient_id) REFERENCES participants(id) ON DELETE CASCADE,
    CONSTRAINT uq_agreement_review_participants_recipient UNIQUE (tenant_id, org_id, review_id, recipient_id)
);

CREATE INDEX idx_agreement_review_participants_review ON agreement_review_participants (tenant_id, org_id, review_id);

CREATE TABLE agreement_comment_threads (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    agreement_id TEXT NOT NULL,
    review_id TEXT NOT NULL,
    document_id TEXT NOT NULL DEFAULT '',
    visibility TEXT NOT NULL DEFAULT 'shared',
    anchor_type TEXT NOT NULL DEFAULT 'agreement',
    page_number INTEGER NOT NULL DEFAULT 0,
    field_id TEXT NOT NULL DEFAULT '',
    anchor_x DOUBLE PRECISION NOT NULL DEFAULT 0,
    anchor_y DOUBLE PRECISION NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open',
    created_by_type TEXT NOT NULL DEFAULT '',
    created_by_id TEXT NOT NULL DEFAULT '',
    resolved_by_type TEXT NOT NULL DEFAULT '',
    resolved_by_id TEXT NOT NULL DEFAULT '',
    resolved_at TIMESTAMP NULL,
    last_activity_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_agreement_comment_threads_agreement FOREIGN KEY (agreement_id) REFERENCES agreements(id) ON DELETE CASCADE,
    CONSTRAINT fk_agreement_comment_threads_review FOREIGN KEY (review_id) REFERENCES agreement_reviews(id) ON DELETE CASCADE
);

CREATE INDEX idx_agreement_comment_threads_scope_agreement ON agreement_comment_threads (tenant_id, org_id, agreement_id, review_id);

CREATE TABLE agreement_comment_messages (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    thread_id TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    message_kind TEXT NOT NULL DEFAULT 'comment',
    created_by_type TEXT NOT NULL DEFAULT '',
    created_by_id TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_agreement_comment_messages_thread FOREIGN KEY (thread_id) REFERENCES agreement_comment_threads(id) ON DELETE CASCADE
);

CREATE INDEX idx_agreement_comment_messages_thread ON agreement_comment_messages (tenant_id, org_id, thread_id, created_at);

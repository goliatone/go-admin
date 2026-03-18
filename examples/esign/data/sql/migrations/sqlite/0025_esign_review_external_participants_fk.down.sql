PRAGMA foreign_keys = OFF;

DROP INDEX IF EXISTS idx_agreement_review_participants_review;
DROP INDEX IF EXISTS uq_agreement_review_participants_recipient;
DROP INDEX IF EXISTS uq_agreement_review_participants_external_email;

CREATE TABLE agreement_review_participants_legacy (
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
    participant_type TEXT NOT NULL DEFAULT 'recipient',
    email TEXT NOT NULL DEFAULT '',
    display_name TEXT NOT NULL DEFAULT '',
    CONSTRAINT fk_agreement_review_participants_review FOREIGN KEY (review_id) REFERENCES agreement_reviews(id) ON DELETE CASCADE,
    CONSTRAINT fk_agreement_review_participants_recipient FOREIGN KEY (recipient_id) REFERENCES participants(id) ON DELETE CASCADE
);

INSERT INTO agreement_review_participants_legacy (
    id, tenant_id, org_id, review_id, recipient_id, role, can_comment, can_approve,
    decision_status, decision_at, created_at, updated_at, participant_type, email, display_name
)
SELECT
    id,
    tenant_id,
    org_id,
    review_id,
    COALESCE(recipient_id, ''),
    role,
    can_comment,
    can_approve,
    decision_status,
    decision_at,
    created_at,
    updated_at,
    participant_type,
    email,
    display_name
FROM agreement_review_participants;

DROP TABLE agreement_review_participants;

ALTER TABLE agreement_review_participants_legacy RENAME TO agreement_review_participants;

CREATE INDEX idx_agreement_review_participants_review
ON agreement_review_participants (tenant_id, org_id, review_id);

CREATE UNIQUE INDEX uq_agreement_review_participants_recipient
ON agreement_review_participants (tenant_id, org_id, review_id, recipient_id)
WHERE recipient_id <> '';

CREATE UNIQUE INDEX uq_agreement_review_participants_external_email
ON agreement_review_participants (tenant_id, org_id, review_id, email)
WHERE participant_type = 'external' AND email <> '';

PRAGMA foreign_keys = ON;

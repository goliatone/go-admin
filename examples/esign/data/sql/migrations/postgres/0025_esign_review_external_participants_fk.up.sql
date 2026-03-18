ALTER TABLE agreement_review_participants
    DROP CONSTRAINT IF EXISTS fk_agreement_review_participants_recipient;

UPDATE agreement_review_participants
SET recipient_id = NULL
WHERE participant_type = 'external';

ALTER TABLE agreement_review_participants
    ALTER COLUMN recipient_id DROP NOT NULL;

ALTER TABLE agreement_review_participants
    ADD CONSTRAINT fk_agreement_review_participants_recipient
    FOREIGN KEY (recipient_id) REFERENCES participants(id) ON DELETE CASCADE;

ALTER TABLE agreement_review_participants
    DROP CONSTRAINT IF EXISTS ck_agreement_review_participants_identity;

ALTER TABLE agreement_review_participants
    ADD CONSTRAINT ck_agreement_review_participants_identity
    CHECK (
        (participant_type = 'recipient' AND recipient_id IS NOT NULL AND recipient_id <> '')
        OR
        (participant_type = 'external' AND recipient_id IS NULL AND email <> '')
    );

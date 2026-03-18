ALTER TABLE agreement_review_participants
    DROP CONSTRAINT IF EXISTS ck_agreement_review_participants_identity;

ALTER TABLE agreement_review_participants
    DROP CONSTRAINT IF EXISTS fk_agreement_review_participants_recipient;

DELETE FROM agreement_review_participants
WHERE participant_type = 'external' OR recipient_id IS NULL;

ALTER TABLE agreement_review_participants
    ALTER COLUMN recipient_id SET NOT NULL;

ALTER TABLE agreement_review_participants
    ADD CONSTRAINT fk_agreement_review_participants_recipient
    FOREIGN KEY (recipient_id) REFERENCES participants(id) ON DELETE CASCADE;

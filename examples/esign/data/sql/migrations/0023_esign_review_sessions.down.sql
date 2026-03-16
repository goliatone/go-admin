DROP TABLE IF EXISTS review_session_tokens;

DROP INDEX IF EXISTS uq_agreement_review_participants_external_email;
DROP INDEX IF EXISTS uq_agreement_review_participants_recipient;

ALTER TABLE agreement_review_participants DROP COLUMN display_name;
ALTER TABLE agreement_review_participants DROP COLUMN email;
ALTER TABLE agreement_review_participants DROP COLUMN participant_type;

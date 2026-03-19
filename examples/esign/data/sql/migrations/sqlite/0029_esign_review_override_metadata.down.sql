ALTER TABLE agreement_review_participants DROP COLUMN approved_on_behalf_at;
ALTER TABLE agreement_review_participants DROP COLUMN approved_on_behalf_reason;
ALTER TABLE agreement_review_participants DROP COLUMN approved_on_behalf_by_user_id;

ALTER TABLE agreement_reviews DROP COLUMN override_at;
ALTER TABLE agreement_reviews DROP COLUMN override_by_user_id;
ALTER TABLE agreement_reviews DROP COLUMN override_reason;
ALTER TABLE agreement_reviews DROP COLUMN override_active;

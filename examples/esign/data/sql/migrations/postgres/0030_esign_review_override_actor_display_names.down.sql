ALTER TABLE agreement_review_participants DROP COLUMN IF EXISTS approved_on_behalf_by_display_name;
ALTER TABLE agreement_reviews DROP COLUMN IF EXISTS override_by_display_name;

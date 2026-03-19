ALTER TABLE agreement_reviews ADD COLUMN IF NOT EXISTS override_by_display_name TEXT NOT NULL DEFAULT '';
ALTER TABLE agreement_review_participants ADD COLUMN IF NOT EXISTS approved_on_behalf_by_display_name TEXT NOT NULL DEFAULT '';

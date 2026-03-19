ALTER TABLE agreement_reviews ADD COLUMN IF NOT EXISTS override_active BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE agreement_reviews ADD COLUMN IF NOT EXISTS override_reason TEXT NOT NULL DEFAULT '';
ALTER TABLE agreement_reviews ADD COLUMN IF NOT EXISTS override_by_user_id TEXT NOT NULL DEFAULT '';
ALTER TABLE agreement_reviews ADD COLUMN IF NOT EXISTS override_at TIMESTAMP NULL;

ALTER TABLE agreement_review_participants ADD COLUMN IF NOT EXISTS approved_on_behalf_by_user_id TEXT NOT NULL DEFAULT '';
ALTER TABLE agreement_review_participants ADD COLUMN IF NOT EXISTS approved_on_behalf_reason TEXT NOT NULL DEFAULT '';
ALTER TABLE agreement_review_participants ADD COLUMN IF NOT EXISTS approved_on_behalf_at TIMESTAMP NULL;

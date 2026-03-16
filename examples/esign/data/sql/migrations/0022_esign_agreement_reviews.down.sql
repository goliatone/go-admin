DROP TABLE IF EXISTS agreement_comment_messages;
DROP TABLE IF EXISTS agreement_comment_threads;
DROP TABLE IF EXISTS agreement_review_participants;
DROP TABLE IF EXISTS agreement_reviews;
-- SQLite/Postgres column rollback intentionally omitted.
-- Review metadata columns are additive and safe to keep after rollback.

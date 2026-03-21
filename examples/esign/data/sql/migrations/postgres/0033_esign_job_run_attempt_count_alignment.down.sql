UPDATE job_runs
SET attempt_count = 1
WHERE attempt_count < 1;

ALTER TABLE IF EXISTS job_runs
    ALTER COLUMN attempt_count SET DEFAULT 1;

ALTER TABLE IF EXISTS job_runs
    DROP CONSTRAINT IF EXISTS job_runs_attempt_count_check;

ALTER TABLE IF EXISTS job_runs
    ADD CONSTRAINT job_runs_attempt_count_check CHECK (attempt_count > 0);

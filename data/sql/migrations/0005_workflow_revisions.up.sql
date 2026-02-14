CREATE TABLE IF NOT EXISTS workflow_revisions (
    workflow_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    name TEXT NOT NULL,
    definition TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'deprecated')),
    environment TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (workflow_id, version),
    FOREIGN KEY (workflow_id) REFERENCES workflows(id)
);

CREATE INDEX IF NOT EXISTS idx_workflow_revisions_workflow_version
ON workflow_revisions (workflow_id, version);

INSERT INTO workflow_revisions (workflow_id, version, name, definition, status, environment, created_at, updated_at)
SELECT w.id, w.version, w.name, w.definition, w.status, w.environment, w.created_at, w.updated_at
FROM workflows AS w
WHERE NOT EXISTS (
    SELECT 1
    FROM workflow_revisions AS wr
    WHERE wr.workflow_id = w.id
      AND wr.version = w.version
);

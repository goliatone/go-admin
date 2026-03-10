CREATE TABLE IF NOT EXISTS workflow_authoring_machines (
    machine_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    etag TEXT NOT NULL,
    draft TEXT NOT NULL,
    diagnostics TEXT NOT NULL DEFAULT '[]',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,
    published_definition TEXT,
    deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflow_authoring_versions (
    machine_id TEXT NOT NULL,
    version TEXT NOT NULL,
    name TEXT NOT NULL,
    etag TEXT NOT NULL,
    draft TEXT NOT NULL,
    diagnostics TEXT NOT NULL DEFAULT '[]',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,
    published_definition TEXT,
    deleted_at TIMESTAMP,
    PRIMARY KEY (machine_id, version)
);

CREATE TABLE IF NOT EXISTS workflow_migration_markers (
    marker_key TEXT PRIMARY KEY,
    completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    details_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_workflow_authoring_updated_at
ON workflow_authoring_machines (updated_at);

CREATE INDEX IF NOT EXISTS idx_workflow_authoring_versions_updated_at
ON workflow_authoring_versions (machine_id, updated_at);

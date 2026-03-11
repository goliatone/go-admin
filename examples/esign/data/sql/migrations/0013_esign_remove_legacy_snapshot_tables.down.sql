CREATE TABLE IF NOT EXISTS esign_store_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    snapshot_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS esign_snapshot_migration_markers (
    marker_key TEXT PRIMARY KEY,
    completed_at TIMESTAMP NOT NULL,
    details_json TEXT NOT NULL DEFAULT '{}'
);

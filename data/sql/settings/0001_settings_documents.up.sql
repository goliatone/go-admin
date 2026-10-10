CREATE TABLE IF NOT EXISTS admin_settings_documents (
    namespace TEXT NOT NULL,
    scope TEXT NOT NULL CHECK (scope IN ('system', 'site', 'user')),
    user_id TEXT NOT NULL,
    revision BIGINT NOT NULL CHECK (revision >= 0),
    overrides JSONB NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    PRIMARY KEY (namespace, scope, user_id),
    CHECK ((scope = 'user' AND user_id <> '') OR (scope <> 'user' AND user_id = ''))
);

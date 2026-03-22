DROP INDEX IF EXISTS idx_source_search_documents_scope_comment_status;
DROP INDEX IF EXISTS idx_source_search_documents_scope_revision;
DROP INDEX IF EXISTS idx_source_search_documents_scope_document;
DROP TABLE IF EXISTS source_search_documents;

DROP INDEX IF EXISTS idx_source_comment_sync_states_status;
DROP TABLE IF EXISTS source_comment_sync_states;

DROP INDEX IF EXISTS idx_source_comment_messages_revision;
DROP INDEX IF EXISTS idx_source_comment_messages_thread;
DROP TABLE IF EXISTS source_comment_messages;

DROP INDEX IF EXISTS idx_source_comment_threads_sync_status;
DROP INDEX IF EXISTS idx_source_comment_threads_scope_revision;
DROP INDEX IF EXISTS idx_source_comment_threads_scope_document;
DROP TABLE IF EXISTS source_comment_threads;

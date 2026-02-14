CREATE UNIQUE INDEX IF NOT EXISTS uq_workflow_bindings_active_scope_priority
ON workflow_bindings (scope_type, scope_ref, environment, priority)
WHERE status = 'active';

DROP TRIGGER IF EXISTS trg_audit_events_no_delete ON audit_events;
DROP TRIGGER IF EXISTS trg_audit_events_no_update ON audit_events;
DROP FUNCTION IF EXISTS esign_deny_audit_events_mutation();

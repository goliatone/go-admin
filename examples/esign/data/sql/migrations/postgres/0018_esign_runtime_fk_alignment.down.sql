ALTER TABLE signature_artifacts
    DROP CONSTRAINT IF EXISTS fk_signature_artifacts_recipient_scope;

ALTER TABLE signature_artifacts
    ADD CONSTRAINT fk_signature_artifacts_recipient_scope
    FOREIGN KEY (tenant_id, org_id, recipient_id)
    REFERENCES recipients (tenant_id, org_id, id)
    ON UPDATE CASCADE
    ON DELETE CASCADE;

ALTER TABLE field_values
    DROP CONSTRAINT IF EXISTS fk_field_values_recipient_scope;

ALTER TABLE field_values
    DROP CONSTRAINT IF EXISTS fk_field_values_field_scope;

ALTER TABLE field_values
    ADD CONSTRAINT fk_field_values_recipient_scope
    FOREIGN KEY (tenant_id, org_id, recipient_id)
    REFERENCES recipients (tenant_id, org_id, id)
    ON UPDATE CASCADE
    ON DELETE CASCADE;

ALTER TABLE field_values
    ADD CONSTRAINT fk_field_values_field_scope
    FOREIGN KEY (tenant_id, org_id, field_id)
    REFERENCES fields (tenant_id, org_id, id)
    ON UPDATE CASCADE
    ON DELETE CASCADE;

ALTER TABLE email_logs
    DROP CONSTRAINT IF EXISTS fk_email_logs_recipient_scope;

ALTER TABLE email_logs
    ADD CONSTRAINT fk_email_logs_recipient_scope
    FOREIGN KEY (tenant_id, org_id, recipient_id)
    REFERENCES recipients (tenant_id, org_id, id)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

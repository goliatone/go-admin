package stores

// TableName binds e-sign records to canonical SQL tables used by Bun repositories.

func (*DocumentRecord) TableName() string {
	return "documents"
}

func (*AgreementRecord) TableName() string {
	return "agreements"
}

func (*DraftRecord) TableName() string {
	return "esign_drafts"
}

func (*RecipientRecord) TableName() string {
	return "recipients"
}

func (*ParticipantRecord) TableName() string {
	return "participants"
}

func (*SigningTokenRecord) TableName() string {
	return "signing_tokens"
}

func (*FieldRecord) TableName() string {
	return "fields"
}

func (*FieldDefinitionRecord) TableName() string {
	return "field_definitions"
}

func (*FieldInstanceRecord) TableName() string {
	return "field_instances"
}

func (*FieldValueRecord) TableName() string {
	return "field_values"
}

func (*SignatureArtifactRecord) TableName() string {
	return "signature_artifacts"
}

func (*SignerProfileRecord) TableName() string {
	return "signer_profiles"
}

func (*SavedSignerSignatureRecord) TableName() string {
	return "saved_signer_signatures"
}

func (*AuditEventRecord) TableName() string {
	return "audit_events"
}

func (*EmailLogRecord) TableName() string {
	return "email_logs"
}

func (*AgreementArtifactRecord) TableName() string {
	return "agreement_artifacts"
}

func (*JobRunRecord) TableName() string {
	return "job_runs"
}

func (*GoogleImportRunRecord) TableName() string {
	return "google_import_runs"
}

func (*IntegrationCredentialRecord) TableName() string {
	return "integration_credentials"
}

func (*MappingSpecRecord) TableName() string {
	return "integration_mapping_specs"
}

func (*IntegrationBindingRecord) TableName() string {
	return "integration_bindings"
}

func (*IntegrationSyncRunRecord) TableName() string {
	return "integration_sync_runs"
}

func (*IntegrationCheckpointRecord) TableName() string {
	return "integration_checkpoints"
}

func (*IntegrationConflictRecord) TableName() string {
	return "integration_conflicts"
}

func (*IntegrationChangeEventRecord) TableName() string {
	return "integration_change_events"
}

func (*PlacementRunRecord) TableName() string {
	return "placement_runs"
}

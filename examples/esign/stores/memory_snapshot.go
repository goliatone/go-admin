package stores

import (
	"strings"
	"time"
)

type inMemoryStoreSnapshot struct {
	Documents                  map[string]DocumentRecord                 `json:"documents"`
	Agreements                 map[string]AgreementRecord                `json:"agreements"`
	Drafts                     map[string]DraftRecord                    `json:"drafts"`
	DraftWizardIndex           map[string]string                         `json:"draft_wizard_index"`
	Participants               map[string]ParticipantRecord              `json:"participants"`
	FieldDefinitions           map[string]FieldDefinitionRecord          `json:"field_definitions"`
	FieldInstances             map[string]FieldInstanceRecord            `json:"field_instances"`
	Recipients                 map[string]RecipientRecord                `json:"recipients"`
	Fields                     map[string]FieldRecord                    `json:"fields"`
	SigningTokens              map[string]SigningTokenRecord             `json:"signing_tokens"`
	TokenHashIndex             map[string]string                         `json:"token_hash_index"`
	SignatureArtifacts         map[string]SignatureArtifactRecord        `json:"signature_artifacts"`
	SignerProfiles             map[string]SignerProfileRecord            `json:"signer_profiles"`
	SignerProfileIndex         map[string]string                         `json:"signer_profile_index"`
	SavedSignerSignatures      map[string]SavedSignerSignatureRecord     `json:"saved_signatures"`
	FieldValues                map[string]FieldValueRecord               `json:"field_values"`
	DraftAuditEvents           map[string]DraftAuditEventRecord          `json:"draft_audit_events"`
	AuditEvents                map[string]AuditEventRecord               `json:"audit_events"`
	AgreementArtifacts         map[string]AgreementArtifactRecord        `json:"agreement_artifacts"`
	EmailLogs                  map[string]EmailLogRecord                 `json:"email_logs"`
	JobRuns                    map[string]JobRunRecord                   `json:"job_runs"`
	JobRunDedupeIndex          map[string]string                         `json:"job_run_dedupe_index"`
	GoogleImportRuns           map[string]GoogleImportRunRecord          `json:"google_import_runs"`
	GoogleImportRunDedupeIndex map[string]string                         `json:"google_import_run_dedupe_index"`
	DocumentRemediationLeases  map[string]DocumentRemediationLeaseRecord `json:"document_remediation_leases"`
	RemediationDispatches      map[string]RemediationDispatchRecord      `json:"remediation_dispatches"`
	RemediationDispatchIndex   map[string]string                         `json:"remediation_dispatch_index"`
	AgreementReminderStates    map[string]AgreementReminderStateRecord   `json:"agreement_reminder_states"`
	OutboxMessages             map[string]OutboxMessageRecord            `json:"outbox_messages"`
	IntegrationCredentials     map[string]IntegrationCredentialRecord    `json:"integration_credentials"`
	IntegrationCredentialIndex map[string]string                         `json:"integration_credential_index"`
	MappingSpecs               map[string]MappingSpecRecord              `json:"mapping_specs"`
	IntegrationBindings        map[string]IntegrationBindingRecord       `json:"integration_bindings"`
	IntegrationBindingIndex    map[string]string                         `json:"integration_binding_index"`
	IntegrationSyncRuns        map[string]IntegrationSyncRunRecord       `json:"integration_sync_runs"`
	IntegrationCheckpoints     map[string]IntegrationCheckpointRecord    `json:"integration_checkpoints"`
	IntegrationCheckpointIndex map[string]string                         `json:"integration_checkpoint_index"`
	IntegrationConflicts       map[string]IntegrationConflictRecord      `json:"integration_conflicts"`
	IntegrationChangeEvents    map[string]IntegrationChangeEventRecord   `json:"integration_change_events"`
	IntegrationMutationClaims  map[string]time.Time                      `json:"integration_mutation_claims"`
	PlacementRuns              map[string]PlacementRunRecord             `json:"placement_runs"`
}

func ensureDocumentMap(in map[string]DocumentRecord) map[string]DocumentRecord {
	if in == nil {
		return map[string]DocumentRecord{}
	}
	return in
}

func ensureAgreementMap(in map[string]AgreementRecord) map[string]AgreementRecord {
	if in == nil {
		return map[string]AgreementRecord{}
	}
	return in
}

func ensureDraftMap(in map[string]DraftRecord) map[string]DraftRecord {
	if in == nil {
		return map[string]DraftRecord{}
	}
	return in
}

func ensureParticipantMap(in map[string]ParticipantRecord) map[string]ParticipantRecord {
	if in == nil {
		return map[string]ParticipantRecord{}
	}
	return in
}

func ensureFieldDefinitionMap(in map[string]FieldDefinitionRecord) map[string]FieldDefinitionRecord {
	if in == nil {
		return map[string]FieldDefinitionRecord{}
	}
	return in
}

func ensureFieldInstanceMap(in map[string]FieldInstanceRecord) map[string]FieldInstanceRecord {
	if in == nil {
		return map[string]FieldInstanceRecord{}
	}
	return in
}

func ensureRecipientMap(in map[string]RecipientRecord) map[string]RecipientRecord {
	if in == nil {
		return map[string]RecipientRecord{}
	}
	return in
}

func ensureFieldMap(in map[string]FieldRecord) map[string]FieldRecord {
	if in == nil {
		return map[string]FieldRecord{}
	}
	return in
}

func ensureSigningTokenMap(in map[string]SigningTokenRecord) map[string]SigningTokenRecord {
	if in == nil {
		return map[string]SigningTokenRecord{}
	}
	return in
}

func ensureSignatureArtifactMap(in map[string]SignatureArtifactRecord) map[string]SignatureArtifactRecord {
	if in == nil {
		return map[string]SignatureArtifactRecord{}
	}
	return in
}

func ensureSignerProfileMap(in map[string]SignerProfileRecord) map[string]SignerProfileRecord {
	if in == nil {
		return map[string]SignerProfileRecord{}
	}
	return in
}

func ensureSavedSignerSignatureMap(in map[string]SavedSignerSignatureRecord) map[string]SavedSignerSignatureRecord {
	if in == nil {
		return map[string]SavedSignerSignatureRecord{}
	}
	return in
}

func ensureFieldValueMap(in map[string]FieldValueRecord) map[string]FieldValueRecord {
	if in == nil {
		return map[string]FieldValueRecord{}
	}
	return in
}

func ensureDraftAuditEventMap(in map[string]DraftAuditEventRecord) map[string]DraftAuditEventRecord {
	if in == nil {
		return map[string]DraftAuditEventRecord{}
	}
	return in
}

func ensureAuditEventMap(in map[string]AuditEventRecord) map[string]AuditEventRecord {
	if in == nil {
		return map[string]AuditEventRecord{}
	}
	return in
}

func ensureAgreementArtifactMap(in map[string]AgreementArtifactRecord) map[string]AgreementArtifactRecord {
	if in == nil {
		return map[string]AgreementArtifactRecord{}
	}
	return in
}

func ensureEmailLogMap(in map[string]EmailLogRecord) map[string]EmailLogRecord {
	if in == nil {
		return map[string]EmailLogRecord{}
	}
	return in
}

func ensureJobRunMap(in map[string]JobRunRecord) map[string]JobRunRecord {
	if in == nil {
		return map[string]JobRunRecord{}
	}
	return in
}

func ensureGoogleImportRunMap(in map[string]GoogleImportRunRecord) map[string]GoogleImportRunRecord {
	if in == nil {
		return map[string]GoogleImportRunRecord{}
	}
	return in
}

func ensureDocumentRemediationLeaseMap(in map[string]DocumentRemediationLeaseRecord) map[string]DocumentRemediationLeaseRecord {
	if in == nil {
		return map[string]DocumentRemediationLeaseRecord{}
	}
	return in
}

func ensureRemediationDispatchMap(in map[string]RemediationDispatchRecord) map[string]RemediationDispatchRecord {
	if in == nil {
		return map[string]RemediationDispatchRecord{}
	}
	return in
}

func ensureAgreementReminderStateMap(in map[string]AgreementReminderStateRecord) map[string]AgreementReminderStateRecord {
	if in == nil {
		return map[string]AgreementReminderStateRecord{}
	}
	out := make(map[string]AgreementReminderStateRecord, len(in))
	for key, record := range in {
		record.TenantID = normalizeID(record.TenantID)
		record.OrgID = normalizeID(record.OrgID)
		record.AgreementID = normalizeID(record.AgreementID)
		record.RecipientID = normalizeID(record.RecipientID)

		normalizedKey := strings.TrimSpace(key)
		if record.TenantID != "" && record.OrgID != "" && record.AgreementID != "" && record.RecipientID != "" {
			normalizedKey = strings.Join([]string{
				record.TenantID,
				record.OrgID,
				record.AgreementID,
				record.RecipientID,
			}, "|")
		}
		if normalizedKey == "" {
			continue
		}
		if existing, exists := out[normalizedKey]; exists && !preferReminderStateRecord(record, existing) {
			continue
		}
		out[normalizedKey] = record
	}
	return out
}

func preferReminderStateRecord(candidate, existing AgreementReminderStateRecord) bool {
	if candidate.UpdatedAt.After(existing.UpdatedAt) {
		return true
	}
	if existing.UpdatedAt.After(candidate.UpdatedAt) {
		return false
	}
	if candidate.CreatedAt.After(existing.CreatedAt) {
		return true
	}
	if existing.CreatedAt.After(candidate.CreatedAt) {
		return false
	}
	candidateID := strings.TrimSpace(candidate.ID)
	existingID := strings.TrimSpace(existing.ID)
	if existingID == "" {
		return candidateID != ""
	}
	if candidateID == "" {
		return false
	}
	return candidateID < existingID
}

func ensureOutboxMessageMap(in map[string]OutboxMessageRecord) map[string]OutboxMessageRecord {
	if in == nil {
		return map[string]OutboxMessageRecord{}
	}
	return in
}

func ensureIntegrationCredentialMap(in map[string]IntegrationCredentialRecord) map[string]IntegrationCredentialRecord {
	if in == nil {
		return map[string]IntegrationCredentialRecord{}
	}
	return in
}

func ensureMappingSpecMap(in map[string]MappingSpecRecord) map[string]MappingSpecRecord {
	if in == nil {
		return map[string]MappingSpecRecord{}
	}
	return in
}

func ensureIntegrationBindingMap(in map[string]IntegrationBindingRecord) map[string]IntegrationBindingRecord {
	if in == nil {
		return map[string]IntegrationBindingRecord{}
	}
	return in
}

func ensureIntegrationSyncRunMap(in map[string]IntegrationSyncRunRecord) map[string]IntegrationSyncRunRecord {
	if in == nil {
		return map[string]IntegrationSyncRunRecord{}
	}
	return in
}

func ensureIntegrationCheckpointMap(in map[string]IntegrationCheckpointRecord) map[string]IntegrationCheckpointRecord {
	if in == nil {
		return map[string]IntegrationCheckpointRecord{}
	}
	return in
}

func ensureIntegrationConflictMap(in map[string]IntegrationConflictRecord) map[string]IntegrationConflictRecord {
	if in == nil {
		return map[string]IntegrationConflictRecord{}
	}
	return in
}

func ensureIntegrationChangeEventMap(in map[string]IntegrationChangeEventRecord) map[string]IntegrationChangeEventRecord {
	if in == nil {
		return map[string]IntegrationChangeEventRecord{}
	}
	return in
}

func ensurePlacementRunMap(in map[string]PlacementRunRecord) map[string]PlacementRunRecord {
	if in == nil {
		return map[string]PlacementRunRecord{}
	}
	return in
}

func ensureTimeMap(in map[string]time.Time) map[string]time.Time {
	if in == nil {
		return map[string]time.Time{}
	}
	return in
}

func ensureStringMap(in map[string]string) map[string]string {
	if in == nil {
		return map[string]string{}
	}
	return in
}

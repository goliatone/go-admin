package stores

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

// FixtureSet identifies seeded phase-1 records used by integration tests.
type FixtureSet struct {
	DocumentID              string `json:"document_id"`
	AgreementID             string `json:"agreement_id"`
	RecipientID             string `json:"recipient_id"`
	ParticipantID           string `json:"participant_id"`
	FieldDefinitionID       string `json:"field_definition_id"`
	FieldInstanceID         string `json:"field_instance_id"`
	SigningTokenID          string `json:"signing_token_id"`
	FieldID                 string `json:"field_id"`
	FieldValueID            string `json:"field_value_id"`
	SignatureArtifactID     string `json:"signature_artifact_id"`
	DraftAuditEventID       string `json:"draft_audit_event_id"`
	AuditEventID            string `json:"audit_event_id"`
	EmailLogID              string `json:"email_log_id"`
	IntegrationCredentialID string `json:"integration_credential_id"`
}

type LineageFixtureSet struct {
	UploadOnlyDocumentID      string `json:"upload_only_document_id"`
	ImportedDocumentID        string `json:"imported_document_id"`
	ImportedAgreementID       string `json:"imported_agreement_id"`
	SourceDocumentID          string `json:"source_document_id"`
	LegacySourceHandleID      string `json:"legacy_source_handle_id"`
	ActiveSourceHandleID      string `json:"active_source_handle_id"`
	FirstSourceRevisionID     string `json:"first_source_revision_id"`
	FirstSourceArtifactID     string `json:"first_source_artifact_id"`
	RepeatedImportDocumentID  string `json:"repeated_import_document_id"`
	SecondSourceRevisionID    string `json:"second_source_revision_id"`
	SecondSourceArtifactID    string `json:"second_source_artifact_id"`
	CandidateSourceDocumentID string `json:"candidate_source_document_id"`
	CandidateSourceHandleID   string `json:"candidate_source_handle_id"`
	CandidateRelationshipID   string `json:"candidate_relationship_id"`
}

// SeedCoreFixtures inserts one scope-bound record for each phase-1 core table.
func SeedCoreFixtures(ctx context.Context, db bun.IDB, scope Scope) (FixtureSet, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if db == nil {
		return FixtureSet{}, invalidRecordError("fixtures", "db", "required")
	}
	scope, err := validateScope(scope)
	if err != nil {
		return FixtureSet{}, err
	}

	now := time.Now().UTC()
	fx := FixtureSet{
		DocumentID:              uuid.NewString(),
		AgreementID:             uuid.NewString(),
		RecipientID:             uuid.NewString(),
		FieldDefinitionID:       uuid.NewString(),
		FieldInstanceID:         uuid.NewString(),
		SigningTokenID:          uuid.NewString(),
		FieldID:                 uuid.NewString(),
		FieldValueID:            uuid.NewString(),
		SignatureArtifactID:     uuid.NewString(),
		DraftAuditEventID:       uuid.NewString(),
		AuditEventID:            uuid.NewString(),
		EmailLogID:              uuid.NewString(),
		IntegrationCredentialID: uuid.NewString(),
	}
	// The v2 relational track preserves recipient-facing IDs while enforcing
	// participant-scoped foreign keys on signing/runtime tables.
	fx.ParticipantID = fx.RecipientID

	if _, err := db.ExecContext(ctx, `
INSERT INTO documents (id, tenant_id, org_id, title, source_original_name, source_object_key, source_sha256, size_bytes, page_count, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`, fx.DocumentID, scope.TenantID, scope.OrgID, "Fixture Document", "fixture-source.pdf", "fixtures/documents/source.pdf", strings.Repeat("a", 64), 1024, 1, now, now); err != nil {
		return FixtureSet{}, err
	}

	if _, err := db.ExecContext(ctx, `
INSERT INTO agreements (id, tenant_id, org_id, document_id, status, title, message, version, created_at, updated_at)
VALUES (?, ?, ?, ?, 'draft', ?, ?, 1, ?, ?)
`, fx.AgreementID, scope.TenantID, scope.OrgID, fx.DocumentID, "Fixture Agreement", "Fixture message", now, now); err != nil {
		return FixtureSet{}, err
	}

	if _, err := db.ExecContext(ctx, `
INSERT INTO recipients (id, tenant_id, org_id, agreement_id, email, name, role, signing_order, first_view_at, last_view_at, decline_reason, version, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, 'signer', 1, ?, ?, '', 1, ?, ?)
`, fx.RecipientID, scope.TenantID, scope.OrgID, fx.AgreementID, "signer@example.com", "Fixture Signer", now, now, now, now); err != nil {
		return FixtureSet{}, err
	}

	if _, err := db.ExecContext(ctx, `
INSERT INTO participants (id, tenant_id, org_id, agreement_id, email, name, role, signing_stage, first_view_at, last_view_at, decline_reason, version, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, 'signer', 1, ?, ?, '', 1, ?, ?)
`, fx.ParticipantID, scope.TenantID, scope.OrgID, fx.AgreementID, "signer@example.com", "Fixture Signer", now, now, now, now); err != nil {
		return FixtureSet{}, err
	}

	if _, err := db.ExecContext(ctx, `
INSERT INTO signing_tokens (id, tenant_id, org_id, agreement_id, recipient_id, token_hash, status, expires_at, created_at)
VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
`, fx.SigningTokenID, scope.TenantID, scope.OrgID, fx.AgreementID, fx.RecipientID, strings.Repeat("b", 64), now.Add(24*time.Hour), now); err != nil {
		return FixtureSet{}, err
	}

	if _, err := db.ExecContext(ctx, `
INSERT INTO fields (id, tenant_id, org_id, agreement_id, recipient_id, field_type, page_number, pos_x, pos_y, width, height, required, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, 'signature', 1, 10, 10, 100, 40, 1, ?, ?)
`, fx.FieldID, scope.TenantID, scope.OrgID, fx.AgreementID, fx.RecipientID, now, now); err != nil {
		return FixtureSet{}, err
	}

	if _, err := db.ExecContext(ctx, `
INSERT INTO field_definitions (id, tenant_id, org_id, agreement_id, participant_id, field_type, required, validation_json, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, 'signature', TRUE, '', ?, ?)
`, fx.FieldDefinitionID, scope.TenantID, scope.OrgID, fx.AgreementID, fx.ParticipantID, now, now); err != nil {
		return FixtureSet{}, err
	}

	if _, err := db.ExecContext(ctx, `
INSERT INTO field_instances (id, tenant_id, org_id, agreement_id, field_definition_id, page_number, x, y, width, height, tab_index, label, appearance_json, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, 1, 10, 10, 100, 40, 0, '', '', ?, ?)
`, fx.FieldInstanceID, scope.TenantID, scope.OrgID, fx.AgreementID, fx.FieldDefinitionID, now, now); err != nil {
		return FixtureSet{}, err
	}

	if _, err := db.ExecContext(ctx, `
INSERT INTO signature_artifacts (id, tenant_id, org_id, agreement_id, recipient_id, artifact_type, object_key, sha256, created_at)
VALUES (?, ?, ?, ?, ?, 'typed', ?, ?, ?)
`, fx.SignatureArtifactID, scope.TenantID, scope.OrgID, fx.AgreementID, fx.RecipientID, "fixtures/signatures/signature.png", strings.Repeat("c", 64), now); err != nil {
		return FixtureSet{}, err
	}

	if _, err := db.ExecContext(ctx, `
INSERT INTO field_values (id, tenant_id, org_id, agreement_id, recipient_id, field_id, value_text, signature_artifact_id, version, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
`, fx.FieldValueID, scope.TenantID, scope.OrgID, fx.AgreementID, fx.RecipientID, fx.FieldInstanceID, "Fixture Signature", fx.SignatureArtifactID, now, now); err != nil {
		return FixtureSet{}, err
	}

	if _, err := db.ExecContext(ctx, `
INSERT INTO audit_events (id, tenant_id, org_id, agreement_id, event_type, actor_type, actor_id, ip_address, user_agent, metadata_json, created_at)
VALUES (?, ?, ?, ?, 'agreement.created', 'user', 'fixture-user', '127.0.0.1', 'fixture-agent', '{}', ?)
`, fx.AuditEventID, scope.TenantID, scope.OrgID, fx.AgreementID, now); err != nil {
		return FixtureSet{}, err
	}

	if _, err := db.ExecContext(ctx, `
INSERT INTO draft_audit_events (id, tenant_id, org_id, draft_id, event_type, actor_type, actor_id, metadata_json, created_at)
VALUES (?, ?, ?, ?, 'draft.created', 'user', 'fixture-user', '{}', ?)
`, fx.DraftAuditEventID, scope.TenantID, scope.OrgID, "fixture-draft-id", now); err != nil {
		return FixtureSet{}, err
	}

	if _, err := db.ExecContext(ctx, `
INSERT INTO email_logs (id, tenant_id, org_id, agreement_id, recipient_id, template_code, provider_message_id, status, created_at)
VALUES (?, ?, ?, ?, ?, 'esign.sign_request', ?, 'queued', ?)
`, fx.EmailLogID, scope.TenantID, scope.OrgID, fx.AgreementID, fx.RecipientID, "provider-message-id", now); err != nil {
		return FixtureSet{}, err
	}

	if _, err := db.ExecContext(ctx, `
INSERT INTO integration_credentials (id, tenant_id, org_id, user_id, provider, encrypted_access_token, encrypted_refresh_token, scopes_json, expires_at, created_at, updated_at)
VALUES (?, ?, ?, ?, 'google', ?, ?, ?, ?, ?, ?)
`, fx.IntegrationCredentialID, scope.TenantID, scope.OrgID, "fixture-user", "enc-access", "enc-refresh", `["https://www.googleapis.com/auth/drive.readonly"]`, now.Add(24*time.Hour), now, now); err != nil {
		return FixtureSet{}, err
	}

	return fx, nil
}

func SeedLineageFixtures(ctx context.Context, db bun.IDB, scope Scope) (LineageFixtureSet, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if db == nil {
		return LineageFixtureSet{}, invalidRecordError("fixtures", "db", "required")
	}
	scope, err := validateScope(scope)
	if err != nil {
		return LineageFixtureSet{}, err
	}

	now := time.Now().UTC()
	secondNow := now.Add(2 * time.Hour)
	fx := LineageFixtureSet{
		UploadOnlyDocumentID:      uuid.NewString(),
		ImportedDocumentID:        uuid.NewString(),
		ImportedAgreementID:       uuid.NewString(),
		SourceDocumentID:          uuid.NewString(),
		LegacySourceHandleID:      uuid.NewString(),
		ActiveSourceHandleID:      uuid.NewString(),
		FirstSourceRevisionID:     uuid.NewString(),
		FirstSourceArtifactID:     uuid.NewString(),
		RepeatedImportDocumentID:  uuid.NewString(),
		SecondSourceRevisionID:    uuid.NewString(),
		SecondSourceArtifactID:    uuid.NewString(),
		CandidateSourceDocumentID: uuid.NewString(),
		CandidateSourceHandleID:   uuid.NewString(),
		CandidateRelationshipID:   uuid.NewString(),
	}

	if _, err := db.ExecContext(ctx, `
INSERT INTO documents (id, tenant_id, org_id, title, source_original_name, source_object_key, source_sha256, size_bytes, page_count, created_by_user_id, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`, fx.UploadOnlyDocumentID, scope.TenantID, scope.OrgID, "Upload Only Fixture", "upload-only.pdf", "fixtures/upload-only.pdf", strings.Repeat("1", 64), 1024, 1, "fixture-user", now, now); err != nil {
		return LineageFixtureSet{}, err
	}

	if _, err := db.ExecContext(ctx, `
INSERT INTO source_documents (id, tenant_id, org_id, provider_kind, canonical_title, status, lineage_confidence, created_at, updated_at)
VALUES (?, ?, ?, 'google_drive', ?, 'active', 'exact', ?, ?)
`, fx.SourceDocumentID, scope.TenantID, scope.OrgID, "Imported Fixture Source", now, now); err != nil {
		return LineageFixtureSet{}, err
	}
	if _, err := db.ExecContext(ctx, `
INSERT INTO source_handles (id, tenant_id, org_id, source_document_id, provider_kind, external_file_id, account_id, drive_id, web_url, handle_status, valid_from, valid_to, created_at, updated_at)
VALUES (?, ?, ?, ?, 'google_drive', ?, ?, ?, ?, 'superseded', ?, ?, ?, ?)
`, fx.LegacySourceHandleID, scope.TenantID, scope.OrgID, fx.SourceDocumentID, "google-file-legacy", "account-legacy", "drive-root", "https://docs.google.com/document/d/google-file-legacy/edit", now, secondNow, now, secondNow); err != nil {
		return LineageFixtureSet{}, err
	}
	if _, err := db.ExecContext(ctx, `
INSERT INTO source_handles (id, tenant_id, org_id, source_document_id, provider_kind, external_file_id, account_id, drive_id, web_url, handle_status, valid_from, valid_to, created_at, updated_at)
VALUES (?, ?, ?, ?, 'google_drive', ?, ?, ?, ?, 'active', ?, NULL, ?, ?)
`, fx.ActiveSourceHandleID, scope.TenantID, scope.OrgID, fx.SourceDocumentID, "google-file-1", "account-1", "drive-root", "https://docs.google.com/document/d/google-file-1/edit", now, now, now); err != nil {
		return LineageFixtureSet{}, err
	}
	if _, err := db.ExecContext(ctx, `
INSERT INTO source_revisions (id, tenant_id, org_id, source_document_id, source_handle_id, provider_revision_hint, modified_time, exported_at, exported_by_user_id, source_mime_type, metadata_json, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`, fx.FirstSourceRevisionID, scope.TenantID, scope.OrgID, fx.SourceDocumentID, fx.ActiveSourceHandleID, "v1", now, now, "fixture-user", "application/vnd.google-apps.document", `{"origin":"native_google_import","revision_signature":"sig-v1"}`, now, now); err != nil {
		return LineageFixtureSet{}, err
	}
	if _, err := db.ExecContext(ctx, `
INSERT INTO source_artifacts (id, tenant_id, org_id, source_revision_id, artifact_kind, object_key, sha256, page_count, size_bytes, compatibility_tier, compatibility_reason, normalization_status, created_at, updated_at)
VALUES (?, ?, ?, ?, 'signable_pdf', ?, ?, ?, ?, ?, ?, ?, ?, ?)
`, fx.FirstSourceArtifactID, scope.TenantID, scope.OrgID, fx.FirstSourceRevisionID, "fixtures/google-v1.pdf", strings.Repeat("2", 64), 3, 4096, "full", "", "completed", now, now); err != nil {
		return LineageFixtureSet{}, err
	}
	if _, err := db.ExecContext(ctx, `
INSERT INTO documents (id, tenant_id, org_id, title, source_original_name, source_object_key, normalized_object_key, source_sha256, size_bytes, page_count, source_type, source_google_file_id, source_google_doc_url, source_mime_type, source_ingestion_mode, source_document_id, source_revision_id, source_artifact_id, created_by_user_id, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'google_drive', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`, fx.ImportedDocumentID, scope.TenantID, scope.OrgID, "Imported Fixture Source", "Imported Fixture Source.pdf", "fixtures/google-v1.pdf", "fixtures/google-v1.normalized.pdf", strings.Repeat("2", 64), 4096, 3, "google-file-1", "https://docs.google.com/document/d/google-file-1/edit", "application/vnd.google-apps.document", "google_export_pdf", fx.SourceDocumentID, fx.FirstSourceRevisionID, fx.FirstSourceArtifactID, "fixture-user", now, now); err != nil {
		return LineageFixtureSet{}, err
	}
	if _, err := db.ExecContext(ctx, `
INSERT INTO agreements (id, tenant_id, org_id, document_id, status, title, message, version, source_type, source_google_file_id, source_google_doc_url, source_mime_type, source_ingestion_mode, source_revision_id, created_by_user_id, updated_by_user_id, created_at, updated_at)
VALUES (?, ?, ?, ?, 'draft', ?, ?, 1, 'google_drive', ?, ?, ?, ?, ?, ?, ?, ?, ?)
`, fx.ImportedAgreementID, scope.TenantID, scope.OrgID, fx.ImportedDocumentID, "Imported Fixture Agreement", "Fixture", "google-file-1", "https://docs.google.com/document/d/google-file-1/edit", "application/vnd.google-apps.document", "google_export_pdf", fx.FirstSourceRevisionID, "fixture-user", "fixture-user", now, now); err != nil {
		return LineageFixtureSet{}, err
	}

	if _, err := db.ExecContext(ctx, `
INSERT INTO source_revisions (id, tenant_id, org_id, source_document_id, source_handle_id, provider_revision_hint, modified_time, exported_at, exported_by_user_id, source_mime_type, metadata_json, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`, fx.SecondSourceRevisionID, scope.TenantID, scope.OrgID, fx.SourceDocumentID, fx.ActiveSourceHandleID, "v2", secondNow, secondNow, "fixture-user", "application/vnd.google-apps.document", `{"origin":"native_google_import","revision_signature":"sig-v2"}`, secondNow, secondNow); err != nil {
		return LineageFixtureSet{}, err
	}
	if _, err := db.ExecContext(ctx, `
INSERT INTO source_artifacts (id, tenant_id, org_id, source_revision_id, artifact_kind, object_key, sha256, page_count, size_bytes, compatibility_tier, compatibility_reason, normalization_status, created_at, updated_at)
VALUES (?, ?, ?, ?, 'signable_pdf', ?, ?, ?, ?, ?, ?, ?, ?, ?)
`, fx.SecondSourceArtifactID, scope.TenantID, scope.OrgID, fx.SecondSourceRevisionID, "fixtures/google-v2.pdf", strings.Repeat("3", 64), 4, 5120, "full", "", "completed", secondNow, secondNow); err != nil {
		return LineageFixtureSet{}, err
	}
	if _, err := db.ExecContext(ctx, `
INSERT INTO documents (id, tenant_id, org_id, title, source_original_name, source_object_key, normalized_object_key, source_sha256, size_bytes, page_count, source_type, source_google_file_id, source_google_doc_url, source_mime_type, source_ingestion_mode, source_document_id, source_revision_id, source_artifact_id, created_by_user_id, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'google_drive', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`, fx.RepeatedImportDocumentID, scope.TenantID, scope.OrgID, "Imported Fixture Source Rev 2", "Imported Fixture Source Rev 2.pdf", "fixtures/google-v2.pdf", "fixtures/google-v2.normalized.pdf", strings.Repeat("3", 64), 5120, 4, "google-file-1", "https://docs.google.com/document/d/google-file-1/edit", "application/vnd.google-apps.document", "google_export_pdf", fx.SourceDocumentID, fx.SecondSourceRevisionID, fx.SecondSourceArtifactID, "fixture-user", secondNow, secondNow); err != nil {
		return LineageFixtureSet{}, err
	}

	if _, err := db.ExecContext(ctx, `
INSERT INTO source_documents (id, tenant_id, org_id, provider_kind, canonical_title, status, lineage_confidence, created_at, updated_at)
VALUES (?, ?, ?, 'google_drive', ?, 'active', 'medium', ?, ?)
`, fx.CandidateSourceDocumentID, scope.TenantID, scope.OrgID, "Imported Fixture Source", secondNow, secondNow); err != nil {
		return LineageFixtureSet{}, err
	}
	if _, err := db.ExecContext(ctx, `
INSERT INTO source_handles (id, tenant_id, org_id, source_document_id, provider_kind, external_file_id, account_id, drive_id, web_url, handle_status, valid_from, valid_to, created_at, updated_at)
VALUES (?, ?, ?, ?, 'google_drive', ?, ?, ?, ?, 'active', ?, NULL, ?, ?)
`, fx.CandidateSourceHandleID, scope.TenantID, scope.OrgID, fx.CandidateSourceDocumentID, "google-file-candidate", "account-2", "drive-root", "https://docs.google.com/document/d/google-file-candidate/edit", secondNow, secondNow, secondNow); err != nil {
		return LineageFixtureSet{}, err
	}
	if _, err := db.ExecContext(ctx, `
INSERT INTO source_relationships (id, tenant_id, org_id, left_source_document_id, right_source_document_id, relationship_type, confidence_band, confidence_score, status, evidence_json, created_by_user_id, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, 'same_logical_doc', 'medium', 0.72, 'pending_review', ?, ?, ?, ?)
`, fx.CandidateRelationshipID, scope.TenantID, scope.OrgID, fx.CandidateSourceDocumentID, fx.SourceDocumentID, `{"candidate_reason":"matching_title_with_partial_google_context"}`, "fixture-user", secondNow, secondNow); err != nil {
		return LineageFixtureSet{}, err
	}

	return fx, nil
}

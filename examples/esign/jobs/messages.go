package jobs

import (
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

type EmailSendSigningRequestMsg struct {
	Scope               stores.Scope `json:"scope"`
	AgreementID         string       `json:"agreement_id"`
	RecipientID         string       `json:"recipient_id"`
	ReviewID            string       `json:"review_id"`
	ReviewParticipantID string       `json:"review_participant_id"`
	RecipientEmail      string       `json:"recipient_email"`
	RecipientName       string       `json:"recipient_name"`
	EffectID            string       `json:"effect_id"`
	TemplateCode        string       `json:"template_code"`
	Notification        string       `json:"notification"`
	SignerToken         string       `json:"signer_token"`
	ReviewToken         string       `json:"review_token"`
	SignURL             string       `json:"sign_url"`
	ReviewURL           string       `json:"review_url"`
	CompletionURL       string       `json:"completion_url"`
	CorrelationID       string       `json:"correlation_id"`
	DedupeKey           string       `json:"dedupe_key"`
	MaxAttempts         int          `json:"max_attempts"`
}

func (EmailSendSigningRequestMsg) Type() string { return JobEmailSendSigningRequest }

type PDFRenderPagesMsg struct {
	Scope         stores.Scope `json:"scope"`
	AgreementID   string       `json:"agreement_id"`
	CorrelationID string       `json:"correlation_id"`
	DedupeKey     string       `json:"dedupe_key"`
	MaxAttempts   int          `json:"max_attempts"`
}

func (PDFRenderPagesMsg) Type() string { return JobPDFRenderPages }

type PDFGenerateExecutedMsg struct {
	Scope         stores.Scope `json:"scope"`
	AgreementID   string       `json:"agreement_id"`
	CorrelationID string       `json:"correlation_id"`
	DedupeKey     string       `json:"dedupe_key"`
	MaxAttempts   int          `json:"max_attempts"`
}

func (PDFGenerateExecutedMsg) Type() string { return JobPDFGenerateExecuted }

type PDFGenerateCertificateMsg struct {
	Scope         stores.Scope `json:"scope"`
	AgreementID   string       `json:"agreement_id"`
	CorrelationID string       `json:"correlation_id"`
	DedupeKey     string       `json:"dedupe_key"`
	MaxAttempts   int          `json:"max_attempts"`
}

func (PDFGenerateCertificateMsg) Type() string { return JobPDFGenerateCertificate }

type PDFBackfillDocumentsMsg struct {
	Scope               stores.Scope `json:"scope"`
	CorrelationID       string       `json:"correlation_id"`
	DedupeKey           string       `json:"dedupe_key"`
	MaxAttempts         int          `json:"max_attempts"`
	Limit               int          `json:"limit"`
	Offset              int          `json:"offset"`
	DryRun              bool         `json:"dry_run"`
	AllowPartialFailure bool         `json:"allow_partial_failure"`
}

func (PDFBackfillDocumentsMsg) Type() string { return JobPDFBackfillDocuments }

type TokenRotateMsg struct {
	Scope         stores.Scope `json:"scope"`
	AgreementID   string       `json:"agreement_id"`
	RecipientID   string       `json:"recipient_id"`
	CorrelationID string       `json:"correlation_id"`
	DedupeKey     string       `json:"dedupe_key"`
	MaxAttempts   int          `json:"max_attempts"`
}

func (TokenRotateMsg) Type() string { return JobTokenRotate }

type GoogleDriveImportMsg struct {
	Scope             stores.Scope `json:"scope"`
	ImportRunID       string       `json:"import_run_id"`
	UserID            string       `json:"user_id"`
	GoogleAccountID   string       `json:"google_account_id"`
	GoogleFileID      string       `json:"google_file_id"`
	SourceVersionHint string       `json:"source_version_hint"`
	DocumentTitle     string       `json:"document_title"`
	AgreementTitle    string       `json:"agreement_title"`
	CreatedByUserID   string       `json:"created_by_user_id"`
	CorrelationID     string       `json:"correlation_id"`
	DedupeKey         string       `json:"dedupe_key"`
}

func (GoogleDriveImportMsg) Type() string { return JobGoogleDriveImport }

type SourceLineageProcessingMsg struct {
	Scope            stores.Scope                    `json:"scope"`
	ImportRunID      string                          `json:"import_run_id"`
	SourceDocumentID string                          `json:"source_document_id"`
	SourceRevisionID string                          `json:"source_revision_id"`
	ArtifactID       string                          `json:"artifact_id"`
	ActorID          string                          `json:"actor_id"`
	Metadata         services.SourceMetadataBaseline `json:"metadata"`
	CorrelationID    string                          `json:"correlation_id"`
	DedupeKey        string                          `json:"dedupe_key"`
	MaxAttempts      int                             `json:"max_attempts"`
}

func (SourceLineageProcessingMsg) Type() string { return JobSourceLineageProcessing }

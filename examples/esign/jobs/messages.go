package jobs

import "github.com/goliatone/go-admin/examples/esign/stores"

type EmailSendSigningRequestMsg struct {
	Scope         stores.Scope
	AgreementID   string
	RecipientID   string
	TemplateCode  string
	Notification  string
	SignerToken   string
	SignURL       string
	CompletionURL string
	CorrelationID string
	DedupeKey     string
	MaxAttempts   int
}

func (EmailSendSigningRequestMsg) Type() string { return JobEmailSendSigningRequest }

type PDFRenderPagesMsg struct {
	Scope         stores.Scope
	AgreementID   string
	CorrelationID string
	DedupeKey     string
	MaxAttempts   int
}

func (PDFRenderPagesMsg) Type() string { return JobPDFRenderPages }

type PDFGenerateExecutedMsg struct {
	Scope         stores.Scope
	AgreementID   string
	CorrelationID string
	DedupeKey     string
	MaxAttempts   int
}

func (PDFGenerateExecutedMsg) Type() string { return JobPDFGenerateExecuted }

type PDFGenerateCertificateMsg struct {
	Scope         stores.Scope
	AgreementID   string
	CorrelationID string
	DedupeKey     string
	MaxAttempts   int
}

func (PDFGenerateCertificateMsg) Type() string { return JobPDFGenerateCertificate }

type TokenRotateMsg struct {
	Scope         stores.Scope
	AgreementID   string
	RecipientID   string
	CorrelationID string
	DedupeKey     string
	MaxAttempts   int
}

func (TokenRotateMsg) Type() string { return JobTokenRotate }

type GoogleDriveImportMsg struct {
	Scope             stores.Scope
	ImportRunID       string
	UserID            string
	GoogleAccountID   string
	GoogleFileID      string
	SourceVersionHint string
	DocumentTitle     string
	AgreementTitle    string
	CreatedByUserID   string
	CorrelationID     string
	DedupeKey         string
}

func (GoogleDriveImportMsg) Type() string { return JobGoogleDriveImport }

package jobs

const (
	JobEmailSendSigningRequest = "jobs.esign.email_send_signing_request"
	JobPDFRenderPages          = "jobs.esign.pdf_render_pages"
	JobPDFGenerateExecuted     = "jobs.esign.pdf_generate_executed"
	JobPDFGenerateCertificate  = "jobs.esign.pdf_generate_certificate"
	JobPDFBackfillDocuments    = "jobs.esign.pdf_backfill_documents"
	JobTokenRotate             = "jobs.esign.token_rotate"
	JobGoogleDriveImport       = "jobs.esign.google_drive_import"
)

var All = []string{
	JobEmailSendSigningRequest,
	JobPDFRenderPages,
	JobPDFGenerateExecuted,
	JobPDFGenerateCertificate,
	JobPDFBackfillDocuments,
	JobTokenRotate,
	JobGoogleDriveImport,
}

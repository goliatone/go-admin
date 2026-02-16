package commands

const (
	CommandAgreementSend   = "esign.agreements.send"
	CommandAgreementVoid   = "esign.agreements.void"
	CommandAgreementResend = "esign.agreements.resend"
	CommandTokenRotate     = "esign.tokens.rotate"
	CommandDraftCleanup    = "esign.drafts.cleanup"
)

var All = []string{
	CommandAgreementSend,
	CommandAgreementVoid,
	CommandAgreementResend,
	CommandTokenRotate,
	CommandDraftCleanup,
}

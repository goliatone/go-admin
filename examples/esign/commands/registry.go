package commands

const (
	CommandAgreementSend   = "esign.agreements.send"
	CommandAgreementVoid   = "esign.agreements.void"
	CommandAgreementResend = "esign.agreements.resend"
	CommandTokenRotate     = "esign.tokens.rotate"
)

var All = []string{
	CommandAgreementSend,
	CommandAgreementVoid,
	CommandAgreementResend,
	CommandTokenRotate,
}

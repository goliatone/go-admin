package commands

const (
	CommandAgreementSend            = "esign.agreements.send"
	CommandAgreementVoid            = "esign.agreements.void"
	CommandAgreementResend          = "esign.agreements.resend"
	CommandAgreementReminderSweep   = "esign.agreements.reminders.sweep"
	CommandAgreementReminderCleanup = "esign.agreements.reminders.cleanup_internal_errors"
	CommandAgreementReminderPause   = "esign.agreements.reminders.pause"
	CommandAgreementReminderResume  = "esign.agreements.reminders.resume"
	CommandAgreementReminderSendNow = "esign.agreements.reminders.send_now"
	CommandTokenRotate              = "esign.tokens.rotate"
	CommandDraftCleanup             = "esign.drafts.cleanup"
)

var All = []string{
	CommandAgreementSend,
	CommandAgreementVoid,
	CommandAgreementResend,
	CommandAgreementReminderSweep,
	CommandAgreementReminderCleanup,
	CommandAgreementReminderPause,
	CommandAgreementReminderResume,
	CommandAgreementReminderSendNow,
	CommandTokenRotate,
	CommandDraftCleanup,
}

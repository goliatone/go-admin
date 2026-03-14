package commands

const (
	CommandAgreementSend            = "esign.agreements.send"
	CommandAgreementVoid            = "esign.agreements.void"
	CommandAgreementResend          = "esign.agreements.resend"
	CommandAgreementDeliveryResume  = "esign.agreements.delivery.resume"
	CommandAgreementReminderSweep   = "esign.agreements.reminders.sweep"
	CommandAgreementReminderCleanup = "esign.agreements.reminders.cleanup_internal_errors"
	CommandAgreementReminderPause   = "esign.agreements.reminders.pause"
	CommandAgreementReminderResume  = "esign.agreements.reminders.resume"
	CommandAgreementReminderSendNow = "esign.agreements.reminders.send_now"
	CommandGuardedEffectResume      = "esign.effects.resume"
	CommandPDFRemediate             = "esign.pdf.remediate"
	CommandTokenRotate              = "esign.tokens.rotate"
	CommandDraftCleanup             = "esign.drafts.cleanup"
)

var All = []string{
	CommandAgreementSend,
	CommandAgreementVoid,
	CommandAgreementResend,
	CommandAgreementDeliveryResume,
	CommandAgreementReminderSweep,
	CommandAgreementReminderCleanup,
	CommandAgreementReminderPause,
	CommandAgreementReminderResume,
	CommandAgreementReminderSendNow,
	CommandGuardedEffectResume,
	CommandPDFRemediate,
	CommandTokenRotate,
	CommandDraftCleanup,
}

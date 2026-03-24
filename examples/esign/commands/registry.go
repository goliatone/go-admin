package commands

const (
	CommandAgreementSend                  = "esign.agreements.send"
	CommandAgreementVoid                  = "esign.agreements.void"
	CommandAgreementResend                = "esign.agreements.resend"
	CommandAgreementRequestCorrection     = "esign.agreements.request_correction"
	CommandAgreementRequestAmendment      = "esign.agreements.request_amendment"
	CommandAgreementRequestReview         = "esign.agreements.request_review"
	CommandAgreementReopenReview          = "esign.agreements.reopen_review"
	CommandAgreementNotifyReviewers       = "esign.agreements.notify_reviewers"
	CommandAgreementReviewReminderPause   = "esign.agreements.review_reminder.pause"
	CommandAgreementReviewReminderResume  = "esign.agreements.review_reminder.resume"
	CommandAgreementReviewReminderSendNow = "esign.agreements.review_reminder.send_now"
	CommandAgreementCloseReview           = "esign.agreements.close_review"
	CommandAgreementForceApproveReview    = "esign.agreements.force_approve_review"
	CommandAgreementApproveReviewOnBehalf = "esign.agreements.approve_review_participant_on_behalf"
	CommandAgreementApproveReview         = "esign.agreements.approve_review"
	CommandAgreementRequestReviewChanges  = "esign.agreements.request_review_changes"
	CommandAgreementCreateCommentThread   = "esign.agreements.create_comment_thread"
	CommandAgreementReplyCommentThread    = "esign.agreements.reply_comment_thread"
	CommandAgreementResolveCommentThread  = "esign.agreements.resolve_comment_thread"
	CommandAgreementReopenCommentThread   = "esign.agreements.reopen_comment_thread"
	CommandAgreementDeliveryResume        = "esign.agreements.delivery.resume"
	CommandAgreementReminderSweep         = "esign.agreements.reminders.sweep"
	CommandAgreementReminderCleanup       = "esign.agreements.reminders.cleanup_internal_errors"
	CommandAgreementReminderPause         = "esign.agreements.reminders.pause"
	CommandAgreementReminderResume        = "esign.agreements.reminders.resume"
	CommandAgreementReminderSendNow       = "esign.agreements.reminders.send_now"
	CommandGuardedEffectResume            = "esign.effects.resume"
	CommandPDFRemediate                   = "esign.pdf.remediate"
	// #nosec G101 -- command identifier, not an access token.
	CommandTokenRotate  = "esign.tokens.rotate"
	CommandDraftCleanup = "esign.drafts.cleanup"
)

var All = []string{
	CommandAgreementSend,
	CommandAgreementVoid,
	CommandAgreementResend,
	CommandAgreementRequestCorrection,
	CommandAgreementRequestAmendment,
	CommandAgreementRequestReview,
	CommandAgreementReopenReview,
	CommandAgreementNotifyReviewers,
	CommandAgreementReviewReminderPause,
	CommandAgreementReviewReminderResume,
	CommandAgreementReviewReminderSendNow,
	CommandAgreementCloseReview,
	CommandAgreementForceApproveReview,
	CommandAgreementApproveReviewOnBehalf,
	CommandAgreementApproveReview,
	CommandAgreementRequestReviewChanges,
	CommandAgreementCreateCommentThread,
	CommandAgreementReplyCommentThread,
	CommandAgreementResolveCommentThread,
	CommandAgreementReopenCommentThread,
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

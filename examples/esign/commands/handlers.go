package commands

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	auth "github.com/goliatone/go-auth"
	gocommand "github.com/goliatone/go-command"
	"github.com/goliatone/go-command/dispatcher"
	goerrors "github.com/goliatone/go-errors"
)

// AgreementLifecycleService captures agreement domain transitions triggered by admin actions.
type AgreementLifecycleService interface {
	Send(ctx context.Context, scope stores.Scope, agreementID string, input services.SendInput) (stores.AgreementRecord, error)
	Void(ctx context.Context, scope stores.Scope, agreementID string, input services.VoidInput) (stores.AgreementRecord, error)
	Resend(ctx context.Context, scope stores.Scope, agreementID string, input services.ResendInput) (services.ResendResult, error)
	CreateRevision(ctx context.Context, scope stores.Scope, input services.CreateRevisionInput) (stores.AgreementRecord, error)
	OpenReview(ctx context.Context, scope stores.Scope, agreementID string, input services.ReviewOpenInput) (services.ReviewSummary, error)
	ReopenReview(ctx context.Context, scope stores.Scope, agreementID string, input services.ReviewOpenInput) (services.ReviewSummary, error)
	NotifyReviewers(ctx context.Context, scope stores.Scope, agreementID string, input services.ReviewNotifyInput) (services.ReviewSummary, error)
	PauseReviewReminder(ctx context.Context, scope stores.Scope, agreementID string, input services.ReviewReminderControlInput) (services.ReviewReminderState, error)
	ResumeReviewReminder(ctx context.Context, scope stores.Scope, agreementID string, input services.ReviewReminderControlInput) (services.ReviewReminderState, error)
	SendReviewReminderNow(ctx context.Context, scope stores.Scope, agreementID string, input services.ReviewReminderControlInput) (services.ReviewSummary, error)
	CloseReview(ctx context.Context, scope stores.Scope, agreementID, actorType, actorID, ipAddress string) (services.ReviewSummary, error)
	ApproveReview(ctx context.Context, scope stores.Scope, agreementID string, input services.ReviewDecisionInput) (services.ReviewSummary, error)
	RequestReviewChanges(ctx context.Context, scope stores.Scope, agreementID string, input services.ReviewDecisionInput) (services.ReviewSummary, error)
	CreateCommentThread(ctx context.Context, scope stores.Scope, agreementID string, input services.ReviewCommentThreadInput) (services.ReviewThread, error)
	ReplyCommentThread(ctx context.Context, scope stores.Scope, agreementID string, input services.ReviewCommentReplyInput) (services.ReviewThread, error)
	ResolveCommentThread(ctx context.Context, scope stores.Scope, agreementID string, input services.ReviewCommentStateInput) (services.ReviewThread, error)
	ReopenCommentThread(ctx context.Context, scope stores.Scope, agreementID string, input services.ReviewCommentStateInput) (services.ReviewThread, error)
}

type AgreementNotificationEffectsReader interface {
	ListAgreementNotificationEffects(ctx context.Context, scope stores.Scope, agreementID string) ([]services.AgreementNotificationEffectDetail, error)
}

// TokenRotator captures explicit token rotation behavior.
type TokenRotator interface {
	Rotate(ctx context.Context, scope stores.Scope, agreementID, recipientID string) (stores.IssuedSigningToken, error)
}

// DraftCleanupService captures expired draft cleanup behavior.
type DraftCleanupService interface {
	CleanupExpiredDrafts(ctx context.Context, before time.Time) (int, error)
}

// AgreementReminderService captures reminder sweep and operator controls.
type AgreementReminderService interface {
	Sweep(ctx context.Context, scope stores.Scope) (services.AgreementReminderSweepResult, error)
	CleanupInternalErrors(ctx context.Context, scope stores.Scope, now time.Time, limit int) (int, error)
	Pause(ctx context.Context, scope stores.Scope, agreementID, recipientID string) (stores.AgreementReminderStateRecord, error)
	Resume(ctx context.Context, scope stores.Scope, agreementID, recipientID string) (stores.AgreementReminderStateRecord, error)
	SendNow(ctx context.Context, scope stores.Scope, agreementID, recipientID string) (services.ResendResult, error)
}

// AgreementActivityProjector projects canonical audit events into the shared activity feed.
type AgreementActivityProjector interface {
	ProjectAgreement(ctx context.Context, scope stores.Scope, agreementID string) error
}

// PDFRemediationCommandService captures document remediation workflow execution.
type PDFRemediationCommandService interface {
	Remediate(ctx context.Context, scope stores.Scope, input services.PDFRemediationRequest) (services.PDFRemediationResult, error)
}

type GuardedEffectRecoveryService interface {
	ResumeEffect(ctx context.Context, scope stores.Scope, effectID string, input services.GuardedEffectResumeInput) (services.GuardedEffectResumeResult, error)
	ResumeAgreementDelivery(ctx context.Context, scope stores.Scope, agreementID string, input services.AgreementDeliveryResumeInput) (services.AgreementDeliveryResumeResult, error)
}

type registerOptions struct {
	remediation    PDFRemediationCommandService
	effectRecovery GuardedEffectRecoveryService
}

// RegisterOption customizes command registration behavior.
type RegisterOption func(*registerOptions)

// WithPDFRemediationService enables the `esign.pdf.remediate` command.
func WithPDFRemediationService(service PDFRemediationCommandService) RegisterOption {
	return func(opts *registerOptions) {
		if opts == nil {
			return
		}
		opts.remediation = service
	}
}

func WithGuardedEffectRecoveryService(service GuardedEffectRecoveryService) RegisterOption {
	return func(opts *registerOptions) {
		if opts == nil {
			return
		}
		opts.effectRecovery = service
	}
}

// Register wires typed command handlers and panel payload factories for e-sign actions.
func Register(
	bus *coreadmin.CommandBus,
	agreements AgreementLifecycleService,
	tokens TokenRotator,
	drafts DraftCleanupService,
	agreementReminders AgreementReminderService,
	reminderSweepCron string,
	defaultScope stores.Scope,
	projector AgreementActivityProjector,
	registerOpts ...RegisterOption,
) error {
	opts := registerOptions{}
	for _, opt := range registerOpts {
		if opt != nil {
			opt(&opts)
		}
	}
	if err := RegisterCommandFactories(bus); err != nil {
		return err
	}
	if _, err := coreadmin.RegisterCommand(bus, &AgreementSendCommand{agreements: agreements, defaultScope: defaultScope, projector: projector}); err != nil {
		return err
	}
	if _, err := coreadmin.RegisterCommand(bus, &AgreementVoidCommand{agreements: agreements, defaultScope: defaultScope, projector: projector}); err != nil {
		return err
	}
	if _, err := coreadmin.RegisterCommand(bus, &AgreementResendCommand{agreements: agreements, defaultScope: defaultScope, projector: projector}); err != nil {
		return err
	}
	if _, err := coreadmin.RegisterCommand(bus, &AgreementRequestCorrectionCommand{agreements: agreements, defaultScope: defaultScope, projector: projector}); err != nil {
		return err
	}
	if _, err := coreadmin.RegisterCommand(bus, &AgreementRequestAmendmentCommand{agreements: agreements, defaultScope: defaultScope, projector: projector}); err != nil {
		return err
	}
	if _, err := coreadmin.RegisterCommand(bus, &AgreementRequestReviewCommand{agreements: agreements, defaultScope: defaultScope, projector: projector}); err != nil {
		return err
	}
	if _, err := coreadmin.RegisterCommand(bus, &AgreementReopenReviewCommand{agreements: agreements, defaultScope: defaultScope, projector: projector}); err != nil {
		return err
	}
	if _, err := coreadmin.RegisterCommand(bus, &AgreementNotifyReviewersCommand{agreements: agreements, defaultScope: defaultScope, projector: projector}); err != nil {
		return err
	}
	if _, err := coreadmin.RegisterCommand(bus, &AgreementReviewReminderPauseCommand{agreements: agreements, defaultScope: defaultScope, projector: projector}); err != nil {
		return err
	}
	if _, err := coreadmin.RegisterCommand(bus, &AgreementReviewReminderResumeCommand{agreements: agreements, defaultScope: defaultScope, projector: projector}); err != nil {
		return err
	}
	if _, err := coreadmin.RegisterCommand(bus, &AgreementReviewReminderSendNowCommand{agreements: agreements, defaultScope: defaultScope, projector: projector}); err != nil {
		return err
	}
	if _, err := coreadmin.RegisterCommand(bus, &AgreementCloseReviewCommand{agreements: agreements, defaultScope: defaultScope, projector: projector}); err != nil {
		return err
	}
	if _, err := coreadmin.RegisterCommand(bus, &AgreementApproveReviewCommand{agreements: agreements, defaultScope: defaultScope, projector: projector}); err != nil {
		return err
	}
	if _, err := coreadmin.RegisterCommand(bus, &AgreementRequestReviewChangesCommand{agreements: agreements, defaultScope: defaultScope, projector: projector}); err != nil {
		return err
	}
	if _, err := coreadmin.RegisterCommand(bus, &AgreementCreateCommentThreadCommand{agreements: agreements, defaultScope: defaultScope, projector: projector}); err != nil {
		return err
	}
	if _, err := coreadmin.RegisterCommand(bus, &AgreementReplyCommentThreadCommand{agreements: agreements, defaultScope: defaultScope, projector: projector}); err != nil {
		return err
	}
	if _, err := coreadmin.RegisterCommand(bus, &AgreementResolveCommentThreadCommand{agreements: agreements, defaultScope: defaultScope, projector: projector}); err != nil {
		return err
	}
	if _, err := coreadmin.RegisterCommand(bus, &AgreementReopenCommentThreadCommand{agreements: agreements, defaultScope: defaultScope, projector: projector}); err != nil {
		return err
	}
	if opts.effectRecovery != nil {
		if _, err := coreadmin.RegisterCommand(bus, &AgreementDeliveryResumeCommand{
			recovery:     opts.effectRecovery,
			defaultScope: defaultScope,
			projector:    projector,
		}); err != nil {
			return err
		}
		if _, err := coreadmin.RegisterCommand(bus, &GuardedEffectResumeCommand{
			recovery:     opts.effectRecovery,
			defaultScope: defaultScope,
		}); err != nil {
			return err
		}
	}
	if _, err := coreadmin.RegisterCommand(bus, &TokenRotateCommand{tokens: tokens, defaultScope: defaultScope, projector: projector}); err != nil {
		return err
	}
	if drafts != nil {
		if _, err := coreadmin.RegisterCommand(bus, &DraftCleanupCommand{drafts: drafts, defaultScope: defaultScope}); err != nil {
			return err
		}
	}
	if agreementReminders != nil {
		if _, err := coreadmin.RegisterCommand(bus, &AgreementReminderSweepCommand{
			reminders:      agreementReminders,
			defaultScope:   defaultScope,
			cronExpression: strings.TrimSpace(reminderSweepCron),
		}); err != nil {
			return err
		}
		if _, err := coreadmin.RegisterCommand(bus, &AgreementReminderCleanupCommand{
			reminders:    agreementReminders,
			defaultScope: defaultScope,
		}); err != nil {
			return err
		}
		if _, err := coreadmin.RegisterCommand(bus, &AgreementReminderPauseCommand{reminders: agreementReminders, defaultScope: defaultScope}); err != nil {
			return err
		}
		if _, err := coreadmin.RegisterCommand(bus, &AgreementReminderResumeCommand{reminders: agreementReminders, defaultScope: defaultScope}); err != nil {
			return err
		}
		if _, err := coreadmin.RegisterCommand(bus, &AgreementReminderSendNowCommand{reminders: agreementReminders, defaultScope: defaultScope, projector: projector}); err != nil {
			return err
		}
	}
	if opts.remediation != nil {
		if _, err := coreadmin.RegisterCommand(bus, &PDFRemediationCommand{
			remediation:  opts.remediation,
			defaultScope: defaultScope,
		}); err != nil {
			return err
		}
	}
	return nil
}

// AgreementSendCommand dispatches send transitions through the agreement service.
type AgreementSendCommand struct {
	agreements   AgreementLifecycleService
	defaultScope stores.Scope
	projector    AgreementActivityProjector
}

var _ gocommand.Commander[AgreementSendInput] = (*AgreementSendCommand)(nil)

func (c *AgreementSendCommand) Execute(ctx context.Context, msg AgreementSendInput) error {
	startedAt := time.Now()
	correlationID := observability.ResolveCorrelationID(msg.CorrelationID, msg.IdempotencyKey, msg.AgreementID, CommandAgreementSend)
	if c == nil || c.agreements == nil {
		err := fmt.Errorf("agreement send command not configured")
		observability.ObserveSend(ctx, time.Since(startedAt), false)
		observability.LogOperation(ctx, slog.LevelError, "command", "agreement_send", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandAgreementSend,
		})
		return err
	}
	if err := msg.Validate(); err != nil {
		observability.ObserveSend(ctx, time.Since(startedAt), false)
		observability.LogOperation(ctx, slog.LevelWarn, "command", "agreement_send", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandAgreementSend,
		})
		return err
	}
	scope, err := resolveScope(ctx, msg.Scope, c.defaultScope)
	if err != nil {
		observability.ObserveSend(ctx, time.Since(startedAt), false)
		observability.LogOperation(ctx, slog.LevelWarn, "command", "agreement_send", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandAgreementSend,
		})
		return err
	}
	agreementID := strings.TrimSpace(msg.AgreementID)
	sendInput := msg.SendInput()
	sendInput.IPAddress = resolveCommandRequestIP(ctx)
	agreement, err := c.agreements.Send(ctx, scope, agreementID, sendInput)
	if err != nil {
		observability.ObserveSend(ctx, time.Since(startedAt), false)
		observability.LogOperation(ctx, slog.LevelWarn, "command", "agreement_send", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandAgreementSend,
			"agreement_id": agreementID,
		})
		return err
	}
	if err := projectAgreementActivity(ctx, c.projector, scope, agreement.ID); err != nil {
		observability.ObserveSend(ctx, time.Since(startedAt), false)
		observability.LogOperation(ctx, slog.LevelWarn, "command", "agreement_send", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandAgreementSend,
			"agreement_id": strings.TrimSpace(agreement.ID),
		})
		return err
	}
	storeAgreementQueuedResponse(ctx, agreement, correlationID, agreementNotificationEffects(ctx, c.agreements, scope, agreement.ID))
	observability.ObserveSend(ctx, time.Since(startedAt), true)
	observability.LogOperation(ctx, slog.LevelInfo, "command", "agreement_send", "success", correlationID, time.Since(startedAt), nil, map[string]any{
		"command_name": CommandAgreementSend,
		"agreement_id": strings.TrimSpace(agreement.ID),
		"mode":         "queued",
	})
	return nil
}

func shouldFallbackToResend(err error) bool {
	if err == nil {
		return false
	}
	var coded *goerrors.Error
	if !errors.As(err, &coded) || coded == nil {
		return false
	}
	metadata := coded.Metadata
	if metadata == nil {
		return false
	}
	entity := strings.ToLower(strings.TrimSpace(fmt.Sprint(metadata["entity"])))
	field := strings.ToLower(strings.TrimSpace(fmt.Sprint(metadata["field"])))
	reason := strings.ToLower(strings.TrimSpace(fmt.Sprint(metadata["reason"])))
	return entity == "agreements" && field == "status" && reason == "send requires draft status"
}

// AgreementVoidCommand dispatches void transitions through the agreement service.
type AgreementVoidCommand struct {
	agreements   AgreementLifecycleService
	defaultScope stores.Scope
	projector    AgreementActivityProjector
}

var _ gocommand.Commander[AgreementVoidInput] = (*AgreementVoidCommand)(nil)

func (c *AgreementVoidCommand) Execute(ctx context.Context, msg AgreementVoidInput) error {
	startedAt := time.Now()
	correlationID := observability.ResolveCorrelationID(msg.CorrelationID, msg.AgreementID, CommandAgreementVoid)
	if c == nil || c.agreements == nil {
		err := fmt.Errorf("agreement void command not configured")
		observability.LogOperation(ctx, slog.LevelError, "command", "agreement_void", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandAgreementVoid,
		})
		return err
	}
	if err := msg.Validate(); err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "command", "agreement_void", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandAgreementVoid,
		})
		return err
	}
	scope, err := resolveScope(ctx, msg.Scope, c.defaultScope)
	if err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "command", "agreement_void", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandAgreementVoid,
		})
		return err
	}
	voidInput := msg.VoidInput()
	voidInput.IPAddress = resolveCommandRequestIP(ctx)
	agreement, err := c.agreements.Void(ctx, scope, strings.TrimSpace(msg.AgreementID), voidInput)
	if err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "command", "agreement_void", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandAgreementVoid,
			"agreement_id": strings.TrimSpace(msg.AgreementID),
		})
		return err
	}
	if err := projectAgreementActivity(ctx, c.projector, scope, agreement.ID); err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "command", "agreement_void", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandAgreementVoid,
			"agreement_id": strings.TrimSpace(agreement.ID),
		})
		return err
	}
	observability.LogOperation(ctx, slog.LevelInfo, "command", "agreement_void", "success", correlationID, time.Since(startedAt), nil, map[string]any{
		"command_name": CommandAgreementVoid,
		"agreement_id": strings.TrimSpace(agreement.ID),
	})
	return nil
}

// AgreementResendCommand dispatches resend transitions through the agreement service.
type AgreementResendCommand struct {
	agreements   AgreementLifecycleService
	defaultScope stores.Scope
	projector    AgreementActivityProjector
}

var _ gocommand.Commander[AgreementResendInput] = (*AgreementResendCommand)(nil)

func (c *AgreementResendCommand) Execute(ctx context.Context, msg AgreementResendInput) error {
	startedAt := time.Now()
	correlationID := observability.ResolveCorrelationID(msg.CorrelationID, msg.IdempotencyKey, msg.AgreementID, CommandAgreementResend)
	if c == nil || c.agreements == nil {
		err := fmt.Errorf("agreement resend command not configured")
		observability.LogOperation(ctx, slog.LevelError, "command", "agreement_resend", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandAgreementResend,
		})
		return err
	}
	if err := msg.Validate(); err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "command", "agreement_resend", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandAgreementResend,
		})
		return err
	}
	scope, err := resolveScope(ctx, msg.Scope, c.defaultScope)
	if err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "command", "agreement_resend", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandAgreementResend,
		})
		return err
	}
	resendInput := msg.ResendInput()
	resendInput.IPAddress = resolveCommandRequestIP(ctx)
	result, err := c.agreements.Resend(ctx, scope, strings.TrimSpace(msg.AgreementID), resendInput)
	if err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "command", "agreement_resend", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandAgreementResend,
			"agreement_id": strings.TrimSpace(msg.AgreementID),
		})
		return err
	}
	if err := projectAgreementActivity(ctx, c.projector, scope, result.Agreement.ID); err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "command", "agreement_resend", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandAgreementResend,
			"agreement_id": strings.TrimSpace(result.Agreement.ID),
		})
		return err
	}
	effects := append([]services.AgreementNotificationEffectDetail{}, result.Effects...)
	if len(effects) == 0 {
		effects = agreementNotificationEffects(ctx, c.agreements, scope, result.Agreement.ID)
	}
	storeAgreementQueuedResponse(ctx, result.Agreement, correlationID, effects)
	observability.LogOperation(ctx, slog.LevelInfo, "command", "agreement_resend", "success", correlationID, time.Since(startedAt), nil, map[string]any{
		"command_name": CommandAgreementResend,
		"agreement_id": strings.TrimSpace(result.Agreement.ID),
	})
	return nil
}

func agreementNotificationEffects(
	ctx context.Context,
	service AgreementLifecycleService,
	scope stores.Scope,
	agreementID string,
) []services.AgreementNotificationEffectDetail {
	reader, ok := service.(AgreementNotificationEffectsReader)
	if !ok || reader == nil {
		return nil
	}
	effects, err := reader.ListAgreementNotificationEffects(ctx, scope, agreementID)
	if err != nil {
		return nil
	}
	return append([]services.AgreementNotificationEffectDetail{}, effects...)
}

func storeAgreementQueuedResponse(
	ctx context.Context,
	agreement stores.AgreementRecord,
	correlationID string,
	effects []services.AgreementNotificationEffectDetail,
) {
	collector := coreadmin.ActionResponseCollectorFromContext(ctx)
	if collector == nil {
		return
	}
	data := map[string]any{
		"accepted":       true,
		"mode":           "queued",
		"agreement_id":   strings.TrimSpace(agreement.ID),
		"status":         strings.TrimSpace(agreement.DeliveryStatus),
		"correlation_id": strings.TrimSpace(correlationID),
	}
	effectIDs := make([]string, 0, len(effects))
	statusURLs := make([]string, 0, len(effects))
	for _, effect := range effects {
		effectID := strings.TrimSpace(effect.EffectID)
		if effectID == "" {
			continue
		}
		effectIDs = append(effectIDs, effectID)
		statusURLs = append(statusURLs, "/admin/api/v1/esign/effects/"+effectID)
	}
	if len(effectIDs) > 0 {
		data["effect_ids"] = effectIDs
		data["status_urls"] = statusURLs
	}
	switch len(effectIDs) {
	case 1:
		data["effect_id"] = effectIDs[0]
		data["status_url"] = statusURLs[0]
	case 0:
		if effectID := strings.TrimSpace(agreement.DeliveryEffectID); effectID != "" {
			data["effect_id"] = effectID
			data["status_url"] = "/admin/api/v1/esign/effects/" + effectID
		}
	}
	collector.Store(coreadmin.ActionResponse{
		StatusCode: http.StatusAccepted,
		Data:       data,
	})
}

func storeAgreementRevisionResponse(
	ctx context.Context,
	agreement stores.AgreementRecord,
	sourceAgreementID string,
) {
	collector := coreadmin.ActionResponseCollectorFromContext(ctx)
	if collector == nil {
		return
	}
	collector.Store(coreadmin.ActionResponse{
		StatusCode: http.StatusCreated,
		Data: map[string]any{
			"accepted":             true,
			"mode":                 "redirect",
			"agreement_id":         strings.TrimSpace(agreement.ID),
			"source_agreement_id":  strings.TrimSpace(sourceAgreementID),
			"workflow_kind":        strings.TrimSpace(agreement.WorkflowKind),
			"redirect_to_edit":     true,
			"redirect_record_id":   strings.TrimSpace(agreement.ID),
			"redirect_record_type": "agreement",
		},
	})
}

type AgreementRequestCorrectionCommand struct {
	agreements   AgreementLifecycleService
	defaultScope stores.Scope
	projector    AgreementActivityProjector
}

var _ gocommand.Commander[AgreementRequestCorrectionInput] = (*AgreementRequestCorrectionCommand)(nil)

func (c *AgreementRequestCorrectionCommand) Execute(ctx context.Context, msg AgreementRequestCorrectionInput) error {
	return executeAgreementRevisionCommand(ctx, c.agreements, c.defaultScope, c.projector, msg.AgreementID, msg.ActorID, msg.IdempotencyKey, msg.CorrelationID, services.AgreementRevisionKindCorrection, CommandAgreementRequestCorrection)
}

type AgreementRequestAmendmentCommand struct {
	agreements   AgreementLifecycleService
	defaultScope stores.Scope
	projector    AgreementActivityProjector
}

var _ gocommand.Commander[AgreementRequestAmendmentInput] = (*AgreementRequestAmendmentCommand)(nil)

func (c *AgreementRequestAmendmentCommand) Execute(ctx context.Context, msg AgreementRequestAmendmentInput) error {
	return executeAgreementRevisionCommand(ctx, c.agreements, c.defaultScope, c.projector, msg.AgreementID, msg.ActorID, msg.IdempotencyKey, msg.CorrelationID, services.AgreementRevisionKindAmendment, CommandAgreementRequestAmendment)
}

func executeAgreementRevisionCommand(
	ctx context.Context,
	agreements AgreementLifecycleService,
	defaultScope stores.Scope,
	projector AgreementActivityProjector,
	agreementID,
	actorID,
	idempotencyKey,
	correlationID string,
	kind services.AgreementRevisionKind,
	commandName string,
) error {
	startedAt := time.Now()
	correlationID = observability.ResolveCorrelationID(correlationID, agreementID, commandName)
	if agreements == nil {
		err := fmt.Errorf("%s command not configured", commandName)
		observability.LogOperation(ctx, slog.LevelError, "command", "agreement_revision", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": commandName,
		})
		return err
	}
	scope, err := resolveScope(ctx, stores.Scope{}, defaultScope)
	if err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "command", "agreement_revision", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": commandName,
			"agreement_id": strings.TrimSpace(agreementID),
		})
		return err
	}
	created, err := agreements.CreateRevision(ctx, scope, services.CreateRevisionInput{
		SourceAgreementID: strings.TrimSpace(agreementID),
		Kind:              kind,
		CreatedByUserID:   strings.TrimSpace(firstNonEmptyString(actorID, resolveCommandActorID(ctx))),
		IdempotencyKey:    strings.TrimSpace(idempotencyKey),
		IPAddress:         resolveCommandRequestIP(ctx),
	})
	if err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "command", "agreement_revision", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": commandName,
			"agreement_id": strings.TrimSpace(agreementID),
			"kind":         string(kind),
		})
		return err
	}
	if err := projectAgreementActivity(ctx, projector, scope, created.ID); err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "command", "agreement_revision", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name":  commandName,
			"agreement_id":  strings.TrimSpace(created.ID),
			"source_id":     strings.TrimSpace(agreementID),
			"workflow_kind": strings.TrimSpace(created.WorkflowKind),
		})
		return err
	}
	storeAgreementRevisionResponse(ctx, created, agreementID)
	observability.LogOperation(ctx, slog.LevelInfo, "command", "agreement_revision", "success", correlationID, time.Since(startedAt), nil, map[string]any{
		"command_name":  commandName,
		"agreement_id":  strings.TrimSpace(created.ID),
		"source_id":     strings.TrimSpace(agreementID),
		"workflow_kind": strings.TrimSpace(created.WorkflowKind),
	})
	return nil
}

type AgreementRequestReviewCommand struct {
	agreements   AgreementLifecycleService
	defaultScope stores.Scope
	projector    AgreementActivityProjector
}

var _ gocommand.Commander[AgreementRequestReviewInput] = (*AgreementRequestReviewCommand)(nil)

func (c *AgreementRequestReviewCommand) Execute(ctx context.Context, msg AgreementRequestReviewInput) error {
	return executeAgreementReviewOpenCommand(ctx, c.agreements, c.defaultScope, c.projector, msg.AgreementID, msg.ActorID, msg.CorrelationID, msg.AgreementReviewInput, true)
}

type AgreementReopenReviewCommand struct {
	agreements   AgreementLifecycleService
	defaultScope stores.Scope
	projector    AgreementActivityProjector
}

var _ gocommand.Commander[AgreementReopenReviewInput] = (*AgreementReopenReviewCommand)(nil)

func (c *AgreementReopenReviewCommand) Execute(ctx context.Context, msg AgreementReopenReviewInput) error {
	return executeAgreementReviewOpenCommand(ctx, c.agreements, c.defaultScope, c.projector, msg.AgreementID, msg.ActorID, msg.CorrelationID, msg.AgreementReviewInput, false)
}

type AgreementCloseReviewCommand struct {
	agreements   AgreementLifecycleService
	defaultScope stores.Scope
	projector    AgreementActivityProjector
}

var _ gocommand.Commander[AgreementCloseReviewInput] = (*AgreementCloseReviewCommand)(nil)

func (c *AgreementCloseReviewCommand) Execute(ctx context.Context, msg AgreementCloseReviewInput) error {
	return executeAgreementCloseReviewCommand(ctx, c.agreements, c.defaultScope, c.projector, msg)
}

type AgreementNotifyReviewersCommand struct {
	agreements   AgreementLifecycleService
	defaultScope stores.Scope
	projector    AgreementActivityProjector
}

var _ gocommand.Commander[AgreementNotifyReviewersInput] = (*AgreementNotifyReviewersCommand)(nil)

func (c *AgreementNotifyReviewersCommand) Execute(ctx context.Context, msg AgreementNotifyReviewersInput) error {
	return executeAgreementNotifyReviewersCommand(ctx, c.agreements, c.defaultScope, c.projector, msg)
}

type AgreementReviewReminderPauseCommand struct {
	agreements   AgreementLifecycleService
	defaultScope stores.Scope
	projector    AgreementActivityProjector
}

var _ gocommand.Commander[AgreementReviewReminderPauseInput] = (*AgreementReviewReminderPauseCommand)(nil)

func (c *AgreementReviewReminderPauseCommand) Execute(ctx context.Context, msg AgreementReviewReminderPauseInput) error {
	return executeAgreementReviewReminderControlCommand(ctx, c.agreements, c.defaultScope, c.projector, msg.AgreementReviewReminderControlInput, CommandAgreementReviewReminderPause)
}

type AgreementReviewReminderResumeCommand struct {
	agreements   AgreementLifecycleService
	defaultScope stores.Scope
	projector    AgreementActivityProjector
}

var _ gocommand.Commander[AgreementReviewReminderResumeInput] = (*AgreementReviewReminderResumeCommand)(nil)

func (c *AgreementReviewReminderResumeCommand) Execute(ctx context.Context, msg AgreementReviewReminderResumeInput) error {
	return executeAgreementReviewReminderControlCommand(ctx, c.agreements, c.defaultScope, c.projector, msg.AgreementReviewReminderControlInput, CommandAgreementReviewReminderResume)
}

type AgreementReviewReminderSendNowCommand struct {
	agreements   AgreementLifecycleService
	defaultScope stores.Scope
	projector    AgreementActivityProjector
}

var _ gocommand.Commander[AgreementReviewReminderSendNowInput] = (*AgreementReviewReminderSendNowCommand)(nil)

func (c *AgreementReviewReminderSendNowCommand) Execute(ctx context.Context, msg AgreementReviewReminderSendNowInput) error {
	return executeAgreementReviewReminderControlCommand(ctx, c.agreements, c.defaultScope, c.projector, msg.AgreementReviewReminderControlInput, CommandAgreementReviewReminderSendNow)
}

type AgreementApproveReviewCommand struct {
	agreements   AgreementLifecycleService
	defaultScope stores.Scope
	projector    AgreementActivityProjector
}

var _ gocommand.Commander[AgreementApproveReviewInput] = (*AgreementApproveReviewCommand)(nil)

func (c *AgreementApproveReviewCommand) Execute(ctx context.Context, msg AgreementApproveReviewInput) error {
	return executeAgreementReviewDecisionCommand(ctx, c.agreements, c.defaultScope, c.projector, msg.AgreementID, msg.ParticipantID, msg.RecipientID, msg.Comment, msg.ActorID, msg.CorrelationID, true)
}

type AgreementRequestReviewChangesCommand struct {
	agreements   AgreementLifecycleService
	defaultScope stores.Scope
	projector    AgreementActivityProjector
}

var _ gocommand.Commander[AgreementRequestReviewChangesInput] = (*AgreementRequestReviewChangesCommand)(nil)

func (c *AgreementRequestReviewChangesCommand) Execute(ctx context.Context, msg AgreementRequestReviewChangesInput) error {
	return executeAgreementReviewDecisionCommand(ctx, c.agreements, c.defaultScope, c.projector, msg.AgreementID, msg.ParticipantID, msg.RecipientID, msg.Comment, msg.ActorID, msg.CorrelationID, false)
}

type AgreementCreateCommentThreadCommand struct {
	agreements   AgreementLifecycleService
	defaultScope stores.Scope
	projector    AgreementActivityProjector
}

var _ gocommand.Commander[AgreementCreateCommentThreadInput] = (*AgreementCreateCommentThreadCommand)(nil)

func (c *AgreementCreateCommentThreadCommand) Execute(ctx context.Context, msg AgreementCreateCommentThreadInput) error {
	return executeAgreementCommentThreadCommand(ctx, c.agreements, c.defaultScope, c.projector, msg)
}

type AgreementReplyCommentThreadCommand struct {
	agreements   AgreementLifecycleService
	defaultScope stores.Scope
	projector    AgreementActivityProjector
}

var _ gocommand.Commander[AgreementReplyCommentThreadInput] = (*AgreementReplyCommentThreadCommand)(nil)

func (c *AgreementReplyCommentThreadCommand) Execute(ctx context.Context, msg AgreementReplyCommentThreadInput) error {
	return executeAgreementCommentReplyCommand(ctx, c.agreements, c.defaultScope, c.projector, msg)
}

type AgreementResolveCommentThreadCommand struct {
	agreements   AgreementLifecycleService
	defaultScope stores.Scope
	projector    AgreementActivityProjector
}

var _ gocommand.Commander[AgreementResolveCommentThreadInput] = (*AgreementResolveCommentThreadCommand)(nil)

func (c *AgreementResolveCommentThreadCommand) Execute(ctx context.Context, msg AgreementResolveCommentThreadInput) error {
	return executeAgreementCommentStateCommand(ctx, c.agreements, c.defaultScope, c.projector, msg.AgreementID, msg.ThreadID, msg.ActorID, msg.CorrelationID, true)
}

type AgreementReopenCommentThreadCommand struct {
	agreements   AgreementLifecycleService
	defaultScope stores.Scope
	projector    AgreementActivityProjector
}

var _ gocommand.Commander[AgreementReopenCommentThreadInput] = (*AgreementReopenCommentThreadCommand)(nil)

func (c *AgreementReopenCommentThreadCommand) Execute(ctx context.Context, msg AgreementReopenCommentThreadInput) error {
	return executeAgreementCommentStateCommand(ctx, c.agreements, c.defaultScope, c.projector, msg.AgreementID, msg.ThreadID, msg.ActorID, msg.CorrelationID, false)
}

func executeAgreementReviewOpenCommand(
	ctx context.Context,
	agreements AgreementLifecycleService,
	defaultScope stores.Scope,
	projector AgreementActivityProjector,
	agreementID, actorID, correlationID string,
	input AgreementReviewInput,
	open bool,
) error {
	startedAt := time.Now()
	commandName := CommandAgreementRequestReview
	if !open {
		commandName = CommandAgreementReopenReview
	}
	correlationID = observability.ResolveCorrelationID(correlationID, agreementID, commandName)
	if agreements == nil {
		return fmt.Errorf("%s command not configured", commandName)
	}
	scope, err := resolveScope(ctx, input.Scope, defaultScope)
	if err != nil {
		return err
	}
	reviewInput := services.ReviewOpenInput{
		Gate:               strings.TrimSpace(input.Gate),
		CommentsEnabled:    input.CommentsEnabled,
		ReviewParticipants: append([]services.ReviewParticipantInput{}, input.ReviewParticipants...),
		ReviewerIDs:        append([]string{}, input.ReviewerIDs...),
		RequestedByUserID:  strings.TrimSpace(firstNonEmptyString(actorID, resolveCommandActorID(ctx))),
		ActorType:          "user",
		ActorID:            strings.TrimSpace(firstNonEmptyString(actorID, resolveCommandActorID(ctx))),
		IPAddress:          resolveCommandRequestIP(ctx),
		CorrelationID:      strings.TrimSpace(correlationID),
	}
	if open {
		_, err = agreements.OpenReview(ctx, scope, strings.TrimSpace(agreementID), reviewInput)
	} else {
		_, err = agreements.ReopenReview(ctx, scope, strings.TrimSpace(agreementID), reviewInput)
	}
	if err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "command", "agreement_review", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": commandName,
			"agreement_id": strings.TrimSpace(agreementID),
		})
		return err
	}
	if err := projectAgreementActivity(ctx, projector, scope, agreementID); err != nil {
		return err
	}
	return nil
}

func executeAgreementCloseReviewCommand(
	ctx context.Context,
	agreements AgreementLifecycleService,
	defaultScope stores.Scope,
	projector AgreementActivityProjector,
	msg AgreementCloseReviewInput,
) error {
	if agreements == nil {
		return fmt.Errorf("%s command not configured", CommandAgreementCloseReview)
	}
	scope, err := resolveScope(ctx, msg.Scope, defaultScope)
	if err != nil {
		return err
	}
	if _, err := agreements.CloseReview(ctx, scope, strings.TrimSpace(msg.AgreementID), "user", strings.TrimSpace(firstNonEmptyString(msg.ActorID, resolveCommandActorID(ctx))), resolveCommandRequestIP(ctx)); err != nil {
		return err
	}
	return projectAgreementActivity(ctx, projector, scope, msg.AgreementID)
}

func executeAgreementNotifyReviewersCommand(
	ctx context.Context,
	agreements AgreementLifecycleService,
	defaultScope stores.Scope,
	projector AgreementActivityProjector,
	msg AgreementNotifyReviewersInput,
) error {
	if agreements == nil {
		return fmt.Errorf("%s command not configured", CommandAgreementNotifyReviewers)
	}
	scope, err := resolveScope(ctx, msg.Scope, defaultScope)
	if err != nil {
		return err
	}
	notifyInput := services.ReviewNotifyInput{
		ParticipantID: strings.TrimSpace(msg.ParticipantID),
		RecipientID:   strings.TrimSpace(msg.RecipientID),
		RequestedByID: strings.TrimSpace(firstNonEmptyString(msg.ActorID, resolveCommandActorID(ctx))),
		ActorType:     "user",
		ActorID:       strings.TrimSpace(firstNonEmptyString(msg.ActorID, resolveCommandActorID(ctx))),
		IPAddress:     resolveCommandRequestIP(ctx),
		CorrelationID: strings.TrimSpace(msg.CorrelationID),
	}
	if _, err := agreements.NotifyReviewers(ctx, scope, strings.TrimSpace(msg.AgreementID), notifyInput); err != nil {
		return err
	}
	return projectAgreementActivity(ctx, projector, scope, msg.AgreementID)
}

func executeAgreementReviewReminderControlCommand(
	ctx context.Context,
	agreements AgreementLifecycleService,
	defaultScope stores.Scope,
	projector AgreementActivityProjector,
	msg AgreementReviewReminderControlInput,
	commandName string,
) error {
	if agreements == nil {
		return fmt.Errorf("%s command not configured", commandName)
	}
	if err := msg.validateRequired(); err != nil {
		return err
	}
	scope, err := resolveScope(ctx, msg.Scope, defaultScope)
	if err != nil {
		return err
	}
	input := services.ReviewReminderControlInput{
		ParticipantID: strings.TrimSpace(msg.ParticipantID),
		RecipientID:   strings.TrimSpace(msg.RecipientID),
		ActorType:     "user",
		ActorID:       strings.TrimSpace(firstNonEmptyString(msg.ActorID, resolveCommandActorID(ctx))),
		IPAddress:     resolveCommandRequestIP(ctx),
		CorrelationID: strings.TrimSpace(msg.CorrelationID),
	}
	switch commandName {
	case CommandAgreementReviewReminderPause:
		_, err = agreements.PauseReviewReminder(ctx, scope, strings.TrimSpace(msg.AgreementID), input)
	case CommandAgreementReviewReminderResume:
		_, err = agreements.ResumeReviewReminder(ctx, scope, strings.TrimSpace(msg.AgreementID), input)
	case CommandAgreementReviewReminderSendNow:
		_, err = agreements.SendReviewReminderNow(ctx, scope, strings.TrimSpace(msg.AgreementID), input)
	default:
		err = fmt.Errorf("%s command not configured", commandName)
	}
	if err != nil {
		return err
	}
	return projectAgreementActivity(ctx, projector, scope, msg.AgreementID)
}

func executeAgreementReviewDecisionCommand(
	ctx context.Context,
	agreements AgreementLifecycleService,
	defaultScope stores.Scope,
	projector AgreementActivityProjector,
	agreementID, participantID, recipientID, comment, actorID, correlationID string,
	approve bool,
) error {
	commandName := CommandAgreementApproveReview
	if !approve {
		commandName = CommandAgreementRequestReviewChanges
	}
	correlationID = observability.ResolveCorrelationID(correlationID, agreementID, firstNonEmptyString(participantID, recipientID), commandName)
	if agreements == nil {
		return fmt.Errorf("%s command not configured", commandName)
	}
	scope, err := resolveScope(ctx, stores.Scope{}, defaultScope)
	if err != nil {
		return err
	}
	input := services.ReviewDecisionInput{
		ParticipantID: strings.TrimSpace(participantID),
		RecipientID:   strings.TrimSpace(recipientID),
		Comment:       strings.TrimSpace(comment),
		ActorType:     "user",
		ActorID:       strings.TrimSpace(firstNonEmptyString(actorID, resolveCommandActorID(ctx))),
		IPAddress:     resolveCommandRequestIP(ctx),
	}
	if approve {
		_, err = agreements.ApproveReview(ctx, scope, strings.TrimSpace(agreementID), input)
	} else {
		_, err = agreements.RequestReviewChanges(ctx, scope, strings.TrimSpace(agreementID), input)
	}
	if err != nil {
		return err
	}
	return projectAgreementActivity(ctx, projector, scope, agreementID)
}

func executeAgreementCommentThreadCommand(
	ctx context.Context,
	agreements AgreementLifecycleService,
	defaultScope stores.Scope,
	projector AgreementActivityProjector,
	msg AgreementCreateCommentThreadInput,
) error {
	if agreements == nil {
		return fmt.Errorf("%s command not configured", CommandAgreementCreateCommentThread)
	}
	scope, err := resolveScope(ctx, msg.Scope, defaultScope)
	if err != nil {
		return err
	}
	_, err = agreements.CreateCommentThread(ctx, scope, strings.TrimSpace(msg.AgreementID), services.ReviewCommentThreadInput{
		ReviewID:   strings.TrimSpace(msg.ReviewID),
		Visibility: strings.TrimSpace(msg.Visibility),
		AnchorType: strings.TrimSpace(msg.AnchorType),
		PageNumber: msg.PageNumber,
		FieldID:    strings.TrimSpace(msg.FieldID),
		AnchorX:    msg.AnchorX,
		AnchorY:    msg.AnchorY,
		Body:       strings.TrimSpace(msg.Body),
		ActorType:  "user",
		ActorID:    strings.TrimSpace(firstNonEmptyString(msg.ActorID, resolveCommandActorID(ctx))),
	})
	if err != nil {
		return err
	}
	return projectAgreementActivity(ctx, projector, scope, msg.AgreementID)
}

func executeAgreementCommentReplyCommand(
	ctx context.Context,
	agreements AgreementLifecycleService,
	defaultScope stores.Scope,
	projector AgreementActivityProjector,
	msg AgreementReplyCommentThreadInput,
) error {
	if agreements == nil {
		return fmt.Errorf("%s command not configured", CommandAgreementReplyCommentThread)
	}
	scope, err := resolveScope(ctx, msg.Scope, defaultScope)
	if err != nil {
		return err
	}
	_, err = agreements.ReplyCommentThread(ctx, scope, strings.TrimSpace(msg.AgreementID), services.ReviewCommentReplyInput{
		ThreadID:  strings.TrimSpace(msg.ThreadID),
		Body:      strings.TrimSpace(msg.Body),
		ActorType: "user",
		ActorID:   strings.TrimSpace(firstNonEmptyString(msg.ActorID, resolveCommandActorID(ctx))),
	})
	if err != nil {
		return err
	}
	return projectAgreementActivity(ctx, projector, scope, msg.AgreementID)
}

func executeAgreementCommentStateCommand(
	ctx context.Context,
	agreements AgreementLifecycleService,
	defaultScope stores.Scope,
	projector AgreementActivityProjector,
	agreementID, threadID, actorID, correlationID string,
	resolve bool,
) error {
	commandName := CommandAgreementResolveCommentThread
	if !resolve {
		commandName = CommandAgreementReopenCommentThread
	}
	_ = observability.ResolveCorrelationID(correlationID, agreementID, threadID, commandName)
	if agreements == nil {
		return fmt.Errorf("%s command not configured", commandName)
	}
	scope, err := resolveScope(ctx, stores.Scope{}, defaultScope)
	if err != nil {
		return err
	}
	input := services.ReviewCommentStateInput{
		ThreadID:  strings.TrimSpace(threadID),
		ActorType: "user",
		ActorID:   strings.TrimSpace(firstNonEmptyString(actorID, resolveCommandActorID(ctx))),
	}
	if resolve {
		_, err = agreements.ResolveCommentThread(ctx, scope, strings.TrimSpace(agreementID), input)
	} else {
		_, err = agreements.ReopenCommentThread(ctx, scope, strings.TrimSpace(agreementID), input)
	}
	if err != nil {
		return err
	}
	return projectAgreementActivity(ctx, projector, scope, agreementID)
}

type AgreementDeliveryResumeCommand struct {
	recovery     GuardedEffectRecoveryService
	defaultScope stores.Scope
	projector    AgreementActivityProjector
}

var _ gocommand.Commander[AgreementDeliveryResumeInput] = (*AgreementDeliveryResumeCommand)(nil)

func (c *AgreementDeliveryResumeCommand) Execute(ctx context.Context, msg AgreementDeliveryResumeInput) error {
	startedAt := time.Now()
	correlationID := observability.ResolveCorrelationID(msg.CorrelationID, msg.AgreementID, CommandAgreementDeliveryResume)
	if c == nil || c.recovery == nil {
		return fmt.Errorf("agreement delivery resume command not configured")
	}
	if err := msg.Validate(); err != nil {
		return err
	}
	scope, err := resolveScope(ctx, msg.Scope, c.defaultScope)
	if err != nil {
		return err
	}
	result, err := c.recovery.ResumeAgreementDelivery(ctx, scope, strings.TrimSpace(msg.AgreementID), services.AgreementDeliveryResumeInput{
		ActorID:       strings.TrimSpace(firstNonEmptyString(msg.ActorID, resolveCommandActorID(ctx))),
		CorrelationID: strings.TrimSpace(correlationID),
	})
	if err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "command", "agreement_delivery_resume", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandAgreementDeliveryResume,
			"agreement_id": strings.TrimSpace(msg.AgreementID),
		})
		return err
	}
	if err := projectAgreementActivity(ctx, c.projector, scope, result.Agreement.ID); err != nil {
		return err
	}
	storeAgreementQueuedResponse(ctx, result.Agreement, correlationID, result.Effects)
	observability.LogOperation(ctx, slog.LevelInfo, "command", "agreement_delivery_resume", "success", correlationID, time.Since(startedAt), nil, map[string]any{
		"command_name": CommandAgreementDeliveryResume,
		"agreement_id": strings.TrimSpace(result.Agreement.ID),
	})
	return nil
}

type GuardedEffectResumeCommand struct {
	recovery     GuardedEffectRecoveryService
	defaultScope stores.Scope
}

var _ gocommand.Commander[GuardedEffectResumeInput] = (*GuardedEffectResumeCommand)(nil)

func (c *GuardedEffectResumeCommand) Execute(ctx context.Context, msg GuardedEffectResumeInput) error {
	startedAt := time.Now()
	correlationID := observability.ResolveCorrelationID(msg.CorrelationID, msg.EffectID, CommandGuardedEffectResume)
	if c == nil || c.recovery == nil {
		return fmt.Errorf("guarded effect resume command not configured")
	}
	if err := msg.Validate(); err != nil {
		return err
	}
	scope, err := resolveScope(ctx, msg.Scope, c.defaultScope)
	if err != nil {
		return err
	}
	_, err = c.recovery.ResumeEffect(ctx, scope, strings.TrimSpace(msg.EffectID), services.GuardedEffectResumeInput{
		ActorID:       strings.TrimSpace(firstNonEmptyString(msg.ActorID, resolveCommandActorID(ctx))),
		CorrelationID: strings.TrimSpace(correlationID),
	})
	if err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "command", "guarded_effect_resume", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandGuardedEffectResume,
			"effect_id":    strings.TrimSpace(msg.EffectID),
		})
		return err
	}
	observability.LogOperation(ctx, slog.LevelInfo, "command", "guarded_effect_resume", "success", correlationID, time.Since(startedAt), nil, map[string]any{
		"command_name": CommandGuardedEffectResume,
		"effect_id":    strings.TrimSpace(msg.EffectID),
	})
	return nil
}

// TokenRotateCommand dispatches explicit token rotation transitions.
type TokenRotateCommand struct {
	tokens       TokenRotator
	defaultScope stores.Scope
	projector    AgreementActivityProjector
}

var _ gocommand.Commander[TokenRotateInput] = (*TokenRotateCommand)(nil)

func (c *TokenRotateCommand) Execute(ctx context.Context, msg TokenRotateInput) error {
	startedAt := time.Now()
	correlationID := observability.ResolveCorrelationID(msg.CorrelationID, msg.AgreementID, msg.RecipientID, CommandTokenRotate)
	if c == nil || c.tokens == nil {
		err := fmt.Errorf("token rotate command not configured")
		observability.LogOperation(ctx, slog.LevelError, "command", "token_rotate", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandTokenRotate,
		})
		return err
	}
	if err := msg.Validate(); err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "command", "token_rotate", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandTokenRotate,
		})
		return err
	}
	scope, err := resolveScope(ctx, msg.Scope, c.defaultScope)
	if err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "command", "token_rotate", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandTokenRotate,
		})
		return err
	}
	if _, err := c.tokens.Rotate(ctx, scope, strings.TrimSpace(msg.AgreementID), strings.TrimSpace(msg.RecipientID)); err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "command", "token_rotate", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandTokenRotate,
			"agreement_id": strings.TrimSpace(msg.AgreementID),
			"recipient_id": strings.TrimSpace(msg.RecipientID),
		})
		return err
	}
	if err := projectAgreementActivity(ctx, c.projector, scope, msg.AgreementID); err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "command", "token_rotate", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandTokenRotate,
			"agreement_id": strings.TrimSpace(msg.AgreementID),
			"recipient_id": strings.TrimSpace(msg.RecipientID),
		})
		return err
	}
	observability.LogOperation(ctx, slog.LevelInfo, "command", "token_rotate", "success", correlationID, time.Since(startedAt), nil, map[string]any{
		"command_name": CommandTokenRotate,
		"agreement_id": strings.TrimSpace(msg.AgreementID),
		"recipient_id": strings.TrimSpace(msg.RecipientID),
	})
	return nil
}

// DraftCleanupCommand dispatches draft expiry cleanup and exposes a cron schedule.
type DraftCleanupCommand struct {
	drafts       DraftCleanupService
	defaultScope stores.Scope
}

var _ gocommand.Commander[DraftCleanupInput] = (*DraftCleanupCommand)(nil)

func (c *DraftCleanupCommand) Name() string {
	return CommandDraftCleanup
}

func (c *DraftCleanupCommand) Execute(ctx context.Context, msg DraftCleanupInput) error {
	startedAt := time.Now()
	correlationID := observability.ResolveCorrelationID(msg.CorrelationID, CommandDraftCleanup)
	if c == nil || c.drafts == nil {
		err := fmt.Errorf("draft cleanup command not configured")
		observability.LogOperation(ctx, slog.LevelError, "command", "draft_cleanup", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandDraftCleanup,
		})
		return err
	}
	if err := msg.Validate(); err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "command", "draft_cleanup", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandDraftCleanup,
		})
		return err
	}
	before := msg.BeforeTime(time.Now().UTC())
	deleted, err := c.drafts.CleanupExpiredDrafts(ctx, before)
	if err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "command", "draft_cleanup", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandDraftCleanup,
		})
		return err
	}
	observability.LogOperation(ctx, slog.LevelInfo, "command", "draft_cleanup", "success", correlationID, time.Since(startedAt), nil, map[string]any{
		"command_name": CommandDraftCleanup,
		"deleted":      deleted,
		"before":       before.Format(time.RFC3339Nano),
	})
	return nil
}

func (c *DraftCleanupCommand) CronHandler() func() error {
	return func() error {
		return dispatcher.Dispatch(context.Background(), DraftCleanupInput{
			Scope:  c.defaultScope,
			Before: time.Now().UTC().Format(time.RFC3339Nano),
		})
	}
}

func (c *DraftCleanupCommand) CronOptions() gocommand.HandlerConfig {
	return gocommand.HandlerConfig{Expression: "@daily"}
}

// AgreementReminderSweepCommand dispatches reminder sweep execution and exposes a cron schedule.
type AgreementReminderSweepCommand struct {
	reminders      AgreementReminderService
	defaultScope   stores.Scope
	cronExpression string
}

var _ gocommand.Commander[AgreementReminderSweepInput] = (*AgreementReminderSweepCommand)(nil)

func (c *AgreementReminderSweepCommand) Name() string {
	return CommandAgreementReminderSweep
}

func (c *AgreementReminderSweepCommand) Execute(ctx context.Context, msg AgreementReminderSweepInput) error {
	startedAt := time.Now()
	correlationID := observability.ResolveCorrelationID(msg.CorrelationID, CommandAgreementReminderSweep)
	if c == nil || c.reminders == nil {
		err := fmt.Errorf("agreement reminder sweep command not configured")
		observability.LogOperation(ctx, slog.LevelError, "command", "agreement_reminder_sweep", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandAgreementReminderSweep,
		})
		return err
	}
	if err := msg.Validate(); err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "command", "agreement_reminder_sweep", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandAgreementReminderSweep,
		})
		return err
	}
	scope, err := resolveScope(ctx, msg.Scope, c.defaultScope)
	if err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "command", "agreement_reminder_sweep", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandAgreementReminderSweep,
		})
		return err
	}
	result, err := c.reminders.Sweep(ctx, scope)
	if err != nil {
		observability.ObserveReminderSweep(
			ctx,
			time.Since(startedAt),
			result.Claimed,
			result.Sent,
			result.Skipped,
			result.Failed,
			result.SkipReasons,
			result.FailureReasons,
			result.ClaimToSendMS,
			result.DueToSendMS,
			result.DueBacklogAgeMS,
		)
		observability.LogOperation(ctx, slog.LevelWarn, "command", "agreement_reminder_sweep", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandAgreementReminderSweep,
			"tenant_id":    scope.TenantID,
			"org_id":       scope.OrgID,
			"claimed":      result.Claimed,
			"sent":         result.Sent,
			"skipped":      result.Skipped,
			"failed":       result.Failed,
		})
		return err
	}
	observability.ObserveReminderSweep(
		ctx,
		time.Since(startedAt),
		result.Claimed,
		result.Sent,
		result.Skipped,
		result.Failed,
		result.SkipReasons,
		result.FailureReasons,
		result.ClaimToSendMS,
		result.DueToSendMS,
		result.DueBacklogAgeMS,
	)
	observability.LogOperation(ctx, slog.LevelInfo, "command", "agreement_reminder_sweep", "success", correlationID, time.Since(startedAt), nil, map[string]any{
		"command_name": CommandAgreementReminderSweep,
		"tenant_id":    scope.TenantID,
		"org_id":       scope.OrgID,
		"claimed":      result.Claimed,
		"sent":         result.Sent,
		"skipped":      result.Skipped,
		"failed":       result.Failed,
		"skip_reasons": result.SkipReasons,
	})
	return nil
}

func (c *AgreementReminderSweepCommand) CronHandler() func() error {
	return func() error {
		return dispatcher.Dispatch(context.Background(), AgreementReminderSweepInput{
			Scope: c.defaultScope,
		})
	}
}

func (c *AgreementReminderSweepCommand) CronOptions() gocommand.HandlerConfig {
	expression := strings.TrimSpace(c.cronExpression)
	if expression == "" {
		expression = strings.TrimSpace(appcfg.Active().Reminders.SweepCron)
	}
	if expression == "" {
		expression = "*/15 * * * *"
	}
	return gocommand.HandlerConfig{Expression: expression}
}

// AgreementReminderCleanupCommand purges expired encrypted internal reminder error payloads.
type AgreementReminderCleanupCommand struct {
	reminders    AgreementReminderService
	defaultScope stores.Scope
}

var _ gocommand.Commander[AgreementReminderCleanupInput] = (*AgreementReminderCleanupCommand)(nil)

func (c *AgreementReminderCleanupCommand) Name() string {
	return CommandAgreementReminderCleanup
}

func (c *AgreementReminderCleanupCommand) Execute(ctx context.Context, msg AgreementReminderCleanupInput) error {
	startedAt := time.Now()
	correlationID := observability.ResolveCorrelationID(msg.CorrelationID, CommandAgreementReminderCleanup)
	if c == nil || c.reminders == nil {
		err := fmt.Errorf("agreement reminder cleanup command not configured")
		observability.LogOperation(ctx, slog.LevelError, "command", "agreement_reminder_cleanup", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandAgreementReminderCleanup,
		})
		return err
	}
	if err := msg.Validate(); err != nil {
		return err
	}
	scope, err := resolveScope(ctx, msg.Scope, c.defaultScope)
	if err != nil {
		return err
	}
	before := msg.BeforeTime(time.Now().UTC())
	limit := msg.Limit
	if limit <= 0 {
		limit = 1000
	}
	cleared, err := c.reminders.CleanupInternalErrors(ctx, scope, before, limit)
	if err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "command", "agreement_reminder_cleanup", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandAgreementReminderCleanup,
			"tenant_id":    scope.TenantID,
			"org_id":       scope.OrgID,
			"before":       before.Format(time.RFC3339Nano),
		})
		return err
	}
	observability.LogOperation(ctx, slog.LevelInfo, "command", "agreement_reminder_cleanup", "success", correlationID, time.Since(startedAt), nil, map[string]any{
		"command_name": CommandAgreementReminderCleanup,
		"tenant_id":    scope.TenantID,
		"org_id":       scope.OrgID,
		"before":       before.Format(time.RFC3339Nano),
		"cleared":      cleared,
	})
	return nil
}

func (c *AgreementReminderCleanupCommand) CronHandler() func() error {
	return func() error {
		return dispatcher.Dispatch(context.Background(), AgreementReminderCleanupInput{
			Scope:  c.defaultScope,
			Before: time.Now().UTC().Format(time.RFC3339Nano),
			Limit:  1000,
		})
	}
}

func (c *AgreementReminderCleanupCommand) CronOptions() gocommand.HandlerConfig {
	return gocommand.HandlerConfig{Expression: "@daily"}
}

// AgreementReminderPauseCommand pauses automatic reminders for one agreement recipient.
type AgreementReminderPauseCommand struct {
	reminders    AgreementReminderService
	defaultScope stores.Scope
}

var _ gocommand.Commander[AgreementReminderPauseInput] = (*AgreementReminderPauseCommand)(nil)

func (c *AgreementReminderPauseCommand) Execute(ctx context.Context, msg AgreementReminderPauseInput) error {
	startedAt := time.Now()
	correlationID := observability.ResolveCorrelationID(msg.CorrelationID, msg.AgreementID, msg.RecipientID, CommandAgreementReminderPause)
	if c == nil || c.reminders == nil {
		return fmt.Errorf("agreement reminder pause command not configured")
	}
	if err := msg.Validate(); err != nil {
		return err
	}
	scope, err := resolveScope(ctx, msg.Scope, c.defaultScope)
	if err != nil {
		return err
	}
	if _, err := c.reminders.Pause(ctx, scope, strings.TrimSpace(msg.AgreementID), strings.TrimSpace(msg.RecipientID)); err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "command", "agreement_reminder_pause", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandAgreementReminderPause,
		})
		return err
	}
	observability.LogOperation(ctx, slog.LevelInfo, "command", "agreement_reminder_pause", "success", correlationID, time.Since(startedAt), nil, map[string]any{
		"command_name": CommandAgreementReminderPause,
		"agreement_id": strings.TrimSpace(msg.AgreementID),
		"recipient_id": strings.TrimSpace(msg.RecipientID),
	})
	return nil
}

// AgreementReminderResumeCommand resumes automatic reminders for one agreement recipient.
type AgreementReminderResumeCommand struct {
	reminders    AgreementReminderService
	defaultScope stores.Scope
}

var _ gocommand.Commander[AgreementReminderResumeInput] = (*AgreementReminderResumeCommand)(nil)

func (c *AgreementReminderResumeCommand) Execute(ctx context.Context, msg AgreementReminderResumeInput) error {
	startedAt := time.Now()
	correlationID := observability.ResolveCorrelationID(msg.CorrelationID, msg.AgreementID, msg.RecipientID, CommandAgreementReminderResume)
	if c == nil || c.reminders == nil {
		return fmt.Errorf("agreement reminder resume command not configured")
	}
	if err := msg.Validate(); err != nil {
		return err
	}
	scope, err := resolveScope(ctx, msg.Scope, c.defaultScope)
	if err != nil {
		return err
	}
	if _, err := c.reminders.Resume(ctx, scope, strings.TrimSpace(msg.AgreementID), strings.TrimSpace(msg.RecipientID)); err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "command", "agreement_reminder_resume", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandAgreementReminderResume,
		})
		return err
	}
	observability.LogOperation(ctx, slog.LevelInfo, "command", "agreement_reminder_resume", "success", correlationID, time.Since(startedAt), nil, map[string]any{
		"command_name": CommandAgreementReminderResume,
		"agreement_id": strings.TrimSpace(msg.AgreementID),
		"recipient_id": strings.TrimSpace(msg.RecipientID),
	})
	return nil
}

// AgreementReminderSendNowCommand performs immediate policy-safe reminder resend.
type AgreementReminderSendNowCommand struct {
	reminders    AgreementReminderService
	defaultScope stores.Scope
	projector    AgreementActivityProjector
}

var _ gocommand.Commander[AgreementReminderSendNowInput] = (*AgreementReminderSendNowCommand)(nil)

func (c *AgreementReminderSendNowCommand) Execute(ctx context.Context, msg AgreementReminderSendNowInput) error {
	startedAt := time.Now()
	correlationID := observability.ResolveCorrelationID(msg.CorrelationID, msg.AgreementID, msg.RecipientID, CommandAgreementReminderSendNow)
	if c == nil || c.reminders == nil {
		return fmt.Errorf("agreement reminder send_now command not configured")
	}
	if err := msg.Validate(); err != nil {
		return err
	}
	scope, err := resolveScope(ctx, msg.Scope, c.defaultScope)
	if err != nil {
		return err
	}
	result, err := c.reminders.SendNow(ctx, scope, strings.TrimSpace(msg.AgreementID), strings.TrimSpace(msg.RecipientID))
	if err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "command", "agreement_reminder_send_now", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandAgreementReminderSendNow,
		})
		return err
	}
	if err := projectAgreementActivity(ctx, c.projector, scope, result.Agreement.ID); err != nil {
		return err
	}
	observability.LogOperation(ctx, slog.LevelInfo, "command", "agreement_reminder_send_now", "success", correlationID, time.Since(startedAt), nil, map[string]any{
		"command_name": CommandAgreementReminderSendNow,
		"agreement_id": strings.TrimSpace(result.Agreement.ID),
		"recipient_id": strings.TrimSpace(msg.RecipientID),
	})
	return nil
}

// PDFRemediationCommand dispatches bounded PDF remediation workflow execution.
type PDFRemediationCommand struct {
	remediation  PDFRemediationCommandService
	defaultScope stores.Scope
}

var _ gocommand.Commander[PDFRemediationInput] = (*PDFRemediationCommand)(nil)

func (c *PDFRemediationCommand) Execute(ctx context.Context, msg PDFRemediationInput) error {
	startedAt := time.Now()
	request := msg.Request(startedAt.UTC())
	correlationID := observability.ResolveCorrelationID(request.CorrelationID, request.DispatchID, request.DocumentID, CommandPDFRemediate)
	if c == nil || c.remediation == nil {
		err := fmt.Errorf("pdf remediation command not configured")
		observability.LogOperation(ctx, slog.LevelError, "command", "pdf_remediate", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandPDFRemediate,
			"command_id":   CommandPDFRemediate,
		})
		return err
	}
	if err := msg.Validate(); err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "command", "pdf_remediate", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandPDFRemediate,
			"command_id":   CommandPDFRemediate,
		})
		return err
	}
	scope, err := resolveScope(ctx, msg.Scope, c.defaultScope)
	if err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "command", "pdf_remediate", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandPDFRemediate,
			"command_id":   CommandPDFRemediate,
		})
		return err
	}
	result, err := c.remediation.Remediate(ctx, scope, request)
	if err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "command", "pdf_remediate", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name":   CommandPDFRemediate,
			"command_id":     CommandPDFRemediate,
			"document_id":    strings.TrimSpace(request.DocumentID),
			"dispatch_id":    strings.TrimSpace(request.DispatchID),
			"execution_mode": strings.TrimSpace(request.ExecutionMode),
		})
		return err
	}
	observability.LogOperation(ctx, slog.LevelInfo, "command", "pdf_remediate", "success", correlationID, time.Since(startedAt), nil, map[string]any{
		"command_name":       CommandPDFRemediate,
		"command_id":         CommandPDFRemediate,
		"document_id":        strings.TrimSpace(result.Document.ID),
		"pdf_compatibility":  strings.TrimSpace(result.Document.PDFCompatibilityTier),
		"pdf_reason":         strings.TrimSpace(result.Document.PDFCompatibilityReason),
		"dispatch_id":        strings.TrimSpace(request.DispatchID),
		"execution_mode":     strings.TrimSpace(request.ExecutionMode),
		"remediation_status": strings.TrimSpace(result.Document.RemediationStatus),
		"remediation_output": strings.TrimSpace(result.OutputObjectKey),
	})
	return nil
}

func projectAgreementActivity(ctx context.Context, projector AgreementActivityProjector, scope stores.Scope, agreementID string) error {
	if projector == nil {
		return nil
	}
	agreementID = strings.TrimSpace(agreementID)
	if agreementID == "" {
		return nil
	}
	return projector.ProjectAgreement(ctx, scope, agreementID)
}

func resolveCommandRequestIP(ctx context.Context) string {
	if resolved := services.ResolveAuditIPAddress(coreadmin.RequestIPFromContext(ctx)); resolved != "" {
		return resolved
	}
	if actor, ok := auth.ActorFromContext(ctx); ok && actor != nil {
		if resolved := services.ResolveAuditIPAddress(
			firstMetadataValue(actor.Metadata,
				"request_ip",
				"ip_address",
				"ip",
				"remote_ip",
				"client_ip",
				"x_forwarded_for",
				"x_real_ip",
			),
		); resolved != "" {
			return resolved
		}
	}
	return ""
}

func resolveCommandActorID(ctx context.Context) string {
	if actor, ok := auth.ActorFromContext(ctx); ok && actor != nil {
		if id := strings.TrimSpace(actor.ActorID); id != "" {
			return id
		}
		if id := strings.TrimSpace(fmt.Sprint(actor.Metadata["user_id"])); id != "" && id != "<nil>" {
			return id
		}
	}
	return ""
}

func firstNonEmptyString(values ...string) string {
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value != "" {
			return value
		}
	}
	return ""
}

func firstMetadataValue(metadata map[string]any, keys ...string) string {
	for _, key := range keys {
		key = strings.TrimSpace(key)
		if key == "" || metadata == nil {
			continue
		}
		raw, ok := metadata[key]
		if !ok || raw == nil {
			continue
		}
		value := strings.TrimSpace(fmt.Sprint(raw))
		if value == "" || strings.EqualFold(value, "<nil>") {
			continue
		}
		return value
	}
	return ""
}

func resolveScope(ctx context.Context, preferred stores.Scope, fallback stores.Scope) (stores.Scope, error) {
	scope := stores.Scope{
		TenantID: strings.TrimSpace(preferred.TenantID),
		OrgID:    strings.TrimSpace(preferred.OrgID),
	}
	if scope.TenantID == "" || scope.OrgID == "" {
		if actor, ok := auth.ActorFromContext(ctx); ok && actor != nil {
			if scope.TenantID == "" {
				scope.TenantID = strings.TrimSpace(actor.TenantID)
			}
			if scope.OrgID == "" {
				scope.OrgID = strings.TrimSpace(actor.OrganizationID)
			}
		}
	}
	if scope.TenantID == "" {
		scope.TenantID = strings.TrimSpace(fallback.TenantID)
	}
	if scope.OrgID == "" {
		scope.OrgID = strings.TrimSpace(fallback.OrgID)
	}
	if scope.TenantID == "" || scope.OrgID == "" {
		return stores.Scope{}, fmt.Errorf("tenant_id and org_id are required")
	}
	return scope, nil
}

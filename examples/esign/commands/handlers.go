package commands

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
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

type registerOptions struct {
	remediation PDFRemediationCommandService
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
	mode := "send"
	if err != nil && shouldFallbackToResend(err) {
		resendIP := resolveCommandRequestIP(ctx)
		resendResult, resendErr := c.agreements.Resend(ctx, scope, agreementID, services.ResendInput{
			InvalidateExisting: true,
			IdempotencyKey:     strings.TrimSpace(msg.IdempotencyKey),
			IPAddress:          resendIP,
			Source:             services.ResendSourceManual,
		})
		if resendErr == nil {
			agreement = resendResult.Agreement
			mode = "resend"
			err = nil
		} else {
			err = resendErr
		}
	}
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
	observability.ObserveSend(ctx, time.Since(startedAt), true)
	observability.LogOperation(ctx, slog.LevelInfo, "command", "agreement_send", "success", correlationID, time.Since(startedAt), nil, map[string]any{
		"command_name": CommandAgreementSend,
		"agreement_id": strings.TrimSpace(agreement.ID),
		"mode":         mode,
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
	observability.LogOperation(ctx, slog.LevelInfo, "command", "agreement_resend", "success", correlationID, time.Since(startedAt), nil, map[string]any{
		"command_name": CommandAgreementResend,
		"agreement_id": strings.TrimSpace(result.Agreement.ID),
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
		})
		return err
	}
	if err := msg.Validate(); err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "command", "pdf_remediate", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandPDFRemediate,
		})
		return err
	}
	scope, err := resolveScope(ctx, msg.Scope, c.defaultScope)
	if err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "command", "pdf_remediate", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandPDFRemediate,
		})
		return err
	}
	result, err := c.remediation.Remediate(ctx, scope, request)
	if err != nil {
		observability.LogOperation(ctx, slog.LevelWarn, "command", "pdf_remediate", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name":   CommandPDFRemediate,
			"document_id":    strings.TrimSpace(request.DocumentID),
			"dispatch_id":    strings.TrimSpace(request.DispatchID),
			"execution_mode": strings.TrimSpace(request.ExecutionMode),
		})
		return err
	}
	observability.LogOperation(ctx, slog.LevelInfo, "command", "pdf_remediate", "success", correlationID, time.Since(startedAt), nil, map[string]any{
		"command_name":       CommandPDFRemediate,
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

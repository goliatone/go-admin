package commands

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	auth "github.com/goliatone/go-auth"
	gocommand "github.com/goliatone/go-command"
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

// AgreementActivityProjector projects canonical audit events into the shared activity feed.
type AgreementActivityProjector interface {
	ProjectAgreement(ctx context.Context, scope stores.Scope, agreementID string) error
}

// Register wires typed command handlers and panel payload factories for e-sign actions.
func Register(
	bus *coreadmin.CommandBus,
	agreements AgreementLifecycleService,
	tokens TokenRotator,
	defaultScope stores.Scope,
	projector AgreementActivityProjector,
) error {
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
	agreement, err := c.agreements.Send(ctx, scope, strings.TrimSpace(msg.AgreementID), msg.SendInput())
	if err != nil {
		observability.ObserveSend(ctx, time.Since(startedAt), false)
		observability.LogOperation(ctx, slog.LevelWarn, "command", "agreement_send", "error", correlationID, time.Since(startedAt), err, map[string]any{
			"command_name": CommandAgreementSend,
			"agreement_id": strings.TrimSpace(msg.AgreementID),
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
	})
	return nil
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
	agreement, err := c.agreements.Void(ctx, scope, strings.TrimSpace(msg.AgreementID), msg.VoidInput())
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
	result, err := c.agreements.Resend(ctx, scope, strings.TrimSpace(msg.AgreementID), msg.ResendInput())
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

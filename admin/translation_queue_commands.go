package admin

import (
	"context"

	gocommand "github.com/goliatone/go-command"
)

// TranslationQueueClaimCommand dispatches claim lifecycle actions.
type TranslationQueueClaimCommand struct {
	Service TranslationQueueService
}

var _ gocommand.Commander[TranslationQueueClaimInput] = (*TranslationQueueClaimCommand)(nil)

func (c *TranslationQueueClaimCommand) Execute(ctx context.Context, msg TranslationQueueClaimInput) error {
	if c == nil || c.Service == nil {
		return serviceNotConfiguredDomainError("translation queue service", map[string]any{"command": translationQueueClaimCommandName})
	}
	if err := msg.Validate(); err != nil {
		return err
	}
	assignment, err := c.Service.Claim(ctx, msg)
	if err != nil {
		return err
	}
	if msg.Result != nil {
		*msg.Result = assignment
	}
	return nil
}

// TranslationQueueAssignCommand dispatches assign lifecycle actions.
type TranslationQueueAssignCommand struct {
	Service TranslationQueueService
}

var _ gocommand.Commander[TranslationQueueAssignInput] = (*TranslationQueueAssignCommand)(nil)

func (c *TranslationQueueAssignCommand) Execute(ctx context.Context, msg TranslationQueueAssignInput) error {
	if c == nil || c.Service == nil {
		return serviceNotConfiguredDomainError("translation queue service", map[string]any{"command": translationQueueAssignCommandName})
	}
	if err := msg.Validate(); err != nil {
		return err
	}
	assignment, err := c.Service.Assign(ctx, msg)
	if err != nil {
		return err
	}
	if msg.Result != nil {
		*msg.Result = assignment
	}
	return nil
}

// TranslationQueueReleaseCommand dispatches release lifecycle actions.
type TranslationQueueReleaseCommand struct {
	Service TranslationQueueService
}

var _ gocommand.Commander[TranslationQueueReleaseInput] = (*TranslationQueueReleaseCommand)(nil)

func (c *TranslationQueueReleaseCommand) Execute(ctx context.Context, msg TranslationQueueReleaseInput) error {
	if c == nil || c.Service == nil {
		return serviceNotConfiguredDomainError("translation queue service", map[string]any{"command": translationQueueReleaseCommandName})
	}
	if err := msg.Validate(); err != nil {
		return err
	}
	assignment, err := c.Service.Release(ctx, msg)
	if err != nil {
		return err
	}
	if msg.Result != nil {
		*msg.Result = assignment
	}
	return nil
}

// TranslationQueueSubmitCommand dispatches submit-review lifecycle actions.
type TranslationQueueSubmitCommand struct {
	Service TranslationQueueService
}

var _ gocommand.Commander[TranslationQueueSubmitInput] = (*TranslationQueueSubmitCommand)(nil)

func (c *TranslationQueueSubmitCommand) Execute(ctx context.Context, msg TranslationQueueSubmitInput) error {
	if c == nil || c.Service == nil {
		return serviceNotConfiguredDomainError("translation queue service", map[string]any{"command": translationQueueSubmitCommandName})
	}
	if err := msg.Validate(); err != nil {
		return err
	}
	assignment, err := c.Service.SubmitReview(ctx, msg)
	if err != nil {
		return err
	}
	if msg.Result != nil {
		*msg.Result = assignment
	}
	return nil
}

// TranslationQueueApproveCommand dispatches approve lifecycle actions.
type TranslationQueueApproveCommand struct {
	Service TranslationQueueService
}

var _ gocommand.Commander[TranslationQueueApproveInput] = (*TranslationQueueApproveCommand)(nil)

func (c *TranslationQueueApproveCommand) Execute(ctx context.Context, msg TranslationQueueApproveInput) error {
	if c == nil || c.Service == nil {
		return serviceNotConfiguredDomainError("translation queue service", map[string]any{"command": translationQueueApproveCommandName})
	}
	if err := msg.Validate(); err != nil {
		return err
	}
	assignment, err := c.Service.Approve(ctx, msg)
	if err != nil {
		return err
	}
	if msg.Result != nil {
		*msg.Result = assignment
	}
	return nil
}

// TranslationQueueRejectCommand dispatches reject lifecycle actions.
type TranslationQueueRejectCommand struct {
	Service TranslationQueueService
}

var _ gocommand.Commander[TranslationQueueRejectInput] = (*TranslationQueueRejectCommand)(nil)

func (c *TranslationQueueRejectCommand) Execute(ctx context.Context, msg TranslationQueueRejectInput) error {
	if c == nil || c.Service == nil {
		return serviceNotConfiguredDomainError("translation queue service", map[string]any{"command": translationQueueRejectCommandName})
	}
	if err := msg.Validate(); err != nil {
		return err
	}
	assignment, err := c.Service.Reject(ctx, msg)
	if err != nil {
		return err
	}
	if msg.Result != nil {
		*msg.Result = assignment
	}
	return nil
}

// TranslationQueueArchiveCommand dispatches archive lifecycle actions.
type TranslationQueueArchiveCommand struct {
	Service TranslationQueueService
}

var _ gocommand.Commander[TranslationQueueArchiveInput] = (*TranslationQueueArchiveCommand)(nil)

func (c *TranslationQueueArchiveCommand) Execute(ctx context.Context, msg TranslationQueueArchiveInput) error {
	if c == nil || c.Service == nil {
		return serviceNotConfiguredDomainError("translation queue service", map[string]any{"command": translationQueueArchiveCommandName})
	}
	if err := msg.Validate(); err != nil {
		return err
	}
	assignment, err := c.Service.Archive(ctx, msg)
	if err != nil {
		return err
	}
	if msg.Result != nil {
		*msg.Result = assignment
	}
	return nil
}

// TranslationQueueBulkAssignCommand dispatches bulk-assign lifecycle actions.
type TranslationQueueBulkAssignCommand struct {
	Service TranslationQueueService
}

var _ gocommand.Commander[TranslationQueueBulkAssignInput] = (*TranslationQueueBulkAssignCommand)(nil)

func (c *TranslationQueueBulkAssignCommand) Execute(ctx context.Context, msg TranslationQueueBulkAssignInput) error {
	if c == nil || c.Service == nil {
		return serviceNotConfiguredDomainError("translation queue service", map[string]any{"command": translationQueueBulkAssignCommandName})
	}
	if err := msg.Validate(); err != nil {
		return err
	}
	result, err := c.Service.BulkAssign(ctx, msg)
	if err != nil {
		return err
	}
	if msg.Result != nil {
		*msg.Result = result
	}
	return nil
}

// TranslationQueueBulkReleaseCommand dispatches bulk-release lifecycle actions.
type TranslationQueueBulkReleaseCommand struct {
	Service TranslationQueueService
}

var _ gocommand.Commander[TranslationQueueBulkReleaseInput] = (*TranslationQueueBulkReleaseCommand)(nil)

func (c *TranslationQueueBulkReleaseCommand) Execute(ctx context.Context, msg TranslationQueueBulkReleaseInput) error {
	if c == nil || c.Service == nil {
		return serviceNotConfiguredDomainError("translation queue service", map[string]any{"command": translationQueueBulkReleaseCommandName})
	}
	if err := msg.Validate(); err != nil {
		return err
	}
	result, err := c.Service.BulkRelease(ctx, msg)
	if err != nil {
		return err
	}
	if msg.Result != nil {
		*msg.Result = result
	}
	return nil
}

// TranslationQueueBulkPriorityCommand dispatches bulk-priority lifecycle actions.
type TranslationQueueBulkPriorityCommand struct {
	Service TranslationQueueService
}

var _ gocommand.Commander[TranslationQueueBulkPriorityInput] = (*TranslationQueueBulkPriorityCommand)(nil)

func (c *TranslationQueueBulkPriorityCommand) Execute(ctx context.Context, msg TranslationQueueBulkPriorityInput) error {
	if c == nil || c.Service == nil {
		return serviceNotConfiguredDomainError("translation queue service", map[string]any{"command": translationQueueBulkPriorityCommandName})
	}
	if err := msg.Validate(); err != nil {
		return err
	}
	result, err := c.Service.BulkPriority(ctx, msg)
	if err != nil {
		return err
	}
	if msg.Result != nil {
		*msg.Result = result
	}
	return nil
}

// TranslationQueueBulkArchiveCommand dispatches bulk-archive lifecycle actions.
type TranslationQueueBulkArchiveCommand struct {
	Service TranslationQueueService
}

var _ gocommand.Commander[TranslationQueueBulkArchiveInput] = (*TranslationQueueBulkArchiveCommand)(nil)

func (c *TranslationQueueBulkArchiveCommand) Execute(ctx context.Context, msg TranslationQueueBulkArchiveInput) error {
	if c == nil || c.Service == nil {
		return serviceNotConfiguredDomainError("translation queue service", map[string]any{"command": translationQueueBulkArchiveCommandName})
	}
	if err := msg.Validate(); err != nil {
		return err
	}
	result, err := c.Service.BulkArchive(ctx, msg)
	if err != nil {
		return err
	}
	if msg.Result != nil {
		*msg.Result = result
	}
	return nil
}

// RegisterTranslationQueueCommands registers typed queue handlers and name-based factories.
func RegisterTranslationQueueCommands(bus *CommandBus, service TranslationQueueService) error {
	if _, err := RegisterCommand(bus, &TranslationQueueClaimCommand{Service: service}); err != nil {
		return err
	}
	if _, err := RegisterCommand(bus, &TranslationQueueAssignCommand{Service: service}); err != nil {
		return err
	}
	if _, err := RegisterCommand(bus, &TranslationQueueReleaseCommand{Service: service}); err != nil {
		return err
	}
	if _, err := RegisterCommand(bus, &TranslationQueueSubmitCommand{Service: service}); err != nil {
		return err
	}
	if _, err := RegisterCommand(bus, &TranslationQueueApproveCommand{Service: service}); err != nil {
		return err
	}
	if _, err := RegisterCommand(bus, &TranslationQueueRejectCommand{Service: service}); err != nil {
		return err
	}
	if _, err := RegisterCommand(bus, &TranslationQueueArchiveCommand{Service: service}); err != nil {
		return err
	}
	if _, err := RegisterCommand(bus, &TranslationQueueBulkAssignCommand{Service: service}); err != nil {
		return err
	}
	if _, err := RegisterCommand(bus, &TranslationQueueBulkReleaseCommand{Service: service}); err != nil {
		return err
	}
	if _, err := RegisterCommand(bus, &TranslationQueueBulkPriorityCommand{Service: service}); err != nil {
		return err
	}
	if _, err := RegisterCommand(bus, &TranslationQueueBulkArchiveCommand{Service: service}); err != nil {
		return err
	}
	return RegisterTranslationQueueCommandFactories(bus)
}

package admin

import (
	"context"

	gocommand "github.com/goliatone/go-command"
)

// TranslationExchangeExporter defines export behavior for command handlers.
type TranslationExchangeExporter interface {
	Export(ctx context.Context, input TranslationExportInput) (TranslationExportResult, error)
}

// TranslationExchangeValidator defines import validate behavior for command handlers.
type TranslationExchangeValidator interface {
	ValidateImport(ctx context.Context, input TranslationImportValidateInput) (TranslationExchangeResult, error)
}

// TranslationExchangeApplier defines import apply behavior for command handlers.
type TranslationExchangeApplier interface {
	ApplyImport(ctx context.Context, input TranslationImportApplyInput) (TranslationExchangeResult, error)
}

type TranslationExportCommand struct {
	Service TranslationExchangeExporter
}

var _ gocommand.Commander[TranslationExportInput] = (*TranslationExportCommand)(nil)

func (c *TranslationExportCommand) Execute(ctx context.Context, msg TranslationExportInput) error {
	if c == nil || c.Service == nil {
		return serviceNotConfiguredDomainError("translation exchange export service", map[string]any{
			"component": "translation_exchange_commands",
		})
	}
	if err := msg.Validate(); err != nil {
		return err
	}
	result, err := c.Service.Export(ctx, msg)
	if err != nil {
		return err
	}
	if msg.Output != nil {
		*msg.Output = result
	}
	return nil
}

type TranslationImportValidateCommand struct {
	Service TranslationExchangeValidator
}

var _ gocommand.Commander[TranslationImportValidateInput] = (*TranslationImportValidateCommand)(nil)

func (c *TranslationImportValidateCommand) Execute(ctx context.Context, msg TranslationImportValidateInput) error {
	if c == nil || c.Service == nil {
		return serviceNotConfiguredDomainError("translation exchange validate service", map[string]any{
			"component": "translation_exchange_commands",
		})
	}
	if err := msg.Validate(); err != nil {
		return err
	}
	result, err := c.Service.ValidateImport(ctx, msg)
	if err != nil {
		return err
	}
	if msg.Result != nil {
		*msg.Result = result
	}
	return nil
}

type TranslationImportApplyCommand struct {
	Service TranslationExchangeApplier
}

var _ gocommand.Commander[TranslationImportApplyInput] = (*TranslationImportApplyCommand)(nil)

func (c *TranslationImportApplyCommand) Execute(ctx context.Context, msg TranslationImportApplyInput) error {
	if c == nil || c.Service == nil {
		return serviceNotConfiguredDomainError("translation exchange apply service", map[string]any{
			"component": "translation_exchange_commands",
		})
	}
	if err := msg.Validate(); err != nil {
		return err
	}
	result, err := c.Service.ApplyImport(ctx, msg)
	if err != nil {
		return err
	}
	if msg.Result != nil {
		*msg.Result = result
	}
	return nil
}

type TranslationImportRunCommand struct {
	Validator TranslationExchangeValidator
	Applier   TranslationExchangeApplier
}

var _ gocommand.Commander[TranslationImportRunInput] = (*TranslationImportRunCommand)(nil)

func (c *TranslationImportRunCommand) Execute(ctx context.Context, msg TranslationImportRunInput) error {
	if c == nil || c.Validator == nil || c.Applier == nil {
		return serviceNotConfiguredDomainError("translation exchange run service", map[string]any{
			"component": "translation_exchange_commands",
		})
	}
	if err := msg.Validate(); err != nil {
		return err
	}

	validateResult, err := c.Validator.ValidateImport(ctx, msg.ValidateInput)
	if err != nil {
		return err
	}
	applyResult, err := c.Applier.ApplyImport(ctx, msg.ApplyInput)
	if err != nil {
		return err
	}
	if msg.Result != nil {
		*msg.Result = TranslationImportRunResult{
			Validate: validateResult,
			Apply:    applyResult,
		}
	}
	return nil
}

package admin

import (
	"context"

	gocommand "github.com/goliatone/go-command"
)

// TranslationSuggestionGenerateCommand dispatches suggestion generation.
type TranslationSuggestionGenerateCommand struct {
	Service TranslationSuggestionService `json:"service"`
}

var _ gocommand.Commander[TranslationSuggestionInput] = (*TranslationSuggestionGenerateCommand)(nil)

func (c *TranslationSuggestionGenerateCommand) Execute(ctx context.Context, msg TranslationSuggestionInput) error {
	if c == nil || c.Service == nil {
		return serviceNotConfiguredDomainError("translation suggestion service", map[string]any{
			"command": TranslationSuggestionGenerateCommandName,
		})
	}
	if err := msg.Validate(); err != nil {
		return err
	}
	result, err := c.Service.SuggestTranslation(ctx, msg)
	if err != nil {
		if collector := gocommand.ResultFromContext[TranslationSuggestionResult](ctx); collector != nil {
			collector.StoreError(err)
		}
		return err
	}
	if msg.Result != nil {
		*msg.Result = result
	}
	if collector := gocommand.ResultFromContext[TranslationSuggestionResult](ctx); collector != nil {
		collector.Store(result)
	}
	return nil
}

// RegisterTranslationSuggestionCommands registers typed suggestion handlers and
// name-based factories.
func RegisterTranslationSuggestionCommands(bus *CommandBus, service TranslationSuggestionService) error {
	if _, err := RegisterCommand(bus, &TranslationSuggestionGenerateCommand{Service: service}); err != nil {
		return err
	}
	if bus != nil {
		bus.MarkCommandHandlerRegistered(TranslationSuggestionGenerateCommandName)
	}
	return RegisterTranslationSuggestionCommandFactories(bus)
}

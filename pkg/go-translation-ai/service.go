package translationai

import (
	"context"
	"strings"

	coreadmin "github.com/goliatone/go-admin/admin"
)

// Service implements admin.TranslationSuggestionService by composing core
// admin policy orchestration with this package's provider adapter.
type Service struct {
	core coreadmin.DefaultTranslationSuggestionService

	model        string
	promptConfig PromptConfig
	builder      PromptBuilder
}

var _ coreadmin.TranslationSuggestionService = (*Service)(nil)
var _ coreadmin.TranslationSuggestionActionEvaluator = (*Service)(nil)

// Option configures the optional translation AI service.
type Option func(*Service)

func NewService(opts ...Option) *Service {
	s := &Service{}
	for _, opt := range opts {
		if opt != nil {
			opt(s)
		}
	}
	return s
}

func WithRepository(repo coreadmin.TranslationAssignmentRepository) Option {
	return func(s *Service) {
		s.core.Repository = repo
	}
}

func WithContextLoader(loader coreadmin.TranslationSuggestionContextLoader) Option {
	return func(s *Service) {
		s.core.ContextLoader = loader
	}
}

func WithAuthorizer(authorizer coreadmin.Authorizer) Option {
	return func(s *Service) {
		s.core.Authorizer = authorizer
	}
}

func WithPermission(permission string) Option {
	return func(s *Service) {
		s.core.Permission = strings.TrimSpace(permission)
	}
}

func WithResource(resource string) Option {
	return func(s *Service) {
		s.core.Resource = strings.TrimSpace(resource)
	}
}

func WithEligibility(checker coreadmin.TranslationSuggestionEligibilityChecker) Option {
	return func(s *Service) {
		s.core.Eligibility = checker
	}
}

func WithAssistContext(extractor coreadmin.TranslationSuggestionAssistContextExtractor) Option {
	return func(s *Service) {
		s.core.AssistContext = extractor
	}
}

func WithDefaultModel(model string) Option {
	return func(s *Service) {
		s.model = strings.TrimSpace(model)
		s.rebuildPromptProvider()
	}
}

func WithServicePromptConfig(cfg PromptConfig) Option {
	return func(s *Service) {
		s.promptConfig = cfg
		s.rebuildPromptProvider()
	}
}

func WithServicePromptBuilder(builder PromptBuilder) Option {
	return func(s *Service) {
		if builder != nil {
			s.builder = builder
			s.rebuildPromptProvider()
		}
	}
}

// WithAdminProvider accepts a provider that already satisfies core admin's
// provider boundary.
func WithAdminProvider(provider coreadmin.TranslationSuggestionProvider) Option {
	return func(s *Service) {
		s.core.Provider = provider
	}
}

// WithProvider accepts this package's provider boundary and wraps it in the
// core admin provider interface.
func WithProvider(provider Provider) Option {
	return func(s *Service) {
		if provider == nil {
			s.core.Provider = nil
			return
		}
		s.core.Provider = NewPromptProvider(provider,
			WithProviderModel(s.model),
			WithPromptConfig(s.promptConfig),
			WithPromptBuilder(s.builder),
		)
	}
}

func (s *Service) SuggestTranslation(ctx context.Context, input coreadmin.TranslationSuggestionInput) (coreadmin.TranslationSuggestionResult, error) {
	if s == nil {
		return coreadmin.TranslationSuggestionResult{}, coreadmin.NewDomainError(coreadmin.TextCodeServiceUnavailable, "Translation suggestion service is not configured.", map[string]any{
			"component": "go_translation_ai",
		})
	}
	if !adminProviderReady(s.core.Provider) {
		return coreadmin.TranslationSuggestionResult{}, coreadmin.NewDomainError(coreadmin.TextCodeForbidden, "Translation suggestion provider is not configured.", map[string]any{
			"component":   "go_translation_ai",
			"reason_code": coreadmin.TranslationSuggestionReasonProviderUnavailable,
		})
	}
	return s.core.SuggestTranslation(ctx, input)
}

func (s *Service) EvaluateTranslationSuggestionAction(ctx context.Context, input coreadmin.TranslationSuggestionInput, loaded coreadmin.TranslationSuggestionAssignmentContext) (coreadmin.TranslationSuggestionDecision, error) {
	if s == nil {
		return coreadmin.TranslationSuggestionDecision{
			Allowed:    false,
			ReasonCode: coreadmin.TranslationSuggestionReasonServiceUnavailable,
			Reason:     "Translation suggestion service is not configured.",
		}, nil
	}
	if !adminProviderReady(s.core.Provider) {
		return coreadmin.TranslationSuggestionDecision{
			Allowed:    false,
			ReasonCode: coreadmin.TranslationSuggestionReasonProviderUnavailable,
			Reason:     "Translation suggestion provider is not configured.",
		}, nil
	}
	return s.core.EvaluateTranslationSuggestionAction(ctx, input, loaded)
}

func (s *Service) rebuildPromptProvider() {
	current, ok := s.core.Provider.(*PromptProvider)
	if !ok || current == nil || current.provider == nil {
		return
	}
	s.core.Provider = NewPromptProvider(current.provider,
		WithProviderModel(s.model),
		WithPromptConfig(s.promptConfig),
		WithPromptBuilder(s.builder),
	)
}

func adminProviderReady(provider coreadmin.TranslationSuggestionProvider) bool {
	if provider == nil {
		return false
	}
	if ready, ok := provider.(interface{ Ready() bool }); ok {
		return ready.Ready()
	}
	return true
}

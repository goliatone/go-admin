package goadmin

import (
	"context"
	"errors"
	"github.com/goliatone/go-admin/internal/primitives"
	"strings"

	coreadmin "github.com/goliatone/go-admin/admin"
	translationai "github.com/goliatone/go-admin/pkg/go-translation-ai"
)

// Service implements admin.TranslationSuggestionService by composing core
// admin policy orchestration with this package's provider adapter.
type Service struct {
	core coreadmin.DefaultTranslationSuggestionService

	model        string
	promptConfig translationai.PromptConfig
	builder      translationai.PromptBuilder
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

// WithAdminDependencies fills the default repository, context loader, and
// authorizer from an initialized admin instance. Provider eligibility remains
// explicit so hosts choose their external-AI policy.
func WithAdminDependencies(adm *coreadmin.Admin, repo coreadmin.TranslationAssignmentRepository) Option {
	return func(s *Service) {
		if s == nil {
			return
		}
		var authorizer coreadmin.Authorizer
		if adm != nil {
			authorizer = adm.Authorizer()
		}
		s.ConfigureTranslationSuggestionServiceDependencies(coreadmin.TranslationSuggestionServiceDependencies{
			Repository:    repo,
			ContextLoader: coreadmin.NewTranslationSuggestionContextLoader(adm),
			Authorizer:    authorizer,
		})
	}
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

func WithServicePromptConfig(cfg translationai.PromptConfig) Option {
	return func(s *Service) {
		s.promptConfig = cfg
		s.rebuildPromptProvider()
	}
}

func WithServicePromptBuilder(builder translationai.PromptBuilder) Option {
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
func WithProvider(provider translationai.Provider) Option {
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

func WithOpenAIProvider(cfg translationai.OpenAIConfig) Option {
	return WithProvider(translationai.NewOpenAIProvider(cfg))
}

func WithOpenAIClient(client translationai.OpenAIClient, cfg translationai.OpenAIConfig) Option {
	return WithProvider(translationai.NewOpenAIClientProvider(client, cfg))
}

func WithAnthropicProvider(cfg translationai.AnthropicConfig) Option {
	return WithProvider(translationai.NewAnthropicProvider(cfg))
}

func WithAnthropicClient(client translationai.AnthropicClient, cfg translationai.AnthropicConfig) Option {
	return WithProvider(translationai.NewAnthropicClientProvider(client, cfg))
}

func (s *Service) ConfigureTranslationSuggestionServiceDependencies(deps coreadmin.TranslationSuggestionServiceDependencies) {
	if s == nil {
		return
	}
	s.core.ConfigureTranslationSuggestionServiceDependencies(deps)
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

// PromptProvider adapts a root translation AI provider to go-admin's provider
// boundary.
type PromptProvider struct {
	provider translationai.Provider
	model    string
	builder  translationai.PromptBuilder
	config   translationai.PromptConfig
}

var _ coreadmin.TranslationSuggestionProvider = (*PromptProvider)(nil)

// ProviderOption configures a PromptProvider.
type ProviderOption func(*PromptProvider)

func NewPromptProvider(provider translationai.Provider, opts ...ProviderOption) *PromptProvider {
	p := &PromptProvider{
		provider: provider,
		builder:  translationai.DefaultPromptBuilder{},
	}
	for _, opt := range opts {
		if opt != nil {
			opt(p)
		}
	}
	return p
}

func WithProviderModel(model string) ProviderOption {
	return func(p *PromptProvider) {
		p.model = strings.TrimSpace(model)
	}
}

func WithPromptBuilder(builder translationai.PromptBuilder) ProviderOption {
	return func(p *PromptProvider) {
		if builder != nil {
			p.builder = builder
		}
	}
}

func WithPromptBuilderFunc(fn func(translationai.PromptInput, translationai.PromptConfig) (translationai.ProviderRequest, error)) ProviderOption {
	return WithPromptBuilder(translationai.PromptBuilderFunc(fn))
}

func WithPromptConfig(cfg translationai.PromptConfig) ProviderOption {
	return func(p *PromptProvider) {
		p.config = cfg
	}
}

func (p *PromptProvider) SuggestTranslation(ctx context.Context, input coreadmin.TranslationSuggestionProviderInput) (coreadmin.TranslationSuggestionProviderResult, error) {
	if p == nil || p.provider == nil {
		return coreadmin.TranslationSuggestionProviderResult{}, errors.New("translation AI provider is not configured")
	}
	builder := p.builder
	if builder == nil {
		builder = translationai.DefaultPromptBuilder{}
	}
	req, err := builder.BuildTranslationPrompt(toPromptInput(input), p.config)
	if err != nil {
		return coreadmin.TranslationSuggestionProviderResult{}, err
	}
	if strings.TrimSpace(req.Model) == "" {
		req.Model = strings.TrimSpace(p.model)
	}
	resp, err := p.provider.GenerateTranslation(ctx, req)
	if err != nil {
		return coreadmin.TranslationSuggestionProviderResult{}, err
	}
	return coreadmin.TranslationSuggestionProviderResult{
		Text:        strings.TrimSpace(resp.Text),
		Provider:    strings.TrimSpace(resp.Provider),
		Model:       primitives.FirstNonEmpty(resp.Model, req.Model),
		Diagnostics: sanitizeDiagnostics(resp.Diagnostics),
	}, nil
}

func (p *PromptProvider) Ready() bool {
	if p == nil || p.provider == nil {
		return false
	}
	if ready, ok := p.provider.(interface{ Ready() bool }); ok {
		return ready.Ready()
	}
	return true
}

func toPromptInput(input coreadmin.TranslationSuggestionProviderInput) translationai.PromptInput {
	return translationai.PromptInput{
		AssignmentID:   input.AssignmentID,
		FieldPath:      input.FieldPath,
		EntityType:     input.EntityType,
		SourceLocale:   input.SourceLocale,
		TargetLocale:   input.TargetLocale,
		SourceText:     input.SourceText,
		TargetText:     input.TargetText,
		CorrelationID:  input.CorrelationID,
		IdempotencyKey: input.IdempotencyKey,
		AssistContext:  input.AssistContext,
	}
}

func sanitizeDiagnostics(in map[string]any) map[string]any {
	if len(in) == 0 {
		return nil
	}
	out := make(map[string]any, len(in))
	for key, value := range in {
		normalized := strings.ToLower(strings.TrimSpace(key))
		if normalized == "" || diagnosticKeySensitive(normalized) {
			continue
		}
		out[strings.TrimSpace(key)] = value
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func diagnosticKeySensitive(key string) bool {
	sensitive := []string{"api_key", "apikey", "secret", "token", "password", "authorization", "prompt", "source_text", "raw_request", "raw_response"}
	for _, marker := range sensitive {
		if strings.Contains(key, marker) {
			return true
		}
	}
	return false
}

package admin

import (
	"context"
	"errors"
	"fmt"
	"strings"

	cmsinterfaces "github.com/goliatone/go-cms/pkg/interfaces"
	"github.com/google/uuid"
)

// TranslationPolicy validates workflow transitions against translation requirements.
type TranslationPolicy interface {
	Validate(ctx context.Context, input TranslationPolicyInput) error
}

// TranslationPolicyFunc adapts a function into a TranslationPolicy.
type TranslationPolicyFunc func(context.Context, TranslationPolicyInput) error

// Validate executes the policy function.
func (fn TranslationPolicyFunc) Validate(ctx context.Context, input TranslationPolicyInput) error {
	if fn == nil {
		return nil
	}
	return fn(ctx, input)
}

// TranslationPolicyInput captures workflow context needed for translation checks.
type TranslationPolicyInput struct {
	EntityType      string
	EntityID        string
	Transition      string
	Environment     string
	State           string
	PolicyEntity    string
	RequestedLocale string
}

func (input TranslationPolicyInput) effectiveEntity() string {
	if entity := strings.TrimSpace(input.PolicyEntity); entity != "" {
		return entity
	}
	return strings.TrimSpace(input.EntityType)
}

// TranslationRequirements captures required locales and optional field checks.
type TranslationRequirements struct {
	Locales                []string
	RequiredFields         map[string][]string
	RequiredFieldsStrategy RequiredFieldsValidationStrategy
}

// TranslationRequirementsResolver resolves translation requirements for a transition.
type TranslationRequirementsResolver interface {
	Requirements(ctx context.Context, input TranslationPolicyInput) (TranslationRequirements, bool, error)
}

// TranslationRequirementsResolverFunc adapts a function into a requirements resolver.
type TranslationRequirementsResolverFunc func(context.Context, TranslationPolicyInput) (TranslationRequirements, bool, error)

// Requirements executes the resolver function.
func (fn TranslationRequirementsResolverFunc) Requirements(ctx context.Context, input TranslationPolicyInput) (TranslationRequirements, bool, error) {
	if fn == nil {
		return TranslationRequirements{}, false, nil
	}
	return fn(ctx, input)
}

// RequiredFieldsValidationStrategy mirrors go-cms required field validation strategy.
type RequiredFieldsValidationStrategy = cmsinterfaces.RequiredFieldsValidationStrategy

const (
	RequiredFieldsValidationError  RequiredFieldsValidationStrategy = cmsinterfaces.RequiredFieldsValidationError
	RequiredFieldsValidationWarn   RequiredFieldsValidationStrategy = cmsinterfaces.RequiredFieldsValidationWarn
	RequiredFieldsValidationIgnore RequiredFieldsValidationStrategy = cmsinterfaces.RequiredFieldsValidationIgnore
)

// TranslationCheckOptions mirrors go-cms translation check options.
type TranslationCheckOptions = cmsinterfaces.TranslationCheckOptions

// GoCMSTranslationPolicy enforces translation requirements using go-cms checks.
type GoCMSTranslationPolicy struct {
	Pages    cmsinterfaces.PageService
	Content  cmsinterfaces.ContentService
	Resolver TranslationRequirementsResolver
}

// Validate enforces the translation requirements resolved for the transition.
func (p GoCMSTranslationPolicy) Validate(ctx context.Context, input TranslationPolicyInput) error {
	if p.Resolver == nil {
		return nil
	}
	req, ok, err := p.Resolver.Requirements(ctx, input)
	if err != nil || !ok {
		return err
	}
	required := normalizeLocaleList(req.Locales)
	if len(required) == 0 {
		return nil
	}
	entityID := uuidFromString(input.EntityID)
	if entityID == uuid.Nil {
		return fmt.Errorf("translation policy requires a valid entity id")
	}
	opts := cmsinterfaces.TranslationCheckOptions{
		State:                  strings.TrimSpace(input.State),
		Environment:            strings.TrimSpace(input.Environment),
		RequiredFields:         cloneRequiredFields(req.RequiredFields),
		RequiredFieldsStrategy: req.RequiredFieldsStrategy,
	}
	entity := strings.TrimSpace(input.effectiveEntity())
	var missing []string
	switch {
	case strings.EqualFold(entity, pageWorkflowEntityType):
		if p.Pages == nil {
			return fmt.Errorf("page translation checker unavailable")
		}
		missing, err = p.Pages.CheckTranslations(ctx, entityID, required, opts)
	default:
		if p.Content == nil {
			return fmt.Errorf("content translation checker unavailable")
		}
		missing, err = p.Content.CheckTranslations(ctx, entityID, required, opts)
	}
	if err != nil {
		return err
	}
	if len(missing) == 0 {
		return nil
	}
	return MissingTranslationsError{
		EntityType:      strings.TrimSpace(input.EntityType),
		PolicyEntity:    strings.TrimSpace(input.PolicyEntity),
		EntityID:        strings.TrimSpace(input.EntityID),
		Transition:      strings.TrimSpace(input.Transition),
		Environment:     strings.TrimSpace(input.Environment),
		RequestedLocale: strings.TrimSpace(input.RequestedLocale),
		MissingLocales:  normalizeLocaleList(missing),
	}
}

// ErrMissingTranslations marks translation policy failures due to missing locales.
var ErrMissingTranslations = errors.New("missing required translations")

// MissingTranslationsError reports which locales are required but absent.
type MissingTranslationsError struct {
	EntityType      string
	PolicyEntity    string
	EntityID        string
	Transition      string
	Environment     string
	RequestedLocale string
	MissingLocales  []string
}

func (e MissingTranslationsError) Error() string {
	missing := normalizeLocaleList(e.MissingLocales)
	if len(missing) == 0 {
		return ErrMissingTranslations.Error()
	}
	return fmt.Sprintf("missing required translations: %s", strings.Join(missing, ", "))
}

func (e MissingTranslationsError) Unwrap() error {
	return ErrMissingTranslations
}

func applyTranslationPolicy(ctx context.Context, policy TranslationPolicy, input TranslationPolicyInput) error {
	if policy == nil {
		return nil
	}
	if strings.TrimSpace(input.EntityID) == "" {
		return nil
	}
	return policy.Validate(ctx, input)
}

func buildTranslationPolicyInput(ctx context.Context, entityType, entityID, currentState, transition string, payload map[string]any) TranslationPolicyInput {
	return TranslationPolicyInput{
		EntityType:      strings.TrimSpace(entityType),
		EntityID:        strings.TrimSpace(entityID),
		Transition:      strings.TrimSpace(transition),
		State:           strings.TrimSpace(currentState),
		Environment:     resolvePolicyEnvironment(payload, environmentFromContext(ctx)),
		PolicyEntity:    resolvePolicyEntity(payload, entityType),
		RequestedLocale: requestedLocaleFromPayload(payload, localeFromContext(ctx)),
	}
}

func resolvePolicyEnvironment(payload map[string]any, fallback string) string {
	if payload != nil {
		if env := strings.TrimSpace(toString(payload["environment"])); env != "" {
			return env
		}
		if env := strings.TrimSpace(toString(payload["env"])); env != "" {
			return env
		}
		if env := strings.TrimSpace(toString(payload["environment_key"])); env != "" {
			return env
		}
		if env := strings.TrimSpace(toString(payload["environmentKey"])); env != "" {
			return env
		}
	}
	return strings.TrimSpace(fallback)
}

func resolvePolicyEntity(payload map[string]any, entityType string) string {
	if payload != nil {
		if val := strings.TrimSpace(toString(payload["policy_entity"])); val != "" {
			return val
		}
		if val := strings.TrimSpace(toString(payload["policyEntity"])); val != "" {
			return val
		}
	}
	entityType = strings.TrimSpace(entityType)
	if entityType == "" {
		return ""
	}
	if idx := strings.Index(entityType, "@"); idx > 0 {
		entityType = entityType[:idx]
	}
	return strings.TrimSpace(entityType)
}

func normalizeLocaleList(locales []string) []string {
	if len(locales) == 0 {
		return nil
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(locales))
	for _, locale := range locales {
		trimmed := strings.TrimSpace(locale)
		if trimmed == "" {
			continue
		}
		key := strings.ToLower(trimmed)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, trimmed)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func cloneRequiredFields(fields map[string][]string) map[string][]string {
	if len(fields) == 0 {
		return nil
	}
	out := make(map[string][]string, len(fields))
	for key, values := range fields {
		trimmedKey := strings.TrimSpace(key)
		if trimmedKey == "" {
			continue
		}
		copied := make([]string, len(values))
		copy(copied, values)
		out[trimmedKey] = copied
	}
	return out
}

package admin

import (
	"context"
	"errors"
	"fmt"
	"sort"
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
	if entity := normalizePolicyEntityKey(input.PolicyEntity); entity != "" {
		return entity
	}
	return normalizePolicyEntityKey(input.EntityType)
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

// Requirements resolves transition requirements when the policy exposes a resolver.
func (p GoCMSTranslationPolicy) Requirements(ctx context.Context, input TranslationPolicyInput) (TranslationRequirements, bool, error) {
	if p.Resolver == nil {
		return TranslationRequirements{}, false, nil
	}
	return p.Resolver.Requirements(ctx, input)
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
		return validationDomainError("translation policy requires a valid entity id", map[string]any{
			"field":     "entity_id",
			"component": "translation_policy",
		})
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
			return serviceNotConfiguredDomainError("page translation checker", map[string]any{
				"component": "translation_policy",
			})
		}
		missing, err = p.Pages.CheckTranslations(ctx, entityID, required, opts)
	default:
		if p.Content == nil {
			return serviceNotConfiguredDomainError("content translation checker", map[string]any{
				"component": "translation_policy",
			})
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
		EntityType:      normalizePolicyEntityKey(input.EntityType),
		PolicyEntity:    normalizePolicyEntityKey(input.PolicyEntity),
		EntityID:        strings.TrimSpace(input.EntityID),
		Transition:      strings.TrimSpace(input.Transition),
		Environment:     strings.TrimSpace(input.Environment),
		RequestedLocale: strings.TrimSpace(input.RequestedLocale),
		MissingLocales:  normalizeLocaleList(missing),
		MissingFieldsByLocale: buildMissingFieldsByLocale(
			req.RequiredFields,
			missing,
			requiredFieldsValidationEnabled(req.RequiredFields, req.RequiredFieldsStrategy),
		),
		RequiredFieldsEvaluated: requiredFieldsValidationEnabled(req.RequiredFields, req.RequiredFieldsStrategy),
	}
}

func normalizePolicyEntityKey(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	if idx := strings.Index(value, "@"); idx > 0 {
		value = value[:idx]
	}
	return strings.TrimSpace(value)
}

// ErrMissingTranslations marks translation policy failures due to missing locales.
var ErrMissingTranslations = errors.New("missing required translations")

// MissingTranslationsError reports which locales are required but absent.
type MissingTranslationsError struct {
	EntityType              string
	PolicyEntity            string
	EntityID                string
	Transition              string
	Environment             string
	RequestedLocale         string
	MissingLocales          []string
	MissingFieldsByLocale   map[string][]string
	RequiredFieldsEvaluated bool
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
	err := policy.Validate(ctx, input)
	if err == nil {
		return nil
	}
	var missing MissingTranslationsError
	if errors.As(err, &missing) {
		recordTranslationBlockedTransitionMetric(ctx, input, missing)
	}
	return err
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
		if val := normalizePolicyEntityKey(toString(payload["policy_entity"])); val != "" {
			return val
		}
		if val := normalizePolicyEntityKey(toString(payload["policyEntity"])); val != "" {
			return val
		}
	}
	return normalizePolicyEntityKey(entityType)
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

func requiredFieldsValidationEnabled(fields map[string][]string, strategy RequiredFieldsValidationStrategy) bool {
	if len(fields) == 0 {
		return false
	}
	return !strings.EqualFold(string(strategy), string(RequiredFieldsValidationIgnore))
}

func buildMissingFieldsByLocale(requiredFields map[string][]string, missingLocales []string, include bool) map[string][]string {
	if !include || len(requiredFields) == 0 || len(missingLocales) == 0 {
		return nil
	}
	out := map[string][]string{}
	for _, locale := range normalizeLocaleList(missingLocales) {
		fields := requiredFieldsForLocale(requiredFields, locale)
		if len(fields) == 0 {
			continue
		}
		out[locale] = fields
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func requiredFieldsForLocale(requiredFields map[string][]string, locale string) []string {
	locale = strings.TrimSpace(locale)
	if locale == "" || len(requiredFields) == 0 {
		return nil
	}
	if fields, ok := requiredFields[locale]; ok {
		return normalizeRequiredFieldNames(fields)
	}
	for key, fields := range requiredFields {
		if strings.EqualFold(strings.TrimSpace(key), locale) {
			return normalizeRequiredFieldNames(fields)
		}
	}
	return nil
}

func normalizeRequiredFieldNames(fields []string) []string {
	if len(fields) == 0 {
		return nil
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(fields))
	for _, field := range fields {
		trimmed := strings.TrimSpace(field)
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
	sort.Slice(out, func(i, j int) bool {
		return strings.ToLower(out[i]) < strings.ToLower(out[j])
	})
	return out
}

package admin

import (
	"errors"
	"net/http"
	"strings"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	goerrors "github.com/goliatone/go-errors"
	jsonschema "github.com/santhosh-tekuri/jsonschema/v5"
)

func mapToGoError(err error, mappers []goerrors.ErrorMapper) (*goerrors.Error, int) {
	status := http.StatusInternalServerError
	if err == nil {
		return goerrors.New("unknown error", goerrors.CategoryInternal).WithCode(status), status
	}

	var mapped *goerrors.Error
	var settingsValidation SettingsValidationErrors
	var ozzoErrors validation.Errors
	var schemaErr *jsonschema.ValidationError
	var invalid InvalidFeatureConfigError
	var permission PermissionDeniedError
	var missingTranslations MissingTranslationsError

	switch {
	case errors.Is(err, ErrWorkflowNotFound):
		mapped = NewDomainError(TextCodeWorkflowNotFound, err.Error(), nil)
		status = mapped.Code
	case errors.Is(err, ErrWorkflowInvalidTransition):
		mapped = NewDomainError(TextCodeWorkflowInvalidTransition, err.Error(), nil)
		status = mapped.Code
	case errors.As(err, &missingTranslations):
		meta := map[string]any{}
		if len(missingTranslations.MissingLocales) > 0 {
			meta["missing_locales"] = missingTranslations.MissingLocales
		}
		if missingTranslations.EntityType != "" {
			meta["entity_type"] = missingTranslations.EntityType
		}
		if missingTranslations.PolicyEntity != "" {
			meta["policy_entity"] = missingTranslations.PolicyEntity
		}
		if missingTranslations.EntityID != "" {
			meta["entity_id"] = missingTranslations.EntityID
		}
		if missingTranslations.Transition != "" {
			meta["transition"] = missingTranslations.Transition
		}
		if missingTranslations.Environment != "" {
			meta["environment"] = missingTranslations.Environment
		}
		if missingTranslations.RequestedLocale != "" {
			meta["requested_locale"] = missingTranslations.RequestedLocale
		}
		mapped = NewDomainError(TextCodeTranslationMissing, missingTranslations.Error(), meta)
		status = mapped.Code
	case errors.As(err, &settingsValidation):
		mapped = goerrors.New("validation failed", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode(TextCodeValidationError).
			WithMetadata(map[string]any{
				"fields": settingsValidation.Fields,
				"scope":  settingsValidation.Scope,
			})
		status = http.StatusBadRequest
	case errors.As(err, &ozzoErrors):
		mapped = goerrors.FromOzzoValidation(err, "validation failed").
			WithCode(http.StatusBadRequest).
			WithTextCode(TextCodeValidationError)
		if mapped != nil {
			if mapped.Metadata == nil {
				mapped.Metadata = map[string]any{}
			}
			if len(mapped.ValidationErrors) > 0 {
				mapped.Metadata["fields"] = mapped.ValidationMap()
			}
		}
		status = http.StatusBadRequest
	case errors.As(err, &schemaErr):
		fields := map[string]string{}
		collectJSONSchemaFields(schemaErr, fields)
		if len(fields) == 0 {
			fields["schema"] = strings.TrimSpace(schemaErr.Error())
		}
		mapped = goerrors.NewValidationFromMap("validation failed", fields).
			WithCode(http.StatusBadRequest).
			WithTextCode(TextCodeValidationError)
		if mapped != nil {
			mapped.Metadata = map[string]any{"fields": fields}
		}
		status = http.StatusBadRequest
	case isSchemaValidationMessage(err):
		fields := map[string]string{"schema": strings.TrimSpace(err.Error())}
		mapped = goerrors.NewValidationFromMap("validation failed", fields).
			WithCode(http.StatusBadRequest).
			WithTextCode(TextCodeValidationError)
		if mapped != nil {
			mapped.Metadata = map[string]any{"fields": fields}
		}
		status = http.StatusBadRequest
	case errors.As(err, &invalid):
		mapped = goerrors.Wrap(err, goerrors.CategoryValidation, err.Error()).
			WithCode(http.StatusBadRequest).
			WithTextCode(TextCodeInvalidFeatureConfig)
		issues := []map[string]any{}
		for _, issue := range invalid.Issues {
			issues = append(issues, map[string]any{
				"feature": issue.Feature,
				"missing": issue.Missing,
			})
		}
		mapped.Metadata = map[string]any{
			"issues": issues,
		}
		status = http.StatusBadRequest
	case errors.Is(err, ErrInvalidFeatureConfig):
		mapped = NewDomainError(TextCodeInvalidFeatureConfig, err.Error(), nil)
		status = mapped.Code
	case errors.As(err, &permission):
		mapped = goerrors.Wrap(err, goerrors.CategoryAuthz, err.Error()).
			WithCode(http.StatusForbidden).
			WithTextCode(TextCodeForbidden)
		meta := map[string]any{}
		if permission.Permission != "" {
			meta["permission"] = permission.Permission
		}
		if permission.Resource != "" {
			meta["resource"] = permission.Resource
		}
		if len(meta) > 0 {
			mapped.Metadata = meta
		}
		status = http.StatusForbidden
	case errors.Is(err, ErrForbidden):
		mapped = goerrors.Wrap(err, goerrors.CategoryAuthz, err.Error()).
			WithCode(http.StatusForbidden).
			WithTextCode(TextCodeForbidden)
		status = http.StatusForbidden
	case errors.Is(err, ErrREPLSessionLimit):
		mapped = goerrors.Wrap(err, goerrors.CategoryRateLimit, err.Error()).
			WithCode(http.StatusTooManyRequests).
			WithTextCode(TextCodeReplSessionLimit)
		status = http.StatusTooManyRequests
	case errors.Is(err, ErrFeatureDisabled):
		mapped = goerrors.Wrap(err, goerrors.CategoryNotFound, err.Error()).
			WithCode(http.StatusNotFound).
			WithTextCode(TextCodeFeatureDisabled)
		status = http.StatusNotFound
	case isContentTypeSchemaBreaking(err):
		meta := map[string]any{}
		if changes := parseContentTypeSchemaBreaking(err); len(changes) > 0 {
			meta["breaking_changes"] = changes
		}
		mapped = NewDomainError(TextCodeContentTypeSchemaBreaking, err.Error(), meta)
		status = mapped.Code
	case errors.Is(err, ErrNotFound):
		mapped = goerrors.Wrap(err, goerrors.CategoryNotFound, err.Error()).
			WithCode(http.StatusNotFound).
			WithTextCode(TextCodeNotFound)
		status = http.StatusNotFound
	}

	if mapped == nil {
		if errors.As(err, &mapped) && mapped != nil {
			if mapped.Code != 0 {
				status = mapped.Code
			}
		} else {
			if len(mappers) == 0 {
				mappers = goerrors.DefaultErrorMappers()
			}
			mapped = goerrors.MapToError(err, mappers)
			if mapped != nil && mapped.Code != 0 {
				status = mapped.Code
			}
		}
	}

	if mapped == nil {
		return goerrors.New(err.Error(), goerrors.CategoryInternal).WithCode(status), status
	}

	return mapped, status
}

func isContentTypeSchemaBreaking(err error) bool {
	return extractContentTypeSchemaBreaking(err) != ""
}

func extractContentTypeSchemaBreaking(err error) string {
	if err == nil {
		return ""
	}
	for current := err; current != nil; current = errors.Unwrap(current) {
		message := strings.TrimSpace(current.Error())
		lower := strings.ToLower(message)
		if strings.HasPrefix(lower, "content type: schema has breaking changes") {
			return message
		}
	}
	return ""
}

func parseContentTypeSchemaBreaking(err error) []map[string]string {
	message := extractContentTypeSchemaBreaking(err)
	if message == "" {
		return nil
	}
	lower := strings.ToLower(message)
	idx := strings.Index(lower, "breaking changes")
	if idx == -1 {
		return nil
	}
	after := strings.TrimSpace(message[idx+len("breaking changes"):])
	after = strings.TrimPrefix(after, ":")
	after = strings.TrimSpace(after)
	if after == "" {
		return nil
	}
	entries := strings.Split(after, ",")
	out := make([]map[string]string, 0, len(entries))
	for _, entry := range entries {
		entry = strings.TrimSpace(entry)
		if entry == "" {
			continue
		}
		parts := strings.SplitN(entry, ":", 2)
		kind := strings.TrimSpace(parts[0])
		path := ""
		if len(parts) > 1 {
			path = strings.TrimSpace(parts[1])
		}
		payload := map[string]string{}
		if kind != "" {
			payload["type"] = kind
		}
		if path != "" {
			payload["path"] = path
		}
		if len(payload) > 0 {
			out = append(out, payload)
		}
	}
	return out
}

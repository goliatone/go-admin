package admin

import (
	"errors"
	"net/http"
	"strings"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	cmscontent "github.com/goliatone/go-cms/content"
	cmspages "github.com/goliatone/go-cms/pages"
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
	var workflowValidation WorkflowValidationErrors
	var ozzoErrors validation.Errors
	var schemaErr *jsonschema.ValidationError
	var invalid InvalidFeatureConfigError
	var permission PermissionDeniedError
	var missingTranslations MissingTranslationsError
	var translationExists TranslationAlreadyExistsError
	var queueConflict TranslationAssignmentConflictError
	var queueVersionConflict TranslationAssignmentVersionConflictError
	var workflowVersionConflict WorkflowVersionConflictError
	var workflowBindingConflict WorkflowBindingConflictError
	var workflowBindingVersionConflict WorkflowBindingVersionConflictError
	var exchangeUnsupportedFormat TranslationExchangeUnsupportedFormatError
	var exchangeInvalidPayload TranslationExchangeInvalidPayloadError
	var exchangeConflict TranslationExchangeConflictError

	switch {
	case errors.Is(err, ErrWorkflowRollbackVersionNotFound):
		mapped = NewDomainError(TextCodeNotFound, err.Error(), map[string]any{
			"field": "rollback_to_version",
		})
		status = mapped.Code
	case errors.Is(err, ErrWorkflowNotFound):
		mapped = NewDomainError(TextCodeWorkflowNotFound, err.Error(), nil)
		status = mapped.Code
	case errors.Is(err, ErrWorkflowInvalidTransition):
		mapped = NewDomainError(TextCodeWorkflowInvalidTransition, err.Error(), nil)
		status = mapped.Code
	case errors.As(err, &missingTranslations):
		missingLocales := normalizeLocaleList(missingTranslations.MissingLocales)
		if missingLocales == nil {
			missingLocales = []string{}
		}
		missingFields := normalizeMissingFieldsByLocale(missingTranslations.MissingFieldsByLocale)
		meta := map[string]any{
			"missing_locales":  missingLocales,
			"transition":       strings.TrimSpace(missingTranslations.Transition),
			"entity_type":      normalizePolicyEntityKey(missingTranslations.EntityType),
			"policy_entity":    normalizePolicyEntityKey(missingTranslations.PolicyEntity),
			"entity_id":        strings.TrimSpace(missingTranslations.EntityID),
			"environment":      strings.TrimSpace(missingTranslations.Environment),
			"requested_locale": strings.TrimSpace(missingTranslations.RequestedLocale),
		}
		if missingTranslations.RequiredFieldsEvaluated || len(missingFields) > 0 {
			if missingFields == nil {
				missingFields = map[string][]string{}
			}
			meta["missing_fields_by_locale"] = missingFields
		}
		mapped = NewDomainError(TextCodeTranslationMissing, missingTranslations.Error(), meta)
		status = translationBlockerStatus(missingFields)
		mapped.WithCode(status)
	case errors.As(err, &translationExists):
		meta := map[string]any{
			"panel":                strings.TrimSpace(translationExists.Panel),
			"entity_id":            strings.TrimSpace(translationExists.EntityID),
			"locale":               strings.TrimSpace(translationExists.Locale),
			"source_locale":        strings.TrimSpace(translationExists.SourceLocale),
			"translation_group_id": strings.TrimSpace(translationExists.TranslationGroupID),
		}
		mapped = NewDomainError(TextCodeTranslationExists, translationExists.Error(), meta)
		status = mapped.Code
	case errors.Is(err, cmscontent.ErrTranslationAlreadyExists), errors.Is(err, cmspages.ErrTranslationAlreadyExists):
		meta := map[string]any{}
		var contentDup *cmscontent.TranslationAlreadyExistsError
		if errors.As(err, &contentDup) && contentDup != nil {
			meta["locale"] = strings.TrimSpace(strings.ToLower(contentDup.TargetLocale))
			meta["source_locale"] = strings.TrimSpace(strings.ToLower(contentDup.SourceLocale))
			meta["entity_id"] = strings.TrimSpace(contentDup.EntityID.String())
			if contentDup.TranslationGroupID != nil {
				meta["translation_group_id"] = strings.TrimSpace(contentDup.TranslationGroupID.String())
			}
		}
		var pageDup *cmspages.TranslationAlreadyExistsError
		if errors.As(err, &pageDup) && pageDup != nil {
			meta["locale"] = strings.TrimSpace(strings.ToLower(pageDup.TargetLocale))
			meta["source_locale"] = strings.TrimSpace(strings.ToLower(pageDup.SourceLocale))
			meta["entity_id"] = strings.TrimSpace(pageDup.EntityID.String())
			if pageDup.TranslationGroupID != nil {
				meta["translation_group_id"] = strings.TrimSpace(pageDup.TranslationGroupID.String())
			}
		}
		if len(meta) == 0 {
			meta = nil
		}
		mapped = NewDomainError(TextCodeTranslationExists, err.Error(), meta)
		status = mapped.Code
	case errors.Is(err, cmscontent.ErrInvalidLocale), errors.Is(err, cmspages.ErrInvalidLocale):
		mapped = NewDomainError(TextCodeValidationError, err.Error(), map[string]any{"field": "locale"})
		status = http.StatusBadRequest
		mapped.WithCode(status)
	case errors.Is(err, cmscontent.ErrSourceNotFound), errors.Is(err, cmspages.ErrSourceNotFound):
		mapped = NewDomainError(TextCodeNotFound, err.Error(), nil)
		status = mapped.Code
	case errors.Is(err, cmspages.ErrPathConflict):
		mapped = NewDomainError(TextCodePathConflict, err.Error(), nil)
		status = mapped.Code
	case errors.Is(err, cmscontent.ErrSlugConflict),
		errors.Is(err, cmscontent.ErrTranslationInvariantViolation),
		errors.Is(err, cmspages.ErrTranslationInvariantViolation):
		mapped = NewDomainError(TextCodeConflict, err.Error(), nil)
		status = mapped.Code
	case errors.As(err, &queueConflict):
		meta := map[string]any{
			"assignment_id":          strings.TrimSpace(queueConflict.AssignmentID),
			"existing_assignment_id": strings.TrimSpace(queueConflict.ExistingAssignmentID),
			"translation_group_id":   strings.TrimSpace(queueConflict.TranslationGroupID),
			"entity_type":            normalizePolicyEntityKey(queueConflict.EntityType),
			"source_locale":          strings.TrimSpace(strings.ToLower(queueConflict.SourceLocale)),
			"target_locale":          strings.TrimSpace(strings.ToLower(queueConflict.TargetLocale)),
		}
		mapped = NewDomainError(TextCodeTranslationQueueConflict, queueConflict.Error(), meta)
		status = mapped.Code
	case errors.As(err, &queueVersionConflict):
		meta := map[string]any{
			"assignment_id":    strings.TrimSpace(queueVersionConflict.AssignmentID),
			"expected_version": queueVersionConflict.ExpectedVersion,
			"actual_version":   queueVersionConflict.ActualVersion,
		}
		mapped = NewDomainError(TextCodeTranslationQueueVersionConflict, queueVersionConflict.Error(), meta)
		status = mapped.Code
	case errors.As(err, &workflowVersionConflict):
		meta := map[string]any{
			"workflow_id":      strings.TrimSpace(workflowVersionConflict.WorkflowID),
			"expected_version": workflowVersionConflict.ExpectedVersion,
			"actual_version":   workflowVersionConflict.ActualVersion,
		}
		mapped = NewDomainError(TextCodeConflict, workflowVersionConflict.Error(), meta)
		status = mapped.Code
	case errors.As(err, &workflowBindingConflict):
		meta := map[string]any{
			"binding_id":          strings.TrimSpace(workflowBindingConflict.BindingID),
			"existing_binding_id": strings.TrimSpace(workflowBindingConflict.ExistingBindingID),
			"scope_type":          strings.TrimSpace(string(workflowBindingConflict.ScopeType)),
			"scope_ref":           strings.TrimSpace(workflowBindingConflict.ScopeRef),
			"environment":         strings.TrimSpace(workflowBindingConflict.Environment),
			"priority":            workflowBindingConflict.Priority,
		}
		mapped = NewDomainError(TextCodeConflict, workflowBindingConflict.Error(), meta)
		status = mapped.Code
	case errors.As(err, &workflowBindingVersionConflict):
		meta := map[string]any{
			"binding_id":       strings.TrimSpace(workflowBindingVersionConflict.BindingID),
			"expected_version": workflowBindingVersionConflict.ExpectedVersion,
			"actual_version":   workflowBindingVersionConflict.ActualVersion,
		}
		mapped = NewDomainError(TextCodeConflict, workflowBindingVersionConflict.Error(), meta)
		status = mapped.Code
	case errors.As(err, &exchangeUnsupportedFormat):
		format := strings.TrimSpace(strings.ToLower(exchangeUnsupportedFormat.Format))
		if format == "" {
			format = "unknown"
		}
		supported := normalizeLocaleList(exchangeUnsupportedFormat.Supported)
		meta := map[string]any{
			"format": format,
		}
		if len(supported) > 0 {
			meta["supported_formats"] = supported
		}
		mapped = NewDomainError(TextCodeTranslationExchangeUnsupportedFormat, exchangeUnsupportedFormat.Error(), meta)
		status = mapped.Code
	case errors.As(err, &exchangeInvalidPayload):
		meta := map[string]any{}
		if field := strings.TrimSpace(exchangeInvalidPayload.Field); field != "" {
			meta["field"] = field
		}
		if format := strings.TrimSpace(strings.ToLower(exchangeInvalidPayload.Format)); format != "" {
			meta["format"] = format
		}
		for key, value := range exchangeInvalidPayload.Metadata {
			meta[key] = value
		}
		mapped = NewDomainError(TextCodeTranslationExchangeInvalidPayload, exchangeInvalidPayload.Error(), meta)
		status = mapped.Code
	case errors.As(err, &exchangeConflict):
		conflictType := strings.TrimSpace(exchangeConflict.Type)
		code := TextCodeTranslationExchangeMissingLinkage
		if conflictType == "stale_source_hash" {
			code = TextCodeTranslationExchangeStaleSourceHash
		}
		meta := map[string]any{
			"type":                 firstNonEmpty(conflictType, "missing_linkage"),
			"index":                exchangeConflict.Index,
			"resource":             strings.TrimSpace(exchangeConflict.Resource),
			"entity_id":            strings.TrimSpace(exchangeConflict.EntityID),
			"translation_group_id": strings.TrimSpace(exchangeConflict.TranslationGroupID),
			"target_locale":        strings.TrimSpace(exchangeConflict.TargetLocale),
			"field_path":           strings.TrimSpace(exchangeConflict.FieldPath),
		}
		if current := strings.TrimSpace(exchangeConflict.CurrentSourceHash); current != "" {
			meta["current_source_hash"] = current
		}
		if provided := strings.TrimSpace(exchangeConflict.ProvidedSourceHash); provided != "" {
			meta["provided_source_hash"] = provided
		}
		mapped = NewDomainError(code, exchangeConflict.Error(), meta)
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
	case errors.As(err, &workflowValidation):
		mapped = goerrors.New("validation failed", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode(TextCodeValidationError).
			WithMetadata(map[string]any{
				"fields": workflowValidation.Fields,
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
			meta["missing_permission"] = permission.Permission
		}
		if permission.Resource != "" {
			meta["resource"] = permission.Resource
		}
		if strings.TrimSpace(permission.Hint) != "" {
			meta["hint"] = strings.TrimSpace(permission.Hint)
		}
		if permission.ReauthRequired {
			meta["reauth_required"] = true
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
	case errors.Is(err, ErrPathConflict):
		mapped = NewDomainError(TextCodePathConflict, err.Error(), nil)
		status = mapped.Code
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

func normalizeMissingFieldsByLocale(fields map[string][]string) map[string][]string {
	if len(fields) == 0 {
		return nil
	}
	out := map[string][]string{}
	for locale, names := range fields {
		locale = strings.TrimSpace(locale)
		if locale == "" {
			continue
		}
		normalized := normalizeRequiredFieldNames(names)
		if len(normalized) == 0 {
			continue
		}
		out[locale] = normalized
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func translationBlockerStatus(missingFieldsByLocale map[string][]string) int {
	if hasMissingFieldFailures(missingFieldsByLocale) {
		return http.StatusUnprocessableEntity
	}
	return http.StatusConflict
}

func hasMissingFieldFailures(missingFieldsByLocale map[string][]string) bool {
	for _, names := range missingFieldsByLocale {
		if len(names) > 0 {
			return true
		}
	}
	return false
}

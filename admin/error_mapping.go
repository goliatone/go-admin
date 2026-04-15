package admin

import (
	"errors"
	"github.com/goliatone/go-admin/internal/primitives"
	"maps"
	"net/http"
	"strings"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	cmscontent "github.com/goliatone/go-cms/content"
	cmspages "github.com/goliatone/go-cms/pages"
	"github.com/goliatone/go-command/flow"
	goerrors "github.com/goliatone/go-errors"
	jsonschema "github.com/santhosh-tekuri/jsonschema/v5"
)

func mapToGoError(err error, mappers []goerrors.ErrorMapper) (*goerrors.Error, int) {
	if err == nil {
		return goerrors.New("unknown error", goerrors.CategoryInternal).WithCode(http.StatusInternalServerError), http.StatusInternalServerError
	}
	if mapped, status, ok := mapWorkflowErrors(err); ok {
		return mapped, status
	}
	if mapped, status, ok := mapTranslationAndExchangeErrors(err); ok {
		return mapped, status
	}
	if mapped, status, ok := mapValidationErrors(err); ok {
		return mapped, status
	}
	if mapped, status, ok := mapPermissionAndCommonErrors(err); ok {
		return mapped, status
	}
	return mapFallbackGoError(err, mappers, http.StatusInternalServerError)
}

func mapWorkflowErrors(err error) (*goerrors.Error, int, bool) {
	switch {
	case errors.Is(err, ErrWorkflowRollbackVersionNotFound):
		mapped := NewDomainError(TextCodeNotFound, err.Error(), map[string]any{"field": "rollback_to_version"})
		return mapped, mapped.Code, true
	case errors.Is(err, ErrWorkflowNotFound):
		mapped := NewDomainError(TextCodeWorkflowNotFound, err.Error(), nil)
		return mapped, mapped.Code, true
	case errors.Is(err, ErrWorkflowInvalidTransition):
		mapped := NewDomainError(TextCodeWorkflowInvalidTransition, err.Error(), nil)
		return mapped, mapped.Code, true
	case hasFlowTextCode(err, flow.ErrCodeStateNotFound):
		mapped := NewDomainError(TextCodeWorkflowNotFound, flowErrorMessage(err, flow.ErrCodeStateNotFound), flowErrorMetadataForTextCode(err, flow.ErrCodeStateNotFound))
		return mapped, mapped.Code, true
	case hasFlowTextCode(err, flow.ErrCodeInvalidTransition), hasFlowTextCode(err, flow.ErrCodeGuardRejected):
		mapped := NewDomainError(TextCodeWorkflowInvalidTransition, flowErrorMessage(err, flow.ErrCodeInvalidTransition, flow.ErrCodeGuardRejected), flowErrorMetadataForTextCode(err, flow.ErrCodeInvalidTransition, flow.ErrCodeGuardRejected))
		return mapped, mapped.Code, true
	case hasFlowTextCode(err, flow.ErrCodeAuthoringNotFound):
		mapped := NewDomainError(TextCodeWorkflowNotFound, flowErrorMessage(err, flow.ErrCodeAuthoringNotFound), flowErrorMetadataForTextCode(err, flow.ErrCodeAuthoringNotFound))
		return mapped, mapped.Code, true
	case hasFlowTextCode(err, flow.ErrCodeAuthoringValidationFailed):
		mapped := NewDomainError(TextCodeValidationError, flowErrorMessage(err, flow.ErrCodeAuthoringValidationFailed), flowErrorMetadataForTextCode(err, flow.ErrCodeAuthoringValidationFailed))
		return mapped, mapped.Code, true
	case hasFlowTextCode(err, flow.ErrCodeVersionConflict), hasFlowTextCode(err, flow.ErrCodeIdempotencyConflict):
		mapped := NewDomainError(TextCodeConflict, flowErrorMessage(err, flow.ErrCodeVersionConflict, flow.ErrCodeIdempotencyConflict), flowErrorMetadataForTextCode(err, flow.ErrCodeVersionConflict, flow.ErrCodeIdempotencyConflict))
		return mapped, mapped.Code, true
	case hasFlowTextCode(err, flow.ErrCodePreconditionFailed):
		mapped := NewDomainError(TextCodePreconditionFailed, flowErrorMessage(err, flow.ErrCodePreconditionFailed), flowErrorMetadataForTextCode(err, flow.ErrCodePreconditionFailed))
		return mapped, mapped.Code, true
	}

	var workflowVersionConflict WorkflowVersionConflictError
	if errors.As(err, &workflowVersionConflict) {
		meta := map[string]any{
			"workflow_id":      strings.TrimSpace(workflowVersionConflict.WorkflowID),
			"expected_version": workflowVersionConflict.ExpectedVersion,
			"actual_version":   workflowVersionConflict.ActualVersion,
		}
		mapped := NewDomainError(TextCodeConflict, workflowVersionConflict.Error(), meta)
		return mapped, mapped.Code, true
	}
	var workflowBindingConflict WorkflowBindingConflictError
	if errors.As(err, &workflowBindingConflict) {
		meta := map[string]any{
			"binding_id":          strings.TrimSpace(workflowBindingConflict.BindingID),
			"existing_binding_id": strings.TrimSpace(workflowBindingConflict.ExistingBindingID),
			"scope_type":          strings.TrimSpace(string(workflowBindingConflict.ScopeType)),
			"scope_ref":           strings.TrimSpace(workflowBindingConflict.ScopeRef),
			"environment":         strings.TrimSpace(workflowBindingConflict.Environment),
			"priority":            workflowBindingConflict.Priority,
		}
		mapped := NewDomainError(TextCodeConflict, workflowBindingConflict.Error(), meta)
		return mapped, mapped.Code, true
	}
	var workflowBindingVersionConflict WorkflowBindingVersionConflictError
	if errors.As(err, &workflowBindingVersionConflict) {
		meta := map[string]any{
			"binding_id":       strings.TrimSpace(workflowBindingVersionConflict.BindingID),
			"expected_version": workflowBindingVersionConflict.ExpectedVersion,
			"actual_version":   workflowBindingVersionConflict.ActualVersion,
		}
		mapped := NewDomainError(TextCodeConflict, workflowBindingVersionConflict.Error(), meta)
		return mapped, mapped.Code, true
	}
	return nil, 0, false
}

func mapTranslationAndExchangeErrors(err error) (*goerrors.Error, int, bool) {
	if mapped, status, ok := mapTranslationErrors(err); ok {
		return mapped, status, true
	}
	return mapExchangeErrors(err)
}

func mapTranslationErrors(err error) (*goerrors.Error, int, bool) {
	if mapped, status, ok := mapTranslationLifecycleErrors(err); ok {
		return mapped, status, true
	}
	return mapTranslationQueueErrors(err)
}

func mapTranslationLifecycleErrors(err error) (*goerrors.Error, int, bool) {
	if mapped, status, ok := mapLocalTranslationLifecycleErrors(err); ok {
		return mapped, status, true
	}
	return mapCMSTranslationLifecycleErrors(err)
}

func mapLocalTranslationLifecycleErrors(err error) (*goerrors.Error, int, bool) {
	var missingTranslations MissingTranslationsError
	var translationExists TranslationAlreadyExistsError
	var autosaveConflict AutosaveConflictError

	switch {
	case errors.As(err, &missingTranslations):
		missingLocales := normalizeLocaleList(missingTranslations.MissingLocales)
		if missingLocales == nil {
			missingLocales = []string{}
		}
		missingFields := normalizeMissingFieldsByLocale(missingTranslations.MissingFieldsByLocale)
		transition := strings.TrimSpace(missingTranslations.Transition)
		if transition == "" {
			transition = "unknown"
		}
		meta := map[string]any{
			"missing_locales":  missingLocales,
			"transition":       transition,
			"entity_type":      normalizePolicyEntityKey(missingTranslations.EntityType),
			"policy_entity":    normalizePolicyEntityKey(missingTranslations.PolicyEntity),
			"entity_id":        strings.TrimSpace(missingTranslations.EntityID),
			"channel":          strings.TrimSpace(missingTranslations.Environment),
			"requested_locale": strings.TrimSpace(missingTranslations.RequestedLocale),
		}
		if missingTranslations.RequiredFieldsEvaluated || len(missingFields) > 0 {
			if missingFields == nil {
				missingFields = map[string][]string{}
			}
			meta["missing_fields_by_locale"] = missingFields
		}
		status := translationBlockerStatus(missingFields)
		mapped := NewDomainError(TextCodeTranslationMissing, missingTranslations.Error(), meta).WithCode(status)
		return mapped, status, true
	case errors.As(err, &translationExists):
		meta := map[string]any{
			"panel":         strings.TrimSpace(translationExists.Panel),
			"entity_id":     strings.TrimSpace(translationExists.EntityID),
			"locale":        strings.TrimSpace(translationExists.Locale),
			"source_locale": strings.TrimSpace(translationExists.SourceLocale),
			"family_id":     strings.TrimSpace(translationExists.FamilyID),
		}
		mapped := NewDomainError(TextCodeTranslationExists, translationExists.Error(), meta)
		return mapped, mapped.Code, true
	case errors.As(err, &autosaveConflict):
		meta := map[string]any{
			"panel":     strings.TrimSpace(autosaveConflict.Panel),
			"entity_id": strings.TrimSpace(autosaveConflict.EntityID),
			"version":   strings.TrimSpace(autosaveConflict.Version),
		}
		if expected := strings.TrimSpace(autosaveConflict.ExpectedVersion); expected != "" {
			meta["expected_version"] = expected
		}
		if latestState := strings.TrimSpace(autosaveConflict.LatestStatePath); latestState != "" {
			meta["latest_server_state"] = latestState
		}
		if len(autosaveConflict.LatestServerState) > 0 {
			meta["latest_server_state_record"] = primitives.CloneAnyMap(autosaveConflict.LatestServerState)
		}
		mapped := NewDomainError(TextCodeAutosaveConflict, autosaveConflict.Error(), meta)
		return mapped, mapped.Code, true
	}
	return nil, 0, false
}

func mapCMSTranslationLifecycleErrors(err error) (*goerrors.Error, int, bool) {
	switch {
	case errors.Is(err, cmscontent.ErrTranslationAlreadyExists), errors.Is(err, cmspages.ErrTranslationAlreadyExists):
		meta := translationExistsMetadataForCMSError(err)
		mapped := NewDomainError(TextCodeTranslationExists, err.Error(), meta)
		return mapped, mapped.Code, true
	case errors.Is(err, cmscontent.ErrInvalidLocale), errors.Is(err, cmspages.ErrInvalidLocale):
		mapped := NewDomainError(TextCodeValidationError, err.Error(), map[string]any{"field": "locale"}).WithCode(http.StatusBadRequest)
		return mapped, http.StatusBadRequest, true
	case IsTranslationMissing(err):
		mapped := NewDomainError(TextCodeTranslationMissing, err.Error(), map[string]any{"translation_missing": true}).WithCode(http.StatusNotFound)
		return mapped, http.StatusNotFound, true
	case errors.Is(err, cmscontent.ErrSourceNotFound), errors.Is(err, cmspages.ErrSourceNotFound):
		mapped := NewDomainError(TextCodeNotFound, err.Error(), nil)
		return mapped, mapped.Code, true
	case errors.Is(err, cmspages.ErrPathConflict):
		mapped := NewDomainError(TextCodePathConflict, err.Error(), nil)
		return mapped, mapped.Code, true
	case errors.Is(err, cmscontent.ErrSlugConflict),
		errors.Is(err, cmscontent.ErrTranslationInvariantViolation),
		errors.Is(err, cmspages.ErrTranslationInvariantViolation):
		mapped := NewDomainError(TextCodeConflict, err.Error(), nil)
		return mapped, mapped.Code, true
	}
	return nil, 0, false
}

func mapTranslationQueueErrors(err error) (*goerrors.Error, int, bool) {
	var queueConflict TranslationAssignmentConflictError
	var queueVersionConflict TranslationAssignmentVersionConflictError

	switch {
	case errors.As(err, &queueConflict):
		meta := map[string]any{
			"assignment_id":          strings.TrimSpace(queueConflict.AssignmentID),
			"existing_assignment_id": strings.TrimSpace(queueConflict.ExistingAssignmentID),
			"family_id":              strings.TrimSpace(queueConflict.FamilyID),
			"entity_type":            normalizePolicyEntityKey(queueConflict.EntityType),
			"source_locale":          strings.TrimSpace(strings.ToLower(queueConflict.SourceLocale)),
			"target_locale":          strings.TrimSpace(strings.ToLower(queueConflict.TargetLocale)),
			"work_scope":             strings.TrimSpace(queueConflict.WorkScope),
		}
		mapped := NewDomainError(TextCodeTranslationQueueConflict, queueConflict.Error(), meta)
		return mapped, mapped.Code, true
	case errors.As(err, &queueVersionConflict):
		meta := map[string]any{
			"assignment_id":    strings.TrimSpace(queueVersionConflict.AssignmentID),
			"expected_version": queueVersionConflict.ExpectedVersion,
			"actual_version":   queueVersionConflict.ActualVersion,
		}
		mapped := NewDomainError(TextCodeTranslationQueueVersionConflict, queueVersionConflict.Error(), meta)
		return mapped, mapped.Code, true
	}
	return nil, 0, false
}

func mapValidationErrors(err error) (*goerrors.Error, int, bool) {
	if mapped, status, ok := mapStructuredValidationErrors(err); ok {
		return mapped, status, true
	}
	return mapFeatureConfigValidationErrors(err)
}

func mapExchangeErrors(err error) (*goerrors.Error, int, bool) {
	var exchangeUnsupportedFormat TranslationExchangeUnsupportedFormatError
	var exchangeInvalidPayload TranslationExchangeInvalidPayloadError
	var exchangeConflict TranslationExchangeConflictError

	switch {
	case errors.As(err, &exchangeUnsupportedFormat):
		format := strings.TrimSpace(strings.ToLower(exchangeUnsupportedFormat.Format))
		if format == "" {
			format = "unknown"
		}
		supported := normalizeLocaleList(exchangeUnsupportedFormat.Supported)
		meta := map[string]any{"format": format}
		if len(supported) > 0 {
			meta["supported_formats"] = supported
		}
		mapped := NewDomainError(TextCodeTranslationExchangeUnsupportedFormat, exchangeUnsupportedFormat.Error(), meta)
		return mapped, mapped.Code, true
	case errors.As(err, &exchangeInvalidPayload):
		meta := map[string]any{}
		if field := strings.TrimSpace(exchangeInvalidPayload.Field); field != "" {
			meta["field"] = field
		}
		if format := strings.TrimSpace(strings.ToLower(exchangeInvalidPayload.Format)); format != "" {
			meta["format"] = format
		}
		maps.Copy(meta, exchangeInvalidPayload.Metadata)
		mapped := NewDomainError(TextCodeTranslationExchangeInvalidPayload, exchangeInvalidPayload.Error(), meta)
		return mapped, mapped.Code, true
	case errors.As(err, &exchangeConflict):
		conflictType := strings.TrimSpace(exchangeConflict.Type)
		code := TextCodeTranslationExchangeMissingLinkage
		if conflictType == "stale_source_hash" {
			code = TextCodeTranslationExchangeStaleSourceHash
		}
		meta := map[string]any{
			"type":          primitives.FirstNonEmptyRaw(conflictType, "missing_linkage"),
			"index":         exchangeConflict.Index,
			"resource":      strings.TrimSpace(exchangeConflict.Resource),
			"entity_id":     strings.TrimSpace(exchangeConflict.EntityID),
			"family_id":     strings.TrimSpace(exchangeConflict.FamilyID),
			"target_locale": strings.TrimSpace(exchangeConflict.TargetLocale),
			"field_path":    strings.TrimSpace(exchangeConflict.FieldPath),
		}
		if current := strings.TrimSpace(exchangeConflict.CurrentSourceHash); current != "" {
			meta["current_source_hash"] = current
		}
		if provided := strings.TrimSpace(exchangeConflict.ProvidedSourceHash); provided != "" {
			meta["provided_source_hash"] = provided
		}
		mapped := NewDomainError(code, exchangeConflict.Error(), meta)
		return mapped, mapped.Code, true
	}
	return nil, 0, false
}

func mapStructuredValidationErrors(err error) (*goerrors.Error, int, bool) {
	var settingsValidation SettingsValidationErrors
	var workflowValidation WorkflowValidationErrors
	var ozzoErrors validation.Errors
	var schemaErr *jsonschema.ValidationError

	switch {
	case errors.As(err, &settingsValidation):
		mapped := goerrors.New("validation failed", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode(TextCodeValidationError).
			WithMetadata(map[string]any{
				"fields": settingsValidation.Fields,
				"scope":  settingsValidation.Scope,
			})
		return mapped, http.StatusBadRequest, true
	case errors.As(err, &workflowValidation):
		mapped := goerrors.New("validation failed", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode(TextCodeValidationError).
			WithMetadata(map[string]any{"fields": workflowValidation.Fields})
		return mapped, http.StatusBadRequest, true
	case errors.As(err, &ozzoErrors):
		mapped := goerrors.FromOzzoValidation(err, "validation failed").
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
		return mapped, http.StatusBadRequest, true
	case errors.As(err, &schemaErr):
		fields := map[string]string{}
		collectJSONSchemaFields(schemaErr, fields)
		if len(fields) == 0 {
			fields["schema"] = strings.TrimSpace(schemaErr.Error())
		}
		mapped := goerrors.NewValidationFromMap("validation failed", fields).
			WithCode(http.StatusBadRequest).
			WithTextCode(TextCodeValidationError)
		if mapped != nil {
			mapped.Metadata = map[string]any{"fields": fields}
		}
		return mapped, http.StatusBadRequest, true
	case isSchemaValidationMessage(err):
		fields := map[string]string{"schema": strings.TrimSpace(err.Error())}
		mapped := goerrors.NewValidationFromMap("validation failed", fields).
			WithCode(http.StatusBadRequest).
			WithTextCode(TextCodeValidationError)
		if mapped != nil {
			mapped.Metadata = map[string]any{"fields": fields}
		}
		return mapped, http.StatusBadRequest, true
	}
	return nil, 0, false
}

func mapFeatureConfigValidationErrors(err error) (*goerrors.Error, int, bool) {
	var invalid InvalidFeatureConfigError

	switch {
	case errors.As(err, &invalid):
		mapped := goerrors.Wrap(err, goerrors.CategoryValidation, err.Error()).
			WithCode(http.StatusBadRequest).
			WithTextCode(TextCodeInvalidFeatureConfig)
		issues := make([]map[string]any, 0, len(invalid.Issues))
		for _, issue := range invalid.Issues {
			issues = append(issues, map[string]any{
				"feature": issue.Feature,
				"missing": issue.Missing,
			})
		}
		mapped.Metadata = map[string]any{"issues": issues}
		return mapped, http.StatusBadRequest, true
	case errors.Is(err, ErrInvalidFeatureConfig):
		mapped := NewDomainError(TextCodeInvalidFeatureConfig, err.Error(), nil)
		return mapped, mapped.Code, true
	}
	return nil, 0, false
}

func mapPermissionAndCommonErrors(err error) (*goerrors.Error, int, bool) {
	var permission PermissionDeniedError

	switch {
	case errors.As(err, &permission):
		mapped := goerrors.Wrap(err, goerrors.CategoryAuthz, err.Error()).
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
		return mapped, http.StatusForbidden, true
	case errors.Is(err, ErrForbidden):
		mapped := goerrors.Wrap(err, goerrors.CategoryAuthz, err.Error()).
			WithCode(http.StatusForbidden).
			WithTextCode(TextCodeForbidden)
		return mapped, http.StatusForbidden, true
	case errors.Is(err, ErrREPLSessionLimit):
		mapped := goerrors.Wrap(err, goerrors.CategoryRateLimit, err.Error()).
			WithCode(http.StatusTooManyRequests).
			WithTextCode(TextCodeReplSessionLimit)
		return mapped, http.StatusTooManyRequests, true
	case errors.Is(err, ErrFeatureDisabled):
		mapped := goerrors.Wrap(err, goerrors.CategoryNotFound, err.Error()).
			WithCode(http.StatusNotFound).
			WithTextCode(TextCodeFeatureDisabled)
		return mapped, http.StatusNotFound, true
	case errors.Is(err, ErrPathConflict):
		mapped := NewDomainError(TextCodePathConflict, err.Error(), nil)
		return mapped, mapped.Code, true
	case isContentTypeSchemaBreaking(err):
		meta := map[string]any{}
		if changes := parseContentTypeSchemaBreaking(err); len(changes) > 0 {
			meta["breaking_changes"] = changes
		}
		mapped := NewDomainError(TextCodeContentTypeSchemaBreaking, err.Error(), meta)
		return mapped, mapped.Code, true
	case errors.Is(err, ErrNotFound):
		mapped := goerrors.Wrap(err, goerrors.CategoryNotFound, err.Error()).
			WithCode(http.StatusNotFound).
			WithTextCode(TextCodeNotFound)
		return mapped, http.StatusNotFound, true
	}
	return nil, 0, false
}

func mapFallbackGoError(err error, mappers []goerrors.ErrorMapper, status int) (*goerrors.Error, int) {
	if recovered := recoverDomainErrorFromGenericHandler(err); recovered != nil {
		if recovered.Code != 0 {
			status = recovered.Code
		}
		return recovered, status
	}
	if preferred := preferSpecificMappedError(err); preferred != nil {
		if preferred.Code != 0 {
			status = preferred.Code
		}
		return preferred, status
	}
	var mapped *goerrors.Error
	if errors.As(err, &mapped) && mapped != nil {
		if mapped.Code != 0 {
			status = mapped.Code
		}
		return mapped, status
	}
	if len(mappers) == 0 {
		mappers = goerrors.DefaultErrorMappers()
	}
	mapped = goerrors.MapToError(err, mappers)
	if mapped == nil {
		return goerrors.New(err.Error(), goerrors.CategoryInternal).WithCode(status), status
	}
	if mapped.Code != 0 {
		status = mapped.Code
	}
	return mapped, status
}

func translationExistsMetadataForCMSError(err error) map[string]any {
	meta := map[string]any{}
	var contentDup *cmscontent.TranslationAlreadyExistsError
	if errors.As(err, &contentDup) && contentDup != nil {
		meta["locale"] = strings.TrimSpace(strings.ToLower(contentDup.TargetLocale))
		meta["source_locale"] = strings.TrimSpace(strings.ToLower(contentDup.SourceLocale))
		meta["entity_id"] = strings.TrimSpace(contentDup.EntityID.String())
		if contentDup.FamilyID != nil {
			meta["family_id"] = strings.TrimSpace(contentDup.FamilyID.String())
		}
	}
	var pageDup *cmspages.TranslationAlreadyExistsError
	if errors.As(err, &pageDup) && pageDup != nil {
		meta["locale"] = strings.TrimSpace(strings.ToLower(pageDup.TargetLocale))
		meta["source_locale"] = strings.TrimSpace(strings.ToLower(pageDup.SourceLocale))
		meta["entity_id"] = strings.TrimSpace(pageDup.EntityID.String())
		if pageDup.FamilyID != nil {
			meta["family_id"] = strings.TrimSpace(pageDup.FamilyID.String())
		}
	}
	if len(meta) == 0 {
		return nil
	}
	return meta
}

func preferSpecificMappedError(err error) *goerrors.Error {
	var first *goerrors.Error
	for current := err; current != nil; current = errors.Unwrap(current) {
		typed, ok := current.(*goerrors.Error)
		if !ok || typed == nil {
			continue
		}
		if first == nil {
			first = typed
		}
		if !isGenericHandlerErrorTextCode(typed.TextCode) {
			return typed
		}
	}
	return first
}

func recoverDomainErrorFromGenericHandler(err error) *goerrors.Error {
	var typed *goerrors.Error
	if !errors.As(err, &typed) || typed == nil {
		return nil
	}
	if !isGenericHandlerErrorTextCode(typed.TextCode) {
		return nil
	}
	code := strings.TrimSpace(toString(typed.Metadata["error_code"]))
	if code == "" {
		return nil
	}
	if _, ok := DomainErrorCodeFor(code); !ok {
		return nil
	}
	return NewDomainError(code, unwrapGenericHandlerErrorMessage(typed.Message), primitives.CloneAnyMap(typed.Metadata))
}

func isGenericHandlerErrorTextCode(code string) bool {
	switch strings.ToUpper(strings.TrimSpace(code)) {
	case "HANDLER_EXECUTION_FAILED", "HANDLER_MAX_RETRIES_EXCEEDED", "HANDLER_RETRY_ATTEMPT":
		return true
	default:
		return false
	}
}

func unwrapGenericHandlerErrorMessage(message string) string {
	message = strings.TrimSpace(message)
	for {
		lower := strings.ToLower(message)
		switch {
		case strings.HasPrefix(lower, "handler failed for type "):
			idx := strings.Index(message, ":")
			if idx == -1 {
				return message
			}
			message = strings.TrimSpace(message[idx+1:])
		case strings.HasPrefix(lower, "handler failed after "):
			idx := strings.Index(message, ":")
			if idx == -1 {
				return message
			}
			message = strings.TrimSpace(message[idx+1:])
		default:
			return message
		}
	}
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

func hasFlowTextCode(err error, textCode string) bool {
	target := strings.TrimSpace(textCode)
	if target == "" {
		return false
	}
	for current := err; current != nil; current = errors.Unwrap(current) {
		var typed *goerrors.Error
		if !goerrors.As(current, &typed) || typed == nil {
			continue
		}
		if strings.EqualFold(strings.TrimSpace(typed.TextCode), target) {
			return true
		}
	}
	return false
}

func flowErrorMessage(err error, textCodes ...string) string {
	if typed := flowErrorByTextCode(err, textCodes...); typed != nil {
		if message := strings.TrimSpace(typed.Message); message != "" {
			return message
		}
	}
	if err == nil {
		return ""
	}
	return strings.TrimSpace(err.Error())
}

func flowErrorMetadataForTextCode(err error, textCodes ...string) map[string]any {
	if typed := flowErrorByTextCode(err, textCodes...); typed != nil && len(typed.Metadata) > 0 {
		return primitives.CloneAnyMap(typed.Metadata)
	}
	var metadata map[string]any
	for current := err; current != nil; current = errors.Unwrap(current) {
		var typed *goerrors.Error
		if !goerrors.As(current, &typed) || typed == nil || len(typed.Metadata) == 0 {
			continue
		}
		metadata = primitives.CloneAnyMap(typed.Metadata)
	}
	return metadata
}

func flowErrorByTextCode(err error, textCodes ...string) *goerrors.Error {
	if len(textCodes) == 0 {
		return nil
	}
	targets := make([]string, 0, len(textCodes))
	for _, textCode := range textCodes {
		if trimmed := strings.TrimSpace(textCode); trimmed != "" {
			targets = append(targets, trimmed)
		}
	}
	if len(targets) == 0 {
		return nil
	}
	for current := err; current != nil; current = errors.Unwrap(current) {
		var typed *goerrors.Error
		if !goerrors.As(current, &typed) || typed == nil {
			continue
		}
		for _, target := range targets {
			if strings.EqualFold(strings.TrimSpace(typed.TextCode), target) {
				return typed
			}
		}
	}
	return nil
}

package admin

import (
	"context"
	"errors"
	"sort"
	"strings"
	"time"

	translationcore "github.com/goliatone/go-admin/translations/core"
	translationservices "github.com/goliatone/go-admin/translations/services"
	router "github.com/goliatone/go-router"
)

type translationMatrixCreateMissingInput struct {
	Locales []string                            `json:"locales"`
	Plan    translationFamilyCreateVariantInput `json:"plan"`
}

type translationMatrixExportSelectedInput struct {
	Locales           []string `json:"locales"`
	Format            string   `json:"format"`
	IncludeSourceHash bool     `json:"include_source_hash"`
	Environment       string   `json:"environment"`
}

func (b *translationFamilyBinding) Matrix(c router.Context) (payload any, err error) {
	startedAt := time.Now()
	obsCtx := c.Context()
	defer func() {
		recordTranslationAPIOperation(obsCtx, translationAPIObservation{
			Operation: "translations.matrix.query",
			Kind:      "read",
			RequestID: requestIDFromContext(obsCtx),
			TraceID:   traceIDFromContext(obsCtx),
			TenantID:  tenantIDFromContext(obsCtx),
			OrgID:     orgIDFromContext(obsCtx),
			Duration:  time.Since(startedAt),
			Err:       err,
		})
	}()
	if b == nil || b.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation matrix binding", map[string]any{"component": "translation_matrix_binding"})
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	obsCtx = adminCtx.Context
	setTranslationTraceHeaders(c, obsCtx)
	if permissionErr := b.admin.requirePermission(adminCtx, PermAdminTranslationsView, "translations"); permissionErr != nil {
		return nil, permissionErr
	}

	channel := translationChannelFromRequest(c, adminCtx, nil)
	runtime, err := b.runtime(adminCtx.Context, channel)
	if err != nil {
		return nil, err
	}
	scope := translationservices.Scope{
		TenantID: translationIdentityFromAdminContext(adminCtx).TenantID,
		OrgID:    translationIdentityFromAdminContext(adminCtx).OrgID,
	}
	page := clampInt(atoiDefault(c.Query("page"), 1), 1, 10_000)
	perPage := clampInt(atoiDefault(c.Query("per_page"), translationMatrixDefaultPageSize), 1, translationMatrixMaxPageSize)
	localeOffset := clampInt(atoiDefault(c.Query("locale_offset"), 0), 0, 10_000)
	localeLimit := clampInt(atoiDefault(c.Query("locale_limit"), translationMatrixDefaultLocaleLimit), 1, translationMatrixMaxLocaleLimit)
	requestedLocales := translationMatrixLocalesFromValues(c.Query("locale"), c.Query("locales"))

	result, err := runtime.service.List(adminCtx.Context, translationservices.ListFamiliesInput{
		Scope:          scope,
		Environment:    channel,
		FamilyID:       strings.TrimSpace(c.Query("family_id")),
		ContentType:    strings.TrimSpace(strings.ToLower(c.Query("content_type"))),
		ReadinessState: strings.TrimSpace(strings.ToLower(c.Query("readiness_state"))),
		BlockerCode:    strings.TrimSpace(strings.ToLower(c.Query("blocker_code"))),
		Page:           page,
		PerPage:        perPage,
	})
	if err != nil {
		return nil, err
	}

	allLocales := translationMatrixLocalesForFamilies(result.Items, requestedLocales)
	visibleLocales, hasMoreLocales := translationMatrixVisibleLocales(allLocales, localeOffset, localeLimit)
	columns := translationMatrixColumnPayloads(result.Items, visibleLocales, localeOffset)
	localePolicy := translationMatrixLocalePolicyPayloads(result.Items, visibleLocales, localeOffset)
	quickActionTargets := translationMatrixQuickActionTargets(b.admin)
	createActionState := translationMatrixActionState(b.admin, adminCtx.Context, PermAdminTranslationsEdit)
	rows := make([]map[string]any, 0, len(result.Items))
	for _, family := range result.Items {
		rows = append(rows, translationMatrixRowPayload(family, visibleLocales, b.admin, channel, createActionState))
	}

	return map[string]any{
		"data": map[string]any{
			"columns": columns,
			"rows":    rows,
			"selection": map[string]any{
				"bulk_actions": map[string]any{
					translationMatrixBulkActionCreateMissing:  translationMatrixActionState(b.admin, adminCtx.Context, PermAdminTranslationsEdit),
					translationMatrixBulkActionExportSelected: translationMatrixActionState(b.admin, adminCtx.Context, translationExchangePermissionExport),
				},
			},
		},
		"meta": mergeTranslationChannelContract(map[string]any{
			"page":              result.Page,
			"per_page":          result.PerPage,
			"total":             result.Total,
			"total_locales":     len(allLocales),
			"locale_offset":     localeOffset,
			"locale_limit":      localeLimit,
			"has_more_locales":  hasMoreLocales,
			"latency_target_ms": translationMatrixLatencyTargetMS,
			"query_model":       TranslationMatrixQueryModel(),
			"contracts":         TranslationMatrixContractPayload(),
			"scope": map[string]any{
				"tenant_id": scope.TenantID,
				"org_id":    scope.OrgID,
			},
			"locale_policy":        localePolicy,
			"quick_action_targets": quickActionTargets,
			"report": map[string]any{
				"checksum": runtime.report.Checksum,
				"summary": map[string]any{
					"families": runtime.report.Summary.Families,
					"variants": runtime.report.Summary.Variants,
					"blockers": runtime.report.Summary.Blockers,
				},
			},
		}, channel),
	}, nil
}

func (b *translationFamilyBinding) CreateMissingBulk(c router.Context, body map[string]any) (payload any, err error) {
	startedAt := time.Now()
	obsCtx := c.Context()
	defer func() {
		recordTranslationAPIOperation(obsCtx, translationAPIObservation{
			Operation: "translations.matrix.action.create_missing",
			Kind:      "write",
			RequestID: requestIDFromContext(obsCtx),
			TraceID:   traceIDFromContext(obsCtx),
			TenantID:  tenantIDFromContext(obsCtx),
			OrgID:     orgIDFromContext(obsCtx),
			Duration:  time.Since(startedAt),
			Err:       err,
		})
	}()
	if b == nil || b.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation matrix binding", map[string]any{"component": "translation_matrix_binding"})
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	obsCtx = adminCtx.Context
	setTranslationTraceHeaders(c, obsCtx)
	if permissionErr := b.admin.requirePermission(adminCtx, PermAdminTranslationsEdit, "translations"); permissionErr != nil {
		return nil, permissionErr
	}
	if identityErr := rejectTranslationClientIdentityFields(body); identityErr != nil {
		return nil, identityErr
	}

	channel := translationChannelFromRequest(c, adminCtx, body)
	input, err := parseTranslationMatrixCreateMissingInput(c, body, channel)
	if err != nil {
		return nil, err
	}
	familyIDs := translationMatrixFamilyIDs(body["family_ids"])
	if len(familyIDs) == 0 {
		return nil, validationDomainError("matrix create missing requires family_ids", map[string]any{"field": "family_ids"})
	}
	scope := translationservices.Scope{
		TenantID: translationIdentityFromAdminContext(adminCtx).TenantID,
		OrgID:    translationIdentityFromAdminContext(adminCtx).OrgID,
	}

	summary := map[string]int{
		"families_processed": len(familyIDs),
		"locales_requested":  0,
		"created":            0,
		"skipped":            0,
		"failed":             0,
	}
	results := make([]map[string]any, 0, len(familyIDs))
	for _, familyID := range familyIDs {
		runtime, runtimeErr := b.runtime(adminCtx.Context, input.Plan.Environment)
		if runtimeErr != nil {
			return nil, runtimeErr
		}
		family, ok, detailErr := runtime.service.Detail(adminCtx.Context, translationservices.GetFamilyInput{
			Scope:       scope,
			Environment: input.Plan.Environment,
			FamilyID:    familyID,
		})
		if detailErr != nil {
			return nil, detailErr
		}

		result := map[string]any{
			"family_id":         familyID,
			"requested_locales": append([]string{}, input.Locales...),
			"created":           []map[string]any{},
			"skipped":           []map[string]any{},
			"failures":          []map[string]any{},
		}
		if !ok {
			summary["failed"]++
			result["status"] = translationMatrixBulkResultStatusFailed
			result["failures"] = []map[string]any{{
				"text_code": TextCodeNotFound,
				"message":   "translation family not found",
			}}
			results = append(results, result)
			continue
		}
		result["content_type"] = family.ContentType
		result["source_record_id"] = translationFamilySourceVariant(family).SourceRecordID

		targetLocales := input.Locales
		if len(targetLocales) == 0 {
			targetLocales = translationFamilyMissingLocales(family)
		}
		targetLocales = translationMatrixFilterMissingLocales(family, targetLocales)
		summary["locales_requested"] += len(targetLocales)
		if len(targetLocales) == 0 {
			summary["skipped"]++
			result["status"] = translationMatrixBulkResultStatusSkipped
			result["skipped"] = []map[string]any{{
				"reason_code": "NO_MISSING_LOCALES",
				"reason":      "No missing locales matched the current selection.",
			}}
			results = append(results, result)
			continue
		}

		created := []map[string]any{}
		skipped := []map[string]any{}
		failures := []map[string]any{}
		for _, locale := range targetLocales {
			perLocale := input.Plan
			perLocale.Locale = locale
			payloadMap, createErr := b.translationMatrixCreateVariant(adminCtx, scope, familyID, perLocale)
			if createErr != nil {
				mapped, _ := mapToGoError(createErr, nil)
				entry := map[string]any{
					"locale":  locale,
					"message": createErr.Error(),
				}
				if mapped != nil {
					entry["text_code"] = mapped.TextCode
					if len(mapped.Metadata) > 0 {
						entry["metadata"] = cloneAnyMap(mapped.Metadata)
					}
				}
				if isTranslationVariantAlreadyExists(createErr) {
					summary["skipped"]++
					entry["reason_code"] = TextCodeTranslationExists
					skipped = append(skipped, entry)
					continue
				}
				summary["failed"]++
				failures = append(failures, entry)
				continue
			}
			summary["created"]++
			data := extractMap(payloadMap["data"])
			createdEntry := map[string]any{
				"locale":     locale,
				"variant_id": toString(data["variant_id"]),
				"record_id":  toString(data["record_id"]),
				"status":     toString(data["status"]),
			}
			if assignment := extractMap(data["assignment"]); len(assignment) > 0 {
				createdEntry["assignment_id"] = toString(assignment["assignment_id"])
				createdEntry["assignment_status"] = toString(assignment["status"])
			}
			created = append(created, createdEntry)
		}

		switch {
		case len(failures) > 0 && len(created) == 0:
			result["status"] = translationMatrixBulkResultStatusFailed
		case len(created) > 0:
			result["status"] = translationMatrixBulkResultStatusCreated
		default:
			result["status"] = translationMatrixBulkResultStatusSkipped
		}
		result["created"] = created
		result["skipped"] = skipped
		result["failures"] = failures
		results = append(results, result)
	}

	return map[string]any{
		"data": map[string]any{
			"action":  translationMatrixBulkActionCreateMissing,
			"summary": summary,
			"results": results,
		},
		"meta": mergeTranslationChannelContract(map[string]any{
			"contracts": TranslationMatrixContractPayload(),
		}, input.Plan.Environment),
	}, nil
}

func (b *translationFamilyBinding) ExportSelectedBulk(c router.Context, body map[string]any) (payload any, err error) {
	startedAt := time.Now()
	obsCtx := c.Context()
	defer func() {
		recordTranslationAPIOperation(obsCtx, translationAPIObservation{
			Operation: "translations.matrix.action.export_selected",
			Kind:      "write",
			RequestID: requestIDFromContext(obsCtx),
			TraceID:   traceIDFromContext(obsCtx),
			TenantID:  tenantIDFromContext(obsCtx),
			OrgID:     orgIDFromContext(obsCtx),
			Duration:  time.Since(startedAt),
			Err:       err,
		})
	}()
	if b == nil || b.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation matrix binding", map[string]any{"component": "translation_matrix_binding"})
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	obsCtx = adminCtx.Context
	setTranslationTraceHeaders(c, obsCtx)
	if permissionErr := b.admin.requirePermission(adminCtx, translationExchangePermissionExport, "translations"); permissionErr != nil {
		return nil, permissionErr
	}
	if identityErr := rejectTranslationClientIdentityFields(body); identityErr != nil {
		return nil, identityErr
	}

	input := parseTranslationMatrixExportSelectedInput(c, body, adminCtx)
	familyIDs := translationMatrixFamilyIDs(body["family_ids"])
	if len(familyIDs) == 0 {
		return nil, validationDomainError("matrix export selected requires family_ids", map[string]any{"field": "family_ids"})
	}
	scope := translationservices.Scope{
		TenantID: translationIdentityFromAdminContext(adminCtx).TenantID,
		OrgID:    translationIdentityFromAdminContext(adminCtx).OrgID,
	}
	runtime, err := b.runtime(adminCtx.Context, input.Environment)
	if err != nil {
		return nil, err
	}

	results := make([]map[string]any, 0, len(familyIDs))
	resources := []string{}
	entityIDs := []string{}
	targetLocales := []string{}
	previewRows := []map[string]any{}
	summary := map[string]int{
		"families_processed": len(familyIDs),
		"export_ready":       0,
		"skipped":            0,
		"failed":             0,
		"estimated_rows":     0,
	}

	for _, familyID := range familyIDs {
		family, ok, detailErr := runtime.service.Detail(adminCtx.Context, translationservices.GetFamilyInput{
			Scope:       scope,
			Environment: input.Environment,
			FamilyID:    familyID,
		})
		if detailErr != nil {
			return nil, detailErr
		}
		result := map[string]any{
			"family_id":         familyID,
			"requested_locales": append([]string{}, input.Locales...),
		}
		if !ok {
			summary["failed"]++
			result["status"] = translationMatrixBulkResultStatusFailed
			result["reason_code"] = TextCodeNotFound
			result["reason"] = "translation family not found"
			results = append(results, result)
			continue
		}

		source := translationFamilySourceVariant(family)
		result["content_type"] = family.ContentType
		result["source_record_id"] = source.SourceRecordID
		exportableLocales := translationMatrixExportableLocales(family, input.Locales)
		if len(exportableLocales) == 0 || strings.TrimSpace(source.SourceRecordID) == "" {
			summary["skipped"]++
			result["status"] = translationMatrixBulkResultStatusSkipped
			result["reason_code"] = "NO_EXPORTABLE_LOCALES"
			result["reason"] = "No locales with exportable variants matched the current selection."
			results = append(results, result)
			continue
		}

		result["status"] = translationMatrixBulkResultStatusExportReady
		result["exportable_locales"] = append([]string{}, exportableLocales...)
		estimatedRows := len(source.Fields) * len(exportableLocales)
		result["estimated_rows"] = estimatedRows
		summary["export_ready"]++
		summary["estimated_rows"] += estimatedRows
		resources = append(resources, family.ContentType)
		entityIDs = append(entityIDs, source.SourceRecordID)
		targetLocales = append(targetLocales, exportableLocales...)
		for _, locale := range exportableLocales {
			for fieldPath, sourceText := range source.Fields {
				if len(previewRows) >= 12 {
					break
				}
				previewRows = append(previewRows, map[string]any{
					"resource":      family.ContentType,
					"entity_id":     source.SourceRecordID,
					"family_id":     family.ID,
					"source_locale": family.SourceLocale,
					"target_locale": locale,
					"field_path":    fieldPath,
					"source_text":   sourceText,
				})
			}
		}
		results = append(results, result)
	}

	resources = dedupeAndSortStrings(resources)
	entityIDs = dedupeAndSortStrings(entityIDs)
	targetLocales = dedupeAndSortStrings(targetLocales)
	format := input.Format
	if format == "" {
		format = "json"
	}

	return map[string]any{
		"data": map[string]any{
			"action":  translationMatrixBulkActionExportSelected,
			"summary": summary,
			"results": results,
			"export_request": map[string]any{
				"endpoint": resolveURLWith(b.admin.URLs(), b.admin.AdminAPIGroup(), "translations.export", nil, nil),
				"method":   "POST",
				"filter": map[string]any{
					"resources":           resources,
					"entity_ids":          entityIDs,
					"target_locales":      targetLocales,
					"include_source_hash": input.IncludeSourceHash,
					"options": map[string]any{
						"family_ids": familyIDs,
						"format":     format,
					},
				},
			},
			"preview_rows": previewRows,
		},
		"meta": mergeTranslationChannelContract(map[string]any{
			"contracts": TranslationMatrixContractPayload(),
		}, input.Environment),
	}, nil
}

func parseTranslationMatrixCreateMissingInput(c router.Context, body map[string]any, environment string) (translationMatrixCreateMissingInput, error) {
	input := translationMatrixCreateMissingInput{
		Locales: translationMatrixLocalesFromValues(body["locale"], body["locales"]),
		Plan: translationFamilyCreateVariantInput{
			AutoCreateAssignment: toBool(body["auto_create_assignment"]),
			AssigneeID:           strings.TrimSpace(toString(body["assignee_id"])),
			Priority:             Priority(strings.TrimSpace(strings.ToLower(toString(body["priority"])))),
			Environment:          strings.TrimSpace(environment),
			IdempotencyKey: strings.TrimSpace(firstNonEmpty(
				toString(body["idempotency_key"]),
				c.Header("X-Idempotency-Key"),
				c.Header("Idempotency-Key"),
			)),
		},
	}
	if input.Plan.Priority != "" && !input.Plan.Priority.IsValid() {
		return translationMatrixCreateMissingInput{}, validationDomainError("invalid priority", map[string]any{"field": "priority"})
	}
	if rawDueDate := strings.TrimSpace(toString(body["due_date"])); rawDueDate != "" {
		dueDate, err := time.Parse(time.RFC3339, rawDueDate)
		if err != nil {
			return translationMatrixCreateMissingInput{}, validationDomainError("invalid due_date", map[string]any{"field": "due_date"})
		}
		dueDate = dueDate.UTC()
		input.Plan.DueDate = &dueDate
	}
	if !input.Plan.AutoCreateAssignment && (input.Plan.AssigneeID != "" || input.Plan.Priority != "" || input.Plan.DueDate != nil) {
		return translationMatrixCreateMissingInput{}, validationDomainError("assignment fields require auto_create_assignment=true", map[string]any{
			"field": "auto_create_assignment",
		})
	}
	return input, nil
}

func parseTranslationMatrixExportSelectedInput(c router.Context, body map[string]any, adminCtx AdminContext) translationMatrixExportSelectedInput {
	format := strings.TrimSpace(strings.ToLower(firstNonEmpty(toString(body["format"]), c.Query("format"))))
	if format != "csv" && format != "json" {
		format = "json"
	}
	return translationMatrixExportSelectedInput{
		Locales:           translationMatrixLocalesFromValues(body["locale"], body["locales"]),
		Format:            format,
		IncludeSourceHash: toBool(body["include_source_hash"]),
		Environment:       translationChannelFromRequest(c, adminCtx, body),
	}
}

func translationMatrixLocalesFromValues(values ...any) []string {
	out := []string{}
	for _, raw := range values {
		switch typed := raw.(type) {
		case string:
			for part := range strings.SplitSeq(typed, ",") {
				if locale := normalizeCreateTranslationLocale(part); locale != "" {
					out = append(out, locale)
				}
			}
		case []string:
			for _, value := range typed {
				if locale := normalizeCreateTranslationLocale(value); locale != "" {
					out = append(out, locale)
				}
			}
		case []any:
			for _, value := range typed {
				if locale := normalizeCreateTranslationLocale(toString(value)); locale != "" {
					out = append(out, locale)
				}
			}
		}
	}
	if len(out) == 0 {
		return nil
	}
	return dedupeAndSortStrings(out)
}

func translationMatrixFamilyIDs(raw any) []string {
	out := []string{}
	switch typed := raw.(type) {
	case []string:
		out = append(out, typed...)
	case []any:
		for _, value := range typed {
			out = append(out, toString(value))
		}
	case string:
		for value := range strings.SplitSeq(typed, ",") {
			out = append(out, value)
		}
	}
	if len(out) == 0 {
		return nil
	}
	clean := make([]string, 0, len(out))
	for _, value := range out {
		if normalized := strings.TrimSpace(value); normalized != "" {
			clean = append(clean, normalized)
		}
	}
	return dedupeAndSortStrings(clean)
}

func translationMatrixLocalesForFamilies(families []translationservices.FamilyRecord, requested []string) []string {
	if len(requested) > 0 {
		return append([]string{}, requested...)
	}
	out := []string{}
	sourceLocales := []string{}
	for _, family := range families {
		if locale := normalizeCreateTranslationLocale(family.SourceLocale); locale != "" {
			sourceLocales = append(sourceLocales, locale)
			out = append(out, locale)
		}
		out = append(out, translationFamilyAvailableLocales(family)...)
		out = append(out, translationFamilyMissingLocales(family)...)
		for _, locale := range family.Policy.RequiredLocales {
			if normalized := normalizeCreateTranslationLocale(locale); normalized != "" {
				out = append(out, normalized)
			}
		}
		for _, assignment := range family.Assignments {
			if locale := normalizeCreateTranslationLocale(assignment.TargetLocale); locale != "" {
				out = append(out, locale)
			}
		}
	}
	out = dedupeAndSortStrings(out)
	if len(sourceLocales) == 0 {
		return out
	}
	sourceLocales = dedupeAndSortStrings(sourceLocales)
	ranked := make([]string, 0, len(out))
	seen := map[string]struct{}{}
	for _, locale := range sourceLocales {
		if _, ok := seen[locale]; ok {
			continue
		}
		seen[locale] = struct{}{}
		ranked = append(ranked, locale)
	}
	for _, locale := range out {
		if _, ok := seen[locale]; ok {
			continue
		}
		seen[locale] = struct{}{}
		ranked = append(ranked, locale)
	}
	return ranked
}

func translationMatrixVisibleLocales(locales []string, offset, limit int) ([]string, bool) {
	if len(locales) == 0 {
		return nil, false
	}
	if offset >= len(locales) {
		return nil, false
	}
	end := min(offset+limit, len(locales))
	return append([]string{}, locales[offset:end]...), end < len(locales)
}

func translationMatrixColumnPayloads(families []translationservices.FamilyRecord, locales []string, offset int) []map[string]any {
	out := make([]map[string]any, 0, len(locales))
	for index, locale := range locales {
		requiredByCount := 0
		sourceCount := 0
		for _, family := range families {
			if strings.EqualFold(family.SourceLocale, locale) {
				sourceCount++
			}
			if translationMatrixLocaleRequired(family, locale) {
				requiredByCount++
			}
		}
		out = append(out, map[string]any{
			"locale":            locale,
			"label":             strings.ToUpper(locale),
			"required_by_count": requiredByCount,
			"source_count":      sourceCount,
			"source_locale":     sourceCount > 0,
			"sticky":            offset+index == 0,
		})
	}
	return out
}

func translationMatrixLocalePolicyPayloads(families []translationservices.FamilyRecord, locales []string, offset int) []map[string]any {
	out := make([]map[string]any, 0, len(locales))
	for index, locale := range locales {
		notRequiredFamilyIDs := []string{}
		requiredByCount := 0
		sourceCount := 0
		for _, family := range families {
			if strings.EqualFold(family.SourceLocale, locale) {
				sourceCount++
			}
			if translationMatrixLocaleRequired(family, locale) {
				requiredByCount++
				continue
			}
			if !translationMatrixLocaleExists(family, locale) {
				notRequiredFamilyIDs = append(notRequiredFamilyIDs, strings.TrimSpace(family.ID))
			}
		}
		out = append(out, map[string]any{
			"locale":                  locale,
			"label":                   strings.ToUpper(locale),
			"sticky":                  offset+index == 0,
			"source_locale":           sourceCount > 0,
			"required_by_count":       requiredByCount,
			"optional_family_count":   len(notRequiredFamilyIDs),
			"not_required_family_ids": dedupeAndSortStrings(notRequiredFamilyIDs),
		})
	}
	return out
}

func translationMatrixQuickActionTargets(adm *Admin) map[string]any {
	if adm == nil {
		return map[string]any{}
	}
	adminAPIGroup := strings.TrimSpace(adm.AdminAPIGroup())
	if adminAPIGroup == "" {
		adminAPIGroup = "admin.api"
	}
	return map[string]any{
		"create_missing": map[string]any{
			"method":       "POST",
			"endpoint":     resolveURLWith(adm.URLs(), adminAPIGroup, "translations.matrix.actions.create_missing", nil, nil),
			"route":        "translations.matrix.actions.create_missing",
			"resolver_key": adminAPIGroup + ".translations.matrix.actions.create_missing",
		},
		"export_selected": map[string]any{
			"method":       "POST",
			"endpoint":     resolveURLWith(adm.URLs(), adminAPIGroup, "translations.matrix.actions.export_selected", nil, nil),
			"route":        "translations.matrix.actions.export_selected",
			"resolver_key": adminAPIGroup + ".translations.matrix.actions.export_selected",
		},
		"family_detail": map[string]any{
			"route":        "translations.families.id",
			"resolver_key": "admin.translations.families.id",
		},
		"assignment_editor": map[string]any{
			"route":        "translations.assignments.id",
			"resolver_key": "admin.translations.assignments.id",
		},
		"content_detail": map[string]any{
			"base_path": strings.TrimRight(strings.TrimSpace(firstNonEmpty(adm.config.BasePath, "/admin")), "/"),
			"type":      "content_detail",
		},
		"content_edit": map[string]any{
			"base_path": strings.TrimRight(strings.TrimSpace(firstNonEmpty(adm.config.BasePath, "/admin")), "/"),
			"type":      "content_edit",
		},
	}
}

func translationMatrixRowPayload(family translationservices.FamilyRecord, locales []string, adm *Admin, channel string, createActionState map[string]any) map[string]any {
	source := translationFamilySourceVariant(family)
	cells := map[string]any{}
	for _, locale := range locales {
		cells[locale] = translationMatrixCellPayload(family, locale, adm, channel, createActionState)
	}
	rowLinks := translationMatrixRowLinks(adm, family, source, channel)
	return map[string]any{
		"family_id":        family.ID,
		"content_type":     family.ContentType,
		"source_locale":    family.SourceLocale,
		"source_record_id": source.SourceRecordID,
		"source_title":     strings.TrimSpace(firstNonEmpty(source.Fields["title"], source.SourceRecordID)),
		"readiness_state":  family.ReadinessState,
		"blocker_codes":    append([]string{}, family.BlockerCodes...),
		"links":            rowLinks,
		"cells":            cells,
	}
}

func translationMatrixRowLinks(adm *Admin, family translationservices.FamilyRecord, source translationservices.FamilyVariant, channel string) map[string]any {
	if adm == nil {
		return map[string]any{}
	}
	links := map[string]any{
		"family": translationDashboardLink(adm.URLs(), "admin", "translations.families.id", "admin.translations.families.id", map[string]string{
			"family_id": family.ID,
		}, translationDashboardQuery(nil, channel, nil), map[string]any{
			"key":         "family",
			"label":       "Open family",
			"description": "Open the family detail surface for this row.",
			"relation":    "primary",
		}),
	}
	navigation := translationCreateVariantNavigationPayloadForRecord(family.ContentType, source.SourceRecordID, family.SourceLocale, adm.config.BasePath)
	if detailURL := toString(navigation["content_detail_url"]); detailURL != "" {
		links["content_detail"] = map[string]any{
			"href":        detailURL,
			"key":         "content_detail",
			"label":       "Source content",
			"description": "Open the source content detail view.",
			"relation":    "secondary",
		}
	}
	if editURL := toString(navigation["content_edit_url"]); editURL != "" {
		links["content_edit"] = map[string]any{
			"href":        editURL,
			"key":         "content_edit",
			"label":       "Edit source",
			"description": "Open the source locale editor.",
			"relation":    "secondary",
		}
	}
	return links
}

func translationMatrixCellPayload(family translationservices.FamilyRecord, locale string, adm *Admin, channel string, createActionState map[string]any) map[string]any {
	required := translationMatrixLocaleRequired(family, locale)
	variant, hasVariant := translationMatrixVariantForLocale(family, locale)
	assignment, hasAssignment := translationMatrixLatestAssignment(family, locale)
	blockers := translationMatrixLocaleBlockers(family, locale)
	state := translationMatrixCellState(family, locale, required, variant, hasVariant, assignment, hasAssignment, blockers)
	payload := map[string]any{
		"locale":        locale,
		"state":         state,
		"required":      required,
		"not_required":  !required,
		"fallback":      state == translationMatrixCellStateFallback,
		"blocker_codes": translationMatrixBlockerCodes(blockers),
	}
	if hasVariant {
		payload["variant"] = cloneFamilyVariantPayload(variant)
	}
	if hasAssignment {
		payload["assignment"] = map[string]any{
			"id":          assignment.ID,
			"status":      assignment.Status,
			"assignee_id": assignment.AssigneeID,
			"reviewer_id": assignment.ReviewerID,
			"priority":    assignment.Priority,
			"due_date":    assignment.DueDate,
			"work_scope":  assignment.WorkScope,
		}
	}
	payload["quick_actions"] = map[string]any{
		"open":   translationMatrixOpenQuickAction(adm, family, locale, variant, hasVariant, assignment, hasAssignment, state),
		"create": translationMatrixCreateQuickAction(adm, family, locale, required, hasVariant, hasAssignment, state, channel, createActionState),
	}
	return payload
}

func translationMatrixCellState(
	family translationservices.FamilyRecord,
	locale string,
	required bool,
	variant translationservices.FamilyVariant,
	hasVariant bool,
	assignment translationservices.FamilyAssignment,
	hasAssignment bool,
	blockers []translationservices.FamilyBlocker,
) string {
	if translationMatrixCellFallback(family, locale, blockers) {
		return translationMatrixCellStateFallback
	}
	if !required && !hasVariant && !hasAssignment {
		return translationMatrixCellStateNotRequired
	}
	if translationMatrixInReview(hasAssignment, assignment, hasVariant, variant, blockers) {
		return translationMatrixCellStateInReview
	}
	if translationMatrixInProgress(hasAssignment, assignment, hasVariant, variant, blockers) {
		return translationMatrixCellStateInProgress
	}
	if hasVariant && translationMatrixReady(variant, blockers) {
		return translationMatrixCellStateReady
	}
	return translationMatrixCellStateMissing
}

func translationMatrixLocaleRequired(family translationservices.FamilyRecord, locale string) bool {
	locale = normalizeCreateTranslationLocale(locale)
	for _, requiredLocale := range family.Policy.RequiredLocales {
		if normalizeCreateTranslationLocale(requiredLocale) == locale {
			return true
		}
	}
	return false
}

func translationMatrixLocaleExists(family translationservices.FamilyRecord, locale string) bool {
	if _, ok := translationMatrixVariantForLocale(family, locale); ok {
		return true
	}
	if _, ok := translationMatrixLatestAssignment(family, locale); ok {
		return true
	}
	return false
}

func translationMatrixVariantForLocale(family translationservices.FamilyRecord, locale string) (translationservices.FamilyVariant, bool) {
	locale = normalizeCreateTranslationLocale(locale)
	for _, variant := range family.Variants {
		if normalizeCreateTranslationLocale(variant.Locale) == locale {
			return variant, true
		}
	}
	return translationservices.FamilyVariant{}, false
}

func translationMatrixLatestAssignment(family translationservices.FamilyRecord, locale string) (translationservices.FamilyAssignment, bool) {
	locale = normalizeCreateTranslationLocale(locale)
	candidates := make([]translationservices.FamilyAssignment, 0, len(family.Assignments))
	for _, assignment := range family.Assignments {
		if normalizeCreateTranslationLocale(assignment.TargetLocale) != locale {
			continue
		}
		if strings.EqualFold(strings.TrimSpace(assignment.Status), string(translationcore.AssignmentStatusArchived)) {
			continue
		}
		candidates = append(candidates, assignment)
	}
	if len(candidates) == 0 {
		return translationservices.FamilyAssignment{}, false
	}
	sort.SliceStable(candidates, func(i, j int) bool {
		if candidates[i].UpdatedAt.Equal(candidates[j].UpdatedAt) {
			return candidates[i].ID < candidates[j].ID
		}
		return candidates[i].UpdatedAt.After(candidates[j].UpdatedAt)
	})
	return candidates[0], true
}

func translationMatrixLocaleBlockers(family translationservices.FamilyRecord, locale string) []translationservices.FamilyBlocker {
	locale = normalizeCreateTranslationLocale(locale)
	out := []translationservices.FamilyBlocker{}
	for _, blocker := range family.Blockers {
		if normalizeCreateTranslationLocale(blocker.Locale) != locale {
			continue
		}
		out = append(out, blocker)
	}
	return out
}

func translationMatrixBlockerCodes(blockers []translationservices.FamilyBlocker) []string {
	out := make([]string, 0, len(blockers))
	for _, blocker := range blockers {
		if code := strings.TrimSpace(strings.ToLower(blocker.BlockerCode)); code != "" {
			out = append(out, code)
		}
	}
	return dedupeAndSortStrings(out)
}

func translationMatrixCellFallback(_ translationservices.FamilyRecord, locale string, blockers []translationservices.FamilyBlocker) bool {
	locale = normalizeCreateTranslationLocale(locale)
	for _, blocker := range blockers {
		if normalizeCreateTranslationLocale(blocker.Locale) != locale {
			continue
		}
		if toBool(blocker.Details["fallback_used"]) {
			return true
		}
	}
	return false
}

func translationMatrixInReview(hasAssignment bool, assignment translationservices.FamilyAssignment, hasVariant bool, variant translationservices.FamilyVariant, blockers []translationservices.FamilyBlocker) bool {
	if hasAssignment {
		switch strings.TrimSpace(strings.ToLower(assignment.Status)) {
		case string(translationcore.AssignmentStatusInReview), string(translationcore.AssignmentStatusApproved):
			return true
		}
	}
	if hasVariant && strings.EqualFold(strings.TrimSpace(variant.Status), string(translationcore.VariantStatusInReview)) {
		return true
	}
	for _, blocker := range blockers {
		if strings.EqualFold(strings.TrimSpace(blocker.BlockerCode), string(translationcore.FamilyBlockerPendingReview)) {
			return true
		}
	}
	return false
}

func translationMatrixInProgress(hasAssignment bool, assignment translationservices.FamilyAssignment, hasVariant bool, variant translationservices.FamilyVariant, blockers []translationservices.FamilyBlocker) bool {
	if hasAssignment {
		switch strings.TrimSpace(strings.ToLower(assignment.Status)) {
		case string(translationcore.AssignmentStatusOpen), string(translationcore.AssignmentStatusAssigned), string(translationcore.AssignmentStatusInProgress), string(translationcore.AssignmentStatusChangesRequested):
			return true
		}
	}
	if hasVariant {
		switch strings.TrimSpace(strings.ToLower(variant.Status)) {
		case string(translationcore.VariantStatusDraft), string(translationcore.VariantStatusInProgress):
			return true
		}
	}
	for _, blocker := range blockers {
		if strings.EqualFold(strings.TrimSpace(blocker.BlockerCode), string(translationcore.FamilyBlockerMissingField)) ||
			strings.EqualFold(strings.TrimSpace(blocker.BlockerCode), string(translationcore.FamilyBlockerOutdatedSource)) {
			return true
		}
	}
	return false
}

func translationMatrixReady(variant translationservices.FamilyVariant, blockers []translationservices.FamilyBlocker) bool {
	switch strings.TrimSpace(strings.ToLower(variant.Status)) {
	case string(translationcore.VariantStatusApproved), string(translationcore.VariantStatusPublished):
	default:
		return false
	}
	return len(blockers) == 0
}

func translationMatrixActionState(adm *Admin, ctx context.Context, permission string) map[string]any {
	allowed := true
	if adm != nil && adm.authorizer != nil {
		allowed = adm.authorizer.Can(ctx, permission, "translations")
	}
	return translationCapabilityActionState(true, allowed, permission)
}

func translationMatrixOpenQuickAction(
	adm *Admin,
	family translationservices.FamilyRecord,
	locale string,
	variant translationservices.FamilyVariant,
	hasVariant bool,
	assignment translationservices.FamilyAssignment,
	hasAssignment bool,
	state string,
) map[string]any {
	action := map[string]any{
		"enabled": false,
		"label":   "Open",
	}
	if adm == nil {
		action["reason"] = "Matrix routing is not configured."
		action["reason_code"] = ActionDisabledReasonCodeMissingContext
		return action
	}
	if hasAssignment {
		if href := translationMatrixAssignmentEditorURL(adm, assignment.ID); href != "" {
			action["enabled"] = true
			action["href"] = href
			action["route"] = "translations.assignments.id"
			action["resolver_key"] = "admin.translations.assignments.id"
			action["label"] = "Open assignment"
			action["description"] = "Open the assignment editor for this locale."
			return action
		}
	}
	if hasVariant {
		navigation := translationCreateVariantNavigationPayloadForRecord(family.ContentType, variant.SourceRecordID, locale, adm.config.BasePath)
		href := toString(navigation["content_edit_url"])
		label := "Open locale"
		if normalizeCreateTranslationLocale(locale) == normalizeCreateTranslationLocale(family.SourceLocale) {
			href = toString(navigation["content_detail_url"])
			label = "Open source"
		}
		if href != "" {
			action["enabled"] = true
			action["href"] = href
			action["label"] = label
			action["description"] = "Open the content record for this locale."
			return action
		}
	}
	action["reason_code"] = ActionDisabledReasonCodeTranslationMissing
	switch state {
	case translationMatrixCellStateFallback:
		action["reason"] = "Fallback content is still in use for this locale. Create the locale before opening work."
	case translationMatrixCellStateNotRequired:
		action["reason_code"] = ActionDisabledReasonCodeInvalidStatus
		action["reason"] = "This locale is optional for the current family policy."
	default:
		action["reason"] = "No variant or assignment exists for this locale yet."
	}
	return action
}

func translationMatrixCreateQuickAction(
	adm *Admin,
	family translationservices.FamilyRecord,
	locale string,
	required bool,
	hasVariant bool,
	hasAssignment bool,
	state string,
	channel string,
	createActionState map[string]any,
) map[string]any {
	action := map[string]any{
		"enabled":    false,
		"label":      "Create locale",
		"permission": PermAdminTranslationsEdit,
	}
	if adm == nil {
		action["reason"] = "Matrix routing is not configured."
		action["reason_code"] = ActionDisabledReasonCodeMissingContext
		return action
	}
	adminAPIGroup := strings.TrimSpace(adm.AdminAPIGroup())
	if adminAPIGroup == "" {
		adminAPIGroup = "admin.api"
	}
	action["endpoint"] = resolveURLWith(adm.URLs(), adminAPIGroup, "translations.matrix.actions.create_missing", nil, nil)
	action["method"] = "POST"
	action["route"] = "translations.matrix.actions.create_missing"
	action["resolver_key"] = adminAPIGroup + ".translations.matrix.actions.create_missing"
	action["payload"] = map[string]any{
		"family_ids": []string{family.ID},
		"locales":    []string{locale},
		"channel":    strings.TrimSpace(channel),
	}
	if enabled, _ := createActionState["enabled"].(bool); !enabled {
		action["reason"] = toString(createActionState["reason"])
		action["reason_code"] = toString(createActionState["reason_code"])
		return action
	}
	if hasVariant || hasAssignment {
		action["reason"] = "Locale work already exists for this cell."
		action["reason_code"] = ActionDisabledReasonCodeInvalidStatus
		return action
	}
	if !required {
		action["reason"] = "This locale is optional for the current family policy."
		action["reason_code"] = ActionDisabledReasonCodeInvalidStatus
		return action
	}
	if state != translationMatrixCellStateMissing && state != translationMatrixCellStateFallback {
		action["reason"] = "Only missing locale cells can create new work."
		action["reason_code"] = ActionDisabledReasonCodeInvalidStatus
		return action
	}
	action["enabled"] = true
	action["description"] = "Create the missing locale variant and refresh matrix readiness."
	return action
}

func translationMatrixAssignmentEditorURL(adm *Admin, assignmentID string) string {
	assignmentID = strings.TrimSpace(assignmentID)
	if adm == nil || assignmentID == "" {
		return ""
	}
	if href := resolveURLWith(adm.URLs(), "admin", "translations.assignments.id", map[string]string{
		"assignment_id": assignmentID,
	}, nil); href != "" {
		return href
	}
	base := strings.TrimRight(strings.TrimSpace(firstNonEmpty(adm.config.BasePath, "/admin")), "/")
	if base == "" {
		base = "/admin"
	}
	return base + "/translations/assignments/" + assignmentID + "/edit"
}

func translationMatrixFilterMissingLocales(family translationservices.FamilyRecord, locales []string) []string {
	if len(locales) == 0 {
		return nil
	}
	missing := map[string]struct{}{}
	for _, locale := range translationFamilyMissingLocales(family) {
		missing[locale] = struct{}{}
	}
	out := []string{}
	for _, locale := range locales {
		locale = normalizeCreateTranslationLocale(locale)
		if _, ok := missing[locale]; ok {
			out = append(out, locale)
		}
	}
	return dedupeAndSortStrings(out)
}

func translationMatrixExportableLocales(family translationservices.FamilyRecord, requested []string) []string {
	if len(requested) == 0 {
		locales := translationFamilyAvailableLocales(family)
		sourceLocale := normalizeCreateTranslationLocale(family.SourceLocale)
		out := []string{}
		for _, locale := range locales {
			if locale == sourceLocale {
				continue
			}
			out = append(out, locale)
		}
		return out
	}
	available := map[string]struct{}{}
	sourceLocale := normalizeCreateTranslationLocale(family.SourceLocale)
	for _, locale := range translationFamilyAvailableLocales(family) {
		if locale == sourceLocale {
			continue
		}
		available[locale] = struct{}{}
	}
	out := []string{}
	for _, locale := range requested {
		locale = normalizeCreateTranslationLocale(locale)
		if _, ok := available[locale]; ok {
			out = append(out, locale)
		}
	}
	return dedupeAndSortStrings(out)
}

func (b *translationFamilyBinding) translationMatrixCreateVariant(adminCtx AdminContext, scope translationservices.Scope, familyID string, input translationFamilyCreateVariantInput) (map[string]any, error) {
	runtime, err := b.runtime(adminCtx.Context, input.Environment)
	if err != nil {
		return nil, err
	}
	familyBefore, ok, err := runtime.service.Detail(adminCtx.Context, translationservices.GetFamilyInput{
		Scope:       scope,
		Environment: input.Environment,
		FamilyID:    strings.TrimSpace(familyID),
	})
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, notFoundDomainError("translation family not found", map[string]any{"family_id": strings.TrimSpace(familyID)})
	}
	if translationFamilyPolicyDenied(familyBefore) {
		return nil, NewDomainError(string(translationcore.ErrorPolicyBlocked), "translation family is blocked by policy", mergeTranslationChannelContract(map[string]any{
			"family_id":        familyBefore.ID,
			"content_type":     familyBefore.ContentType,
			"requested_locale": input.Locale,
		}, input.Environment))
	}
	if translationFamilyHasLocale(familyBefore, input.Locale) {
		source := translationFamilySourceVariant(familyBefore)
		return nil, TranslationAlreadyExistsError{
			Panel:        familyBefore.ContentType,
			EntityID:     strings.TrimSpace(source.SourceRecordID),
			SourceLocale: familyBefore.SourceLocale,
			Locale:       input.Locale,
			FamilyID:     familyBefore.ID,
		}
	}

	var assignmentPlan translationFamilyCreateVariantAssignmentPlan
	if input.AutoCreateAssignment {
		assignmentPlan, err = b.planCreateVariantAssignment(adminCtx.Context, familyBefore, input)
		if err != nil {
			return nil, err
		}
	}
	createdVariant, err := b.createFamilyVariant(adminCtx.Context, translationIdentityFromAdminContext(adminCtx).ActorID, familyBefore, input)
	if err != nil {
		return nil, err
	}

	outcome := translationFamilyCreateVariantOutcome{}
	if input.AutoCreateAssignment {
		outcome, err = b.applyCreateVariantAssignmentPlan(adminCtx.Context, familyBefore, input, assignmentPlan)
		if err != nil {
			if rollbackErr := b.deleteFamilyVariant(adminCtx.Context, createdVariant); rollbackErr != nil {
				return nil, errors.Join(err, rollbackErr)
			}
			return nil, err
		}
	}
	if syncErr := SyncTranslationFamilyStore(adminCtx.Context, b.admin, input.Environment); syncErr != nil {
		return nil, syncErr
	}

	payloadMap, familyAfter, err := b.rebuildCreateVariantPayloadWithFamily(adminCtx.Context, scope, familyBefore.ID, input)
	if err != nil {
		return nil, err
	}
	translationFamilyAttachCreateVariantNavigation(payloadMap, createdVariant, b.admin.config.BasePath)
	if outcome.Assignment != nil {
		data := extractMap(payloadMap["data"])
		data["assignment"] = translationCreateVariantAssignmentPayload(*outcome.Assignment)
		payloadMap["data"] = data
		meta := extractMap(payloadMap["meta"])
		meta["assignment_reused"] = outcome.AssignmentReused
		if len(outcome.ArchivedAssignmentIDs) > 0 {
			meta["archived_assignment_ids"] = append([]string{}, outcome.ArchivedAssignmentIDs...)
		}
		payloadMap["meta"] = meta
	}
	b.recordCreateVariantActivity(adminCtx.Context, translationIdentityFromAdminContext(adminCtx).ActorID, familyBefore, familyAfter, input, outcome)
	return payloadMap, nil
}

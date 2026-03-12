package admin

import (
	"context"
	"sort"
	"strings"
	"time"

	router "github.com/goliatone/go-router"

	translationcore "github.com/goliatone/go-admin/translations/core"
	translationservices "github.com/goliatone/go-admin/translations/services"
)

type translationFamilyRuntime struct {
	service *translationservices.FamilyService
	report  translationservices.BackfillReport
}

type translationFamilyBinding struct {
	admin       *Admin
	loadRuntime func(context.Context, string) (*translationFamilyRuntime, error)
}

func newTranslationFamilyBinding(a *Admin) *translationFamilyBinding {
	if a == nil {
		return nil
	}
	return &translationFamilyBinding{admin: a}
}

func (b *translationFamilyBinding) List(c router.Context) (payload any, err error) {
	startedAt := time.Now()
	obsCtx := c.Context()
	defer func() {
		recordTranslationAPIOperation(obsCtx, translationAPIObservation{
			Operation: "translations.families.list",
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
		return nil, serviceNotConfiguredDomainError("translation family binding", map[string]any{"component": "translation_family_binding"})
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	obsCtx = adminCtx.Context
	setTranslationTraceHeaders(c, obsCtx)
	if err := b.admin.requirePermission(adminCtx, PermAdminTranslationsView, "translations"); err != nil {
		return nil, err
	}
	environment := strings.TrimSpace(firstNonEmpty(c.Query("environment"), adminCtx.Channel))
	runtime, err := b.runtime(adminCtx.Context, environment)
	if err != nil {
		return nil, err
	}
	page := clampInt(atoiDefault(c.Query("page"), 1), 1, 10_000)
	perPage := clampInt(atoiDefault(c.Query("per_page"), 50), 1, 200)
	result, err := runtime.service.List(adminCtx.Context, translationservices.ListFamiliesInput{
		Scope: translationservices.Scope{
			TenantID: translationIdentityFromAdminContext(adminCtx).TenantID,
			OrgID:    translationIdentityFromAdminContext(adminCtx).OrgID,
		},
		Environment:    environment,
		ContentType:    strings.TrimSpace(strings.ToLower(c.Query("content_type"))),
		ReadinessState: strings.TrimSpace(strings.ToLower(c.Query("readiness_state"))),
		BlockerCode:    strings.TrimSpace(strings.ToLower(c.Query("blocker_code"))),
		MissingLocale:  strings.TrimSpace(strings.ToLower(c.Query("missing_locale"))),
		Page:           page,
		PerPage:        perPage,
	})
	if err != nil {
		return nil, err
	}
	items := make([]map[string]any, 0, len(result.Items))
	for _, family := range result.Items {
		items = append(items, translationFamilyListRow(family))
	}
	return map[string]any{
		"items":       items,
		"families":    items,
		"total":       result.Total,
		"page":        result.Page,
		"per_page":    result.PerPage,
		"environment": environment,
		"report": map[string]any{
			"checksum": runtime.report.Checksum,
			"summary": map[string]any{
				"families":    runtime.report.Summary.Families,
				"variants":    runtime.report.Summary.Variants,
				"assignments": runtime.report.Summary.Assignments,
				"blockers":    runtime.report.Summary.Blockers,
				"warnings":    runtime.report.Summary.Warnings,
			},
		},
	}, nil
}

func (b *translationFamilyBinding) Detail(c router.Context, id string) (payload any, err error) {
	startedAt := time.Now()
	obsCtx := c.Context()
	defer func() {
		recordTranslationAPIOperation(obsCtx, translationAPIObservation{
			Operation: "translations.families.detail",
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
		return nil, serviceNotConfiguredDomainError("translation family binding", map[string]any{"component": "translation_family_binding"})
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	obsCtx = adminCtx.Context
	setTranslationTraceHeaders(c, obsCtx)
	if err := b.admin.requirePermission(adminCtx, PermAdminTranslationsView, "translations"); err != nil {
		return nil, err
	}
	environment := strings.TrimSpace(firstNonEmpty(c.Query("environment"), adminCtx.Channel))
	runtime, err := b.runtime(adminCtx.Context, environment)
	if err != nil {
		return nil, err
	}
	scope := translationservices.Scope{
		TenantID: translationIdentityFromAdminContext(adminCtx).TenantID,
		OrgID:    translationIdentityFromAdminContext(adminCtx).OrgID,
	}
	family, ok, err := runtime.service.Detail(adminCtx.Context, translationservices.GetFamilyInput{
		Scope:       scope,
		Environment: environment,
		FamilyID:    strings.TrimSpace(id),
	})
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, notFoundDomainError("translation family not found", map[string]any{"family_id": strings.TrimSpace(id)})
	}
	return translationFamilyDetailPayload(family, environment), nil
}

func (b *translationFamilyBinding) runtime(ctx context.Context, environment string) (*translationFamilyRuntime, error) {
	if b != nil && b.loadRuntime != nil {
		return b.loadRuntime(ctx, environment)
	}
	if b == nil || b.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation family binding", map[string]any{"component": "translation_family_binding"})
	}
	input, familyPolicies, err := b.collectBackfillInput(ctx, environment)
	if err != nil {
		return nil, err
	}
	plan, err := translationservices.NewBackfillRunner().BuildPlan(ctx, input)
	if err != nil {
		return nil, err
	}
	store := translationservices.NewInMemoryFamilyStore()
	if err := store.LoadBackfillPlan(plan); err != nil {
		return nil, err
	}
	if assignments := b.collectAssignments(ctx); len(assignments) > 0 {
		if err := store.ReplaceAssignments(assignments); err != nil {
			return nil, err
		}
	}
	service := &translationservices.FamilyService{
		Store: store,
		Policies: translationservices.PolicyService{
			Resolver: translationservices.StaticPolicyResolver{Policies: familyPolicies},
		},
	}
	if _, err := service.RecomputeAll(ctx, environment); err != nil {
		return nil, err
	}
	return &translationFamilyRuntime{
		service: service,
		report:  translationservices.BuildBackfillReport(plan),
	}, nil
}

func (b *translationFamilyBinding) collectBackfillInput(ctx context.Context, environment string) (translationservices.BackfillInput, map[string]translationservices.FamilyPolicy, error) {
	input := translationservices.BackfillInput{
		Variants: []translationservices.BackfillSourceVariant{},
		Policies: map[string]translationservices.BackfillPolicy{},
	}
	familyPolicies := map[string]translationservices.FamilyPolicy{}
	if b == nil || b.admin == nil || b.admin.contentSvc == nil {
		return input, familyPolicies, serviceNotConfiguredDomainError("content service", map[string]any{"component": "translation_family_binding"})
	}
	defaultLocale := strings.TrimSpace(b.admin.config.DefaultLocale)
	if defaultLocale == "" {
		defaultLocale = "en"
	}
	locales := map[string]struct{}{strings.ToLower(defaultLocale): {}}
	pagesDefault, err := b.admin.contentSvc.Pages(ctx, defaultLocale)
	if err != nil {
		return input, familyPolicies, err
	}
	for _, page := range pagesDefault {
		addRecordLocales(locales, page.AvailableLocales)
	}
	contentsDefault, err := b.admin.contentSvc.Contents(ctx, defaultLocale)
	if err != nil {
		return input, familyPolicies, err
	}
	for _, content := range contentsDefault {
		addRecordLocales(locales, content.AvailableLocales)
	}
	for _, locale := range b.policyLocales(ctx, environment) {
		locales[strings.ToLower(strings.TrimSpace(locale))] = struct{}{}
	}
	orderedLocales := make([]string, 0, len(locales))
	for locale := range locales {
		if strings.TrimSpace(locale) == "" {
			continue
		}
		orderedLocales = append(orderedLocales, locale)
	}
	sort.Strings(orderedLocales)

	contentTypes := map[string]string{}
	for _, locale := range orderedLocales {
		pages, pageErr := b.admin.contentSvc.Pages(ctx, locale)
		if pageErr != nil {
			return input, familyPolicies, pageErr
		}
		for _, page := range pages {
			input.Variants = append(input.Variants, translationservices.BackfillSourceVariant{
				Scope:              translationScopeFromMaps(page.Metadata, page.Data),
				ContentType:        "pages",
				SourceRecordID:     strings.TrimSpace(page.ID),
				TranslationGroupID: strings.TrimSpace(page.TranslationGroupID),
				Locale:             translationFamilyLocale(page.Locale, locale),
				Fields:             translationFamilyFields(page.Title, page.Slug, page.Data),
				Status:             translationFamilyVariantStatus(page.Status),
			})
			contentTypes["pages"] = "pages"
		}

		contents, contentErr := b.admin.contentSvc.Contents(ctx, locale)
		if contentErr != nil {
			return input, familyPolicies, contentErr
		}
		for _, content := range contents {
			contentType := strings.TrimSpace(firstNonEmpty(content.ContentTypeSlug, content.ContentType))
			if contentType == "" {
				continue
			}
			contentType = strings.ToLower(contentType)
			input.Variants = append(input.Variants, translationservices.BackfillSourceVariant{
				Scope:              translationScopeFromMaps(content.Metadata, content.Data),
				ContentType:        contentType,
				SourceRecordID:     strings.TrimSpace(content.ID),
				TranslationGroupID: strings.TrimSpace(content.TranslationGroupID),
				Locale:             translationFamilyLocale(content.Locale, locale),
				Fields:             translationFamilyFields(content.Title, content.Slug, content.Data),
				Status:             translationFamilyVariantStatus(content.Status),
			})
			contentTypes[contentType] = contentType
		}
	}

	for contentType := range contentTypes {
		policy, ok := b.translationFamilyPolicy(ctx, contentType, environment)
		if !ok {
			continue
		}
		input.Policies[contentType] = translationservices.BackfillPolicy{
			SourceLocale:            policy.SourceLocale,
			RequiredLocales:         append([]string{}, policy.RequiredLocales...),
			RequiredFields:          cloneRequiredFieldsString(policy.RequiredFields),
			ReviewRequired:          policy.ReviewRequired,
			AllowPublishOverride:    policy.AllowPublishOverride,
			AssignmentLifecycleMode: policy.AssignmentLifecycleMode,
			DefaultWorkScope:        policy.DefaultWorkScope,
		}
		familyPolicies[contentType] = policy
	}
	return input, familyPolicies, nil
}

func (b *translationFamilyBinding) translationFamilyPolicy(ctx context.Context, contentType, environment string) (translationservices.FamilyPolicy, bool) {
	if b == nil || b.admin == nil || b.admin.translationPolicy == nil {
		return translationservices.FamilyPolicy{}, false
	}
	provider, ok := b.admin.translationPolicy.(translationRequirementsProvider)
	if !ok || provider == nil {
		return translationservices.FamilyPolicy{}, false
	}
	req, found, err := provider.Requirements(ctx, TranslationPolicyInput{
		EntityType:   contentType,
		Transition:   translationReadinessTransitionPublish,
		Environment:  environment,
		PolicyEntity: contentType,
	})
	if err != nil || !found {
		return translationservices.FamilyPolicy{}, false
	}
	sourceLocale := strings.TrimSpace(strings.ToLower(b.admin.config.DefaultLocale))
	if sourceLocale == "" {
		sourceLocale = "en"
	}
	return translationservices.FamilyPolicy{
		ContentType:             contentType,
		Environment:             environment,
		SourceLocale:            sourceLocale,
		RequiredLocales:         append([]string{}, req.Locales...),
		RequiredFields:          cloneRequiredFieldsString(req.RequiredFields),
		ReviewRequired:          req.ReviewRequired,
		AllowPublishOverride:    req.AllowPublishOverride,
		AssignmentLifecycleMode: req.AssignmentLifecycleMode,
		DefaultWorkScope:        req.DefaultWorkScope,
	}, true
}

func (b *translationFamilyBinding) policyLocales(ctx context.Context, environment string) []string {
	contentTypes := []string{"pages"}
	if svc := b.admin.contentTypeSvc; svc != nil {
		if types, err := svc.ContentTypes(ctx); err == nil {
			for _, contentType := range types {
				slug := strings.TrimSpace(contentType.Slug)
				if slug == "" {
					continue
				}
				contentTypes = append(contentTypes, slug)
			}
		}
	}
	set := map[string]struct{}{}
	for _, contentType := range contentTypes {
		policy, ok := b.translationFamilyPolicy(ctx, contentType, environment)
		if !ok {
			continue
		}
		for _, locale := range policy.RequiredLocales {
			normalized := strings.TrimSpace(strings.ToLower(locale))
			if normalized != "" {
				set[normalized] = struct{}{}
			}
		}
	}
	out := make([]string, 0, len(set))
	for locale := range set {
		out = append(out, locale)
	}
	sort.Strings(out)
	return out
}

func (b *translationFamilyBinding) collectAssignments(ctx context.Context) []translationservices.FamilyAssignment {
	queueBinding := &translationQueueBinding{admin: b.admin}
	repo, err := queueBinding.assignmentRepository()
	if err != nil || repo == nil {
		return nil
	}
	assignments, err := queueBinding.listAssignmentsForSummary(ctx, repo, "updated_at", nil)
	if err != nil {
		return nil
	}
	out := make([]translationservices.FamilyAssignment, 0, len(assignments))
	for _, assignment := range assignments {
		familyID := strings.TrimSpace(assignment.TranslationGroupID)
		if familyID == "" {
			continue
		}
		status := translationFamilyAssignmentStatus(assignment.Status)
		if status == string(translationcore.AssignmentStatusArchived) {
			continue
		}
		out = append(out, translationservices.FamilyAssignment{
			ID:           strings.TrimSpace(assignment.ID),
			FamilyID:     familyID,
			SourceLocale: strings.TrimSpace(strings.ToLower(assignment.SourceLocale)),
			TargetLocale: strings.TrimSpace(strings.ToLower(assignment.TargetLocale)),
			Status:       status,
			AssigneeID:   strings.TrimSpace(assignment.AssigneeID),
			ReviewerID:   strings.TrimSpace(assignment.LastReviewerID),
			Priority:     strings.TrimSpace(strings.ToLower(string(assignment.Priority))),
			DueDate:      cloneTimePtr(assignment.DueDate),
			UpdatedAt:    assignment.UpdatedAt,
			CreatedAt:    assignment.CreatedAt,
		})
	}
	return out
}

func translationFamilyListRow(family translationservices.FamilyRecord) map[string]any {
	source := translationFamilySourceVariant(family)
	return map[string]any{
		"family_id":                     family.ID,
		"tenant_id":                     family.TenantID,
		"org_id":                        family.OrgID,
		"content_type":                  family.ContentType,
		"source_locale":                 family.SourceLocale,
		"source_variant_id":             family.SourceVariantID,
		"source_record_id":              source.SourceRecordID,
		"source_title":                  strings.TrimSpace(source.Fields["title"]),
		"readiness_state":               family.ReadinessState,
		"missing_required_locale_count": family.MissingRequiredLocaleCount,
		"pending_review_count":          family.PendingReviewCount,
		"outdated_locale_count":         family.OutdatedLocaleCount,
		"blocker_codes":                 append([]string{}, family.BlockerCodes...),
		"missing_locales":               translationFamilyMissingLocales(family),
		"available_locales":             translationFamilyAvailableLocales(family),
		"updated_at":                    family.UpdatedAt,
		"created_at":                    family.CreatedAt,
	}
}

func translationFamilyDetailPayload(family translationservices.FamilyRecord, environment string) map[string]any {
	source := translationFamilySourceVariant(family)
	variants := cloneFamilyVariantPayloads(family.Variants)
	blockers := cloneFamilyBlockerPayloads(family.Blockers)
	assignments := cloneFamilyAssignmentPayloads(family.Assignments)
	activeAssignments := make([]map[string]any, 0, len(assignments))
	for _, assignment := range assignments {
		status := strings.TrimSpace(strings.ToLower(toString(assignment["status"])))
		if status == string(translationcore.AssignmentStatusApproved) || status == string(translationcore.AssignmentStatusArchived) {
			continue
		}
		activeAssignments = append(activeAssignments, assignment)
	}
	return map[string]any{
		"family_id":          family.ID,
		"tenant_id":          family.TenantID,
		"org_id":             family.OrgID,
		"content_type":       family.ContentType,
		"source_locale":      family.SourceLocale,
		"source_variant_id":  family.SourceVariantID,
		"readiness_state":    family.ReadinessState,
		"source_variant":     cloneFamilyVariantPayload(source),
		"locale_variants":    variants,
		"blockers":           blockers,
		"active_assignments": activeAssignments,
		"readiness_summary": map[string]any{
			"state":                         family.ReadinessState,
			"missing_required_locale_count": family.MissingRequiredLocaleCount,
			"pending_review_count":          family.PendingReviewCount,
			"outdated_locale_count":         family.OutdatedLocaleCount,
			"blocker_codes":                 append([]string{}, family.BlockerCodes...),
			"required_locales":              append([]string{}, family.Policy.RequiredLocales...),
			"missing_locales":               translationFamilyMissingLocales(family),
			"available_locales":             translationFamilyAvailableLocales(family),
			"publish_ready":                 family.ReadinessState == string(translationcore.FamilyReadinessReady),
		},
		"publish_gate": map[string]any{
			"allowed":                  family.ReadinessState == string(translationcore.FamilyReadinessReady),
			"override_allowed":         family.Policy.AllowPublishOverride,
			"requires_override_reason": family.Policy.AllowPublishOverride,
			"blocked_by":               append([]string{}, family.BlockerCodes...),
			"review_required":          family.Policy.ReviewRequired,
			"allow_publish_override":   family.Policy.AllowPublishOverride,
		},
		"policy": map[string]any{
			"content_type":              family.Policy.ContentType,
			"environment":               environment,
			"source_locale":             family.Policy.SourceLocale,
			"required_locales":          append([]string{}, family.Policy.RequiredLocales...),
			"required_fields":           cloneRequiredFieldsString(family.Policy.RequiredFields),
			"review_required":           family.Policy.ReviewRequired,
			"allow_publish_override":    family.Policy.AllowPublishOverride,
			"assignment_lifecycle_mode": family.Policy.AssignmentLifecycleMode,
			"default_work_scope":        family.Policy.DefaultWorkScope,
		},
	}
}

func translationFamilySourceVariant(family translationservices.FamilyRecord) translationservices.FamilyVariant {
	for _, variant := range family.Variants {
		if strings.EqualFold(strings.TrimSpace(variant.ID), strings.TrimSpace(family.SourceVariantID)) {
			return variant
		}
	}
	if len(family.Variants) > 0 {
		return family.Variants[0]
	}
	return translationservices.FamilyVariant{}
}

func cloneFamilyVariantPayloads(items []translationservices.FamilyVariant) []map[string]any {
	if len(items) == 0 {
		return nil
	}
	sort.SliceStable(items, func(i, j int) bool {
		if items[i].Locale == items[j].Locale {
			return items[i].ID < items[j].ID
		}
		return items[i].Locale < items[j].Locale
	})
	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		out = append(out, cloneFamilyVariantPayload(item))
	}
	return out
}

func cloneFamilyVariantPayload(item translationservices.FamilyVariant) map[string]any {
	return map[string]any{
		"id":                       item.ID,
		"family_id":                item.FamilyID,
		"tenant_id":                item.TenantID,
		"org_id":                   item.OrgID,
		"locale":                   item.Locale,
		"status":                   item.Status,
		"is_source":                item.IsSource,
		"source_hash_at_last_sync": item.SourceHashAtLastSync,
		"fields":                   cloneStringMap(item.Fields),
		"source_record_id":         item.SourceRecordID,
		"created_at":               item.CreatedAt,
		"updated_at":               item.UpdatedAt,
		"published_at":             item.PublishedAt,
	}
}

func cloneFamilyBlockerPayloads(items []translationservices.FamilyBlocker) []map[string]any {
	if len(items) == 0 {
		return nil
	}
	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		out = append(out, map[string]any{
			"id":           item.ID,
			"family_id":    item.FamilyID,
			"tenant_id":    item.TenantID,
			"org_id":       item.OrgID,
			"blocker_code": item.BlockerCode,
			"locale":       item.Locale,
			"field_path":   item.FieldPath,
			"details":      cloneAnyMap(item.Details),
		})
	}
	return out
}

func cloneFamilyAssignmentPayloads(items []translationservices.FamilyAssignment) []map[string]any {
	if len(items) == 0 {
		return nil
	}
	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		out = append(out, map[string]any{
			"id":            item.ID,
			"family_id":     item.FamilyID,
			"variant_id":    item.VariantID,
			"tenant_id":     item.TenantID,
			"org_id":        item.OrgID,
			"source_locale": item.SourceLocale,
			"target_locale": item.TargetLocale,
			"work_scope":    item.WorkScope,
			"status":        item.Status,
			"assignee_id":   item.AssigneeID,
			"reviewer_id":   item.ReviewerID,
			"priority":      item.Priority,
			"due_date":      item.DueDate,
			"created_at":    item.CreatedAt,
			"updated_at":    item.UpdatedAt,
		})
	}
	return out
}

func translationFamilyMissingLocales(family translationservices.FamilyRecord) []string {
	out := []string{}
	for _, blocker := range family.Blockers {
		if strings.EqualFold(strings.TrimSpace(blocker.BlockerCode), string(translationcore.FamilyBlockerMissingLocale)) {
			out = append(out, strings.TrimSpace(strings.ToLower(blocker.Locale)))
		}
	}
	return dedupeAndSortStrings(out)
}

func translationFamilyAvailableLocales(family translationservices.FamilyRecord) []string {
	out := make([]string, 0, len(family.Variants))
	for _, variant := range family.Variants {
		if locale := strings.TrimSpace(strings.ToLower(variant.Locale)); locale != "" {
			out = append(out, locale)
		}
	}
	return dedupeAndSortStrings(out)
}

func translationFamilyAssignmentStatus(status AssignmentStatus) string {
	switch status {
	case AssignmentStatusPending:
		return string(translationcore.AssignmentStatusOpen)
	case AssignmentStatusAssigned:
		return string(translationcore.AssignmentStatusAssigned)
	case AssignmentStatusInProgress:
		return string(translationcore.AssignmentStatusInProgress)
	case AssignmentStatusReview:
		return string(translationcore.AssignmentStatusInReview)
	case AssignmentStatusRejected:
		return string(translationcore.AssignmentStatusChangesRequested)
	case AssignmentStatusApproved:
		return string(translationcore.AssignmentStatusApproved)
	case AssignmentStatusArchived, AssignmentStatusPublished:
		return string(translationcore.AssignmentStatusArchived)
	default:
		return string(translationcore.AssignmentStatusOpen)
	}
}

func translationFamilyVariantStatus(status string) string {
	switch strings.TrimSpace(strings.ToLower(status)) {
	case "published":
		return string(translationcore.VariantStatusPublished)
	case "approved":
		return string(translationcore.VariantStatusApproved)
	case "approval", "review", "in_review":
		return string(translationcore.VariantStatusInReview)
	case "in_progress":
		return string(translationcore.VariantStatusInProgress)
	case "archived":
		return string(translationcore.VariantStatusArchived)
	default:
		return string(translationcore.VariantStatusDraft)
	}
}

func translationFamilyLocale(current, fallback string) string {
	value := strings.TrimSpace(strings.ToLower(firstNonEmpty(current, fallback)))
	if value == "" {
		return "en"
	}
	return value
}

func translationFamilyFields(title, slug string, data map[string]any) map[string]string {
	fields := map[string]string{}
	if trimmed := strings.TrimSpace(title); trimmed != "" {
		fields["title"] = trimmed
	}
	if trimmed := strings.TrimSpace(anyToString(data["path"])); trimmed != "" {
		fields["path"] = trimmed
	} else if trimmed := strings.TrimSpace(anyToString(data["slug"])); trimmed != "" {
		fields["path"] = trimmed
	} else if trimmed := strings.TrimSpace(slug); trimmed != "" {
		fields["path"] = "/" + strings.TrimPrefix(trimmed, "/")
	}
	for _, key := range []string{"summary", "excerpt", "body", "description", "meta_title", "meta_description"} {
		if trimmed := strings.TrimSpace(anyToString(data[key])); trimmed != "" {
			fields[key] = trimmed
		}
	}
	return fields
}

func translationScopeFromMaps(maps ...map[string]any) translationservices.Scope {
	scope := translationservices.Scope{}
	for _, data := range maps {
		if len(data) == 0 {
			continue
		}
		if scope.TenantID == "" {
			scope.TenantID = strings.TrimSpace(anyToString(data["tenant_id"]))
		}
		if scope.OrgID == "" {
			scope.OrgID = strings.TrimSpace(anyToString(data["org_id"]))
		}
	}
	return scope
}

func addRecordLocales(set map[string]struct{}, locales []string) {
	for _, locale := range locales {
		normalized := strings.TrimSpace(strings.ToLower(locale))
		if normalized != "" {
			set[normalized] = struct{}{}
		}
	}
}

func cloneRequiredFieldsString(input map[string][]string) map[string][]string {
	if len(input) == 0 {
		return nil
	}
	out := make(map[string][]string, len(input))
	for locale, fields := range input {
		out[locale] = append([]string{}, fields...)
	}
	return out
}

package admin

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	neturl "net/url"
	"sort"
	"strings"
	"sync"
	"time"

	router "github.com/goliatone/go-router"

	translationcore "github.com/goliatone/go-admin/translations/core"
	translationservices "github.com/goliatone/go-admin/translations/services"
)

type translationFamilyRuntime struct {
	service *translationservices.FamilyService
	report  translationservices.BackfillReport
}

type translationFamilyCreateVariantInput struct {
	Locale               string
	AutoCreateAssignment bool
	AssigneeID           string
	Priority             Priority
	DueDate              *time.Time
	Environment          string
	IdempotencyKey       string
}

type translationFamilyCreateVariantAssignmentPlan struct {
	ReuseAssignment    *TranslationAssignment
	ArchiveAssignments []TranslationAssignment
	WorkScope          string
}

type translationFamilyCreateVariantOutcome struct {
	Assignment            *TranslationAssignment
	AssignmentReused      bool
	ArchivedAssignmentIDs []string
}

type translationFamilyIdempotencyRecord struct {
	RequestHash string
	Payload     map[string]any
	CreatedAt   time.Time
}

type translationFamilyBinding struct {
	admin          *Admin
	loadRuntime    func(context.Context, string) (*translationFamilyRuntime, error)
	now            func() time.Time
	idempotencyMu  sync.Mutex
	idempotencyMap map[string]translationFamilyIdempotencyRecord
}

func newTranslationFamilyBinding(a *Admin) *translationFamilyBinding {
	if a == nil {
		return nil
	}
	return &translationFamilyBinding{
		admin:          a,
		now:            func() time.Time { return time.Now().UTC() },
		idempotencyMap: map[string]translationFamilyIdempotencyRecord{},
	}
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
		"data": map[string]any{
			"items":    items,
			"families": items,
		},
		"meta": map[string]any{
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
	return map[string]any{
		"data": translationFamilyDetailPayload(family, environment),
		"meta": map[string]any{
			"environment": environment,
		},
	}, nil
}

func (b *translationFamilyBinding) Create(c router.Context, id string) (payload any, err error) {
	startedAt := time.Now()
	obsCtx := c.Context()
	defer func() {
		recordTranslationAPIOperation(obsCtx, translationAPIObservation{
			Operation: "translations.families.variants.create",
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
		return nil, serviceNotConfiguredDomainError("translation family binding", map[string]any{"component": "translation_family_binding"})
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	obsCtx = adminCtx.Context
	setTranslationTraceHeaders(c, obsCtx)
	if err := b.admin.requirePermission(adminCtx, PermAdminTranslationsEdit, "translations"); err != nil {
		return nil, err
	}

	body, err := parseOptionalJSONMap(c.Body())
	if err != nil {
		return nil, err
	}
	if err := rejectTranslationClientIdentityFields(body); err != nil {
		return nil, err
	}

	environment := strings.TrimSpace(firstNonEmpty(toString(body["environment"]), c.Query("environment"), adminCtx.Channel))
	input, err := parseTranslationFamilyCreateVariantInput(c, body, environment)
	if err != nil {
		return nil, err
	}
	recordTranslationCreateLocaleMetric(adminCtx.Context, translationCreateLocaleEvent{
		ContentType: familyContentTypeHint(body),
		FamilyID:    strings.TrimSpace(id),
		Locale:      input.Locale,
		Environment: input.Environment,
		Outcome:     "attempt",
	})
	if cached, hitErr := b.lookupCreateVariantIdempotency(adminCtx, strings.TrimSpace(id), input); hitErr != nil {
		return nil, hitErr
	} else if cached != nil {
		return cached, nil
	}

	runtime, err := b.runtime(adminCtx.Context, input.Environment)
	if err != nil {
		return nil, err
	}
	scope := translationservices.Scope{
		TenantID: translationIdentityFromAdminContext(adminCtx).TenantID,
		OrgID:    translationIdentityFromAdminContext(adminCtx).OrgID,
	}
	familyBefore, ok, err := runtime.service.Detail(adminCtx.Context, translationservices.GetFamilyInput{
		Scope:       scope,
		Environment: input.Environment,
		FamilyID:    strings.TrimSpace(id),
	})
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, notFoundDomainError("translation family not found", map[string]any{"family_id": strings.TrimSpace(id)})
	}
	if translationFamilyPolicyDenied(familyBefore) {
		recordTranslationCreateLocaleMetric(adminCtx.Context, translationCreateLocaleEvent{
			ContentType: familyBefore.ContentType,
			FamilyID:    familyBefore.ID,
			Locale:      input.Locale,
			Environment: input.Environment,
			Outcome:     "policy_denied",
		})
		return nil, NewDomainError(string(translationcore.ErrorPolicyBlocked), "translation family is blocked by policy", map[string]any{
			"family_id":        familyBefore.ID,
			"content_type":     familyBefore.ContentType,
			"environment":      input.Environment,
			"requested_locale": input.Locale,
		})
	}
	if translationFamilyHasLocale(familyBefore, input.Locale) {
		if replayed, replayedOK, replayErr := b.lookupCreateVariantReplay(adminCtx, scope, familyBefore, input); replayErr != nil {
			return nil, replayErr
		} else if replayedOK {
			if storeErr := b.storeCreateVariantIdempotency(adminCtx, familyBefore.ID, input, replayed); storeErr != nil {
				return nil, storeErr
			}
			return replayed, nil
		}
		source := translationFamilySourceVariant(familyBefore)
		recordTranslationCreateLocaleMetric(adminCtx.Context, translationCreateLocaleEvent{
			ContentType: familyBefore.ContentType,
			FamilyID:    familyBefore.ID,
			Locale:      input.Locale,
			Environment: input.Environment,
			Outcome:     "duplicate",
		})
		return nil, TranslationAlreadyExistsError{
			Panel:              familyBefore.ContentType,
			EntityID:           strings.TrimSpace(source.SourceRecordID),
			SourceLocale:       familyBefore.SourceLocale,
			Locale:             input.Locale,
			TranslationGroupID: familyBefore.ID,
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
		if input.IdempotencyKey != "" && isTranslationVariantAlreadyExists(err) {
			replayed, replayedOK, replayErr := b.lookupCreateVariantReplayFromStore(adminCtx, scope, familyBefore.ID, input)
			if replayErr == nil && replayedOK {
				if storeErr := b.storeCreateVariantIdempotency(adminCtx, familyBefore.ID, input, replayed); storeErr != nil {
					return nil, storeErr
				}
				return replayed, nil
			}
		}
		if isTranslationVariantAlreadyExists(err) {
			recordTranslationCreateLocaleMetric(adminCtx.Context, translationCreateLocaleEvent{
				ContentType: familyBefore.ContentType,
				FamilyID:    familyBefore.ID,
				Locale:      input.Locale,
				Environment: input.Environment,
				Outcome:     "duplicate",
				Err:         err,
			})
		}
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

	payloadMap, familyAfter, err := b.rebuildCreateVariantPayloadWithFamily(adminCtx.Context, scope, familyBefore.ID, input)
	if err != nil {
		return nil, err
	}
	translationFamilyAttachCreateVariantNavigation(payloadMap, createdVariant, b.admin.config.BasePath)
	if outcome.Assignment != nil {
		data, _ := payloadMap["data"].(map[string]any)
		if data == nil {
			data = map[string]any{}
			payloadMap["data"] = data
		}
		data["assignment"] = translationCreateVariantAssignmentPayload(*outcome.Assignment)
		meta, _ := payloadMap["meta"].(map[string]any)
		if meta == nil {
			meta = map[string]any{}
			payloadMap["meta"] = meta
		}
		meta["assignment_reused"] = outcome.AssignmentReused
		if len(outcome.ArchivedAssignmentIDs) > 0 {
			meta["archived_assignment_ids"] = append([]string{}, outcome.ArchivedAssignmentIDs...)
		}
	}

	if input.IdempotencyKey != "" {
		if err := b.storeCreateVariantIdempotency(adminCtx, familyBefore.ID, input, payloadMap); err != nil {
			return nil, err
		}
	}
	recordTranslationCreateLocaleMetric(adminCtx.Context, translationCreateLocaleEvent{
		ContentType: familyAfter.ContentType,
		FamilyID:    familyAfter.ID,
		Locale:      input.Locale,
		Environment: input.Environment,
		Outcome:     "success",
	})
	b.recordCreateVariantActivity(adminCtx.Context, translationIdentityFromAdminContext(adminCtx).ActorID, familyBefore, familyAfter, input, outcome)
	return payloadMap, nil
}

func familyContentTypeHint(body map[string]any) string {
	return normalizePolicyEntityKey(firstNonEmpty(
		toString(body["content_type"]),
		toString(body["contentType"]),
		toString(body["panel"]),
	))
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

const (
	translationFamilyCreateVariantIdempotencyTTL         = 24 * time.Hour
	translationFamilyCreateVariantMetadataKey            = "translation_create_locale"
	translationFamilyCreateVariantMetadataActorIDKey     = "actor_id"
	translationFamilyCreateVariantMetadataRequestHashKey = "request_hash"
	translationFamilyCreateVariantMetadataKeyIDKey       = "idempotency_key"
	translationFamilyCreateVariantMetadataCreatedAtKey   = "created_at"
)

func parseTranslationFamilyCreateVariantInput(c router.Context, body map[string]any, environment string) (translationFamilyCreateVariantInput, error) {
	input := translationFamilyCreateVariantInput{
		Locale:               normalizeCreateTranslationLocale(toString(body["locale"])),
		AutoCreateAssignment: toBool(body["auto_create_assignment"]),
		AssigneeID:           strings.TrimSpace(toString(body["assignee_id"])),
		Priority:             Priority(strings.TrimSpace(strings.ToLower(toString(body["priority"])))),
		Environment:          strings.TrimSpace(environment),
		IdempotencyKey: strings.TrimSpace(firstNonEmpty(
			toString(body["idempotency_key"]),
			c.Header("X-Idempotency-Key"),
			c.Header("Idempotency-Key"),
		)),
	}
	if input.Locale == "" {
		return translationFamilyCreateVariantInput{}, validationDomainError("translation locale required", map[string]any{"field": "locale"})
	}
	if input.Priority != "" && !input.Priority.IsValid() {
		return translationFamilyCreateVariantInput{}, validationDomainError("invalid priority", map[string]any{"field": "priority"})
	}
	if rawDueDate := strings.TrimSpace(toString(body["due_date"])); rawDueDate != "" {
		dueDate, err := time.Parse(time.RFC3339, rawDueDate)
		if err != nil {
			return translationFamilyCreateVariantInput{}, validationDomainError("invalid due_date", map[string]any{"field": "due_date"})
		}
		dueDate = dueDate.UTC()
		input.DueDate = &dueDate
	}
	if !input.AutoCreateAssignment && (input.AssigneeID != "" || input.Priority != "" || input.DueDate != nil) {
		return translationFamilyCreateVariantInput{}, validationDomainError("assignment fields require auto_create_assignment=true", map[string]any{
			"field": "auto_create_assignment",
		})
	}
	return input, nil
}

func translationFamilyPolicyDenied(family translationservices.FamilyRecord) bool {
	for _, blocker := range family.Blockers {
		if strings.EqualFold(strings.TrimSpace(blocker.BlockerCode), string(translationcore.FamilyBlockerPolicyDenied)) {
			return true
		}
	}
	return false
}

func translationFamilyHasLocale(family translationservices.FamilyRecord, locale string) bool {
	locale = strings.TrimSpace(strings.ToLower(locale))
	for _, variant := range family.Variants {
		if strings.EqualFold(strings.TrimSpace(variant.Locale), locale) {
			return true
		}
	}
	return false
}

func (b *translationFamilyBinding) createFamilyVariant(ctx context.Context, actorID string, family translationservices.FamilyRecord, input translationFamilyCreateVariantInput) (*CMSContent, error) {
	if b == nil || b.admin == nil || b.admin.contentSvc == nil {
		return nil, serviceNotConfiguredDomainError("content service", map[string]any{"component": "translation_family_binding"})
	}
	creator, ok := b.admin.contentSvc.(CMSContentTranslationCreator)
	if !ok || creator == nil {
		return nil, serviceNotConfiguredDomainError("content translation creator", map[string]any{"component": "translation_family_binding"})
	}
	source := translationFamilySourceVariant(family)
	if strings.TrimSpace(source.SourceRecordID) == "" {
		return nil, validationDomainError("family source variant missing source_record_id", map[string]any{
			"family_id": family.ID,
		})
	}
	metadata, err := b.createVariantMetadata(actorID, family.ID, input)
	if err != nil {
		return nil, err
	}
	created, err := creator.CreateTranslation(ctx, normalizeTranslationCreateInput(TranslationCreateInput{
		SourceID:     strings.TrimSpace(source.SourceRecordID),
		Locale:       input.Locale,
		Environment:  input.Environment,
		PolicyEntity: family.ContentType,
		ContentType:  family.ContentType,
		Metadata:     metadata,
		Status:       string(translationcore.VariantStatusDraft),
	}))
	if err != nil {
		return nil, err
	}
	return created, nil
}

func (b *translationFamilyBinding) planCreateVariantAssignment(ctx context.Context, family translationservices.FamilyRecord, input translationFamilyCreateVariantInput) (translationFamilyCreateVariantAssignmentPlan, error) {
	repo, err := (&translationQueueBinding{admin: b.admin}).assignmentRepository()
	if err != nil {
		return translationFamilyCreateVariantAssignmentPlan{}, err
	}
	assignments, _, err := repo.List(ctx, ListOptions{
		Page:    1,
		PerPage: 200,
		SortBy:  "updated_at",
		Filters: map[string]any{
			"translation_group_id": family.ID,
			"target_locale":        input.Locale,
			"work_scope":           translationFamilyDefaultWorkScope(family),
		},
	})
	if err != nil {
		return translationFamilyCreateVariantAssignmentPlan{}, err
	}

	plan := translationFamilyCreateVariantAssignmentPlan{
		WorkScope: translationFamilyDefaultWorkScope(family),
	}
	active := []TranslationAssignment{}
	approved := []TranslationAssignment{}
	for _, assignment := range assignments {
		switch {
		case assignment.Status.IsActive():
			active = append(active, assignment)
		case assignment.Status == AssignmentStatusApproved:
			approved = append(approved, assignment)
		}
	}
	sort.SliceStable(active, func(i, j int) bool {
		if active[i].UpdatedAt.Equal(active[j].UpdatedAt) {
			return active[i].ID < active[j].ID
		}
		return active[i].UpdatedAt.After(active[j].UpdatedAt)
	})
	sort.SliceStable(approved, func(i, j int) bool {
		if approved[i].UpdatedAt.Equal(approved[j].UpdatedAt) {
			return approved[i].ID < approved[j].ID
		}
		return approved[i].UpdatedAt.After(approved[j].UpdatedAt)
	})
	if len(active) > 0 {
		current := active[0]
		plan.ReuseAssignment = &current
		return plan, nil
	}

	switch strings.TrimSpace(strings.ToLower(family.Policy.AssignmentLifecycleMode)) {
	case string(translationcore.AssignmentLifecycleManualArchive):
		if len(approved) > 0 {
			return translationFamilyCreateVariantAssignmentPlan{}, NewDomainError(string(translationcore.ErrorPolicyBlocked), "assignment lifecycle requires approved assignments to be archived before creating a replacement", map[string]any{
				"family_id":               family.ID,
				"target_locale":           input.Locale,
				"assignment_lifecycle":    family.Policy.AssignmentLifecycleMode,
				"existing_assignment_ids": assignmentIDs(approved),
			})
		}
	case "", string(translationcore.AssignmentLifecycleAutoArchive):
		plan.ArchiveAssignments = append([]TranslationAssignment{}, approved...)
	case string(translationcore.AssignmentLifecycleSingleActivePerLang):
		// No approved assignment guard is needed in single-active mode; active dedupe was handled above.
	default:
		plan.ArchiveAssignments = append([]TranslationAssignment{}, approved...)
	}
	return plan, nil
}

func (b *translationFamilyBinding) applyCreateVariantAssignmentPlan(ctx context.Context, family translationservices.FamilyRecord, input translationFamilyCreateVariantInput, plan translationFamilyCreateVariantAssignmentPlan) (translationFamilyCreateVariantOutcome, error) {
	repo, err := (&translationQueueBinding{admin: b.admin}).assignmentRepository()
	if err != nil {
		return translationFamilyCreateVariantOutcome{}, err
	}
	outcome := translationFamilyCreateVariantOutcome{}
	type archivedAssignmentSnapshot struct {
		original TranslationAssignment
		current  TranslationAssignment
	}
	archivedSnapshots := make([]archivedAssignmentSnapshot, 0, len(plan.ArchiveAssignments))
	rollbackArchivedAssignments := func(cause error) error {
		var rollbackErr error
		for i := len(archivedSnapshots) - 1; i >= 0; i-- {
			snapshot := archivedSnapshots[i]
			if _, err := repo.Update(ctx, snapshot.original, snapshot.current.Version); err != nil {
				rollbackErr = errors.Join(rollbackErr, err)
			}
		}
		if rollbackErr != nil {
			return errors.Join(cause, rollbackErr)
		}
		return cause
	}
	for _, assignment := range plan.ArchiveAssignments {
		original := cloneTranslationAssignment(assignment)
		archived := assignment
		archived.Status = AssignmentStatusArchived
		now := b.now()
		archived.ArchivedAt = &now
		updated, err := repo.Update(ctx, archived, assignment.Version)
		if err != nil {
			return translationFamilyCreateVariantOutcome{}, err
		}
		archivedSnapshots = append(archivedSnapshots, archivedAssignmentSnapshot{
			original: original,
			current:  updated,
		})
		outcome.ArchivedAssignmentIDs = append(outcome.ArchivedAssignmentIDs, strings.TrimSpace(updated.ID))
	}
	if plan.ReuseAssignment != nil {
		reused := cloneTranslationAssignment(*plan.ReuseAssignment)
		reused.WorkScope = plan.WorkScope
		if input.AssigneeID != "" && reused.AssigneeID == "" {
			reused.AssigneeID = input.AssigneeID
			reused.AssignmentType = AssignmentTypeDirect
			reused.Status = AssignmentStatusAssigned
		}
		if input.Priority.IsValid() && input.Priority != reused.Priority {
			reused.Priority = input.Priority
		}
		if input.DueDate != nil {
			reused.DueDate = cloneTimePtr(input.DueDate)
		}
		if reused.Version != plan.ReuseAssignment.Version ||
			reused.AssigneeID != plan.ReuseAssignment.AssigneeID ||
			reused.Priority != plan.ReuseAssignment.Priority ||
			reused.WorkScope != plan.ReuseAssignment.WorkScope ||
			!timesEqual(reused.DueDate, plan.ReuseAssignment.DueDate) {
			updated, err := repo.Update(ctx, reused, plan.ReuseAssignment.Version)
			if err != nil {
				return translationFamilyCreateVariantOutcome{}, rollbackArchivedAssignments(err)
			}
			reused = updated
		}
		outcome.Assignment = &reused
		outcome.AssignmentReused = true
		return outcome, nil
	}

	source := translationFamilySourceVariant(family)
	assignment := TranslationAssignment{
		TranslationGroupID: family.ID,
		EntityType:         family.ContentType,
		SourceRecordID:     strings.TrimSpace(source.SourceRecordID),
		SourceLocale:       strings.TrimSpace(strings.ToLower(family.SourceLocale)),
		TargetLocale:       input.Locale,
		SourceTitle:        strings.TrimSpace(source.Fields["title"]),
		SourcePath:         strings.TrimSpace(source.Fields["path"]),
		Priority:           Priority(firstNonEmpty(string(input.Priority), string(PriorityNormal))),
		WorkScope:          plan.WorkScope,
		DueDate:            cloneTimePtr(input.DueDate),
	}
	if input.AssigneeID != "" {
		assignment.AssignmentType = AssignmentTypeDirect
		assignment.Status = AssignmentStatusAssigned
		assignment.AssigneeID = input.AssigneeID
		assignment.AssignerID = actorFromContext(ctx)
	} else {
		assignment.AssignmentType = AssignmentTypeOpenPool
		assignment.Status = AssignmentStatusPending
	}
	created, inserted, err := repo.CreateOrReuseActive(ctx, assignment)
	if err != nil {
		return translationFamilyCreateVariantOutcome{}, rollbackArchivedAssignments(err)
	}
	outcome.Assignment = &created
	outcome.AssignmentReused = !inserted
	return outcome, nil
}

func translationCreateVariantAssignmentPayload(assignment TranslationAssignment) map[string]any {
	return map[string]any{
		"assignment_id": strings.TrimSpace(assignment.ID),
		"status":        translationFamilyAssignmentStatus(assignment.Status),
		"target_locale": strings.TrimSpace(strings.ToLower(assignment.TargetLocale)),
		"work_scope":    normalizeTranslationAssignmentWorkScope(assignment.WorkScope),
		"assignee_id":   strings.TrimSpace(assignment.AssigneeID),
		"priority":      strings.TrimSpace(strings.ToLower(string(assignment.Priority))),
		"due_date":      cloneTimePtr(assignment.DueDate),
	}
}

func (b *translationFamilyBinding) rebuildCreateVariantPayload(ctx context.Context, scope translationservices.Scope, familyID string, input translationFamilyCreateVariantInput) (map[string]any, error) {
	payload, _, err := b.rebuildCreateVariantPayloadWithFamily(ctx, scope, familyID, input)
	return payload, err
}

func (b *translationFamilyBinding) rebuildCreateVariantPayloadWithFamily(ctx context.Context, scope translationservices.Scope, familyID string, input translationFamilyCreateVariantInput) (map[string]any, translationservices.FamilyRecord, error) {
	runtime, err := b.runtime(ctx, input.Environment)
	if err != nil {
		return nil, translationservices.FamilyRecord{}, err
	}
	family, ok, err := runtime.service.Detail(ctx, translationservices.GetFamilyInput{
		Scope:       scope,
		Environment: input.Environment,
		FamilyID:    familyID,
	})
	if err != nil {
		return nil, translationservices.FamilyRecord{}, err
	}
	if !ok {
		return nil, translationservices.FamilyRecord{}, notFoundDomainError("translation family not found", map[string]any{"family_id": familyID})
	}
	variant, ok := translationFamilyVariantByLocale(family, input.Locale)
	if !ok {
		return nil, translationservices.FamilyRecord{}, notFoundDomainError("translation variant not found after creation", map[string]any{
			"family_id": familyID,
			"locale":    input.Locale,
		})
	}
	return map[string]any{
		"data": map[string]any{
			"variant_id":   strings.TrimSpace(variant.ID),
			"family_id":    strings.TrimSpace(family.ID),
			"locale":       strings.TrimSpace(strings.ToLower(variant.Locale)),
			"status":       strings.TrimSpace(strings.ToLower(variant.Status)),
			"record_id":    strings.TrimSpace(variant.SourceRecordID),
			"content_type": strings.TrimSpace(family.ContentType),
			"navigation": translationCreateVariantNavigationPayloadForRecord(
				strings.TrimSpace(family.ContentType),
				strings.TrimSpace(variant.SourceRecordID),
				strings.TrimSpace(strings.ToLower(variant.Locale)),
				b.admin.config.BasePath,
			),
		},
		"meta": map[string]any{
			"idempotency_hit": false,
			"family":          translationFamilyMutationSummaryPayload(family),
			"refresh": map[string]any{
				"family_detail":   true,
				"family_list":     true,
				"content_summary": true,
			},
		},
	}, family, nil
}

func translationFamilyDefaultWorkScope(family translationservices.FamilyRecord) string {
	return normalizeTranslationAssignmentWorkScope(family.Policy.DefaultWorkScope)
}

func translationFamilyVariantByLocale(family translationservices.FamilyRecord, locale string) (translationservices.FamilyVariant, bool) {
	locale = strings.TrimSpace(strings.ToLower(locale))
	for _, variant := range family.Variants {
		if strings.EqualFold(strings.TrimSpace(variant.Locale), locale) {
			return variant, true
		}
	}
	return translationservices.FamilyVariant{}, false
}

func translationFamilyMutationSummaryPayload(family translationservices.FamilyRecord) map[string]any {
	quickCreate := translationFamilyQuickCreatePayload(family)
	return map[string]any{
		"family_id":                     family.ID,
		"readiness_state":               family.ReadinessState,
		"missing_required_locale_count": family.MissingRequiredLocaleCount,
		"pending_review_count":          family.PendingReviewCount,
		"outdated_locale_count":         family.OutdatedLocaleCount,
		"blocker_codes":                 append([]string{}, family.BlockerCodes...),
		"missing_locales":               translationFamilyMissingLocales(family),
		"available_locales":             translationFamilyAvailableLocales(family),
		"quick_create":                  translationReadinessQuickCreatePayloadMap(quickCreate),
	}
}

func (b *translationFamilyBinding) lookupCreateVariantIdempotency(adminCtx AdminContext, familyID string, input translationFamilyCreateVariantInput) (map[string]any, error) {
	if b == nil || strings.TrimSpace(input.IdempotencyKey) == "" {
		return nil, nil
	}
	recordKey := b.createVariantIdempotencyStoreKey(translationIdentityFromAdminContext(adminCtx).ActorID, familyID, input.IdempotencyKey)
	requestHash, err := translationFamilyCreateVariantRequestHash(familyID, input)
	if err != nil {
		return nil, err
	}
	now := b.now()
	b.idempotencyMu.Lock()
	defer b.idempotencyMu.Unlock()
	record, ok := b.idempotencyMap[recordKey]
	if !ok {
		return nil, nil
	}
	if now.Sub(record.CreatedAt) > translationFamilyCreateVariantIdempotencyTTL {
		delete(b.idempotencyMap, recordKey)
		return nil, nil
	}
	if record.RequestHash != requestHash {
		return nil, NewDomainError(string(translationcore.ErrorVersionConflict), "idempotency key was already used with a different create-locale payload", map[string]any{
			"family_id":        familyID,
			"idempotency_key":  input.IdempotencyKey,
			"expected_request": record.RequestHash,
			"actual_request":   requestHash,
		})
	}
	out := cloneAnyMap(record.Payload)
	meta, _ := out["meta"].(map[string]any)
	if meta == nil {
		meta = map[string]any{}
		out["meta"] = meta
	}
	meta["idempotency_hit"] = true
	return out, nil
}

func (b *translationFamilyBinding) storeCreateVariantIdempotency(adminCtx AdminContext, familyID string, input translationFamilyCreateVariantInput, payload map[string]any) error {
	if b == nil || strings.TrimSpace(input.IdempotencyKey) == "" {
		return nil
	}
	requestHash, err := translationFamilyCreateVariantRequestHash(familyID, input)
	if err != nil {
		return err
	}
	recordKey := b.createVariantIdempotencyStoreKey(translationIdentityFromAdminContext(adminCtx).ActorID, familyID, input.IdempotencyKey)
	b.idempotencyMu.Lock()
	defer b.idempotencyMu.Unlock()
	b.idempotencyMap[recordKey] = translationFamilyIdempotencyRecord{
		RequestHash: requestHash,
		Payload:     cloneAnyMap(payload),
		CreatedAt:   b.now(),
	}
	return nil
}

func (b *translationFamilyBinding) lookupCreateVariantReplay(adminCtx AdminContext, scope translationservices.Scope, family translationservices.FamilyRecord, input translationFamilyCreateVariantInput) (map[string]any, bool, error) {
	if strings.TrimSpace(input.IdempotencyKey) == "" {
		return nil, false, nil
	}
	variant, ok := translationFamilyVariantByLocale(family, input.Locale)
	if !ok {
		return nil, false, nil
	}
	matched, err := b.variantMatchesCreateVariantReplay(translationIdentityFromAdminContext(adminCtx).ActorID, family.ID, variant, input)
	if err != nil || !matched {
		return nil, false, err
	}
	payload, _, err := b.rebuildCreateVariantPayloadWithFamily(adminCtx.Context, scope, family.ID, input)
	if err != nil {
		return nil, false, err
	}
	data, _ := payload["data"].(map[string]any)
	if input.AutoCreateAssignment && data != nil && data["assignment"] == nil {
		if assignment, ok := translationFamilyReplayAssignment(family, input.Locale, translationFamilyDefaultWorkScope(family)); ok {
			data["assignment"] = translationCreateVariantAssignmentPayload(assignment)
		}
	}
	meta, _ := payload["meta"].(map[string]any)
	if meta == nil {
		meta = map[string]any{}
		payload["meta"] = meta
	}
	meta["idempotency_hit"] = true
	return payload, true, nil
}

func (b *translationFamilyBinding) lookupCreateVariantReplayFromStore(adminCtx AdminContext, scope translationservices.Scope, familyID string, input translationFamilyCreateVariantInput) (map[string]any, bool, error) {
	runtime, err := b.runtime(adminCtx.Context, input.Environment)
	if err != nil {
		return nil, false, err
	}
	family, ok, err := runtime.service.Detail(adminCtx.Context, translationservices.GetFamilyInput{
		Scope:       scope,
		Environment: input.Environment,
		FamilyID:    familyID,
	})
	if err != nil || !ok {
		return nil, false, err
	}
	return b.lookupCreateVariantReplay(adminCtx, scope, family, input)
}

func (b *translationFamilyBinding) createVariantIdempotencyStoreKey(actorID, familyID, idempotencyKey string) string {
	return strings.Join([]string{
		strings.TrimSpace(actorID),
		strings.TrimSpace(familyID),
		strings.TrimSpace(idempotencyKey),
	}, "|")
}

func translationFamilyCreateVariantRequestHash(familyID string, input translationFamilyCreateVariantInput) (string, error) {
	payload := map[string]any{
		"family_id":              strings.TrimSpace(familyID),
		"locale":                 strings.TrimSpace(strings.ToLower(input.Locale)),
		"auto_create_assignment": input.AutoCreateAssignment,
		"assignee_id":            strings.TrimSpace(input.AssigneeID),
		"priority":               strings.TrimSpace(strings.ToLower(string(input.Priority))),
		"environment":            strings.TrimSpace(input.Environment),
	}
	if input.DueDate != nil {
		payload["due_date"] = input.DueDate.UTC().Format(time.RFC3339)
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:]), nil
}

func translationFamilyAttachCreateVariantNavigation(payload map[string]any, created *CMSContent, basePath string) {
	if len(payload) == 0 || created == nil {
		return
	}
	data, _ := payload["data"].(map[string]any)
	if data == nil {
		data = map[string]any{}
		payload["data"] = data
	}
	if recordID := strings.TrimSpace(created.ID); recordID != "" {
		data["record_id"] = recordID
	}
	contentType := strings.TrimSpace(firstNonEmpty(created.ContentTypeSlug, created.ContentType))
	if contentType != "" {
		data["content_type"] = contentType
	}
	navigation := translationCreateVariantNavigationPayload(created, basePath)
	if len(navigation) > 0 {
		data["navigation"] = navigation
	}
}

func translationCreateVariantNavigationPayload(created *CMSContent, basePath string) map[string]any {
	if created == nil {
		return nil
	}
	recordID := strings.TrimSpace(created.ID)
	contentType := strings.TrimSpace(firstNonEmpty(created.ContentTypeSlug, created.ContentType))
	targetLocale := strings.TrimSpace(created.Locale)
	return translationCreateVariantNavigationPayloadForRecord(contentType, recordID, targetLocale, basePath)
}

func translationCreateVariantNavigationPayloadForRecord(contentType, recordID, locale, basePath string) map[string]any {
	if recordID == "" || contentType == "" {
		return nil
	}
	base := strings.TrimRight(strings.TrimSpace(firstNonEmpty(basePath, "/admin")), "/")
	if base == "" {
		base = "/admin"
	}
	contentBase := base + "/content/" + neturl.PathEscape(contentType) + "/" + neturl.PathEscape(recordID)
	editURL := contentBase + "/edit"
	if locale != "" {
		query := neturl.Values{}
		query.Set("locale", locale)
		editURL += "?" + query.Encode()
	}
	return map[string]any{
		"content_detail_url": contentBase,
		"content_edit_url":   editURL,
	}
}

func isTranslationVariantAlreadyExists(err error) bool {
	var translationExists TranslationAlreadyExistsError
	return errors.As(err, &translationExists) || errors.Is(err, ErrTranslationAlreadyExists)
}

func assignmentIDs(assignments []TranslationAssignment) []string {
	out := make([]string, 0, len(assignments))
	for _, assignment := range assignments {
		if id := strings.TrimSpace(assignment.ID); id != "" {
			out = append(out, id)
		}
	}
	return out
}

func timesEqual(left, right *time.Time) bool {
	if left == nil && right == nil {
		return true
	}
	if left == nil || right == nil {
		return false
	}
	return left.UTC().Equal(right.UTC())
}

func (b *translationFamilyBinding) createVariantMetadata(actorID, familyID string, input translationFamilyCreateVariantInput) (map[string]any, error) {
	if strings.TrimSpace(input.IdempotencyKey) == "" {
		return nil, nil
	}
	requestHash, err := translationFamilyCreateVariantRequestHash(familyID, input)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		translationFamilyCreateVariantMetadataKey: map[string]any{
			translationFamilyCreateVariantMetadataActorIDKey:     strings.TrimSpace(actorID),
			translationFamilyCreateVariantMetadataRequestHashKey: requestHash,
			translationFamilyCreateVariantMetadataKeyIDKey:       strings.TrimSpace(input.IdempotencyKey),
			translationFamilyCreateVariantMetadataCreatedAtKey:   b.now().UTC().Format(time.RFC3339),
		},
	}, nil
}

func (b *translationFamilyBinding) variantMatchesCreateVariantReplay(actorID, familyID string, variant translationservices.FamilyVariant, input translationFamilyCreateVariantInput) (bool, error) {
	if strings.TrimSpace(input.IdempotencyKey) == "" {
		return false, nil
	}
	replay := extractMap(variant.Metadata[translationFamilyCreateVariantMetadataKey])
	if len(replay) == 0 {
		return false, nil
	}
	if strings.TrimSpace(toString(replay[translationFamilyCreateVariantMetadataActorIDKey])) != strings.TrimSpace(actorID) {
		return false, nil
	}
	if strings.TrimSpace(toString(replay[translationFamilyCreateVariantMetadataKeyIDKey])) != strings.TrimSpace(input.IdempotencyKey) {
		return false, nil
	}
	createdAt, err := time.Parse(time.RFC3339, strings.TrimSpace(toString(replay[translationFamilyCreateVariantMetadataCreatedAtKey])))
	if err != nil || b.now().Sub(createdAt.UTC()) > translationFamilyCreateVariantIdempotencyTTL {
		return false, nil
	}
	requestHash, err := translationFamilyCreateVariantRequestHash(familyID, input)
	if err != nil {
		return false, err
	}
	recordHash := strings.TrimSpace(toString(replay[translationFamilyCreateVariantMetadataRequestHashKey]))
	if recordHash == requestHash {
		return true, nil
	}
	return false, NewDomainError(string(translationcore.ErrorVersionConflict), "idempotency key was already used with a different create-locale payload", map[string]any{
		"family_id":        familyID,
		"idempotency_key":  input.IdempotencyKey,
		"expected_request": recordHash,
		"actual_request":   requestHash,
	})
}

func translationFamilyReplayAssignment(family translationservices.FamilyRecord, locale, workScope string) (TranslationAssignment, bool) {
	type candidate struct {
		rank       int
		assignment TranslationAssignment
	}
	candidates := make([]candidate, 0, len(family.Assignments))
	for _, item := range family.Assignments {
		if !strings.EqualFold(strings.TrimSpace(item.TargetLocale), locale) {
			continue
		}
		if normalizeTranslationAssignmentWorkScope(item.WorkScope) != normalizeTranslationAssignmentWorkScope(workScope) {
			continue
		}
		rank := 2
		switch strings.TrimSpace(strings.ToLower(item.Status)) {
		case string(translationcore.AssignmentStatusOpen), string(translationcore.AssignmentStatusAssigned), string(translationcore.AssignmentStatusInProgress), string(translationcore.AssignmentStatusInReview), string(translationcore.AssignmentStatusChangesRequested):
			rank = 0
		case string(translationcore.AssignmentStatusApproved):
			rank = 1
		}
		candidates = append(candidates, candidate{
			rank: rank,
			assignment: TranslationAssignment{
				ID:                 strings.TrimSpace(item.ID),
				TranslationGroupID: strings.TrimSpace(item.FamilyID),
				SourceLocale:       strings.TrimSpace(strings.ToLower(item.SourceLocale)),
				TargetLocale:       strings.TrimSpace(strings.ToLower(item.TargetLocale)),
				WorkScope:          normalizeTranslationAssignmentWorkScope(item.WorkScope),
				Status:             AssignmentStatus(strings.TrimSpace(strings.ToLower(item.Status))),
				AssigneeID:         strings.TrimSpace(item.AssigneeID),
				Priority:           Priority(strings.TrimSpace(strings.ToLower(item.Priority))),
				DueDate:            cloneTimePtr(item.DueDate),
				CreatedAt:          item.CreatedAt,
				UpdatedAt:          item.UpdatedAt,
			},
		})
	}
	if len(candidates) == 0 {
		return TranslationAssignment{}, false
	}
	sort.SliceStable(candidates, func(i, j int) bool {
		if candidates[i].rank != candidates[j].rank {
			return candidates[i].rank < candidates[j].rank
		}
		if candidates[i].assignment.UpdatedAt.Equal(candidates[j].assignment.UpdatedAt) {
			return candidates[i].assignment.ID < candidates[j].assignment.ID
		}
		return candidates[i].assignment.UpdatedAt.After(candidates[j].assignment.UpdatedAt)
	})
	return candidates[0].assignment, true
}

func (b *translationFamilyBinding) deleteFamilyVariant(ctx context.Context, created *CMSContent) error {
	if b == nil || b.admin == nil || b.admin.contentSvc == nil || created == nil {
		return nil
	}
	recordID := strings.TrimSpace(created.ID)
	contentType := strings.TrimSpace(strings.ToLower(firstNonEmpty(created.ContentTypeSlug, created.ContentType)))
	if recordID == "" || contentType == "" {
		return nil
	}
	if contentType == "pages" {
		return b.admin.contentSvc.DeletePage(ctx, recordID)
	}
	return b.admin.contentSvc.DeleteContent(ctx, recordID)
}

func (b *translationFamilyBinding) recordCreateVariantActivity(ctx context.Context, actorID string, familyBefore, familyAfter translationservices.FamilyRecord, input translationFamilyCreateVariantInput, outcome translationFamilyCreateVariantOutcome) {
	if b == nil || b.admin == nil || b.admin.activity == nil {
		return
	}
	variant, ok := translationFamilyVariantByLocale(familyAfter, input.Locale)
	if ok {
		_ = b.admin.activity.Record(ctx, ActivityEntry{
			Actor:  strings.TrimSpace(actorID),
			Action: "translation.family.variant_created",
			Object: "translation_variant:" + strings.TrimSpace(variant.ID),
			Metadata: map[string]any{
				"family_id":         strings.TrimSpace(familyAfter.ID),
				"content_type":      strings.TrimSpace(familyAfter.ContentType),
				"source_locale":     strings.TrimSpace(strings.ToLower(familyAfter.SourceLocale)),
				"target_locale":     strings.TrimSpace(strings.ToLower(input.Locale)),
				"source_record_id":  strings.TrimSpace(variant.SourceRecordID),
				"assignment_seeded": outcome.Assignment != nil,
			},
		})
	}
	if !equalStringSlices(familyBefore.BlockerCodes, familyAfter.BlockerCodes) ||
		familyBefore.MissingRequiredLocaleCount != familyAfter.MissingRequiredLocaleCount ||
		familyBefore.PendingReviewCount != familyAfter.PendingReviewCount ||
		familyBefore.OutdatedLocaleCount != familyAfter.OutdatedLocaleCount {
		_ = b.admin.activity.Record(ctx, ActivityEntry{
			Actor:  strings.TrimSpace(actorID),
			Action: "translation.family.blockers_changed",
			Object: "translation_family:" + strings.TrimSpace(familyAfter.ID),
			Metadata: map[string]any{
				"family_id":                              strings.TrimSpace(familyAfter.ID),
				"previous_blocker_codes":                 append([]string{}, familyBefore.BlockerCodes...),
				"blocker_codes":                          append([]string{}, familyAfter.BlockerCodes...),
				"previous_missing_required_locale_count": familyBefore.MissingRequiredLocaleCount,
				"missing_required_locale_count":          familyAfter.MissingRequiredLocaleCount,
				"previous_pending_review_count":          familyBefore.PendingReviewCount,
				"pending_review_count":                   familyAfter.PendingReviewCount,
				"previous_outdated_locale_count":         familyBefore.OutdatedLocaleCount,
				"outdated_locale_count":                  familyAfter.OutdatedLocaleCount,
			},
		})
	}
	if outcome.Assignment != nil {
		_ = b.admin.activity.Record(ctx, ActivityEntry{
			Actor:  strings.TrimSpace(actorID),
			Action: "translation.family.assignment_seeded",
			Object: "translation_assignment:" + strings.TrimSpace(outcome.Assignment.ID),
			Metadata: map[string]any{
				"family_id":               strings.TrimSpace(familyAfter.ID),
				"assignment_id":           strings.TrimSpace(outcome.Assignment.ID),
				"target_locale":           strings.TrimSpace(strings.ToLower(outcome.Assignment.TargetLocale)),
				"work_scope":              normalizeTranslationAssignmentWorkScope(outcome.Assignment.WorkScope),
				"status":                  strings.TrimSpace(strings.ToLower(string(outcome.Assignment.Status))),
				"assignee_id":             strings.TrimSpace(outcome.Assignment.AssigneeID),
				"priority":                strings.TrimSpace(strings.ToLower(string(outcome.Assignment.Priority))),
				"assignment_reused":       outcome.AssignmentReused,
				"archived_assignment_ids": append([]string{}, outcome.ArchivedAssignmentIDs...),
			},
		})
	}
}

func equalStringSlices(left, right []string) bool {
	if len(left) != len(right) {
		return false
	}
	for i := range left {
		if strings.TrimSpace(left[i]) != strings.TrimSpace(right[i]) {
			return false
		}
	}
	return true
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
				Metadata:           cloneAnyMap(page.Metadata),
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
				Metadata:           cloneAnyMap(content.Metadata),
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
		DefaultWorkScope:        normalizeTranslationAssignmentWorkScope(req.DefaultWorkScope),
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
			ReviewerID:   strings.TrimSpace(firstNonEmpty(assignment.ReviewerID, assignment.LastReviewerID)),
			Priority:     strings.TrimSpace(strings.ToLower(string(assignment.Priority))),
			WorkScope:    normalizeTranslationAssignmentWorkScope(assignment.WorkScope),
			DueDate:      cloneTimePtr(assignment.DueDate),
			UpdatedAt:    assignment.UpdatedAt,
			CreatedAt:    assignment.CreatedAt,
		})
	}
	return out
}

func translationFamilyListRow(family translationservices.FamilyRecord) map[string]any {
	source := translationFamilySourceVariant(family)
	quickCreate := translationFamilyQuickCreatePayload(family)
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
		"quick_create":                  translationReadinessQuickCreatePayloadMap(quickCreate),
		"updated_at":                    family.UpdatedAt,
		"created_at":                    family.CreatedAt,
	}
}

func translationFamilyDetailPayload(family translationservices.FamilyRecord, environment string) map[string]any {
	source := translationFamilySourceVariant(family)
	variants := cloneFamilyVariantPayloads(family.Variants)
	blockers := cloneFamilyBlockerPayloads(family.Blockers)
	assignments := cloneFamilyAssignmentPayloads(family.Assignments)
	quickCreate := translationFamilyQuickCreatePayload(family)
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
		"readiness_summary":  translationFamilyReadinessSummaryPayload(family),
		"quick_create":       translationReadinessQuickCreatePayloadMap(quickCreate),
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
			"default_work_scope":        translationFamilyDefaultWorkScope(family),
		},
	}
}

func translationFamilyReadinessSummaryPayload(family translationservices.FamilyRecord) map[string]any {
	summary := translationFamilyMutationSummaryPayload(family)
	summary["state"] = family.ReadinessState
	summary["required_locales"] = append([]string{}, family.Policy.RequiredLocales...)
	summary["required_for_publish"] = append([]string{}, family.Policy.RequiredLocales...)
	summary["publish_ready"] = family.ReadinessState == string(translationcore.FamilyReadinessReady)
	return summary
}

func translationFamilyQuickCreatePayload(family translationservices.FamilyRecord) translationQuickCreatePayload {
	missingLocales := translationFamilyQuickCreateLocales(family)
	enabled, reasonCode, reason := translationFamilyQuickCreateAvailability(family, missingLocales)
	return translationQuickCreatePayload{
		Enabled:            enabled,
		MissingLocales:     append([]string{}, missingLocales...),
		RecommendedLocale:  translationFamilyQuickCreateRecommendedLocale(family, missingLocales),
		RequiredForPublish: append([]string{}, family.Policy.RequiredLocales...),
		DefaultAssignment: translationQuickCreateDefaultAssignment{
			AutoCreateAssignment: false,
			WorkScope:            translationFamilyDefaultWorkScope(family),
			Priority:             strings.ToLower(string(PriorityNormal)),
			AssigneeID:           "",
			DueDate:              "",
		},
		DisabledReasonCode: reasonCode,
		DisabledReason:     reason,
	}
}

func translationFamilyQuickCreateLocales(family translationservices.FamilyRecord) []string {
	locales := translationFamilyMissingLocales(family)
	if len(locales) == 0 {
		for _, blocker := range family.Blockers {
			if strings.EqualFold(strings.TrimSpace(blocker.BlockerCode), string(translationcore.FamilyBlockerMissingLocale)) {
				if locale := strings.ToLower(strings.TrimSpace(blocker.Locale)); locale != "" {
					locales = append(locales, locale)
				}
			}
		}
	}
	if len(locales) == 0 {
		return nil
	}
	sort.Strings(locales)
	return normalizeLocaleList(locales)
}

func translationFamilyQuickCreateRecommendedLocale(family translationservices.FamilyRecord, missingLocales []string) string {
	return translationReadinessRecommendedLocale(missingLocales, family.Policy.RequiredLocales)
}

func translationFamilyQuickCreateAvailability(family translationservices.FamilyRecord, missingLocales []string) (bool, string, string) {
	for _, blocker := range family.Blockers {
		if strings.EqualFold(strings.TrimSpace(blocker.BlockerCode), string(translationcore.FamilyBlockerPolicyDenied)) {
			return false, "policy_denied", "Policy currently blocks creating additional locale variants for this family."
		}
	}
	if len(missingLocales) > 0 {
		return true, "", ""
	}
	return false, "no_missing_locales", "All required locales already exist for this family."
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

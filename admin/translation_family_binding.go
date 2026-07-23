package admin

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"maps"
	neturl "net/url"
	"slices"
	"sort"
	"strings"
	"sync"
	"time"

	auth "github.com/goliatone/go-auth"
	csrfmw "github.com/goliatone/go-auth/middleware/csrf"
	crud "github.com/goliatone/go-crud"
	router "github.com/goliatone/go-router"

	translationcore "github.com/goliatone/go-admin/translations/core"
	translationservices "github.com/goliatone/go-admin/translations/services"
)

type translationFamilyRuntime struct {
	service *translationservices.FamilyService
	report  translationRuntimeReport
}

type translationRuntimeReportSummary struct {
	Families    int `json:"families"`
	Variants    int `json:"variants"`
	Assignments int `json:"assignments"`
	Blockers    int `json:"blockers"`
	Warnings    int `json:"warnings"`
}

type translationRuntimeReport struct {
	Checksum string                          `json:"checksum"`
	Summary  translationRuntimeReportSummary `json:"summary"`
}

type translationFamilyCreateVariantInput struct {
	Locale               string     `json:"locale"`
	AutoCreateAssignment bool       `json:"auto_create_assignment"`
	AssigneeID           string     `json:"assignee_id"`
	Priority             Priority   `json:"priority"`
	DueDate              *time.Time `json:"due_date"`
	Environment          string     `json:"environment"`
	IdempotencyKey       string     `json:"idempotency_key"`
}

type translationFamilyCreateAssignmentInput struct {
	TargetLocale   string     `json:"target_locale"`
	AssigneeID     string     `json:"assignee_id"`
	OpenPool       bool       `json:"open_pool"`
	Priority       Priority   `json:"priority"`
	PrioritySet    bool       `json:"-"`
	DueDate        *time.Time `json:"due_date"`
	WorkScope      string     `json:"work_scope"`
	Channel        string     `json:"channel"`
	IdempotencyKey string     `json:"idempotency_key"`
}

type translationFamilyCreateAssignmentRequest struct {
	AdminCtx AdminContext
	Body     map[string]any
	Input    translationFamilyCreateAssignmentInput
	Scope    translationservices.Scope
}

type translationFamilyCreateAssignmentOutcome struct {
	Assignment       TranslationAssignment `json:"assignment"`
	AssignmentReused bool                  `json:"assignment_reused"`
}

type translationFamilyCreateVariantAssignmentPlan struct {
	ReuseAssignment    *TranslationAssignment  `json:"reuse_assignment"`
	ArchiveAssignments []TranslationAssignment `json:"archive_assignments"`
	WorkScope          string                  `json:"work_scope"`
}

type translationFamilyCreateVariantOutcome struct {
	Assignment            *TranslationAssignment `json:"assignment"`
	AssignmentReused      bool                   `json:"assignment_reused"`
	ArchivedAssignmentIDs []string               `json:"archived_assignment_i_ds"`
}

type translationFamilyCreateVariantRequest struct {
	AdminCtx AdminContext
	Body     map[string]any
	Input    translationFamilyCreateVariantInput
	Scope    translationservices.Scope
}

type translationFamilyCreateVariantState struct {
	Runtime *translationFamilyRuntime
	Scope   translationservices.Scope
	Family  translationservices.FamilyRecord
}

type translationFamilyIdempotencyRecord struct {
	RequestHash string         `json:"request_hash"`
	Payload     map[string]any `json:"payload"`
	CreatedAt   time.Time      `json:"created_at"`
}

type translationFamilyAssignActionDecision struct {
	Enabled      bool
	QueueEnabled bool
	Permission   string
	ActorID      string
	Reason       string
	ReasonCode   string
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
	if permissionErr := b.admin.requirePermission(adminCtx, PermAdminTranslationsView, "translations"); permissionErr != nil {
		return nil, permissionErr
	}
	channel := translationChannelFromRequest(c, adminCtx, nil)
	runtime, err := b.runtime(adminCtx.Context, channel)
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
		Environment:    channel,
		FamilyID:       strings.TrimSpace(c.Query("family_id")),
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
		"meta": mergeTranslationChannelContract(map[string]any{
			"total":    result.Total,
			"page":     result.Page,
			"per_page": result.PerPage,
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
		}, channel),
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
	family, ok, err := runtime.service.Detail(adminCtx.Context, translationservices.GetFamilyInput{
		Scope:       scope,
		Environment: channel,
		FamilyID:    strings.TrimSpace(id),
	})
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, notFoundDomainError("translation family not found", b.detailNotFoundMetadata(adminCtx, id, channel))
	}
	return map[string]any{
		"data": b.translationFamilyDetailPayload(adminCtx.Context, family, channel),
		"meta": mergeTranslationChannelContract(nil, channel),
	}, nil
}

func (b *translationFamilyBinding) detailNotFoundMetadata(adminCtx AdminContext, id string, channel string) map[string]any {
	familyID := strings.TrimSpace(id)
	meta := map[string]any{"family_id": familyID}
	if b == nil || b.admin == nil {
		return meta
	}
	if !permissionAllowed(b.admin.Authorizer(), adminCtx.Context, PermAdminTranslationsSync, "translations") {
		return meta
	}
	apiBasePath := strings.TrimRight(b.admin.AdminAPIBasePath(), "/")
	if apiBasePath == "" {
		apiBasePath = "/admin/api"
	}
	meta["sync_recovery"] = map[string]any{
		"can_sync":        true,
		"syncable":        true,
		"permission":      PermAdminTranslationsSync,
		"command_name":    "translation.families.sync",
		"rpc_invoke_path": apiBasePath + "/rpc",
		"environment":     strings.TrimSpace(channel),
		"family_id":       familyID,
	}
	return meta
}

func (b *translationFamilyBinding) Create(c router.Context, id string) (payload any, opErr error) {
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
			Err:       opErr,
		})
	}()
	if b == nil || b.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation family binding", map[string]any{"component": "translation_family_binding"})
	}
	request, cached, err := b.prepareAuthorizedCreateVariantRequest(c, id)
	if err != nil || cached != nil {
		return cached, err
	}
	obsCtx = request.AdminCtx.Context
	state, cached, err := b.loadCreateVariantState(strings.TrimSpace(id), request)
	if err != nil || cached != nil {
		return cached, err
	}
	if validationErr := validateCreateVariantAssignmentTarget(state.Family, request.Input); validationErr != nil {
		return nil, validationErr
	}
	assignmentPlan, err := b.translationMatrixCreateVariantAssignmentPlan(request.AdminCtx, state.Family, request.Input)
	if err != nil {
		return nil, err
	}
	actorID := translationIdentityFromAdminContext(request.AdminCtx).ActorID
	createdVariant, err := b.createFamilyVariant(request.AdminCtx.Context, actorID, state.Family, request.Input)
	if err != nil {
		return b.handleCreateVariantError(request, state, err)
	}
	outcomeFamily := state.Family
	if request.Input.AutoCreateAssignment {
		if syncErr := SyncTranslationFamilyStore(request.AdminCtx.Context, b.admin, request.Input.Environment); syncErr != nil {
			return nil, b.rollbackCreatedFamilyVariant(request.AdminCtx.Context, createdVariant, syncErr, request.Input.Environment)
		}
		outcomeFamily, err = b.loadCreateVariantFamily(request.AdminCtx.Context, state.Scope, state.Family.ID, request.Input)
		if err != nil {
			return nil, b.rollbackCreatedFamilyVariant(request.AdminCtx.Context, createdVariant, err, request.Input.Environment)
		}
	}
	outcome, err := b.translationMatrixCreateVariantOutcome(request.AdminCtx, outcomeFamily, request.Input, assignmentPlan, createdVariant)
	if err != nil {
		return nil, err
	}
	if syncErr := SyncTranslationFamilyStore(request.AdminCtx.Context, b.admin, request.Input.Environment); syncErr != nil {
		return nil, syncErr
	}
	return b.finalizeCreateVariantPayload(request, state, actorID, createdVariant, outcome)
}

func validateCreateVariantAssignmentTarget(family translationservices.FamilyRecord, input translationFamilyCreateVariantInput) error {
	if !input.AutoCreateAssignment {
		return nil
	}
	return validateFamilyAssignmentTargetLocale(family, input.Locale)
}

func (b *translationFamilyBinding) CreateAssignment(c router.Context, id string) (payload any, opErr error) {
	payloadMap, _, err := b.createAssignmentPayload(c, id)
	return payloadMap, err
}

func (b *translationFamilyBinding) createAssignmentPayload(c router.Context, id string) (payload map[string]any, request translationFamilyCreateAssignmentRequest, opErr error) {
	startedAt := time.Now()
	obsCtx := c.Context()
	defer func() {
		recordTranslationAPIOperation(obsCtx, translationAPIObservation{
			Operation: "translations.families.assignments.create",
			Kind:      "write",
			RequestID: requestIDFromContext(obsCtx),
			TraceID:   traceIDFromContext(obsCtx),
			TenantID:  tenantIDFromContext(obsCtx),
			OrgID:     orgIDFromContext(obsCtx),
			Duration:  time.Since(startedAt),
			Err:       opErr,
		})
	}()
	if b == nil || b.admin == nil {
		return nil, translationFamilyCreateAssignmentRequest{}, serviceNotConfiguredDomainError("translation family binding", map[string]any{"component": "translation_family_binding"})
	}
	request, cached, err := b.prepareCreateAssignmentRequest(c, id)
	if err != nil || cached != nil {
		return cached, request, err
	}
	obsCtx = request.AdminCtx.Context
	familyID := strings.TrimSpace(id)
	var result TranslationFamilyAssignResult
	command := &TranslationFamilyAssignCommand{Binding: b}
	if executeErr := command.Execute(request.AdminCtx.Context, translationFamilyAssignInputFromRequest(familyID, request, &result)); executeErr != nil {
		return nil, request, executeErr
	}
	outcome := translationFamilyCreateAssignmentOutcome{
		Assignment:       result.Assignment,
		AssignmentReused: result.AssignmentReused,
	}
	payloadMap := b.createAssignmentResponsePayload(request, outcome)
	if request.Input.IdempotencyKey != "" {
		if storeErr := b.storeCreateAssignmentIdempotency(request.AdminCtx, result.Family.ID, request.Input, payloadMap); storeErr != nil {
			return nil, request, storeErr
		}
	}
	return payloadMap, request, nil
}

func (b *translationFamilyBinding) CreateAssignmentMutation(c router.Context, id string) error {
	var adm *Admin
	if b != nil {
		adm = b.admin
	}
	req := adm.detectEnhancedMutationRequest(c)
	responder := NewEnhancedMutationResponder(adm.ErrorPresenter()).WithMediaType(adm.enhancedActionResponseMediaType())
	payload, request, err := b.createAssignmentPayload(c, id)
	redirect := b.translationFamilyDetailRedirectForAssignment(c, id, request, payload)
	if err != nil {
		return responder.RespondError(c, req, err, MutationFallback{
			Redirect: redirect,
			Toast:    &EnhancedToast{Type: "error", Message: "Assignment could not be updated."},
		})
	}
	fallback := MutationFallback{
		Redirect: redirect,
		Toast:    &EnhancedToast{Type: "success", Message: "Assignment updated."},
		JSON:     payload,
	}
	successPresentation := NewMutationPresentation(
		WithMutationToast(EnhancedToast{Type: "success", Message: "Assignment updated."}),
		WithMutationRedirect(redirect),
	)
	if req.Mode != crud.MutationResponseModeEnhanced {
		return responder.Respond(c, req, successPresentation, fallback)
	}
	presentation, err := b.createAssignmentMutationPresentation(c, id, payload, redirect, mutationPayloadChannel(payload))
	if err != nil {
		return responder.RespondError(c, req, err, MutationFallback{
			Redirect: redirect,
			Toast:    &EnhancedToast{Type: "error", Message: "Assignment was saved, but the family view could not be refreshed."},
			JSON:     payload,
		})
	}
	return responder.Respond(c, req, presentation, fallback)
}

func (b *translationFamilyBinding) translationFamilyDetailRedirectForAssignment(c router.Context, familyID string, request translationFamilyCreateAssignmentRequest, payload map[string]any) string {
	channel := strings.TrimSpace(request.Input.Channel)
	if channel == "" {
		channel = mutationPayloadChannel(payload)
	}
	if channel == "" {
		channel = translationFamilyCreateAssignmentChannelFromRequest(c)
	}
	basePath := "/admin"
	if b != nil && b.admin != nil {
		basePath = adminBasePath(b.admin.config)
	}
	return translationFamilyDetailRedirectWithChannel(c, basePath, familyID, channel)
}

func (b *translationFamilyBinding) createAssignmentMutationPresentation(c router.Context, familyID string, payload any, redirect string, channel string) (MutationPresentation, error) {
	data, err := b.familyDetailMutationData(c, familyID, channel)
	if err != nil {
		return MutationPresentation{}, err
	}
	fragments, err := RenderFamilyDetailFragmentsFromData(data)
	if err != nil {
		return MutationPresentation{}, err
	}
	presentation := NewMutationPresentation(
		WithMutationToast(EnhancedToast{Type: "success", Message: "Assignment updated."}),
		WithMutationRedirect(redirect),
		WithMutationFocus(translationFamilyAssignmentFocusSelector(payload)),
	)
	presentation.Fragments = append(presentation.Fragments, fragments...)
	return presentation, nil
}

func (b *translationFamilyBinding) familyDetailMutationData(c router.Context, familyID string, channel string) (map[string]any, error) {
	if b == nil || b.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation family binding", map[string]any{"component": "translation_family_binding"})
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	setTranslationTraceHeaders(c, adminCtx.Context)
	if permissionErr := b.admin.requirePermission(adminCtx, PermAdminTranslationsView, "translations"); permissionErr != nil {
		return nil, permissionErr
	}
	resolvedChannel := translationChannelFromRequest(c, adminCtx, nil, channel)
	runtime, err := b.runtime(adminCtx.Context, resolvedChannel)
	if err != nil {
		return nil, err
	}
	scope := translationservices.Scope{
		TenantID: translationIdentityFromAdminContext(adminCtx).TenantID,
		OrgID:    translationIdentityFromAdminContext(adminCtx).OrgID,
	}
	family, ok, err := runtime.service.Detail(adminCtx.Context, translationservices.GetFamilyInput{
		Scope:       scope,
		Environment: resolvedChannel,
		FamilyID:    strings.TrimSpace(familyID),
	})
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, notFoundDomainError("translation family not found", b.detailNotFoundMetadata(adminCtx, familyID, resolvedChannel))
	}
	data := b.translationFamilyDetailPayload(adminCtx.Context, family, resolvedChannel)
	translationSSRDecorateFamilyDetail(data)
	data["meta"] = mergeTranslationChannelContract(nil, resolvedChannel)
	data["assignee"] = translationSSRFamilyAssigneeContract(data)
	attachFamilyDetailCSRFData(c, data)
	return data, nil
}

func mutationPayloadChannel(payload any) string {
	return strings.TrimSpace(toString(extractMap(extractMap(payload)["meta"])["channel"]))
}

func translationFamilyAssignmentFocusSelector(payload any) string {
	assignmentID := strings.TrimSpace(toString(extractMap(extractMap(payload)["data"])["assignment_id"]))
	if assignmentID == "" {
		return "[data-family-assignments]"
	}
	return `[data-assignment-id="` + strings.ReplaceAll(assignmentID, `"`, `\"`) + `"]`
}

func translationFamilyDetailRedirect(c router.Context, basePath string, familyID string) string {
	return translationFamilyDetailRedirectWithChannel(c, basePath, familyID, "")
}

func translationFamilyDetailRedirectWithChannel(c router.Context, basePath string, familyID string, channel string) string {
	path := joinBasePath(firstNonEmpty(strings.TrimSpace(basePath), "/admin"), "translations/families/"+neturl.PathEscape(strings.TrimSpace(familyID)))
	values := neturl.Values{}
	for _, key := range []string{"channel", ScopeTenantIDKey, ScopeOrgIDKey} {
		value := firstNonEmpty(c.Query(key), c.FormValue(key))
		if key == "channel" {
			value = firstNonEmpty(channel, value)
		}
		if trimmedValue := strings.TrimSpace(value); trimmedValue != "" {
			values.Set(key, trimmedValue)
		}
	}
	if encoded := values.Encode(); encoded != "" {
		return path + "?" + encoded
	}
	return path
}

func attachFamilyDetailCSRFData(c router.Context, data map[string]any) {
	if c == nil || data == nil {
		return
	}
	token := strings.TrimSpace(toString(c.Locals(csrfmw.DefaultContextKey)))
	if token == "" {
		return
	}
	fieldName := firstNonEmpty(toString(c.Locals(csrfmw.DefaultContextKey+"_field")), csrfmw.DefaultFormFieldName)
	data["csrf_token"] = token
	data["csrf_field_name"] = fieldName
}

func (b *translationFamilyBinding) prepareAuthorizedCreateVariantRequest(c router.Context, id string) (translationFamilyCreateVariantRequest, map[string]any, error) {
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	setTranslationTraceHeaders(c, adminCtx.Context)
	if permissionErr := b.admin.requirePermission(adminCtx, PermAdminTranslationsEdit, "translations"); permissionErr != nil {
		return translationFamilyCreateVariantRequest{}, nil, permissionErr
	}
	return b.prepareCreateVariantRequest(c, id, adminCtx)
}

func (b *translationFamilyBinding) handleCreateVariantError(request translationFamilyCreateVariantRequest, state translationFamilyCreateVariantState, err error) (map[string]any, error) {
	if request.Input.IdempotencyKey != "" && isTranslationVariantAlreadyExists(err) {
		replayed, replayedOK, replayErr := b.lookupCreateVariantReplayFromStore(request.AdminCtx, state.Scope, state.Family.ID, request.Input)
		if replayErr == nil && replayedOK {
			if storeErr := b.storeCreateVariantIdempotency(request.AdminCtx, state.Family.ID, request.Input, replayed); storeErr != nil {
				return nil, storeErr
			}
			return replayed, nil
		}
	}
	if isTranslationVariantAlreadyExists(err) {
		recordTranslationCreateLocaleMetric(request.AdminCtx.Context, translationCreateLocaleEvent{
			ContentType: state.Family.ContentType,
			FamilyID:    state.Family.ID,
			Locale:      request.Input.Locale,
			Environment: request.Input.Environment,
			Outcome:     "duplicate",
			Err:         err,
		})
	}
	return nil, err
}

func (b *translationFamilyBinding) prepareCreateVariantRequest(c router.Context, familyID string, adminCtx AdminContext) (translationFamilyCreateVariantRequest, map[string]any, error) {
	body, err := parseOptionalJSONMap(c.Body())
	if err != nil {
		return translationFamilyCreateVariantRequest{}, nil, err
	}
	if identityErr := rejectTranslationClientIdentityFields(body); identityErr != nil {
		return translationFamilyCreateVariantRequest{}, nil, identityErr
	}
	channel := translationChannelFromRequest(c, adminCtx, body)
	input, err := parseTranslationFamilyCreateVariantInput(c, body, channel)
	if err != nil {
		return translationFamilyCreateVariantRequest{}, nil, err
	}
	recordTranslationCreateLocaleMetric(adminCtx.Context, translationCreateLocaleEvent{
		ContentType: familyContentTypeHint(body),
		FamilyID:    strings.TrimSpace(familyID),
		Locale:      input.Locale,
		Environment: input.Environment,
		Outcome:     "attempt",
	})
	cached, err := b.lookupCreateVariantIdempotency(adminCtx, strings.TrimSpace(familyID), input)
	if err != nil || cached != nil {
		return translationFamilyCreateVariantRequest{}, cached, err
	}
	return translationFamilyCreateVariantRequest{
		AdminCtx: adminCtx,
		Body:     body,
		Input:    input,
		Scope: translationservices.Scope{
			TenantID: translationIdentityFromAdminContext(adminCtx).TenantID,
			OrgID:    translationIdentityFromAdminContext(adminCtx).OrgID,
		},
	}, nil, nil
}

func (b *translationFamilyBinding) loadCreateVariantState(familyID string, request translationFamilyCreateVariantRequest) (translationFamilyCreateVariantState, map[string]any, error) {
	runtime, err := b.runtime(request.AdminCtx.Context, request.Input.Environment)
	if err != nil {
		return translationFamilyCreateVariantState{}, nil, err
	}
	family, ok, err := runtime.service.Detail(request.AdminCtx.Context, translationservices.GetFamilyInput{
		Scope:       request.Scope,
		Environment: request.Input.Environment,
		FamilyID:    familyID,
	})
	if err != nil {
		return translationFamilyCreateVariantState{}, nil, err
	}
	if !ok {
		return translationFamilyCreateVariantState{}, nil, notFoundDomainError("translation family not found", map[string]any{"family_id": familyID})
	}
	if allowErr := b.ensureCreateVariantAllowed(request, family); allowErr != nil {
		return translationFamilyCreateVariantState{}, nil, allowErr
	}
	cached, err := b.lookupExistingCreateVariant(request, family)
	if err != nil || cached != nil {
		return translationFamilyCreateVariantState{}, cached, err
	}
	return translationFamilyCreateVariantState{Runtime: runtime, Scope: request.Scope, Family: family}, nil, nil
}

func (b *translationFamilyBinding) ensureCreateVariantAllowed(request translationFamilyCreateVariantRequest, family translationservices.FamilyRecord) error {
	if !translationFamilyPolicyDenied(family) || translationFamilyCanCreateMissingLocaleWithPolicyDenied(family, request.Input.Locale) {
		return nil
	}
	recordTranslationCreateLocaleMetric(request.AdminCtx.Context, translationCreateLocaleEvent{
		ContentType: family.ContentType,
		FamilyID:    family.ID,
		Locale:      request.Input.Locale,
		Environment: request.Input.Environment,
		Outcome:     "policy_denied",
	})
	return NewDomainError(string(translationcore.ErrorPolicyBlocked), "translation family is blocked by policy", mergeTranslationChannelContract(map[string]any{
		"family_id":        family.ID,
		"content_type":     family.ContentType,
		"requested_locale": request.Input.Locale,
	}, request.Input.Environment))
}

func (b *translationFamilyBinding) lookupExistingCreateVariant(request translationFamilyCreateVariantRequest, family translationservices.FamilyRecord) (map[string]any, error) {
	if !translationFamilyHasLocale(family, request.Input.Locale) {
		return nil, nil
	}
	replayed, replayedOK, replayErr := b.lookupCreateVariantReplay(request.AdminCtx, request.Scope, family, request.Input)
	if replayErr != nil {
		return nil, replayErr
	}
	if replayedOK {
		if storeErr := b.storeCreateVariantIdempotency(request.AdminCtx, family.ID, request.Input, replayed); storeErr != nil {
			return nil, storeErr
		}
		return replayed, nil
	}
	source := translationFamilySourceVariant(family)
	recordTranslationCreateLocaleMetric(request.AdminCtx.Context, translationCreateLocaleEvent{
		ContentType: family.ContentType,
		FamilyID:    family.ID,
		Locale:      request.Input.Locale,
		Environment: request.Input.Environment,
		Outcome:     "duplicate",
	})
	return nil, TranslationAlreadyExistsError{
		Panel:        family.ContentType,
		EntityID:     strings.TrimSpace(source.SourceRecordID),
		SourceLocale: family.SourceLocale,
		Locale:       request.Input.Locale,
		FamilyID:     family.ID,
	}
}

func (b *translationFamilyBinding) finalizeCreateVariantPayload(
	request translationFamilyCreateVariantRequest,
	state translationFamilyCreateVariantState,
	actorID string,
	createdVariant *CMSContent,
	outcome translationFamilyCreateVariantOutcome,
) (map[string]any, error) {
	payloadMap, familyAfter, err := b.rebuildCreateVariantPayloadWithFamily(request.AdminCtx.Context, state.Scope, state.Family.ID, request.Input)
	if err != nil {
		return nil, err
	}
	translationFamilyAttachCreateVariantNavigation(payloadMap, createdVariant, b.admin.config.BasePath)
	translationFamilyAttachAssignmentOutcome(payloadMap, outcome)
	if request.Input.IdempotencyKey != "" {
		if err := b.storeCreateVariantIdempotency(request.AdminCtx, state.Family.ID, request.Input, payloadMap); err != nil {
			return nil, err
		}
	}
	recordTranslationCreateLocaleMetric(request.AdminCtx.Context, translationCreateLocaleEvent{
		ContentType: familyAfter.ContentType,
		FamilyID:    familyAfter.ID,
		Locale:      request.Input.Locale,
		Environment: request.Input.Environment,
		Outcome:     "success",
	})
	b.recordCreateVariantActivity(request.AdminCtx.Context, actorID, state.Family, familyAfter, request.Input, outcome)
	return payloadMap, nil
}

func translationFamilyAttachAssignmentOutcome(payloadMap map[string]any, outcome translationFamilyCreateVariantOutcome) {
	if outcome.Assignment == nil {
		return
	}
	data := translationFamilyPayloadMap(payloadMap, "data")
	data["assignment"] = translationCreateVariantAssignmentPayload(*outcome.Assignment)
	meta := translationFamilyPayloadMap(payloadMap, "meta")
	meta["assignment_reused"] = outcome.AssignmentReused
	if len(outcome.ArchivedAssignmentIDs) > 0 {
		meta["archived_assignment_ids"] = append([]string{}, outcome.ArchivedAssignmentIDs...)
	}
}

func familyContentTypeHint(body map[string]any) string {
	return normalizePolicyEntityKey(firstNonEmpty(
		toString(body["content_type"]),
		toString(body["contentType"]),
		toString(body["panel"]),
	))
}

func (b *translationFamilyBinding) runtime(ctx context.Context, channel string) (*translationFamilyRuntime, error) {
	if b != nil && b.loadRuntime != nil {
		return b.loadRuntime(ctx, channel)
	}
	if b == nil || b.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation family binding", map[string]any{"component": "translation_family_binding"})
	}
	if b.admin.translationFamilyStore == nil {
		return nil, serviceNotConfiguredDomainError("translation family store", map[string]any{"component": "translation_family_binding"})
	}
	return &translationFamilyRuntime{
		service: &translationservices.FamilyService{
			Store: b.admin.translationFamilyStore,
			Policies: translationservices.PolicyService{
				Resolver: translationFamilyPolicyResolver{admin: b.admin},
			},
		},
	}, nil
}

func (b *translationFamilyBinding) loadCreateVariantFamily(ctx context.Context, scope translationservices.Scope, familyID string, input translationFamilyCreateVariantInput) (translationservices.FamilyRecord, error) {
	runtime, err := b.runtime(ctx, input.Environment)
	if err != nil {
		return translationservices.FamilyRecord{}, err
	}
	family, ok, err := runtime.service.Detail(ctx, translationservices.GetFamilyInput{
		Scope:       scope,
		Environment: input.Environment,
		FamilyID:    strings.TrimSpace(familyID),
	})
	if err != nil {
		return translationservices.FamilyRecord{}, err
	}
	if !ok {
		return translationservices.FamilyRecord{}, notFoundDomainError("translation family not found after create-locale sync", map[string]any{
			"family_id": strings.TrimSpace(familyID),
		})
	}
	return family, nil
}

type translationFamilyPolicyResolver struct {
	admin *Admin
}

type translationFamilyPolicyBlockerProvider interface {
	FamilyPolicyBlockers(context.Context, translationservices.FamilyRecord, translationservices.FamilyPolicy, string) ([]translationservices.FamilyBlocker, error)
}

func (r translationFamilyPolicyResolver) ResolvePolicy(ctx context.Context, contentType, environment string) (translationservices.FamilyPolicy, bool, error) {
	if r.admin == nil || r.admin.translationPolicy == nil {
		return translationservices.FamilyPolicy{}, false, nil
	}
	provider, ok := r.admin.translationPolicy.(translationRequirementsProvider)
	if !ok || provider == nil {
		return translationservices.FamilyPolicy{}, false, nil
	}
	req, found, err := provider.Requirements(ctx, TranslationPolicyInput{
		EntityType:   strings.TrimSpace(strings.ToLower(contentType)),
		Transition:   translationReadinessTransitionPublish,
		Environment:  strings.TrimSpace(environment),
		PolicyEntity: strings.TrimSpace(strings.ToLower(contentType)),
	})
	if err != nil || !found {
		return translationservices.FamilyPolicy{}, found, err
	}
	return translationservices.FamilyPolicy{
		ContentType:             strings.TrimSpace(strings.ToLower(contentType)),
		Environment:             strings.TrimSpace(environment),
		SourceLocale:            translationFamilyPolicySourceLocale(req, r.admin.config.DefaultLocale),
		RequiredLocales:         append([]string{}, req.Locales...),
		RequiredFields:          cloneRequiredFieldsString(req.RequiredFields),
		ReviewRequired:          req.ReviewRequired,
		AllowPublishOverride:    req.AllowPublishOverride,
		AssignmentLifecycleMode: req.AssignmentLifecycleMode,
		DefaultWorkScope:        normalizeTranslationAssignmentWorkScope(req.DefaultWorkScope),
	}, true, nil
}

func (r translationFamilyPolicyResolver) ResolvePolicyBlockers(ctx context.Context, family translationservices.FamilyRecord, policy translationservices.FamilyPolicy, environment string) ([]translationservices.FamilyBlocker, error) {
	if r.admin == nil || r.admin.translationPolicy == nil {
		return nil, nil
	}
	if provider, ok := r.admin.translationPolicy.(translationFamilyPolicyBlockerProvider); ok && provider != nil {
		return provider.FamilyPolicyBlockers(ctx, family, policy, environment)
	}
	source := translationFamilySourceVariant(family)
	recordID := strings.TrimSpace(firstNonEmpty(source.SourceRecordID, source.ID))
	if recordID == "" {
		return nil, nil
	}
	locale := strings.TrimSpace(strings.ToLower(firstNonEmpty(source.Locale, family.SourceLocale, policy.SourceLocale)))
	err := r.admin.translationPolicy.Validate(ctx, TranslationPolicyInput{
		EntityType:      strings.TrimSpace(strings.ToLower(family.ContentType)),
		EntityID:        recordID,
		Transition:      translationReadinessTransitionPublish,
		Environment:     strings.TrimSpace(environment),
		PolicyEntity:    strings.TrimSpace(strings.ToLower(firstNonEmpty(policy.ContentType, family.ContentType))),
		RequestedLocale: locale,
	})
	if err == nil {
		return nil, nil
	}
	var missing MissingTranslationsError
	if errors.As(err, &missing) {
		return nil, nil
	}
	if translationFamilyPolicySourceNotFound(err) {
		return nil, nil
	}
	scope := translationservices.Scope{TenantID: family.TenantID, OrgID: family.OrgID}
	return []translationservices.FamilyBlocker{{
		ID:          translationservices.DeterministicBlockerID(scope, family.ID, string(translationcore.FamilyBlockerPolicyDenied), locale, "host_policy"),
		FamilyID:    family.ID,
		TenantID:    family.TenantID,
		OrgID:       family.OrgID,
		BlockerCode: string(translationcore.FamilyBlockerPolicyDenied),
		Locale:      locale,
		Details: map[string]any{
			translationcore.FamilyBlockerDetailContentType: family.ContentType,
			translationcore.FamilyBlockerDetailEnvironment: strings.TrimSpace(environment),
			translationcore.FamilyBlockerDetailMessage:     err.Error(),
			translationcore.FamilyBlockerDetailReason:      string(translationcore.FamilyBlockerReasonHostPolicy),
		},
	}}, nil
}

func translationFamilyPolicySourceNotFound(err error) bool {
	return errors.Is(err, ErrNotFound) || errors.Is(err, ErrTranslationSourceNotFound)
}

func translationFamilyPolicySourceLocale(req TranslationRequirements, fallback string) string {
	sourceLocale := strings.TrimSpace(strings.ToLower(req.SourceLocale))
	if sourceLocale != "" {
		return sourceLocale
	}
	for _, locale := range req.Locales {
		if strings.EqualFold(strings.TrimSpace(locale), "en") {
			return "en"
		}
	}
	if sourceLocale == "" {
		sourceLocale = strings.TrimSpace(strings.ToLower(fallback))
	}
	if sourceLocale == "" {
		for _, locale := range req.Locales {
			if sourceLocale = strings.TrimSpace(strings.ToLower(locale)); sourceLocale != "" {
				return sourceLocale
			}
		}
	}
	if sourceLocale == "" {
		sourceLocale = "en"
	}
	return sourceLocale
}

const (
	translationFamilyCreateVariantIdempotencyTTL         = 24 * time.Hour
	translationFamilyCreateVariantMetadataKey            = "translation_create_locale"
	translationFamilyCreateVariantMetadataActorIDKey     = "actor_id"
	translationFamilyCreateVariantMetadataRequestHashKey = "request_hash"
	translationFamilyCreateVariantMetadataKeyIDKey       = "idempotency_key"
	translationFamilyCreateVariantMetadataCreatedAtKey   = "created_at"
)

func parseTranslationFamilyCreateVariantInput(c router.Context, body map[string]any, channel string) (translationFamilyCreateVariantInput, error) {
	input := translationFamilyCreateVariantInput{
		Locale:               normalizeCreateTranslationLocale(toString(body["locale"])),
		AutoCreateAssignment: toBool(body["auto_create_assignment"]),
		AssigneeID:           strings.TrimSpace(toString(body["assignee_id"])),
		Priority:             Priority(strings.TrimSpace(strings.ToLower(toString(body["priority"])))),
		Environment:          strings.TrimSpace(channel),
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
	if !input.AutoCreateAssignment && translationCreateVariantHasAssignmentIntent(input) {
		return translationFamilyCreateVariantInput{}, validationDomainError("assignment fields require auto_create_assignment=true", map[string]any{
			"field": "auto_create_assignment",
		})
	}
	if !input.AutoCreateAssignment {
		input.AssigneeID = ""
		input.Priority = ""
		input.DueDate = nil
	}
	return input, nil
}

func translationCreateVariantHasAssignmentIntent(input translationFamilyCreateVariantInput) bool {
	if strings.TrimSpace(input.AssigneeID) != "" || input.DueDate != nil {
		return true
	}
	priority := strings.TrimSpace(strings.ToLower(string(input.Priority)))
	return priority != "" && priority != string(PriorityNormal)
}

func (b *translationFamilyBinding) prepareCreateAssignmentRequest(c router.Context, familyID string) (translationFamilyCreateAssignmentRequest, map[string]any, error) {
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	setTranslationTraceHeaders(c, adminCtx.Context)
	if permissionErr := b.admin.requirePermission(adminCtx, PermAdminTranslationsAssign, "translations"); permissionErr != nil {
		return translationFamilyCreateAssignmentRequest{}, nil, permissionErr
	}
	if translationIdentityFromAdminContext(adminCtx).ActorID == "" {
		return translationFamilyCreateAssignmentRequest{}, nil, NewDomainError(string(translationcore.ErrorPermissionDenied), "family assignment creation requires an authenticated actor", map[string]any{
			"component": "translation_family_binding",
		})
	}
	body, err := parseTranslationFamilyCreateAssignmentBody(c)
	if err != nil {
		return translationFamilyCreateAssignmentRequest{}, nil, err
	}
	if identityErr := rejectTranslationClientIdentityFields(body); identityErr != nil {
		return translationFamilyCreateAssignmentRequest{}, nil, identityErr
	}
	channel := translationChannelFromRequest(c, adminCtx, body)
	input, err := parseTranslationFamilyCreateAssignmentInput(c, body, channel)
	if err != nil {
		return translationFamilyCreateAssignmentRequest{}, nil, err
	}
	cached, err := b.lookupCreateAssignmentIdempotency(adminCtx, strings.TrimSpace(familyID), input)
	if err != nil || cached != nil {
		return translationFamilyCreateAssignmentRequest{}, cached, err
	}
	return translationFamilyCreateAssignmentRequest{
		AdminCtx: adminCtx,
		Body:     body,
		Input:    input,
		Scope: translationservices.Scope{
			TenantID: translationIdentityFromAdminContext(adminCtx).TenantID,
			OrgID:    translationIdentityFromAdminContext(adminCtx).OrgID,
		},
	}, nil, nil
}

func parseTranslationFamilyCreateAssignmentBody(c router.Context) (map[string]any, error) {
	raw := c.Body()
	keys := translationFamilyCreateAssignmentBodyKeys()
	if translationFamilyRequestIsForm(c) || translationFamilyBodyLooksForm(raw) {
		return translationFamilyFormBody(c, raw, keys), nil
	}
	if len(bytes.TrimSpace(raw)) == 0 && translationFamilyHasFormValues(c, keys) {
		return translationFamilyFormBody(c, raw, keys), nil
	}
	return parseOptionalJSONMap(raw)
}

func translationFamilyCreateAssignmentChannelFromRequest(c router.Context) string {
	body, err := parseTranslationFamilyCreateAssignmentBody(c)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(toString(body["channel"]))
}

func translationFamilyCreateAssignmentBodyKeys() []string {
	return []string{
		"target_locale",
		"locale",
		"assignee_id",
		"open_pool",
		"priority",
		"due_date",
		"work_scope",
		"channel",
		"idempotency_key",
	}
}

func translationFamilyRequestIsForm(c router.Context) bool {
	contentType := strings.TrimSpace(strings.ToLower(c.Header("Content-Type")))
	if idx := strings.Index(contentType, ";"); idx >= 0 {
		contentType = strings.TrimSpace(contentType[:idx])
	}
	return contentType == "application/x-www-form-urlencoded" || contentType == "multipart/form-data"
}

func translationFamilyBodyLooksForm(raw []byte) bool {
	payload := strings.TrimSpace(string(raw))
	return payload != "" && strings.Contains(payload, "=") && !strings.HasPrefix(payload, "{") && !strings.HasPrefix(payload, "[")
}

func translationFamilyHasFormValues(c router.Context, keys []string) bool {
	for _, key := range keys {
		if strings.TrimSpace(c.FormValue(key)) != "" {
			return true
		}
	}
	return false
}

func translationFamilyFormBody(c router.Context, raw []byte, keys []string) map[string]any {
	body := map[string]any{}
	rawValues := neturl.Values{}
	if values, err := neturl.ParseQuery(string(raw)); err == nil {
		rawValues = values
	}
	for _, key := range keys {
		if value := strings.TrimSpace(c.FormValue(key)); value != "" {
			body[key] = value
			continue
		}
		if value := strings.TrimSpace(rawValues.Get(key)); value != "" {
			body[key] = value
		}
	}
	return body
}

func parseTranslationFamilyCreateAssignmentInput(c router.Context, body map[string]any, channel string) (translationFamilyCreateAssignmentInput, error) {
	input := translationFamilyCreateAssignmentInput{
		TargetLocale: normalizeCreateTranslationLocale(firstNonEmpty(toString(body["target_locale"]), toString(body["locale"]))),
		AssigneeID:   strings.TrimSpace(toString(body["assignee_id"])),
		OpenPool:     toBool(body["open_pool"]),
		WorkScope:    normalizeTranslationAssignmentWorkScope(toString(body["work_scope"])),
		Channel:      strings.TrimSpace(channel),
		IdempotencyKey: strings.TrimSpace(firstNonEmpty(
			toString(body["idempotency_key"]),
			c.Header("X-Idempotency-Key"),
			c.Header("Idempotency-Key"),
		)),
	}
	if input.TargetLocale == "" {
		return translationFamilyCreateAssignmentInput{}, validationDomainError("target_locale required", map[string]any{"field": "target_locale"})
	}
	rawPriority := strings.TrimSpace(strings.ToLower(toString(body["priority"])))
	if rawPriority != "" {
		input.Priority = Priority(rawPriority)
		input.PrioritySet = true
	} else {
		input.Priority = PriorityNormal
	}
	if input.Priority != "" && !input.Priority.IsValid() {
		return translationFamilyCreateAssignmentInput{}, validationDomainError("invalid priority", map[string]any{"field": "priority"})
	}
	if input.OpenPool && input.AssigneeID != "" {
		return translationFamilyCreateAssignmentInput{}, validationDomainError("open_pool assignments cannot include assignee_id", map[string]any{
			"field": "assignee_id",
		})
	}
	if !input.OpenPool && input.AssigneeID == "" {
		return translationFamilyCreateAssignmentInput{}, requiredFieldDomainError("assignee_id", map[string]any{
			"hint": "set open_pool=true to create an open-pool assignment",
		})
	}
	if rawDueDate := strings.TrimSpace(toString(body["due_date"])); rawDueDate != "" {
		dueDate, err := time.Parse(time.RFC3339, rawDueDate)
		if err != nil {
			return translationFamilyCreateAssignmentInput{}, validationDomainError("invalid due_date", map[string]any{"field": "due_date"})
		}
		dueDate = dueDate.UTC()
		input.DueDate = &dueDate
	}
	return input, nil
}

func validateFamilyAssignmentTargetLocale(family translationservices.FamilyRecord, targetLocale string) error {
	targetLocale = normalizeCreateTranslationLocale(targetLocale)
	if targetLocale == "" {
		return validationDomainError("target_locale required", map[string]any{"field": "target_locale"})
	}
	sourceLocale := translationFamilyCanonicalSourceLocale(family)
	if sourceLocale != "" && strings.EqualFold(targetLocale, sourceLocale) {
		return validationDomainError("source locale does not need assignment", map[string]any{
			"field":         "target_locale",
			"target_locale": targetLocale,
			"source_locale": sourceLocale,
			"reason_code":   ActionDisabledReasonCodeInvalidStatus,
		})
	}
	return nil
}

func translationFamilyCanonicalSourceLocale(family translationservices.FamilyRecord) string {
	return normalizeCreateTranslationLocale(firstNonEmpty(family.Policy.SourceLocale, family.SourceLocale))
}

func translationFamilyAssignmentSourceLocale(family translationservices.FamilyRecord, source translationservices.FamilyVariant) string {
	if locale := translationFamilyCanonicalSourceLocale(family); locale != "" {
		return locale
	}
	return normalizeCreateTranslationLocale(source.Locale)
}

func translationFamilyPolicyDenied(family translationservices.FamilyRecord) bool {
	for _, blocker := range family.Blockers {
		if strings.EqualFold(strings.TrimSpace(blocker.BlockerCode), string(translationcore.FamilyBlockerPolicyDenied)) {
			return true
		}
	}
	return false
}

func translationFamilyCanCreateMissingLocaleWithPolicyDenied(family translationservices.FamilyRecord, locale string) bool {
	target := strings.TrimSpace(strings.ToLower(locale))
	if target == "" {
		return false
	}
	if slices.ContainsFunc(family.Blockers, translationFamilyBlockerIsPolicyUnavailable) {
		return false
	}
	for _, missingLocale := range translationFamilyQuickCreateLocales(family) {
		if strings.EqualFold(strings.TrimSpace(missingLocale), target) {
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
	creator, ok := resolveCMSContentTranslationCreator(b.admin.contentSvc)
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
			"family_id":     family.ID,
			"target_locale": input.Locale,
			"work_scope":    translationFamilyDefaultWorkScope(family),
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

func (b *translationFamilyBinding) applyCreateVariantAssignmentPlan(ctx context.Context, family translationservices.FamilyRecord, input translationFamilyCreateVariantInput, plan translationFamilyCreateVariantAssignmentPlan, createdVariant *CMSContent) (translationFamilyCreateVariantOutcome, error) {
	repo, err := (&translationQueueBinding{admin: b.admin}).assignmentRepository()
	if err != nil {
		return translationFamilyCreateVariantOutcome{}, err
	}
	outcome := translationFamilyCreateVariantOutcome{}
	archivedSnapshots, archivedIDs, err := b.archiveCreateVariantAssignments(ctx, repo, plan)
	if err != nil {
		return translationFamilyCreateVariantOutcome{}, err
	}
	outcome.ArchivedAssignmentIDs = append(outcome.ArchivedAssignmentIDs, archivedIDs...)
	if plan.ReuseAssignment != nil {
		reused, reuseErr := b.reuseCreateVariantAssignment(ctx, repo, family, input, plan, createdVariant)
		if reuseErr != nil {
			return translationFamilyCreateVariantOutcome{}, b.rollbackArchivedAssignments(ctx, repo, archivedSnapshots, reuseErr)
		}
		outcome.Assignment = &reused
		outcome.AssignmentReused = true
		return outcome, nil
	}
	created, inserted, err := b.createVariantAssignment(ctx, repo, family, input, plan, createdVariant)
	if err != nil {
		return translationFamilyCreateVariantOutcome{}, b.rollbackArchivedAssignments(ctx, repo, archivedSnapshots, err)
	}
	outcome.Assignment = &created
	outcome.AssignmentReused = !inserted
	return outcome, nil
}

type archivedAssignmentSnapshot struct {
	original TranslationAssignment
	current  TranslationAssignment
}

func (b *translationFamilyBinding) archiveCreateVariantAssignments(
	ctx context.Context,
	repo TranslationAssignmentRepository,
	plan translationFamilyCreateVariantAssignmentPlan,
) ([]archivedAssignmentSnapshot, []string, error) {
	snapshots := make([]archivedAssignmentSnapshot, 0, len(plan.ArchiveAssignments))
	ids := make([]string, 0, len(plan.ArchiveAssignments))
	for _, assignment := range plan.ArchiveAssignments {
		original := cloneTranslationAssignment(assignment)
		archived := assignment
		now := b.now()
		archived.Status = AssignmentStatusArchived
		archived.ArchivedAt = &now
		updated, err := repo.Update(ctx, archived, assignment.Version)
		if err != nil {
			return nil, nil, err
		}
		snapshots = append(snapshots, archivedAssignmentSnapshot{original: original, current: updated})
		ids = append(ids, strings.TrimSpace(updated.ID))
	}
	return snapshots, ids, nil
}

func (b *translationFamilyBinding) rollbackArchivedAssignments(
	ctx context.Context,
	repo TranslationAssignmentRepository,
	archivedSnapshots []archivedAssignmentSnapshot,
	cause error,
) error {
	var rollbackErr error
	for i := len(archivedSnapshots) - 1; i >= 0; i-- {
		snapshot := archivedSnapshots[i]
		if _, err := repo.Update(ctx, snapshot.original, snapshot.current.Version); err != nil {
			rollbackErr = errors.Join(rollbackErr, err)
		}
	}
	if rollbackErr != nil {
		return translationFamilyRollbackError(cause, rollbackErr)
	}
	return cause
}

func translationFamilyRollbackError(cause, rollbackErr error) error {
	if rollbackErr == nil {
		return cause
	}
	if cause == nil {
		return rollbackErr
	}
	return fmt.Errorf("%w; rollback failed: %w", cause, rollbackErr)
}

func (b *translationFamilyBinding) reuseCreateVariantAssignment(
	ctx context.Context,
	repo TranslationAssignmentRepository,
	family translationservices.FamilyRecord,
	input translationFamilyCreateVariantInput,
	plan translationFamilyCreateVariantAssignmentPlan,
	createdVariant *CMSContent,
) (TranslationAssignment, error) {
	source, err := translationFamilyRequiredSourceVariant(family)
	if err != nil {
		return TranslationAssignment{}, err
	}
	reused := cloneTranslationAssignment(*plan.ReuseAssignment)
	reused.TenantID = strings.TrimSpace(firstNonEmpty(reused.TenantID, family.TenantID))
	reused.OrgID = strings.TrimSpace(firstNonEmpty(reused.OrgID, family.OrgID))
	reused.SourceLocale = translationFamilyAssignmentSourceLocale(family, source)
	reused.WorkScope = plan.WorkScope
	applyCreateVariantAssignmentTarget(&reused, family, input, createdVariant)
	linkCreateVariantAssignmentTarget(family, input.Locale, createdVariant, &reused)
	applyCreateVariantAssignmentReuseInput(&reused, input)
	if !createVariantAssignmentReuseChanged(reused, *plan.ReuseAssignment) {
		return reused, validateCreateVariantAssignmentLinked(family, input.Locale, reused)
	}
	updated, err := repo.Update(ctx, reused, plan.ReuseAssignment.Version)
	if err != nil {
		return TranslationAssignment{}, err
	}
	if validationErr := validateCreateVariantAssignmentLinked(family, input.Locale, updated); validationErr != nil {
		return TranslationAssignment{}, validationErr
	}
	return updated, nil
}

func applyCreateVariantAssignmentReuseInput(reused *TranslationAssignment, input translationFamilyCreateVariantInput) {
	if reused == nil {
		return
	}
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
}

func createVariantAssignmentReuseChanged(reused, original TranslationAssignment) bool {
	if reused.Version != original.Version {
		return true
	}
	if reused.AssigneeID != original.AssigneeID || reused.Priority != original.Priority || reused.WorkScope != original.WorkScope {
		return true
	}
	if reused.TenantID != original.TenantID || reused.OrgID != original.OrgID || reused.SourceLocale != original.SourceLocale {
		return true
	}
	if reused.VariantID != original.VariantID || reused.TargetRecordID != original.TargetRecordID {
		return true
	}
	return !timesEqual(reused.DueDate, original.DueDate)
}

func validateCreateVariantAssignmentLinked(family translationservices.FamilyRecord, targetLocale string, assignment TranslationAssignment) error {
	if strings.TrimSpace(family.TenantID) != "" && strings.TrimSpace(assignment.TenantID) == "" {
		return validationDomainError("created locale assignment missing tenant scope", map[string]any{
			"family_id":     strings.TrimSpace(family.ID),
			"target_locale": normalizeCreateTranslationLocale(targetLocale),
			"reason_code":   "missing_assignment_scope",
		})
	}
	if strings.TrimSpace(family.OrgID) != "" && strings.TrimSpace(assignment.OrgID) == "" {
		return validationDomainError("created locale assignment missing organization scope", map[string]any{
			"family_id":     strings.TrimSpace(family.ID),
			"target_locale": normalizeCreateTranslationLocale(targetLocale),
			"reason_code":   "missing_assignment_scope",
		})
	}
	if strings.TrimSpace(assignment.VariantID) == "" {
		return validationDomainError("created locale assignment missing synced locale variant", map[string]any{
			"family_id":         strings.TrimSpace(family.ID),
			"target_locale":     normalizeCreateTranslationLocale(targetLocale),
			"target_record_id":  strings.TrimSpace(assignment.TargetRecordID),
			"tenant_id":         strings.TrimSpace(assignment.TenantID),
			"organization_id":   strings.TrimSpace(assignment.OrgID),
			"assignment_id":     strings.TrimSpace(assignment.ID),
			"assignment_status": strings.TrimSpace(string(assignment.Status)),
			"reason_code":       "missing_locale_variant",
		})
	}
	return nil
}

func linkCreateVariantAssignmentTarget(family translationservices.FamilyRecord, targetLocale string, createdVariant *CMSContent, assignment *TranslationAssignment) {
	if assignment == nil {
		return
	}
	if variant, ok := translationFamilyVariantByLocale(family, targetLocale); ok {
		assignment.VariantID = strings.TrimSpace(firstNonEmpty(variant.ID, variant.SourceRecordID, assignment.VariantID))
		assignment.TargetRecordID = strings.TrimSpace(firstNonEmpty(variant.SourceRecordID, assignment.TargetRecordID))
		return
	}
	if createdVariant != nil {
		assignment.TargetRecordID = strings.TrimSpace(firstNonEmpty(createdVariant.ID, assignment.TargetRecordID))
	}
}

func (b *translationFamilyBinding) createVariantAssignment(
	ctx context.Context,
	repo TranslationAssignmentRepository,
	family translationservices.FamilyRecord,
	input translationFamilyCreateVariantInput,
	plan translationFamilyCreateVariantAssignmentPlan,
	createdVariant *CMSContent,
) (TranslationAssignment, bool, error) {
	source, err := translationFamilyRequiredSourceVariant(family)
	if err != nil {
		return TranslationAssignment{}, false, err
	}
	assignment := TranslationAssignment{
		FamilyID:       family.ID,
		EntityType:     family.ContentType,
		TenantID:       strings.TrimSpace(family.TenantID),
		OrgID:          strings.TrimSpace(family.OrgID),
		SourceRecordID: strings.TrimSpace(source.SourceRecordID),
		SourceLocale:   translationFamilyAssignmentSourceLocale(family, source),
		TargetLocale:   strings.TrimSpace(strings.ToLower(input.Locale)),
		SourceTitle:    strings.TrimSpace(source.Fields["title"]),
		SourcePath:     strings.TrimSpace(source.Fields["path"]),
		Priority:       Priority(firstNonEmpty(string(input.Priority), string(PriorityNormal))),
		WorkScope:      plan.WorkScope,
		DueDate:        cloneTimePtr(input.DueDate),
	}
	applyCreateVariantAssignmentTarget(&assignment, family, input, createdVariant)
	linkCreateVariantAssignmentTarget(family, input.Locale, createdVariant, &assignment)
	if input.AssigneeID != "" {
		assignment.AssignmentType = AssignmentTypeDirect
		assignment.Status = AssignmentStatusAssigned
		assignment.AssigneeID = input.AssigneeID
		assignment.AssignerID = actorFromContext(ctx)
	} else {
		assignment.AssignmentType = AssignmentTypeOpenPool
		assignment.Status = AssignmentStatusOpen
	}
	created, inserted, err := repo.CreateOrReuseActive(ctx, assignment)
	if err != nil {
		return TranslationAssignment{}, false, err
	}
	if err := validateCreateVariantAssignmentLinked(family, input.Locale, created); err != nil {
		return TranslationAssignment{}, false, err
	}
	return created, inserted, nil
}

func applyCreateVariantAssignmentTarget(assignment *TranslationAssignment, family translationservices.FamilyRecord, input translationFamilyCreateVariantInput, createdVariant *CMSContent) {
	if assignment == nil {
		return
	}
	if createdVariant != nil {
		assignment.TargetRecordID = strings.TrimSpace(createdVariant.ID)
		if assignment.VariantID == "" {
			assignment.VariantID = translationFamilyLocaleVariantID(createdVariant.ID, input.Locale)
		}
	}
	if variant, ok := translationFamilyVariantByLocale(family, input.Locale); ok {
		assignment.VariantID = strings.TrimSpace(firstNonEmpty(variant.ID, variant.SourceRecordID, assignment.VariantID))
		assignment.TargetRecordID = strings.TrimSpace(firstNonEmpty(variant.SourceRecordID, assignment.TargetRecordID))
	}
}

func (b *translationFamilyBinding) createOrAssignFamilyAssignment(request translationFamilyCreateAssignmentRequest, family translationservices.FamilyRecord) (translationFamilyCreateAssignmentOutcome, error) {
	queueBinding := &translationQueueBinding{admin: b.admin}
	repo, err := queueBinding.assignmentRepository()
	if err != nil {
		return translationFamilyCreateAssignmentOutcome{}, err
	}
	existing, ok, err := b.activeFamilyAssignment(request.AdminCtx.Context, repo, request.Scope, family.ID, request.Input.TargetLocale, request.Input.WorkScope)
	if err != nil {
		return translationFamilyCreateAssignmentOutcome{}, err
	}
	if ok {
		updated, reused, updateErr := b.applyExistingFamilyAssignment(request, repo, existing)
		return translationFamilyCreateAssignmentOutcome{Assignment: updated, AssignmentReused: reused}, updateErr
	}
	assignment, inserted, err := b.createFamilyAssignment(request, repo, family)
	if err != nil {
		return translationFamilyCreateAssignmentOutcome{}, err
	}
	return translationFamilyCreateAssignmentOutcome{Assignment: assignment, AssignmentReused: !inserted}, nil
}

func (b *translationFamilyBinding) activeFamilyAssignment(ctx context.Context, repo TranslationAssignmentRepository, scope translationservices.Scope, familyID, targetLocale, workScope string) (TranslationAssignment, bool, error) {
	assignments, _, err := repo.List(ctx, ListOptions{
		Page:    1,
		PerPage: 200,
		SortBy:  "updated_at",
		Filters: map[string]any{
			ScopeTenantIDKey: strings.TrimSpace(scope.TenantID),
			ScopeOrgIDKey:    strings.TrimSpace(scope.OrgID),
			"family_id":      strings.TrimSpace(familyID),
			"target_locale":  strings.TrimSpace(strings.ToLower(targetLocale)),
			"work_scope":     normalizeTranslationAssignmentWorkScope(workScope),
			"status":         translationFamilyActiveAssignmentStatusFilter(),
		},
	})
	if err != nil {
		return TranslationAssignment{}, false, err
	}
	active := make([]TranslationAssignment, 0, len(assignments))
	for _, assignment := range assignments {
		if assignment.Status.IsActive() {
			active = append(active, assignment)
		}
	}
	if len(active) == 0 {
		return TranslationAssignment{}, false, nil
	}
	sort.SliceStable(active, func(i, j int) bool {
		if active[i].UpdatedAt.Equal(active[j].UpdatedAt) {
			return active[i].ID < active[j].ID
		}
		return active[i].UpdatedAt.After(active[j].UpdatedAt)
	})
	return active[0], true, nil
}

func (b *translationFamilyBinding) applyExistingFamilyAssignment(request translationFamilyCreateAssignmentRequest, repo TranslationAssignmentRepository, existing TranslationAssignment) (TranslationAssignment, bool, error) {
	queueBinding := &translationQueueBinding{admin: b.admin}
	if scopeErr := queueBinding.ensureAssignmentScope(translationIdentityFromAdminContext(request.AdminCtx), existing); scopeErr != nil {
		return TranslationAssignment{}, false, scopeErr
	}
	switch existing.Status {
	case AssignmentStatusInProgress, AssignmentStatusInReview:
		return TranslationAssignment{}, false, invalidQueueTransitionError(existing.Status, "family_assign", existing)
	case AssignmentStatusOpen:
		if request.Input.OpenPool {
			return existing, true, nil
		}
	case AssignmentStatusAssigned, AssignmentStatusChangesRequested:
		if request.Input.OpenPool {
			return TranslationAssignment{}, false, validationDomainError("existing direct assignment cannot be converted to open pool from family assignment creation", map[string]any{
				"assignment_id": strings.TrimSpace(existing.ID),
				"family_id":     strings.TrimSpace(existing.FamilyID),
				"target_locale": strings.TrimSpace(existing.TargetLocale),
				"reason_code":   ActionDisabledReasonCodeInvalidStatus,
			})
		}
	default:
		return existing, true, nil
	}
	if request.Input.AssigneeID == "" {
		return existing, true, nil
	}
	if strings.EqualFold(strings.TrimSpace(existing.AssigneeID), strings.TrimSpace(request.Input.AssigneeID)) &&
		!request.Input.PrioritySet &&
		request.Input.DueDate == nil &&
		existing.AssignmentType == AssignmentTypeDirect &&
		existing.Status == AssignmentStatusAssigned {
		return existing, true, nil
	}
	priority := Priority("")
	if request.Input.PrioritySet {
		priority = request.Input.Priority
	}
	service := &DefaultTranslationQueueService{
		Repository:    repo,
		Activity:      b.admin.ActivityFeed(),
		Notifications: b.admin.NotificationService(),
		URLs:          b.admin.URLs(),
	}
	updated, err := service.Assign(request.AdminCtx.Context, TranslationQueueAssignInput{
		AssignmentID:    strings.TrimSpace(existing.ID),
		AssigneeID:      strings.TrimSpace(request.Input.AssigneeID),
		AssignerID:      translationIdentityFromAdminContext(request.AdminCtx).ActorID,
		Priority:        priority,
		DueDate:         cloneTimePtr(request.Input.DueDate),
		ExpectedVersion: existing.Version,
	})
	if err != nil {
		return TranslationAssignment{}, false, err
	}
	return updated, true, nil
}

func (b *translationFamilyBinding) createFamilyAssignment(request translationFamilyCreateAssignmentRequest, repo TranslationAssignmentRepository, family translationservices.FamilyRecord) (TranslationAssignment, bool, error) {
	source, err := translationFamilyRequiredSourceVariant(family)
	if err != nil {
		return TranslationAssignment{}, false, err
	}
	assignment := TranslationAssignment{
		FamilyID:       strings.TrimSpace(family.ID),
		EntityType:     strings.TrimSpace(family.ContentType),
		TenantID:       strings.TrimSpace(family.TenantID),
		OrgID:          strings.TrimSpace(family.OrgID),
		SourceRecordID: strings.TrimSpace(source.SourceRecordID),
		SourceLocale:   translationFamilyAssignmentSourceLocale(family, source),
		TargetLocale:   strings.TrimSpace(strings.ToLower(request.Input.TargetLocale)),
		SourceTitle:    strings.TrimSpace(source.Fields["title"]),
		SourcePath:     strings.TrimSpace(source.Fields["path"]),
		Priority:       Priority(firstNonEmpty(string(request.Input.Priority), string(PriorityNormal))),
		WorkScope:      normalizeTranslationAssignmentWorkScope(request.Input.WorkScope),
		DueDate:        cloneTimePtr(request.Input.DueDate),
	}
	variant, ok := translationFamilyVariantByLocale(family, request.Input.TargetLocale)
	if !ok {
		return TranslationAssignment{}, false, validationDomainError("target locale variant required before assignment creation", map[string]any{
			"family_id":     family.ID,
			"target_locale": request.Input.TargetLocale,
			"reason_code":   "missing_locale_variant",
		})
	}
	assignment.VariantID = strings.TrimSpace(firstNonEmpty(variant.ID, variant.SourceRecordID))
	assignment.TargetRecordID = strings.TrimSpace(variant.SourceRecordID)
	if strings.TrimSpace(assignment.SourceRecordID) == "" {
		return TranslationAssignment{}, false, validationDomainError("family source variant missing source_record_id", map[string]any{
			"family_id": family.ID,
		})
	}
	if request.Input.OpenPool {
		assignment.AssignmentType = AssignmentTypeOpenPool
		assignment.Status = AssignmentStatusOpen
	} else {
		assignment.AssignmentType = AssignmentTypeDirect
		assignment.Status = AssignmentStatusAssigned
		assignment.AssigneeID = strings.TrimSpace(request.Input.AssigneeID)
		assignment.AssignerID = translationIdentityFromAdminContext(request.AdminCtx).ActorID
	}
	return repo.CreateOrReuseActive(request.AdminCtx.Context, assignment)
}

func (b *translationFamilyBinding) createAssignmentResponsePayload(request translationFamilyCreateAssignmentRequest, outcome translationFamilyCreateAssignmentOutcome) map[string]any {
	queueBinding := &translationQueueBinding{admin: b.admin}
	now := b.now().UTC()
	actorLabels := queueBinding.newAssignmentActorLabelResolver().labelsForAssignments(request.AdminCtx.Context, []TranslationAssignment{outcome.Assignment})
	row := queueBinding.assignmentContractRow(request.AdminCtx.Context, outcome.Assignment, now, request.Input.Channel, actorLabels)
	return map[string]any{
		"data": map[string]any{
			"assignment_id": strings.TrimSpace(outcome.Assignment.ID),
			"assignment":    row,
		},
		"meta": mergeTranslationChannelContract(map[string]any{
			"idempotency_hit":   false,
			"assignment_reused": outcome.AssignmentReused,
			"family_refresh":    true,
		}, request.Input.Channel),
	}
}

func translationCreateVariantAssignmentPayload(assignment TranslationAssignment) map[string]any {
	payload := map[string]any{
		"assignment_id": strings.TrimSpace(assignment.ID),
		"status":        translationFamilyAssignmentStatus(assignment.Status),
		"target_locale": strings.TrimSpace(strings.ToLower(assignment.TargetLocale)),
		"work_scope":    normalizeTranslationAssignmentWorkScope(assignment.WorkScope),
		"assignee_id":   strings.TrimSpace(assignment.AssigneeID),
		"priority":      strings.TrimSpace(strings.ToLower(string(assignment.Priority))),
		"due_date":      cloneTimePtr(assignment.DueDate),
	}
	if assignment.AssignedAt != nil {
		payload["assigned_at"] = cloneTimePtr(assignment.AssignedAt)
	}
	return payload
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
		"blocker_labels":                translationDashboardBlockerLabelsForFamily(family.Blockers, family.BlockerCodes),
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
	return b.lookupCreateIdempotencyRecord(recordKey, requestHash, familyID, input.IdempotencyKey, "idempotency key was already used with a different create-locale payload")
}

func (b *translationFamilyBinding) lookupCreateAssignmentIdempotency(adminCtx AdminContext, familyID string, input translationFamilyCreateAssignmentInput) (map[string]any, error) {
	if b == nil || strings.TrimSpace(input.IdempotencyKey) == "" {
		return nil, nil
	}
	recordKey := b.createAssignmentIdempotencyStoreKey(translationIdentityFromAdminContext(adminCtx).ActorID, familyID, input.IdempotencyKey)
	requestHash, err := translationFamilyCreateAssignmentRequestHash(familyID, input)
	if err != nil {
		return nil, err
	}
	return b.lookupCreateIdempotencyRecord(recordKey, requestHash, familyID, input.IdempotencyKey, "idempotency key was already used with a different family assignment payload")
}

func (b *translationFamilyBinding) lookupCreateIdempotencyRecord(recordKey, requestHash, familyID, idempotencyKey, conflictMessage string) (map[string]any, error) {
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
		return nil, NewDomainError(string(translationcore.ErrorVersionConflict), conflictMessage, map[string]any{
			"family_id":        familyID,
			"idempotency_key":  idempotencyKey,
			"expected_request": record.RequestHash,
			"actual_request":   requestHash,
		})
	}
	out := cloneAnyMap(record.Payload)
	meta := translationFamilyPayloadMap(out, "meta")
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

func (b *translationFamilyBinding) storeCreateAssignmentIdempotency(adminCtx AdminContext, familyID string, input translationFamilyCreateAssignmentInput, payload map[string]any) error {
	if b == nil || strings.TrimSpace(input.IdempotencyKey) == "" {
		return nil
	}
	requestHash, err := translationFamilyCreateAssignmentRequestHash(familyID, input)
	if err != nil {
		return err
	}
	recordKey := b.createAssignmentIdempotencyStoreKey(translationIdentityFromAdminContext(adminCtx).ActorID, familyID, input.IdempotencyKey)
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
	data := extractMap(payload["data"])
	if input.AutoCreateAssignment && data != nil && data["assignment"] == nil {
		if assignment, ok := translationFamilyReplayAssignment(family, input.Locale, translationFamilyDefaultWorkScope(family)); ok {
			data["assignment"] = translationCreateVariantAssignmentPayload(assignment)
		}
	}
	meta := translationFamilyPayloadMap(payload, "meta")
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
		"variant",
		strings.TrimSpace(actorID),
		strings.TrimSpace(familyID),
		strings.TrimSpace(idempotencyKey),
	}, "|")
}

func (b *translationFamilyBinding) createAssignmentIdempotencyStoreKey(actorID, familyID, idempotencyKey string) string {
	return strings.Join([]string{
		"assignment",
		strings.TrimSpace(actorID),
		strings.TrimSpace(familyID),
		strings.TrimSpace(idempotencyKey),
	}, "|")
}

func translationFamilyCreateVariantRequestHash(familyID string, input translationFamilyCreateVariantInput) (string, error) {
	payload := map[string]any{
		"family_id":              strings.TrimSpace(familyID),
		"channel":                strings.TrimSpace(input.Environment),
		"locale":                 strings.TrimSpace(strings.ToLower(input.Locale)),
		"auto_create_assignment": input.AutoCreateAssignment,
		"assignee_id":            strings.TrimSpace(input.AssigneeID),
		"priority":               strings.TrimSpace(strings.ToLower(string(input.Priority))),
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

func translationFamilyCreateAssignmentRequestHash(familyID string, input translationFamilyCreateAssignmentInput) (string, error) {
	payload := map[string]any{
		"family_id":     strings.TrimSpace(familyID),
		"channel":       strings.TrimSpace(input.Channel),
		"target_locale": strings.TrimSpace(strings.ToLower(input.TargetLocale)),
		"assignee_id":   strings.TrimSpace(input.AssigneeID),
		"open_pool":     input.OpenPool,
		"priority":      strings.TrimSpace(strings.ToLower(string(input.Priority))),
		"work_scope":    normalizeTranslationAssignmentWorkScope(input.WorkScope),
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
	data := translationFamilyPayloadMap(payload, "data")
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

func translationContentNavigationPayloadForRecord(contentType, recordID, locale, channel, basePath string, access ...translationContentNavigationAccess) map[string]any {
	if strings.TrimSpace(recordID) == "" || strings.TrimSpace(contentType) == "" {
		return nil
	}
	navAccess := translationContentNavigationAccess{CanView: true, CanEdit: true}
	if len(access) > 0 {
		navAccess = access[0]
	}
	base := strings.TrimRight(strings.TrimSpace(firstNonEmpty(basePath, "/admin")), "/")
	if base == "" {
		base = "/admin"
	}
	contentBase := base + "/content/" + neturl.PathEscape(strings.TrimSpace(contentType)) + "/" + neturl.PathEscape(strings.TrimSpace(recordID))
	detailURL := ""
	if navAccess.CanView {
		detailURL = translationContentNavigationURL(contentBase, locale, channel)
	}
	editURL := ""
	if navAccess.CanEdit {
		editURL = translationContentNavigationURL(contentBase+"/edit", locale, channel)
	}
	if detailURL == "" && editURL == "" {
		return nil
	}
	out := map[string]any{
		"content_type":       strings.TrimSpace(contentType),
		"record_id":          strings.TrimSpace(recordID),
		"locale":             strings.TrimSpace(locale),
		"channel":            strings.TrimSpace(channel),
		"detail_url":         detailURL,
		"edit_url":           editURL,
		"content_detail_url": detailURL,
		"content_edit_url":   editURL,
		"can_view":           navAccess.CanView,
		"can_edit":           navAccess.CanEdit,
	}
	if navAccess.Resource != "" {
		out["resource"] = navAccess.Resource
	}
	if navAccess.ViewPermission != "" {
		out["view_permission"] = navAccess.ViewPermission
	}
	if navAccess.EditPermission != "" {
		out["edit_permission"] = navAccess.EditPermission
	}
	if !navAccess.CanEdit && navAccess.Reason != "" {
		out["edit_disabled_reason"] = navAccess.Reason
		out["edit_disabled_reason_code"] = navAccess.ReasonCode
	}
	return out
}

func translationContentNavigationURL(baseURL, locale, channel string) string {
	baseURL = strings.TrimSpace(baseURL)
	if baseURL == "" {
		return ""
	}
	query := neturl.Values{}
	if locale = strings.TrimSpace(locale); locale != "" {
		query.Set("locale", locale)
	}
	if channel = strings.TrimSpace(channel); channel != "" {
		query.Set("channel", channel)
	}
	if encoded := query.Encode(); encoded != "" {
		return baseURL + "?" + encoded
	}
	return baseURL
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
	if translationFamilyCreateVariantReplayExpired(b.now(), toString(replay[translationFamilyCreateVariantMetadataCreatedAtKey])) {
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

func translationFamilyPayloadMap(payload map[string]any, key string) map[string]any {
	if payload == nil {
		return map[string]any{}
	}
	if value, ok := payload[key].(map[string]any); ok {
		return value
	}
	value := map[string]any{}
	payload[key] = value
	return value
}

func translationFamilyCreateVariantReplayExpired(now time.Time, rawCreatedAt string) bool {
	createdAt, err := time.Parse(time.RFC3339, strings.TrimSpace(rawCreatedAt))
	return err != nil || now.Sub(createdAt.UTC()) > translationFamilyCreateVariantIdempotencyTTL
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
				ID:           strings.TrimSpace(item.ID),
				FamilyID:     strings.TrimSpace(item.FamilyID),
				SourceLocale: strings.TrimSpace(strings.ToLower(item.SourceLocale)),
				TargetLocale: strings.TrimSpace(strings.ToLower(item.TargetLocale)),
				WorkScope:    normalizeTranslationAssignmentWorkScope(item.WorkScope),
				Status:       AssignmentStatus(strings.TrimSpace(strings.ToLower(item.Status))),
				AssigneeID:   strings.TrimSpace(item.AssigneeID),
				Priority:     Priority(strings.TrimSpace(strings.ToLower(item.Priority))),
				DueDate:      cloneTimePtr(item.DueDate),
				CreatedAt:    item.CreatedAt,
				UpdatedAt:    item.UpdatedAt,
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
	if IsCMSPagePolicyEntity(contentType) || IsCMSPageContentTypeSlug(contentType) {
		return b.admin.contentSvc.DeletePage(ctx, recordID)
	}
	return b.admin.contentSvc.DeleteContent(ctx, recordID)
}

func (b *translationFamilyBinding) rollbackCreatedFamilyVariant(ctx context.Context, created *CMSContent, cause error, environment string) error {
	if rollbackErr := b.deleteFamilyVariant(ctx, created); rollbackErr != nil {
		return translationFamilyRollbackError(cause, rollbackErr)
	}
	if syncErr := SyncTranslationFamilyStore(ctx, b.admin, environment); syncErr != nil {
		return translationFamilyRollbackError(cause, syncErr)
	}
	return cause
}

func (b *translationFamilyBinding) recordCreateVariantActivity(ctx context.Context, actorID string, familyBefore, familyAfter translationservices.FamilyRecord, input translationFamilyCreateVariantInput, outcome translationFamilyCreateVariantOutcome) {
	if b == nil || b.admin == nil || b.admin.activity == nil {
		return
	}
	variant, ok := translationFamilyVariantByLocale(familyAfter, input.Locale)
	if ok {
		if err := b.admin.activity.Record(ctx, ActivityEntry{
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
		}); err != nil {
			return
		}
	}
	if !equalStringSlices(familyBefore.BlockerCodes, familyAfter.BlockerCodes) ||
		familyBefore.MissingRequiredLocaleCount != familyAfter.MissingRequiredLocaleCount ||
		familyBefore.PendingReviewCount != familyAfter.PendingReviewCount ||
		familyBefore.OutdatedLocaleCount != familyAfter.OutdatedLocaleCount {
		if err := b.admin.activity.Record(ctx, ActivityEntry{
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
		}); err != nil {
			return
		}
	}
	if outcome.Assignment != nil {
		if err := b.admin.activity.Record(ctx, ActivityEntry{
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
		}); err != nil {
			return
		}
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
	return translationservices.FamilyPolicy{
		ContentType:             contentType,
		Environment:             environment,
		SourceLocale:            translationFamilyPolicySourceLocale(req, b.admin.config.DefaultLocale),
		RequiredLocales:         append([]string{}, req.Locales...),
		RequiredFields:          cloneRequiredFieldsString(req.RequiredFields),
		ReviewRequired:          req.ReviewRequired,
		AllowPublishOverride:    req.AllowPublishOverride,
		AssignmentLifecycleMode: req.AssignmentLifecycleMode,
		DefaultWorkScope:        normalizeTranslationAssignmentWorkScope(req.DefaultWorkScope),
	}, true
}

func (b *translationFamilyBinding) policyLocales(ctx context.Context, environment string) []string {
	contentTypes := []string{CMSPagePolicyEntity}
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
		familyID := strings.TrimSpace(assignment.FamilyID)
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
			AssignerID:   strings.TrimSpace(assignment.AssignerID),
			ReviewerID:   strings.TrimSpace(firstNonEmpty(assignment.ReviewerID, assignment.LastReviewerID)),
			Priority:     strings.TrimSpace(strings.ToLower(string(assignment.Priority))),
			WorkScope:    normalizeTranslationAssignmentWorkScope(assignment.WorkScope),
			DueDate:      cloneTimePtr(assignment.DueDate),
			AssignedAt:   cloneTimePtr(assignment.AssignedAt),
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
		ScopeTenantIDKey:                family.TenantID,
		ScopeOrgIDKey:                   family.OrgID,
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
		"blocker_labels":                translationDashboardBlockerLabelsForFamily(family.Blockers, family.BlockerCodes),
		"missing_locales":               translationFamilyMissingLocales(family),
		"available_locales":             translationFamilyAvailableLocales(family),
		"quick_create":                  translationReadinessQuickCreatePayloadMap(quickCreate),
		"updated_at":                    family.UpdatedAt,
		"created_at":                    family.CreatedAt,
	}
}

func translationFamilyBlockerIsPolicyUnavailable(blocker translationservices.FamilyBlocker) bool {
	if strings.TrimSpace(strings.ToLower(blocker.BlockerCode)) != string(translationcore.FamilyBlockerPolicyDenied) {
		return false
	}
	reason := translationFamilyBlockerDetailString(blocker, translationcore.FamilyBlockerDetailReason)
	reasonCode := translationFamilyBlockerDetailString(blocker, translationcore.FamilyBlockerDetailReasonCode)
	if reason == string(translationcore.FamilyBlockerReasonPolicyUnavailable) || reasonCode == string(translationcore.FamilyBlockerReasonPolicyUnavailable) {
		return true
	}
	if reason == string(translationcore.FamilyBlockerReasonHostPolicy) || reasonCode == string(translationcore.FamilyBlockerReasonHostPolicy) {
		return false
	}
	if reason != "" || reasonCode != "" {
		return false
	}
	if translationFamilyBlockerDetailString(blocker, translationcore.FamilyBlockerDetailMessage) != "" || translationFamilyBlockerDetailString(blocker, "policy_reason") != "" {
		return false
	}
	return translationFamilyBlockerDetailString(blocker, translationcore.FamilyBlockerDetailContentType) != "" ||
		translationFamilyBlockerDetailString(blocker, translationcore.FamilyBlockerDetailEnvironment) != ""
}

func translationFamilyBlockerDetailString(blocker translationservices.FamilyBlocker, key string) string {
	if blocker.Details == nil {
		return ""
	}
	return strings.TrimSpace(strings.ToLower(toString(blocker.Details[key])))
}

func (b *translationFamilyBinding) translationFamilyDetailPayload(ctx context.Context, family translationservices.FamilyRecord, channel string) map[string]any {
	payload := translationFamilyDetailPayload(family, channel, b.admin)
	assignments := b.familyDetailAssignments(ctx, family)
	if len(assignments) == 0 {
		payload["locale_assignments"] = b.familyLocaleAssignmentsPayload(ctx, family, nil, channel)
		return payload
	}
	queueBinding := &translationQueueBinding{admin: b.admin}
	now := b.now().UTC()
	actorLabels := queueBinding.newAssignmentActorLabelResolver().labelsForAssignments(ctx, assignments)
	activeRows := make([]map[string]any, 0, len(assignments))
	for _, assignment := range assignments {
		if !assignment.Status.IsActive() {
			continue
		}
		row := queueBinding.assignmentContractRow(ctx, assignment, now, channel, actorLabels)
		b.decorateFamilyAssignmentRow(ctx, row, assignment)
		activeRows = append(activeRows, row)
	}
	payload["active_assignments"] = activeRows
	payload["locale_assignments"] = b.familyLocaleAssignmentsPayload(ctx, family, assignments, channel)
	return payload
}

func (b *translationFamilyBinding) familyDetailAssignments(ctx context.Context, family translationservices.FamilyRecord) []TranslationAssignment {
	queueBinding := &translationQueueBinding{admin: b.admin}
	repo, err := queueBinding.assignmentRepository()
	if err != nil || repo == nil {
		return nil
	}
	assignments, _, err := repo.List(ctx, ListOptions{
		Page:    1,
		PerPage: 500,
		SortBy:  "updated_at",
		Filters: map[string]any{
			ScopeTenantIDKey: strings.TrimSpace(family.TenantID),
			ScopeOrgIDKey:    strings.TrimSpace(family.OrgID),
			"family_id":      strings.TrimSpace(family.ID),
			"status":         translationFamilyActiveAssignmentStatusFilter(),
		},
	})
	if err != nil {
		return nil
	}
	sort.SliceStable(assignments, func(i, j int) bool {
		if assignments[i].UpdatedAt.Equal(assignments[j].UpdatedAt) {
			return assignments[i].ID < assignments[j].ID
		}
		return assignments[i].UpdatedAt.After(assignments[j].UpdatedAt)
	})
	return assignments
}

func (b *translationFamilyBinding) decorateFamilyAssignmentRow(ctx context.Context, row map[string]any, assignment TranslationAssignment) {
	if row == nil {
		return
	}
	b.decorateFamilyAssignmentAssignee(ctx, row, assignment)
	assignerID := b.decorateFamilyAssignmentAssigner(ctx, row, assignment)
	decorateFamilyAssignmentDates(row, assignment)
	if sentence := translationFamilyAssignmentActivitySentence(row); sentence != "" {
		row["activity_sentence"] = sentence
	}
	decorateFamilyAssignmentReviewer(row, assignment)
	b.decorateFamilyAssignmentLinks(row, assignment)
	b.decorateFamilyAssignmentActions(row, assignment)
	if strings.TrimSpace(toString(row["display_assigner"])) == "" {
		row["display_assigner"] = translationFamilyActorFallback(assignerID, "System")
	}
}

func (b *translationFamilyBinding) decorateFamilyAssignmentAssignee(ctx context.Context, row map[string]any, assignment TranslationAssignment) string {
	assigneeID := strings.TrimSpace(assignment.AssigneeID)
	if assigneeID != "" && strings.TrimSpace(toString(row["assignee_label"])) == "" {
		row["assignee_label"] = assigneeID
	}
	if assigneeID != "" {
		if label := b.familyActorDisplayLabel(ctx, assigneeID); label != "" {
			row["display_assignee"] = label
			// Link to the user profile only when the assignee resolves to a
			// known user; dangling IDs keep the plain truncated fallback.
			if href := translationUserProfileURL(b.admin, assigneeID); href != "" {
				row["assignee_href"] = href
			}
		}
	}
	return assigneeID
}

func translationUserProfileURL(adm *Admin, userID string) string {
	userID = strings.TrimSpace(userID)
	if adm == nil || userID == "" {
		return ""
	}
	if href := resolveURLWith(adm.URLs(), "admin", "users.id", map[string]string{"id": userID}, nil); href != "" {
		return href
	}
	base := strings.TrimRight(strings.TrimSpace(firstNonEmpty(adm.config.BasePath, "/admin")), "/")
	if base == "" {
		base = "/admin"
	}
	return base + "/users/" + userID
}

func (b *translationFamilyBinding) decorateFamilyAssignmentAssigner(ctx context.Context, row map[string]any, assignment TranslationAssignment) string {
	assignerID := strings.TrimSpace(assignment.AssignerID)
	if assignerID != "" {
		row["assigner_id"] = assignerID
		if label := b.familyActorDisplayLabel(ctx, assignerID); label != "" {
			row["display_assigner"] = label
		}
	}
	return assignerID
}

func decorateFamilyAssignmentDates(row map[string]any, assignment TranslationAssignment) {
	if assignment.AssignedAt != nil {
		row["assigned_at"] = cloneTimePtr(assignment.AssignedAt)
		row["display_assigned_at"] = translationSSRFormatDate(assignment.AssignedAt)
	} else if !assignment.CreatedAt.IsZero() {
		row["display_assigned_at"] = translationSSRFormatDate(assignment.CreatedAt)
		row["assigned_at_legacy_fallback"] = true
	}
}

func decorateFamilyAssignmentReviewer(row map[string]any, assignment TranslationAssignment) {
	reviewerID := strings.TrimSpace(firstNonEmpty(assignment.ReviewerID, assignment.LastReviewerID))
	if reviewerID != "" && strings.TrimSpace(toString(row["reviewer_label"])) == "" {
		row["reviewer_label"] = reviewerID
	}
}

func (b *translationFamilyBinding) decorateFamilyAssignmentLinks(row map[string]any, assignment TranslationAssignment) {
	if href := translationAssignmentEditorURL(b.admin, assignment.ID); href != "" {
		row["links"] = map[string]any{
			"editor": translationFamilyEditorLink(assignment.ID, href),
		}
	}
}

func (b *translationFamilyBinding) decorateFamilyAssignmentActions(row map[string]any, assignment TranslationAssignment) {
	if actions := extractMap(row["actions"]); len(actions) > 0 {
		if claim := extractMap(actions["claim"]); len(claim) > 0 {
			if endpoint := b.assignmentActionEndpoint(assignment.ID, "claim"); endpoint != "" {
				claim["endpoint"] = endpoint
			}
			claim["required_fields"] = []string{"expected_version"}
			actions["claim"] = claim
		}
		row["actions"] = actions
	}
}

func translationFamilyActorFallback(id, fallback string) string {
	id = strings.TrimSpace(id)
	if id == "" || id == "__me__" || id == "__missing_actor__" {
		return strings.TrimSpace(fallback)
	}
	if len(id) > 12 {
		return id[:8] + "..."
	}
	return id
}

func translationFamilyAssignmentActivitySentence(row map[string]any) string {
	if row == nil {
		return ""
	}
	assigner := strings.TrimSpace(firstNonEmpty(toString(row["display_assigner"]), translationFamilyActorFallback(toString(row["assigner_id"]), "System")))
	locale := strings.ToUpper(strings.TrimSpace(firstNonEmpty(toString(row["target_locale"]), toString(row["locale"]))))
	assignee := translationFamilyDisplayActorLabel(
		toString(row["display_assignee"]),
		toString(row["assignee_label"]),
		toString(row["assignee_id"]),
		"Unassigned",
	)
	if assigner == "" || locale == "" || assignee == "" {
		return ""
	}
	if date := strings.TrimSpace(toString(row["display_assigned_at"])); date != "" {
		if toBool(row["assigned_at_legacy_fallback"]) {
			return fmt.Sprintf("%s assigned %s to %s; created %s", assigner, locale, assignee, date)
		}
		return fmt.Sprintf("%s assigned %s to %s on %s", assigner, locale, assignee, date)
	}
	return fmt.Sprintf("%s assigned %s to %s", assigner, locale, assignee)
}

func translationFamilyDisplayActorLabel(display, label, id, fallback string) string {
	id = strings.TrimSpace(id)
	for _, candidate := range []string{display, label} {
		candidate = strings.TrimSpace(candidate)
		if candidate != "" && !strings.EqualFold(candidate, id) {
			return candidate
		}
	}
	return translationFamilyActorFallback(id, fallback)
}

func (b *translationFamilyBinding) familyActorDisplayLabel(ctx context.Context, id string) string {
	id = strings.TrimSpace(id)
	if b == nil || b.admin == nil || id == "" {
		return ""
	}
	if b.admin.users != nil {
		user, err := b.admin.users.GetUser(ctx, id)
		if err == nil && strings.TrimSpace(user.ID) != "" {
			return translationFamilyActorDisplayLabelForContext(ctx, id, userToRecord(user))
		}
	}
	if b.admin.registry != nil {
		usersPanel, ok := b.admin.registry.Panel(usersModuleID)
		if ok && usersPanel != nil && usersPanel.repo != nil {
			record, err := usersPanel.repo.Get(ctx, id)
			if err == nil && len(record) > 0 {
				return translationFamilyActorDisplayLabelForContext(ctx, id, record)
			}
		}
	}
	if label := translationFamilyCurrentActorDisplayLabel(ctx, id); label != "" {
		return label
	}
	return ""
}

func translationFamilyActorDisplayLabelForContext(ctx context.Context, id string, record map[string]any) string {
	if len(record) == 0 {
		return ""
	}
	if current := translationFamilyCurrentActorRecord(ctx, id); len(current) > 0 {
		record = translationFamilyMergeMissingActorRecord(record, current)
	}
	return translationFamilyActorDisplayLabelFromRecord(record)
}

func translationFamilyCurrentActorDisplayLabel(ctx context.Context, id string) string {
	record := translationFamilyCurrentActorRecord(ctx, id)
	if len(record) == 0 {
		return ""
	}
	label := translationFamilyActorDisplayLabelFromRecord(record)
	if label != "" && !strings.EqualFold(label, strings.TrimSpace(id)) {
		return label
	}
	return ""
}

func translationFamilyCurrentActorRecord(ctx context.Context, id string) map[string]any {
	id = strings.TrimSpace(id)
	if ctx == nil || id == "" {
		return nil
	}
	record := map[string]any{}
	if actor, ok := auth.ActorFromContext(ctx); ok && translationFamilyActorMatchesID(actor, id) {
		record = translationFamilyMergeMissingActorRecord(record, translationFamilyActorContextRecord(actor))
	}
	if claims, ok := auth.GetClaims(ctx); ok && claims != nil && translationFamilyClaimsMatchID(claims, id) {
		claimsRecord := map[string]any{
			"id": id,
		}
		if carrier, ok := claims.(interface{ ClaimsMetadata() map[string]any }); ok && carrier != nil {
			maps.Copy(claimsRecord, carrier.ClaimsMetadata())
		}
		record = translationFamilyMergeMissingActorRecord(record, claimsRecord)
	}
	return record
}

func translationFamilyMergeMissingActorRecord(base, fallback map[string]any) map[string]any {
	if len(base) == 0 && len(fallback) == 0 {
		return nil
	}
	out := make(map[string]any, len(base)+len(fallback))
	maps.Copy(out, base)
	for key, value := range fallback {
		if strings.TrimSpace(toString(out[key])) == "" && strings.TrimSpace(toString(value)) != "" {
			out[key] = value
		}
	}
	return out
}

func translationFamilyActorMatchesID(actor *auth.ActorContext, id string) bool {
	if actor == nil {
		return false
	}
	return strings.EqualFold(strings.TrimSpace(actor.ActorID), id) || strings.EqualFold(strings.TrimSpace(actor.Subject), id)
}

func translationFamilyClaimsMatchID(claims auth.AuthClaims, id string) bool {
	if claims == nil {
		return false
	}
	return strings.EqualFold(strings.TrimSpace(claims.UserID()), id) || strings.EqualFold(strings.TrimSpace(claims.Subject()), id)
}

func translationFamilyActorContextRecord(actor *auth.ActorContext) map[string]any {
	record := map[string]any{}
	if actor == nil {
		return record
	}
	maps.Copy(record, actor.Metadata)
	record["id"] = firstNonEmpty(strings.TrimSpace(actor.ActorID), strings.TrimSpace(actor.Subject))
	if _, ok := record["role"]; !ok && strings.TrimSpace(actor.Role) != "" {
		record["role"] = strings.TrimSpace(actor.Role)
	}
	return record
}

func translationFamilyActorDisplayLabelFromRecord(record map[string]any) string {
	if len(record) == 0 {
		return ""
	}
	displayName := strings.TrimSpace(firstNonEmpty(
		toString(record["display_name"]),
		toString(record["full_name"]),
		toString(record["name"]),
		toString(record["username"]),
	))
	email := strings.TrimSpace(toString(record["email"]))
	if displayName == "" {
		return email
	}
	if email == "" || strings.EqualFold(displayName, email) {
		return displayName
	}
	return displayName + " <" + email + ">"
}

func (b *translationFamilyBinding) familyLocaleAssignmentsPayload(ctx context.Context, family translationservices.FamilyRecord, assignments []TranslationAssignment, channel string) map[string]any {
	workScope := translationFamilyDefaultWorkScope(family)
	assignmentsByKey := map[string]TranslationAssignment{}
	// Most recent active assignment per locale regardless of work scope:
	// locale rows must surface assignments whose scope differs from the
	// family default, otherwise they render as unassigned.
	assignmentsByLocale := map[string]TranslationAssignment{}
	for _, assignment := range assignments {
		if !assignment.Status.IsActive() {
			continue
		}
		key := translationFamilyLocaleAssignmentKey(assignment.TargetLocale, assignment.WorkScope)
		if _, exists := assignmentsByKey[key]; !exists {
			assignmentsByKey[key] = assignment
		}
		locale := strings.TrimSpace(strings.ToLower(assignment.TargetLocale))
		if locale != "" {
			if _, exists := assignmentsByLocale[locale]; !exists {
				assignmentsByLocale[locale] = assignment
			}
		}
	}
	locales := map[string]translationservices.FamilyVariant{}
	for _, variant := range family.Variants {
		locale := strings.TrimSpace(strings.ToLower(variant.Locale))
		if locale != "" {
			locales[locale] = variant
		}
	}
	for _, assignment := range assignments {
		locale := strings.TrimSpace(strings.ToLower(assignment.TargetLocale))
		if locale != "" {
			locales[locale] = translationservices.FamilyVariant{
				ID:                   strings.TrimSpace(assignment.VariantID),
				FamilyID:             strings.TrimSpace(assignment.FamilyID),
				TenantID:             strings.TrimSpace(assignment.TenantID),
				OrgID:                strings.TrimSpace(assignment.OrgID),
				Locale:               locale,
				SourceRecordID:       strings.TrimSpace(assignment.TargetRecordID),
				SourceHashAtLastSync: "",
			}
		}
	}
	keys := make([]string, 0, len(locales))
	for locale := range locales {
		keys = append(keys, locale)
	}
	sort.Strings(keys)
	out := map[string]any{}
	for _, locale := range keys {
		variant := locales[locale]
		scope := workScope
		if assignment, ok := assignmentsByLocale[locale]; ok {
			scope = normalizeTranslationAssignmentWorkScope(assignment.WorkScope)
		}
		key := translationFamilyLocaleAssignmentKey(locale, scope)
		assignment, hasAssignment := assignmentsByKey[key]
		out[key] = b.familyLocaleAssignmentPayload(ctx, family, variant, assignment, hasAssignment, scope, channel)
	}
	return out
}

func (b *translationFamilyBinding) familyLocaleAssignmentPayload(
	ctx context.Context,
	family translationservices.FamilyRecord,
	variant translationservices.FamilyVariant,
	assignment TranslationAssignment,
	hasAssignment bool,
	workScope string,
	channel string,
) map[string]any {
	state := b.familyLocaleAssignmentState(ctx, family, variant, assignment, hasAssignment)
	payload := map[string]any{
		"locale":     strings.TrimSpace(strings.ToLower(variant.Locale)),
		"work_scope": normalizeTranslationAssignmentWorkScope(workScope),
		"state":      state,
		"actions":    b.familyLocaleAssignmentActions(ctx, family, variant, assignment, hasAssignment, state),
	}
	if hasAssignment {
		queueBinding := &translationQueueBinding{admin: b.admin}
		labels := queueBinding.newAssignmentActorLabelResolver().labelsForAssignments(ctx, []TranslationAssignment{assignment})
		row := queueBinding.assignmentContractRow(ctx, assignment, b.now().UTC(), channel, labels)
		b.decorateFamilyAssignmentRow(ctx, row, assignment)
		payload["assignment"] = row
	}
	return payload
}

func (b *translationFamilyBinding) familyLocaleAssignmentState(ctx context.Context, family translationservices.FamilyRecord, variant translationservices.FamilyVariant, assignment TranslationAssignment, hasAssignment bool) string {
	locale := strings.TrimSpace(strings.ToLower(variant.Locale))
	if sourceLocale := translationFamilyCanonicalSourceLocale(family); sourceLocale != "" && strings.EqualFold(locale, sourceLocale) {
		if hasAssignment {
			return "invalid_source_assignment"
		}
		return "source_locale"
	}
	if !hasAssignment {
		return "unassigned"
	}
	switch assignment.Status {
	case AssignmentStatusOpen:
		return "open_pool"
	case AssignmentStatusAssigned, AssignmentStatusChangesRequested:
		actorID := strings.TrimSpace(actorFromContext(ctx))
		if actorID != "" && strings.EqualFold(strings.TrimSpace(assignment.AssigneeID), actorID) {
			return "assigned_to_me"
		}
		return "assigned_to_other"
	case AssignmentStatusInProgress:
		return "in_progress"
	case AssignmentStatusInReview:
		return "in_review"
	default:
		return "terminal"
	}
}

func (b *translationFamilyBinding) familyLocaleAssignmentActions(ctx context.Context, family translationservices.FamilyRecord, variant translationservices.FamilyVariant, assignment TranslationAssignment, hasAssignment bool, state string) map[string]any {
	return map[string]any{
		"assign_to_me":   b.familyAssignActionState(ctx, family, variant, assignment, hasAssignment, state, true),
		"assign_to_user": b.familyAssignActionState(ctx, family, variant, assignment, hasAssignment, state, false),
		"claim":          b.familyClaimActionState(ctx, assignment, hasAssignment),
		"open_editor":    b.familyOpenEditorActionState(assignment, hasAssignment),
	}
}

func (b *translationFamilyBinding) familyAssignActionState(ctx context.Context, family translationservices.FamilyRecord, variant translationservices.FamilyVariant, assignment TranslationAssignment, hasAssignment bool, state string, self bool) map[string]any {
	decision := b.familyAssignActionDecision(ctx, state, self)
	out := map[string]any{
		"enabled":    decision.Enabled,
		"permission": decision.Permission,
	}
	if decision.QueueEnabled {
		if endpoint := b.familyAssignmentEndpoint(family.ID); endpoint != "" {
			out["endpoint"] = endpoint
		}
	}
	if _, ok := out["endpoint"]; !ok && decision.Enabled {
		decision.Enabled = false
		out["enabled"] = false
		decision.Reason = "family assignment route is unavailable"
		decision.ReasonCode = ActionDisabledReasonCodeFeatureDisabled
	}
	required := []string{"target_locale"}
	if !self {
		required = append(required, "assignee_id")
	}
	out["required_fields"] = required
	payload := map[string]any{
		"target_locale": strings.TrimSpace(strings.ToLower(variant.Locale)),
		"work_scope":    normalizeTranslationAssignmentWorkScope(firstNonEmpty(assignment.WorkScope, translationFamilyDefaultWorkScope(family))),
	}
	if self && decision.ActorID != "" {
		payload["assignee_id"] = decision.ActorID
	}
	out["payload"] = payload
	if !decision.Enabled {
		out["reason"] = decision.Reason
		out["reason_code"] = decision.ReasonCode
	}
	if hasAssignment {
		out["assignment_id"] = strings.TrimSpace(assignment.ID)
		out["expected_version"] = assignment.Version
	}
	return out
}

func (b *translationFamilyBinding) familyAssignActionDecision(ctx context.Context, state string, self bool) translationFamilyAssignActionDecision {
	permission := PermAdminTranslationsAssign
	actorID := strings.TrimSpace(actorFromContext(ctx))
	allowed := permissionAllowed(b.admin.Authorizer(), ctx, permission, "translations")
	queueEnabled := b.translationQueueActionsEnabled()
	decision := translationFamilyAssignActionDecision{
		Enabled:      queueEnabled && allowed && (!self || actorID != ""),
		QueueEnabled: queueEnabled,
		Permission:   permission,
		ActorID:      actorID,
	}
	if reason, code, blocked := translationFamilyAssignPrerequisiteBlocker(queueEnabled, allowed, self, actorID); blocked {
		decision.Enabled = false
		decision.Reason = reason
		decision.ReasonCode = code
		return decision
	}
	if reason, code, blocked := translationFamilyAssignStateBlocker(state, self); blocked {
		decision.Enabled = false
		decision.Reason = reason
		decision.ReasonCode = code
	}
	return decision
}

func translationFamilyAssignPrerequisiteBlocker(queueEnabled, allowed, self bool, actorID string) (string, string, bool) {
	if !queueEnabled {
		return "translation queue feature is disabled", ActionDisabledReasonCodeFeatureDisabled, true
	}
	if !allowed {
		return "missing permission: " + PermAdminTranslationsAssign, ActionDisabledReasonCodePermissionDenied, true
	}
	if self && actorID == "" {
		return "current user identity is required", ActionDisabledReasonCodePermissionDenied, true
	}
	return "", "", false
}

func translationFamilyAssignStateBlocker(state string, self bool) (string, string, bool) {
	switch state {
	case "source_locale":
		return "source locale does not need assignment", ActionDisabledReasonCodeInvalidStatus, true
	case "invalid_source_assignment":
		return "source locale assignment must be resolved from the queue", ActionDisabledReasonCodeInvalidStatus, true
	case "in_progress":
		return "assignment is already in progress", ActionDisabledReasonCodeInvalidStatus, true
	case "in_review":
		return "assignment is already in review", ActionDisabledReasonCodeInvalidStatus, true
	case "assigned_to_me":
		if self {
			return "assignment already belongs to you", "already_assigned", true
		}
	}
	return "", "", false
}

func (b *translationFamilyBinding) familyClaimActionState(ctx context.Context, assignment TranslationAssignment, hasAssignment bool) map[string]any {
	if !b.translationQueueActionsEnabled() {
		return map[string]any{
			"enabled":     false,
			"permission":  PermAdminTranslationsClaim,
			"reason":      "translation queue feature is disabled",
			"reason_code": ActionDisabledReasonCodeFeatureDisabled,
		}
	}
	if !hasAssignment {
		return map[string]any{
			"enabled":     false,
			"permission":  PermAdminTranslationsClaim,
			"reason":      "no active assignment to claim",
			"reason_code": ActionDisabledReasonCodeInvalidStatus,
		}
	}
	queueBinding := &translationQueueBinding{admin: b.admin}
	state := queueBinding.claimActionState(ctx, assignment)
	if actorID := strings.TrimSpace(actorFromContext(ctx)); actorID != "" && strings.EqualFold(strings.TrimSpace(assignment.AssigneeID), actorID) {
		state["enabled"] = false
		state["reason"] = "assignment already belongs to you"
		state["reason_code"] = "already_assigned"
	}
	if endpoint := b.assignmentActionEndpoint(assignment.ID, "claim"); endpoint != "" {
		state["endpoint"] = endpoint
	}
	state["required_fields"] = []string{"expected_version"}
	state["assignment_id"] = strings.TrimSpace(assignment.ID)
	state["expected_version"] = assignment.Version
	return state
}

func (b *translationFamilyBinding) familyOpenEditorActionState(assignment TranslationAssignment, hasAssignment bool) map[string]any {
	if !b.translationQueueActionsEnabled() {
		return map[string]any{
			"enabled":     false,
			"label":       "Open editor",
			"reason":      "translation queue feature is disabled",
			"reason_code": ActionDisabledReasonCodeFeatureDisabled,
		}
	}
	if !hasAssignment {
		return map[string]any{
			"enabled":     false,
			"reason":      "no active assignment to open",
			"reason_code": ActionDisabledReasonCodeInvalidStatus,
		}
	}
	href := translationAssignmentEditorURL(b.admin, assignment.ID)
	out := map[string]any{
		"enabled": href != "",
		"label":   "Open editor",
	}
	if href != "" {
		out["href"] = href
		out["link"] = translationFamilyEditorLink(assignment.ID, href)
	} else {
		out["reason"] = "assignment editor route is unavailable"
		out["reason_code"] = ActionDisabledReasonCodeFeatureDisabled
	}
	return out
}

func (b *translationFamilyBinding) familyAssignmentEndpoint(familyID string) string {
	if endpoint := resolveURLWith(b.admin.URLs(), adminAPIGroupName(b.admin.config), "translations.families.assignments", map[string]string{
		"family_id": strings.TrimSpace(familyID),
	}, nil); endpoint != "" {
		return endpoint
	}
	base := strings.TrimRight(strings.TrimSpace(firstNonEmpty(adminAPIBasePath(b.admin), "/admin/api")), "/")
	return base + "/translations/families/" + neturl.PathEscape(strings.TrimSpace(familyID)) + "/assignments"
}

func (b *translationFamilyBinding) assignmentActionEndpoint(assignmentID, action string) string {
	if endpoint := resolveURLWith(b.admin.URLs(), adminAPIGroupName(b.admin.config), "translations.assignments.actions", map[string]string{
		"assignment_id": strings.TrimSpace(assignmentID),
		"action":        strings.TrimSpace(action),
	}, nil); endpoint != "" {
		return endpoint
	}
	base := strings.TrimRight(strings.TrimSpace(firstNonEmpty(adminAPIBasePath(b.admin), "/admin/api")), "/")
	return base + "/translations/assignments/" + neturl.PathEscape(strings.TrimSpace(assignmentID)) + "/actions/" + neturl.PathEscape(strings.TrimSpace(action))
}

func translationFamilyActiveAssignmentStatusFilter() []string {
	return []string{
		string(AssignmentStatusOpen),
		string(AssignmentStatusAssigned),
		string(AssignmentStatusInProgress),
		string(AssignmentStatusInReview),
		string(AssignmentStatusChangesRequested),
	}
}

func (b *translationFamilyBinding) translationQueueActionsEnabled() bool {
	return b != nil && b.admin != nil && featureEnabled(b.admin.featureGate, FeatureTranslationQueue)
}

func translationFamilyLocaleAssignmentKey(locale, workScope string) string {
	return strings.TrimSpace(strings.ToLower(locale)) + ":" + normalizeTranslationAssignmentWorkScope(workScope)
}

func translationFamilyEditorLink(assignmentID, href string) map[string]any {
	return map[string]any{
		"href":        href,
		"label":       "Open editor",
		"description": "Open the assignment editor for this family assignment.",
		"relation":    "primary",
		"entity_type": "assignment",
		"entity_id":   strings.TrimSpace(assignmentID),
	}
}

func translationFamilyDetailPayload(family translationservices.FamilyRecord, channel string, adm *Admin) map[string]any {
	source := translationFamilySourceVariant(family)
	variants := cloneFamilyVariantPayloads(family.Variants)
	blockers := cloneFamilyBlockerPayloads(family.Blockers)
	assignments := cloneFamilyAssignmentPayloads(family.Assignments, adm)
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
		ScopeTenantIDKey:     family.TenantID,
		ScopeOrgIDKey:        family.OrgID,
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
			"channel":                   channel,
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
	hasPolicyDenied := false
	for _, blocker := range family.Blockers {
		if strings.EqualFold(strings.TrimSpace(blocker.BlockerCode), string(translationcore.FamilyBlockerPolicyDenied)) {
			hasPolicyDenied = true
			if translationFamilyBlockerIsPolicyUnavailable(blocker) {
				return false, "policy_denied", "Policy currently blocks creating additional locale variants for this family."
			}
		}
	}
	if len(missingLocales) > 0 {
		return true, "", ""
	}
	if hasPolicyDenied {
		return false, "policy_denied", "Policy currently blocks creating additional locale variants for this family."
	}
	return false, "no_missing_locales", "All required locales already exist for this family."
}

func translationFamilyRequiredSourceVariant(family translationservices.FamilyRecord) (translationservices.FamilyVariant, error) {
	source := translationFamilySourceVariant(family)
	if strings.TrimSpace(source.SourceRecordID) != "" {
		return source, nil
	}
	return translationservices.FamilyVariant{}, validationDomainError("family source variant missing source_record_id", map[string]any{
		"family_id":      strings.TrimSpace(family.ID),
		"source_locale":  translationFamilyCanonicalSourceLocale(family),
		"source_variant": strings.TrimSpace(family.SourceVariantID),
		"reason_code":    "missing_source_variant",
	})
}

func translationFamilySourceVariant(family translationservices.FamilyRecord) translationservices.FamilyVariant {
	for _, variant := range family.Variants {
		if strings.EqualFold(strings.TrimSpace(variant.ID), strings.TrimSpace(family.SourceVariantID)) {
			return variant
		}
	}
	if sourceLocale := translationFamilyCanonicalSourceLocale(family); sourceLocale != "" {
		for _, variant := range family.Variants {
			if strings.EqualFold(strings.TrimSpace(variant.Locale), sourceLocale) {
				return variant
			}
		}
		return translationservices.FamilyVariant{}
	}
	for _, variant := range family.Variants {
		if variant.IsSource {
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
		ScopeTenantIDKey:           item.TenantID,
		ScopeOrgIDKey:              item.OrgID,
		"locale":                   item.Locale,
		"status":                   item.Status,
		"is_source":                item.IsSource,
		"source_hash_at_last_sync": item.SourceHashAtLastSync,
		"fields":                   cloneStringMap(item.Fields),
		"row_version":              translationEditorVariantVersion(item),
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
			"id":             item.ID,
			"family_id":      item.FamilyID,
			ScopeTenantIDKey: item.TenantID,
			ScopeOrgIDKey:    item.OrgID,
			"blocker_code":   item.BlockerCode,
			"locale":         item.Locale,
			"field_path":     item.FieldPath,
			"details":        cloneAnyMap(item.Details),
		})
	}
	return out
}

func cloneFamilyAssignmentPayloads(items []translationservices.FamilyAssignment, adm *Admin) []map[string]any {
	if len(items) == 0 {
		return nil
	}
	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		row := map[string]any{
			"id":             item.ID,
			"family_id":      item.FamilyID,
			"variant_id":     item.VariantID,
			ScopeTenantIDKey: item.TenantID,
			ScopeOrgIDKey:    item.OrgID,
			"source_locale":  item.SourceLocale,
			"target_locale":  item.TargetLocale,
			"work_scope":     item.WorkScope,
			"status":         item.Status,
			"assignee_id":    item.AssigneeID,
			"assigner_id":    item.AssignerID,
			"reviewer_id":    item.ReviewerID,
			"priority":       item.Priority,
			"due_date":       item.DueDate,
			"assigned_at":    item.AssignedAt,
			"created_at":     item.CreatedAt,
			"updated_at":     item.UpdatedAt,
		}
		if href := translationAssignmentEditorURL(adm, item.ID); href != "" {
			row["links"] = map[string]any{
				"editor": map[string]any{
					"href":        href,
					"label":       "Open editor",
					"description": "Open the assignment editor for this family assignment.",
					"relation":    "primary",
					"entity_type": "assignment",
					"entity_id":   strings.TrimSpace(item.ID),
				},
			}
		}
		out = append(out, row)
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
	switch normalizeTranslationAssignmentStatus(status) {
	case AssignmentStatusOpen:
		return string(translationcore.AssignmentStatusOpen)
	case AssignmentStatusAssigned:
		return string(translationcore.AssignmentStatusAssigned)
	case AssignmentStatusInProgress:
		return string(translationcore.AssignmentStatusInProgress)
	case AssignmentStatusInReview:
		return string(translationcore.AssignmentStatusInReview)
	case AssignmentStatusChangesRequested:
		return string(translationcore.AssignmentStatusChangesRequested)
	case AssignmentStatusApproved:
		return string(translationcore.AssignmentStatusApproved)
	case AssignmentStatusArchived:
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
			scope.TenantID = strings.TrimSpace(anyToString(data[ScopeTenantIDKey]))
		}
		if scope.OrgID == "" {
			scope.OrgID = strings.TrimSpace(anyToString(data[ScopeOrgIDKey]))
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

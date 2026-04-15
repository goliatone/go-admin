package admin

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	translationqueue "github.com/goliatone/go-admin/admin/internal/translationqueue"
	"github.com/goliatone/go-admin/internal/primitives"
	"sort"
	"strings"
	"sync"
	"time"

	translationcore "github.com/goliatone/go-admin/translations/core"
	translationservices "github.com/goliatone/go-admin/translations/services"
	router "github.com/goliatone/go-router"
)

const translationQueueDueSoonWindow = 48 * time.Hour
const translationQueueMissingActorFilterToken = translationqueue.MissingActorFilterToken
const translationQueueReviewStateQABlocked = translationqueue.ReviewStateQABlocked

var translationQueuePrioritySortRank = map[string]int{
	"low":    0,
	"normal": 1,
	"high":   2,
	"urgent": 3,
}

var translationQueueDueStateSortRank = map[string]int{
	translationQueueDueStateNone:    0,
	translationQueueDueStateOnTrack: 1,
	translationQueueDueStateSoon:    2,
	translationQueueDueStateOverdue: 3,
}

type translationQueueBinding struct {
	admin                *Admin
	now                  func() time.Time
	dashboardLoadRuntime func(context.Context, string) (*translationFamilyRuntime, error)
	idempotencyMu        sync.Mutex
	idempotency          map[string]translationQueueActionReplay
}

type translationQueueActionReplay struct {
	PayloadHash string         `json:"payload_hash"`
	Response    map[string]any `json:"response"`
	StoredAt    time.Time      `json:"stored_at"`
}

func newTranslationQueueBinding(a *Admin) *translationQueueBinding {
	if a == nil {
		return nil
	}
	return &translationQueueBinding{
		admin:       a,
		now:         func() time.Time { return time.Now().UTC() },
		idempotency: map[string]translationQueueActionReplay{},
	}
}

func (b *translationQueueBinding) Assignments(c router.Context) (payload any, err error) {
	startedAt := time.Now()
	obsCtx := c.Context()
	defer func() {
		recordTranslationAPIOperation(obsCtx, translationAPIObservation{
			Operation: "translations.assignments.list",
			Kind:      "read",
			RequestID: requestIDFromContext(obsCtx),
			TraceID:   traceIDFromContext(obsCtx),
			TenantID:  tenantIDFromContext(obsCtx),
			OrgID:     orgIDFromContext(obsCtx),
			Duration:  time.Since(startedAt),
			Err:       err,
		})
	}()
	adminCtx, repo, now, err := b.prepareAssignmentRequest(c)
	if err != nil {
		return nil, err
	}
	obsCtx = adminCtx.Context
	actorID := strings.TrimSpace(primitives.FirstNonEmptyRaw(adminCtx.UserID, actorFromContext(adminCtx.Context)))

	page := clampInt(atoiDefault(c.Query("page"), 1), 1, 10_000)
	perPage := clampInt(atoiDefault(c.Query("per_page"), 50), 1, 200)
	filter := b.assignmentFilterFromRequest(adminCtx, c)
	channel := translationChannelFromRequest(c, adminCtx, nil)
	allAssignments, err := b.listAssignmentsForSummary(adminCtx.Context, repo, filter.SortBy, nil)
	if err != nil {
		return nil, err
	}
	assignments, total := b.filterAssignments(adminCtx.Context, allAssignments, filter, page, perPage, channel, now)
	rows := make([]map[string]any, 0, len(assignments))
	for _, assignment := range assignments {
		rows = append(rows, b.assignmentContractRow(adminCtx.Context, assignment, now, channel))
	}
	reviewAggregateCounts, err := b.reviewerAggregateCounts(adminCtx.Context, allAssignments, filter, actorID, channel, now)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"data": rows,
		"meta": mergeTranslationChannelContract(map[string]any{
			"page":                         page,
			"per_page":                     perPage,
			"total":                        total,
			"updated_at":                   now,
			"supported_sort_keys":          TranslationQueueSupportedSortKeys(),
			"supported_filter_keys":        TranslationQueueSupportedFilterKeys(),
			"supported_review_states":      TranslationQueueSupportedReviewStates(),
			"default_sort":                 translationQueueDefaultSortContract(),
			"saved_filter_presets":         TranslationQueueSavedFilterPresets(),
			"saved_review_filter_presets":  TranslationQueueSavedReviewFilterPresets(),
			"default_review_filter_preset": "review_inbox",
			"review_actor_id":              actorID,
			"review_aggregate_counts":      reviewAggregateCounts,
		}, channel),
	}, nil
}

func (b *translationQueueBinding) RunAssignmentAction(c router.Context, assignmentID, action string, body map[string]any) (payload any, err error) {
	startedAt := time.Now()
	obsCtx := c.Context()
	defer func() {
		recordTranslationAPIOperation(obsCtx, translationAPIObservation{
			Operation: "translations.assignments.action." + strings.TrimSpace(strings.ToLower(action)),
			Kind:      "write",
			RequestID: requestIDFromContext(obsCtx),
			TraceID:   traceIDFromContext(obsCtx),
			TenantID:  tenantIDFromContext(obsCtx),
			OrgID:     orgIDFromContext(obsCtx),
			Duration:  time.Since(startedAt),
			Err:       err,
		})
	}()
	if identityErr := rejectTranslationClientIdentityFields(body); identityErr != nil {
		return nil, identityErr
	}
	adminCtx, repo, now, err := b.prepareAssignmentRequest(c)
	if err != nil {
		return nil, err
	}
	obsCtx = adminCtx.Context
	identity := translationIdentityFromAdminContext(adminCtx)
	channel := translationChannelFromRequest(c, adminCtx, body)
	if identity.ActorID == "" {
		return nil, NewDomainError(string(translationcore.ErrorPermissionDenied), "assignment actions require an authenticated actor", map[string]any{
			"component": "translation_queue_binding",
			"action":    strings.TrimSpace(strings.ToLower(action)),
		})
	}
	service := &DefaultTranslationQueueService{
		Repository:    repo,
		Activity:      b.admin.ActivityFeed(),
		Notifications: b.admin.NotificationService(),
		URLs:          b.admin.URLs(),
	}

	action = strings.TrimSpace(strings.ToLower(action))
	assignmentID = strings.TrimSpace(assignmentID)
	if assignmentID == "" {
		return nil, requiredFieldDomainError("assignment_id", nil)
	}
	if action == "" {
		return nil, requiredFieldDomainError("action", nil)
	}

	idempotencyKey := strings.TrimSpace(toString(body["idempotency_key"]))
	if replay, ok, replayErr := b.lookupActionReplay(identity.ActorID, assignmentID, action, idempotencyKey, body); replayErr != nil {
		return nil, replayErr
	} else if ok {
		if meta, _ := replay["meta"].(map[string]any); meta != nil {
			meta["idempotency_hit"] = true
			replay["meta"] = meta
		}
		return replay, nil
	}

	current, err := repo.Get(adminCtx.Context, assignmentID)
	if err != nil {
		return nil, err
	}
	if scopeErr := b.ensureAssignmentScope(identity, current); scopeErr != nil {
		return nil, scopeErr
	}
	if permissionErr := b.requireAssignmentActionPermission(adminCtx, action, current); permissionErr != nil {
		return nil, permissionErr
	}

	var updated TranslationAssignment
	switch action {
	case "claim":
		expectedVersion := queueExpectedVersion(body)
		if expectedVersion <= 0 {
			expectedVersion = current.Version
		}
		updated, err = service.Claim(adminCtx.Context, TranslationQueueClaimInput{
			AssignmentID:    assignmentID,
			ClaimerID:       identity.ActorID,
			ExpectedVersion: expectedVersion,
		})
	case "release":
		expectedVersion := queueExpectedVersion(body)
		if expectedVersion <= 0 {
			expectedVersion = current.Version
		}
		updated, err = service.Release(adminCtx.Context, TranslationQueueReleaseInput{
			AssignmentID:    assignmentID,
			ActorID:         identity.ActorID,
			ExpectedVersion: expectedVersion,
		})
	case "submit_review":
		expectedVersion := queueExpectedVersion(body)
		if expectedVersion <= 0 {
			expectedVersion = current.Version
		}
		updated, err = b.runSubmitReviewAction(adminCtx, service, current, expectedVersion, body)
	case "approve":
		expectedVersion := queueExpectedVersion(body)
		if expectedVersion <= 0 {
			expectedVersion = current.Version
		}
		updated, err = b.runApproveAction(adminCtx, service, current, expectedVersion, body)
	case "reject":
		expectedVersion := queueExpectedVersion(body)
		if expectedVersion <= 0 {
			expectedVersion = current.Version
		}
		updated, err = b.runRejectAction(adminCtx, service, current, expectedVersion, body)
	case "archive":
		expectedVersion := queueExpectedVersion(body)
		if expectedVersion <= 0 {
			expectedVersion = current.Version
		}
		updated, err = service.Archive(adminCtx.Context, TranslationQueueArchiveInput{
			AssignmentID:    assignmentID,
			ActorID:         identity.ActorID,
			ExpectedVersion: expectedVersion,
		})
	default:
		return nil, validationDomainError("unsupported assignment action", map[string]any{
			"field":  "action",
			"action": action,
		})
	}
	if err != nil {
		return nil, err
	}

	response := map[string]any{
		"data": map[string]any{
			"assignment_id": assignmentID,
			"status":        normalizeTranslationQueueState(string(updated.Status)),
			"row_version":   updated.Version,
			"updated_at":    updated.UpdatedAt,
			"assignment":    b.assignmentContractRow(adminCtx.Context, updated, now, channel),
		},
		"meta": mergeTranslationChannelContract(map[string]any{
			"idempotency_hit": false,
		}, channel),
	}
	b.storeActionReplay(identity.ActorID, assignmentID, action, idempotencyKey, body, response)
	return response, nil
}

func (b *translationQueueBinding) MyWork(c router.Context) (payload any, err error) {
	startedAt := time.Now()
	obsCtx := c.Context()
	defer func() {
		recordTranslationAPIOperation(obsCtx, translationAPIObservation{
			Operation: "translations.queue.my_work",
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
		return nil, serviceNotConfiguredDomainError("translation queue binding", map[string]any{
			"component": "translation_queue_binding",
		})
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	obsCtx = adminCtx.Context
	setTranslationTraceHeaders(c, obsCtx)
	if permissionErr := b.admin.requirePermission(adminCtx, PermAdminTranslationsView, "translations"); permissionErr != nil {
		return nil, permissionErr
	}
	repo, err := b.assignmentRepository()
	if err != nil {
		return nil, err
	}
	userID := strings.TrimSpace(primitives.FirstNonEmptyRaw(adminCtx.UserID, actorFromContext(adminCtx.Context)))
	channel := translationChannelFromRequest(c, adminCtx, nil)
	page := clampInt(atoiDefault(c.Query("page"), 1), 1, 10_000)
	perPage := clampInt(atoiDefault(c.Query("per_page"), 25), 1, 200)
	now := b.now().UTC()
	if userID == "" {
		return translationQueueEmptyMyWorkPayload(page, perPage, now), nil
	}
	filters := translationQueueMyWorkFilters(userID, c.Query("status"))
	assignments, total, err := repo.List(adminCtx.Context, ListOptions{
		Page:    page,
		PerPage: perPage,
		SortBy:  "due_date",
		Filters: filters,
	})
	if err != nil {
		return nil, err
	}
	summaryAssignments, err := b.listAssignmentsForSummary(adminCtx.Context, repo, "due_date", filters)
	if err != nil {
		return nil, err
	}
	rows := b.translationQueueAssignmentRows(adminCtx.Context, assignments, now, channel)
	summary := translationQueueMyWorkSummary(summaryAssignments, now)
	return map[string]any{
		"scope":       "my_work",
		"user_id":     userID,
		"summary":     summary,
		"assignments": rows,
		"items":       rows,
		"total":       total,
		"page":        page,
		"per_page":    perPage,
		"updated_at":  now,
		"channel":     channel,
	}, nil
}

func translationQueueEmptyMyWorkPayload(page, perPage int, now time.Time) map[string]any {
	return map[string]any{
		"scope":       "my_work",
		"user_id":     "",
		"summary":     translationQueueMyWorkSummary(nil, now),
		"assignments": []map[string]any{},
		"items":       []map[string]any{},
		"total":       0,
		"page":        page,
		"per_page":    perPage,
		"updated_at":  now,
	}
}

func translationQueueMyWorkFilters(userID, status string) map[string]any {
	filters := map[string]any{
		"assignee_id": strings.TrimSpace(userID),
	}
	if status = strings.TrimSpace(strings.ToLower(status)); status != "" {
		filters["status"] = status
	}
	return filters
}

func translationQueueMyWorkSummary(assignments []TranslationAssignment, now time.Time) map[string]int {
	summary := map[string]int{
		"total":                         0,
		translationQueueDueStateOverdue: 0,
		translationQueueDueStateSoon:    0,
		translationQueueDueStateOnTrack: 0,
		translationQueueDueStateNone:    0,
		"review":                        0,
	}
	for _, assignment := range assignments {
		dueState := translationQueueDueState(assignment.DueDate, now)
		summary[dueState]++
		summary["total"]++
		if assignment.Status == AssignmentStatusInReview {
			summary["review"]++
		}
	}
	return summary
}

func (b *translationQueueBinding) translationQueueAssignmentRows(ctx context.Context, assignments []TranslationAssignment, now time.Time, channel string) []map[string]any {
	rows := make([]map[string]any, 0, len(assignments))
	for _, assignment := range assignments {
		rows = append(rows, b.assignmentContractRow(ctx, assignment, now, channel))
	}
	return rows
}

func (b *translationQueueBinding) Queue(c router.Context) (payload any, err error) {
	startedAt := time.Now()
	obsCtx := c.Context()
	defer func() {
		recordTranslationAPIOperation(obsCtx, translationAPIObservation{
			Operation: "translations.queue.list",
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
		return nil, serviceNotConfiguredDomainError("translation queue binding", map[string]any{
			"component": "translation_queue_binding",
		})
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	obsCtx = adminCtx.Context
	setTranslationTraceHeaders(c, obsCtx)
	if permissionErr := b.admin.requirePermission(adminCtx, PermAdminTranslationsView, "translations"); permissionErr != nil {
		return nil, permissionErr
	}
	repo, err := b.assignmentRepository()
	if err != nil {
		return nil, err
	}
	page := clampInt(atoiDefault(c.Query("page"), 1), 1, 10_000)
	perPage := clampInt(atoiDefault(c.Query("per_page"), 50), 1, 200)
	channel := translationChannelFromRequest(c, adminCtx, nil)
	now := b.now().UTC()

	filters := map[string]any{}
	if assigneeID := strings.TrimSpace(c.Query("assignee_id")); assigneeID != "" {
		filters["assignee_id"] = assigneeID
	}
	if status := strings.TrimSpace(strings.ToLower(c.Query("status"))); status != "" {
		filters["status"] = status
	}
	if reviewOnly := strings.TrimSpace(strings.ToLower(c.Query("review"))); reviewOnly == "1" || reviewOnly == "true" {
		filters["status"] = string(AssignmentStatusInReview)
	}

	assignments, total, err := repo.List(adminCtx.Context, ListOptions{
		Page:    page,
		PerPage: perPage,
		SortBy:  "updated_at",
		Filters: filters,
	})
	if err != nil {
		return nil, err
	}
	summaryAssignments, err := b.listAssignmentsForSummary(adminCtx.Context, repo, "updated_at", filters)
	if err != nil {
		return nil, err
	}

	rows := make([]map[string]any, 0, len(assignments))
	byQueueState := map[string]int{}
	byDueState := map[string]int{}
	for _, assignment := range assignments {
		row := b.assignmentContractRow(adminCtx.Context, assignment, now, channel)
		rows = append(rows, row)
	}
	for _, assignment := range summaryAssignments {
		queueState := normalizeTranslationQueueState(string(assignment.Status))
		byQueueState[queueState]++
		dueState := translationQueueDueState(assignment.DueDate, now)
		byDueState[dueState]++
	}

	return map[string]any{
		"scope": "queue",
		"summary": map[string]any{
			"total":          len(summaryAssignments),
			"by_queue_state": byQueueState,
			"by_due_state":   byDueState,
		},
		"items":       rows,
		"assignments": rows,
		"total":       total,
		"page":        page,
		"per_page":    perPage,
		"updated_at":  now,
		"channel":     channel,
	}, nil
}

func (b *translationQueueBinding) prepareAssignmentRequest(c router.Context) (AdminContext, TranslationAssignmentRepository, time.Time, error) {
	if b == nil || b.admin == nil {
		return AdminContext{}, nil, time.Time{}, serviceNotConfiguredDomainError("translation queue binding", map[string]any{
			"component": "translation_queue_binding",
		})
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	setTranslationTraceHeaders(c, adminCtx.Context)
	if err := b.admin.requirePermission(adminCtx, PermAdminTranslationsView, "translations"); err != nil {
		return AdminContext{}, nil, time.Time{}, err
	}
	repo, err := b.assignmentRepository()
	if err != nil {
		return AdminContext{}, nil, time.Time{}, err
	}
	return adminCtx, repo, b.now().UTC(), nil
}

func (b *translationQueueBinding) assignmentFilterFromRequest(adminCtx AdminContext, c router.Context) translationAssignmentListFilter {
	actorID := strings.TrimSpace(primitives.FirstNonEmptyRaw(adminCtx.UserID, actorFromContext(adminCtx.Context)))
	return translationqueue.AssignmentFilterFromQuery(
		func(key string) string { return c.Query(key) },
		actorID,
		strings.TrimSpace(primitives.FirstNonEmptyRaw(adminCtx.TenantID, tenantIDFromContext(adminCtx.Context))),
		strings.TrimSpace(primitives.FirstNonEmptyRaw(adminCtx.OrgID, orgIDFromContext(adminCtx.Context))),
	)
}

type translationAssignmentListFilter = translationqueue.AssignmentListFilter

func (b *translationQueueBinding) filterAssignments(ctx context.Context, assignments []TranslationAssignment, filter translationAssignmentListFilter, page, perPage int, environment string, now time.Time) ([]TranslationAssignment, int) {
	matched := b.matchAssignments(assignments, filter, now)
	if filter.ReviewState != "" {
		matched = b.applyReviewStateFilter(ctx, matched, filter.ReviewState, environment)
	}
	sortAssignments(matched, filter.SortBy, filter.SortDesc, now)
	total := len(matched)
	start := (page - 1) * perPage
	if start >= total {
		return []TranslationAssignment{}, total
	}
	end := min(start+perPage, total)
	return matched[start:end], total
}

func (b *translationQueueBinding) matchAssignments(assignments []TranslationAssignment, filter translationAssignmentListFilter, now time.Time) []TranslationAssignment {
	matched := make([]TranslationAssignment, 0, len(assignments))
	for _, assignment := range assignments {
		if !matchesAssignmentListFilter(assignment, filter, now) {
			continue
		}
		matched = append(matched, assignment)
	}
	return matched
}

func (b *translationQueueBinding) applyReviewStateFilter(ctx context.Context, assignments []TranslationAssignment, reviewState, environment string) []TranslationAssignment {
	reviewState = normalizeTranslationQueueReviewState(reviewState)
	if reviewState == "" || len(assignments) == 0 {
		return assignments
	}
	switch reviewState {
	case translationQueueReviewStateQABlocked:
		blocked := b.reviewBlockedAssignments(ctx, assignments, environment)
		if len(blocked) == 0 {
			return []TranslationAssignment{}
		}
		filtered := make([]TranslationAssignment, 0, len(assignments))
		for _, assignment := range assignments {
			if _, ok := blocked[strings.TrimSpace(assignment.ID)]; ok {
				filtered = append(filtered, assignment)
			}
		}
		return filtered
	default:
		return assignments
	}
}

func matchesAssignmentListFilter(assignment TranslationAssignment, filter translationAssignmentListFilter, now time.Time) bool {
	if filter.AssigneeID == translationQueueMissingActorFilterToken || filter.ReviewerID == translationQueueMissingActorFilterToken {
		return false
	}
	if !translationQueueListFilterMatches(filter.Status, string(assignment.Status), normalizeTranslationQueueState) {
		return false
	}
	if filter.AssigneeID != "" && !strings.EqualFold(strings.TrimSpace(assignment.AssigneeID), filter.AssigneeID) {
		return false
	}
	if filter.ReviewerID != "" && !strings.EqualFold(strings.TrimSpace(firstNonEmpty(assignment.ReviewerID, assignment.LastReviewerID)), filter.ReviewerID) {
		return false
	}
	if !translationQueueListFilterMatches(filter.DueState, translationQueueDueState(assignment.DueDate, now), normalizeTranslationQueueDueState) {
		return false
	}
	if !translationQueueListFilterMatches(filter.Locale, assignment.TargetLocale, normalizeTranslationQueueLocaleFilterValue) {
		return false
	}
	if !translationQueueListFilterMatches(filter.Priority, string(assignment.Priority), normalizeTranslationQueuePriorityFilterValue) {
		return false
	}
	if filter.FamilyID != "" && !strings.EqualFold(strings.TrimSpace(assignment.FamilyID), strings.TrimSpace(filter.FamilyID)) {
		return false
	}
	if filter.TenantID != "" && !strings.EqualFold(strings.TrimSpace(assignment.TenantID), filter.TenantID) {
		return false
	}
	if filter.OrgID != "" && !strings.EqualFold(strings.TrimSpace(assignment.OrgID), filter.OrgID) {
		return false
	}
	return true
}

func translationQueueListFilterMatches(filterValue, candidate string, normalize func(string) string) bool {
	return translationqueue.ListFilterMatches(filterValue, candidate, normalize)
}

func normalizeTranslationQueuePriorityFilterValue(value string) string {
	return translationqueue.NormalizePriorityFilterValue(value)
}

func normalizeTranslationQueueLocaleFilterValue(value string) string {
	return translationqueue.NormalizeLocaleFilterValue(value)
}

func normalizeTranslationQueueReviewState(value string) string {
	return translationqueue.NormalizeReviewState(value)
}

func sortAssignments(assignments []TranslationAssignment, sortBy string, sortDesc bool, now time.Time) {
	sortBy = strings.TrimSpace(strings.ToLower(sortBy))
	if sortBy == "" {
		sortBy = "updated_at"
		sortDesc = true
	}
	sort.SliceStable(assignments, func(i, j int) bool {
		left := assignments[i]
		right := assignments[j]
		var comparison int
		switch sortBy {
		case "status":
			comparison = strings.Compare(normalizeTranslationQueueState(string(left.Status)), normalizeTranslationQueueState(string(right.Status)))
		case "assignee_id":
			comparison = strings.Compare(strings.ToLower(strings.TrimSpace(left.AssigneeID)), strings.ToLower(strings.TrimSpace(right.AssigneeID)))
		case "reviewer_id":
			comparison = strings.Compare(
				strings.ToLower(strings.TrimSpace(firstNonEmpty(left.ReviewerID, left.LastReviewerID))),
				strings.ToLower(strings.TrimSpace(firstNonEmpty(right.ReviewerID, right.LastReviewerID))),
			)
		case "locale", "target_locale":
			comparison = strings.Compare(strings.ToLower(strings.TrimSpace(left.TargetLocale)), strings.ToLower(strings.TrimSpace(right.TargetLocale)))
		case "priority":
			comparison = compareTranslationQueuePriority(left.Priority, right.Priority)
		case "due_state":
			comparison = compareTranslationQueueDueState(translationQueueDueState(left.DueDate, now), translationQueueDueState(right.DueDate, now))
		case "due_date":
			comparison = compareTimePtr(left.DueDate, right.DueDate)
		case "created_at":
			comparison = compareTime(left.CreatedAt, right.CreatedAt)
		default:
			comparison = compareTime(left.UpdatedAt, right.UpdatedAt)
		}
		if comparison == 0 {
			return strings.ToLower(strings.TrimSpace(left.ID)) < strings.ToLower(strings.TrimSpace(right.ID))
		}
		if sortDesc {
			return comparison > 0
		}
		return comparison < 0
	})
}

func compareTimePtr(left, right *time.Time) int {
	switch {
	case left == nil && right == nil:
		return 0
	case left == nil:
		return 1
	case right == nil:
		return -1
	default:
		return compareTime(*left, *right)
	}
}

func compareTime(left, right time.Time) int {
	switch {
	case left.Equal(right):
		return 0
	case left.Before(right):
		return -1
	default:
		return 1
	}
}

func compareTranslationQueuePriority(left, right Priority) int {
	return compareTranslationQueueSortRank(
		translationQueuePriorityRank(string(left)),
		translationQueuePriorityRank(string(right)),
	)
}

func compareTranslationQueueDueState(left, right string) int {
	return compareTranslationQueueSortRank(
		translationQueueDueStateRank(left),
		translationQueueDueStateRank(right),
	)
}

func compareTranslationQueueSortRank(left, right int) int {
	switch {
	case left == right:
		return 0
	case left < right:
		return -1
	default:
		return 1
	}
}

func translationQueuePriorityRank(value string) int {
	if rank, ok := translationQueuePrioritySortRank[strings.TrimSpace(strings.ToLower(value))]; ok {
		return rank
	}
	return -1
}

func translationQueueDueStateRank(value string) int {
	if rank, ok := translationQueueDueStateSortRank[normalizeTranslationQueueDueState(value)]; ok {
		return rank
	}
	return -1
}

func (b *translationQueueBinding) ensureAssignmentScope(identity translationTransportIdentity, assignment TranslationAssignment) error {
	if identity.TenantID != "" && assignment.TenantID != "" && !strings.EqualFold(identity.TenantID, assignment.TenantID) {
		return NewDomainError(string(translationcore.ErrorPermissionDenied), "assignment scope does not match current tenant", map[string]any{
			"assignment_id": assignment.ID,
			"tenant_id":     assignment.TenantID,
		})
	}
	if identity.OrgID != "" && assignment.OrgID != "" && !strings.EqualFold(identity.OrgID, assignment.OrgID) {
		return NewDomainError(string(translationcore.ErrorPermissionDenied), "assignment scope does not match current organization", map[string]any{
			"assignment_id": assignment.ID,
			"org_id":        assignment.OrgID,
		})
	}
	return nil
}

func (b *translationQueueBinding) requireAssignmentActionPermission(adminCtx AdminContext, action string, assignment TranslationAssignment) error {
	switch action {
	case "claim":
		if err := b.admin.requirePermission(adminCtx, PermAdminTranslationsClaim, "translations"); err != nil {
			return err
		}
		actorID := strings.TrimSpace(translationIdentityFromAdminContext(adminCtx).ActorID)
		switch assignment.Status {
		case AssignmentStatusOpen:
			if assignment.AssignmentType == AssignmentTypeOpenPool {
				return nil
			}
		case AssignmentStatusAssigned, AssignmentStatusChangesRequested:
			if actorID != "" && strings.EqualFold(strings.TrimSpace(assignment.AssigneeID), actorID) {
				return nil
			}
			return NewDomainError(string(translationcore.ErrorPermissionDenied), "assignment is assigned to a different translator", map[string]any{
				"assignment_id":        assignment.ID,
				"assignee_id":          actorID,
				"expected_assignee_id": assignment.AssigneeID,
				"status":               assignment.Status,
			})
		}
		return NewDomainError(string(translationcore.ErrorInvalidStatus), "assignment must be open pool or already assigned to you before it can be claimed", map[string]any{
			"assignment_id": assignment.ID,
			"status":        assignment.Status,
		})
	case "release":
		if err := b.admin.requirePermission(adminCtx, PermAdminTranslationsAssign, "translations"); err != nil {
			return err
		}
		if assignment.Status != AssignmentStatusAssigned && assignment.Status != AssignmentStatusInProgress && assignment.Status != AssignmentStatusChangesRequested {
			return NewDomainError(string(translationcore.ErrorInvalidStatus), "assignment must be assigned or in progress before it can be released", map[string]any{
				"assignment_id": assignment.ID,
				"status":        assignment.Status,
			})
		}
	case "submit_review":
		if err := b.admin.requirePermission(adminCtx, PermAdminTranslationsEdit, "translations"); err != nil {
			return err
		}
		if assignment.Status != AssignmentStatusInProgress {
			return NewDomainError(string(translationcore.ErrorInvalidStatus), "assignment must be in progress before it can be submitted", map[string]any{
				"assignment_id": assignment.ID,
				"status":        assignment.Status,
			})
		}
	case "approve", "reject":
		if err := b.admin.requirePermission(adminCtx, PermAdminTranslationsApprove, "translations"); err != nil {
			return err
		}
		if assignment.Status != AssignmentStatusInReview {
			return NewDomainError(string(translationcore.ErrorInvalidStatus), "assignment must be in review before review actions can run", map[string]any{
				"assignment_id": assignment.ID,
				"status":        assignment.Status,
			})
		}
		actorID := strings.TrimSpace(translationIdentityFromAdminContext(adminCtx).ActorID)
		expectedReviewerID := strings.TrimSpace(firstNonEmpty(assignment.ReviewerID, assignment.LastReviewerID))
		if expectedReviewerID != "" && actorID != "" && !strings.EqualFold(expectedReviewerID, actorID) {
			return NewDomainError(string(translationcore.ErrorPermissionDenied), "assignment is assigned to a different reviewer", map[string]any{
				"assignment_id":        assignment.ID,
				"reviewer_id":          actorID,
				"expected_reviewer_id": expectedReviewerID,
			})
		}
	case "archive":
		if err := b.admin.requirePermission(adminCtx, PermAdminTranslationsManage, "translations"); err != nil {
			return err
		}
		if assignment.Status == AssignmentStatusArchived {
			return NewDomainError(string(translationcore.ErrorInvalidStatus), "archived assignments cannot be archived again", map[string]any{
				"assignment_id": assignment.ID,
				"status":        assignment.Status,
			})
		}
	default:
		return validationDomainError("unsupported assignment action", map[string]any{
			"field":  "action",
			"action": action,
		})
	}
	return nil
}

func (b *translationQueueBinding) lookupActionReplay(actorID, assignmentID, action, idempotencyKey string, payload map[string]any) (map[string]any, bool, error) {
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	if b == nil || idempotencyKey == "" {
		return nil, false, nil
	}
	recordKey := b.actionReplayKey(actorID, assignmentID, action, idempotencyKey)
	payloadHash := actionReplayPayloadHash(payload)
	now := b.now().UTC()

	b.idempotencyMu.Lock()
	defer b.idempotencyMu.Unlock()
	record, ok := b.idempotency[recordKey]
	if !ok {
		return nil, false, nil
	}
	if now.Sub(record.StoredAt) > 24*time.Hour {
		delete(b.idempotency, recordKey)
		return nil, false, nil
	}
	if record.PayloadHash != payloadHash {
		return nil, false, NewDomainError(string(translationcore.ErrorVersionConflict), "idempotency key was already used with a different assignment action payload", map[string]any{
			"assignment_id":   assignmentID,
			"action":          action,
			"idempotency_key": idempotencyKey,
		})
	}
	return primitives.CloneAnyMap(record.Response), true, nil
}

func (b *translationQueueBinding) storeActionReplay(actorID, assignmentID, action, idempotencyKey string, payload map[string]any, response map[string]any) {
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	if b == nil || idempotencyKey == "" {
		return
	}
	b.idempotencyMu.Lock()
	defer b.idempotencyMu.Unlock()
	b.idempotency[b.actionReplayKey(actorID, assignmentID, action, idempotencyKey)] = translationQueueActionReplay{
		PayloadHash: actionReplayPayloadHash(payload),
		Response:    primitives.CloneAnyMap(response),
		StoredAt:    b.now().UTC(),
	}
}

func (b *translationQueueBinding) actionReplayKey(actorID, assignmentID, action, idempotencyKey string) string {
	return strings.Join([]string{
		strings.TrimSpace(actorID),
		strings.TrimSpace(assignmentID),
		strings.TrimSpace(strings.ToLower(action)),
		strings.TrimSpace(idempotencyKey),
	}, "::")
}

func actionReplayPayloadHash(payload map[string]any) string {
	if len(payload) == 0 {
		return ""
	}
	encoded, err := json.Marshal(payload)
	if err != nil {
		return ""
	}
	sum := sha256.Sum256(encoded)
	return hex.EncodeToString(sum[:])
}

func (b *translationQueueBinding) EntityTypesOptions(c router.Context) (any, error) {
	if b == nil || b.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation queue binding", map[string]any{
			"component": "translation_queue_binding",
		})
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.admin.requirePermission(adminCtx, PermAdminTranslationsView, "translations"); err != nil {
		return nil, err
	}

	search := strings.ToLower(strings.TrimSpace(translationQueueOptionsSearch(c)))
	seen := map[string]map[string]any{}
	if b.admin.registry != nil {
		for panelName, panel := range b.admin.registry.Panels() {
			if panel == nil || !panelSupportsTranslationQueueTab(panelName, panel) {
				continue
			}
			entityType := normalizeTranslationQueueEntityType(panelName)
			if entityType == "" {
				continue
			}
			seen[entityType] = map[string]any{
				"value": entityType,
				"label": translationQueueEntityTypeLabel(entityType),
			}
		}
	}

	if repo, err := b.assignmentRepository(); err == nil && repo != nil {
		assignments, listErr := b.listAssignmentsForSummary(adminCtx.Context, repo, "updated_at", nil)
		if listErr == nil {
			for _, assignment := range assignments {
				entityType := normalizeTranslationQueueEntityType(assignment.EntityType)
				if entityType == "" {
					continue
				}
				if _, ok := seen[entityType]; ok {
					continue
				}
				seen[entityType] = map[string]any{
					"value": entityType,
					"label": translationQueueEntityTypeLabel(entityType),
				}
			}
		}
	}

	options := make([]map[string]any, 0, len(seen))
	for _, option := range seen {
		if !translationQueueOptionMatchesSearch(option, search) {
			continue
		}
		options = append(options, option)
	}
	sortTranslationQueueOptions(options)
	return options, nil
}

func (b *translationQueueBinding) SourceRecordsOptions(c router.Context) (any, error) {
	if b == nil || b.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation queue binding", map[string]any{
			"component": "translation_queue_binding",
		})
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.admin.requirePermission(adminCtx, PermAdminTranslationsView, "translations"); err != nil {
		return nil, err
	}

	entityType := normalizeTranslationQueueEntityType(c.Query("entity_type"))
	if entityType == "" {
		return []map[string]any{}, nil
	}
	panel, panelName, ok := b.panelForEntityType(entityType, adminCtx.Environment)
	if !ok || panel == nil {
		return []map[string]any{}, nil
	}

	search := translationQueueOptionsSearch(c)
	perPage := clampInt(atoiDefault(c.Query("per_page"), 25), 1, 200)
	records, _, err := panel.List(adminCtx, ListOptions{
		Page:    1,
		PerPage: perPage,
		Search:  strings.TrimSpace(search),
	})
	if err != nil {
		return nil, err
	}

	options := make([]map[string]any, 0, len(records))
	for _, record := range records {
		option := translationQueueSourceRecordOption(record, panelName)
		if option == nil {
			continue
		}
		options = append(options, option)
	}
	searchKey := strings.ToLower(strings.TrimSpace(search))
	options = translationQueueFilterOptionsBySearch(options, searchKey)
	sortTranslationQueueOptions(options)
	return options, nil
}

func (b *translationQueueBinding) LocalesOptions(c router.Context) (any, error) {
	if b == nil || b.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation queue binding", map[string]any{
			"component": "translation_queue_binding",
		})
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.admin.requirePermission(adminCtx, PermAdminTranslationsView, "translations"); err != nil {
		return nil, err
	}

	entityType := normalizeTranslationQueueEntityType(c.Query("entity_type"))
	sourceRecordID := strings.TrimSpace(c.Query("source_record_id"))
	excludeLocale := strings.ToLower(strings.TrimSpace(c.Query("source_locale")))
	localeSet := map[string]struct{}{}

	if defaultLocale := strings.ToLower(strings.TrimSpace(b.admin.config.DefaultLocale)); defaultLocale != "" {
		localeSet[defaultLocale] = struct{}{}
	}

	var sourceRecord map[string]any
	if entityType != "" && sourceRecordID != "" {
		if panel, panelName, ok := b.panelForEntityType(entityType, adminCtx.Environment); ok && panel != nil {
			record, err := panel.Get(adminCtx, sourceRecordID)
			if err == nil && len(record) > 0 {
				sourceRecord = record
				for _, locale := range translationReadinessAvailableLocales(record) {
					if locale = strings.ToLower(strings.TrimSpace(locale)); locale != "" {
						localeSet[locale] = struct{}{}
					}
				}
				for _, locale := range []string{
					toString(record["locale"]),
					toString(record["source_locale"]),
					toString(record["target_locale"]),
					toString(record["requested_locale"]),
					toString(record["resolved_locale"]),
				} {
					if normalized := strings.ToLower(strings.TrimSpace(locale)); normalized != "" {
						localeSet[normalized] = struct{}{}
					}
				}

				if policy := b.translationPolicyForPanel(panel); policy != nil {
					requiredLocales, _, resolved, _ := resolveReadinessRequirements(
						adminCtx.Context,
						policy,
						panelName,
						record,
						map[string]any{"channel": adminCtx.Environment},
					)
					if resolved {
						for _, locale := range requiredLocales {
							if normalized := strings.ToLower(strings.TrimSpace(locale)); normalized != "" {
								localeSet[normalized] = struct{}{}
							}
						}
					}
				}
			}
		}
	}

	if repo, err := b.assignmentRepository(); err == nil && repo != nil {
		filters := map[string]any{}
		if entityType != "" {
			filters["entity_type"] = entityType
		}
		if sourceRecordID != "" {
			filters["source_record_id"] = sourceRecordID
		}
		assignments, listErr := b.listAssignmentsForSummary(adminCtx.Context, repo, "updated_at", filters)
		if listErr == nil {
			for _, assignment := range assignments {
				for _, locale := range []string{assignment.SourceLocale, assignment.TargetLocale} {
					if normalized := strings.ToLower(strings.TrimSpace(locale)); normalized != "" {
						localeSet[normalized] = struct{}{}
					}
				}
			}
		}
	}

	if sourceRecord != nil {
		readiness, _ := sourceRecord["translation_readiness"].(map[string]any)
		for _, locale := range toStringSlice(readiness["required_locales"]) {
			if normalized := strings.ToLower(strings.TrimSpace(locale)); normalized != "" {
				localeSet[normalized] = struct{}{}
			}
		}
	}

	delete(localeSet, "")
	if excludeLocale != "" {
		delete(localeSet, excludeLocale)
	}

	search := strings.ToLower(strings.TrimSpace(translationQueueOptionsSearch(c)))
	options := make([]map[string]any, 0, len(localeSet))
	for locale := range localeSet {
		option := map[string]any{
			"value": locale,
			"label": strings.ToUpper(locale),
		}
		if !translationQueueOptionMatchesSearch(option, search) {
			continue
		}
		options = append(options, option)
	}
	sortTranslationQueueOptions(options)
	return options, nil
}

func (b *translationQueueBinding) TranslationGroupsOptions(c router.Context) (any, error) {
	if b == nil || b.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation queue binding", map[string]any{
			"component": "translation_queue_binding",
		})
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.admin.requirePermission(adminCtx, PermAdminTranslationsView, "translations"); err != nil {
		return nil, err
	}

	entityType := normalizeTranslationQueueEntityType(c.Query("entity_type"))
	sourceRecordID := strings.TrimSpace(c.Query("source_record_id"))
	search := strings.ToLower(strings.TrimSpace(translationQueueOptionsSearch(c)))

	optionsByValue := map[string]map[string]any{}
	appendOption := func(value, label, description string) {
		value = strings.TrimSpace(value)
		if value == "" {
			return
		}
		label = strings.TrimSpace(label)
		if label == "" {
			label = value
		}
		current, exists := optionsByValue[value]
		if !exists {
			current = map[string]any{
				"value": value,
				"label": label,
			}
			optionsByValue[value] = current
		}
		if strings.TrimSpace(toString(current["description"])) == "" && strings.TrimSpace(description) != "" {
			current["description"] = strings.TrimSpace(description)
		}
	}

	if entityType != "" && sourceRecordID != "" {
		if panel, panelName, ok := b.panelForEntityType(entityType, adminCtx.Environment); ok && panel != nil {
			if record, err := panel.Get(adminCtx, sourceRecordID); err == nil && len(record) > 0 {
				groupID := strings.TrimSpace(translationFamilyIDFromRecord(record))
				if groupID == "" {
					groupID = strings.TrimSpace(toString(record["family_id"]))
				}
				label := strings.TrimSpace(primitives.FirstNonEmptyRaw(
					toString(record["source_title"]),
					toString(record["title"]),
					toString(record["name"]),
					groupID,
				))
				description := strings.TrimSpace(primitives.FirstNonEmptyRaw(
					toString(record["source_path"]),
					toString(record["path"]),
					toString(record["slug"]),
				))
				if strings.TrimSpace(panelName) != "" {
					if description != "" {
						description = panelName + " • " + description
					} else {
						description = panelName
					}
				}
				appendOption(groupID, label, description)
			}
		}
	}

	if repo, err := b.assignmentRepository(); err == nil && repo != nil {
		filters := map[string]any{}
		if entityType != "" {
			filters["entity_type"] = entityType
		}
		if sourceRecordID != "" {
			filters["source_record_id"] = sourceRecordID
		}
		assignments, listErr := b.listAssignmentsForSummary(adminCtx.Context, repo, "updated_at", filters)
		if listErr == nil {
			for _, assignment := range assignments {
				description := strings.TrimSpace(primitives.FirstNonEmptyRaw(
					assignment.SourcePath,
					assignment.EntityType,
				))
				label := strings.TrimSpace(primitives.FirstNonEmptyRaw(
					assignment.SourceTitle,
					assignment.FamilyID,
				))
				appendOption(assignment.FamilyID, label, description)
			}
		}
	}

	options := make([]map[string]any, 0, len(optionsByValue))
	for _, option := range optionsByValue {
		if !translationQueueOptionMatchesSearch(option, search) {
			continue
		}
		options = append(options, option)
	}
	sortTranslationQueueOptions(options)
	return options, nil
}

func (b *translationQueueBinding) AssigneesOptions(c router.Context) (any, error) {
	if b == nil || b.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation queue binding", map[string]any{
			"component": "translation_queue_binding",
		})
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.admin.requirePermission(adminCtx, PermAdminTranslationsView, "translations"); err != nil {
		return nil, err
	}

	search := translationQueueOptionsSearch(c)
	searchKey := strings.ToLower(strings.TrimSpace(search))
	perPage := clampInt(atoiDefault(c.Query("per_page"), 25), 1, 200)
	optionsByValue := map[string]map[string]any{}
	appendOption := func(option map[string]any) {
		if len(option) == 0 {
			return
		}
		value := strings.TrimSpace(toString(option["value"]))
		if value == "" {
			return
		}
		current, exists := optionsByValue[value]
		if !exists {
			current = map[string]any{
				"value": value,
				"label": strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(option["label"]), value)),
			}
			optionsByValue[value] = current
		}
		if strings.TrimSpace(toString(current["description"])) == "" && strings.TrimSpace(toString(option["description"])) != "" {
			current["description"] = strings.TrimSpace(toString(option["description"]))
		}
		if strings.TrimSpace(toString(current["display_name"])) == "" {
			displayName := strings.TrimSpace(primitives.FirstNonEmptyRaw(
				toString(option["display_name"]),
				toString(option["label"]),
			))
			if displayName != "" {
				current["display_name"] = displayName
			}
		}
		if strings.TrimSpace(toString(current["avatar_url"])) == "" && strings.TrimSpace(toString(option["avatar_url"])) != "" {
			current["avatar_url"] = strings.TrimSpace(toString(option["avatar_url"]))
		}
	}

	if b.admin.registry != nil {
		if usersPanel, ok := b.admin.registry.Panel(usersModuleID); ok && usersPanel != nil {
			records, _, err := usersPanel.List(adminCtx, ListOptions{
				Page:    1,
				PerPage: perPage,
				Search:  search,
			})
			if err == nil {
				for _, record := range records {
					appendOption(translationQueueAssigneeOption(record))
				}
			}
		}
	}

	if repo, err := b.assignmentRepository(); err == nil && repo != nil {
		assignments, listErr := b.listAssignmentsForSummary(adminCtx.Context, repo, "updated_at", nil)
		if listErr == nil {
			for _, assignment := range assignments {
				assigneeID := strings.TrimSpace(assignment.AssigneeID)
				if assigneeID == "" {
					continue
				}
				appendOption(map[string]any{
					"value": assigneeID,
					"label": assigneeID,
				})
			}
		}
	}

	if selected := strings.TrimSpace(c.Query("assignee_id")); selected != "" {
		appendOption(map[string]any{
			"value": selected,
			"label": selected,
		})
	}

	options := make([]map[string]any, 0, len(optionsByValue))
	for _, option := range optionsByValue {
		if !translationQueueOptionMatchesSearch(option, searchKey) {
			continue
		}
		options = append(options, option)
	}
	sortTranslationQueueOptions(options)
	return options, nil
}

func (b *translationQueueBinding) listAssignmentsForSummary(ctx context.Context, repo TranslationAssignmentRepository, sortBy string, filters map[string]any) ([]TranslationAssignment, error) {
	if repo == nil {
		return nil, nil
	}
	const summaryPerPage = 200
	page := 1
	summary := make([]TranslationAssignment, 0, summaryPerPage)
	for {
		batch, total, err := repo.List(ctx, ListOptions{
			Page:    page,
			PerPage: summaryPerPage,
			SortBy:  strings.TrimSpace(sortBy),
			Filters: primitives.CloneAnyMap(filters),
		})
		if err != nil {
			return nil, err
		}
		if len(batch) == 0 {
			break
		}
		summary = append(summary, batch...)
		if total > 0 && page*summaryPerPage >= total {
			break
		}
		if len(batch) < summaryPerPage {
			break
		}
		page++
	}
	return summary, nil
}

func (b *translationQueueBinding) reviewerAggregateCounts(ctx context.Context, assignments []TranslationAssignment, filter translationAssignmentListFilter, actorID, environment string, now time.Time) (map[string]int, error) {
	counts := map[string]int{}
	for _, key := range TranslationQueueReviewAggregateCountKeys() {
		counts[key] = 0
	}
	if strings.TrimSpace(actorID) == "" {
		return counts, nil
	}
	scopeFilter := translationAssignmentListFilter{
		TenantID: strings.TrimSpace(filter.TenantID),
		OrgID:    strings.TrimSpace(filter.OrgID),
	}
	reviewAssignments := make([]TranslationAssignment, 0, len(assignments))
	for _, assignment := range assignments {
		if !matchesAssignmentListFilter(assignment, scopeFilter, now) {
			continue
		}
		reviewerID := strings.TrimSpace(firstNonEmpty(assignment.ReviewerID, assignment.LastReviewerID))
		if reviewerID == "" || !strings.EqualFold(reviewerID, actorID) {
			continue
		}
		switch assignment.Status {
		case AssignmentStatusInReview:
			reviewAssignments = append(reviewAssignments, assignment)
			counts["review_inbox"]++
			if translationQueueDueState(assignment.DueDate, now) == translationQueueDueStateOverdue {
				counts["review_overdue"]++
			}
		case AssignmentStatusChangesRequested:
			counts["review_changes_requested"]++
		}
	}
	for assignmentID := range b.reviewBlockedAssignments(ctx, reviewAssignments, environment) {
		if assignmentID != "" {
			counts["review_blocked"]++
		}
	}
	return counts, nil
}

func (b *translationQueueBinding) reviewBlockedAssignments(ctx context.Context, assignments []TranslationAssignment, environment string) map[string]struct{} {
	blocked := map[string]struct{}{}
	if !b.translationQAEnabled() || len(assignments) == 0 {
		return blocked
	}
	familyBinding := &translationFamilyBinding{admin: b.admin}
	runtime, err := familyBinding.runtime(ctx, environment)
	if err != nil || runtime == nil || runtime.service == nil {
		return blocked
	}
	assignmentsByFamily := map[string][]TranslationAssignment{}
	for _, assignment := range assignments {
		familyID := strings.TrimSpace(assignment.FamilyID)
		if familyID == "" {
			continue
		}
		assignmentsByFamily[familyID] = append(assignmentsByFamily[familyID], assignment)
	}
	for familyID, familyAssignments := range assignmentsByFamily {
		if len(familyAssignments) == 0 {
			continue
		}
		scope := translationservices.Scope{
			TenantID: strings.TrimSpace(primitives.FirstNonEmptyRaw(familyAssignments[0].TenantID, tenantIDFromContext(ctx))),
			OrgID:    strings.TrimSpace(primitives.FirstNonEmptyRaw(familyAssignments[0].OrgID, orgIDFromContext(ctx))),
		}
		family, ok, detailErr := runtime.service.Detail(ctx, translationservices.GetFamilyInput{
			Scope:       scope,
			Environment: environment,
			FamilyID:    familyID,
		})
		if detailErr != nil || !ok {
			continue
		}
		for _, assignment := range familyAssignments {
			if b.assignmentHasQABlockersForFamily(assignment, family, environment) {
				blocked[strings.TrimSpace(assignment.ID)] = struct{}{}
			}
		}
	}
	return blocked
}

func (b *translationQueueBinding) assignmentRepository() (TranslationAssignmentRepository, error) {
	if b == nil || b.admin == nil || b.admin.registry == nil {
		return nil, serviceNotConfiguredDomainError("translation assignment repository", map[string]any{
			"component": "translation_queue_binding",
		})
	}
	panel, ok := b.admin.registry.Panel(translationQueuePanelID)
	if !ok || panel == nil {
		return nil, serviceNotConfiguredDomainError("translation assignment repository", map[string]any{
			"component": "translation_queue_binding",
		})
	}
	repo, ok := panel.repo.(*TranslationAssignmentPanelRepository)
	if !ok || repo == nil || repo.repo == nil {
		return nil, serviceNotConfiguredDomainError("translation assignment repository", map[string]any{
			"component": "translation_queue_binding",
		})
	}
	return repo.repo, nil
}

func (b *translationQueueBinding) assignmentContractRow(ctx context.Context, assignment TranslationAssignment, now time.Time, environment string) map[string]any {
	row := translationQueueAssignmentContractRow(assignment, now)
	row["actions"] = b.assignmentActionStates(ctx, assignment)
	row["review_actions"] = b.reviewActionStates(ctx, assignment)
	if feedback := translationAssignmentReviewFeedbackPayload(assignment); len(feedback) > 0 {
		row["review_feedback"] = feedback
		row["last_rejection_reason"] = feedback["last_rejection_reason"]
	}
	if summary := b.assignmentQASummary(ctx, assignment, environment); len(summary) > 0 {
		row["qa_summary"] = summary
	}
	return row
}

func translationQueueAssignmentContractRow(assignment TranslationAssignment, now time.Time) map[string]any {
	queueState := normalizeTranslationQueueState(string(assignment.Status))
	contentState := translationQueueContentState(assignment.Status)
	row := map[string]any{
		"id":               strings.TrimSpace(assignment.ID),
		"family_id":        strings.TrimSpace(assignment.FamilyID),
		"entity_type":      strings.TrimSpace(assignment.EntityType),
		"source_record_id": strings.TrimSpace(assignment.SourceRecordID),
		"target_record_id": strings.TrimSpace(assignment.TargetRecordID),
		"source_locale":    strings.TrimSpace(assignment.SourceLocale),
		"target_locale":    strings.TrimSpace(assignment.TargetLocale),
		"work_scope":       normalizeTranslationAssignmentWorkScope(assignment.WorkScope),
		"source_title":     strings.TrimSpace(assignment.SourceTitle),
		"source_path":      strings.TrimSpace(assignment.SourcePath),
		"assignee_id":      strings.TrimSpace(assignment.AssigneeID),
		"reviewer_id":      strings.TrimSpace(firstNonEmpty(assignment.ReviewerID, assignment.LastReviewerID)),
		"assignment_type":  strings.TrimSpace(string(assignment.AssignmentType)),
		"content_state":    contentState,
		"queue_state":      queueState,
		"status":           queueState,
		"priority":         strings.TrimSpace(string(assignment.Priority)),
		"due_state":        translationQueueDueState(assignment.DueDate, now),
		"row_version":      assignment.Version,
		"version":          assignment.Version,
		"updated_at":       assignment.UpdatedAt,
		"created_at":       assignment.CreatedAt,
	}
	if assignment.DueDate != nil {
		row["due_date"] = assignment.DueDate
	}
	return row
}

func translationAssignmentReviewFeedbackPayload(assignment TranslationAssignment) map[string]any {
	reason := strings.TrimSpace(assignment.LastRejectionReason)
	if reason == "" {
		return nil
	}
	return map[string]any{
		"last_rejection_reason": reason,
		"last_reviewer_id":      strings.TrimSpace(firstNonEmpty(assignment.LastReviewerID, assignment.ReviewerID)),
	}
}

func (b *translationQueueBinding) assignmentActionStates(ctx context.Context, assignment TranslationAssignment) map[string]any {
	return map[string]any{
		"claim":   b.claimActionState(ctx, assignment),
		"release": b.releaseActionState(ctx, assignment),
	}
}

func (b *translationQueueBinding) claimActionState(ctx context.Context, assignment TranslationAssignment) map[string]any {
	actorID := strings.TrimSpace(actorFromContext(ctx))
	switch assignment.Status {
	case AssignmentStatusOpen:
		return b.queueActionState(ctx, assignment.AssignmentType == AssignmentTypeOpenPool, PermAdminTranslationsClaim, "assignment must be open pool or already assigned to you before it can be claimed")
	case AssignmentStatusAssigned, AssignmentStatusChangesRequested:
		if actorID != "" && strings.EqualFold(strings.TrimSpace(assignment.AssigneeID), actorID) {
			return b.queueActionState(ctx, true, PermAdminTranslationsClaim, "")
		}
		state := b.queueActionState(ctx, false, PermAdminTranslationsClaim, "assignment is assigned to a different translator")
		state["reason_code"] = ActionDisabledReasonCodePermissionDenied
		return state
	default:
		return b.queueActionState(ctx, false, PermAdminTranslationsClaim, "assignment must be open pool or already assigned to you before it can be claimed")
	}
}

func (b *translationQueueBinding) releaseActionState(ctx context.Context, assignment TranslationAssignment) map[string]any {
	statusAllowed := assignment.Status == AssignmentStatusAssigned || assignment.Status == AssignmentStatusInProgress || assignment.Status == AssignmentStatusChangesRequested
	return b.queueActionState(ctx, statusAllowed, PermAdminTranslationsAssign, "assignment must be assigned or in progress before it can be released")
}

func (b *translationQueueBinding) reviewActionStates(ctx context.Context, assignment TranslationAssignment) map[string]any {
	return map[string]any{
		"submit_review": b.queueActionState(ctx, assignment.Status == AssignmentStatusInProgress, PermAdminTranslationsEdit, "assignment must be in progress"),
		"approve":       b.reviewLifecycleActionState(ctx, assignment, PermAdminTranslationsApprove, "assignment must be in review"),
		"reject":        b.reviewLifecycleActionState(ctx, assignment, PermAdminTranslationsApprove, "assignment must be in review"),
		"archive":       b.queueActionState(ctx, assignment.Status != AssignmentStatusArchived, PermAdminTranslationsManage, "archived assignments cannot be archived again"),
	}
}

func (b *translationQueueBinding) reviewLifecycleActionState(ctx context.Context, assignment TranslationAssignment, permission, statusReason string) map[string]any {
	state := b.queueActionState(ctx, assignment.Status == AssignmentStatusInReview, permission, statusReason)
	if enabled, _ := state["enabled"].(bool); !enabled {
		return state
	}
	actorID := strings.TrimSpace(actorFromContext(ctx))
	expectedReviewerID := strings.TrimSpace(firstNonEmpty(assignment.ReviewerID, assignment.LastReviewerID))
	if expectedReviewerID == "" || actorID == "" || strings.EqualFold(actorID, expectedReviewerID) {
		return state
	}
	state["enabled"] = false
	state["reason"] = "assignment is assigned to a different reviewer"
	state["reason_code"] = ActionDisabledReasonCodePermissionDenied
	state["expected_reviewer_id"] = expectedReviewerID
	return state
}

func (b *translationQueueBinding) assignmentQASummary(ctx context.Context, assignment TranslationAssignment, environment string) map[string]any {
	if !b.translationQAEnabled() || strings.TrimSpace(assignment.TargetRecordID) == "" {
		return nil
	}
	editorCtx, err := b.loadAssignmentEditorContext(ctx, assignment, environment)
	if err != nil {
		return nil
	}
	return translationQASummaryPayload(b.translationQAResults(editorCtx))
}

func (b *translationQueueBinding) assignmentQASummaryForFamily(assignment TranslationAssignment, family translationservices.FamilyRecord, environment string) map[string]any {
	if !b.translationQAEnabled() || strings.TrimSpace(assignment.TargetRecordID) == "" {
		return nil
	}
	editorCtx, ok := translationEditorContextFromFamily(family, assignment, environment)
	if !ok {
		return nil
	}
	return translationQASummaryPayload(b.translationQAResults(editorCtx))
}

func (b *translationQueueBinding) assignmentHasQABlockersForFamily(assignment TranslationAssignment, family translationservices.FamilyRecord, environment string) bool {
	summary := b.assignmentQASummaryForFamily(assignment, family, environment)
	return intValue(summary["blocker_count"]) > 0
}

func (b *translationQueueBinding) queueActionState(ctx context.Context, statusAllowed bool, permission, statusReason string) map[string]any {
	if ctx == nil {
		ctx = context.Background()
	}
	permission = strings.TrimSpace(permission)
	allowed := true
	if permission != "" && b != nil && b.admin != nil && b.admin.authorizer != nil {
		allowed = b.admin.authorizer.Can(ctx, permission, "translations")
	}
	out := map[string]any{
		"enabled": statusAllowed && allowed,
	}
	if permission != "" {
		out["permission"] = permission
	}
	if statusAllowed && allowed {
		return out
	}
	if !allowed {
		out["reason"] = "missing permission: " + permission
		out["reason_code"] = ActionDisabledReasonCodePermissionDenied
		return out
	}
	out["reason"] = strings.TrimSpace(statusReason)
	out["reason_code"] = ActionDisabledReasonCodeInvalidStatus
	return out
}

func translationQueueContentState(status AssignmentStatus) string {
	switch normalizeTranslationQueueState(string(status)) {
	case string(AssignmentStatusInReview):
		return translationQueueContentStateReview
	case string(AssignmentStatusApproved):
		return translationQueueContentStateReady
	case string(AssignmentStatusArchived):
		return translationQueueContentStateArchived
	default:
		return translationQueueContentStateDraft
	}
}

func translationQueueDueState(dueDate *time.Time, now time.Time) string {
	if dueDate == nil || dueDate.IsZero() {
		return translationQueueDueStateNone
	}
	due := dueDate.UTC()
	current := now.UTC()
	if due.Before(current) {
		return translationQueueDueStateOverdue
	}
	if due.Sub(current) <= translationQueueDueSoonWindow {
		return translationQueueDueStateSoon
	}
	return translationQueueDueStateOnTrack
}

func (b *translationQueueBinding) panelForEntityType(entityType, env string) (*Panel, string, bool) {
	if b == nil || b.admin == nil || b.admin.registry == nil {
		return nil, "", false
	}
	entityType = normalizeTranslationQueueEntityType(entityType)
	env = strings.TrimSpace(env)
	if entityType == "" {
		return nil, "", false
	}

	candidates := []string{}
	if strings.Contains(entityType, "@") {
		candidates = append(candidates, entityType)
	} else if env != "" {
		candidates = append(candidates, entityType+"@"+env)
	}
	candidates = append(candidates, entityType)

	for _, candidate := range candidates {
		panel, ok := b.admin.registry.Panel(candidate)
		if ok && panel != nil {
			return panel, candidate, true
		}
	}
	return nil, "", false
}

func (b *translationQueueBinding) translationPolicyForPanel(panel *Panel) TranslationPolicy {
	if panel != nil && panel.translationPolicy != nil {
		return panel.translationPolicy
	}
	if b != nil && b.admin != nil {
		return b.admin.translationPolicy
	}
	return nil
}

func translationQueueSourceRecordOption(record map[string]any, panelName string) map[string]any {
	return translationqueue.SourceRecordOption(record, panelName)
}

func translationQueueAssigneeOption(record map[string]any) map[string]any {
	return translationqueue.AssigneeOption(record)
}

func translationQueueOptionsSearch(c router.Context) string {
	if c == nil {
		return ""
	}
	return translationqueue.OptionsSearch(func(key string) string { return c.Query(key) })
}

func translationQueueFilterOptionsBySearch(options []map[string]any, search string) []map[string]any {
	return translationqueue.FilterOptionsBySearch(options, search)
}

func translationQueueOptionMatchesSearch(option map[string]any, search string) bool {
	return translationqueue.OptionMatchesSearch(option, search)
}

func sortTranslationQueueOptions(options []map[string]any) {
	translationqueue.SortOptions(options)
}

func normalizeTranslationQueueEntityType(raw string) string {
	return translationqueue.NormalizeEntityType(raw)
}

func translationQueueEntityTypeLabel(entityType string) string {
	return translationqueue.EntityTypeLabel(entityType)
}

func clampInt(value, minValue, maxValue int) int {
	if value < minValue {
		return minValue
	}
	if maxValue > 0 && value > maxValue {
		return maxValue
	}
	return value
}

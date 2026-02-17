package admin

import (
	"context"
	"strings"
	"time"

	router "github.com/goliatone/go-router"
)

const translationQueueDueSoonWindow = 48 * time.Hour

type translationQueueBinding struct {
	admin *Admin
	now   func() time.Time
}

func newTranslationQueueBinding(a *Admin) *translationQueueBinding {
	if a == nil {
		return nil
	}
	return &translationQueueBinding{
		admin: a,
		now:   func() time.Time { return time.Now().UTC() },
	}
}

func (b *translationQueueBinding) MyWork(c router.Context) (any, error) {
	if b == nil || b.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation queue binding", map[string]any{
			"component": "translation_queue_binding",
		})
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.admin.requirePermission(adminCtx, PermAdminTranslationsView, "translations"); err != nil {
		return nil, err
	}
	repo, err := b.assignmentRepository()
	if err != nil {
		return nil, err
	}

	userID := strings.TrimSpace(firstNonEmpty(adminCtx.UserID, actorFromContext(adminCtx.Context)))
	page := clampInt(atoiDefault(c.Query("page"), 1), 1, 10_000)
	perPage := clampInt(atoiDefault(c.Query("per_page"), 25), 1, 200)
	now := b.now().UTC()
	summary := map[string]int{
		"total":                         0,
		translationQueueDueStateOverdue: 0,
		translationQueueDueStateSoon:    0,
		translationQueueDueStateOnTrack: 0,
		translationQueueDueStateNone:    0,
		"review":                        0,
	}
	if userID == "" {
		return map[string]any{
			"scope":       "my_work",
			"user_id":     "",
			"summary":     summary,
			"assignments": []map[string]any{},
			"items":       []map[string]any{},
			"total":       0,
			"page":        page,
			"per_page":    perPage,
			"updated_at":  now,
		}, nil
	}

	filters := map[string]any{
		"assignee_id": userID,
	}
	if status := strings.TrimSpace(strings.ToLower(c.Query("status"))); status != "" {
		filters["status"] = status
	}

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

	rows := make([]map[string]any, 0, len(assignments))
	for _, assignment := range assignments {
		row := b.assignmentContractRow(adminCtx.Context, assignment, now)
		rows = append(rows, row)
	}
	for _, assignment := range summaryAssignments {
		dueState := translationQueueDueState(assignment.DueDate, now)
		summary[dueState]++
		summary["total"]++
		if assignment.Status == AssignmentStatusReview {
			summary["review"]++
		}
	}

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
	}, nil
}

func (b *translationQueueBinding) Queue(c router.Context) (any, error) {
	if b == nil || b.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation queue binding", map[string]any{
			"component": "translation_queue_binding",
		})
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.admin.requirePermission(adminCtx, PermAdminTranslationsView, "translations"); err != nil {
		return nil, err
	}
	repo, err := b.assignmentRepository()
	if err != nil {
		return nil, err
	}
	page := clampInt(atoiDefault(c.Query("page"), 1), 1, 10_000)
	perPage := clampInt(atoiDefault(c.Query("per_page"), 50), 1, 200)
	now := b.now().UTC()

	filters := map[string]any{}
	if assigneeID := strings.TrimSpace(c.Query("assignee_id")); assigneeID != "" {
		filters["assignee_id"] = assigneeID
	}
	if status := strings.TrimSpace(strings.ToLower(c.Query("status"))); status != "" {
		filters["status"] = status
	}
	if reviewOnly := strings.TrimSpace(strings.ToLower(c.Query("review"))); reviewOnly == "1" || reviewOnly == "true" {
		filters["status"] = string(AssignmentStatusReview)
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
		row := b.assignmentContractRow(adminCtx.Context, assignment, now)
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
	}, nil
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
			Filters: cloneAnyMap(filters),
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

func (b *translationQueueBinding) assignmentContractRow(ctx context.Context, assignment TranslationAssignment, now time.Time) map[string]any {
	row := translationQueueAssignmentContractRow(assignment, now)
	row["review_actions"] = b.reviewActionStates(ctx, assignment.Status)
	return row
}

func translationQueueAssignmentContractRow(assignment TranslationAssignment, now time.Time) map[string]any {
	queueState := normalizeTranslationQueueState(string(assignment.Status))
	contentState := translationQueueContentState(assignment.Status)
	row := map[string]any{
		"id":                   strings.TrimSpace(assignment.ID),
		"translation_group_id": strings.TrimSpace(assignment.TranslationGroupID),
		"entity_type":          strings.TrimSpace(assignment.EntityType),
		"source_record_id":     strings.TrimSpace(assignment.SourceRecordID),
		"target_record_id":     strings.TrimSpace(assignment.TargetRecordID),
		"source_locale":        strings.TrimSpace(assignment.SourceLocale),
		"target_locale":        strings.TrimSpace(assignment.TargetLocale),
		"source_title":         strings.TrimSpace(assignment.SourceTitle),
		"source_path":          strings.TrimSpace(assignment.SourcePath),
		"assignee_id":          strings.TrimSpace(assignment.AssigneeID),
		"assignment_type":      strings.TrimSpace(string(assignment.AssignmentType)),
		"content_state":        contentState,
		"queue_state":          queueState,
		"status":               queueState,
		"priority":             strings.TrimSpace(string(assignment.Priority)),
		"due_state":            translationQueueDueState(assignment.DueDate, now),
		"updated_at":           assignment.UpdatedAt,
		"created_at":           assignment.CreatedAt,
	}
	if assignment.DueDate != nil {
		row["due_date"] = assignment.DueDate
	}
	return row
}

func (b *translationQueueBinding) reviewActionStates(ctx context.Context, status AssignmentStatus) map[string]any {
	return map[string]any{
		"submit_review": b.queueActionState(ctx, status == AssignmentStatusInProgress, PermAdminTranslationsEdit, "assignment must be in progress"),
		"approve":       b.queueActionState(ctx, status == AssignmentStatusReview, PermAdminTranslationsApprove, "assignment must be in review"),
		"reject":        b.queueActionState(ctx, status == AssignmentStatusReview, PermAdminTranslationsApprove, "assignment must be in review"),
	}
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
	case string(AssignmentStatusReview):
		return translationQueueContentStateReview
	case string(AssignmentStatusApproved), string(AssignmentStatusPublished):
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

func clampInt(value, minValue, maxValue int) int {
	if value < minValue {
		return minValue
	}
	if maxValue > 0 && value > maxValue {
		return maxValue
	}
	return value
}

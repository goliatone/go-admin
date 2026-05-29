package admin

import (
	"context"
	"database/sql"
	"errors"
	"maps"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type bunTranslationAssignmentRecord struct {
	bun.BaseModel `bun:"table:translation_assignments,alias:ta"`

	AssignmentID        string         `bun:"assignment_id,pk" json:"assignment_id"`
	TenantID            string         `bun:"tenant_id" json:"tenant_id"`
	OrgID               string         `bun:"org_id" json:"org_id"`
	FamilyID            string         `bun:"family_id" json:"family_id"`
	VariantID           sql.NullString `bun:"variant_id" json:"variant_id"`
	EntityType          string         `bun:"entity_type" json:"entity_type"`
	SourceRecordID      string         `bun:"source_record_id" json:"source_record_id"`
	SourceLocale        string         `bun:"source_locale" json:"source_locale"`
	TargetLocale        string         `bun:"target_locale" json:"target_locale"`
	TargetRecordID      string         `bun:"target_record_id" json:"target_record_id"`
	SourceTitle         string         `bun:"source_title" json:"source_title"`
	SourcePath          string         `bun:"source_path" json:"source_path"`
	WorkScope           string         `bun:"work_scope" json:"work_scope"`
	AssignmentType      string         `bun:"assignment_type" json:"assignment_type"`
	Status              string         `bun:"status" json:"status"`
	AssigneeID          string         `bun:"assignee_id" json:"assignee_id"`
	ReviewerID          string         `bun:"reviewer_id" json:"reviewer_id"`
	AssignerID          string         `bun:"assigner_id" json:"assigner_id"`
	LastReviewerID      string         `bun:"last_reviewer_id" json:"last_reviewer_id"`
	LastRejectionReason string         `bun:"last_rejection_reason" json:"last_rejection_reason"`
	Priority            string         `bun:"priority" json:"priority"`
	DueDate             *time.Time     `bun:"due_date,nullzero" json:"due_date"`
	RowVersion          int64          `bun:"row_version" json:"row_version"`
	ClaimedAt           *time.Time     `bun:"claimed_at,nullzero" json:"claimed_at"`
	SubmittedAt         *time.Time     `bun:"submitted_at,nullzero" json:"submitted_at"`
	ApprovedAt          *time.Time     `bun:"approved_at,nullzero" json:"approved_at"`
	PublishedAt         *time.Time     `bun:"published_at,nullzero" json:"published_at"`
	ArchivedAt          *time.Time     `bun:"archived_at,nullzero" json:"archived_at"`
	CreatedAt           time.Time      `bun:"created_at" json:"created_at"`
	UpdatedAt           time.Time      `bun:"updated_at" json:"updated_at"`
}

type BunTranslationAssignmentRepository struct {
	db *bun.DB
}

func NewBunTranslationAssignmentRepository(db *bun.DB) *BunTranslationAssignmentRepository {
	if db == nil {
		return nil
	}
	return &BunTranslationAssignmentRepository{db: db}
}

func (r *BunTranslationAssignmentRepository) List(ctx context.Context, opts ListOptions) ([]TranslationAssignment, int, error) {
	if r == nil || r.db == nil {
		return nil, 0, serviceNotConfiguredDomainError("translation assignment repository", nil)
	}
	now := time.Now().UTC()
	return r.list(ctx, opts, now)
}

func (r *BunTranslationAssignmentRepository) list(ctx context.Context, opts ListOptions, now time.Time) ([]TranslationAssignment, int, error) {
	if r == nil || r.db == nil {
		return nil, 0, serviceNotConfiguredDomainError("translation assignment repository", nil)
	}
	now = normalizedBunAssignmentQueryNow(now)
	dueSQL := r.assignmentDueDateSQL(now)
	total, err := r.countAssignments(ctx, opts, now)
	if err != nil {
		return nil, 0, err
	}
	records := []bunTranslationAssignmentRecord{}
	query := r.db.NewSelect().Model(&records)
	applyBunAssignmentListFilters(query, opts, dueSQL)
	applyBunAssignmentListSort(query, opts, dueSQL)
	applyBunAssignmentPagination(query, opts, 20)
	if err := query.Scan(ctx); err != nil {
		return nil, 0, err
	}
	items := make([]TranslationAssignment, 0, len(records))
	for _, record := range records {
		items = append(items, translationAssignmentFromBunRecord(record))
	}
	return items, total, nil
}

func (r *BunTranslationAssignmentRepository) countAssignments(ctx context.Context, opts ListOptions, now time.Time) (int, error) {
	query := r.db.NewSelect().Model((*bunTranslationAssignmentRecord)(nil))
	applyBunAssignmentListFilters(query, opts, r.assignmentDueDateSQL(now))
	return query.Count(ctx)
}

func (r *BunTranslationAssignmentRepository) ListAssignmentPage(ctx context.Context, input TranslationAssignmentPageQueryInput) (TranslationAssignmentPageQueryResult, error) {
	if r == nil || r.db == nil {
		return TranslationAssignmentPageQueryResult{}, serviceNotConfiguredDomainError("translation assignment repository", nil)
	}
	if normalizeTranslationQueueReviewState(input.Filter.ReviewState) == translationQueueReviewStateQABlocked {
		return TranslationAssignmentPageQueryResult{}, ErrTranslationAssignmentQueryUnsupported
	}
	opts, unsupported := listOptionsFromAssignmentPageQuery(input)
	if unsupported {
		return TranslationAssignmentPageQueryResult{}, ErrTranslationAssignmentQueryUnsupported
	}
	now := normalizedBunAssignmentQueryNow(input.Now)
	items, total, err := r.list(ctx, opts, now)
	if err != nil {
		return TranslationAssignmentPageQueryResult{}, err
	}
	return TranslationAssignmentPageQueryResult{Items: items, Total: total}, nil
}

func listOptionsFromAssignmentPageQuery(input TranslationAssignmentPageQueryInput) (ListOptions, bool) {
	filter := input.Filter
	if filter.AssigneeID == translationQueueMissingActorFilterToken || filter.ReviewerID == translationQueueMissingActorFilterToken {
		return ListOptions{Page: input.Page, PerPage: input.PerPage, Filters: map[string]any{"assignment_id": "__no_assignment__"}}, false
	}
	filters := map[string]any{}
	if filter.TenantID != "" {
		filters["tenant_id"] = filter.TenantID
	}
	if filter.OrgID != "" {
		filters["org_id"] = filter.OrgID
	}
	if filter.FamilyID != "" {
		filters["family_id"] = filter.FamilyID
	}
	if filter.Status != "" {
		filters["status"] = filter.Status
	}
	if filter.AssigneeID != "" {
		filters["assignee_id"] = filter.AssigneeID
	}
	if filter.ReviewerID != "" {
		filters["reviewer_id"] = filter.ReviewerID
	}
	if filter.Locale != "" {
		filters["target_locale"] = filter.Locale
	}
	if filter.Priority != "" {
		filters["priority"] = filter.Priority
	}
	if filter.DueState != "" {
		filters["due_state"] = filter.DueState
	}
	sortBy := strings.TrimSpace(strings.ToLower(filter.SortBy))
	if sortBy == "" {
		sortBy = "updated_at"
	}
	return ListOptions{
		Page:     input.Page,
		PerPage:  input.PerPage,
		SortBy:   sortBy,
		SortDesc: filter.SortDesc,
		Filters:  filters,
	}, false
}

func applyBunAssignmentListFilters(query *bun.SelectQuery, opts ListOptions, dueSQL bunAssignmentDueDateSQL) {
	if query == nil {
		return
	}
	for key, raw := range opts.Filters {
		key = strings.TrimSpace(strings.ToLower(key))
		if key == "" || key == "_search" {
			continue
		}
		applyBunAssignmentFilter(query, key, raw, dueSQL)
	}
	if search := inMemoryListSearchTerm(opts); search != "" {
		like := "%" + strings.ToLower(search) + "%"
		query.WhereGroup(" AND ", func(q *bun.SelectQuery) *bun.SelectQuery {
			return q.WhereOr("LOWER(assignment_id) LIKE ?", like).
				WhereOr("LOWER(source_title) LIKE ?", like).
				WhereOr("LOWER(source_path) LIKE ?", like).
				WhereOr("LOWER(family_id) LIKE ?", like).
				WhereOr("LOWER(entity_type) LIKE ?", like).
				WhereOr("LOWER(source_locale) LIKE ?", like).
				WhereOr("LOWER(target_locale) LIKE ?", like).
				WhereOr("LOWER(assignee_id) LIKE ?", like)
		})
	}
}

func applyBunAssignmentFilter(query *bun.SelectQuery, key string, raw any, dueSQL bunAssignmentDueDateSQL) {
	if key == "overdue" {
		if toBool(raw) {
			query.Where(dueSQL.expr+" IS NOT NULL").Where(dueSQL.expr+" < ?", dueSQL.now)
		}
		return
	}
	if key == "due_state" {
		applyBunAssignmentDueStateFilter(query, toString(raw), dueSQL)
		return
	}
	values := normalizedAssignmentFilterValues(raw)
	if len(values) == 0 {
		return
	}
	switch key {
	case "assignment_id", "id":
		query.Where("LOWER(assignment_id) IN (?)", bun.List(values))
	case "status":
		query.Where("LOWER(status) IN (?)", bun.List(values))
	case "target_locale", "locale":
		query.Where("LOWER(target_locale) IN (?)", bun.List(values))
	case "source_locale":
		query.Where("LOWER(source_locale) IN (?)", bun.List(values))
	case "assignee_id":
		query.Where("LOWER(assignee_id) IN (?)", bun.List(values))
	case "reviewer_id":
		query.Where("LOWER(COALESCE(NULLIF(reviewer_id, ''), last_reviewer_id, '')) IN (?)", bun.List(values))
	case "assignment_type":
		query.Where("LOWER(assignment_type) IN (?)", bun.List(values))
	case "work_scope":
		query.Where("LOWER(work_scope) IN (?)", bun.List(values))
	case "entity_type":
		query.Where("LOWER(entity_type) IN (?)", bun.List(values))
	case "priority":
		query.Where("LOWER(priority) IN (?)", bun.List(values))
	case "family_id":
		query.Where("LOWER(family_id) IN (?)", bun.List(values))
	case "tenant_id":
		query.Where("LOWER(tenant_id) IN (?)", bun.List(values))
	case "org_id":
		query.Where("LOWER(org_id) IN (?)", bun.List(values))
	case "source_record_id":
		query.Where("LOWER(source_record_id) IN (?)", bun.List(values))
	}
}

func applyBunAssignmentDueStateFilter(query *bun.SelectQuery, raw string, dueSQL bunAssignmentDueDateSQL) {
	states := normalizedAssignmentFilterValues(raw)
	if len(states) == 0 {
		return
	}
	query.WhereGroup(" AND ", func(q *bun.SelectQuery) *bun.SelectQuery {
		for _, state := range states {
			switch normalizeTranslationQueueDueState(state) {
			case translationQueueDueStateNone:
				q = q.WhereOr(dueSQL.expr + " IS NULL")
			case translationQueueDueStateOverdue:
				q = q.WhereOr("("+dueSQL.expr+" IS NOT NULL AND "+dueSQL.expr+" < ?)", dueSQL.now)
			case translationQueueDueStateSoon:
				q = q.WhereOr("("+dueSQL.expr+" IS NOT NULL AND "+dueSQL.expr+" >= ? AND "+dueSQL.expr+" <= ?)", dueSQL.now, dueSQL.soon)
			case translationQueueDueStateOnTrack:
				q = q.WhereOr("("+dueSQL.expr+" IS NOT NULL AND "+dueSQL.expr+" > ?)", dueSQL.soon)
			}
		}
		return q
	})
}

func normalizedAssignmentFilterValues(raw any) []string {
	out := []string{}
	for part := range strings.SplitSeq(toString(raw), ",") {
		value := strings.TrimSpace(strings.ToLower(part))
		if value != "" {
			out = append(out, value)
		}
	}
	return out
}

func applyBunAssignmentPagination(query *bun.SelectQuery, opts ListOptions, defaultPerPage int) {
	page := opts.Page
	if page <= 0 {
		page = 1
	}
	perPage := opts.PerPage
	if perPage <= 0 {
		perPage = defaultPerPage
	}
	if perPage <= 0 {
		perPage = 10
	}
	query.Limit(perPage).Offset((page - 1) * perPage)
}

func applyBunAssignmentListSort(query *bun.SelectQuery, opts ListOptions, dueSQL bunAssignmentDueDateSQL) {
	field := strings.TrimSpace(strings.ToLower(opts.SortBy))
	desc := opts.SortDesc
	if field == "" {
		field = "created_at"
		desc = true
	}
	applyBunAssignmentSort(query, field, desc, dueSQL)
}

func applyBunAssignmentSort(query *bun.SelectQuery, field string, desc bool, dueSQL bunAssignmentDueDateSQL) {
	dir := "ASC"
	if desc {
		dir = "DESC"
	}
	switch strings.TrimSpace(strings.ToLower(field)) {
	case "status":
		query.OrderExpr("status " + dir)
	case "target_locale", "locale":
		query.OrderExpr("target_locale " + dir)
	case "assignee_id":
		query.OrderExpr("assignee_id " + dir)
	case "reviewer_id":
		query.OrderExpr("COALESCE(NULLIF(reviewer_id, ''), last_reviewer_id, '') " + dir)
	case "priority":
		query.OrderExpr(bunAssignmentPriorityRankSQL() + " " + dir)
	case "due_state":
		query.OrderExpr(bunAssignmentDueStateRankSQL(dueSQL.expr)+" "+dir, dueSQL.now, dueSQL.soon)
	case "due_date":
		if desc {
			query.OrderExpr(dueSQL.expr + " IS NULL DESC").OrderExpr(dueSQL.expr + " DESC")
		} else {
			query.OrderExpr(dueSQL.expr + " IS NULL ASC").OrderExpr(dueSQL.expr + " ASC")
		}
	case "created_at":
		query.OrderExpr("created_at " + dir)
	default:
		query.OrderExpr("updated_at " + dir)
	}
	query.OrderExpr("assignment_id ASC")
}

func bunAssignmentPriorityRankSQL() string {
	return "CASE LOWER(priority) WHEN 'low' THEN 0 WHEN 'normal' THEN 1 WHEN 'high' THEN 2 WHEN 'urgent' THEN 3 ELSE -1 END"
}

func bunAssignmentDueStateRankSQL(dueDateExpr string) string {
	return "CASE WHEN " + dueDateExpr + " IS NULL THEN 0 WHEN " + dueDateExpr + " < ? THEN 3 WHEN " + dueDateExpr + " <= ? THEN 2 ELSE 1 END"
}

type bunAssignmentDueDateSQL struct {
	expr string
	now  any
	soon any
}

func (r *BunTranslationAssignmentRepository) assignmentDueDateSQL(now time.Time) bunAssignmentDueDateSQL {
	now = normalizedBunAssignmentQueryNow(now)
	soon := now.Add(translationQueueDueSoonWindow)
	if r != nil && r.db != nil && strings.EqualFold(r.db.Dialect().Name().String(), "pg") {
		return bunAssignmentDueDateSQL{
			expr: "NULLIF(due_date, '')::timestamptz",
			now:  now,
			soon: soon,
		}
	}
	return bunAssignmentDueDateSQL{
		expr: "due_date",
		now:  bunAssignmentSQLiteDateValue(now),
		soon: bunAssignmentSQLiteDateValue(soon),
	}
}

func normalizedBunAssignmentQueryNow(now time.Time) time.Time {
	now = now.UTC()
	if now.IsZero() {
		return time.Now().UTC()
	}
	return now
}

func bunAssignmentSQLiteDateValue(value time.Time) string {
	return value.UTC().Format("2006-01-02 15:04:05")
}

func (r *BunTranslationAssignmentRepository) AssignmentQueueSummary(ctx context.Context, input TranslationAssignmentQueueSummaryInput) (TranslationAssignmentQueueSummary, error) {
	if r == nil || r.db == nil {
		return TranslationAssignmentQueueSummary{}, serviceNotConfiguredDomainError("translation assignment repository", nil)
	}
	now := normalizedBunAssignmentQueryNow(input.Now)
	opts := ListOptions{Filters: cloneAssignmentFilterMap(input.Filters)}
	total, err := r.countAssignments(ctx, opts, now)
	if err != nil {
		return TranslationAssignmentQueueSummary{}, err
	}
	byQueueState, err := r.countAssignmentsByString(ctx, opts, now, "status")
	if err != nil {
		return TranslationAssignmentQueueSummary{}, err
	}
	byDueState, err := r.countAssignmentsByDueState(ctx, opts, now)
	if err != nil {
		return TranslationAssignmentQueueSummary{}, err
	}
	return TranslationAssignmentQueueSummary{Total: total, ByQueueState: byQueueState, ByDueState: byDueState}, nil
}

func (r *BunTranslationAssignmentRepository) AssignmentMyWorkSummary(ctx context.Context, input TranslationAssignmentMyWorkSummaryInput) (map[string]int, error) {
	if r == nil || r.db == nil {
		return nil, serviceNotConfiguredDomainError("translation assignment repository", nil)
	}
	now := normalizedBunAssignmentQueryNow(input.Now)
	opts := ListOptions{Filters: cloneAssignmentFilterMap(input.Filters)}
	total, err := r.countAssignments(ctx, opts, now)
	if err != nil {
		return nil, err
	}
	byDueState, err := r.countAssignmentsByDueState(ctx, opts, now)
	if err != nil {
		return nil, err
	}
	review := 0
	if assignmentFiltersAllowStatus(input.Filters, AssignmentStatusInReview) {
		reviewOpts := ListOptions{Filters: cloneAssignmentFilterMap(input.Filters)}
		if reviewOpts.Filters == nil {
			reviewOpts.Filters = map[string]any{}
		}
		reviewOpts.Filters["status"] = string(AssignmentStatusInReview)
		review, err = r.countAssignments(ctx, reviewOpts, now)
		if err != nil {
			return nil, err
		}
	}
	return map[string]int{
		"total":                         total,
		translationQueueDueStateOverdue: byDueState[translationQueueDueStateOverdue],
		translationQueueDueStateSoon:    byDueState[translationQueueDueStateSoon],
		translationQueueDueStateOnTrack: byDueState[translationQueueDueStateOnTrack],
		translationQueueDueStateNone:    byDueState[translationQueueDueStateNone],
		"review":                        review,
	}, nil
}

func assignmentFiltersAllowStatus(filters map[string]any, status AssignmentStatus) bool {
	if len(filters) == 0 {
		return true
	}
	raw, ok := filters["status"]
	if !ok {
		return true
	}
	values := normalizedAssignmentFilterValues(raw)
	if len(values) == 0 {
		return true
	}
	expected := normalizeTranslationQueueState(string(status))
	for _, value := range values {
		if normalizeTranslationQueueState(value) == expected {
			return true
		}
	}
	return false
}

func (r *BunTranslationAssignmentRepository) AssignmentDashboardSummary(ctx context.Context, input TranslationAssignmentDashboardSummaryInput) (TranslationAssignmentDashboardSummary, error) {
	if r == nil || r.db == nil {
		return TranslationAssignmentDashboardSummary{}, serviceNotConfiguredDomainError("translation assignment repository", nil)
	}
	now := normalizedBunAssignmentQueryNow(input.Now)
	scope := map[string]any{}
	if input.TenantID != "" {
		scope["tenant_id"] = input.TenantID
	}
	if input.OrgID != "" {
		scope["org_id"] = input.OrgID
	}
	out := TranslationAssignmentDashboardSummary{}
	if strings.TrimSpace(input.ActorID) != "" {
		myFilters := cloneAssignmentFilterMap(scope)
		myFilters["assignee_id"] = input.ActorID
		myFilters["status"] = strings.Join([]string{
			string(AssignmentStatusOpen),
			string(AssignmentStatusAssigned),
			string(AssignmentStatusInProgress),
			string(AssignmentStatusInReview),
			string(AssignmentStatusChangesRequested),
		}, ",")
		var err error
		out.MyTasks, err = r.countAssignments(ctx, ListOptions{Filters: myFilters}, now)
		if err != nil {
			return TranslationAssignmentDashboardSummary{}, err
		}
		inProgress := cloneAssignmentFilterMap(myFilters)
		inProgress["status"] = string(AssignmentStatusInProgress)
		out.MyInProgress, err = r.countAssignments(ctx, ListOptions{Filters: inProgress}, now)
		if err != nil {
			return TranslationAssignmentDashboardSummary{}, err
		}
		dueSoon := cloneAssignmentFilterMap(myFilters)
		dueSoon["due_state"] = translationQueueDueStateSoon
		out.MyDueSoon, err = r.countAssignments(ctx, ListOptions{Filters: dueSoon}, now)
		if err != nil {
			return TranslationAssignmentDashboardSummary{}, err
		}
		myOverdue := cloneAssignmentFilterMap(myFilters)
		myOverdue["due_state"] = translationQueueDueStateOverdue
		out.MyOverdue, err = r.countAssignments(ctx, ListOptions{Filters: myOverdue}, now)
		if err != nil {
			return TranslationAssignmentDashboardSummary{}, err
		}
		reviewFilters := cloneAssignmentFilterMap(scope)
		reviewFilters["reviewer_id"] = input.ActorID
		reviewFilters["status"] = string(AssignmentStatusInReview)
		out.NeedsReview, err = r.countAssignments(ctx, ListOptions{Filters: reviewFilters}, now)
		if err != nil {
			return TranslationAssignmentDashboardSummary{}, err
		}
		reviewOverdue := cloneAssignmentFilterMap(reviewFilters)
		reviewOverdue["due_state"] = translationQueueDueStateOverdue
		out.NeedsReviewOverdue, err = r.countAssignments(ctx, ListOptions{Filters: reviewOverdue}, now)
		if err != nil {
			return TranslationAssignmentDashboardSummary{}, err
		}
	}
	overdueFilters := cloneAssignmentFilterMap(scope)
	overdueFilters["due_state"] = translationQueueDueStateOverdue
	overdueFilters["status"] = strings.Join([]string{
		string(AssignmentStatusOpen),
		string(AssignmentStatusAssigned),
		string(AssignmentStatusInProgress),
		string(AssignmentStatusInReview),
		string(AssignmentStatusChangesRequested),
		string(AssignmentStatusApproved),
	}, ",")
	var err error
	out.OverdueTasks, err = r.countAssignments(ctx, ListOptions{Filters: overdueFilters}, now)
	if err != nil {
		return TranslationAssignmentDashboardSummary{}, err
	}
	highOverdue := cloneAssignmentFilterMap(overdueFilters)
	highOverdue["priority"] = strings.Join([]string{string(PriorityHigh), string(PriorityUrgent)}, ",")
	out.HighPriorityOverdue, err = r.countAssignments(ctx, ListOptions{Filters: highOverdue}, now)
	if err != nil {
		return TranslationAssignmentDashboardSummary{}, err
	}
	limit := input.OverdueLimit
	if limit <= 0 {
		limit = translationDashboardDefaultOverdueLimit
	}
	top, err := r.dashboardTopOverdueAssignments(ctx, overdueFilters, now, limit)
	if err != nil {
		return TranslationAssignmentDashboardSummary{}, err
	}
	out.TopOverdue = top
	return out, nil
}

func (r *BunTranslationAssignmentRepository) dashboardTopOverdueAssignments(ctx context.Context, filters map[string]any, now time.Time, limit int) ([]TranslationAssignment, error) {
	records := []bunTranslationAssignmentRecord{}
	query := r.db.NewSelect().Model(&records)
	dueSQL := r.assignmentDueDateSQL(now)
	applyBunAssignmentListFilters(query, ListOptions{Filters: filters}, dueSQL)
	query.OrderExpr(dueSQL.expr + " IS NULL ASC").
		OrderExpr(dueSQL.expr + " ASC").
		OrderExpr(bunAssignmentPriorityRankSQL() + " DESC").
		OrderExpr("assignment_id ASC").
		Limit(limit)
	if err := query.Scan(ctx); err != nil {
		return nil, err
	}
	out := make([]TranslationAssignment, 0, len(records))
	for _, record := range records {
		out = append(out, translationAssignmentFromBunRecord(record))
	}
	return out, nil
}

func (r *BunTranslationAssignmentRepository) AssignmentReviewerAggregateCounts(_ context.Context, input TranslationAssignmentReviewerAggregateInput) (map[string]int, error) {
	counts := map[string]int{}
	for _, key := range TranslationQueueReviewAggregateCountKeys() {
		counts[key] = 0
	}
	if r == nil || r.db == nil {
		return counts, serviceNotConfiguredDomainError("translation assignment repository", nil)
	}
	if strings.TrimSpace(input.ActorID) == "" {
		return counts, nil
	}
	// review_blocked depends on QA/family blocker evaluation, which is not stored
	// as an indexed assignment aggregate. Decline so the binding uses the
	// existing QA-aware compatibility path instead of returning a false zero.
	return counts, ErrTranslationAssignmentQueryUnsupported
}

type bunCountRow struct {
	Key   string `bun:"key"`
	Count int    `bun:"count"`
}

func (r *BunTranslationAssignmentRepository) countAssignmentsByString(ctx context.Context, opts ListOptions, now time.Time, column string) (map[string]int, error) {
	rows := []bunCountRow{}
	query := r.db.NewSelect().
		Model((*bunTranslationAssignmentRecord)(nil)).
		ColumnExpr("LOWER(" + column + ") AS key").
		ColumnExpr("COUNT(*) AS count").
		GroupExpr("LOWER(" + column + ")")
	applyBunAssignmentListFilters(query, opts, r.assignmentDueDateSQL(now))
	if err := query.Scan(ctx, &rows); err != nil {
		return nil, err
	}
	out := map[string]int{}
	for _, row := range rows {
		out[normalizeTranslationQueueState(row.Key)] = row.Count
	}
	return out, nil
}

func (r *BunTranslationAssignmentRepository) countAssignmentsByDueState(ctx context.Context, opts ListOptions, now time.Time) (map[string]int, error) {
	rows := []bunCountRow{}
	dueSQL := r.assignmentDueDateSQL(now)
	dueStateSQL := "CASE WHEN " + dueSQL.expr + " IS NULL THEN '" + translationQueueDueStateNone + "' WHEN " + dueSQL.expr + " < ? THEN '" + translationQueueDueStateOverdue + "' WHEN " + dueSQL.expr + " <= ? THEN '" + translationQueueDueStateSoon + "' ELSE '" + translationQueueDueStateOnTrack + "' END"
	query := r.db.NewSelect().
		Model((*bunTranslationAssignmentRecord)(nil)).
		ColumnExpr(dueStateSQL+" AS key", dueSQL.now, dueSQL.soon).
		ColumnExpr("COUNT(*) AS count").
		GroupExpr(dueStateSQL, dueSQL.now, dueSQL.soon)
	applyBunAssignmentListFilters(query, opts, dueSQL)
	if err := query.Scan(ctx, &rows); err != nil {
		return nil, err
	}
	out := map[string]int{
		translationQueueDueStateOverdue: 0,
		translationQueueDueStateSoon:    0,
		translationQueueDueStateOnTrack: 0,
		translationQueueDueStateNone:    0,
	}
	for _, row := range rows {
		out[normalizeTranslationQueueDueState(row.Key)] = row.Count
	}
	return out, nil
}

func cloneAssignmentFilterMap(in map[string]any) map[string]any {
	if len(in) == 0 {
		return nil
	}
	out := make(map[string]any, len(in))
	maps.Copy(out, in)
	return out
}

func (r *BunTranslationAssignmentRepository) Get(ctx context.Context, id string) (TranslationAssignment, error) {
	if r == nil || r.db == nil {
		return TranslationAssignment{}, serviceNotConfiguredDomainError("translation assignment repository", nil)
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return TranslationAssignment{}, requiredFieldDomainError("id", nil)
	}
	record := bunTranslationAssignmentRecord{}
	err := r.db.NewSelect().
		Model(&record).
		Where("assignment_id = ?", id).
		Scan(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		return TranslationAssignment{}, ErrNotFound
	}
	if err != nil {
		return TranslationAssignment{}, err
	}
	return translationAssignmentFromBunRecord(record), nil
}

func (r *BunTranslationAssignmentRepository) Create(ctx context.Context, assignment TranslationAssignment) (TranslationAssignment, error) {
	created, _, err := r.create(ctx, assignment, false)
	return created, err
}

func (r *BunTranslationAssignmentRepository) CreateOrReuseActive(ctx context.Context, assignment TranslationAssignment) (TranslationAssignment, bool, error) {
	return r.create(ctx, assignment, true)
}

func (r *BunTranslationAssignmentRepository) Update(ctx context.Context, assignment TranslationAssignment, expectedVersion int64) (TranslationAssignment, error) {
	if r == nil || r.db == nil {
		return TranslationAssignment{}, serviceNotConfiguredDomainError("translation assignment repository", nil)
	}
	if expectedVersion < 0 {
		return TranslationAssignment{}, validationDomainError("expected_version must be >= 0", map[string]any{"field": "expected_version"})
	}
	assignment.ID = strings.TrimSpace(assignment.ID)
	if assignment.ID == "" {
		return TranslationAssignment{}, requiredFieldDomainError("id", nil)
	}
	var updated TranslationAssignment
	err := r.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		current, err := r.getTx(ctx, tx, assignment.ID)
		if err != nil {
			return err
		}
		if current.Version != expectedVersion {
			return TranslationAssignmentVersionConflictError{
				AssignmentID:    current.ID,
				ExpectedVersion: expectedVersion,
				ActualVersion:   current.Version,
			}
		}
		next := normalizeAssignmentForCreate(assignment)
		if next.CreatedAt.IsZero() {
			next.CreatedAt = current.CreatedAt
		}
		next.Version = current.Version + 1
		next.UpdatedAt = time.Now().UTC()
		if validateErr := next.Validate(); validateErr != nil {
			return validateErr
		}
		resolvedVariantID, resolveErr := r.resolveAssignmentVariantIDTx(ctx, tx, next)
		if resolveErr != nil {
			return resolveErr
		}
		next.VariantID = resolvedVariantID
		record := bunTranslationAssignmentRecordFromAssignment(next)
		result, err := tx.NewUpdate().
			Model(&record).
			Where("assignment_id = ?", record.AssignmentID).
			Where("row_version = ?", expectedVersion).
			Exec(ctx)
		if err != nil {
			return err
		}
		affected, err := result.RowsAffected()
		if err != nil {
			return err
		}
		if affected == 0 {
			return TranslationAssignmentVersionConflictError{
				AssignmentID:    current.ID,
				ExpectedVersion: expectedVersion,
				ActualVersion:   current.Version,
			}
		}
		updated = next
		return nil
	})
	if err != nil {
		return TranslationAssignment{}, err
	}
	return cloneTranslationAssignment(updated), nil
}

func (r *BunTranslationAssignmentRepository) create(ctx context.Context, assignment TranslationAssignment, allowReuse bool) (TranslationAssignment, bool, error) {
	if r == nil || r.db == nil {
		return TranslationAssignment{}, false, serviceNotConfiguredDomainError("translation assignment repository", nil)
	}
	normalized := normalizeAssignmentForCreate(assignment)
	if err := normalized.Validate(); err != nil {
		return TranslationAssignment{}, false, err
	}
	if normalized.ID == "" {
		normalized.ID = newTranslationAssignmentID()
	}
	now := time.Now().UTC()
	if normalized.CreatedAt.IsZero() {
		normalized.CreatedAt = now
	}
	normalized.UpdatedAt = now
	if normalized.Version == 0 {
		normalized.Version = 1
	}

	var created TranslationAssignment
	var inserted bool
	err := r.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		resolvedVariantID, resolveErr := r.resolveAssignmentVariantIDTx(ctx, tx, normalized)
		if resolveErr != nil {
			return resolveErr
		}
		normalized.VariantID = resolvedVariantID
		if !normalized.Status.IsActive() {
			return insertAssignmentTx(ctx, tx, normalized, &created, &inserted)
		}
		existing, found, err := r.findActiveByKeyTx(ctx, tx, normalized)
		if err != nil {
			return err
		}
		if found {
			if !allowReuse {
				return newTranslationAssignmentConflict(normalized, existing.ID)
			}
			refreshed := refreshExistingAssignment(existing, normalized, now)
			resolvedVariantID, resolveErr := r.resolveAssignmentVariantIDTx(ctx, tx, refreshed)
			if resolveErr != nil {
				return resolveErr
			}
			refreshed.VariantID = resolvedVariantID
			record := bunTranslationAssignmentRecordFromAssignment(refreshed)
			if _, err := tx.NewUpdate().
				Model(&record).
				Where("assignment_id = ?", record.AssignmentID).
				Exec(ctx); err != nil {
				return err
			}
			created = refreshed
			inserted = false
			return nil
		}
		return insertAssignmentTx(ctx, tx, normalized, &created, &inserted)
	})
	if err != nil {
		return TranslationAssignment{}, false, err
	}
	return cloneTranslationAssignment(created), inserted, nil
}

func insertAssignmentTx(ctx context.Context, tx bun.Tx, assignment TranslationAssignment, created *TranslationAssignment, inserted *bool) error {
	record := bunTranslationAssignmentRecordFromAssignment(assignment)
	if _, err := tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return err
	}
	*created = assignment
	*inserted = true
	return nil
}

func (r *BunTranslationAssignmentRepository) resolveAssignmentVariantIDTx(ctx context.Context, db bun.IDB, assignment TranslationAssignment) (string, error) {
	fallback := strings.TrimSpace(firstNonEmpty(assignment.VariantID, assignment.TargetRecordID))
	familyID := strings.TrimSpace(assignment.FamilyID)
	targetLocale := strings.TrimSpace(strings.ToLower(assignment.TargetLocale))
	if familyID == "" || targetLocale == "" {
		return fallback, nil
	}
	record := bunTranslationLocaleVariantRecord{}
	err := db.NewSelect().
		Model(&record).
		Column("variant_id").
		Where("family_id = ?", familyID).
		Where("locale = ?", targetLocale).
		Limit(1).
		Scan(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		return "", nil
	}
	if err != nil {
		if isMissingLocaleVariantsTableError(err) {
			return legacyAssignmentStorageVariantID(assignment), nil
		}
		return "", err
	}
	if variantID := strings.TrimSpace(record.VariantID); variantID != "" {
		return variantID, nil
	}
	return fallback, nil
}

func isMissingLocaleVariantsTableError(err error) bool {
	if err == nil {
		return false
	}
	message := strings.ToLower(err.Error())
	return strings.Contains(message, "no such table: locale_variants") ||
		strings.Contains(message, `relation "locale_variants" does not exist`) ||
		strings.Contains(message, "table locale_variants does not exist")
}

func (r *BunTranslationAssignmentRepository) getTx(ctx context.Context, db bun.IDB, id string) (TranslationAssignment, error) {
	record := bunTranslationAssignmentRecord{}
	err := db.NewSelect().Model(&record).Where("assignment_id = ?", strings.TrimSpace(id)).Scan(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		return TranslationAssignment{}, ErrNotFound
	}
	if err != nil {
		return TranslationAssignment{}, err
	}
	return translationAssignmentFromBunRecord(record), nil
}

func (r *BunTranslationAssignmentRepository) findActiveByKeyTx(ctx context.Context, db bun.IDB, assignment TranslationAssignment) (TranslationAssignment, bool, error) {
	record := bunTranslationAssignmentRecord{}
	err := db.NewSelect().
		Model(&record).
		Where("COALESCE(tenant_id, '__global__') = COALESCE(?, '__global__')", strings.TrimSpace(assignment.TenantID)).
		Where("COALESCE(org_id, '__global__') = COALESCE(?, '__global__')", strings.TrimSpace(assignment.OrgID)).
		Where("family_id = ?", strings.TrimSpace(assignment.FamilyID)).
		Where("target_locale = ?", strings.TrimSpace(strings.ToLower(assignment.TargetLocale))).
		Where("work_scope = ?", normalizeTranslationAssignmentWorkScope(assignment.WorkScope)).
		Where("status IN (?)", bun.List([]string{
			string(AssignmentStatusOpen),
			string(AssignmentStatusAssigned),
			string(AssignmentStatusInProgress),
			string(AssignmentStatusInReview),
			string(AssignmentStatusChangesRequested),
		})).
		Limit(1).
		Scan(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		return TranslationAssignment{}, false, nil
	}
	if err != nil {
		return TranslationAssignment{}, false, err
	}
	return translationAssignmentFromBunRecord(record), true, nil
}

func bunTranslationAssignmentRecordFromAssignment(assignment TranslationAssignment) bunTranslationAssignmentRecord {
	assignment = normalizeAssignmentForCreate(assignment)
	return bunTranslationAssignmentRecord{
		AssignmentID:        strings.TrimSpace(assignment.ID),
		TenantID:            strings.TrimSpace(assignment.TenantID),
		OrgID:               strings.TrimSpace(assignment.OrgID),
		FamilyID:            strings.TrimSpace(assignment.FamilyID),
		VariantID:           nullString(assignmentStorageVariantID(assignment)),
		EntityType:          strings.TrimSpace(strings.ToLower(assignment.EntityType)),
		SourceRecordID:      strings.TrimSpace(assignment.SourceRecordID),
		SourceLocale:        strings.TrimSpace(strings.ToLower(assignment.SourceLocale)),
		TargetLocale:        strings.TrimSpace(strings.ToLower(assignment.TargetLocale)),
		TargetRecordID:      strings.TrimSpace(assignment.TargetRecordID),
		SourceTitle:         strings.TrimSpace(assignment.SourceTitle),
		SourcePath:          strings.TrimSpace(assignment.SourcePath),
		WorkScope:           normalizeTranslationAssignmentWorkScope(assignment.WorkScope),
		AssignmentType:      translationAssignmentTypeToStorage(assignment.AssignmentType),
		Status:              string(normalizeTranslationAssignmentStatus(assignment.Status)),
		AssigneeID:          strings.TrimSpace(assignment.AssigneeID),
		ReviewerID:          strings.TrimSpace(assignment.ReviewerID),
		AssignerID:          strings.TrimSpace(assignment.AssignerID),
		LastReviewerID:      strings.TrimSpace(assignment.LastReviewerID),
		LastRejectionReason: strings.TrimSpace(assignment.LastRejectionReason),
		Priority:            strings.TrimSpace(strings.ToLower(string(assignment.Priority))),
		DueDate:             cloneTimePtr(assignment.DueDate),
		RowVersion:          assignment.Version,
		ClaimedAt:           cloneTimePtr(assignment.ClaimedAt),
		SubmittedAt:         cloneTimePtr(assignment.SubmittedAt),
		ApprovedAt:          cloneTimePtr(assignment.ApprovedAt),
		PublishedAt:         cloneTimePtr(assignment.PublishedAt),
		ArchivedAt:          cloneTimePtr(assignment.ArchivedAt),
		CreatedAt:           assignment.CreatedAt,
		UpdatedAt:           assignment.UpdatedAt,
	}
}

func translationAssignmentFromBunRecord(record bunTranslationAssignmentRecord) TranslationAssignment {
	return cloneTranslationAssignment(TranslationAssignment{
		ID:                  strings.TrimSpace(record.AssignmentID),
		FamilyID:            strings.TrimSpace(record.FamilyID),
		VariantID:           nullStringValue(record.VariantID),
		EntityType:          strings.TrimSpace(strings.ToLower(record.EntityType)),
		TenantID:            strings.TrimSpace(record.TenantID),
		OrgID:               strings.TrimSpace(record.OrgID),
		SourceRecordID:      strings.TrimSpace(record.SourceRecordID),
		SourceLocale:        strings.TrimSpace(strings.ToLower(record.SourceLocale)),
		TargetLocale:        strings.TrimSpace(strings.ToLower(record.TargetLocale)),
		TargetRecordID:      strings.TrimSpace(record.TargetRecordID),
		SourceTitle:         strings.TrimSpace(record.SourceTitle),
		SourcePath:          strings.TrimSpace(record.SourcePath),
		WorkScope:           normalizeTranslationAssignmentWorkScope(record.WorkScope),
		AssignmentType:      translationAssignmentTypeFromStorage(record.AssignmentType),
		Status:              normalizeTranslationAssignmentStatus(AssignmentStatus(record.Status)),
		Priority:            Priority(strings.TrimSpace(strings.ToLower(record.Priority))),
		DueDate:             cloneTimePtr(record.DueDate),
		AssigneeID:          strings.TrimSpace(record.AssigneeID),
		ReviewerID:          strings.TrimSpace(record.ReviewerID),
		AssignerID:          strings.TrimSpace(record.AssignerID),
		LastReviewerID:      strings.TrimSpace(record.LastReviewerID),
		LastRejectionReason: strings.TrimSpace(record.LastRejectionReason),
		Version:             record.RowVersion,
		CreatedAt:           record.CreatedAt,
		UpdatedAt:           record.UpdatedAt,
		ClaimedAt:           cloneTimePtr(record.ClaimedAt),
		SubmittedAt:         cloneTimePtr(record.SubmittedAt),
		ApprovedAt:          cloneTimePtr(record.ApprovedAt),
		PublishedAt:         cloneTimePtr(record.PublishedAt),
		ArchivedAt:          cloneTimePtr(record.ArchivedAt),
	})
}

func assignmentStorageVariantID(assignment TranslationAssignment) string {
	return strings.TrimSpace(firstNonEmpty(assignment.VariantID, assignment.TargetRecordID))
}

func legacyAssignmentStorageVariantID(assignment TranslationAssignment) string {
	return strings.TrimSpace(firstNonEmpty(assignment.VariantID, assignment.TargetRecordID, assignment.SourceRecordID))
}

func translationAssignmentTypeToStorage(value AssignmentType) string {
	switch strings.TrimSpace(strings.ToLower(string(value))) {
	case "direct", "assigned":
		return "direct"
	default:
		return string(AssignmentTypeOpenPool)
	}
}

func translationAssignmentTypeFromStorage(value string) AssignmentType {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case "direct", "assigned":
		return AssignmentTypeDirect
	default:
		return AssignmentTypeOpenPool
	}
}

func sortTranslationAssignments(items []TranslationAssignment, opts ListOptions) {
	sort.SliceStable(items, func(i, j int) bool {
		left := items[i]
		right := items[j]
		field := strings.TrimSpace(strings.ToLower(opts.SortBy))
		desc := opts.SortDesc
		if field == "" {
			field = "created_at"
			desc = true
		}
		switch field {
		case "status":
			if desc {
				return left.Status > right.Status
			}
			return left.Status < right.Status
		case "target_locale":
			if desc {
				return left.TargetLocale > right.TargetLocale
			}
			return left.TargetLocale < right.TargetLocale
		case "assignee_id":
			if desc {
				return left.AssigneeID > right.AssigneeID
			}
			return left.AssigneeID < right.AssigneeID
		case "priority":
			if desc {
				return left.Priority > right.Priority
			}
			return left.Priority < right.Priority
		case "updated_at":
			if desc {
				return left.UpdatedAt.After(right.UpdatedAt)
			}
			return left.UpdatedAt.Before(right.UpdatedAt)
		default:
			if desc {
				return left.CreatedAt.After(right.CreatedAt)
			}
			return left.CreatedAt.Before(right.CreatedAt)
		}
	})
}

func newTranslationAssignmentID() string {
	return "tqa_" + uuid.NewString()
}

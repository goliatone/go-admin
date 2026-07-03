package admin

import (
	"context"
	"errors"
	"slices"
	"strconv"
	"strings"
	"sync"
	"time"
)

// TranslationAssignmentRepository stores translation queue assignments.
type TranslationAssignmentRepository interface {
	List(ctx context.Context, opts ListOptions) ([]TranslationAssignment, int, error)
	Create(ctx context.Context, assignment TranslationAssignment) (TranslationAssignment, error)
	CreateOrReuseActive(ctx context.Context, assignment TranslationAssignment) (TranslationAssignment, bool, error)
	Get(ctx context.Context, id string) (TranslationAssignment, error)
	Update(ctx context.Context, assignment TranslationAssignment, expectedVersion int64) (TranslationAssignment, error)
}

var ErrTranslationAssignmentQueryUnsupported = errors.New("translation assignment query unsupported")
var ErrTranslationAssignmentFamilyBlockersUnavailable = errors.New("translation assignment family blocker aggregates unavailable")

type TranslationAssignmentPageQueryStore interface {
	ListAssignmentPage(ctx context.Context, input TranslationAssignmentPageQueryInput) (TranslationAssignmentPageQueryResult, error)
}

type TranslationAssignmentSnapshotQueryStore interface {
	ListAssignmentSnapshot(ctx context.Context, input TranslationAssignmentSnapshotQueryInput) (TranslationAssignmentSnapshotQueryResult, error)
}

type TranslationAssignmentSummaryStore interface {
	AssignmentQueueSummary(ctx context.Context, input TranslationAssignmentQueueSummaryInput) (TranslationAssignmentQueueSummary, error)
	AssignmentMyWorkSummary(ctx context.Context, input TranslationAssignmentMyWorkSummaryInput) (map[string]int, error)
	AssignmentDashboardSummary(ctx context.Context, input TranslationAssignmentDashboardSummaryInput) (TranslationAssignmentDashboardSummary, error)
}

type TranslationAssignmentOptionStore interface {
	DistinctAssignmentEntityTypes(ctx context.Context) ([]string, error)
	DistinctAssignmentLocales(ctx context.Context, filters map[string]any) ([]string, error)
	DistinctAssignmentTranslationGroups(ctx context.Context, filters map[string]any) ([]TranslationAssignmentGroupOption, error)
}

type TranslationAssignmentGroupOption struct {
	FamilyID    string
	SourceTitle string
	SourcePath  string
	EntityType  string
}

type TranslationAssignmentReviewerSummaryStore interface {
	AssignmentReviewerAggregateCounts(ctx context.Context, input TranslationAssignmentReviewerAggregateInput) (map[string]int, error)
}

type TranslationAssignmentReviewerAggregateStore interface {
	AssignmentReviewerAggregateSummary(ctx context.Context, input TranslationAssignmentReviewerAggregateInput) (TranslationAssignmentReviewerAggregateSummary, error)
}

type TranslationAssignmentReviewerAggregateSummary struct {
	Counts      map[string]int
	Unavailable []string
	Degraded    []string
}

type TranslationAssignmentFamilyGroupingStore interface {
	ListAssignmentFamilyGroups(ctx context.Context, input TranslationAssignmentFamilyGroupQueryInput) (TranslationAssignmentFamilyGroupQueryResult, error)
	ListFamilyAssignments(ctx context.Context, input TranslationAssignmentFamilyAssignmentsQueryInput) (TranslationAssignmentFamilyAssignmentsQueryResult, error)
}

type TranslationAssignmentPageQueryInput struct {
	Filter      translationAssignmentListFilter
	Page        int
	PerPage     int
	Environment string
	Now         time.Time
}

type TranslationAssignmentPageQueryResult struct {
	Items []TranslationAssignment
	Total int
}

type TranslationAssignmentSnapshotQueryInput struct {
	Filter      translationAssignmentListFilter
	Environment string
	Now         time.Time
	Limit       int
}

type TranslationAssignmentSnapshotSelection struct {
	AssignmentID     string
	ExpectedVersion  int64
	OriginalPosition int
}

type TranslationAssignmentSnapshotQueryResult struct {
	Selections []TranslationAssignmentSnapshotSelection
	Total      int
}

type TranslationAssignmentQueueSummaryInput struct {
	Filters map[string]any
	Now     time.Time
}

type TranslationAssignmentQueueSummary struct {
	Total        int
	ByQueueState map[string]int
	ByDueState   map[string]int
}

type TranslationAssignmentMyWorkSummaryInput struct {
	Filters map[string]any
	Now     time.Time
}

type TranslationAssignmentDashboardSummaryInput struct {
	TenantID     string
	OrgID        string
	ActorID      string
	Now          time.Time
	OverdueLimit int
}

type TranslationAssignmentReviewerAggregateInput struct {
	TenantID string
	OrgID    string
	ActorID  string
	Now      time.Time
}

type TranslationAssignmentFamilyGroupQueryInput struct {
	Filter      translationAssignmentListFilter
	Page        int
	PerPage     int
	Environment string
	Now         time.Time
}

type TranslationAssignmentFamilyAssignmentsQueryInput struct {
	FamilyID    string
	Filter      translationAssignmentListFilter
	Page        int
	PerPage     int
	Environment string
	Now         time.Time
}

type TranslationAssignmentFamilyGroupQueryResult struct {
	Families        []TranslationAssignmentFamilyGroup
	FamilyTotal     int
	AssignmentTotal int
}

type TranslationAssignmentFamilyAssignmentsQueryResult struct {
	Items   []TranslationAssignment
	Total   int
	HasNext bool
}

type TranslationAssignmentFamilyGroup struct {
	FamilyID                    string
	FamilyLabel                 string
	EntityType                  string
	SourceRecordID              string
	SourceLocale                string
	SourceTitle                 string
	SourcePath                  string
	AssignmentCount             int
	LocaleCount                 int
	TargetLocales               []string
	StatusCounts                map[string]int
	DueStateCounts              map[string]int
	PriorityCounts              map[string]int
	FamilyBlockerCount          *int
	FamilyBlockerCountAvailable bool
	FamilyBlockerCountReason    string
	ActionHints                 map[string]int
	CreatedAt                   time.Time
	UpdatedAt                   time.Time
	DueDate                     *time.Time
	DueState                    string
	Priority                    Priority
}

type TranslationAssignmentDashboardSummary struct {
	MyTasks             int
	MyInProgress        int
	MyDueSoon           int
	MyOverdue           int
	NeedsReview         int
	NeedsReviewOverdue  int
	OverdueTasks        int
	HighPriorityOverdue int
	TopOverdue          []TranslationAssignment
}

// InMemoryTranslationAssignmentRepository provides active-key uniqueness and optimistic locking constraints.
type InMemoryTranslationAssignmentRepository struct {
	mu          sync.Mutex
	nextID      int64
	byID        map[string]TranslationAssignment
	activeByKey map[string]string
}

// NewInMemoryTranslationAssignmentRepository builds an empty in-memory queue store.
func NewInMemoryTranslationAssignmentRepository() *InMemoryTranslationAssignmentRepository {
	return &InMemoryTranslationAssignmentRepository{
		nextID:      1,
		byID:        map[string]TranslationAssignment{},
		activeByKey: map[string]string{},
	}
}

// Create inserts a new assignment and enforces one active assignment per canonical key.
func (r *InMemoryTranslationAssignmentRepository) Create(_ context.Context, assignment TranslationAssignment) (TranslationAssignment, error) {
	if r == nil {
		return TranslationAssignment{}, serviceNotConfiguredDomainError("translation assignment repository", nil)
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	created, _, err := r.createLocked(assignment, false)
	return created, err
}

// CreateOrReuseActive inserts a new assignment or reuses/refreshed an existing active one.
func (r *InMemoryTranslationAssignmentRepository) CreateOrReuseActive(_ context.Context, assignment TranslationAssignment) (TranslationAssignment, bool, error) {
	if r == nil {
		return TranslationAssignment{}, false, serviceNotConfiguredDomainError("translation assignment repository", nil)
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.createLocked(assignment, true)
}

// List returns queue assignments filtered by list options.
func (r *InMemoryTranslationAssignmentRepository) List(_ context.Context, opts ListOptions) ([]TranslationAssignment, int, error) {
	if r == nil {
		return nil, 0, serviceNotConfiguredDomainError("translation assignment repository", nil)
	}
	r.mu.Lock()
	defer r.mu.Unlock()

	search := inMemoryListSearchTerm(opts)
	items := make([]TranslationAssignment, 0, len(r.byID))
	for _, assignment := range r.byID {
		if !translationAssignmentMatchesFilters(assignment, opts.Filters) {
			continue
		}
		if search != "" && !translationAssignmentMatchesSearch(assignment, search) {
			continue
		}
		items = append(items, cloneTranslationAssignment(assignment))
	}

	sortTranslationAssignments(items, opts)

	paginated, total := paginateInMemory(items, opts, 20)
	return paginated, total, nil
}

func normalizeTranslationAssignmentPagination(page, perPage, total, defaultPerPage int) (int, int) {
	if page <= 0 {
		page = 1
	}
	if perPage <= 0 {
		perPage = defaultPerPage
	}
	if perPage <= 0 {
		perPage = 10
	}
	pageCount := 1
	if total > 0 {
		pageCount = (total + perPage - 1) / perPage
	}
	page = clampInt(page, 1, pageCount)
	return page, perPage
}

func (r *InMemoryTranslationAssignmentRepository) DistinctAssignmentEntityTypes(_ context.Context) ([]string, error) {
	if r == nil {
		return nil, serviceNotConfiguredDomainError("translation assignment repository", nil)
	}
	r.mu.Lock()
	defer r.mu.Unlock()

	seen := map[string]struct{}{}
	for _, assignment := range r.byID {
		entityType := strings.TrimSpace(strings.ToLower(assignment.EntityType))
		if entityType == "" {
			continue
		}
		seen[entityType] = struct{}{}
	}
	return sortedStringSet(seen), nil
}

func (r *InMemoryTranslationAssignmentRepository) DistinctAssignmentLocales(_ context.Context, filters map[string]any) ([]string, error) {
	if r == nil {
		return nil, serviceNotConfiguredDomainError("translation assignment repository", nil)
	}
	r.mu.Lock()
	defer r.mu.Unlock()

	seen := map[string]struct{}{}
	for _, assignment := range r.byID {
		if !translationAssignmentMatchesFilters(assignment, filters) {
			continue
		}
		if locale := strings.TrimSpace(strings.ToLower(assignment.SourceLocale)); locale != "" {
			seen[locale] = struct{}{}
		}
		if locale := strings.TrimSpace(strings.ToLower(assignment.TargetLocale)); locale != "" {
			seen[locale] = struct{}{}
		}
	}
	return sortedStringSet(seen), nil
}

func (r *InMemoryTranslationAssignmentRepository) DistinctAssignmentTranslationGroups(_ context.Context, filters map[string]any) ([]TranslationAssignmentGroupOption, error) {
	if r == nil {
		return nil, serviceNotConfiguredDomainError("translation assignment repository", nil)
	}
	r.mu.Lock()
	defer r.mu.Unlock()

	seen := map[string]TranslationAssignmentGroupOption{}
	for _, assignment := range r.byID {
		if !translationAssignmentMatchesFilters(assignment, filters) {
			continue
		}
		familyID := strings.TrimSpace(assignment.FamilyID)
		if familyID == "" {
			continue
		}
		current := seen[familyID]
		current.FamilyID = familyID
		if strings.TrimSpace(current.SourceTitle) == "" {
			current.SourceTitle = strings.TrimSpace(assignment.SourceTitle)
		}
		if strings.TrimSpace(current.SourcePath) == "" {
			current.SourcePath = strings.TrimSpace(assignment.SourcePath)
		}
		if strings.TrimSpace(current.EntityType) == "" {
			current.EntityType = strings.TrimSpace(assignment.EntityType)
		}
		seen[familyID] = current
	}
	options := make([]TranslationAssignmentGroupOption, 0, len(seen))
	for _, option := range seen {
		options = append(options, option)
	}
	slices.SortFunc(options, func(a, b TranslationAssignmentGroupOption) int {
		return strings.Compare(strings.ToLower(a.FamilyID), strings.ToLower(b.FamilyID))
	})
	return options, nil
}

func (r *InMemoryTranslationAssignmentRepository) ListAssignmentSnapshot(ctx context.Context, input TranslationAssignmentSnapshotQueryInput) (TranslationAssignmentSnapshotQueryResult, error) {
	if r == nil {
		return TranslationAssignmentSnapshotQueryResult{}, serviceNotConfiguredDomainError("translation assignment repository", nil)
	}
	if normalizeTranslationQueueReviewState(input.Filter.ReviewState) != "" {
		return TranslationAssignmentSnapshotQueryResult{}, ErrTranslationAssignmentQueryUnsupported
	}
	pageSize := input.Limit
	if pageSize <= 0 {
		pageSize = 1_000
	}
	opts, _ := listOptionsFromAssignmentPageQuery(TranslationAssignmentPageQueryInput{
		Filter:  input.Filter,
		Page:    1,
		PerPage: pageSize,
		Now:     input.Now,
	})
	items, total, err := r.List(ctx, ListOptions{
		Page:     opts.Page,
		PerPage:  opts.PerPage,
		SortBy:   opts.SortBy,
		SortDesc: opts.SortDesc,
		Filters:  opts.Filters,
	})
	if err != nil {
		return TranslationAssignmentSnapshotQueryResult{}, err
	}
	if total > pageSize {
		items = items[:min(len(items), pageSize)]
	}
	selections := make([]TranslationAssignmentSnapshotSelection, 0, len(items))
	for idx, assignment := range items {
		selections = append(selections, TranslationAssignmentSnapshotSelection{
			AssignmentID:     strings.TrimSpace(assignment.ID),
			ExpectedVersion:  assignment.Version,
			OriginalPosition: idx,
		})
	}
	return TranslationAssignmentSnapshotQueryResult{Selections: selections, Total: total}, nil
}

func (r *InMemoryTranslationAssignmentRepository) ListAssignmentFamilyGroups(ctx context.Context, input TranslationAssignmentFamilyGroupQueryInput) (TranslationAssignmentFamilyGroupQueryResult, error) {
	if r == nil {
		return TranslationAssignmentFamilyGroupQueryResult{}, serviceNotConfiguredDomainError("translation assignment repository", nil)
	}
	if normalizeTranslationQueueReviewState(input.Filter.ReviewState) == translationQueueReviewStateQABlocked {
		return TranslationAssignmentFamilyGroupQueryResult{}, ErrTranslationAssignmentFamilyBlockersUnavailable
	}
	page := input.Page
	if page <= 0 {
		page = 1
	}
	perPage := input.PerPage
	if perPage <= 0 {
		perPage = 25
	}
	r.mu.Lock()
	assignments := make([]TranslationAssignment, 0, len(r.byID))
	for _, assignment := range r.byID {
		assignments = append(assignments, cloneTranslationAssignment(assignment))
	}
	r.mu.Unlock()
	matched := make([]TranslationAssignment, 0, len(assignments))
	for _, assignment := range assignments {
		if matchesAssignmentListFilter(assignment, input.Filter, input.Now) {
			matched = append(matched, assignment)
		}
	}
	groups := translationAssignmentFamilyGroupsFromAssignments(matched, input.Now)
	sortTranslationAssignmentFamilyGroups(groups, input.Filter.SortBy, input.Filter.SortDesc)
	totalFamilies := len(groups)
	page, perPage = normalizeTranslationAssignmentPagination(page, perPage, totalFamilies, 25)
	start := (page - 1) * perPage
	if start >= totalFamilies {
		return TranslationAssignmentFamilyGroupQueryResult{Families: []TranslationAssignmentFamilyGroup{}, FamilyTotal: totalFamilies, AssignmentTotal: len(matched)}, nil
	}
	end := min(start+perPage, totalFamilies)
	return TranslationAssignmentFamilyGroupQueryResult{
		Families:        groups[start:end],
		FamilyTotal:     totalFamilies,
		AssignmentTotal: len(matched),
	}, nil
}

func (r *InMemoryTranslationAssignmentRepository) ListFamilyAssignments(ctx context.Context, input TranslationAssignmentFamilyAssignmentsQueryInput) (TranslationAssignmentFamilyAssignmentsQueryResult, error) {
	if r == nil {
		return TranslationAssignmentFamilyAssignmentsQueryResult{}, serviceNotConfiguredDomainError("translation assignment repository", nil)
	}
	if strings.TrimSpace(input.FamilyID) == "" {
		return TranslationAssignmentFamilyAssignmentsQueryResult{}, requiredFieldDomainError("family_id", nil)
	}
	if normalizeTranslationQueueReviewState(input.Filter.ReviewState) == translationQueueReviewStateQABlocked {
		return TranslationAssignmentFamilyAssignmentsQueryResult{}, ErrTranslationAssignmentFamilyBlockersUnavailable
	}
	page := input.Page
	if page <= 0 {
		page = 1
	}
	perPage := input.PerPage
	if perPage <= 0 {
		perPage = 25
	}
	r.mu.Lock()
	assignments := make([]TranslationAssignment, 0, len(r.byID))
	for _, assignment := range r.byID {
		assignments = append(assignments, cloneTranslationAssignment(assignment))
	}
	r.mu.Unlock()
	filter := input.Filter
	filter.FamilyID = strings.TrimSpace(input.FamilyID)
	matched := make([]TranslationAssignment, 0, len(assignments))
	for _, assignment := range assignments {
		if matchesAssignmentListFilter(assignment, filter, input.Now) {
			matched = append(matched, assignment)
		}
	}
	sortAssignments(matched, filter.SortBy, filter.SortDesc, input.Now)
	total := len(matched)
	page, perPage = normalizeTranslationAssignmentPagination(page, perPage, total, 25)
	start := (page - 1) * perPage
	if start >= total {
		return TranslationAssignmentFamilyAssignmentsQueryResult{Items: []TranslationAssignment{}, Total: total}, nil
	}
	end := min(start+perPage, total)
	return TranslationAssignmentFamilyAssignmentsQueryResult{
		Items:   matched[start:end],
		Total:   total,
		HasNext: end < total,
	}, nil
}

// Get retrieves an assignment by id.
func (r *InMemoryTranslationAssignmentRepository) Get(_ context.Context, id string) (TranslationAssignment, error) {
	if r == nil {
		return TranslationAssignment{}, serviceNotConfiguredDomainError("translation assignment repository", nil)
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return TranslationAssignment{}, requiredFieldDomainError("id", nil)
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	found, ok := r.byID[id]
	if !ok {
		return TranslationAssignment{}, ErrNotFound
	}
	return cloneTranslationAssignment(found), nil
}

// Update updates an assignment when the expected version matches the current stored version.
func (r *InMemoryTranslationAssignmentRepository) Update(_ context.Context, assignment TranslationAssignment, expectedVersion int64) (TranslationAssignment, error) {
	if r == nil {
		return TranslationAssignment{}, serviceNotConfiguredDomainError("translation assignment repository", nil)
	}
	if expectedVersion < 0 {
		return TranslationAssignment{}, validationDomainError("expected_version must be >= 0", map[string]any{"field": "expected_version"})
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	assignment.ID = strings.TrimSpace(assignment.ID)
	if assignment.ID == "" {
		return TranslationAssignment{}, requiredFieldDomainError("id", nil)
	}

	current, ok := r.byID[assignment.ID]
	if !ok {
		return TranslationAssignment{}, ErrNotFound
	}
	if current.Version != expectedVersion {
		return TranslationAssignment{}, translationAssignmentVersionConflict(current, expectedVersion)
	}

	next := prepareUpdatedAssignment(assignment, current)

	if err := next.Validate(); err != nil {
		return TranslationAssignment{}, err
	}

	oldKey := ""
	if current.Status.IsActive() {
		oldKey = current.ActiveUniquenessKey()
	}
	newKey := ""
	if next.Status.IsActive() {
		newKey = next.ActiveUniquenessKey()
	}
	if newKey != "" {
		if existingID, ok := r.activeByKey[newKey]; ok && existingID != next.ID {
			return TranslationAssignment{}, newTranslationAssignmentConflict(next, existingID)
		}
	}
	if oldKey != "" && oldKey != newKey {
		delete(r.activeByKey, oldKey)
	}
	if newKey != "" {
		r.activeByKey[newKey] = next.ID
	}

	r.byID[next.ID] = cloneTranslationAssignment(next)
	return cloneTranslationAssignment(next), nil
}

func translationAssignmentVersionConflict(current TranslationAssignment, expectedVersion int64) error {
	return TranslationAssignmentVersionConflictError{
		AssignmentID:    current.ID,
		ExpectedVersion: expectedVersion,
		ActualVersion:   current.Version,
	}
}

func prepareUpdatedAssignment(assignment, current TranslationAssignment) TranslationAssignment {
	next := normalizeAssignmentForCreate(assignment)
	if next.CreatedAt.IsZero() {
		next.CreatedAt = current.CreatedAt
	}
	if next.AssignedAt == nil {
		next.AssignedAt = cloneTimePtr(current.AssignedAt)
	}
	if translationAssignmentNeedsAssignedAtRefresh(next, current) {
		now := time.Now().UTC()
		next.AssignedAt = &now
	}
	next.Version = current.Version + 1
	next.UpdatedAt = time.Now().UTC()
	return next
}

func (r *InMemoryTranslationAssignmentRepository) createLocked(assignment TranslationAssignment, allowReuse bool) (TranslationAssignment, bool, error) {
	normalized := normalizeAssignmentForCreate(assignment)
	if normalized.ID == "" {
		normalized.ID = r.nextAssignmentIDLocked()
	}

	if err := normalized.Validate(); err != nil {
		return TranslationAssignment{}, false, err
	}

	key := ""
	if normalized.Status.IsActive() {
		key = normalized.ActiveUniquenessKey()
	}

	now := time.Now().UTC()
	if normalized.CreatedAt.IsZero() {
		normalized.CreatedAt = now
	}
	if normalized.UpdatedAt.IsZero() {
		normalized.UpdatedAt = now
	}
	ensureTranslationAssignmentAssignedAt(&normalized, now)
	if normalized.Version == 0 {
		normalized.Version = 1
	}

	if key != "" {
		if existingID, exists := r.activeByKey[key]; exists {
			existing := r.byID[existingID]
			if allowReuse {
				refreshed := refreshExistingAssignment(existing, normalized, now)
				r.byID[existingID] = cloneTranslationAssignment(refreshed)
				return cloneTranslationAssignment(refreshed), false, nil
			}
			return TranslationAssignment{}, false, newTranslationAssignmentConflict(normalized, existingID)
		}
	}

	r.byID[normalized.ID] = cloneTranslationAssignment(normalized)
	if key != "" {
		r.activeByKey[key] = normalized.ID
	}
	return cloneTranslationAssignment(normalized), true, nil
}

func (r *InMemoryTranslationAssignmentRepository) nextAssignmentIDLocked() string {
	id := "tqa_" + strconv.FormatInt(r.nextID, 10)
	r.nextID++
	return id
}

func normalizeAssignmentForCreate(assignment TranslationAssignment) TranslationAssignment {
	assignment.ID = strings.TrimSpace(assignment.ID)
	assignment.FamilyID = strings.TrimSpace(assignment.FamilyID)
	assignment.VariantID = strings.TrimSpace(assignment.VariantID)
	assignment.EntityType = strings.TrimSpace(assignment.EntityType)
	assignment.TenantID = strings.TrimSpace(assignment.TenantID)
	assignment.OrgID = strings.TrimSpace(assignment.OrgID)
	assignment.SourceRecordID = strings.TrimSpace(assignment.SourceRecordID)
	assignment.SourceLocale = strings.TrimSpace(strings.ToLower(assignment.SourceLocale))
	assignment.TargetLocale = strings.TrimSpace(strings.ToLower(assignment.TargetLocale))
	assignment.TargetRecordID = strings.TrimSpace(assignment.TargetRecordID)
	assignment.SourceTitle = strings.TrimSpace(assignment.SourceTitle)
	assignment.SourcePath = strings.TrimSpace(assignment.SourcePath)
	assignment.WorkScope = normalizeTranslationAssignmentWorkScope(assignment.WorkScope)
	assignment.AssigneeID = strings.TrimSpace(assignment.AssigneeID)
	assignment.ReviewerID = strings.TrimSpace(assignment.ReviewerID)
	assignment.AssignerID = strings.TrimSpace(assignment.AssignerID)
	assignment.LastReviewerID = strings.TrimSpace(assignment.LastReviewerID)
	assignment.LastRejectionReason = strings.TrimSpace(assignment.LastRejectionReason)

	if assignment.AssignmentType == "" {
		assignment.AssignmentType = AssignmentTypeOpenPool
	}
	assignment.Status = normalizeTranslationAssignmentStatus(assignment.Status)
	if assignment.Status == "" {
		if assignment.AssignmentType == AssignmentTypeDirect {
			assignment.Status = AssignmentStatusAssigned
		} else {
			assignment.Status = AssignmentStatusOpen
		}
	}
	if assignment.Priority == "" {
		assignment.Priority = PriorityNormal
	}
	if assignment.Version < 0 {
		assignment.Version = 0
	}

	return assignment
}

func refreshExistingAssignment(existing TranslationAssignment, incoming TranslationAssignment, now time.Time) TranslationAssignment {
	updated := existing
	changed := refreshExistingDirectAssignment(&updated, incoming, now)
	if incoming.SourceTitle != "" && incoming.SourceTitle != existing.SourceTitle {
		updated.SourceTitle = incoming.SourceTitle
		changed = true
	}
	if incoming.SourcePath != "" && incoming.SourcePath != existing.SourcePath {
		updated.SourcePath = incoming.SourcePath
		changed = true
	}
	if incoming.WorkScope != "" && incoming.WorkScope != existing.WorkScope {
		updated.WorkScope = incoming.WorkScope
		changed = true
	}
	if incoming.DueDate != nil {
		updated.DueDate = cloneTimePtr(incoming.DueDate)
		changed = true
	}
	if incoming.Priority.IsValid() && incoming.Priority != existing.Priority {
		updated.Priority = incoming.Priority
		changed = true
	}
	if changed {
		updated.Version++
		updated.UpdatedAt = now
	}
	return updated
}

func refreshExistingDirectAssignment(updated *TranslationAssignment, incoming TranslationAssignment, now time.Time) bool {
	if updated == nil || incoming.AssignmentType != AssignmentTypeDirect || incoming.Status != AssignmentStatusAssigned {
		return false
	}
	changed := false
	if updated.AssignmentType != AssignmentTypeDirect {
		updated.AssignmentType = AssignmentTypeDirect
		changed = true
	}
	if updated.Status != AssignmentStatusAssigned {
		updated.Status = AssignmentStatusAssigned
		changed = true
	}
	if incoming.AssigneeID != "" && incoming.AssigneeID != updated.AssigneeID {
		updated.AssigneeID = incoming.AssigneeID
		changed = true
	}
	if incoming.AssignerID != "" && incoming.AssignerID != updated.AssignerID {
		updated.AssignerID = incoming.AssignerID
		changed = true
	}
	if changed || updated.AssignedAt == nil {
		updated.AssignedAt = cloneTimePtr(firstTimePtr(incoming.AssignedAt, &now))
		return true
	}
	return changed
}

func newTranslationAssignmentConflict(assignment TranslationAssignment, existingID string) error {
	return TranslationAssignmentConflictError{
		AssignmentID:         strings.TrimSpace(assignment.ID),
		ExistingAssignmentID: strings.TrimSpace(existingID),
		FamilyID:             strings.TrimSpace(assignment.FamilyID),
		EntityType:           strings.TrimSpace(assignment.EntityType),
		SourceLocale:         strings.TrimSpace(strings.ToLower(assignment.SourceLocale)),
		TargetLocale:         strings.TrimSpace(strings.ToLower(assignment.TargetLocale)),
		WorkScope:            normalizeTranslationAssignmentWorkScope(assignment.WorkScope),
	}
}

func cloneTranslationAssignment(assignment TranslationAssignment) TranslationAssignment {
	copy := assignment
	copy.WorkScope = normalizeTranslationAssignmentWorkScope(assignment.WorkScope)
	copy.DueDate = cloneTimePtr(assignment.DueDate)
	copy.AssignedAt = cloneTimePtr(assignment.AssignedAt)
	copy.ClaimedAt = cloneTimePtr(assignment.ClaimedAt)
	copy.SubmittedAt = cloneTimePtr(assignment.SubmittedAt)
	copy.ApprovedAt = cloneTimePtr(assignment.ApprovedAt)
	copy.PublishedAt = cloneTimePtr(assignment.PublishedAt)
	copy.ArchivedAt = cloneTimePtr(assignment.ArchivedAt)
	return copy
}

func ensureTranslationAssignmentAssignedAt(assignment *TranslationAssignment, now time.Time) {
	if assignment == nil || assignment.AssignedAt != nil {
		return
	}
	if assignment.AssignmentType == AssignmentTypeDirect && assignment.Status == AssignmentStatusAssigned {
		if now.IsZero() {
			now = time.Now().UTC()
		}
		now = now.UTC()
		assignment.AssignedAt = &now
	}
}

func translationAssignmentNeedsAssignedAtRefresh(next, current TranslationAssignment) bool {
	if next.AssignmentType != AssignmentTypeDirect || next.Status != AssignmentStatusAssigned {
		return false
	}
	if current.AssignmentType != AssignmentTypeDirect || current.Status != AssignmentStatusAssigned {
		return true
	}
	if strings.TrimSpace(next.AssigneeID) != strings.TrimSpace(current.AssigneeID) {
		return true
	}
	if strings.TrimSpace(next.AssignerID) != strings.TrimSpace(current.AssignerID) && strings.TrimSpace(next.AssignerID) != "" {
		return true
	}
	return next.AssignedAt == nil
}

func firstTimePtr(values ...*time.Time) *time.Time {
	for _, value := range values {
		if value != nil && !value.IsZero() {
			return value
		}
	}
	return nil
}

func cloneTimePtr(value *time.Time) *time.Time {
	if value == nil {
		return nil
	}
	copied := *value
	return &copied
}

func translationAssignmentMatchesFilters(assignment TranslationAssignment, filters map[string]any) bool {
	if len(filters) == 0 {
		return true
	}
	now := time.Now().UTC()
	for key, raw := range filters {
		normalizedKey := strings.TrimSpace(strings.ToLower(key))
		if normalizedKey == "" || normalizedKey == "_search" {
			continue
		}
		if !translationAssignmentMatchesFilter(assignment, normalizedKey, raw, now) {
			return false
		}
	}
	return true
}

func translationAssignmentMatchesFilter(assignment TranslationAssignment, key string, raw any, now time.Time) bool {
	if key == "overdue" {
		return !toBool(raw) || (assignment.DueDate != nil && !assignment.DueDate.After(now))
	}
	value := strings.TrimSpace(strings.ToLower(toString(raw)))
	if key == "due_state" {
		return value == "" || normalizeTranslationQueueDueState(value) == translationQueueDueState(assignment.DueDate, now)
	}
	expected, handled := translationAssignmentFilterStringValue(assignment, key)
	if !handled {
		return true
	}
	values := normalizedInMemoryAssignmentFilterValues(key, raw)
	if len(values) == 0 {
		return true
	}
	return slices.Contains(values, expected)
}

func normalizedInMemoryAssignmentFilterValues(key string, raw any) []string {
	values := []string{}
	if rawString, ok := raw.(string); ok {
		for part := range strings.SplitSeq(rawString, ",") {
			values = append(values, part)
		}
	} else {
		values = toStringSlice(raw)
	}
	out := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(strings.ToLower(value))
		if value == "" {
			continue
		}
		switch key {
		case "status":
			value = string(normalizeTranslationAssignmentStatus(AssignmentStatus(value)))
		case "target_locale", "locale", "source_locale":
			value = strings.TrimSpace(strings.ToLower(value))
		case "assignment_type", "work_scope", "entity_type":
			value = strings.ToLower(value)
		}
		if value != "" {
			out = append(out, value)
		}
	}
	return out
}

func translationAssignmentFilterStringValue(assignment TranslationAssignment, key string) (string, bool) {
	switch key {
	case "status":
		return strings.ToLower(string(assignment.Status)), true
	case "target_locale", "locale":
		return strings.ToLower(assignment.TargetLocale), true
	case "source_locale":
		return strings.ToLower(assignment.SourceLocale), true
	case "assignee_id":
		return strings.ToLower(assignment.AssigneeID), true
	case "reviewer_id":
		return strings.ToLower(strings.TrimSpace(firstNonEmpty(assignment.ReviewerID, assignment.LastReviewerID))), true
	case "assignment_type":
		return strings.ToLower(string(assignment.AssignmentType)), true
	case "work_scope":
		return strings.ToLower(normalizeTranslationAssignmentWorkScope(assignment.WorkScope)), true
	case "entity_type":
		return strings.ToLower(assignment.EntityType), true
	case "priority":
		return strings.ToLower(string(assignment.Priority)), true
	case "family_id":
		return strings.ToLower(assignment.FamilyID), true
	case ScopeTenantIDKey:
		return strings.ToLower(assignment.TenantID), true
	case ScopeOrgIDKey:
		return strings.ToLower(assignment.OrgID), true
	default:
		return "", false
	}
}

func translationAssignmentMatchesSearch(assignment TranslationAssignment, search string) bool {
	search = strings.TrimSpace(strings.ToLower(search))
	if search == "" {
		return true
	}
	parts := []string{
		strings.ToLower(strings.TrimSpace(assignment.ID)),
		strings.ToLower(strings.TrimSpace(assignment.SourceTitle)),
		strings.ToLower(strings.TrimSpace(assignment.SourcePath)),
		strings.ToLower(strings.TrimSpace(assignment.FamilyID)),
		strings.ToLower(strings.TrimSpace(assignment.EntityType)),
		strings.ToLower(strings.TrimSpace(assignment.SourceLocale)),
		strings.ToLower(strings.TrimSpace(assignment.TargetLocale)),
		strings.ToLower(strings.TrimSpace(assignment.AssigneeID)),
	}
	for _, part := range parts {
		if strings.Contains(part, search) {
			return true
		}
	}
	return false
}

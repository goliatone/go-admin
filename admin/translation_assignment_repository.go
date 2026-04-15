package admin

import (
	"context"
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
	normalized.UpdatedAt = now
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
	changed := false

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
	copy.ClaimedAt = cloneTimePtr(assignment.ClaimedAt)
	copy.SubmittedAt = cloneTimePtr(assignment.SubmittedAt)
	copy.ApprovedAt = cloneTimePtr(assignment.ApprovedAt)
	copy.PublishedAt = cloneTimePtr(assignment.PublishedAt)
	copy.ArchivedAt = cloneTimePtr(assignment.ArchivedAt)
	return copy
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
	value := strings.TrimSpace(strings.ToLower(toString(raw)))
	if key == "overdue" {
		return !toBool(raw) || (assignment.DueDate != nil && !assignment.DueDate.After(now))
	}
	if key == "due_state" {
		return value == "" || normalizeTranslationQueueDueState(value) == translationQueueDueState(assignment.DueDate, now)
	}
	expected, handled := translationAssignmentFilterStringValue(assignment, key)
	if !handled {
		return true
	}
	return value == "" || expected == value
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
	case "tenant_id":
		return strings.ToLower(assignment.TenantID), true
	case "org_id":
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

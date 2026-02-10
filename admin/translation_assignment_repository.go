package admin

import (
	"context"
	"sort"
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
		return TranslationAssignment{}, TranslationAssignmentVersionConflictError{
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

	if err := next.Validate(); err != nil {
		return TranslationAssignment{}, err
	}

	oldKey := current.ActiveUniquenessKey()
	if current.Status.IsTerminal() {
		oldKey = ""
	}
	newKey := next.ActiveUniquenessKey()
	if next.Status.IsTerminal() {
		newKey = ""
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

func (r *InMemoryTranslationAssignmentRepository) createLocked(assignment TranslationAssignment, allowReuse bool) (TranslationAssignment, bool, error) {
	normalized := normalizeAssignmentForCreate(assignment)
	if normalized.ID == "" {
		normalized.ID = r.nextAssignmentIDLocked()
	}

	if err := normalized.Validate(); err != nil {
		return TranslationAssignment{}, false, err
	}

	key := normalized.ActiveUniquenessKey()
	if normalized.Status.IsTerminal() {
		key = ""
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
	assignment.TranslationGroupID = strings.TrimSpace(assignment.TranslationGroupID)
	assignment.EntityType = strings.TrimSpace(assignment.EntityType)
	assignment.SourceRecordID = strings.TrimSpace(assignment.SourceRecordID)
	assignment.SourceLocale = strings.TrimSpace(strings.ToLower(assignment.SourceLocale))
	assignment.TargetLocale = strings.TrimSpace(strings.ToLower(assignment.TargetLocale))
	assignment.TargetRecordID = strings.TrimSpace(assignment.TargetRecordID)
	assignment.SourceTitle = strings.TrimSpace(assignment.SourceTitle)
	assignment.SourcePath = strings.TrimSpace(assignment.SourcePath)
	assignment.AssigneeID = strings.TrimSpace(assignment.AssigneeID)
	assignment.AssignerID = strings.TrimSpace(assignment.AssignerID)
	assignment.LastReviewerID = strings.TrimSpace(assignment.LastReviewerID)
	assignment.LastRejectionReason = strings.TrimSpace(assignment.LastRejectionReason)

	if assignment.AssignmentType == "" {
		assignment.AssignmentType = AssignmentTypeOpenPool
	}
	if assignment.Status == "" {
		if assignment.AssignmentType == AssignmentTypeDirect {
			assignment.Status = AssignmentStatusAssigned
		} else {
			assignment.Status = AssignmentStatusPending
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
		TranslationGroupID:   strings.TrimSpace(assignment.TranslationGroupID),
		EntityType:           strings.TrimSpace(assignment.EntityType),
		SourceLocale:         strings.TrimSpace(strings.ToLower(assignment.SourceLocale)),
		TargetLocale:         strings.TrimSpace(strings.ToLower(assignment.TargetLocale)),
	}
}

func cloneTranslationAssignment(assignment TranslationAssignment) TranslationAssignment {
	copy := assignment
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
	for key, raw := range filters {
		key = strings.TrimSpace(strings.ToLower(key))
		if key == "" || key == "_search" {
			continue
		}
		value := strings.TrimSpace(strings.ToLower(toString(raw)))
		switch key {
		case "status":
			if value != "" && strings.ToLower(string(assignment.Status)) != value {
				return false
			}
		case "target_locale":
			if value != "" && strings.ToLower(assignment.TargetLocale) != value {
				return false
			}
		case "source_locale":
			if value != "" && strings.ToLower(assignment.SourceLocale) != value {
				return false
			}
		case "assignee_id":
			if value != "" && strings.ToLower(assignment.AssigneeID) != value {
				return false
			}
		case "assignment_type":
			if value != "" && strings.ToLower(string(assignment.AssignmentType)) != value {
				return false
			}
		case "entity_type":
			if value != "" && strings.ToLower(assignment.EntityType) != value {
				return false
			}
		case "priority":
			if value != "" && strings.ToLower(string(assignment.Priority)) != value {
				return false
			}
		case "translation_group_id":
			if value != "" && strings.ToLower(assignment.TranslationGroupID) != value {
				return false
			}
		case "overdue":
			if !toBool(raw) {
				continue
			}
			if assignment.DueDate == nil || assignment.DueDate.After(time.Now().UTC()) {
				return false
			}
		}
	}
	return true
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
		strings.ToLower(strings.TrimSpace(assignment.TranslationGroupID)),
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

package admin

import (
	"context"
	"database/sql"
	"errors"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type bunTranslationAssignmentRecord struct {
	bun.BaseModel `bun:"table:translation_assignments,alias:ta"`

	AssignmentID        string     `bun:"assignment_id,pk" json:"assignment_id"`
	TenantID            string     `bun:"tenant_id" json:"tenant_id"`
	OrgID               string     `bun:"org_id" json:"org_id"`
	FamilyID            string     `bun:"family_id" json:"family_id"`
	VariantID           string     `bun:"variant_id" json:"variant_id"`
	EntityType          string     `bun:"entity_type" json:"entity_type"`
	SourceRecordID      string     `bun:"source_record_id" json:"source_record_id"`
	SourceLocale        string     `bun:"source_locale" json:"source_locale"`
	TargetLocale        string     `bun:"target_locale" json:"target_locale"`
	TargetRecordID      string     `bun:"target_record_id" json:"target_record_id"`
	SourceTitle         string     `bun:"source_title" json:"source_title"`
	SourcePath          string     `bun:"source_path" json:"source_path"`
	WorkScope           string     `bun:"work_scope" json:"work_scope"`
	AssignmentType      string     `bun:"assignment_type" json:"assignment_type"`
	Status              string     `bun:"status" json:"status"`
	AssigneeID          string     `bun:"assignee_id" json:"assignee_id"`
	ReviewerID          string     `bun:"reviewer_id" json:"reviewer_id"`
	AssignerID          string     `bun:"assigner_id" json:"assigner_id"`
	LastReviewerID      string     `bun:"last_reviewer_id" json:"last_reviewer_id"`
	LastRejectionReason string     `bun:"last_rejection_reason" json:"last_rejection_reason"`
	Priority            string     `bun:"priority" json:"priority"`
	DueDate             *time.Time `bun:"due_date,nullzero" json:"due_date"`
	RowVersion          int64      `bun:"row_version" json:"row_version"`
	ClaimedAt           *time.Time `bun:"claimed_at,nullzero" json:"claimed_at"`
	SubmittedAt         *time.Time `bun:"submitted_at,nullzero" json:"submitted_at"`
	ApprovedAt          *time.Time `bun:"approved_at,nullzero" json:"approved_at"`
	PublishedAt         *time.Time `bun:"published_at,nullzero" json:"published_at"`
	ArchivedAt          *time.Time `bun:"archived_at,nullzero" json:"archived_at"`
	CreatedAt           time.Time  `bun:"created_at" json:"created_at"`
	UpdatedAt           time.Time  `bun:"updated_at" json:"updated_at"`
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
	records := []bunTranslationAssignmentRecord{}
	if err := r.db.NewSelect().Model(&records).Scan(ctx); err != nil {
		return nil, 0, err
	}
	search := inMemoryListSearchTerm(opts)
	items := make([]TranslationAssignment, 0, len(records))
	for _, record := range records {
		assignment := translationAssignmentFromBunRecord(record)
		if !translationAssignmentMatchesFilters(assignment, opts.Filters) {
			continue
		}
		if search != "" && !translationAssignmentMatchesSearch(assignment, search) {
			continue
		}
		items = append(items, assignment)
	}
	sortTranslationAssignments(items, opts)
	paginated, total := paginateInMemory(items, opts, 20)
	return paginated, total, nil
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
		VariantID:           strings.TrimSpace(firstNonEmpty(assignment.TargetRecordID, assignment.SourceRecordID)),
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

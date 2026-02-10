package admin

import (
	"strings"
	"time"
)

// AssignmentType controls how an assignment is picked up.
type AssignmentType string

const (
	AssignmentTypeDirect   AssignmentType = "assigned"
	AssignmentTypeOpenPool AssignmentType = "open_pool"
)

// AssignmentStatus captures the translation queue lifecycle.
type AssignmentStatus string

const (
	AssignmentStatusPending    AssignmentStatus = "pending"
	AssignmentStatusAssigned   AssignmentStatus = "assigned"
	AssignmentStatusInProgress AssignmentStatus = "in_progress"
	AssignmentStatusReview     AssignmentStatus = "review"
	AssignmentStatusRejected   AssignmentStatus = "rejected"
	AssignmentStatusApproved   AssignmentStatus = "approved"
	AssignmentStatusPublished  AssignmentStatus = "published"
	AssignmentStatusArchived   AssignmentStatus = "archived"
)

// Priority controls assignment urgency.
type Priority string

const (
	PriorityLow    Priority = "low"
	PriorityNormal Priority = "normal"
	PriorityHigh   Priority = "high"
	PriorityUrgent Priority = "urgent"
)

// TranslationAssignment coordinates translation work for one target locale.
type TranslationAssignment struct {
	ID                 string `json:"id"`
	TranslationGroupID string `json:"translation_group_id"`
	EntityType         string `json:"entity_type"`

	SourceRecordID string `json:"source_record_id"`
	SourceLocale   string `json:"source_locale"`
	TargetLocale   string `json:"target_locale"`
	TargetRecordID string `json:"target_record_id,omitempty"`

	SourceTitle string `json:"source_title,omitempty"`
	SourcePath  string `json:"source_path,omitempty"`

	AssignmentType      AssignmentType   `json:"assignment_type"`
	Status              AssignmentStatus `json:"status"`
	Priority            Priority         `json:"priority"`
	DueDate             *time.Time       `json:"due_date,omitempty"`
	AssigneeID          string           `json:"assignee_id,omitempty"`
	AssignerID          string           `json:"assigner_id,omitempty"`
	LastReviewerID      string           `json:"last_reviewer_id,omitempty"`
	LastRejectionReason string           `json:"last_rejection_reason,omitempty"`

	Version int64 `json:"version"`

	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	ClaimedAt   *time.Time `json:"claimed_at,omitempty"`
	SubmittedAt *time.Time `json:"submitted_at,omitempty"`
	ApprovedAt  *time.Time `json:"approved_at,omitempty"`
	PublishedAt *time.Time `json:"published_at,omitempty"`
	ArchivedAt  *time.Time `json:"archived_at,omitempty"`
}

// ActiveUniquenessKey returns the canonical idempotency key for active assignments.
func (a TranslationAssignment) ActiveUniquenessKey() string {
	group := strings.TrimSpace(strings.ToLower(a.TranslationGroupID))
	entity := strings.TrimSpace(strings.ToLower(a.EntityType))
	source := strings.TrimSpace(strings.ToLower(a.SourceLocale))
	target := strings.TrimSpace(strings.ToLower(a.TargetLocale))
	return strings.Join([]string{group, entity, source, target}, ":")
}

func (t AssignmentType) IsValid() bool {
	switch t {
	case AssignmentTypeDirect, AssignmentTypeOpenPool:
		return true
	default:
		return false
	}
}

func (s AssignmentStatus) IsValid() bool {
	switch s {
	case AssignmentStatusPending,
		AssignmentStatusAssigned,
		AssignmentStatusInProgress,
		AssignmentStatusReview,
		AssignmentStatusRejected,
		AssignmentStatusApproved,
		AssignmentStatusPublished,
		AssignmentStatusArchived:
		return true
	default:
		return false
	}
}

func (s AssignmentStatus) IsTerminal() bool {
	switch s {
	case AssignmentStatusPublished, AssignmentStatusArchived:
		return true
	default:
		return false
	}
}

func (p Priority) IsValid() bool {
	switch p {
	case PriorityLow, PriorityNormal, PriorityHigh, PriorityUrgent:
		return true
	default:
		return false
	}
}

// Validate ensures required model fields and enum values are present.
func (a TranslationAssignment) Validate() error {
	if strings.TrimSpace(a.TranslationGroupID) == "" {
		return requiredFieldDomainError("translation_group_id", nil)
	}
	if strings.TrimSpace(a.EntityType) == "" {
		return requiredFieldDomainError("entity_type", nil)
	}
	if strings.TrimSpace(a.SourceRecordID) == "" {
		return requiredFieldDomainError("source_record_id", nil)
	}
	if strings.TrimSpace(a.SourceLocale) == "" {
		return requiredFieldDomainError("source_locale", nil)
	}
	if strings.TrimSpace(a.TargetLocale) == "" {
		return requiredFieldDomainError("target_locale", nil)
	}
	if !a.AssignmentType.IsValid() {
		return validationDomainError("invalid assignment_type", map[string]any{
			"field": "assignment_type",
		})
	}
	if !a.Status.IsValid() {
		return validationDomainError("invalid status", map[string]any{
			"field": "status",
		})
	}
	if !a.Priority.IsValid() {
		return validationDomainError("invalid priority", map[string]any{
			"field": "priority",
		})
	}
	if a.Version < 0 {
		return validationDomainError("version must be >= 0", map[string]any{
			"field": "version",
		})
	}
	return nil
}

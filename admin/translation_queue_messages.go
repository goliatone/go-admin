package admin

import (
	"strings"
	"time"
)

const (
	translationQueueClaimCommandName        = "translation.queue.claim"
	translationQueueAssignCommandName       = "translation.queue.assign"
	translationQueueReleaseCommandName      = "translation.queue.release"
	translationQueueSubmitCommandName       = "translation.queue.submit_review"
	translationQueueApproveCommandName      = "translation.queue.approve"
	translationQueueRejectCommandName       = "translation.queue.reject"
	translationQueueArchiveCommandName      = "translation.queue.archive"
	translationQueueBulkAssignCommandName   = "translation.queue.bulk_assign"
	translationQueueBulkReleaseCommandName  = "translation.queue.bulk_release"
	translationQueueBulkPriorityCommandName = "translation.queue.bulk_priority"
	translationQueueBulkArchiveCommandName  = "translation.queue.bulk_archive"
)

// TranslationQueueClaimInput claims or starts an assignment in progress.
type TranslationQueueClaimInput struct {
	AssignmentID    string                 `json:"assignment_id"`
	ClaimerID       string                 `json:"claimer_id"`
	ExpectedVersion int64                  `json:"expected_version"`
	Result          *TranslationAssignment `json:"-"`
}

func (TranslationQueueClaimInput) Type() string { return translationQueueClaimCommandName }

func (m TranslationQueueClaimInput) Validate() error {
	if strings.TrimSpace(m.AssignmentID) == "" {
		return requiredFieldDomainError("assignment_id", nil)
	}
	if strings.TrimSpace(m.ClaimerID) == "" {
		return requiredFieldDomainError("claimer_id", nil)
	}
	if m.ExpectedVersion <= 0 {
		return validationDomainError("expected_version must be > 0", map[string]any{"field": "expected_version"})
	}
	return nil
}

// TranslationQueueAssignInput assigns an item to a translator.
type TranslationQueueAssignInput struct {
	AssignmentID    string                 `json:"assignment_id"`
	AssigneeID      string                 `json:"assignee_id"`
	AssignerID      string                 `json:"assigner_id"`
	Priority        Priority               `json:"priority,omitempty"`
	DueDate         *time.Time             `json:"due_date,omitempty"`
	ExpectedVersion int64                  `json:"expected_version"`
	Result          *TranslationAssignment `json:"-"`
}

func (TranslationQueueAssignInput) Type() string { return translationQueueAssignCommandName }

func (m TranslationQueueAssignInput) Validate() error {
	if strings.TrimSpace(m.AssignmentID) == "" {
		return requiredFieldDomainError("assignment_id", nil)
	}
	if strings.TrimSpace(m.AssigneeID) == "" {
		return requiredFieldDomainError("assignee_id", nil)
	}
	if strings.TrimSpace(m.AssignerID) == "" {
		return requiredFieldDomainError("assigner_id", nil)
	}
	if m.Priority != "" && !m.Priority.IsValid() {
		return validationDomainError("invalid priority", map[string]any{"field": "priority"})
	}
	if m.ExpectedVersion <= 0 {
		return validationDomainError("expected_version must be > 0", map[string]any{"field": "expected_version"})
	}
	return nil
}

// TranslationQueueReleaseInput returns an assignment back to open pool.
type TranslationQueueReleaseInput struct {
	AssignmentID    string                 `json:"assignment_id"`
	ActorID         string                 `json:"actor_id"`
	ExpectedVersion int64                  `json:"expected_version"`
	Result          *TranslationAssignment `json:"-"`
}

func (TranslationQueueReleaseInput) Type() string { return translationQueueReleaseCommandName }

func (m TranslationQueueReleaseInput) Validate() error {
	if strings.TrimSpace(m.AssignmentID) == "" {
		return requiredFieldDomainError("assignment_id", nil)
	}
	if strings.TrimSpace(m.ActorID) == "" {
		return requiredFieldDomainError("actor_id", nil)
	}
	if m.ExpectedVersion <= 0 {
		return validationDomainError("expected_version must be > 0", map[string]any{"field": "expected_version"})
	}
	return nil
}

// TranslationQueueSubmitInput submits in-progress work for review.
type TranslationQueueSubmitInput struct {
	AssignmentID    string                 `json:"assignment_id"`
	TranslatorID    string                 `json:"translator_id"`
	ExpectedVersion int64                  `json:"expected_version"`
	Result          *TranslationAssignment `json:"-"`
}

func (TranslationQueueSubmitInput) Type() string { return translationQueueSubmitCommandName }

func (m TranslationQueueSubmitInput) Validate() error {
	if strings.TrimSpace(m.AssignmentID) == "" {
		return requiredFieldDomainError("assignment_id", nil)
	}
	if strings.TrimSpace(m.TranslatorID) == "" {
		return requiredFieldDomainError("translator_id", nil)
	}
	if m.ExpectedVersion <= 0 {
		return validationDomainError("expected_version must be > 0", map[string]any{"field": "expected_version"})
	}
	return nil
}

// TranslationQueueApproveInput approves a review item.
type TranslationQueueApproveInput struct {
	AssignmentID    string                 `json:"assignment_id"`
	ReviewerID      string                 `json:"reviewer_id"`
	ExpectedVersion int64                  `json:"expected_version"`
	Result          *TranslationAssignment `json:"-"`
}

func (TranslationQueueApproveInput) Type() string { return translationQueueApproveCommandName }

func (m TranslationQueueApproveInput) Validate() error {
	if strings.TrimSpace(m.AssignmentID) == "" {
		return requiredFieldDomainError("assignment_id", nil)
	}
	if strings.TrimSpace(m.ReviewerID) == "" {
		return requiredFieldDomainError("reviewer_id", nil)
	}
	if m.ExpectedVersion <= 0 {
		return validationDomainError("expected_version must be > 0", map[string]any{"field": "expected_version"})
	}
	return nil
}

// TranslationQueueRejectInput rejects a review item with required reason.
type TranslationQueueRejectInput struct {
	AssignmentID    string                 `json:"assignment_id"`
	ReviewerID      string                 `json:"reviewer_id"`
	Reason          string                 `json:"reason"`
	ExpectedVersion int64                  `json:"expected_version"`
	Result          *TranslationAssignment `json:"-"`
}

func (TranslationQueueRejectInput) Type() string { return translationQueueRejectCommandName }

func (m TranslationQueueRejectInput) Validate() error {
	if strings.TrimSpace(m.AssignmentID) == "" {
		return requiredFieldDomainError("assignment_id", nil)
	}
	if strings.TrimSpace(m.ReviewerID) == "" {
		return requiredFieldDomainError("reviewer_id", nil)
	}
	if strings.TrimSpace(m.Reason) == "" {
		return requiredFieldDomainError("reason", nil)
	}
	if m.ExpectedVersion <= 0 {
		return validationDomainError("expected_version must be > 0", map[string]any{"field": "expected_version"})
	}
	return nil
}

// TranslationQueueArchiveInput archives a queue assignment.
type TranslationQueueArchiveInput struct {
	AssignmentID    string                 `json:"assignment_id"`
	ActorID         string                 `json:"actor_id"`
	ExpectedVersion int64                  `json:"expected_version"`
	Result          *TranslationAssignment `json:"-"`
}

func (TranslationQueueArchiveInput) Type() string { return translationQueueArchiveCommandName }

func (m TranslationQueueArchiveInput) Validate() error {
	if strings.TrimSpace(m.AssignmentID) == "" {
		return requiredFieldDomainError("assignment_id", nil)
	}
	if strings.TrimSpace(m.ActorID) == "" {
		return requiredFieldDomainError("actor_id", nil)
	}
	if m.ExpectedVersion <= 0 {
		return validationDomainError("expected_version must be > 0", map[string]any{"field": "expected_version"})
	}
	return nil
}

// TranslationQueueBulkAssignInput bulk-assigns queue items.
type TranslationQueueBulkAssignInput struct {
	AssignmentIDs []string                 `json:"assignment_ids"`
	AssigneeID    string                   `json:"assignee_id"`
	AssignerID    string                   `json:"assigner_id"`
	Priority      Priority                 `json:"priority,omitempty"`
	DueDate       *time.Time               `json:"due_date,omitempty"`
	Result        *[]TranslationAssignment `json:"-"`
}

func (TranslationQueueBulkAssignInput) Type() string { return translationQueueBulkAssignCommandName }

func (m TranslationQueueBulkAssignInput) Validate() error {
	if err := requireIDs(m.AssignmentIDs, "assignment_ids required"); err != nil {
		return err
	}
	if strings.TrimSpace(m.AssigneeID) == "" {
		return requiredFieldDomainError("assignee_id", nil)
	}
	if strings.TrimSpace(m.AssignerID) == "" {
		return requiredFieldDomainError("assigner_id", nil)
	}
	if m.Priority != "" && !m.Priority.IsValid() {
		return validationDomainError("invalid priority", map[string]any{"field": "priority"})
	}
	return nil
}

// TranslationQueueBulkReleaseInput bulk-releases queue items.
type TranslationQueueBulkReleaseInput struct {
	AssignmentIDs []string                 `json:"assignment_ids"`
	ActorID       string                   `json:"actor_id"`
	Result        *[]TranslationAssignment `json:"-"`
}

func (TranslationQueueBulkReleaseInput) Type() string { return translationQueueBulkReleaseCommandName }

func (m TranslationQueueBulkReleaseInput) Validate() error {
	if err := requireIDs(m.AssignmentIDs, "assignment_ids required"); err != nil {
		return err
	}
	if strings.TrimSpace(m.ActorID) == "" {
		return requiredFieldDomainError("actor_id", nil)
	}
	return nil
}

// TranslationQueueBulkPriorityInput bulk-updates priority.
type TranslationQueueBulkPriorityInput struct {
	AssignmentIDs []string                 `json:"assignment_ids"`
	Priority      Priority                 `json:"priority"`
	ActorID       string                   `json:"actor_id"`
	Result        *[]TranslationAssignment `json:"-"`
}

func (TranslationQueueBulkPriorityInput) Type() string {
	return translationQueueBulkPriorityCommandName
}

func (m TranslationQueueBulkPriorityInput) Validate() error {
	if err := requireIDs(m.AssignmentIDs, "assignment_ids required"); err != nil {
		return err
	}
	if !m.Priority.IsValid() {
		return validationDomainError("invalid priority", map[string]any{"field": "priority"})
	}
	if strings.TrimSpace(m.ActorID) == "" {
		return requiredFieldDomainError("actor_id", nil)
	}
	return nil
}

// TranslationQueueBulkArchiveInput bulk-archives queue items.
type TranslationQueueBulkArchiveInput struct {
	AssignmentIDs []string                 `json:"assignment_ids"`
	ActorID       string                   `json:"actor_id"`
	Result        *[]TranslationAssignment `json:"-"`
}

func (TranslationQueueBulkArchiveInput) Type() string { return translationQueueBulkArchiveCommandName }

func (m TranslationQueueBulkArchiveInput) Validate() error {
	if err := requireIDs(m.AssignmentIDs, "assignment_ids required"); err != nil {
		return err
	}
	if strings.TrimSpace(m.ActorID) == "" {
		return requiredFieldDomainError("actor_id", nil)
	}
	return nil
}

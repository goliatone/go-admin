package admin

import (
	"context"
	"strings"
	"time"
)

// TranslationQueueService contains queue lifecycle operations used by command handlers.
type TranslationQueueService interface {
	Claim(ctx context.Context, input TranslationQueueClaimInput) (TranslationAssignment, error)
	Assign(ctx context.Context, input TranslationQueueAssignInput) (TranslationAssignment, error)
	Release(ctx context.Context, input TranslationQueueReleaseInput) (TranslationAssignment, error)
	SubmitReview(ctx context.Context, input TranslationQueueSubmitInput) (TranslationAssignment, error)
	Approve(ctx context.Context, input TranslationQueueApproveInput) (TranslationAssignment, error)
	Reject(ctx context.Context, input TranslationQueueRejectInput) (TranslationAssignment, error)
	Archive(ctx context.Context, input TranslationQueueArchiveInput) (TranslationAssignment, error)
	BulkAssign(ctx context.Context, input TranslationQueueBulkAssignInput) ([]TranslationAssignment, error)
	BulkRelease(ctx context.Context, input TranslationQueueBulkReleaseInput) ([]TranslationAssignment, error)
	BulkPriority(ctx context.Context, input TranslationQueueBulkPriorityInput) ([]TranslationAssignment, error)
	BulkArchive(ctx context.Context, input TranslationQueueBulkArchiveInput) ([]TranslationAssignment, error)
}

// DefaultTranslationQueueService implements queue lifecycle transitions over a repository.
type DefaultTranslationQueueService struct {
	Repository TranslationAssignmentRepository
}

func (s *DefaultTranslationQueueService) ensureRepository() error {
	if s == nil || s.Repository == nil {
		return serviceNotConfiguredDomainError("translation assignment repository", map[string]any{
			"component": "translation_queue_service",
		})
	}
	return nil
}

func (s *DefaultTranslationQueueService) Claim(ctx context.Context, input TranslationQueueClaimInput) (TranslationAssignment, error) {
	if err := input.Validate(); err != nil {
		return TranslationAssignment{}, err
	}
	if err := s.ensureRepository(); err != nil {
		return TranslationAssignment{}, err
	}

	assignment, err := s.Repository.Get(ctx, input.AssignmentID)
	if err != nil {
		return TranslationAssignment{}, err
	}

	switch assignment.Status {
	case AssignmentStatusPending:
		if assignment.AssignmentType != AssignmentTypeOpenPool {
			return TranslationAssignment{}, invalidQueueTransitionError(assignment.Status, "claim", assignment)
		}
	case AssignmentStatusAssigned, AssignmentStatusRejected:
		// Assigned/rejected items can resume in_progress by the assigned translator.
	default:
		return TranslationAssignment{}, invalidQueueTransitionError(assignment.Status, "claim", assignment)
	}

	assignment.Status = AssignmentStatusInProgress
	assignment.AssigneeID = strings.TrimSpace(input.ClaimerID)
	if assignment.AssignmentType == "" {
		assignment.AssignmentType = AssignmentTypeOpenPool
	}
	now := time.Now().UTC()
	assignment.ClaimedAt = &now
	assignment.LastRejectionReason = ""

	return s.Repository.Update(ctx, assignment, input.ExpectedVersion)
}

func (s *DefaultTranslationQueueService) Assign(ctx context.Context, input TranslationQueueAssignInput) (TranslationAssignment, error) {
	if err := input.Validate(); err != nil {
		return TranslationAssignment{}, err
	}
	if err := s.ensureRepository(); err != nil {
		return TranslationAssignment{}, err
	}

	assignment, err := s.Repository.Get(ctx, input.AssignmentID)
	if err != nil {
		return TranslationAssignment{}, err
	}

	switch assignment.Status {
	case AssignmentStatusPending, AssignmentStatusAssigned, AssignmentStatusRejected:
	default:
		return TranslationAssignment{}, invalidQueueTransitionError(assignment.Status, "assign", assignment)
	}

	assignment.AssignmentType = AssignmentTypeDirect
	assignment.Status = AssignmentStatusAssigned
	assignment.AssigneeID = strings.TrimSpace(input.AssigneeID)
	assignment.AssignerID = strings.TrimSpace(input.AssignerID)
	if input.Priority.IsValid() {
		assignment.Priority = input.Priority
	}
	if input.DueDate != nil {
		assignment.DueDate = cloneTimePtr(input.DueDate)
	}
	assignment.LastRejectionReason = ""

	return s.Repository.Update(ctx, assignment, input.ExpectedVersion)
}

func (s *DefaultTranslationQueueService) Release(ctx context.Context, input TranslationQueueReleaseInput) (TranslationAssignment, error) {
	if err := input.Validate(); err != nil {
		return TranslationAssignment{}, err
	}
	if err := s.ensureRepository(); err != nil {
		return TranslationAssignment{}, err
	}

	assignment, err := s.Repository.Get(ctx, input.AssignmentID)
	if err != nil {
		return TranslationAssignment{}, err
	}

	switch assignment.Status {
	case AssignmentStatusAssigned, AssignmentStatusInProgress, AssignmentStatusRejected:
	default:
		return TranslationAssignment{}, invalidQueueTransitionError(assignment.Status, "release", assignment)
	}

	assignment.AssignmentType = AssignmentTypeOpenPool
	assignment.Status = AssignmentStatusPending
	assignment.AssigneeID = ""
	assignment.AssignerID = strings.TrimSpace(input.ActorID)

	return s.Repository.Update(ctx, assignment, input.ExpectedVersion)
}

func (s *DefaultTranslationQueueService) SubmitReview(ctx context.Context, input TranslationQueueSubmitInput) (TranslationAssignment, error) {
	if err := input.Validate(); err != nil {
		return TranslationAssignment{}, err
	}
	if err := s.ensureRepository(); err != nil {
		return TranslationAssignment{}, err
	}

	assignment, err := s.Repository.Get(ctx, input.AssignmentID)
	if err != nil {
		return TranslationAssignment{}, err
	}

	if assignment.Status != AssignmentStatusInProgress {
		return TranslationAssignment{}, invalidQueueTransitionError(assignment.Status, "submit_review", assignment)
	}

	assignment.Status = AssignmentStatusReview
	now := time.Now().UTC()
	assignment.SubmittedAt = &now
	assignment.AssigneeID = strings.TrimSpace(input.TranslatorID)

	return s.Repository.Update(ctx, assignment, input.ExpectedVersion)
}

func (s *DefaultTranslationQueueService) Approve(ctx context.Context, input TranslationQueueApproveInput) (TranslationAssignment, error) {
	if err := input.Validate(); err != nil {
		return TranslationAssignment{}, err
	}
	if err := s.ensureRepository(); err != nil {
		return TranslationAssignment{}, err
	}

	assignment, err := s.Repository.Get(ctx, input.AssignmentID)
	if err != nil {
		return TranslationAssignment{}, err
	}

	if assignment.Status != AssignmentStatusReview {
		return TranslationAssignment{}, invalidQueueTransitionError(assignment.Status, "approve", assignment)
	}

	assignment.Status = AssignmentStatusApproved
	now := time.Now().UTC()
	assignment.ApprovedAt = &now
	assignment.LastReviewerID = strings.TrimSpace(input.ReviewerID)

	return s.Repository.Update(ctx, assignment, input.ExpectedVersion)
}

func (s *DefaultTranslationQueueService) Reject(ctx context.Context, input TranslationQueueRejectInput) (TranslationAssignment, error) {
	if err := input.Validate(); err != nil {
		return TranslationAssignment{}, err
	}
	if err := s.ensureRepository(); err != nil {
		return TranslationAssignment{}, err
	}

	assignment, err := s.Repository.Get(ctx, input.AssignmentID)
	if err != nil {
		return TranslationAssignment{}, err
	}

	if assignment.Status != AssignmentStatusReview {
		return TranslationAssignment{}, invalidQueueTransitionError(assignment.Status, "reject", assignment)
	}

	assignment.Status = AssignmentStatusRejected
	assignment.LastReviewerID = strings.TrimSpace(input.ReviewerID)
	assignment.LastRejectionReason = strings.TrimSpace(input.Reason)

	return s.Repository.Update(ctx, assignment, input.ExpectedVersion)
}

func (s *DefaultTranslationQueueService) Archive(ctx context.Context, input TranslationQueueArchiveInput) (TranslationAssignment, error) {
	if err := input.Validate(); err != nil {
		return TranslationAssignment{}, err
	}
	if err := s.ensureRepository(); err != nil {
		return TranslationAssignment{}, err
	}

	assignment, err := s.Repository.Get(ctx, input.AssignmentID)
	if err != nil {
		return TranslationAssignment{}, err
	}

	if assignment.Status == AssignmentStatusPublished {
		return TranslationAssignment{}, invalidQueueTransitionError(assignment.Status, "archive", assignment)
	}

	now := time.Now().UTC()
	assignment.Status = AssignmentStatusArchived
	assignment.ArchivedAt = &now
	assignment.LastReviewerID = strings.TrimSpace(firstNonEmpty(assignment.LastReviewerID, input.ActorID))

	return s.Repository.Update(ctx, assignment, input.ExpectedVersion)
}

func (s *DefaultTranslationQueueService) BulkAssign(ctx context.Context, input TranslationQueueBulkAssignInput) ([]TranslationAssignment, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}
	if err := s.ensureRepository(); err != nil {
		return nil, err
	}

	results := make([]TranslationAssignment, 0, len(input.AssignmentIDs))
	for _, id := range dedupeStrings(input.AssignmentIDs) {
		current, err := s.Repository.Get(ctx, id)
		if err != nil {
			return nil, err
		}
		updated, err := s.Assign(ctx, TranslationQueueAssignInput{
			AssignmentID:    id,
			AssigneeID:      input.AssigneeID,
			AssignerID:      input.AssignerID,
			Priority:        input.Priority,
			DueDate:         input.DueDate,
			ExpectedVersion: current.Version,
		})
		if err != nil {
			return nil, err
		}
		results = append(results, updated)
	}
	return results, nil
}

func (s *DefaultTranslationQueueService) BulkRelease(ctx context.Context, input TranslationQueueBulkReleaseInput) ([]TranslationAssignment, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}
	if err := s.ensureRepository(); err != nil {
		return nil, err
	}

	results := make([]TranslationAssignment, 0, len(input.AssignmentIDs))
	for _, id := range dedupeStrings(input.AssignmentIDs) {
		current, err := s.Repository.Get(ctx, id)
		if err != nil {
			return nil, err
		}
		updated, err := s.Release(ctx, TranslationQueueReleaseInput{
			AssignmentID:    id,
			ActorID:         input.ActorID,
			ExpectedVersion: current.Version,
		})
		if err != nil {
			return nil, err
		}
		results = append(results, updated)
	}
	return results, nil
}

func (s *DefaultTranslationQueueService) BulkPriority(ctx context.Context, input TranslationQueueBulkPriorityInput) ([]TranslationAssignment, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}
	if err := s.ensureRepository(); err != nil {
		return nil, err
	}

	results := make([]TranslationAssignment, 0, len(input.AssignmentIDs))
	for _, id := range dedupeStrings(input.AssignmentIDs) {
		current, err := s.Repository.Get(ctx, id)
		if err != nil {
			return nil, err
		}
		current.Priority = input.Priority
		updated, err := s.Repository.Update(ctx, current, current.Version)
		if err != nil {
			return nil, err
		}
		results = append(results, updated)
	}
	return results, nil
}

func (s *DefaultTranslationQueueService) BulkArchive(ctx context.Context, input TranslationQueueBulkArchiveInput) ([]TranslationAssignment, error) {
	if err := input.Validate(); err != nil {
		return nil, err
	}
	if err := s.ensureRepository(); err != nil {
		return nil, err
	}

	results := make([]TranslationAssignment, 0, len(input.AssignmentIDs))
	for _, id := range dedupeStrings(input.AssignmentIDs) {
		current, err := s.Repository.Get(ctx, id)
		if err != nil {
			return nil, err
		}
		updated, err := s.Archive(ctx, TranslationQueueArchiveInput{
			AssignmentID:    id,
			ActorID:         input.ActorID,
			ExpectedVersion: current.Version,
		})
		if err != nil {
			return nil, err
		}
		results = append(results, updated)
	}
	return results, nil
}

func invalidQueueTransitionError(from AssignmentStatus, transition string, assignment TranslationAssignment) error {
	return conflictDomainError("invalid translation queue transition", map[string]any{
		"from_status":          string(from),
		"transition":           strings.TrimSpace(transition),
		"assignment_id":        strings.TrimSpace(assignment.ID),
		"translation_group_id": strings.TrimSpace(assignment.TranslationGroupID),
		"entity_type":          strings.TrimSpace(assignment.EntityType),
		"source_locale":        strings.TrimSpace(assignment.SourceLocale),
		"target_locale":        strings.TrimSpace(assignment.TargetLocale),
	})
}

package admin

import (
	"context"
	"fmt"
	"strings"
	"time"

	urlkit "github.com/goliatone/go-urlkit"
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
	Repository    TranslationAssignmentRepository
	Activity      ActivitySink
	Notifications NotificationService
	URLs          urlkit.Resolver
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

	updated, err := s.Repository.Update(ctx, assignment, input.ExpectedVersion)
	if err != nil {
		return TranslationAssignment{}, err
	}
	s.recordTransition(ctx, "claimed", strings.TrimSpace(input.ClaimerID), updated)
	return updated, nil
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

	updated, err := s.Repository.Update(ctx, assignment, input.ExpectedVersion)
	if err != nil {
		return TranslationAssignment{}, err
	}
	s.recordTransition(ctx, "assigned", strings.TrimSpace(input.AssignerID), updated)
	return updated, nil
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

	updated, err := s.Repository.Update(ctx, assignment, input.ExpectedVersion)
	if err != nil {
		return TranslationAssignment{}, err
	}
	s.recordTransition(ctx, "released", strings.TrimSpace(input.ActorID), updated)
	return updated, nil
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

	updated, err := s.Repository.Update(ctx, assignment, input.ExpectedVersion)
	if err != nil {
		return TranslationAssignment{}, err
	}
	s.recordTransition(ctx, "submitted", strings.TrimSpace(input.TranslatorID), updated)
	return updated, nil
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

	updated, err := s.Repository.Update(ctx, assignment, input.ExpectedVersion)
	if err != nil {
		return TranslationAssignment{}, err
	}
	s.recordTransition(ctx, "approved", strings.TrimSpace(input.ReviewerID), updated)
	return updated, nil
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

	updated, err := s.Repository.Update(ctx, assignment, input.ExpectedVersion)
	if err != nil {
		return TranslationAssignment{}, err
	}
	s.recordTransition(ctx, "rejected", strings.TrimSpace(input.ReviewerID), updated)
	return updated, nil
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

	updated, err := s.Repository.Update(ctx, assignment, input.ExpectedVersion)
	if err != nil {
		return TranslationAssignment{}, err
	}
	s.recordTransition(ctx, "archived", strings.TrimSpace(input.ActorID), updated)
	return updated, nil
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

func (s *DefaultTranslationQueueService) recordTransition(ctx context.Context, action, actorID string, assignment TranslationAssignment) {
	action = strings.TrimSpace(action)
	if action == "" {
		return
	}
	meta := s.transitionMetadata(action, assignment)
	if s.Activity != nil {
		_ = s.Activity.Record(ctx, ActivityEntry{
			Actor:    actorID,
			Action:   "translation.queue." + action,
			Object:   "translation_assignment:" + strings.TrimSpace(assignment.ID),
			Metadata: cloneAnyMap(meta),
		})
	}

	targetUser := queueNotificationTarget(action, assignment, actorID)
	if s.Notifications != nil && targetUser != "" {
		title, message := queueNotificationMessage(action, assignment)
		_, _ = s.Notifications.Add(ctx, Notification{
			Title:     title,
			Message:   message,
			ActionURL: firstNonEmpty(toString(meta["url"]), ""),
			Metadata:  cloneAnyMap(meta),
			UserID:    targetUser,
			Read:      false,
		})
	}
}

func (s *DefaultTranslationQueueService) transitionMetadata(action string, assignment TranslationAssignment) map[string]any {
	query := map[string]string{}
	if id := strings.TrimSpace(assignment.ID); id != "" {
		query["assignment_id"] = id
	}
	url := resolveURLWith(s.URLs, "admin", "translations.queue", nil, query)
	meta := map[string]any{
		"event":                "translation.queue." + action,
		"assignment_id":        strings.TrimSpace(assignment.ID),
		"translation_group_id": strings.TrimSpace(assignment.TranslationGroupID),
		"entity_type":          strings.TrimSpace(assignment.EntityType),
		"source_locale":        strings.TrimSpace(assignment.SourceLocale),
		"target_locale":        strings.TrimSpace(assignment.TargetLocale),
		"status":               strings.TrimSpace(string(assignment.Status)),
		"assignee_id":          strings.TrimSpace(assignment.AssigneeID),
		"source_title":         strings.TrimSpace(assignment.SourceTitle),
		"source_path":          strings.TrimSpace(assignment.SourcePath),
		"resolver_key":         translationQueueResolverKey,
		"group":                "admin",
		"route":                "translations.queue",
		"query":                query,
	}
	if url != "" {
		meta["url"] = url
	}
	return meta
}

func queueNotificationTarget(action string, assignment TranslationAssignment, actorID string) string {
	action = strings.TrimSpace(action)
	target := ""
	switch action {
	case "assigned", "rejected", "approved":
		target = strings.TrimSpace(assignment.AssigneeID)
	}
	if target == "" || target == strings.TrimSpace(actorID) {
		return ""
	}
	return target
}

func queueNotificationMessage(action string, assignment TranslationAssignment) (string, string) {
	action = strings.TrimSpace(action)
	title := "Translation Queue Update"
	switch action {
	case "assigned":
		title = "Translation Assigned"
	case "rejected":
		title = "Translation Changes Requested"
	case "approved":
		title = "Translation Approved"
	}
	subject := strings.TrimSpace(firstNonEmpty(assignment.SourceTitle, assignment.TranslationGroupID, assignment.ID))
	source := strings.TrimSpace(assignment.SourceLocale)
	target := strings.TrimSpace(assignment.TargetLocale)
	if source == "" || target == "" {
		return title, fmt.Sprintf("%s (%s)", subject, strings.TrimSpace(string(assignment.Status)))
	}
	return title, fmt.Sprintf("%s (%s -> %s)", subject, source, target)
}

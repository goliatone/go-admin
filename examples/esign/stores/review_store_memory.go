package stores

import (
	"context"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
)

func (s *InMemoryStore) CreateAgreementReview(ctx context.Context, scope Scope, record AgreementReviewRecord) (AgreementReviewRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return AgreementReviewRecord{}, err
	}
	record.AgreementID = normalizeID(record.AgreementID)
	if record.AgreementID == "" {
		return AgreementReviewRecord{}, invalidRecordError("agreement_reviews", "agreement_id", "required")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	agreement, ok := s.agreements[scopedKey(scope, record.AgreementID)]
	if !ok {
		return AgreementReviewRecord{}, notFoundError("agreements", record.AgreementID)
	}

	indexKey := scopedKey(scope, record.AgreementID)
	if existingID := normalizeID(s.agreementReviewIndex[indexKey]); existingID != "" {
		return AgreementReviewRecord{}, invalidRecordError("agreement_reviews", "agreement_id", "review already exists")
	}

	if normalizeID(record.ID) == "" {
		record.ID = uuid.NewString()
	}
	record.ID = normalizeID(record.ID)
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.Status = normalizeAgreementReviewStatus(record.Status)
	if record.Status == "" {
		return AgreementReviewRecord{}, invalidRecordError("agreement_reviews", "status", "unsupported review status")
	}
	record.Gate = normalizeAgreementReviewGate(record.Gate)
	if record.Gate == "" {
		return AgreementReviewRecord{}, invalidRecordError("agreement_reviews", "gate", "unsupported review gate")
	}
	record.RequestedByUserID = normalizeID(record.RequestedByUserID)
	record.OpenedAt = cloneTimePtr(record.OpenedAt)
	record.ClosedAt = cloneTimePtr(record.ClosedAt)
	record.LastActivityAt = cloneTimePtr(record.LastActivityAt)
	record.CreatedAt = normalizeRecordTime(record.CreatedAt)
	record.UpdatedAt = normalizeRecordTime(record.UpdatedAt)
	if record.LastActivityAt == nil {
		record.LastActivityAt = cloneTimePtr(&record.UpdatedAt)
	}

	s.agreementReviews[scopedKey(scope, record.ID)] = record
	s.agreementReviewIndex[indexKey] = record.ID
	agreement.ReviewStatus = record.Status
	agreement.ReviewGate = record.Gate
	agreement.UpdatedAt = time.Now().UTC()
	s.agreements[scopedKey(scope, agreement.ID)] = agreement
	return record, nil
}

func (s *InMemoryStore) GetAgreementReviewByAgreementID(ctx context.Context, scope Scope, agreementID string) (AgreementReviewRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return AgreementReviewRecord{}, err
	}
	agreementID = normalizeID(agreementID)
	if agreementID == "" {
		return AgreementReviewRecord{}, invalidRecordError("agreement_reviews", "agreement_id", "required")
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	reviewID := normalizeID(s.agreementReviewIndex[scopedKey(scope, agreementID)])
	if reviewID == "" {
		return AgreementReviewRecord{}, notFoundError("agreement_reviews", agreementID)
	}
	record, ok := s.agreementReviews[scopedKey(scope, reviewID)]
	if !ok {
		return AgreementReviewRecord{}, notFoundError("agreement_reviews", reviewID)
	}
	return record, nil
}

func (s *InMemoryStore) UpdateAgreementReview(ctx context.Context, scope Scope, record AgreementReviewRecord) (AgreementReviewRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return AgreementReviewRecord{}, err
	}
	record.ID = normalizeID(record.ID)
	if record.ID == "" {
		return AgreementReviewRecord{}, invalidRecordError("agreement_reviews", "id", "required")
	}

	key := scopedKey(scope, record.ID)
	s.mu.Lock()
	defer s.mu.Unlock()

	existing, ok := s.agreementReviews[key]
	if !ok {
		return AgreementReviewRecord{}, notFoundError("agreement_reviews", record.ID)
	}
	if normalized := normalizeAgreementReviewStatus(record.Status); normalized != "" {
		existing.Status = normalized
	}
	if normalized := normalizeAgreementReviewGate(record.Gate); normalized != "" {
		existing.Gate = normalized
	}
	existing.RequestedByUserID = normalizeID(record.RequestedByUserID)
	existing.OpenedAt = cloneTimePtr(record.OpenedAt)
	existing.ClosedAt = cloneTimePtr(record.ClosedAt)
	existing.LastActivityAt = cloneTimePtr(record.LastActivityAt)
	existing.UpdatedAt = time.Now().UTC()
	if existing.LastActivityAt == nil {
		existing.LastActivityAt = cloneTimePtr(&existing.UpdatedAt)
	}
	s.agreementReviews[key] = existing

	agreementKey := scopedKey(scope, existing.AgreementID)
	if agreement, exists := s.agreements[agreementKey]; exists {
		agreement.ReviewStatus = existing.Status
		agreement.ReviewGate = existing.Gate
		agreement.UpdatedAt = existing.UpdatedAt
		s.agreements[agreementKey] = agreement
	}
	return existing, nil
}

func (s *InMemoryStore) ReplaceAgreementReviewParticipants(ctx context.Context, scope Scope, reviewID string, records []AgreementReviewParticipantRecord) error {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return err
	}
	reviewID = normalizeID(reviewID)
	if reviewID == "" {
		return invalidRecordError("agreement_review_participants", "review_id", "required")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	review, ok := s.agreementReviews[scopedKey(scope, reviewID)]
	if !ok {
		return notFoundError("agreement_reviews", reviewID)
	}

	for key, participant := range s.agreementReviewParticipants {
		if participant.TenantID == scope.TenantID && participant.OrgID == scope.OrgID && participant.ReviewID == reviewID {
			delete(s.agreementReviewParticipants, key)
		}
	}

	for _, record := range records {
		record.ReviewID = reviewID
		record.RecipientID = normalizeID(record.RecipientID)
		if record.RecipientID == "" {
			return invalidRecordError("agreement_review_participants", "recipient_id", "required")
		}
		recipient, ok := s.recipients[scopedKey(scope, record.RecipientID)]
		if !ok || recipient.AgreementID != review.AgreementID {
			return invalidRecordError("agreement_review_participants", "recipient_id", "recipient must belong to agreement")
		}
		if normalizeID(record.ID) == "" {
			record.ID = uuid.NewString()
		}
		record.ID = normalizeID(record.ID)
		record.TenantID = scope.TenantID
		record.OrgID = scope.OrgID
		record.Role = strings.TrimSpace(record.Role)
		if record.Role == "" {
			record.Role = AgreementReviewParticipantRoleReviewer
		}
		record.DecisionStatus = NormalizeAgreementReviewDecision(record.DecisionStatus)
		if record.DecisionStatus == "" {
			return invalidRecordError("agreement_review_participants", "decision_status", "unsupported decision status")
		}
		record.DecisionAt = cloneTimePtr(record.DecisionAt)
		record.CreatedAt = normalizeRecordTime(record.CreatedAt)
		record.UpdatedAt = normalizeRecordTime(record.UpdatedAt)
		s.agreementReviewParticipants[scopedKey(scope, record.ID)] = record
	}
	return nil
}

func (s *InMemoryStore) ListAgreementReviewParticipants(ctx context.Context, scope Scope, reviewID string) ([]AgreementReviewParticipantRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return nil, err
	}
	reviewID = normalizeID(reviewID)
	if reviewID == "" {
		return nil, invalidRecordError("agreement_review_participants", "review_id", "required")
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	out := make([]AgreementReviewParticipantRecord, 0)
	for _, record := range s.agreementReviewParticipants {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if record.ReviewID != reviewID {
			continue
		}
		out = append(out, record)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].CreatedAt.Equal(out[j].CreatedAt) {
			return out[i].ID < out[j].ID
		}
		return out[i].CreatedAt.Before(out[j].CreatedAt)
	})
	return out, nil
}

func (s *InMemoryStore) UpdateAgreementReviewParticipant(ctx context.Context, scope Scope, record AgreementReviewParticipantRecord) (AgreementReviewParticipantRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return AgreementReviewParticipantRecord{}, err
	}
	record.ID = normalizeID(record.ID)
	if record.ID == "" {
		return AgreementReviewParticipantRecord{}, invalidRecordError("agreement_review_participants", "id", "required")
	}

	key := scopedKey(scope, record.ID)
	s.mu.Lock()
	defer s.mu.Unlock()

	existing, ok := s.agreementReviewParticipants[key]
	if !ok {
		return AgreementReviewParticipantRecord{}, notFoundError("agreement_review_participants", record.ID)
	}
	if normalized := NormalizeAgreementReviewDecision(record.DecisionStatus); normalized != "" {
		existing.DecisionStatus = normalized
	}
	existing.CanApprove = record.CanApprove
	existing.CanComment = record.CanComment
	existing.DecisionAt = cloneTimePtr(record.DecisionAt)
	existing.UpdatedAt = time.Now().UTC()
	s.agreementReviewParticipants[key] = existing
	return existing, nil
}

func (s *InMemoryStore) CreateAgreementCommentThread(ctx context.Context, scope Scope, record AgreementCommentThreadRecord) (AgreementCommentThreadRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return AgreementCommentThreadRecord{}, err
	}
	record.AgreementID = normalizeID(record.AgreementID)
	record.ReviewID = normalizeID(record.ReviewID)
	if record.AgreementID == "" {
		return AgreementCommentThreadRecord{}, invalidRecordError("agreement_comment_threads", "agreement_id", "required")
	}
	if record.ReviewID == "" {
		return AgreementCommentThreadRecord{}, invalidRecordError("agreement_comment_threads", "review_id", "required")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	agreement, ok := s.agreements[scopedKey(scope, record.AgreementID)]
	if !ok {
		return AgreementCommentThreadRecord{}, notFoundError("agreements", record.AgreementID)
	}
	review, ok := s.agreementReviews[scopedKey(scope, record.ReviewID)]
	if !ok || review.AgreementID != record.AgreementID {
		return AgreementCommentThreadRecord{}, invalidRecordError("agreement_comment_threads", "review_id", "review must belong to agreement")
	}
	if normalizeID(record.ID) == "" {
		record.ID = uuid.NewString()
	}
	record.ID = normalizeID(record.ID)
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.DocumentID = normalizeID(record.DocumentID)
	if record.DocumentID == "" {
		record.DocumentID = agreement.DocumentID
	}
	record.Visibility = NormalizeAgreementCommentVisibility(record.Visibility)
	if record.Visibility == "" {
		return AgreementCommentThreadRecord{}, invalidRecordError("agreement_comment_threads", "visibility", "unsupported visibility")
	}
	record.AnchorType = NormalizeAgreementCommentAnchorType(record.AnchorType)
	if record.AnchorType == "" {
		return AgreementCommentThreadRecord{}, invalidRecordError("agreement_comment_threads", "anchor_type", "unsupported anchor type")
	}
	record.FieldID = normalizeID(record.FieldID)
	record.Status = NormalizeAgreementCommentThreadStatus(record.Status)
	if record.Status == "" {
		return AgreementCommentThreadRecord{}, invalidRecordError("agreement_comment_threads", "status", "unsupported status")
	}
	record.CreatedByType = strings.TrimSpace(record.CreatedByType)
	record.CreatedByID = normalizeID(record.CreatedByID)
	record.ResolvedByType = strings.TrimSpace(record.ResolvedByType)
	record.ResolvedByID = normalizeID(record.ResolvedByID)
	record.ResolvedAt = cloneTimePtr(record.ResolvedAt)
	record.LastActivityAt = cloneTimePtr(record.LastActivityAt)
	record.CreatedAt = normalizeRecordTime(record.CreatedAt)
	record.UpdatedAt = normalizeRecordTime(record.UpdatedAt)
	if record.LastActivityAt == nil {
		record.LastActivityAt = cloneTimePtr(&record.UpdatedAt)
	}
	s.agreementCommentThreads[scopedKey(scope, record.ID)] = record
	return record, nil
}

func (s *InMemoryStore) GetAgreementCommentThread(ctx context.Context, scope Scope, threadID string) (AgreementCommentThreadRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return AgreementCommentThreadRecord{}, err
	}
	threadID = normalizeID(threadID)
	if threadID == "" {
		return AgreementCommentThreadRecord{}, invalidRecordError("agreement_comment_threads", "id", "required")
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	record, ok := s.agreementCommentThreads[scopedKey(scope, threadID)]
	if !ok {
		return AgreementCommentThreadRecord{}, notFoundError("agreement_comment_threads", threadID)
	}
	return record, nil
}

func (s *InMemoryStore) UpdateAgreementCommentThread(ctx context.Context, scope Scope, record AgreementCommentThreadRecord) (AgreementCommentThreadRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return AgreementCommentThreadRecord{}, err
	}
	record.ID = normalizeID(record.ID)
	if record.ID == "" {
		return AgreementCommentThreadRecord{}, invalidRecordError("agreement_comment_threads", "id", "required")
	}

	key := scopedKey(scope, record.ID)
	s.mu.Lock()
	defer s.mu.Unlock()

	existing, ok := s.agreementCommentThreads[key]
	if !ok {
		return AgreementCommentThreadRecord{}, notFoundError("agreement_comment_threads", record.ID)
	}
	if normalized := NormalizeAgreementCommentThreadStatus(record.Status); normalized != "" {
		existing.Status = normalized
	}
	if normalized := NormalizeAgreementCommentVisibility(record.Visibility); normalized != "" {
		existing.Visibility = normalized
	}
	existing.ResolvedByType = strings.TrimSpace(record.ResolvedByType)
	existing.ResolvedByID = normalizeID(record.ResolvedByID)
	existing.ResolvedAt = cloneTimePtr(record.ResolvedAt)
	existing.LastActivityAt = cloneTimePtr(record.LastActivityAt)
	existing.UpdatedAt = time.Now().UTC()
	if existing.LastActivityAt == nil {
		existing.LastActivityAt = cloneTimePtr(&existing.UpdatedAt)
	}
	s.agreementCommentThreads[key] = existing
	return existing, nil
}

func (s *InMemoryStore) ListAgreementCommentThreads(ctx context.Context, scope Scope, agreementID string, query AgreementCommentThreadQuery) ([]AgreementCommentThreadRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return nil, err
	}
	agreementID = normalizeID(agreementID)
	if agreementID == "" {
		return nil, invalidRecordError("agreement_comment_threads", "agreement_id", "required")
	}
	reviewID := normalizeID(query.ReviewID)
	visibility := strings.TrimSpace(query.Visibility)
	status := strings.TrimSpace(query.Status)

	s.mu.RLock()
	defer s.mu.RUnlock()

	out := make([]AgreementCommentThreadRecord, 0)
	for _, record := range s.agreementCommentThreads {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if record.AgreementID != agreementID {
			continue
		}
		if reviewID != "" && record.ReviewID != reviewID {
			continue
		}
		if visibility != "" && record.Visibility != visibility {
			continue
		}
		if status != "" && record.Status != status {
			continue
		}
		out = append(out, record)
	}
	sort.Slice(out, func(i, j int) bool {
		if query.SortDesc {
			if out[i].CreatedAt.Equal(out[j].CreatedAt) {
				return out[i].ID > out[j].ID
			}
			return out[i].CreatedAt.After(out[j].CreatedAt)
		}
		if out[i].CreatedAt.Equal(out[j].CreatedAt) {
			return out[i].ID < out[j].ID
		}
		return out[i].CreatedAt.Before(out[j].CreatedAt)
	})
	start := max(query.Offset, 0)
	if start > len(out) {
		start = len(out)
	}
	end := len(out)
	if query.Limit > 0 && start+query.Limit < end {
		end = start + query.Limit
	}
	return out[start:end], nil
}

func (s *InMemoryStore) CreateAgreementCommentMessage(ctx context.Context, scope Scope, record AgreementCommentMessageRecord) (AgreementCommentMessageRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return AgreementCommentMessageRecord{}, err
	}
	record.ThreadID = normalizeID(record.ThreadID)
	if record.ThreadID == "" {
		return AgreementCommentMessageRecord{}, invalidRecordError("agreement_comment_messages", "thread_id", "required")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	thread, ok := s.agreementCommentThreads[scopedKey(scope, record.ThreadID)]
	if !ok {
		return AgreementCommentMessageRecord{}, notFoundError("agreement_comment_threads", record.ThreadID)
	}
	if normalizeID(record.ID) == "" {
		record.ID = uuid.NewString()
	}
	record.ID = normalizeID(record.ID)
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.Body = strings.TrimSpace(record.Body)
	if record.Body == "" {
		return AgreementCommentMessageRecord{}, invalidRecordError("agreement_comment_messages", "body", "required")
	}
	record.MessageKind = NormalizeAgreementCommentMessageKind(record.MessageKind)
	if record.MessageKind == "" {
		return AgreementCommentMessageRecord{}, invalidRecordError("agreement_comment_messages", "message_kind", "unsupported message kind")
	}
	record.CreatedByType = strings.TrimSpace(record.CreatedByType)
	record.CreatedByID = normalizeID(record.CreatedByID)
	record.CreatedAt = normalizeRecordTime(record.CreatedAt)
	s.agreementCommentMessages[scopedKey(scope, record.ID)] = record

	thread.LastActivityAt = cloneTimePtr(&record.CreatedAt)
	thread.UpdatedAt = record.CreatedAt
	s.agreementCommentThreads[scopedKey(scope, thread.ID)] = thread
	return record, nil
}

func (s *InMemoryStore) ListAgreementCommentMessages(ctx context.Context, scope Scope, threadID string) ([]AgreementCommentMessageRecord, error) {
	_ = ctx
	scope, err := validateScope(scope)
	if err != nil {
		return nil, err
	}
	threadID = normalizeID(threadID)
	if threadID == "" {
		return nil, invalidRecordError("agreement_comment_messages", "thread_id", "required")
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	out := make([]AgreementCommentMessageRecord, 0)
	for _, record := range s.agreementCommentMessages {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if record.ThreadID != threadID {
			continue
		}
		out = append(out, record)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].CreatedAt.Equal(out[j].CreatedAt) {
			return out[i].ID < out[j].ID
		}
		return out[i].CreatedAt.Before(out[j].CreatedAt)
	})
	return out, nil
}

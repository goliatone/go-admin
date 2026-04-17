package stores

import (
	"context"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
)

func agreementReviewParticipantMatchesReview(record AgreementReviewParticipantRecord, scope Scope, reviewID string) bool {
	return record.TenantID == scope.TenantID && record.OrgID == scope.OrgID && record.ReviewID == reviewID
}

func agreementReviewParticipantCreatedAt(record AgreementReviewParticipantRecord) time.Time {
	return record.CreatedAt
}

func agreementReviewParticipantID(record AgreementReviewParticipantRecord) string { return record.ID }

func agreementCommentMessageMatchesThread(record AgreementCommentMessageRecord, scope Scope, threadID string) bool {
	return record.TenantID == scope.TenantID && record.OrgID == scope.OrgID && record.ThreadID == threadID
}

func agreementCommentMessageCreatedAt(record AgreementCommentMessageRecord) time.Time {
	return record.CreatedAt
}
func agreementCommentMessageID(record AgreementCommentMessageRecord) string { return record.ID }

func normalizeAgreementCommentThreadTarget(scope Scope, record AgreementCommentThreadRecord) (Scope, AgreementCommentThreadRecord, error) {
	scope, err := validateScope(scope)
	if err != nil {
		return Scope{}, AgreementCommentThreadRecord{}, err
	}
	record.AgreementID = normalizeID(record.AgreementID)
	record.ReviewID = normalizeID(record.ReviewID)
	if record.AgreementID == "" {
		return Scope{}, AgreementCommentThreadRecord{}, invalidRecordError("agreement_comment_threads", "agreement_id", "required")
	}
	if record.ReviewID == "" {
		return Scope{}, AgreementCommentThreadRecord{}, invalidRecordError("agreement_comment_threads", "review_id", "required")
	}
	return scope, record, nil
}

func prepareAgreementCommentThreadRecord(scope Scope, agreement AgreementRecord, record AgreementCommentThreadRecord) (AgreementCommentThreadRecord, error) {
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
	return record, nil
}

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

	if _, ok := s.agreements[scopedKey(scope, record.AgreementID)]; !ok {
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
	record.OverrideReason = strings.TrimSpace(record.OverrideReason)
	record.OverrideByUserID = normalizeID(record.OverrideByUserID)
	record.OverrideByDisplayName = strings.TrimSpace(record.OverrideByDisplayName)
	record.OverrideAt = cloneTimePtr(record.OverrideAt)
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
	existing.OverrideActive = record.OverrideActive
	existing.OverrideReason = strings.TrimSpace(record.OverrideReason)
	existing.OverrideByUserID = normalizeID(record.OverrideByUserID)
	existing.OverrideByDisplayName = strings.TrimSpace(record.OverrideByDisplayName)
	existing.OverrideAt = cloneTimePtr(record.OverrideAt)
	existing.OpenedAt = cloneTimePtr(record.OpenedAt)
	existing.ClosedAt = cloneTimePtr(record.ClosedAt)
	existing.LastActivityAt = cloneTimePtr(record.LastActivityAt)
	existing.UpdatedAt = time.Now().UTC()
	if existing.LastActivityAt == nil {
		existing.LastActivityAt = cloneTimePtr(&existing.UpdatedAt)
	}
	s.agreementReviews[key] = existing
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
	s.removeAgreementReviewParticipants(scope, reviewID)

	for _, record := range records {
		record, err = s.prepareAgreementReviewParticipant(scope, review, reviewID, record)
		if err != nil {
			return err
		}
		s.agreementReviewParticipants[scopedKey(scope, record.ID)] = record
	}
	return nil
}

func (s *InMemoryStore) removeAgreementReviewParticipants(scope Scope, reviewID string) {
	removedParticipantIDs := make([]string, 0)
	for key, participant := range s.agreementReviewParticipants {
		if participant.TenantID == scope.TenantID && participant.OrgID == scope.OrgID && participant.ReviewID == reviewID {
			removedParticipantIDs = append(removedParticipantIDs, participant.ID)
			delete(s.agreementReviewParticipants, key)
		}
	}
	if len(removedParticipantIDs) == 0 {
		return
	}
	removedSet := make(map[string]struct{}, len(removedParticipantIDs))
	for _, participantID := range removedParticipantIDs {
		removedSet[participantID] = struct{}{}
	}
	for key, token := range s.reviewSessionTokens {
		if token.TenantID != scope.TenantID || token.OrgID != scope.OrgID {
			continue
		}
		if _, ok := removedSet[token.ParticipantID]; !ok {
			continue
		}
		delete(s.reviewSessionTokenHashIndex, token.TokenHash)
		delete(s.reviewSessionTokens, key)
	}
}

func (s *InMemoryStore) prepareAgreementReviewParticipant(scope Scope, review AgreementReviewRecord, reviewID string, record AgreementReviewParticipantRecord) (AgreementReviewParticipantRecord, error) {
	record.ReviewID = reviewID
	record.ParticipantType = NormalizeAgreementReviewParticipantType(record.ParticipantType)
	if record.ParticipantType == "" {
		return AgreementReviewParticipantRecord{}, invalidRecordError("agreement_review_participants", "participant_type", "unsupported participant type")
	}
	record.RecipientID = normalizeID(record.RecipientID)
	record.Email = strings.TrimSpace(strings.ToLower(record.Email))
	record.DisplayName = strings.TrimSpace(record.DisplayName)
	switch record.ParticipantType {
	case AgreementReviewParticipantTypeRecipient:
		if err := s.populateRecipientReviewParticipant(scope, review.AgreementID, &record); err != nil {
			return AgreementReviewParticipantRecord{}, err
		}
	case AgreementReviewParticipantTypeExternal:
		record.RecipientID = ""
		if record.Email == "" {
			return AgreementReviewParticipantRecord{}, invalidRecordError("agreement_review_participants", "email", "required")
		}
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
		return AgreementReviewParticipantRecord{}, invalidRecordError("agreement_review_participants", "decision_status", "unsupported decision status")
	}
	record.DecisionAt = cloneTimePtr(record.DecisionAt)
	record.ApprovedOnBehalfByUserID = normalizeID(record.ApprovedOnBehalfByUserID)
	record.ApprovedOnBehalfByDisplayName = strings.TrimSpace(record.ApprovedOnBehalfByDisplayName)
	record.ApprovedOnBehalfReason = strings.TrimSpace(record.ApprovedOnBehalfReason)
	record.ApprovedOnBehalfAt = cloneTimePtr(record.ApprovedOnBehalfAt)
	record.CreatedAt = normalizeRecordTime(record.CreatedAt)
	record.UpdatedAt = normalizeRecordTime(record.UpdatedAt)
	return record, nil
}

func (s *InMemoryStore) populateRecipientReviewParticipant(scope Scope, agreementID string, record *AgreementReviewParticipantRecord) error {
	if record == nil || record.RecipientID == "" {
		return invalidRecordError("agreement_review_participants", "recipient_id", "required")
	}
	recipientAgreementID := ""
	if recipient, ok := s.recipients[scopedKey(scope, record.RecipientID)]; ok {
		recipientAgreementID = recipient.AgreementID
		if record.Email == "" {
			record.Email = strings.TrimSpace(strings.ToLower(recipient.Email))
		}
		if record.DisplayName == "" {
			record.DisplayName = strings.TrimSpace(recipient.Name)
		}
	}
	if recipientAgreementID == "" {
		recipientAgreementID, record.Email, record.DisplayName = s.reviewParticipantFallback(scope, record)
	}
	if recipientAgreementID != agreementID {
		return invalidRecordError("agreement_review_participants", "recipient_id", "recipient must belong to agreement")
	}
	return nil
}

func (s *InMemoryStore) reviewParticipantFallback(scope Scope, record *AgreementReviewParticipantRecord) (string, string, string) {
	email := strings.TrimSpace(record.Email)
	displayName := strings.TrimSpace(record.DisplayName)
	participant, ok := s.participants[scopedKey(scope, record.RecipientID)]
	if !ok {
		return "", email, displayName
	}
	if email == "" {
		email = strings.TrimSpace(strings.ToLower(participant.Email))
	}
	if displayName == "" {
		displayName = strings.TrimSpace(participant.Name)
	}
	return participant.AgreementID, email, displayName
}

func (s *InMemoryStore) ListAgreementReviewParticipants(ctx context.Context, scope Scope, reviewID string) ([]AgreementReviewParticipantRecord, error) {
	return listScopedRequiredRecordSet(s, ctx, scope, reviewID, "agreement_review_participants", "review_id", s.agreementReviewParticipants, agreementReviewParticipantMatchesReview, func(record AgreementReviewParticipantRecord) AgreementReviewParticipantRecord { return record }, agreementReviewParticipantCreatedAt, agreementReviewParticipantID)
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
	if normalized := NormalizeAgreementReviewParticipantType(record.ParticipantType); normalized != "" {
		existing.ParticipantType = normalized
	}
	existing.CanApprove = record.CanApprove
	existing.CanComment = record.CanComment
	if email := strings.TrimSpace(strings.ToLower(record.Email)); email != "" {
		existing.Email = email
	}
	if displayName := strings.TrimSpace(record.DisplayName); displayName != "" {
		existing.DisplayName = displayName
	}
	existing.DecisionAt = cloneTimePtr(record.DecisionAt)
	existing.ApprovedOnBehalfByUserID = normalizeID(record.ApprovedOnBehalfByUserID)
	existing.ApprovedOnBehalfByDisplayName = strings.TrimSpace(record.ApprovedOnBehalfByDisplayName)
	existing.ApprovedOnBehalfReason = strings.TrimSpace(record.ApprovedOnBehalfReason)
	existing.ApprovedOnBehalfAt = cloneTimePtr(record.ApprovedOnBehalfAt)
	existing.UpdatedAt = time.Now().UTC()
	s.agreementReviewParticipants[key] = existing
	return existing, nil
}

func (s *InMemoryStore) CreateAgreementCommentThread(ctx context.Context, scope Scope, record AgreementCommentThreadRecord) (AgreementCommentThreadRecord, error) {
	_ = ctx
	scope, record, err := normalizeAgreementCommentThreadTarget(scope, record)
	if err != nil {
		return AgreementCommentThreadRecord{}, err
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
	record, err = prepareAgreementCommentThreadRecord(scope, agreement, record)
	if err != nil {
		return AgreementCommentThreadRecord{}, err
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
		if !includeAgreementCommentThreadRecord(record, scope, agreementID, reviewID, visibility, status) {
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
	start := min(max(query.Offset, 0), len(out))
	end := len(out)
	if query.Limit > 0 && start+query.Limit < end {
		end = start + query.Limit
	}
	return out[start:end], nil
}

func includeAgreementCommentThreadRecord(record AgreementCommentThreadRecord, scope Scope, agreementID, reviewID, visibility, status string) bool {
	if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
		return false
	}
	if record.AgreementID != agreementID {
		return false
	}
	if reviewID != "" && record.ReviewID != reviewID {
		return false
	}
	if visibility != "" && record.Visibility != visibility {
		return false
	}
	return status == "" || record.Status == status
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
	return listScopedRequiredRecordSet(s, ctx, scope, threadID, "agreement_comment_messages", "thread_id", s.agreementCommentMessages, agreementCommentMessageMatchesThread, func(record AgreementCommentMessageRecord) AgreementCommentMessageRecord { return record }, agreementCommentMessageCreatedAt, agreementCommentMessageID)
}

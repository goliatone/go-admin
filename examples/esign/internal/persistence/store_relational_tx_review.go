package persistence

import (
	"context"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/google/uuid"
)

func (s *relationalTxStore) CreateAgreementReview(ctx context.Context, scope stores.Scope, record stores.AgreementReviewRecord) (stores.AgreementReviewRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.AgreementReviewRecord{}, err
	}
	record.AgreementID = normalizeRelationalID(record.AgreementID)
	if record.AgreementID == "" {
		return stores.AgreementReviewRecord{}, relationalInvalidRecordError("agreement_reviews", "agreement_id", "required")
	}
	if _, err := loadAgreementRecord(ctx, s.tx, scope, record.AgreementID); err != nil {
		return stores.AgreementReviewRecord{}, err
	}
	record.ID = normalizeRelationalID(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.Status = stores.NormalizeAgreementReviewStatus(record.Status)
	if record.Status == "" {
		return stores.AgreementReviewRecord{}, relationalInvalidRecordError("agreement_reviews", "status", "unsupported review status")
	}
	record.Gate = stores.NormalizeAgreementReviewGate(record.Gate)
	if record.Gate == "" {
		return stores.AgreementReviewRecord{}, relationalInvalidRecordError("agreement_reviews", "gate", "unsupported review gate")
	}
	record.RequestedByUserID = normalizeRelationalID(record.RequestedByUserID)
	record.OpenedAt = cloneRelationalTimePtr(record.OpenedAt)
	record.ClosedAt = cloneRelationalTimePtr(record.ClosedAt)
	record.LastActivityAt = cloneRelationalTimePtr(record.LastActivityAt)
	record.CreatedAt = relationalTimeOrNow(record.CreatedAt)
	record.UpdatedAt = relationalTimeOrNow(record.UpdatedAt)
	if record.LastActivityAt == nil {
		record.LastActivityAt = cloneRelationalTimePtr(&record.UpdatedAt)
	}
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return stores.AgreementReviewRecord{}, relationalUniqueConstraintError(err, "agreement_reviews", "agreement_id")
	}
	return record, nil
}

func (s *relationalTxStore) GetAgreementReviewByAgreementID(ctx context.Context, scope stores.Scope, agreementID string) (stores.AgreementReviewRecord, error) {
	return loadAgreementReviewByAgreementID(ctx, s.tx, scope, agreementID)
}

func (s *relationalTxStore) UpdateAgreementReview(ctx context.Context, scope stores.Scope, record stores.AgreementReviewRecord) (stores.AgreementReviewRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.AgreementReviewRecord{}, err
	}
	var existing stores.AgreementReviewRecord
	if strings.TrimSpace(record.ID) != "" {
		existing, err = loadAgreementReviewByID(ctx, s.tx, scope, record.ID)
	} else {
		existing, err = loadAgreementReviewByAgreementID(ctx, s.tx, scope, record.AgreementID)
	}
	if err != nil {
		return stores.AgreementReviewRecord{}, err
	}
	if normalized := stores.NormalizeAgreementReviewStatus(record.Status); normalized != "" {
		existing.Status = normalized
	}
	if normalized := stores.NormalizeAgreementReviewGate(record.Gate); normalized != "" {
		existing.Gate = normalized
	}
	existing.RequestedByUserID = normalizeRelationalID(record.RequestedByUserID)
	existing.OpenedAt = cloneRelationalTimePtr(record.OpenedAt)
	existing.ClosedAt = cloneRelationalTimePtr(record.ClosedAt)
	existing.LastActivityAt = cloneRelationalTimePtr(record.LastActivityAt)
	existing.UpdatedAt = time.Now().UTC()
	if existing.LastActivityAt == nil {
		existing.LastActivityAt = cloneRelationalTimePtr(&existing.UpdatedAt)
	}
	if err := updateScopedModelByID(ctx, s.tx, &existing, existing.TenantID, existing.OrgID, existing.ID); err != nil {
		return stores.AgreementReviewRecord{}, err
	}
	return existing, nil
}

func (s *relationalTxStore) ReplaceAgreementReviewParticipants(ctx context.Context, scope stores.Scope, reviewID string, records []stores.AgreementReviewParticipantRecord) error {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return err
	}
	reviewID = normalizeRelationalID(reviewID)
	if reviewID == "" {
		return relationalInvalidRecordError("agreement_review_participants", "review_id", "required")
	}
	review, err := loadAgreementReviewByID(ctx, s.tx, scope, reviewID)
	if err != nil {
		return err
	}
	if _, err := s.tx.NewDelete().
		Model((*stores.AgreementReviewParticipantRecord)(nil)).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("review_id = ?", reviewID).
		Exec(ctx); err != nil {
		return err
	}
	for _, record := range records {
		record.ID = normalizeRelationalID(record.ID)
		if record.ID == "" {
			record.ID = uuid.NewString()
		}
		record.TenantID = scope.TenantID
		record.OrgID = scope.OrgID
		record.ReviewID = reviewID
		record.ParticipantType = stores.NormalizeAgreementReviewParticipantType(record.ParticipantType)
		if record.ParticipantType == "" {
			return relationalInvalidRecordError("agreement_review_participants", "participant_type", "unsupported participant type")
		}
		record.RecipientID = normalizeRelationalID(record.RecipientID)
		record.Email = strings.TrimSpace(strings.ToLower(record.Email))
		record.DisplayName = strings.TrimSpace(record.DisplayName)
		switch record.ParticipantType {
		case stores.AgreementReviewParticipantTypeRecipient:
			if record.RecipientID == "" {
				return relationalInvalidRecordError("agreement_review_participants", "recipient_id", "required")
			}
			recipient, err := loadParticipantRecord(ctx, s.tx, scope, review.AgreementID, record.RecipientID)
			if err != nil {
				return err
			}
			if recipient.AgreementID != review.AgreementID {
				return relationalInvalidRecordError("agreement_review_participants", "recipient_id", "recipient must belong to agreement")
			}
			if record.Email == "" {
				record.Email = strings.TrimSpace(strings.ToLower(recipient.Email))
			}
			if record.DisplayName == "" {
				record.DisplayName = strings.TrimSpace(recipient.Name)
			}
		case stores.AgreementReviewParticipantTypeExternal:
			record.RecipientID = ""
			if record.Email == "" {
				return relationalInvalidRecordError("agreement_review_participants", "email", "required")
			}
		}
		record.Role = strings.TrimSpace(record.Role)
		if record.Role == "" {
			record.Role = stores.AgreementReviewParticipantRoleReviewer
		}
		record.DecisionStatus = stores.NormalizeAgreementReviewDecision(record.DecisionStatus)
		if record.DecisionStatus == "" {
			return relationalInvalidRecordError("agreement_review_participants", "decision_status", "unsupported decision status")
		}
		record.DecisionAt = cloneRelationalTimePtr(record.DecisionAt)
		record.CreatedAt = relationalTimeOrNow(record.CreatedAt)
		record.UpdatedAt = relationalTimeOrNow(record.UpdatedAt)
		if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
			return err
		}
	}
	return nil
}

func (s *relationalTxStore) ListAgreementReviewParticipants(ctx context.Context, scope stores.Scope, reviewID string) ([]stores.AgreementReviewParticipantRecord, error) {
	return listAgreementReviewParticipants(ctx, s.tx, scope, reviewID)
}

func (s *relationalTxStore) UpdateAgreementReviewParticipant(ctx context.Context, scope stores.Scope, record stores.AgreementReviewParticipantRecord) (stores.AgreementReviewParticipantRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.AgreementReviewParticipantRecord{}, err
	}
	record.ID = normalizeRelationalID(record.ID)
	if record.ID == "" {
		return stores.AgreementReviewParticipantRecord{}, relationalInvalidRecordError("agreement_review_participants", "id", "required")
	}
	existing := stores.AgreementReviewParticipantRecord{}
	if err := s.tx.NewSelect().
		Model(&existing).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", record.ID).
		Scan(ctx); err != nil {
		return stores.AgreementReviewParticipantRecord{}, mapSQLNotFound(err, "agreement_review_participants", record.ID)
	}
	if normalized := stores.NormalizeAgreementReviewDecision(record.DecisionStatus); normalized != "" {
		existing.DecisionStatus = normalized
	}
	if normalized := stores.NormalizeAgreementReviewParticipantType(record.ParticipantType); normalized != "" {
		existing.ParticipantType = normalized
	}
	existing.CanComment = record.CanComment
	existing.CanApprove = record.CanApprove
	if email := strings.TrimSpace(strings.ToLower(record.Email)); email != "" {
		existing.Email = email
	}
	if displayName := strings.TrimSpace(record.DisplayName); displayName != "" {
		existing.DisplayName = displayName
	}
	existing.DecisionAt = cloneRelationalTimePtr(record.DecisionAt)
	existing.UpdatedAt = time.Now().UTC()
	if err := updateScopedModelByID(ctx, s.tx, &existing, existing.TenantID, existing.OrgID, existing.ID); err != nil {
		return stores.AgreementReviewParticipantRecord{}, err
	}
	return existing, nil
}

func (s *relationalTxStore) CreateAgreementCommentThread(ctx context.Context, scope stores.Scope, record stores.AgreementCommentThreadRecord) (stores.AgreementCommentThreadRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.AgreementCommentThreadRecord{}, err
	}
	record.AgreementID = normalizeRelationalID(record.AgreementID)
	record.ReviewID = normalizeRelationalID(record.ReviewID)
	if record.AgreementID == "" {
		return stores.AgreementCommentThreadRecord{}, relationalInvalidRecordError("agreement_comment_threads", "agreement_id", "required")
	}
	if record.ReviewID == "" {
		return stores.AgreementCommentThreadRecord{}, relationalInvalidRecordError("agreement_comment_threads", "review_id", "required")
	}
	agreement, err := loadAgreementRecord(ctx, s.tx, scope, record.AgreementID)
	if err != nil {
		return stores.AgreementCommentThreadRecord{}, err
	}
	review := stores.AgreementReviewRecord{}
	if err := s.tx.NewSelect().
		Model(&review).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", record.ReviewID).
		Scan(ctx); err != nil {
		return stores.AgreementCommentThreadRecord{}, mapSQLNotFound(err, "agreement_reviews", record.ReviewID)
	}
	if review.AgreementID != record.AgreementID {
		return stores.AgreementCommentThreadRecord{}, relationalInvalidRecordError("agreement_comment_threads", "review_id", "review must belong to agreement")
	}
	record.ID = normalizeRelationalID(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.DocumentID = normalizeRelationalID(record.DocumentID)
	if record.DocumentID == "" {
		record.DocumentID = agreement.DocumentID
	}
	record.Visibility = stores.NormalizeAgreementCommentVisibility(record.Visibility)
	if record.Visibility == "" {
		return stores.AgreementCommentThreadRecord{}, relationalInvalidRecordError("agreement_comment_threads", "visibility", "unsupported visibility")
	}
	record.AnchorType = stores.NormalizeAgreementCommentAnchorType(record.AnchorType)
	if record.AnchorType == "" {
		return stores.AgreementCommentThreadRecord{}, relationalInvalidRecordError("agreement_comment_threads", "anchor_type", "unsupported anchor type")
	}
	record.FieldID = normalizeRelationalID(record.FieldID)
	record.Status = stores.NormalizeAgreementCommentThreadStatus(record.Status)
	if record.Status == "" {
		return stores.AgreementCommentThreadRecord{}, relationalInvalidRecordError("agreement_comment_threads", "status", "unsupported status")
	}
	record.CreatedByType = strings.TrimSpace(record.CreatedByType)
	record.CreatedByID = normalizeRelationalID(record.CreatedByID)
	record.ResolvedByType = strings.TrimSpace(record.ResolvedByType)
	record.ResolvedByID = normalizeRelationalID(record.ResolvedByID)
	record.ResolvedAt = cloneRelationalTimePtr(record.ResolvedAt)
	record.LastActivityAt = cloneRelationalTimePtr(record.LastActivityAt)
	record.CreatedAt = relationalTimeOrNow(record.CreatedAt)
	record.UpdatedAt = relationalTimeOrNow(record.UpdatedAt)
	if record.LastActivityAt == nil {
		record.LastActivityAt = cloneRelationalTimePtr(&record.UpdatedAt)
	}
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return stores.AgreementCommentThreadRecord{}, relationalUniqueConstraintError(err, "agreement_comment_threads", "id")
	}
	return record, nil
}

func (s *relationalTxStore) GetAgreementCommentThread(ctx context.Context, scope stores.Scope, threadID string) (stores.AgreementCommentThreadRecord, error) {
	return loadAgreementCommentThread(ctx, s.tx, scope, threadID)
}

func (s *relationalTxStore) UpdateAgreementCommentThread(ctx context.Context, scope stores.Scope, record stores.AgreementCommentThreadRecord) (stores.AgreementCommentThreadRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.AgreementCommentThreadRecord{}, err
	}
	record.ID = normalizeRelationalID(record.ID)
	if record.ID == "" {
		return stores.AgreementCommentThreadRecord{}, relationalInvalidRecordError("agreement_comment_threads", "id", "required")
	}
	existing, err := loadAgreementCommentThread(ctx, s.tx, scope, record.ID)
	if err != nil {
		return stores.AgreementCommentThreadRecord{}, err
	}
	if normalized := stores.NormalizeAgreementCommentThreadStatus(record.Status); normalized != "" {
		existing.Status = normalized
	}
	if normalized := stores.NormalizeAgreementCommentVisibility(record.Visibility); normalized != "" {
		existing.Visibility = normalized
	}
	existing.ResolvedByType = strings.TrimSpace(record.ResolvedByType)
	existing.ResolvedByID = normalizeRelationalID(record.ResolvedByID)
	existing.ResolvedAt = cloneRelationalTimePtr(record.ResolvedAt)
	existing.LastActivityAt = cloneRelationalTimePtr(record.LastActivityAt)
	existing.UpdatedAt = time.Now().UTC()
	if existing.LastActivityAt == nil {
		existing.LastActivityAt = cloneRelationalTimePtr(&existing.UpdatedAt)
	}
	if err := updateScopedModelByID(ctx, s.tx, &existing, existing.TenantID, existing.OrgID, existing.ID); err != nil {
		return stores.AgreementCommentThreadRecord{}, err
	}
	return existing, nil
}

func (s *relationalTxStore) ListAgreementCommentThreads(ctx context.Context, scope stores.Scope, agreementID string, query stores.AgreementCommentThreadQuery) ([]stores.AgreementCommentThreadRecord, error) {
	return listAgreementCommentThreads(ctx, s.tx, scope, agreementID, query)
}

func (s *relationalTxStore) CreateAgreementCommentMessage(ctx context.Context, scope stores.Scope, record stores.AgreementCommentMessageRecord) (stores.AgreementCommentMessageRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.AgreementCommentMessageRecord{}, err
	}
	record.ThreadID = normalizeRelationalID(record.ThreadID)
	if record.ThreadID == "" {
		return stores.AgreementCommentMessageRecord{}, relationalInvalidRecordError("agreement_comment_messages", "thread_id", "required")
	}
	thread, err := loadAgreementCommentThread(ctx, s.tx, scope, record.ThreadID)
	if err != nil {
		return stores.AgreementCommentMessageRecord{}, err
	}
	record.ID = normalizeRelationalID(record.ID)
	if record.ID == "" {
		record.ID = uuid.NewString()
	}
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.Body = strings.TrimSpace(record.Body)
	if record.Body == "" {
		return stores.AgreementCommentMessageRecord{}, relationalInvalidRecordError("agreement_comment_messages", "body", "required")
	}
	record.MessageKind = stores.NormalizeAgreementCommentMessageKind(record.MessageKind)
	if record.MessageKind == "" {
		return stores.AgreementCommentMessageRecord{}, relationalInvalidRecordError("agreement_comment_messages", "message_kind", "unsupported message kind")
	}
	record.CreatedByType = strings.TrimSpace(record.CreatedByType)
	record.CreatedByID = normalizeRelationalID(record.CreatedByID)
	record.CreatedAt = relationalTimeOrNow(record.CreatedAt)
	if _, err := s.tx.NewInsert().Model(&record).Exec(ctx); err != nil {
		return stores.AgreementCommentMessageRecord{}, relationalUniqueConstraintError(err, "agreement_comment_messages", "id")
	}
	thread.LastActivityAt = cloneRelationalTimePtr(&record.CreatedAt)
	thread.UpdatedAt = record.CreatedAt
	if err := updateScopedModelByID(ctx, s.tx, &thread, thread.TenantID, thread.OrgID, thread.ID); err != nil {
		return stores.AgreementCommentMessageRecord{}, err
	}
	return record, nil
}

func (s *relationalTxStore) ListAgreementCommentMessages(ctx context.Context, scope stores.Scope, threadID string) ([]stores.AgreementCommentMessageRecord, error) {
	return listAgreementCommentMessages(ctx, s.tx, scope, threadID)
}

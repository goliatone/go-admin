package persistence

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/uptrace/bun"
)

func loadAgreementReviewByAgreementID(ctx context.Context, idb bun.IDB, scope stores.Scope, agreementID string) (stores.AgreementReviewRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.AgreementReviewRecord{}, err
	}
	agreementID = strings.TrimSpace(agreementID)
	if agreementID == "" {
		return stores.AgreementReviewRecord{}, relationalInvalidRecordError("agreement_reviews", "agreement_id", "required")
	}
	record := stores.AgreementReviewRecord{}
	err = idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID).
		Scan(ctx)
	if err != nil {
		return stores.AgreementReviewRecord{}, mapSQLNotFound(err, "agreement_reviews", agreementID)
	}
	return record, nil
}

func loadAgreementReviewByID(ctx context.Context, idb bun.IDB, scope stores.Scope, reviewID string) (stores.AgreementReviewRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.AgreementReviewRecord{}, err
	}
	reviewID = strings.TrimSpace(reviewID)
	if reviewID == "" {
		return stores.AgreementReviewRecord{}, relationalInvalidRecordError("agreement_reviews", "id", "required")
	}
	record := stores.AgreementReviewRecord{}
	err = idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", reviewID).
		Scan(ctx)
	if err != nil {
		return stores.AgreementReviewRecord{}, mapSQLNotFound(err, "agreement_reviews", reviewID)
	}
	return record, nil
}

func listAgreementReviewParticipants(ctx context.Context, idb bun.IDB, scope stores.Scope, reviewID string) ([]stores.AgreementReviewParticipantRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	reviewID = strings.TrimSpace(reviewID)
	if reviewID == "" {
		return nil, relationalInvalidRecordError("agreement_review_participants", "review_id", "required")
	}
	records := make([]stores.AgreementReviewParticipantRecord, 0)
	if err := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("review_id = ?", reviewID).
		OrderExpr("created_at ASC, id ASC").
		Scan(ctx); err != nil {
		return nil, err
	}
	return records, nil
}

func loadAgreementCommentThread(ctx context.Context, idb bun.IDB, scope stores.Scope, threadID string) (stores.AgreementCommentThreadRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return stores.AgreementCommentThreadRecord{}, err
	}
	threadID = strings.TrimSpace(threadID)
	if threadID == "" {
		return stores.AgreementCommentThreadRecord{}, relationalInvalidRecordError("agreement_comment_threads", "id", "required")
	}
	record := stores.AgreementCommentThreadRecord{}
	err = idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", threadID).
		Scan(ctx)
	if err != nil {
		return stores.AgreementCommentThreadRecord{}, mapSQLNotFound(err, "agreement_comment_threads", threadID)
	}
	return record, nil
}

func listAgreementCommentThreads(ctx context.Context, idb bun.IDB, scope stores.Scope, agreementID string, query stores.AgreementCommentThreadQuery) ([]stores.AgreementCommentThreadRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	agreementID = strings.TrimSpace(agreementID)
	if agreementID == "" {
		return nil, relationalInvalidRecordError("agreement_comment_threads", "agreement_id", "required")
	}
	records := make([]stores.AgreementCommentThreadRecord, 0)
	sel := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("agreement_id = ?", agreementID)
	if reviewID := strings.TrimSpace(query.ReviewID); reviewID != "" {
		sel = sel.Where("review_id = ?", reviewID)
	}
	if visibility := strings.TrimSpace(query.Visibility); visibility != "" {
		sel = sel.Where("visibility = ?", visibility)
	}
	if status := strings.TrimSpace(query.Status); status != "" {
		sel = sel.Where("status = ?", status)
	}
	if query.SortDesc {
		sel = sel.OrderExpr("created_at DESC, id DESC")
	} else {
		sel = sel.OrderExpr("created_at ASC, id ASC")
	}
	if query.Limit > 0 {
		sel = sel.Limit(query.Limit)
	}
	if query.Offset > 0 {
		sel = sel.Offset(query.Offset)
	}
	if err := sel.Scan(ctx); err != nil {
		return nil, err
	}
	return records, nil
}

func listAgreementCommentMessages(ctx context.Context, idb bun.IDB, scope stores.Scope, threadID string) ([]stores.AgreementCommentMessageRecord, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}
	threadID = strings.TrimSpace(threadID)
	if threadID == "" {
		return nil, relationalInvalidRecordError("agreement_comment_messages", "thread_id", "required")
	}
	records := make([]stores.AgreementCommentMessageRecord, 0)
	if err := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("thread_id = ?", threadID).
		OrderExpr("created_at ASC, id ASC").
		Scan(ctx); err != nil {
		return nil, err
	}
	return records, nil
}

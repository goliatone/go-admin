package persistence

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/uptrace/bun"
)

func loadAgreementReviewByAgreementID(ctx context.Context, idb bun.IDB, scope stores.Scope, agreementID string) (stores.AgreementReviewRecord, error) {
	return relationalLoadRecord[stores.AgreementReviewRecord](
		ctx,
		idb,
		scope,
		"agreement_reviews",
		"agreement_id",
		normalizeRelationalID(agreementID),
	)
}

func loadAgreementReviewByID(ctx context.Context, idb bun.IDB, scope stores.Scope, reviewID string) (stores.AgreementReviewRecord, error) {
	return relationalLoadRecord[stores.AgreementReviewRecord](
		ctx,
		idb,
		scope,
		"agreement_reviews",
		"id",
		normalizeRelationalID(reviewID),
	)
}

func listAgreementReviewParticipants(ctx context.Context, idb bun.IDB, scope stores.Scope, reviewID string) ([]stores.AgreementReviewParticipantRecord, error) {
	return relationalListRequiredRecords[stores.AgreementReviewParticipantRecord](
		ctx,
		idb,
		scope,
		"agreement_review_participants",
		"review_id",
		normalizeRelationalID(reviewID),
		"created_at ASC, id ASC",
	)
}

func loadAgreementCommentThread(ctx context.Context, idb bun.IDB, scope stores.Scope, threadID string) (stores.AgreementCommentThreadRecord, error) {
	return relationalLoadRecord[stores.AgreementCommentThreadRecord](
		ctx,
		idb,
		scope,
		"agreement_comment_threads",
		"id",
		normalizeRelationalID(threadID),
	)
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
	return relationalListRequiredRecords[stores.AgreementCommentMessageRecord](
		ctx,
		idb,
		scope,
		"agreement_comment_messages",
		"thread_id",
		normalizeRelationalID(threadID),
		"created_at ASC, id ASC",
	)
}

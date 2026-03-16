package persistence

import (
	"context"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

func (s *StoreAdapter) CreateAgreementReview(ctx context.Context, scope stores.Scope, record stores.AgreementReviewRecord) (stores.AgreementReviewRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.AgreementReviewRecord, error) {
		return tx.CreateAgreementReview(ctx, scope, record)
	})
}

func (s *StoreAdapter) GetAgreementReviewByAgreementID(ctx context.Context, scope stores.Scope, agreementID string) (stores.AgreementReviewRecord, error) {
	idb, err := requireAdapterIDB(s)
	if err != nil {
		return stores.AgreementReviewRecord{}, err
	}
	return loadAgreementReviewByAgreementID(ctx, idb, scope, agreementID)
}

func (s *StoreAdapter) UpdateAgreementReview(ctx context.Context, scope stores.Scope, record stores.AgreementReviewRecord) (stores.AgreementReviewRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.AgreementReviewRecord, error) {
		return tx.UpdateAgreementReview(ctx, scope, record)
	})
}

func (s *StoreAdapter) ReplaceAgreementReviewParticipants(ctx context.Context, scope stores.Scope, reviewID string, records []stores.AgreementReviewParticipantRecord) error {
	_, err := writeWithTx(ctx, s, func(tx stores.TxStore) (struct{}, error) {
		return struct{}{}, tx.ReplaceAgreementReviewParticipants(ctx, scope, reviewID, records)
	})
	return err
}

func (s *StoreAdapter) ListAgreementReviewParticipants(ctx context.Context, scope stores.Scope, reviewID string) ([]stores.AgreementReviewParticipantRecord, error) {
	idb, err := requireAdapterIDB(s)
	if err != nil {
		return nil, err
	}
	return listAgreementReviewParticipants(ctx, idb, scope, reviewID)
}

func (s *StoreAdapter) UpdateAgreementReviewParticipant(ctx context.Context, scope stores.Scope, record stores.AgreementReviewParticipantRecord) (stores.AgreementReviewParticipantRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.AgreementReviewParticipantRecord, error) {
		return tx.UpdateAgreementReviewParticipant(ctx, scope, record)
	})
}

func (s *StoreAdapter) CreateAgreementCommentThread(ctx context.Context, scope stores.Scope, record stores.AgreementCommentThreadRecord) (stores.AgreementCommentThreadRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.AgreementCommentThreadRecord, error) {
		return tx.CreateAgreementCommentThread(ctx, scope, record)
	})
}

func (s *StoreAdapter) GetAgreementCommentThread(ctx context.Context, scope stores.Scope, threadID string) (stores.AgreementCommentThreadRecord, error) {
	idb, err := requireAdapterIDB(s)
	if err != nil {
		return stores.AgreementCommentThreadRecord{}, err
	}
	return loadAgreementCommentThread(ctx, idb, scope, threadID)
}

func (s *StoreAdapter) UpdateAgreementCommentThread(ctx context.Context, scope stores.Scope, record stores.AgreementCommentThreadRecord) (stores.AgreementCommentThreadRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.AgreementCommentThreadRecord, error) {
		return tx.UpdateAgreementCommentThread(ctx, scope, record)
	})
}

func (s *StoreAdapter) ListAgreementCommentThreads(ctx context.Context, scope stores.Scope, agreementID string, query stores.AgreementCommentThreadQuery) ([]stores.AgreementCommentThreadRecord, error) {
	idb, err := requireAdapterIDB(s)
	if err != nil {
		return nil, err
	}
	return listAgreementCommentThreads(ctx, idb, scope, agreementID, query)
}

func (s *StoreAdapter) CreateAgreementCommentMessage(ctx context.Context, scope stores.Scope, record stores.AgreementCommentMessageRecord) (stores.AgreementCommentMessageRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.AgreementCommentMessageRecord, error) {
		return tx.CreateAgreementCommentMessage(ctx, scope, record)
	})
}

func (s *StoreAdapter) ListAgreementCommentMessages(ctx context.Context, scope stores.Scope, threadID string) ([]stores.AgreementCommentMessageRecord, error) {
	idb, err := requireAdapterIDB(s)
	if err != nil {
		return nil, err
	}
	return listAgreementCommentMessages(ctx, idb, scope, threadID)
}

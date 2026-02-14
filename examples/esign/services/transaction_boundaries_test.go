package services

import (
	"context"
	"errors"
	"testing"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

type txFailingStore struct {
	*stores.InMemoryStore
	withTxCalls int
	err         error
}

func newTxFailingStore(err error) *txFailingStore {
	return &txFailingStore{
		InMemoryStore: stores.NewInMemoryStore(),
		err:           err,
	}
}

func (s *txFailingStore) WithTx(_ context.Context, fn func(tx stores.TxStore) error) error {
	s.withTxCalls++
	if s.err != nil {
		return s.err
	}
	if fn == nil {
		return nil
	}
	return fn(s)
}

func TestAgreementServiceSendUsesTransactionBoundary(t *testing.T) {
	txErr := errors.New("tx sentinel")
	store := newTxFailingStore(txErr)
	svc := NewAgreementService(store)

	_, err := svc.Send(context.Background(), stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}, "agreement-1", SendInput{IdempotencyKey: "send-tx"})
	if !errors.Is(err, txErr) {
		t.Fatalf("expected tx sentinel error, got %v", err)
	}
	if store.withTxCalls != 1 {
		t.Fatalf("expected WithTx called once, got %d", store.withTxCalls)
	}
}

func TestSigningServiceSubmitUsesTransactionBoundary(t *testing.T) {
	txErr := errors.New("tx sentinel")
	store := newTxFailingStore(txErr)
	svc := NewSigningService(store)

	_, err := svc.Submit(context.Background(), stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}, stores.SigningTokenRecord{
		AgreementID: "agreement-1",
		RecipientID: "recipient-1",
	}, SignerSubmitInput{IdempotencyKey: "submit-tx"})
	if !errors.Is(err, txErr) {
		t.Fatalf("expected tx sentinel error, got %v", err)
	}
	if store.withTxCalls != 1 {
		t.Fatalf("expected WithTx called once, got %d", store.withTxCalls)
	}
}

func TestArtifactPipelineGenerateExecutedUsesTransactionBoundary(t *testing.T) {
	txErr := errors.New("tx sentinel")
	store := newTxFailingStore(txErr)
	svc := NewArtifactPipelineService(store, nil)

	_, err := svc.GenerateExecutedArtifact(context.Background(), stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}, "agreement-1", "corr-1")
	if !errors.Is(err, txErr) {
		t.Fatalf("expected tx sentinel error, got %v", err)
	}
	if store.withTxCalls != 1 {
		t.Fatalf("expected WithTx called once, got %d", store.withTxCalls)
	}
}

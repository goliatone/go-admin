package persistence

import (
	"context"
	"fmt"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

func (s *StoreAdapter) Create(ctx context.Context, scope stores.Scope, record stores.DocumentRecord) (stores.DocumentRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.DocumentRecord, error) {
		return tx.Create(ctx, scope, record)
	})
}

func (s *StoreAdapter) Get(ctx context.Context, scope stores.Scope, id string) (stores.DocumentRecord, error) {
	return readWithStore(ctx, s, func(mem *stores.InMemoryStore) (stores.DocumentRecord, error) {
		return mem.Get(ctx, scope, id)
	})
}

func (s *StoreAdapter) List(ctx context.Context, scope stores.Scope, query stores.DocumentQuery) ([]stores.DocumentRecord, error) {
	return readWithStore(ctx, s, func(mem *stores.InMemoryStore) ([]stores.DocumentRecord, error) {
		return mem.List(ctx, scope, query)
	})
}

func (s *StoreAdapter) SaveMetadata(ctx context.Context, scope stores.Scope, id string, patch stores.DocumentMetadataPatch) (stores.DocumentRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.DocumentRecord, error) {
		return tx.SaveMetadata(ctx, scope, id, patch)
	})
}

func (s *StoreAdapter) Delete(ctx context.Context, scope stores.Scope, id string) error {
	_, err := writeWithTx(ctx, s, func(tx stores.TxStore) (struct{}, error) {
		return struct{}{}, tx.Delete(ctx, scope, id)
	})
	return err
}

func (s *StoreAdapter) AcquireDocumentRemediationLease(ctx context.Context, scope stores.Scope, documentID string, input stores.DocumentRemediationLeaseAcquireInput) (stores.DocumentRemediationLeaseClaim, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.DocumentRemediationLeaseClaim, error) {
		return tx.AcquireDocumentRemediationLease(ctx, scope, documentID, input)
	})
}

func (s *StoreAdapter) RenewDocumentRemediationLease(ctx context.Context, scope stores.Scope, documentID string, input stores.DocumentRemediationLeaseRenewInput) (stores.DocumentRemediationLeaseClaim, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.DocumentRemediationLeaseClaim, error) {
		return tx.RenewDocumentRemediationLease(ctx, scope, documentID, input)
	})
}

func (s *StoreAdapter) ReleaseDocumentRemediationLease(ctx context.Context, scope stores.Scope, documentID string, input stores.DocumentRemediationLeaseReleaseInput) error {
	_, err := writeWithTx(ctx, s, func(tx stores.TxStore) (struct{}, error) {
		return struct{}{}, tx.ReleaseDocumentRemediationLease(ctx, scope, documentID, input)
	})
	return err
}

func (s *StoreAdapter) SaveRemediationDispatch(ctx context.Context, scope stores.Scope, record stores.RemediationDispatchRecord) (stores.RemediationDispatchRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.RemediationDispatchRecord, error) {
		return tx.SaveRemediationDispatch(ctx, scope, record)
	})
}

func (s *StoreAdapter) GetRemediationDispatch(ctx context.Context, dispatchID string) (stores.RemediationDispatchRecord, error) {
	return readWithStore(ctx, s, func(mem *stores.InMemoryStore) (stores.RemediationDispatchRecord, error) {
		return mem.GetRemediationDispatch(ctx, dispatchID)
	})
}

func (s *StoreAdapter) GetRemediationDispatchByIdempotencyKey(ctx context.Context, scope stores.Scope, key string) (stores.RemediationDispatchRecord, error) {
	return readWithStore(ctx, s, func(mem *stores.InMemoryStore) (stores.RemediationDispatchRecord, error) {
		return mem.GetRemediationDispatchByIdempotencyKey(ctx, scope, key)
	})
}

func (s *StoreAdapter) CreateDraft(ctx context.Context, scope stores.Scope, record stores.AgreementRecord) (stores.AgreementRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.AgreementRecord, error) {
		return tx.CreateDraft(ctx, scope, record)
	})
}

func (s *StoreAdapter) GetAgreement(ctx context.Context, scope stores.Scope, id string) (stores.AgreementRecord, error) {
	idb, err := requireAdapterIDB(s)
	if err != nil {
		return stores.AgreementRecord{}, err
	}
	return loadAgreementRecord(ctx, idb, scope, id)
}

func (s *StoreAdapter) ListAgreements(ctx context.Context, scope stores.Scope, query stores.AgreementQuery) ([]stores.AgreementRecord, error) {
	idb, err := requireAdapterIDB(s)
	if err != nil {
		return nil, err
	}
	return listAgreementRecords(ctx, idb, scope, query)
}

func (s *StoreAdapter) UpdateDraft(ctx context.Context, scope stores.Scope, id string, patch stores.AgreementDraftPatch, expectedVersion int64) (stores.AgreementRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.AgreementRecord, error) {
		return tx.UpdateDraft(ctx, scope, id, patch, expectedVersion)
	})
}

func (s *StoreAdapter) Transition(ctx context.Context, scope stores.Scope, id string, input stores.AgreementTransitionInput) (stores.AgreementRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.AgreementRecord, error) {
		return tx.Transition(ctx, scope, id, input)
	})
}

func (s *StoreAdapter) UpsertParticipantDraft(ctx context.Context, scope stores.Scope, agreementID string, patch stores.ParticipantDraftPatch, expectedVersion int64) (stores.ParticipantRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.ParticipantRecord, error) {
		return tx.UpsertParticipantDraft(ctx, scope, agreementID, patch, expectedVersion)
	})
}

func (s *StoreAdapter) DeleteParticipantDraft(ctx context.Context, scope stores.Scope, agreementID, participantID string) error {
	_, err := writeWithTx(ctx, s, func(tx stores.TxStore) (struct{}, error) {
		return struct{}{}, tx.DeleteParticipantDraft(ctx, scope, agreementID, participantID)
	})
	return err
}

func (s *StoreAdapter) ListParticipants(ctx context.Context, scope stores.Scope, agreementID string) ([]stores.ParticipantRecord, error) {
	idb, err := requireAdapterIDB(s)
	if err != nil {
		return nil, err
	}
	return listParticipantRecords(ctx, idb, scope, agreementID)
}

func (s *StoreAdapter) UpsertRecipientDraft(ctx context.Context, scope stores.Scope, agreementID string, patch stores.RecipientDraftPatch, expectedVersion int64) (stores.RecipientRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.RecipientRecord, error) {
		return tx.UpsertRecipientDraft(ctx, scope, agreementID, patch, expectedVersion)
	})
}

func (s *StoreAdapter) DeleteRecipientDraft(ctx context.Context, scope stores.Scope, agreementID, recipientID string) error {
	_, err := writeWithTx(ctx, s, func(tx stores.TxStore) (struct{}, error) {
		return struct{}{}, tx.DeleteRecipientDraft(ctx, scope, agreementID, recipientID)
	})
	return err
}

func (s *StoreAdapter) ListRecipients(ctx context.Context, scope stores.Scope, agreementID string) ([]stores.RecipientRecord, error) {
	idb, err := requireAdapterIDB(s)
	if err != nil {
		return nil, err
	}
	return listRecipientRecords(ctx, idb, scope, agreementID)
}

func (s *StoreAdapter) TouchRecipientView(ctx context.Context, scope stores.Scope, agreementID, recipientID string, viewedAt time.Time) (stores.RecipientRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.RecipientRecord, error) {
		return tx.TouchRecipientView(ctx, scope, agreementID, recipientID, viewedAt)
	})
}

func (s *StoreAdapter) CompleteRecipient(ctx context.Context, scope stores.Scope, agreementID, recipientID string, completedAt time.Time, expectedVersion int64) (stores.RecipientRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.RecipientRecord, error) {
		return tx.CompleteRecipient(ctx, scope, agreementID, recipientID, completedAt, expectedVersion)
	})
}

func (s *StoreAdapter) DeclineRecipient(ctx context.Context, scope stores.Scope, agreementID, recipientID, reason string, declinedAt time.Time, expectedVersion int64) (stores.RecipientRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.RecipientRecord, error) {
		return tx.DeclineRecipient(ctx, scope, agreementID, recipientID, reason, declinedAt, expectedVersion)
	})
}

func (s *StoreAdapter) UpsertFieldDefinitionDraft(ctx context.Context, scope stores.Scope, agreementID string, patch stores.FieldDefinitionDraftPatch) (stores.FieldDefinitionRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.FieldDefinitionRecord, error) {
		return tx.UpsertFieldDefinitionDraft(ctx, scope, agreementID, patch)
	})
}

func (s *StoreAdapter) DeleteFieldDefinitionDraft(ctx context.Context, scope stores.Scope, agreementID, fieldDefinitionID string) error {
	_, err := writeWithTx(ctx, s, func(tx stores.TxStore) (struct{}, error) {
		return struct{}{}, tx.DeleteFieldDefinitionDraft(ctx, scope, agreementID, fieldDefinitionID)
	})
	return err
}

func (s *StoreAdapter) ListFieldDefinitions(ctx context.Context, scope stores.Scope, agreementID string) ([]stores.FieldDefinitionRecord, error) {
	idb, err := requireAdapterIDB(s)
	if err != nil {
		return nil, err
	}
	return listFieldDefinitionRecords(ctx, idb, scope, agreementID)
}

func (s *StoreAdapter) UpsertFieldInstanceDraft(ctx context.Context, scope stores.Scope, agreementID string, patch stores.FieldInstanceDraftPatch) (stores.FieldInstanceRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.FieldInstanceRecord, error) {
		return tx.UpsertFieldInstanceDraft(ctx, scope, agreementID, patch)
	})
}

func (s *StoreAdapter) DeleteFieldInstanceDraft(ctx context.Context, scope stores.Scope, agreementID, fieldInstanceID string) error {
	_, err := writeWithTx(ctx, s, func(tx stores.TxStore) (struct{}, error) {
		return struct{}{}, tx.DeleteFieldInstanceDraft(ctx, scope, agreementID, fieldInstanceID)
	})
	return err
}

func (s *StoreAdapter) ListFieldInstances(ctx context.Context, scope stores.Scope, agreementID string) ([]stores.FieldInstanceRecord, error) {
	idb, err := requireAdapterIDB(s)
	if err != nil {
		return nil, err
	}
	return listFieldInstanceRecords(ctx, idb, scope, agreementID)
}

func (s *StoreAdapter) UpsertFieldDraft(ctx context.Context, scope stores.Scope, agreementID string, patch stores.FieldDraftPatch) (stores.FieldRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.FieldRecord, error) {
		return tx.UpsertFieldDraft(ctx, scope, agreementID, patch)
	})
}

func (s *StoreAdapter) DeleteFieldDraft(ctx context.Context, scope stores.Scope, agreementID, fieldID string) error {
	_, err := writeWithTx(ctx, s, func(tx stores.TxStore) (struct{}, error) {
		return struct{}{}, tx.DeleteFieldDraft(ctx, scope, agreementID, fieldID)
	})
	return err
}

func (s *StoreAdapter) ListFields(ctx context.Context, scope stores.Scope, agreementID string) ([]stores.FieldRecord, error) {
	idb, err := requireAdapterIDB(s)
	if err != nil {
		return nil, err
	}
	return listFieldRecords(ctx, idb, scope, agreementID)
}

func (s *StoreAdapter) CreateDraftSession(ctx context.Context, scope stores.Scope, record stores.DraftRecord) (stores.DraftRecord, bool, error) {
	var (
		out    stores.DraftRecord
		replay bool
	)
	err := s.WithTx(ctx, func(tx stores.TxStore) error {
		var innerErr error
		out, replay, innerErr = tx.CreateDraftSession(ctx, scope, record)
		return innerErr
	})
	return out, replay, err
}

func (s *StoreAdapter) GetDraftSession(ctx context.Context, scope stores.Scope, id string) (stores.DraftRecord, error) {
	idb, err := requireAdapterIDB(s)
	if err != nil {
		return stores.DraftRecord{}, err
	}
	return loadDraftRecord(ctx, idb, scope, id)
}

func (s *StoreAdapter) ListDraftSessions(ctx context.Context, scope stores.Scope, query stores.DraftQuery) ([]stores.DraftRecord, string, error) {
	idb, err := requireAdapterIDB(s)
	if err != nil {
		return nil, "", err
	}
	return listDraftRecords(ctx, idb, scope, query)
}

func (s *StoreAdapter) UpdateDraftSession(ctx context.Context, scope stores.Scope, id string, patch stores.DraftPatch, expectedRevision int64) (stores.DraftRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.DraftRecord, error) {
		return tx.UpdateDraftSession(ctx, scope, id, patch, expectedRevision)
	})
}

func (s *StoreAdapter) DeleteDraftSession(ctx context.Context, scope stores.Scope, id string) error {
	_, err := writeWithTx(ctx, s, func(tx stores.TxStore) (struct{}, error) {
		return struct{}{}, tx.DeleteDraftSession(ctx, scope, id)
	})
	return err
}

func (s *StoreAdapter) DeleteExpiredDraftSessions(ctx context.Context, before time.Time) (int, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (int, error) {
		return tx.DeleteExpiredDraftSessions(ctx, before)
	})
}

func (s *StoreAdapter) UpsertFieldValue(ctx context.Context, scope stores.Scope, value stores.FieldValueRecord, expectedVersion int64) (stores.FieldValueRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.FieldValueRecord, error) {
		return tx.UpsertFieldValue(ctx, scope, value, expectedVersion)
	})
}

func (s *StoreAdapter) ListFieldValuesByRecipient(ctx context.Context, scope stores.Scope, agreementID, recipientID string) ([]stores.FieldValueRecord, error) {
	return readWithStore(ctx, s, func(mem *stores.InMemoryStore) ([]stores.FieldValueRecord, error) {
		return mem.ListFieldValuesByRecipient(ctx, scope, agreementID, recipientID)
	})
}

func (s *StoreAdapter) CreateSignatureArtifact(ctx context.Context, scope stores.Scope, record stores.SignatureArtifactRecord) (stores.SignatureArtifactRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.SignatureArtifactRecord, error) {
		return tx.CreateSignatureArtifact(ctx, scope, record)
	})
}

func (s *StoreAdapter) GetSignatureArtifact(ctx context.Context, scope stores.Scope, id string) (stores.SignatureArtifactRecord, error) {
	return readWithStore(ctx, s, func(mem *stores.InMemoryStore) (stores.SignatureArtifactRecord, error) {
		return mem.GetSignatureArtifact(ctx, scope, id)
	})
}

func (s *StoreAdapter) UpsertSignerProfile(ctx context.Context, scope stores.Scope, record stores.SignerProfileRecord) (stores.SignerProfileRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.SignerProfileRecord, error) {
		return tx.UpsertSignerProfile(ctx, scope, record)
	})
}

func (s *StoreAdapter) GetSignerProfile(ctx context.Context, scope stores.Scope, subject, key string, now time.Time) (stores.SignerProfileRecord, error) {
	return readWithStore(ctx, s, func(mem *stores.InMemoryStore) (stores.SignerProfileRecord, error) {
		return mem.GetSignerProfile(ctx, scope, subject, key, now)
	})
}

func (s *StoreAdapter) DeleteSignerProfile(ctx context.Context, scope stores.Scope, subject, key string) error {
	_, err := writeWithTx(ctx, s, func(tx stores.TxStore) (struct{}, error) {
		return struct{}{}, tx.DeleteSignerProfile(ctx, scope, subject, key)
	})
	return err
}

func (s *StoreAdapter) CreateSavedSignerSignature(ctx context.Context, scope stores.Scope, record stores.SavedSignerSignatureRecord) (stores.SavedSignerSignatureRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.SavedSignerSignatureRecord, error) {
		return tx.CreateSavedSignerSignature(ctx, scope, record)
	})
}

func (s *StoreAdapter) ListSavedSignerSignatures(ctx context.Context, scope stores.Scope, subject, signatureType string) ([]stores.SavedSignerSignatureRecord, error) {
	return readWithStore(ctx, s, func(mem *stores.InMemoryStore) ([]stores.SavedSignerSignatureRecord, error) {
		return mem.ListSavedSignerSignatures(ctx, scope, subject, signatureType)
	})
}

func (s *StoreAdapter) CountSavedSignerSignatures(ctx context.Context, scope stores.Scope, subject, signatureType string) (int, error) {
	return readWithStore(ctx, s, func(mem *stores.InMemoryStore) (int, error) {
		return mem.CountSavedSignerSignatures(ctx, scope, subject, signatureType)
	})
}

func (s *StoreAdapter) DeleteSavedSignerSignature(ctx context.Context, scope stores.Scope, subject, id string) error {
	_, err := writeWithTx(ctx, s, func(tx stores.TxStore) (struct{}, error) {
		return struct{}{}, tx.DeleteSavedSignerSignature(ctx, scope, subject, id)
	})
	return err
}

func (s *StoreAdapter) CreateSigningToken(ctx context.Context, scope stores.Scope, record stores.SigningTokenRecord) (stores.SigningTokenRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.SigningTokenRecord, error) {
		return tx.CreateSigningToken(ctx, scope, record)
	})
}

func (s *StoreAdapter) GetSigningTokenByHash(ctx context.Context, scope stores.Scope, tokenHash string) (stores.SigningTokenRecord, error) {
	idb, err := requireAdapterIDB(s)
	if err != nil {
		return stores.SigningTokenRecord{}, err
	}
	return loadSigningTokenByHashRecord(ctx, idb, scope, tokenHash)
}

func (s *StoreAdapter) RevokeActiveSigningTokens(ctx context.Context, scope stores.Scope, agreementID, recipientID string, revokedAt time.Time) (int, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (int, error) {
		return tx.RevokeActiveSigningTokens(ctx, scope, agreementID, recipientID, revokedAt)
	})
}

func (s *StoreAdapter) Append(ctx context.Context, scope stores.Scope, event stores.AuditEventRecord) (stores.AuditEventRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.AuditEventRecord, error) {
		return tx.Append(ctx, scope, event)
	})
}

func (s *StoreAdapter) ListForAgreement(ctx context.Context, scope stores.Scope, agreementID string, query stores.AuditEventQuery) ([]stores.AuditEventRecord, error) {
	idb, err := requireAdapterIDB(s)
	if err != nil {
		return nil, err
	}
	return listAuditEventRecords(ctx, idb, scope, agreementID, query)
}

func (s *StoreAdapter) SaveAgreementArtifacts(ctx context.Context, scope stores.Scope, record stores.AgreementArtifactRecord) (stores.AgreementArtifactRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.AgreementArtifactRecord, error) {
		return tx.SaveAgreementArtifacts(ctx, scope, record)
	})
}

func (s *StoreAdapter) GetAgreementArtifacts(ctx context.Context, scope stores.Scope, agreementID string) (stores.AgreementArtifactRecord, error) {
	return readWithStore(ctx, s, func(mem *stores.InMemoryStore) (stores.AgreementArtifactRecord, error) {
		return mem.GetAgreementArtifacts(ctx, scope, agreementID)
	})
}

func (s *StoreAdapter) CreateEmailLog(ctx context.Context, scope stores.Scope, record stores.EmailLogRecord) (stores.EmailLogRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.EmailLogRecord, error) {
		return tx.CreateEmailLog(ctx, scope, record)
	})
}

func (s *StoreAdapter) UpdateEmailLog(ctx context.Context, scope stores.Scope, id string, patch stores.EmailLogRecord) (stores.EmailLogRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.EmailLogRecord, error) {
		return tx.UpdateEmailLog(ctx, scope, id, patch)
	})
}

func (s *StoreAdapter) ListEmailLogs(ctx context.Context, scope stores.Scope, agreementID string) ([]stores.EmailLogRecord, error) {
	idb, err := requireAdapterIDB(s)
	if err != nil {
		return nil, err
	}
	return listEmailLogRecords(ctx, idb, scope, agreementID)
}

func (s *StoreAdapter) BeginJobRun(ctx context.Context, scope stores.Scope, input stores.JobRunInput) (stores.JobRunRecord, bool, error) {
	var (
		out    stores.JobRunRecord
		replay bool
	)
	err := s.WithTx(ctx, func(tx stores.TxStore) error {
		var innerErr error
		out, replay, innerErr = tx.BeginJobRun(ctx, scope, input)
		return innerErr
	})
	return out, replay, err
}

func (s *StoreAdapter) MarkJobRunSucceeded(ctx context.Context, scope stores.Scope, id string, completedAt time.Time) (stores.JobRunRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.JobRunRecord, error) {
		return tx.MarkJobRunSucceeded(ctx, scope, id, completedAt)
	})
}

func (s *StoreAdapter) MarkJobRunFailed(ctx context.Context, scope stores.Scope, id, failureReason string, nextRetryAt *time.Time, failedAt time.Time) (stores.JobRunRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.JobRunRecord, error) {
		return tx.MarkJobRunFailed(ctx, scope, id, failureReason, nextRetryAt, failedAt)
	})
}

func (s *StoreAdapter) GetJobRunByDedupe(ctx context.Context, scope stores.Scope, jobName, dedupeKey string) (stores.JobRunRecord, error) {
	if s == nil || s.repos == nil {
		return stores.JobRunRecord{}, fmt.Errorf("store adapter: store is not configured")
	}
	return getJobRunByDedupeRecord(ctx, s.repos.JobRuns(), scope, jobName, dedupeKey)
}

func (s *StoreAdapter) ListJobRuns(ctx context.Context, scope stores.Scope, agreementID string) ([]stores.JobRunRecord, error) {
	idb, err := requireAdapterIDB(s)
	if err != nil {
		return nil, err
	}
	return listJobRunRecords(ctx, idb, scope, agreementID)
}

func (s *StoreAdapter) BeginGoogleImportRun(ctx context.Context, scope stores.Scope, input stores.GoogleImportRunInput) (stores.GoogleImportRunRecord, bool, error) {
	var (
		out    stores.GoogleImportRunRecord
		replay bool
	)
	err := s.WithTx(ctx, func(tx stores.TxStore) error {
		var innerErr error
		out, replay, innerErr = tx.BeginGoogleImportRun(ctx, scope, input)
		return innerErr
	})
	return out, replay, err
}

func (s *StoreAdapter) MarkGoogleImportRunRunning(ctx context.Context, scope stores.Scope, id string, startedAt time.Time) (stores.GoogleImportRunRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.GoogleImportRunRecord, error) {
		return tx.MarkGoogleImportRunRunning(ctx, scope, id, startedAt)
	})
}

func (s *StoreAdapter) MarkGoogleImportRunSucceeded(ctx context.Context, scope stores.Scope, id string, input stores.GoogleImportRunSuccessInput) (stores.GoogleImportRunRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.GoogleImportRunRecord, error) {
		return tx.MarkGoogleImportRunSucceeded(ctx, scope, id, input)
	})
}

func (s *StoreAdapter) MarkGoogleImportRunFailed(ctx context.Context, scope stores.Scope, id string, input stores.GoogleImportRunFailureInput) (stores.GoogleImportRunRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.GoogleImportRunRecord, error) {
		return tx.MarkGoogleImportRunFailed(ctx, scope, id, input)
	})
}

func (s *StoreAdapter) GetGoogleImportRun(ctx context.Context, scope stores.Scope, id string) (stores.GoogleImportRunRecord, error) {
	return readWithStore(ctx, s, func(mem *stores.InMemoryStore) (stores.GoogleImportRunRecord, error) {
		return mem.GetGoogleImportRun(ctx, scope, id)
	})
}

func (s *StoreAdapter) ListGoogleImportRuns(ctx context.Context, scope stores.Scope, query stores.GoogleImportRunQuery) ([]stores.GoogleImportRunRecord, string, error) {
	mem, err := s.readStore(ctx)
	if err != nil {
		return nil, "", err
	}
	return mem.ListGoogleImportRuns(ctx, scope, query)
}

func (s *StoreAdapter) UpsertAgreementReminderState(ctx context.Context, scope stores.Scope, record stores.AgreementReminderStateRecord) (stores.AgreementReminderStateRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.AgreementReminderStateRecord, error) {
		return tx.UpsertAgreementReminderState(ctx, scope, record)
	})
}

func (s *StoreAdapter) GetAgreementReminderState(ctx context.Context, scope stores.Scope, agreementID, recipientID string) (stores.AgreementReminderStateRecord, error) {
	idb, err := requireAdapterIDB(s)
	if err != nil {
		return stores.AgreementReminderStateRecord{}, err
	}
	return loadAgreementReminderStateRecord(ctx, idb, scope, agreementID, recipientID)
}

func (s *StoreAdapter) ClaimDueAgreementReminders(ctx context.Context, scope stores.Scope, input stores.AgreementReminderClaimInput) ([]stores.AgreementReminderClaim, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) ([]stores.AgreementReminderClaim, error) {
		return tx.ClaimDueAgreementReminders(ctx, scope, input)
	})
}

func (s *StoreAdapter) RenewAgreementReminderLease(ctx context.Context, scope stores.Scope, agreementID, recipientID string, input stores.AgreementReminderLeaseRenewInput) (stores.AgreementReminderClaim, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.AgreementReminderClaim, error) {
		return tx.RenewAgreementReminderLease(ctx, scope, agreementID, recipientID, input)
	})
}

func (s *StoreAdapter) MarkAgreementReminderSent(ctx context.Context, scope stores.Scope, agreementID, recipientID string, input stores.AgreementReminderMarkInput) (stores.AgreementReminderStateRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.AgreementReminderStateRecord, error) {
		return tx.MarkAgreementReminderSent(ctx, scope, agreementID, recipientID, input)
	})
}

func (s *StoreAdapter) MarkAgreementReminderSkipped(ctx context.Context, scope stores.Scope, agreementID, recipientID string, input stores.AgreementReminderMarkInput) (stores.AgreementReminderStateRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.AgreementReminderStateRecord, error) {
		return tx.MarkAgreementReminderSkipped(ctx, scope, agreementID, recipientID, input)
	})
}

func (s *StoreAdapter) MarkAgreementReminderFailed(ctx context.Context, scope stores.Scope, agreementID, recipientID string, input stores.AgreementReminderMarkInput) (stores.AgreementReminderStateRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.AgreementReminderStateRecord, error) {
		return tx.MarkAgreementReminderFailed(ctx, scope, agreementID, recipientID, input)
	})
}

func (s *StoreAdapter) PauseAgreementReminder(ctx context.Context, scope stores.Scope, agreementID, recipientID string, pausedAt time.Time) (stores.AgreementReminderStateRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.AgreementReminderStateRecord, error) {
		return tx.PauseAgreementReminder(ctx, scope, agreementID, recipientID, pausedAt)
	})
}

func (s *StoreAdapter) ResumeAgreementReminder(ctx context.Context, scope stores.Scope, agreementID, recipientID string, resumedAt time.Time, nextDueAt *time.Time) (stores.AgreementReminderStateRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.AgreementReminderStateRecord, error) {
		return tx.ResumeAgreementReminder(ctx, scope, agreementID, recipientID, resumedAt, nextDueAt)
	})
}

func (s *StoreAdapter) CleanupAgreementReminderInternalErrors(ctx context.Context, scope stores.Scope, now time.Time, limit int) (int, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (int, error) {
		return tx.CleanupAgreementReminderInternalErrors(ctx, scope, now, limit)
	})
}

func (s *StoreAdapter) EnqueueOutboxMessage(ctx context.Context, scope stores.Scope, record stores.OutboxMessageRecord) (stores.OutboxMessageRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.OutboxMessageRecord, error) {
		return tx.EnqueueOutboxMessage(ctx, scope, record)
	})
}

func (s *StoreAdapter) ClaimOutboxMessages(ctx context.Context, scope stores.Scope, input stores.OutboxClaimInput) ([]stores.OutboxMessageRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) ([]stores.OutboxMessageRecord, error) {
		return tx.ClaimOutboxMessages(ctx, scope, input)
	})
}

func (s *StoreAdapter) MarkOutboxMessageSucceeded(ctx context.Context, scope stores.Scope, id string, publishedAt time.Time) (stores.OutboxMessageRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.OutboxMessageRecord, error) {
		return tx.MarkOutboxMessageSucceeded(ctx, scope, id, publishedAt)
	})
}

func (s *StoreAdapter) MarkOutboxMessageFailed(ctx context.Context, scope stores.Scope, id, failureReason string, nextAttemptAt *time.Time, failedAt time.Time) (stores.OutboxMessageRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.OutboxMessageRecord, error) {
		return tx.MarkOutboxMessageFailed(ctx, scope, id, failureReason, nextAttemptAt, failedAt)
	})
}

func (s *StoreAdapter) ListOutboxMessages(ctx context.Context, scope stores.Scope, query stores.OutboxQuery) ([]stores.OutboxMessageRecord, error) {
	return readWithStore(ctx, s, func(mem *stores.InMemoryStore) ([]stores.OutboxMessageRecord, error) {
		return mem.ListOutboxMessages(ctx, scope, query)
	})
}

func (s *StoreAdapter) UpsertIntegrationCredential(ctx context.Context, scope stores.Scope, record stores.IntegrationCredentialRecord) (stores.IntegrationCredentialRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.IntegrationCredentialRecord, error) {
		return tx.UpsertIntegrationCredential(ctx, scope, record)
	})
}

func (s *StoreAdapter) GetIntegrationCredential(ctx context.Context, scope stores.Scope, provider, userID string) (stores.IntegrationCredentialRecord, error) {
	return readWithStore(ctx, s, func(mem *stores.InMemoryStore) (stores.IntegrationCredentialRecord, error) {
		return mem.GetIntegrationCredential(ctx, scope, provider, userID)
	})
}

func (s *StoreAdapter) DeleteIntegrationCredential(ctx context.Context, scope stores.Scope, provider, userID string) error {
	_, err := writeWithTx(ctx, s, func(tx stores.TxStore) (struct{}, error) {
		return struct{}{}, tx.DeleteIntegrationCredential(ctx, scope, provider, userID)
	})
	return err
}

func (s *StoreAdapter) ListIntegrationCredentials(ctx context.Context, scope stores.Scope, provider string, baseUserIDPrefix string) ([]stores.IntegrationCredentialRecord, error) {
	return readWithStore(ctx, s, func(mem *stores.InMemoryStore) ([]stores.IntegrationCredentialRecord, error) {
		return mem.ListIntegrationCredentials(ctx, scope, provider, baseUserIDPrefix)
	})
}

func (s *StoreAdapter) UpsertMappingSpec(ctx context.Context, scope stores.Scope, record stores.MappingSpecRecord) (stores.MappingSpecRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.MappingSpecRecord, error) {
		return tx.UpsertMappingSpec(ctx, scope, record)
	})
}

func (s *StoreAdapter) GetMappingSpec(ctx context.Context, scope stores.Scope, id string) (stores.MappingSpecRecord, error) {
	return readWithStore(ctx, s, func(mem *stores.InMemoryStore) (stores.MappingSpecRecord, error) {
		return mem.GetMappingSpec(ctx, scope, id)
	})
}

func (s *StoreAdapter) ListMappingSpecs(ctx context.Context, scope stores.Scope, provider string) ([]stores.MappingSpecRecord, error) {
	return readWithStore(ctx, s, func(mem *stores.InMemoryStore) ([]stores.MappingSpecRecord, error) {
		return mem.ListMappingSpecs(ctx, scope, provider)
	})
}

func (s *StoreAdapter) PublishMappingSpec(ctx context.Context, scope stores.Scope, id string, expectedVersion int64, publishedAt time.Time) (stores.MappingSpecRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.MappingSpecRecord, error) {
		return tx.PublishMappingSpec(ctx, scope, id, expectedVersion, publishedAt)
	})
}

func (s *StoreAdapter) UpsertIntegrationBinding(ctx context.Context, scope stores.Scope, record stores.IntegrationBindingRecord) (stores.IntegrationBindingRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.IntegrationBindingRecord, error) {
		return tx.UpsertIntegrationBinding(ctx, scope, record)
	})
}

func (s *StoreAdapter) GetIntegrationBindingByExternal(ctx context.Context, scope stores.Scope, provider, entityKind, externalID string) (stores.IntegrationBindingRecord, error) {
	return readWithStore(ctx, s, func(mem *stores.InMemoryStore) (stores.IntegrationBindingRecord, error) {
		return mem.GetIntegrationBindingByExternal(ctx, scope, provider, entityKind, externalID)
	})
}

func (s *StoreAdapter) ListIntegrationBindings(ctx context.Context, scope stores.Scope, provider, entityKind, internalID string) ([]stores.IntegrationBindingRecord, error) {
	return readWithStore(ctx, s, func(mem *stores.InMemoryStore) ([]stores.IntegrationBindingRecord, error) {
		return mem.ListIntegrationBindings(ctx, scope, provider, entityKind, internalID)
	})
}

func (s *StoreAdapter) CreateIntegrationSyncRun(ctx context.Context, scope stores.Scope, record stores.IntegrationSyncRunRecord) (stores.IntegrationSyncRunRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.IntegrationSyncRunRecord, error) {
		return tx.CreateIntegrationSyncRun(ctx, scope, record)
	})
}

func (s *StoreAdapter) UpdateIntegrationSyncRunStatus(ctx context.Context, scope stores.Scope, id, status, lastError, cursor string, completedAt *time.Time, expectedVersion int64) (stores.IntegrationSyncRunRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.IntegrationSyncRunRecord, error) {
		return tx.UpdateIntegrationSyncRunStatus(ctx, scope, id, status, lastError, cursor, completedAt, expectedVersion)
	})
}

func (s *StoreAdapter) GetIntegrationSyncRun(ctx context.Context, scope stores.Scope, id string) (stores.IntegrationSyncRunRecord, error) {
	return readWithStore(ctx, s, func(mem *stores.InMemoryStore) (stores.IntegrationSyncRunRecord, error) {
		return mem.GetIntegrationSyncRun(ctx, scope, id)
	})
}

func (s *StoreAdapter) ListIntegrationSyncRuns(ctx context.Context, scope stores.Scope, provider string) ([]stores.IntegrationSyncRunRecord, error) {
	return readWithStore(ctx, s, func(mem *stores.InMemoryStore) ([]stores.IntegrationSyncRunRecord, error) {
		return mem.ListIntegrationSyncRuns(ctx, scope, provider)
	})
}

func (s *StoreAdapter) UpsertIntegrationCheckpoint(ctx context.Context, scope stores.Scope, record stores.IntegrationCheckpointRecord) (stores.IntegrationCheckpointRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.IntegrationCheckpointRecord, error) {
		return tx.UpsertIntegrationCheckpoint(ctx, scope, record)
	})
}

func (s *StoreAdapter) ListIntegrationCheckpoints(ctx context.Context, scope stores.Scope, runID string) ([]stores.IntegrationCheckpointRecord, error) {
	return readWithStore(ctx, s, func(mem *stores.InMemoryStore) ([]stores.IntegrationCheckpointRecord, error) {
		return mem.ListIntegrationCheckpoints(ctx, scope, runID)
	})
}

func (s *StoreAdapter) CreateIntegrationConflict(ctx context.Context, scope stores.Scope, record stores.IntegrationConflictRecord) (stores.IntegrationConflictRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.IntegrationConflictRecord, error) {
		return tx.CreateIntegrationConflict(ctx, scope, record)
	})
}

func (s *StoreAdapter) GetIntegrationConflict(ctx context.Context, scope stores.Scope, id string) (stores.IntegrationConflictRecord, error) {
	return readWithStore(ctx, s, func(mem *stores.InMemoryStore) (stores.IntegrationConflictRecord, error) {
		return mem.GetIntegrationConflict(ctx, scope, id)
	})
}

func (s *StoreAdapter) ListIntegrationConflicts(ctx context.Context, scope stores.Scope, runID, status string) ([]stores.IntegrationConflictRecord, error) {
	return readWithStore(ctx, s, func(mem *stores.InMemoryStore) ([]stores.IntegrationConflictRecord, error) {
		return mem.ListIntegrationConflicts(ctx, scope, runID, status)
	})
}

func (s *StoreAdapter) ResolveIntegrationConflict(ctx context.Context, scope stores.Scope, id, status, resolutionJSON, resolvedByUserID string, resolvedAt time.Time, expectedVersion int64) (stores.IntegrationConflictRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.IntegrationConflictRecord, error) {
		return tx.ResolveIntegrationConflict(ctx, scope, id, status, resolutionJSON, resolvedByUserID, resolvedAt, expectedVersion)
	})
}

func (s *StoreAdapter) AppendIntegrationChangeEvent(ctx context.Context, scope stores.Scope, record stores.IntegrationChangeEventRecord) (stores.IntegrationChangeEventRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.IntegrationChangeEventRecord, error) {
		return tx.AppendIntegrationChangeEvent(ctx, scope, record)
	})
}

func (s *StoreAdapter) ListIntegrationChangeEvents(ctx context.Context, scope stores.Scope, agreementID string) ([]stores.IntegrationChangeEventRecord, error) {
	return readWithStore(ctx, s, func(mem *stores.InMemoryStore) ([]stores.IntegrationChangeEventRecord, error) {
		return mem.ListIntegrationChangeEvents(ctx, scope, agreementID)
	})
}

func (s *StoreAdapter) ClaimIntegrationMutation(ctx context.Context, scope stores.Scope, idempotencyKey string, firstSeenAt time.Time) (bool, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (bool, error) {
		return tx.ClaimIntegrationMutation(ctx, scope, idempotencyKey, firstSeenAt)
	})
}

func (s *StoreAdapter) UpsertPlacementRun(ctx context.Context, scope stores.Scope, record stores.PlacementRunRecord) (stores.PlacementRunRecord, error) {
	return writeWithTx(ctx, s, func(tx stores.TxStore) (stores.PlacementRunRecord, error) {
		return tx.UpsertPlacementRun(ctx, scope, record)
	})
}

func (s *StoreAdapter) GetPlacementRun(ctx context.Context, scope stores.Scope, agreementID, runID string) (stores.PlacementRunRecord, error) {
	return readWithStore(ctx, s, func(mem *stores.InMemoryStore) (stores.PlacementRunRecord, error) {
		return mem.GetPlacementRun(ctx, scope, agreementID, runID)
	})
}

func (s *StoreAdapter) ListPlacementRuns(ctx context.Context, scope stores.Scope, agreementID string) ([]stores.PlacementRunRecord, error) {
	return readWithStore(ctx, s, func(mem *stores.InMemoryStore) ([]stores.PlacementRunRecord, error) {
		return mem.ListPlacementRuns(ctx, scope, agreementID)
	})
}

package persistence

import (
	"context"
	"path/filepath"
	"strings"
	"testing"
	"time"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/google/uuid"
)

func runRuntimeAdapterBackends(t *testing.T, fn func(t *testing.T, store *StoreAdapter)) {
	t.Helper()

	t.Run("sqlite", func(t *testing.T) {
		store, cleanup := newRuntimeSQLiteAdapter(t)
		defer cleanup()
		fn(t, store)
	})

	t.Run("postgres", func(t *testing.T) {
		store, cleanup := newRuntimePostgresAdapter(t)
		defer cleanup()
		fn(t, store)
	})
}

func newRuntimeSQLiteAdapter(t *testing.T) (*StoreAdapter, func()) {
	t.Helper()
	cfg := appcfg.Defaults()
	cfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectSQLite
	cfg.Persistence.Migrations.LocalOnly = true
	cfg.Persistence.SQLite.DSN = "file:" + filepath.Join(t.TempDir(), "runtime-relational-service.db") + "?_busy_timeout=5000&_foreign_keys=on"
	cfg.Persistence.Postgres.DSN = ""

	bootstrap, err := Bootstrap(context.Background(), cfg)
	if err != nil {
		t.Fatalf("Bootstrap sqlite: %v", err)
	}
	return newRuntimeStoreAdapterFromBootstrap(t, bootstrap)
}

func newRuntimePostgresAdapter(t *testing.T) (*StoreAdapter, func()) {
	t.Helper()
	cfg := appcfg.Defaults()
	cfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectPostgres
	cfg.Persistence.Postgres.DSN = requirePostgresTestDSN(t)
	cfg.Persistence.SQLite.DSN = ""

	bootstrap, err := Bootstrap(context.Background(), cfg)
	if err != nil {
		t.Fatalf("Bootstrap postgres: %v", err)
	}
	return newRuntimeStoreAdapterFromBootstrap(t, bootstrap)
}

func newRuntimeStoreAdapterFromBootstrap(t *testing.T, bootstrap *BootstrapResult) (*StoreAdapter, func()) {
	t.Helper()
	adapter, cleanup, err := NewStoreAdapter(bootstrap)
	if err != nil {
		_ = bootstrap.Close()
		t.Fatalf("NewStoreAdapter: %v", err)
	}
	return adapter, func() {
		if cleanup != nil {
			_ = cleanup()
		}
		_ = bootstrap.Close()
	}
}

func runtimeScope() stores.Scope {
	suffix := strings.ToLower(strings.ReplaceAll(uuid.NewString(), "-", ""))
	return stores.Scope{
		TenantID: "tenant-" + suffix[:12],
		OrgID:    "org-" + suffix[12:24],
	}
}

func createRuntimeDocument(t *testing.T, ctx context.Context, store *StoreAdapter, scope stores.Scope, suffix string) stores.DocumentRecord {
	t.Helper()
	record, err := store.Create(ctx, scope, stores.DocumentRecord{
		ID:                 "doc-" + suffix,
		Title:              "Runtime Agreement",
		CreatedByUserID:    "user-" + suffix,
		SourceObjectKey:    "tenant/" + scope.TenantID + "/org/" + scope.OrgID + "/docs/doc-" + suffix + ".pdf",
		SourceOriginalName: "source.pdf",
		SourceSHA256:       strings.Repeat("a", 64),
	})
	if err != nil {
		t.Fatalf("Create document: %v", err)
	}
	if _, err := store.SaveMetadata(ctx, scope, record.ID, stores.DocumentMetadataPatch{PageCount: 2}); err != nil {
		t.Fatalf("SaveMetadata: %v", err)
	}
	return record
}

func setupRuntimeAgreementForSend(t *testing.T, ctx context.Context, store *StoreAdapter, now time.Time) (stores.Scope, services.AgreementService, stores.AgreementRecord, stores.RecipientRecord) {
	t.Helper()
	scope := runtimeScope()
	suffix := strings.ToLower(strings.ReplaceAll(uuid.NewString(), "-", ""))[:12]
	document := createRuntimeDocument(t, ctx, store, scope, suffix)
	agreementSvc := services.NewAgreementService(
		store,
		services.WithAgreementClock(func() time.Time { return now }),
		services.WithAgreementReminderStore(store),
	)
	agreement, err := agreementSvc.CreateDraft(ctx, scope, services.CreateDraftInput{
		DocumentID:      document.ID,
		Title:           "Runtime Send",
		Message:         "Please sign",
		CreatedByUserID: "user-" + suffix,
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}
	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        stringPtr("signer-" + suffix + "@example.com"),
		Name:         stringPtr("Signer " + suffix),
		Role:         stringPtr(stores.RecipientRoleSigner),
		SigningOrder: intPtr(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft: %v", err)
	}
	if _, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        stringPtr(stores.FieldTypeSignature),
		PageNumber:  intPtr(1),
		Required:    boolPtr(true),
	}); err != nil {
		t.Fatalf("UpsertFieldDraft: %v", err)
	}
	return scope, agreementSvc, agreement, signer
}

func TestRuntimeRelationalAgreementSendAndReminderState(t *testing.T) {
	runRuntimeAdapterBackends(t, func(t *testing.T, store *StoreAdapter) {
		cfg := appcfg.Defaults()
		cfg.Reminders.Enabled = true
		cfg.Reminders.InitialDelayMinutes = 30
		cfg.Reminders.IntervalMinutes = 60
		cfg.Reminders.ManualResendCooldownMinutes = 180
		appcfg.SetActive(cfg)
		t.Cleanup(appcfg.ResetActive)

		ctx := context.Background()
		now := time.Date(2026, 3, 10, 16, 0, 0, 0, time.UTC)
		scope, agreementSvc, agreement, signer := setupRuntimeAgreementForSend(t, ctx, store, now)

		sent, err := agreementSvc.Send(ctx, scope, agreement.ID, services.SendInput{IdempotencyKey: "send-" + signer.ID})
		if err != nil {
			t.Fatalf("Send: %v", err)
		}
		if sent.Status != stores.AgreementStatusSent {
			t.Fatalf("expected sent agreement status, got %q", sent.Status)
		}

		state, err := store.GetAgreementReminderState(ctx, scope, sent.ID, signer.ID)
		if err != nil {
			t.Fatalf("GetAgreementReminderState after send: %v", err)
		}
		if state.Status != stores.AgreementReminderStatusActive {
			t.Fatalf("expected active reminder state, got %q", state.Status)
		}
		if state.NextDueAt == nil {
			t.Fatal("expected next_due_at after send")
		}
		if strings.TrimSpace(state.PolicyVersion) == "" {
			t.Fatal("expected policy_version after send")
		}

		if _, err := agreementSvc.Resend(ctx, scope, sent.ID, services.ResendInput{
			RecipientID:    signer.ID,
			IdempotencyKey: "manual-resend-" + signer.ID,
			Source:         services.ResendSourceManual,
		}); err != nil {
			t.Fatalf("Resend: %v", err)
		}

		state, err = store.GetAgreementReminderState(ctx, scope, sent.ID, signer.ID)
		if err != nil {
			t.Fatalf("GetAgreementReminderState after resend: %v", err)
		}
		if state.LastManualResendAt == nil {
			t.Fatal("expected last_manual_resend_at after resend")
		}
		if state.LastReasonCode != "manual_resend" {
			t.Fatalf("expected manual_resend reason, got %q", state.LastReasonCode)
		}
		if state.NextDueAt == nil || !state.NextDueAt.After(now) {
			t.Fatalf("expected resend cooldown next_due_at after %s, got %+v", now.Format(time.RFC3339), state.NextDueAt)
		}
	})
}

func TestRuntimeRelationalReminderSweep(t *testing.T) {
	runRuntimeAdapterBackends(t, func(t *testing.T, store *StoreAdapter) {
		cfg := appcfg.Defaults()
		cfg.Reminders.Enabled = true
		cfg.Reminders.BatchSize = 10
		cfg.Reminders.ClaimLeaseSeconds = 120
		cfg.Reminders.IntervalMinutes = 60
		cfg.Reminders.InitialDelayMinutes = 30
		cfg.Reminders.MaxReminders = 6
		cfg.Reminders.JitterPercent = 0
		appcfg.SetActive(cfg)
		t.Cleanup(appcfg.ResetActive)

		ctx := context.Background()
		now := time.Date(2026, 3, 10, 18, 0, 0, 0, time.UTC)
		scope, agreementSvc, agreement, signer := setupRuntimeAgreementForSend(t, ctx, store, now.Add(-2*time.Hour))

		sent, err := agreementSvc.Send(ctx, scope, agreement.ID, services.SendInput{IdempotencyKey: "sweep-send-" + signer.ID})
		if err != nil {
			t.Fatalf("Send: %v", err)
		}
		state, err := store.GetAgreementReminderState(ctx, scope, sent.ID, signer.ID)
		if err != nil {
			t.Fatalf("GetAgreementReminderState: %v", err)
		}
		state.SentCount = 1
		state.FirstSentAt = cloneRelationalTimePtr(&now)
		lastSentAt := now.Add(-90 * time.Minute)
		nextDueAt := now.Add(-time.Minute)
		state.LastSentAt = cloneRelationalTimePtr(&lastSentAt)
		state.NextDueAt = cloneRelationalTimePtr(&nextDueAt)
		state.UpdatedAt = now.Add(-90 * time.Minute)
		if _, err := store.UpsertAgreementReminderState(ctx, scope, state); err != nil {
			t.Fatalf("UpsertAgreementReminderState: %v", err)
		}

		agreements := services.NewAgreementService(
			store,
			services.WithAgreementClock(func() time.Time { return now }),
			services.WithAgreementReminderStore(store),
		)
		reminders := services.NewAgreementReminderService(
			store,
			agreements,
			services.WithAgreementReminderClock(func() time.Time { return now }),
			services.WithAgreementReminderWorkerID("runtime-reminder-worker"),
		)

		result, err := reminders.Sweep(ctx, scope)
		if err != nil {
			t.Fatalf("Sweep: %v", err)
		}
		if result.Claimed != 1 || result.Sent != 1 {
			t.Fatalf("expected claimed=1 sent=1, got %+v", result)
		}

		state, err = store.GetAgreementReminderState(ctx, scope, sent.ID, signer.ID)
		if err != nil {
			t.Fatalf("GetAgreementReminderState after sweep: %v", err)
		}
		if state.SentCount != 2 {
			t.Fatalf("expected sent_count=2, got %d", state.SentCount)
		}
		if state.LastSentAt == nil || !state.LastSentAt.Equal(now) {
			t.Fatalf("expected last_sent_at=%s, got %+v", now.Format(time.RFC3339Nano), state.LastSentAt)
		}
	})
}

func TestRuntimeRelationalSigningSubmitFinalState(t *testing.T) {
	runRuntimeAdapterBackends(t, func(t *testing.T, store *StoreAdapter) {
		ctx := context.Background()
		now := time.Date(2026, 3, 10, 20, 0, 0, 0, time.UTC)
		scope := runtimeScope()
		suffix := strings.ToLower(strings.ReplaceAll(uuid.NewString(), "-", ""))[:12]
		document := createRuntimeDocument(t, ctx, store, scope, suffix)
		agreementSvc := services.NewAgreementService(
			store,
			services.WithAgreementClock(func() time.Time { return now }),
			services.WithAgreementReminderStore(store),
		)
		agreement, err := agreementSvc.CreateDraft(ctx, scope, services.CreateDraftInput{
			DocumentID:      document.ID,
			Title:           "Runtime Signing",
			CreatedByUserID: "user-" + suffix,
		})
		if err != nil {
			t.Fatalf("CreateDraft: %v", err)
		}
		signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
			Email:        stringPtr("signer-" + suffix + "@example.com"),
			Role:         stringPtr(stores.RecipientRoleSigner),
			SigningOrder: intPtr(1),
		}, 0)
		if err != nil {
			t.Fatalf("UpsertRecipientDraft: %v", err)
		}
		signatureField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
			RecipientID: &signer.ID,
			Type:        stringPtr(stores.FieldTypeSignature),
			PageNumber:  intPtr(1),
			Required:    boolPtr(true),
		})
		if err != nil {
			t.Fatalf("UpsertFieldDraft signature: %v", err)
		}
		textField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
			RecipientID: &signer.ID,
			Type:        stringPtr(stores.FieldTypeText),
			PageNumber:  intPtr(1),
			Required:    boolPtr(true),
		})
		if err != nil {
			t.Fatalf("UpsertFieldDraft text: %v", err)
		}
		if _, err := agreementSvc.Send(ctx, scope, agreement.ID, services.SendInput{IdempotencyKey: "signing-send-" + signer.ID}); err != nil {
			t.Fatalf("Send: %v", err)
		}

		signingSvc := services.NewSigningService(store, services.WithSigningClock(func() time.Time { return now }))
		token := stores.SigningTokenRecord{AgreementID: agreement.ID, RecipientID: signer.ID}
		if _, err := signingSvc.CaptureConsent(ctx, scope, token, services.SignerConsentInput{Accepted: true}); err != nil {
			t.Fatalf("CaptureConsent: %v", err)
		}
		if _, err := signingSvc.AttachSignatureArtifact(ctx, scope, token, services.SignerSignatureInput{
			FieldID:   signatureField.ID,
			Type:      "typed",
			ObjectKey: "tenant/" + scope.TenantID + "/org/" + scope.OrgID + "/signatures/" + signer.ID + ".png",
			SHA256:    strings.Repeat("c", 64),
			ValueText: "Runtime Signer",
		}); err != nil {
			t.Fatalf("AttachSignatureArtifact: %v", err)
		}
		if _, err := signingSvc.UpsertFieldValue(ctx, scope, token, services.SignerFieldValueInput{
			FieldID:   textField.ID,
			ValueText: "Runtime Signer",
		}); err != nil {
			t.Fatalf("UpsertFieldValue: %v", err)
		}

		result, err := signingSvc.Submit(ctx, scope, token, services.SignerSubmitInput{IdempotencyKey: "submit-" + signer.ID})
		if err != nil {
			t.Fatalf("Submit: %v", err)
		}
		if !result.Completed || result.Agreement.Status != stores.AgreementStatusCompleted {
			t.Fatalf("expected completed agreement, got %+v", result)
		}
		if result.Recipient.CompletedAt == nil {
			t.Fatal("expected recipient completed_at")
		}

		reloadedAgreement, err := store.GetAgreement(ctx, scope, agreement.ID)
		if err != nil {
			t.Fatalf("GetAgreement: %v", err)
		}
		if reloadedAgreement.Status != stores.AgreementStatusCompleted {
			t.Fatalf("expected stored completed status, got %q", reloadedAgreement.Status)
		}
		recipients, err := store.ListRecipients(ctx, scope, agreement.ID)
		if err != nil {
			t.Fatalf("ListRecipients: %v", err)
		}
		if len(recipients) != 1 || recipients[0].CompletedAt == nil {
			t.Fatalf("expected completed recipient in store, got %+v", recipients)
		}
	})
}

func TestRuntimeRelationalOutboxLifecycle(t *testing.T) {
	runRuntimeAdapterBackends(t, func(t *testing.T, store *StoreAdapter) {
		ctx := context.Background()
		now := time.Date(2026, 3, 10, 21, 0, 0, 0, time.UTC)
		scope := runtimeScope()

		message, err := store.EnqueueOutboxMessage(ctx, scope, stores.OutboxMessageRecord{
			ID:            "outbox-" + strings.ToLower(strings.ReplaceAll(uuid.NewString(), "-", ""))[:12],
			Topic:         "agreement.sent",
			PayloadJSON:   `{"agreement_id":"agreement-1"}`,
			CorrelationID: "corr-1",
			CreatedAt:     now,
			UpdatedAt:     now,
			AvailableAt:   now,
		})
		if err != nil {
			t.Fatalf("EnqueueOutboxMessage: %v", err)
		}

		claimed, err := store.ClaimOutboxMessages(ctx, scope, stores.OutboxClaimInput{
			Consumer: "worker-a",
			Now:      now.Add(time.Minute),
			Limit:    10,
		})
		if err != nil {
			t.Fatalf("ClaimOutboxMessages first: %v", err)
		}
		if len(claimed) != 1 || claimed[0].Status != stores.OutboxMessageStatusProcessing {
			t.Fatalf("expected one processing claim, got %+v", claimed)
		}

		retryAt := now.Add(5 * time.Minute)
		failed, err := store.MarkOutboxMessageFailed(ctx, scope, message.ID, "provider timeout", &retryAt, now.Add(2*time.Minute))
		if err != nil {
			t.Fatalf("MarkOutboxMessageFailed: %v", err)
		}
		if failed.Status != stores.OutboxMessageStatusRetrying || !failed.AvailableAt.Equal(retryAt) {
			t.Fatalf("expected retrying outbox message, got %+v", failed)
		}

		claimed, err = store.ClaimOutboxMessages(ctx, scope, stores.OutboxClaimInput{
			Consumer: "worker-a",
			Now:      now.Add(6 * time.Minute),
			Limit:    10,
		})
		if err != nil {
			t.Fatalf("ClaimOutboxMessages second: %v", err)
		}
		if len(claimed) != 1 || claimed[0].ID != message.ID {
			t.Fatalf("expected retry claim for original message, got %+v", claimed)
		}

		succeeded, err := store.MarkOutboxMessageSucceeded(ctx, scope, message.ID, now.Add(7*time.Minute))
		if err != nil {
			t.Fatalf("MarkOutboxMessageSucceeded: %v", err)
		}
		if succeeded.Status != stores.OutboxMessageStatusSucceeded || succeeded.PublishedAt == nil {
			t.Fatalf("expected succeeded outbox message, got %+v", succeeded)
		}
	})
}

func TestRuntimeRelationalAuxiliaryWriteSurfaces(t *testing.T) {
	runRuntimeAdapterBackends(t, func(t *testing.T, store *StoreAdapter) {
		ctx := context.Background()
		now := time.Date(2026, 3, 11, 0, 0, 0, 0, time.UTC)
		scope := runtimeScope()
		suffix := strings.ToLower(strings.ReplaceAll(uuid.NewString(), "-", ""))[:12]
		document := createRuntimeDocument(t, ctx, store, scope, suffix)

		dispatchID := "dispatch-" + suffix
		googleRunID := ""
		googleFailedRunID := ""

		if err := store.WithTx(ctx, func(tx stores.TxStore) error {
			lease, err := tx.AcquireDocumentRemediationLease(ctx, scope, document.ID, stores.DocumentRemediationLeaseAcquireInput{
				Now:           now,
				TTL:           2 * time.Minute,
				WorkerID:      "worker-a",
				CorrelationID: "corr-a",
			})
			if err != nil {
				return err
			}
			if _, err := tx.SaveRemediationDispatch(ctx, scope, stores.RemediationDispatchRecord{
				DispatchID:     dispatchID,
				DocumentID:     document.ID,
				IdempotencyKey: "idem-" + suffix,
				Mode:           "async",
				MaxAttempts:    1,
				UpdatedAt:      now,
			}); err != nil {
				return err
			}
			if _, err := tx.SaveRemediationDispatch(ctx, scope, stores.RemediationDispatchRecord{
				DispatchID:     dispatchID,
				DocumentID:     document.ID,
				IdempotencyKey: "idem-" + suffix,
				CommandID:      "cmd-" + suffix,
				CorrelationID:  "corr-dispatch",
				Accepted:       true,
				MaxAttempts:    3,
				EnqueuedAt:     &now,
				UpdatedAt:      now.Add(time.Minute),
			}); err != nil {
				return err
			}
			renewed, err := tx.RenewDocumentRemediationLease(ctx, scope, document.ID, stores.DocumentRemediationLeaseRenewInput{
				Now:   now.Add(30 * time.Second),
				TTL:   2 * time.Minute,
				Lease: lease.Lease,
			})
			if err != nil {
				return err
			}
			if err := tx.ReleaseDocumentRemediationLease(ctx, scope, document.ID, stores.DocumentRemediationLeaseReleaseInput{
				Now:   now.Add(time.Minute),
				Lease: renewed.Lease,
			}); err != nil {
				return err
			}

			run, created, err := tx.BeginGoogleImportRun(ctx, scope, stores.GoogleImportRunInput{
				UserID:            "user-" + suffix,
				GoogleFileID:      "file-" + suffix,
				SourceVersionHint: "v1",
				CreatedByUserID:   "user-" + suffix,
				DocumentTitle:     "Google Doc",
				AgreementTitle:    "Agreement Doc",
				RequestedAt:       now,
			})
			if err != nil {
				return err
			}
			if !created {
				t.Fatalf("expected first BeginGoogleImportRun to create")
			}
			googleRunID = run.ID
			if replayed, created, err := tx.BeginGoogleImportRun(ctx, scope, stores.GoogleImportRunInput{
				UserID:            "user-" + suffix,
				GoogleFileID:      "file-" + suffix,
				SourceVersionHint: "v1",
				CreatedByUserID:   "user-" + suffix,
				RequestedAt:       now.Add(time.Minute),
			}); err != nil {
				return err
			} else if created || replayed.ID != run.ID {
				t.Fatalf("expected deduped google import run, got created=%v replayed=%+v", created, replayed)
			}
			if _, err := tx.MarkGoogleImportRunRunning(ctx, scope, run.ID, now.Add(2*time.Minute)); err != nil {
				return err
			}
			if _, err := tx.MarkGoogleImportRunSucceeded(ctx, scope, run.ID, stores.GoogleImportRunSuccessInput{
				DocumentID:     document.ID,
				AgreementID:    "agreement-" + suffix,
				SourceMimeType: "application/pdf",
				IngestionMode:  "google_export",
				CompletedAt:    now.Add(3 * time.Minute),
			}); err != nil {
				return err
			}

			failedRun, created, err := tx.BeginGoogleImportRun(ctx, scope, stores.GoogleImportRunInput{
				UserID:            "user-" + suffix,
				GoogleFileID:      "file-fail-" + suffix,
				SourceVersionHint: "v2",
				CreatedByUserID:   "user-" + suffix,
				RequestedAt:       now,
			})
			if err != nil {
				return err
			}
			if !created {
				t.Fatalf("expected second BeginGoogleImportRun to create")
			}
			googleFailedRunID = failedRun.ID
			if _, err := tx.MarkGoogleImportRunFailed(ctx, scope, failedRun.ID, stores.GoogleImportRunFailureInput{
				ErrorCode:        "google_failed",
				ErrorMessage:     "export failed",
				ErrorDetailsJSON: `{"reason":"quota"}`,
				CompletedAt:      now.Add(4 * time.Minute),
			}); err != nil {
				return err
			}

			if _, err := tx.UpsertSignerProfile(ctx, scope, stores.SignerProfileRecord{
				Subject:        "signer-" + suffix + "@example.com",
				Key:            "default",
				FullName:       "Signer One",
				Remember:       true,
				ExpiresAt:      now.Add(24 * time.Hour),
				CreatedAt:      now,
				UpdatedAt:      now,
				Initials:       "SO",
				TypedSignature: "Signer One",
			}); err != nil {
				return err
			}
			if _, err := tx.UpsertSignerProfile(ctx, scope, stores.SignerProfileRecord{
				Subject:        "signer-" + suffix + "@example.com",
				Key:            "default",
				FullName:       "Signer Updated",
				Remember:       true,
				ExpiresAt:      now.Add(48 * time.Hour),
				UpdatedAt:      now.Add(5 * time.Minute),
				Initials:       "SU",
				TypedSignature: "Signer Updated",
			}); err != nil {
				return err
			}
			if _, err := tx.CreateSavedSignerSignature(ctx, scope, stores.SavedSignerSignatureRecord{
				ID:               "sig-" + suffix,
				Subject:          "signer-" + suffix + "@example.com",
				Type:             "signature",
				Label:            "Primary",
				ObjectKey:        "tenant/" + scope.TenantID + "/signatures/" + suffix + ".png",
				ThumbnailDataURL: "data:image/png;base64,abc",
				CreatedAt:        now,
			}); err != nil {
				return err
			}
			return nil
		}); err != nil {
			t.Fatalf("WithTx auxiliary writes: %v", err)
		}

		var (
			dispatchAccepted    bool
			dispatchMaxAttempts int
			dispatchCommandID   string
		)
		err := store.bunDB.NewSelect().
			TableExpr("remediation_dispatches").
			Column("accepted", "max_attempts", "command_id").
			Where("tenant_id = ?", scope.TenantID).
			Where("org_id = ?", scope.OrgID).
			Where("dispatch_id = ?", dispatchID).
			Scan(ctx, &dispatchAccepted, &dispatchMaxAttempts, &dispatchCommandID)
		if err != nil {
			t.Fatalf("Select remediation_dispatches: %v", err)
		}
		if !dispatchAccepted || dispatchMaxAttempts != 3 || dispatchCommandID != "cmd-"+suffix {
			t.Fatalf("unexpected remediation dispatch merge result: accepted=%v max_attempts=%d command_id=%q", dispatchAccepted, dispatchMaxAttempts, dispatchCommandID)
		}

		if err := store.WithTx(ctx, func(tx stores.TxStore) error {
			reacquired, err := tx.AcquireDocumentRemediationLease(ctx, scope, document.ID, stores.DocumentRemediationLeaseAcquireInput{
				Now:      now.Add(6 * time.Minute),
				TTL:      time.Minute,
				WorkerID: "worker-b",
			})
			if err != nil {
				return err
			}
			if reacquired.Lease.WorkerID != "worker-b" {
				t.Fatalf("expected worker-b reacquire, got %+v", reacquired)
			}
			return nil
		}); err != nil {
			t.Fatalf("WithTx reacquire remediation lease: %v", err)
		}

		run, err := store.GetGoogleImportRun(ctx, scope, googleRunID)
		if err != nil {
			t.Fatalf("GetGoogleImportRun success: %v", err)
		}
		if run.Status != stores.GoogleImportRunStatusSucceeded || run.DocumentID != document.ID {
			t.Fatalf("unexpected succeeded google import run: %+v", run)
		}
		failedRun, err := store.GetGoogleImportRun(ctx, scope, googleFailedRunID)
		if err != nil {
			t.Fatalf("GetGoogleImportRun failure: %v", err)
		}
		if failedRun.Status != stores.GoogleImportRunStatusFailed || failedRun.ErrorCode != "google_failed" {
			t.Fatalf("unexpected failed google import run: %+v", failedRun)
		}

		subject := "signer-" + suffix + "@example.com"
		profile, err := store.GetSignerProfile(ctx, scope, subject, "default", now.Add(time.Hour))
		if err != nil {
			t.Fatalf("GetSignerProfile: %v", err)
		}
		if profile.FullName != "Signer Updated" || profile.Initials != "SU" {
			t.Fatalf("unexpected signer profile: %+v", profile)
		}
		signatures, err := store.ListSavedSignerSignatures(ctx, scope, subject, "signature")
		if err != nil {
			t.Fatalf("ListSavedSignerSignatures: %v", err)
		}
		if len(signatures) != 1 {
			t.Fatalf("expected one saved signature, got %+v", signatures)
		}
		count, err := store.CountSavedSignerSignatures(ctx, scope, subject, "signature")
		if err != nil {
			t.Fatalf("CountSavedSignerSignatures: %v", err)
		}
		if count != 1 {
			t.Fatalf("expected saved signature count 1, got %d", count)
		}

		if err := store.WithTx(ctx, func(tx stores.TxStore) error {
			if err := tx.DeleteSavedSignerSignature(ctx, scope, subject, "sig-"+suffix); err != nil {
				return err
			}
			return tx.DeleteSignerProfile(ctx, scope, subject, "default")
		}); err != nil {
			t.Fatalf("WithTx delete signer data: %v", err)
		}

		if _, err := store.GetSignerProfile(ctx, scope, subject, "default", now.Add(2*time.Hour)); err == nil {
			t.Fatalf("expected signer profile deletion to persist")
		}
		count, err = store.CountSavedSignerSignatures(ctx, scope, subject, "signature")
		if err != nil {
			t.Fatalf("CountSavedSignerSignatures after delete: %v", err)
		}
		if count != 0 {
			t.Fatalf("expected saved signature count 0 after delete, got %d", count)
		}
	})
}

func TestRuntimeRelationalIntegrationAndPlacementWrites(t *testing.T) {
	runRuntimeAdapterBackends(t, func(t *testing.T, store *StoreAdapter) {
		ctx := context.Background()
		now := time.Date(2026, 3, 11, 1, 0, 0, 0, time.UTC)
		scope := runtimeScope()
		suffix := strings.ToLower(strings.ReplaceAll(uuid.NewString(), "-", ""))[:12]
		document := createRuntimeDocument(t, ctx, store, scope, suffix)
		agreement, err := store.CreateDraft(ctx, scope, stores.AgreementRecord{
			ID:              "agreement-" + suffix,
			DocumentID:      document.ID,
			Title:           "Placement Agreement",
			CreatedByUserID: "user-" + suffix,
		})
		if err != nil {
			t.Fatalf("CreateDraft for placement: %v", err)
		}

		mappingID := ""
		runID := ""
		conflictID := ""
		placementID := ""

		if err := store.WithTx(ctx, func(tx stores.TxStore) error {
			if _, err := tx.UpsertIntegrationCredential(ctx, scope, stores.IntegrationCredentialRecord{
				Provider:              "google",
				UserID:                "user-" + suffix,
				EncryptedAccessToken:  "access-1",
				EncryptedRefreshToken: "refresh-1",
				Scopes:                []string{"openid", "email"},
				ProfileJSON:           `{"email":"user@example.com"}`,
			}); err != nil {
				return err
			}
			if _, err := tx.UpsertIntegrationCredential(ctx, scope, stores.IntegrationCredentialRecord{
				Provider:              "google",
				UserID:                "user-" + suffix,
				EncryptedAccessToken:  "access-2",
				EncryptedRefreshToken: "refresh-2",
				Scopes:                []string{"openid", "profile"},
				ProfileJSON:           `{"email":"user2@example.com"}`,
			}); err != nil {
				return err
			}

			claimed, err := tx.ClaimIntegrationMutation(ctx, scope, "mutation-"+suffix, now)
			if err != nil {
				return err
			}
			if !claimed {
				t.Fatalf("expected first integration mutation claim to succeed")
			}
			claimed, err = tx.ClaimIntegrationMutation(ctx, scope, "mutation-"+suffix, now.Add(time.Minute))
			if err != nil {
				return err
			}
			if claimed {
				t.Fatalf("expected second integration mutation claim to be idempotent false")
			}

			spec, err := tx.UpsertMappingSpec(ctx, scope, stores.MappingSpecRecord{
				Provider:        "hris",
				Name:            "employees",
				Status:          stores.MappingSpecStatusDraft,
				CompiledJSON:    `{"compiled":true}`,
				CompiledHash:    "hash-1",
				CreatedByUserID: "user-" + suffix,
				UpdatedByUserID: "user-" + suffix,
			})
			if err != nil {
				return err
			}
			mappingID = spec.ID
			spec, err = tx.PublishMappingSpec(ctx, scope, spec.ID, spec.Version, now)
			if err != nil {
				return err
			}

			run, err := tx.CreateIntegrationSyncRun(ctx, scope, stores.IntegrationSyncRunRecord{
				Provider:        "hris",
				Direction:       "inbound",
				MappingSpecID:   spec.ID,
				Status:          stores.IntegrationSyncRunStatusPending,
				CreatedByUserID: "user-" + suffix,
				StartedAt:       now,
			})
			if err != nil {
				return err
			}
			runID = run.ID
			run, err = tx.UpdateIntegrationSyncRunStatus(ctx, scope, run.ID, stores.IntegrationSyncRunStatusRunning, "", "cursor-1", nil, run.Version)
			if err != nil {
				return err
			}

			if _, err := tx.UpsertIntegrationCheckpoint(ctx, scope, stores.IntegrationCheckpointRecord{
				RunID:         run.ID,
				CheckpointKey: "cursor",
				Cursor:        "cursor-1",
				PayloadJSON:   `{"offset":1}`,
			}); err != nil {
				return err
			}
			if _, err := tx.UpsertIntegrationCheckpoint(ctx, scope, stores.IntegrationCheckpointRecord{
				RunID:         run.ID,
				CheckpointKey: "cursor",
				Cursor:        "cursor-2",
				PayloadJSON:   `{"offset":2}`,
				Version:       1,
			}); err != nil {
				return err
			}

			if _, err := tx.UpsertIntegrationBinding(ctx, scope, stores.IntegrationBindingRecord{
				Provider:       "hris",
				EntityKind:     "agreement",
				ExternalID:     "ext-" + suffix,
				InternalID:     agreement.ID,
				ProvenanceJSON: `{"source":"seed"}`,
			}); err != nil {
				return err
			}
			if _, err := tx.UpsertIntegrationBinding(ctx, scope, stores.IntegrationBindingRecord{
				Provider:       "hris",
				EntityKind:     "agreement",
				ExternalID:     "ext-" + suffix,
				InternalID:     agreement.ID,
				ProvenanceJSON: `{"source":"updated"}`,
				Version:        1,
			}); err != nil {
				return err
			}

			conflict, err := tx.CreateIntegrationConflict(ctx, scope, stores.IntegrationConflictRecord{
				RunID:       run.ID,
				Provider:    "hris",
				EntityKind:  "agreement",
				ExternalID:  "ext-" + suffix,
				InternalID:  agreement.ID,
				Reason:      "ambiguous_match",
				PayloadJSON: `{"candidate":1}`,
			})
			if err != nil {
				return err
			}
			conflictID = conflict.ID
			if _, err := tx.ResolveIntegrationConflict(ctx, scope, conflict.ID, stores.IntegrationConflictStatusResolved, `{"decision":"accept"}`, "user-"+suffix, now.Add(time.Minute), conflict.Version); err != nil {
				return err
			}

			firstEvent, err := tx.AppendIntegrationChangeEvent(ctx, scope, stores.IntegrationChangeEventRecord{
				AgreementID:    agreement.ID,
				Provider:       "hris",
				EventType:      "agreement.updated",
				SourceEventID:  "source-1",
				IdempotencyKey: "event-" + suffix,
				PayloadJSON:    `{"status":"updated"}`,
				EmittedAt:      now,
			})
			if err != nil {
				return err
			}
			secondEvent, err := tx.AppendIntegrationChangeEvent(ctx, scope, stores.IntegrationChangeEventRecord{
				AgreementID:    agreement.ID,
				Provider:       "hris",
				EventType:      "agreement.updated",
				SourceEventID:  "source-2",
				IdempotencyKey: "event-" + suffix,
				PayloadJSON:    `{"status":"updated-again"}`,
				EmittedAt:      now.Add(time.Minute),
			})
			if err != nil {
				return err
			}
			if firstEvent.ID != secondEvent.ID {
				t.Fatalf("expected integration change event dedupe, got %q vs %q", firstEvent.ID, secondEvent.ID)
			}

			runRecord, err := tx.UpsertPlacementRun(ctx, scope, stores.PlacementRunRecord{
				AgreementID:         agreement.ID,
				Status:              stores.PlacementRunStatusPartial,
				ReasonCode:          "missing_optional",
				ResolverOrder:       []string{"geo", "geo", "manual"},
				ExecutedResolvers:   []string{"geo", "manual"},
				SelectedSource:      "auto",
				PolicyJSON:          `{"budget":1}`,
				MaxBudget:           10,
				BudgetUsed:          2,
				MaxTimeMS:           1000,
				ElapsedMS:           250,
				ManualOverrideCount: 1,
				CreatedByUserID:     "user-" + suffix,
			})
			if err != nil {
				return err
			}
			placementID = runRecord.ID
			if _, err := tx.UpsertPlacementRun(ctx, scope, stores.PlacementRunRecord{
				ID:                  runRecord.ID,
				AgreementID:         agreement.ID,
				Status:              stores.PlacementRunStatusCompleted,
				ResolverOrder:       []string{"manual"},
				ExecutedResolvers:   []string{"manual"},
				SelectedSource:      "manual",
				PolicyJSON:          `{"budget":1}`,
				MaxBudget:           10,
				BudgetUsed:          3,
				MaxTimeMS:           1000,
				ElapsedMS:           400,
				ManualOverrideCount: 2,
				CreatedByUserID:     "user-" + suffix,
				Version:             runRecord.Version,
				CompletedAt:         &now,
			}); err != nil {
				return err
			}
			return nil
		}); err != nil {
			t.Fatalf("WithTx integration/placement writes: %v", err)
		}

		credential, err := store.GetIntegrationCredential(ctx, scope, "google", "user-"+suffix)
		if err != nil {
			t.Fatalf("GetIntegrationCredential: %v", err)
		}
		if credential.EncryptedAccessToken != "access-2" {
			t.Fatalf("expected updated integration credential, got %+v", credential)
		}
		spec, err := store.GetMappingSpec(ctx, scope, mappingID)
		if err != nil {
			t.Fatalf("GetMappingSpec: %v", err)
		}
		if spec.Status != stores.MappingSpecStatusPublished {
			t.Fatalf("expected published mapping spec, got %+v", spec)
		}
		binding, err := store.GetIntegrationBindingByExternal(ctx, scope, "hris", "agreement", "ext-"+suffix)
		if err != nil {
			t.Fatalf("GetIntegrationBindingByExternal: %v", err)
		}
		if !strings.Contains(binding.ProvenanceJSON, "updated") || binding.Version != 2 {
			t.Fatalf("unexpected integration binding: %+v", binding)
		}
		syncRun, err := store.GetIntegrationSyncRun(ctx, scope, runID)
		if err != nil {
			t.Fatalf("GetIntegrationSyncRun: %v", err)
		}
		if syncRun.Status != stores.IntegrationSyncRunStatusRunning || syncRun.Cursor != "cursor-1" {
			t.Fatalf("unexpected integration sync run: %+v", syncRun)
		}
		checkpoints, err := store.ListIntegrationCheckpoints(ctx, scope, runID)
		if err != nil {
			t.Fatalf("ListIntegrationCheckpoints: %v", err)
		}
		if len(checkpoints) != 1 || checkpoints[0].Cursor != "cursor-2" {
			t.Fatalf("unexpected checkpoints: %+v", checkpoints)
		}
		conflict, err := store.GetIntegrationConflict(ctx, scope, conflictID)
		if err != nil {
			t.Fatalf("GetIntegrationConflict: %v", err)
		}
		if conflict.Status != stores.IntegrationConflictStatusResolved || conflict.ResolvedAt == nil {
			t.Fatalf("unexpected integration conflict: %+v", conflict)
		}
		events, err := store.ListIntegrationChangeEvents(ctx, scope, agreement.ID)
		if err != nil {
			t.Fatalf("ListIntegrationChangeEvents: %v", err)
		}
		if len(events) != 1 {
			t.Fatalf("expected one deduped integration change event, got %+v", events)
		}
		placement, err := store.GetPlacementRun(ctx, scope, agreement.ID, placementID)
		if err != nil {
			t.Fatalf("GetPlacementRun: %v", err)
		}
		if placement.Status != stores.PlacementRunStatusCompleted || placement.Version != 2 {
			t.Fatalf("unexpected placement run: %+v", placement)
		}

		err = store.WithTx(ctx, func(tx stores.TxStore) error {
			if _, err := tx.PublishMappingSpec(ctx, scope, mappingID, 1, now.Add(2*time.Hour)); err != nil {
				return err
			}
			return nil
		})
		if err == nil || !strings.Contains(err.Error(), "VERSION_CONFLICT") {
			t.Fatalf("expected VERSION_CONFLICT for stale mapping publish, got %v", err)
		}

		err = store.WithTx(ctx, func(tx stores.TxStore) error {
			if _, err := tx.UpsertPlacementRun(ctx, scope, stores.PlacementRunRecord{
				ID:          placementID,
				AgreementID: agreement.ID,
				Status:      stores.PlacementRunStatusFailed,
				Version:     1,
			}); err != nil {
				return err
			}
			return nil
		})
		if err == nil || !strings.Contains(err.Error(), "VERSION_CONFLICT") {
			t.Fatalf("expected VERSION_CONFLICT for stale placement run, got %v", err)
		}

		if err := store.WithTx(ctx, func(tx stores.TxStore) error {
			return tx.DeleteIntegrationCredential(ctx, scope, "google", "user-"+suffix)
		}); err != nil {
			t.Fatalf("DeleteIntegrationCredential: %v", err)
		}
		if _, err := store.GetIntegrationCredential(ctx, scope, "google", "user-"+suffix); err == nil {
			t.Fatalf("expected integration credential deletion to persist")
		}
	})
}

func boolPtr(v bool) *bool { return &v }

func intPtr(v int) *int { return &v }

func stringPtr(v string) *string { return &v }

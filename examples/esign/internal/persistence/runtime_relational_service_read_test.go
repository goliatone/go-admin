package persistence

import (
	"context"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

func TestRuntimeRelationalAuxiliaryReadSurfaces(t *testing.T) {
	runRuntimeAdapterBackends(t, func(t *testing.T, store *StoreAdapter) {
		ctx := context.Background()
		now := time.Date(2026, 3, 11, 3, 0, 0, 0, time.UTC)
		scope := runtimeScope()
		suffix := "readaux"

		document := createRuntimeDocument(t, ctx, store, scope, suffix)
		agreement, err := store.CreateDraft(ctx, scope, stores.AgreementRecord{
			ID:              "agreement-" + suffix,
			DocumentID:      document.ID,
			Title:           "Read Agreement",
			CreatedByUserID: "user-" + suffix,
		})
		if err != nil {
			t.Fatalf("CreateDraft: %v", err)
		}

		dispatchID := "dispatch-" + suffix
		subject := "signer-" + suffix + "@example.com"
		userID := "user-" + suffix

		var (
			googleSucceededID string
			googleFailedID    string
			outboxFailedID    string
		)

		err = store.WithTx(ctx, func(tx stores.TxStore) error {
			if _, err = tx.SaveRemediationDispatch(ctx, scope, stores.RemediationDispatchRecord{
				DispatchID:     dispatchID,
				DocumentID:     document.ID,
				IdempotencyKey: "idem-" + suffix,
				Mode:           "async",
				MaxAttempts:    1,
				UpdatedAt:      now,
			}); err != nil {
				return err
			}
			if _, err = tx.SaveRemediationDispatch(ctx, scope, stores.RemediationDispatchRecord{
				DispatchID:     dispatchID,
				DocumentID:     document.ID,
				IdempotencyKey: "idem-" + suffix,
				CommandID:      "cmd-" + suffix,
				Accepted:       true,
				MaxAttempts:    3,
				UpdatedAt:      now.Add(time.Minute),
			}); err != nil {
				return err
			}
			dispatch, lookupErr := tx.GetRemediationDispatch(ctx, dispatchID)
			if lookupErr != nil {
				return lookupErr
			}
			if !dispatch.Accepted || dispatch.CommandID != "cmd-"+suffix {
				t.Fatalf("unexpected tx remediation dispatch: %+v", dispatch)
			}
			dispatch, err = tx.GetRemediationDispatchByIdempotencyKey(ctx, scope, "idem-"+suffix)
			if err != nil {
				return err
			}
			if dispatch.DispatchID != dispatchID {
				t.Fatalf("unexpected tx remediation dispatch by key: %+v", dispatch)
			}

			if _, err = tx.UpsertSignerProfile(ctx, scope, stores.SignerProfileRecord{
				Subject:        subject,
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
			if _, err = tx.UpsertSignerProfile(ctx, scope, stores.SignerProfileRecord{
				Subject:        subject,
				Key:            "default",
				FullName:       "Signer Two",
				Remember:       true,
				ExpiresAt:      now.Add(48 * time.Hour),
				UpdatedAt:      now.Add(2 * time.Minute),
				Initials:       "ST",
				TypedSignature: "Signer Two",
			}); err != nil {
				return err
			}
			if _, err = tx.CreateSavedSignerSignature(ctx, scope, stores.SavedSignerSignatureRecord{
				ID:               "sig-old-" + suffix,
				Subject:          subject,
				Type:             "signature",
				Label:            "Old",
				ObjectKey:        "tenant/" + scope.TenantID + "/signatures/old-" + suffix + ".png",
				ThumbnailDataURL: "data:image/png;base64,old",
				CreatedAt:        now,
			}); err != nil {
				return err
			}
			if _, err = tx.CreateSavedSignerSignature(ctx, scope, stores.SavedSignerSignatureRecord{
				ID:               "sig-new-" + suffix,
				Subject:          subject,
				Type:             "signature",
				Label:            "New",
				ObjectKey:        "tenant/" + scope.TenantID + "/signatures/new-" + suffix + ".png",
				ThumbnailDataURL: "data:image/png;base64,new",
				CreatedAt:        now.Add(time.Minute),
			}); err != nil {
				return err
			}
			profile, getProfileErr := tx.GetSignerProfile(ctx, scope, subject, "default", now.Add(time.Hour))
			if getProfileErr != nil {
				return getProfileErr
			}
			if profile.FullName != "Signer Two" || profile.Initials != "ST" {
				t.Fatalf("unexpected tx signer profile: %+v", profile)
			}
			if _, err = tx.GetSignerProfile(ctx, scope, subject, "default", now.Add(72*time.Hour)); !relationalIsNotFoundError(err) {
				t.Fatalf("expected expired signer profile to be not found, got %v", err)
			}
			signatures, listErr := tx.ListSavedSignerSignatures(ctx, scope, subject, "signature")
			if listErr != nil {
				return listErr
			}
			if len(signatures) != 2 || signatures[0].ID != "sig-new-"+suffix || signatures[1].ID != "sig-old-"+suffix {
				t.Fatalf("unexpected tx saved signatures ordering: %+v", signatures)
			}
			count, countErr := tx.CountSavedSignerSignatures(ctx, scope, subject, "signature")
			if countErr != nil {
				return countErr
			}
			if count != 2 {
				t.Fatalf("expected tx saved signature count 2, got %d", count)
			}

			if _, err = tx.SaveAgreementArtifacts(ctx, scope, stores.AgreementArtifactRecord{
				AgreementID:          agreement.ID,
				ExecutedObjectKey:    "tenant/" + scope.TenantID + "/agreements/" + agreement.ID + "/executed.pdf",
				ExecutedSHA256:       "sha-executed-" + suffix,
				CertificateObjectKey: "tenant/" + scope.TenantID + "/agreements/" + agreement.ID + "/certificate.pdf",
				CertificateSHA256:    "sha-certificate-" + suffix,
				CorrelationID:        "corr-" + suffix,
				CreatedAt:            now,
				UpdatedAt:            now,
			}); err != nil {
				return err
			}
			artifacts, artifactsErr := tx.GetAgreementArtifacts(ctx, scope, agreement.ID)
			if artifactsErr != nil {
				return artifactsErr
			}
			if artifacts.ExecutedSHA256 != "sha-executed-"+suffix {
				t.Fatalf("unexpected tx agreement artifacts: %+v", artifacts)
			}

			run, created, beginErr := tx.BeginGoogleImportRun(ctx, scope, stores.GoogleImportRunInput{
				UserID:            userID,
				GoogleFileID:      "file-success-" + suffix,
				SourceVersionHint: "v1",
				CreatedByUserID:   userID,
				DocumentTitle:     "Google Success",
				AgreementTitle:    "Agreement Success",
				RequestedAt:       now,
			})
			if beginErr != nil {
				return beginErr
			}
			if !created {
				t.Fatalf("expected first google import run to be created")
			}
			googleSucceededID = run.ID
			if _, err = tx.MarkGoogleImportRunRunning(ctx, scope, run.ID, now.Add(2*time.Minute)); err != nil {
				return err
			}
			if _, err = tx.MarkGoogleImportRunSucceeded(ctx, scope, run.ID, stores.GoogleImportRunSuccessInput{
				DocumentID:     document.ID,
				AgreementID:    agreement.ID,
				SourceMimeType: "application/pdf",
				IngestionMode:  "google_export",
				CompletedAt:    now.Add(3 * time.Minute),
			}); err != nil {
				return err
			}
			run, created, err = tx.BeginGoogleImportRun(ctx, scope, stores.GoogleImportRunInput{
				UserID:            userID,
				GoogleFileID:      "file-failed-" + suffix,
				SourceVersionHint: "v2",
				CreatedByUserID:   userID,
				DocumentTitle:     "Google Failed",
				AgreementTitle:    "Agreement Failed",
				RequestedAt:       now.Add(4 * time.Minute),
			})
			if err != nil {
				return err
			}
			if !created {
				t.Fatalf("expected second google import run to be created")
			}
			googleFailedID = run.ID
			if _, err = tx.MarkGoogleImportRunFailed(ctx, scope, run.ID, stores.GoogleImportRunFailureInput{
				ErrorCode:        "google_failed",
				ErrorMessage:     "quota exceeded",
				ErrorDetailsJSON: `{"reason":"quota"}`,
				CompletedAt:      now.Add(5 * time.Minute),
			}); err != nil {
				return err
			}
			importRun, err := tx.GetGoogleImportRun(ctx, scope, googleSucceededID)
			if err != nil {
				return err
			}
			if importRun.Status != stores.GoogleImportRunStatusSucceeded {
				t.Fatalf("unexpected tx google import run: %+v", importRun)
			}
			importRuns, nextCursor, err := tx.ListGoogleImportRuns(ctx, scope, stores.GoogleImportRunQuery{
				UserID:   userID,
				Limit:    1,
				SortDesc: true,
			})
			if err != nil {
				return err
			}
			if len(importRuns) != 1 || importRuns[0].ID != googleFailedID || nextCursor == "" {
				t.Fatalf("unexpected tx google import list first page: runs=%+v next=%q", importRuns, nextCursor)
			}
			importRuns, nextCursor, err = tx.ListGoogleImportRuns(ctx, scope, stores.GoogleImportRunQuery{
				UserID:   userID,
				Limit:    1,
				Cursor:   nextCursor,
				SortDesc: true,
			})
			if err != nil {
				return err
			}
			if len(importRuns) != 1 || importRuns[0].ID != googleSucceededID || nextCursor != "" {
				t.Fatalf("unexpected tx google import list second page: runs=%+v next=%q", importRuns, nextCursor)
			}

			message, err := tx.EnqueueOutboxMessage(ctx, scope, stores.OutboxMessageRecord{
				ID:          "outbox-failed-" + suffix,
				Topic:       "email.send",
				PayloadJSON: `{"kind":"failed"}`,
				CreatedAt:   now.Add(6 * time.Minute),
			})
			if err != nil {
				return err
			}
			outboxFailedID = message.ID
			if _, err = tx.MarkOutboxMessageFailed(ctx, scope, message.ID, "provider timeout", nil, now.Add(7*time.Minute)); err != nil {
				return err
			}
			if _, err = tx.EnqueueOutboxMessage(ctx, scope, stores.OutboxMessageRecord{
				ID:          "outbox-pending-" + suffix,
				Topic:       "email.send",
				PayloadJSON: `{"kind":"pending"}`,
				CreatedAt:   now.Add(8 * time.Minute),
			}); err != nil {
				return err
			}
			if _, err = tx.EnqueueOutboxMessage(ctx, scope, stores.OutboxMessageRecord{
				ID:          "outbox-webhook-" + suffix,
				Topic:       "webhook.send",
				PayloadJSON: `{"kind":"webhook"}`,
				CreatedAt:   now.Add(9 * time.Minute),
			}); err != nil {
				return err
			}
			outboxRows, err := tx.ListOutboxMessages(ctx, scope, stores.OutboxQuery{Topic: "email.send"})
			if err != nil {
				return err
			}
			if len(outboxRows) != 2 || outboxRows[0].ID != outboxFailedID {
				t.Fatalf("unexpected tx outbox topic list: %+v", outboxRows)
			}
			outboxRows, err = tx.ListOutboxMessages(ctx, scope, stores.OutboxQuery{Status: stores.OutboxMessageStatusFailed})
			if err != nil {
				return err
			}
			if len(outboxRows) != 1 || outboxRows[0].ID != outboxFailedID {
				t.Fatalf("unexpected tx failed outbox list: %+v", outboxRows)
			}
			return nil
		})
		if err != nil {
			t.Fatalf("WithTx auxiliary read surfaces: %v", err)
		}

		dispatch, err := store.GetRemediationDispatch(ctx, dispatchID)
		if err != nil {
			t.Fatalf("GetRemediationDispatch: %v", err)
		}
		if !dispatch.Accepted || dispatch.CommandID != "cmd-"+suffix {
			t.Fatalf("unexpected remediation dispatch: %+v", dispatch)
		}
		dispatch, err = store.GetRemediationDispatchByIdempotencyKey(ctx, scope, "idem-"+suffix)
		if err != nil {
			t.Fatalf("GetRemediationDispatchByIdempotencyKey: %v", err)
		}
		if dispatch.DispatchID != dispatchID {
			t.Fatalf("unexpected remediation dispatch by key: %+v", dispatch)
		}

		profile, err := store.GetSignerProfile(ctx, scope, subject, "default", now.Add(time.Hour))
		if err != nil {
			t.Fatalf("GetSignerProfile: %v", err)
		}
		if profile.FullName != "Signer Two" || profile.Initials != "ST" {
			t.Fatalf("unexpected signer profile: %+v", profile)
		}
		if _, err = store.GetSignerProfile(ctx, scope, subject, "default", now.Add(72*time.Hour)); !relationalIsNotFoundError(err) {
			t.Fatalf("expected expired signer profile to be not found, got %v", err)
		}
		signatures, err := store.ListSavedSignerSignatures(ctx, scope, subject, "signature")
		if err != nil {
			t.Fatalf("ListSavedSignerSignatures: %v", err)
		}
		if len(signatures) != 2 || signatures[0].ID != "sig-new-"+suffix || signatures[1].ID != "sig-old-"+suffix {
			t.Fatalf("unexpected saved signatures ordering: %+v", signatures)
		}
		count, err := store.CountSavedSignerSignatures(ctx, scope, subject, "signature")
		if err != nil {
			t.Fatalf("CountSavedSignerSignatures: %v", err)
		}
		if count != 2 {
			t.Fatalf("expected saved signature count 2, got %d", count)
		}
		artifacts, err := store.GetAgreementArtifacts(ctx, scope, agreement.ID)
		if err != nil {
			t.Fatalf("GetAgreementArtifacts: %v", err)
		}
		if artifacts.ExecutedSHA256 != "sha-executed-"+suffix {
			t.Fatalf("unexpected agreement artifacts: %+v", artifacts)
		}
		run, err := store.GetGoogleImportRun(ctx, scope, googleSucceededID)
		if err != nil {
			t.Fatalf("GetGoogleImportRun: %v", err)
		}
		if run.Status != stores.GoogleImportRunStatusSucceeded {
			t.Fatalf("unexpected stored google import run: %+v", run)
		}
		importRuns, nextCursor, err := store.ListGoogleImportRuns(ctx, scope, stores.GoogleImportRunQuery{
			UserID:   userID,
			Limit:    1,
			SortDesc: true,
		})
		if err != nil {
			t.Fatalf("ListGoogleImportRuns first page: %v", err)
		}
		if len(importRuns) != 1 || importRuns[0].ID != googleFailedID || nextCursor == "" {
			t.Fatalf("unexpected google import list first page: runs=%+v next=%q", importRuns, nextCursor)
		}
		importRuns, nextCursor, err = store.ListGoogleImportRuns(ctx, scope, stores.GoogleImportRunQuery{
			UserID:   userID,
			Limit:    1,
			Cursor:   nextCursor,
			SortDesc: true,
		})
		if err != nil {
			t.Fatalf("ListGoogleImportRuns second page: %v", err)
		}
		if len(importRuns) != 1 || importRuns[0].ID != googleSucceededID || nextCursor != "" {
			t.Fatalf("unexpected google import list second page: runs=%+v next=%q", importRuns, nextCursor)
		}
		outboxRows, err := store.ListOutboxMessages(ctx, scope, stores.OutboxQuery{Topic: "email.send"})
		if err != nil {
			t.Fatalf("ListOutboxMessages by topic: %v", err)
		}
		if len(outboxRows) != 2 || outboxRows[0].ID != outboxFailedID {
			t.Fatalf("unexpected outbox topic list: %+v", outboxRows)
		}
		outboxRows, err = store.ListOutboxMessages(ctx, scope, stores.OutboxQuery{Status: stores.OutboxMessageStatusFailed})
		if err != nil {
			t.Fatalf("ListOutboxMessages by status: %v", err)
		}
		if len(outboxRows) != 1 || outboxRows[0].ID != outboxFailedID {
			t.Fatalf("unexpected failed outbox list: %+v", outboxRows)
		}
	})
}

func TestRuntimeRelationalIntegrationAndPlacementReadSurfaces(t *testing.T) {
	runRuntimeAdapterBackends(t, func(t *testing.T, store *StoreAdapter) {
		ctx := context.Background()
		now := time.Date(2026, 3, 11, 4, 0, 0, 0, time.UTC)
		scope := runtimeScope()
		suffix := "readint"

		document := createRuntimeDocument(t, ctx, store, scope, suffix)
		agreement, err := store.CreateDraft(ctx, scope, stores.AgreementRecord{
			ID:              "agreement-" + suffix,
			DocumentID:      document.ID,
			Title:           "Integration Agreement",
			CreatedByUserID: "user-" + suffix,
		})
		if err != nil {
			t.Fatalf("CreateDraft primary: %v", err)
		}
		otherAgreement, err := store.CreateDraft(ctx, scope, stores.AgreementRecord{
			ID:              "agreement-other-" + suffix,
			DocumentID:      document.ID,
			Title:           "Other Agreement",
			CreatedByUserID: "user-" + suffix,
		})
		if err != nil {
			t.Fatalf("CreateDraft secondary: %v", err)
		}

		baseUser := "user-" + suffix
		scopedUser := baseUser + "#google-account=work"
		otherPrefixUser := baseUser + "0"

		var (
			mappingPublishedID string
			mappingDraftID     string
			runOlderID         string
			runNewerID         string
			conflictResolvedID string
			placementPrimaryID string
		)

		err = store.WithTx(ctx, func(tx stores.TxStore) error {
			if _, err = tx.UpsertIntegrationCredential(ctx, scope, stores.IntegrationCredentialRecord{
				Provider:              "google",
				UserID:                baseUser,
				EncryptedAccessToken:  "access-1",
				EncryptedRefreshToken: "refresh-1",
			}); err != nil {
				return err
			}
			if _, err = tx.UpsertIntegrationCredential(ctx, scope, stores.IntegrationCredentialRecord{
				Provider:              "google",
				UserID:                baseUser,
				EncryptedAccessToken:  "access-2",
				EncryptedRefreshToken: "refresh-2",
			}); err != nil {
				return err
			}
			if _, err = tx.UpsertIntegrationCredential(ctx, scope, stores.IntegrationCredentialRecord{
				Provider:              "google",
				UserID:                scopedUser,
				EncryptedAccessToken:  "access-scoped",
				EncryptedRefreshToken: "refresh-scoped",
			}); err != nil {
				return err
			}
			if _, err = tx.UpsertIntegrationCredential(ctx, scope, stores.IntegrationCredentialRecord{
				Provider:              "google",
				UserID:                otherPrefixUser,
				EncryptedAccessToken:  "access-other",
				EncryptedRefreshToken: "refresh-other",
			}); err != nil {
				return err
			}
			if _, err = tx.UpsertIntegrationCredential(ctx, scope, stores.IntegrationCredentialRecord{
				Provider:              "microsoft",
				UserID:                baseUser,
				EncryptedAccessToken:  "access-ms",
				EncryptedRefreshToken: "refresh-ms",
			}); err != nil {
				return err
			}
			credential, lookupErr := tx.GetIntegrationCredential(ctx, scope, "google", baseUser)
			if lookupErr != nil {
				return lookupErr
			}
			if credential.EncryptedAccessToken != "access-2" {
				t.Fatalf("unexpected tx integration credential: %+v", credential)
			}
			credentials, listCredentialsErr := tx.ListIntegrationCredentials(ctx, scope, "google", baseUser)
			if listCredentialsErr != nil {
				return listCredentialsErr
			}
			if len(credentials) != 2 {
				t.Fatalf("expected 2 tx filtered credentials, got %+v", credentials)
			}

			spec, upsertErr := tx.UpsertMappingSpec(ctx, scope, stores.MappingSpecRecord{
				Provider:        "hris",
				Name:            "employees",
				Status:          stores.MappingSpecStatusDraft,
				CompiledJSON:    `{"compiled":true}`,
				CompiledHash:    "hash-published",
				CreatedByUserID: baseUser,
				UpdatedByUserID: baseUser,
			})
			if upsertErr != nil {
				return upsertErr
			}
			spec, err = tx.PublishMappingSpec(ctx, scope, spec.ID, spec.Version, now)
			if err != nil {
				return err
			}
			mappingPublishedID = spec.ID
			spec, err = tx.UpsertMappingSpec(ctx, scope, stores.MappingSpecRecord{
				Provider:        "hris",
				Name:            "departments",
				Status:          stores.MappingSpecStatusDraft,
				CompiledJSON:    `{"compiled":true}`,
				CompiledHash:    "hash-draft",
				CreatedByUserID: baseUser,
				UpdatedByUserID: baseUser,
			})
			if err != nil {
				return err
			}
			mappingDraftID = spec.ID
			mappingSpecs, listErr := tx.ListMappingSpecs(ctx, scope, "hris")
			if listErr != nil {
				return listErr
			}
			if len(mappingSpecs) != 2 || mappingSpecs[0].Name != "departments" || mappingSpecs[1].Name != "employees" {
				t.Fatalf("unexpected tx mapping spec ordering: %+v", mappingSpecs)
			}

			if _, err = tx.UpsertIntegrationBinding(ctx, scope, stores.IntegrationBindingRecord{
				Provider:       "hris",
				EntityKind:     "agreement",
				ExternalID:     "ext-primary-" + suffix,
				InternalID:     agreement.ID,
				ProvenanceJSON: `{"source":"seed"}`,
			}); err != nil {
				return err
			}
			if _, err = tx.UpsertIntegrationBinding(ctx, scope, stores.IntegrationBindingRecord{
				Provider:       "hris",
				EntityKind:     "agreement",
				ExternalID:     "ext-other-" + suffix,
				InternalID:     otherAgreement.ID,
				ProvenanceJSON: `{"source":"other"}`,
			}); err != nil {
				return err
			}
			binding, bindingErr := tx.GetIntegrationBindingByExternal(ctx, scope, "hris", "agreement", "ext-primary-"+suffix)
			if bindingErr != nil {
				return bindingErr
			}
			if binding.InternalID != agreement.ID {
				t.Fatalf("unexpected tx binding by external: %+v", binding)
			}
			bindings, listBindingsErr := tx.ListIntegrationBindings(ctx, scope, "hris", "agreement", agreement.ID)
			if listBindingsErr != nil {
				return listBindingsErr
			}
			if len(bindings) != 1 || bindings[0].ExternalID != "ext-primary-"+suffix {
				t.Fatalf("unexpected tx bindings list: %+v", bindings)
			}

			run, err := tx.CreateIntegrationSyncRun(ctx, scope, stores.IntegrationSyncRunRecord{
				ID:              "sync-old-" + suffix,
				Provider:        "hris",
				Direction:       "inbound",
				MappingSpecID:   mappingPublishedID,
				Status:          stores.IntegrationSyncRunStatusPending,
				CreatedByUserID: baseUser,
				StartedAt:       now,
			})
			if err != nil {
				return err
			}
			runOlderID = run.ID
			run, err = tx.CreateIntegrationSyncRun(ctx, scope, stores.IntegrationSyncRunRecord{
				ID:              "sync-new-" + suffix,
				Provider:        "hris",
				Direction:       "inbound",
				MappingSpecID:   mappingPublishedID,
				Status:          stores.IntegrationSyncRunStatusPending,
				CreatedByUserID: baseUser,
				StartedAt:       now.Add(time.Minute),
			})
			if err != nil {
				return err
			}
			runNewerID = run.ID
			run, err = tx.UpdateIntegrationSyncRunStatus(ctx, scope, runOlderID, stores.IntegrationSyncRunStatusRunning, "", "cursor-old", nil, 1)
			if err != nil {
				return err
			}
			if run.Cursor != "cursor-old" {
				t.Fatalf("unexpected updated tx sync run: %+v", run)
			}
			syncRun, err := tx.GetIntegrationSyncRun(ctx, scope, runOlderID)
			if err != nil {
				return err
			}
			if syncRun.Cursor != "cursor-old" {
				t.Fatalf("unexpected tx sync run load: %+v", syncRun)
			}
			syncRuns, err := tx.ListIntegrationSyncRuns(ctx, scope, "hris")
			if err != nil {
				return err
			}
			if len(syncRuns) != 2 || syncRuns[0].ID != runNewerID || syncRuns[1].ID != runOlderID {
				t.Fatalf("unexpected tx sync run ordering: %+v", syncRuns)
			}

			if _, err = tx.UpsertIntegrationCheckpoint(ctx, scope, stores.IntegrationCheckpointRecord{
				RunID:         runOlderID,
				CheckpointKey: "cursor",
				Cursor:        "cursor-1",
				PayloadJSON:   `{"offset":1}`,
			}); err != nil {
				return err
			}
			if _, err = tx.UpsertIntegrationCheckpoint(ctx, scope, stores.IntegrationCheckpointRecord{
				RunID:         runOlderID,
				CheckpointKey: "watermark",
				Cursor:        "watermark-1",
				PayloadJSON:   `{"offset":2}`,
			}); err != nil {
				return err
			}
			if _, err = tx.UpsertIntegrationCheckpoint(ctx, scope, stores.IntegrationCheckpointRecord{
				RunID:         runOlderID,
				CheckpointKey: "cursor",
				Cursor:        "cursor-2",
				PayloadJSON:   `{"offset":3}`,
				Version:       1,
			}); err != nil {
				return err
			}
			checkpoints, err := tx.ListIntegrationCheckpoints(ctx, scope, runOlderID)
			if err != nil {
				return err
			}
			if len(checkpoints) != 2 || checkpoints[0].CheckpointKey != "watermark" || checkpoints[1].Cursor != "cursor-2" {
				t.Fatalf("unexpected tx checkpoint ordering: %+v", checkpoints)
			}

			conflict, err := tx.CreateIntegrationConflict(ctx, scope, stores.IntegrationConflictRecord{
				ID:          "conflict-resolved-" + suffix,
				RunID:       runOlderID,
				Provider:    "hris",
				EntityKind:  "agreement",
				ExternalID:  "ext-primary-" + suffix,
				InternalID:  agreement.ID,
				Reason:      "ambiguous_match",
				PayloadJSON: `{"candidate":1}`,
			})
			if err != nil {
				return err
			}
			conflictResolvedID = conflict.ID
			if _, err = tx.ResolveIntegrationConflict(ctx, scope, conflict.ID, stores.IntegrationConflictStatusResolved, `{"decision":"accept"}`, baseUser, now.Add(2*time.Minute), conflict.Version); err != nil {
				return err
			}
			if _, err = tx.CreateIntegrationConflict(ctx, scope, stores.IntegrationConflictRecord{
				ID:          "conflict-pending-" + suffix,
				RunID:       runOlderID,
				Provider:    "hris",
				EntityKind:  "agreement",
				ExternalID:  "ext-pending-" + suffix,
				InternalID:  agreement.ID,
				Reason:      "missing_binding",
				PayloadJSON: `{"candidate":2}`,
			}); err != nil {
				return err
			}
			conflict, err = tx.GetIntegrationConflict(ctx, scope, conflictResolvedID)
			if err != nil {
				return err
			}
			if conflict.Status != stores.IntegrationConflictStatusResolved {
				t.Fatalf("unexpected tx resolved conflict: %+v", conflict)
			}
			conflicts, err := tx.ListIntegrationConflicts(ctx, scope, runOlderID, stores.IntegrationConflictStatusResolved)
			if err != nil {
				return err
			}
			if len(conflicts) != 1 || conflicts[0].ID != conflictResolvedID {
				t.Fatalf("unexpected tx resolved conflict list: %+v", conflicts)
			}

			firstEvent, err := tx.AppendIntegrationChangeEvent(ctx, scope, stores.IntegrationChangeEventRecord{
				AgreementID:    agreement.ID,
				Provider:       "hris",
				EventType:      "agreement.updated",
				SourceEventID:  "source-1",
				IdempotencyKey: "event-1-" + suffix,
				PayloadJSON:    `{"status":"updated"}`,
				EmittedAt:      now,
			})
			if err != nil {
				return err
			}
			duplicateEvent, err := tx.AppendIntegrationChangeEvent(ctx, scope, stores.IntegrationChangeEventRecord{
				AgreementID:    agreement.ID,
				Provider:       "hris",
				EventType:      "agreement.updated",
				SourceEventID:  "source-2",
				IdempotencyKey: "event-1-" + suffix,
				PayloadJSON:    `{"status":"ignored"}`,
				EmittedAt:      now.Add(time.Minute),
			})
			if err != nil {
				return err
			}
			if duplicateEvent.ID != firstEvent.ID {
				t.Fatalf("expected duplicate integration event to return existing record")
			}
			if _, err = tx.AppendIntegrationChangeEvent(ctx, scope, stores.IntegrationChangeEventRecord{
				AgreementID:    agreement.ID,
				Provider:       "hris",
				EventType:      "agreement.completed",
				SourceEventID:  "source-3",
				IdempotencyKey: "event-2-" + suffix,
				PayloadJSON:    `{"status":"completed"}`,
				EmittedAt:      now.Add(2 * time.Minute),
			}); err != nil {
				return err
			}
			events, err := tx.ListIntegrationChangeEvents(ctx, scope, agreement.ID)
			if err != nil {
				return err
			}
			if len(events) != 2 || events[0].IdempotencyKey != "event-1-"+suffix || events[1].IdempotencyKey != "event-2-"+suffix {
				t.Fatalf("unexpected tx integration change events: %+v", events)
			}

			placement, err := tx.UpsertPlacementRun(ctx, scope, stores.PlacementRunRecord{
				ID:                  "placement-primary-" + suffix,
				AgreementID:         agreement.ID,
				Status:              stores.PlacementRunStatusPartial,
				CreatedByUserID:     baseUser,
				ResolverOrder:       []string{"geo", "manual"},
				ExecutedResolvers:   []string{"geo"},
				SelectedSource:      "auto",
				PolicyJSON:          `{"budget":1}`,
				MaxBudget:           10,
				BudgetUsed:          2,
				MaxTimeMS:           1000,
				ElapsedMS:           200,
				ManualOverrideCount: 0,
			})
			if err != nil {
				return err
			}
			placementPrimaryID = placement.ID
			if _, err = tx.UpsertPlacementRun(ctx, scope, stores.PlacementRunRecord{
				ID:                  placement.ID,
				AgreementID:         agreement.ID,
				Status:              stores.PlacementRunStatusCompleted,
				CreatedByUserID:     baseUser,
				ResolverOrder:       []string{"manual"},
				ExecutedResolvers:   []string{"manual"},
				SelectedSource:      "manual",
				PolicyJSON:          `{"budget":1}`,
				MaxBudget:           10,
				BudgetUsed:          3,
				MaxTimeMS:           1000,
				ElapsedMS:           250,
				ManualOverrideCount: 1,
				Version:             placement.Version,
				CompletedAt:         &now,
			}); err != nil {
				return err
			}
			if _, err = tx.UpsertPlacementRun(ctx, scope, stores.PlacementRunRecord{
				ID:                  "placement-other-" + suffix,
				AgreementID:         otherAgreement.ID,
				Status:              stores.PlacementRunStatusFailed,
				CreatedByUserID:     baseUser,
				ResolverOrder:       []string{"manual"},
				ExecutedResolvers:   []string{"manual"},
				SelectedSource:      "manual",
				PolicyJSON:          `{"budget":1}`,
				MaxBudget:           10,
				BudgetUsed:          1,
				MaxTimeMS:           1000,
				ElapsedMS:           100,
				ManualOverrideCount: 0,
			}); err != nil {
				return err
			}
			placement, err = tx.GetPlacementRun(ctx, scope, agreement.ID, placementPrimaryID)
			if err != nil {
				return err
			}
			if placement.Status != stores.PlacementRunStatusCompleted {
				t.Fatalf("unexpected tx placement run: %+v", placement)
			}
			placements, err := tx.ListPlacementRuns(ctx, scope, agreement.ID)
			if err != nil {
				return err
			}
			if len(placements) != 1 || placements[0].ID != placementPrimaryID {
				t.Fatalf("unexpected tx placement list: %+v", placements)
			}
			return nil
		})
		if err != nil {
			t.Fatalf("WithTx integration read surfaces: %v", err)
		}

		credential, err := store.GetIntegrationCredential(ctx, scope, "google", baseUser)
		if err != nil {
			t.Fatalf("GetIntegrationCredential: %v", err)
		}
		if credential.EncryptedAccessToken != "access-2" {
			t.Fatalf("unexpected integration credential: %+v", credential)
		}
		credentials, err := store.ListIntegrationCredentials(ctx, scope, "google", baseUser)
		if err != nil {
			t.Fatalf("ListIntegrationCredentials: %v", err)
		}
		if len(credentials) != 2 {
			t.Fatalf("expected 2 filtered credentials, got %+v", credentials)
		}
		if credentials[0].UserID == otherPrefixUser || credentials[1].UserID == otherPrefixUser {
			t.Fatalf("unexpected prefix leak in credentials: %+v", credentials)
		}

		mappingSpec, err := store.GetMappingSpec(ctx, scope, mappingPublishedID)
		if err != nil {
			t.Fatalf("GetMappingSpec: %v", err)
		}
		if mappingSpec.Status != stores.MappingSpecStatusPublished {
			t.Fatalf("unexpected mapping spec: %+v", mappingSpec)
		}
		mappingSpecs, err := store.ListMappingSpecs(ctx, scope, "hris")
		if err != nil {
			t.Fatalf("ListMappingSpecs: %v", err)
		}
		if len(mappingSpecs) != 2 || mappingSpecs[0].ID != mappingDraftID || mappingSpecs[1].ID != mappingPublishedID {
			t.Fatalf("unexpected mapping spec ordering: %+v", mappingSpecs)
		}

		binding, err := store.GetIntegrationBindingByExternal(ctx, scope, "hris", "agreement", "ext-primary-"+suffix)
		if err != nil {
			t.Fatalf("GetIntegrationBindingByExternal: %v", err)
		}
		if binding.InternalID != agreement.ID {
			t.Fatalf("unexpected binding: %+v", binding)
		}
		bindings, err := store.ListIntegrationBindings(ctx, scope, "hris", "agreement", agreement.ID)
		if err != nil {
			t.Fatalf("ListIntegrationBindings: %v", err)
		}
		if len(bindings) != 1 || bindings[0].ExternalID != "ext-primary-"+suffix {
			t.Fatalf("unexpected binding list: %+v", bindings)
		}

		syncRun, err := store.GetIntegrationSyncRun(ctx, scope, runOlderID)
		if err != nil {
			t.Fatalf("GetIntegrationSyncRun: %v", err)
		}
		if syncRun.Cursor != "cursor-old" {
			t.Fatalf("unexpected sync run: %+v", syncRun)
		}
		syncRuns, err := store.ListIntegrationSyncRuns(ctx, scope, "hris")
		if err != nil {
			t.Fatalf("ListIntegrationSyncRuns: %v", err)
		}
		if len(syncRuns) != 2 || syncRuns[0].ID != runNewerID || syncRuns[1].ID != runOlderID {
			t.Fatalf("unexpected sync run ordering: %+v", syncRuns)
		}

		checkpoints, err := store.ListIntegrationCheckpoints(ctx, scope, runOlderID)
		if err != nil {
			t.Fatalf("ListIntegrationCheckpoints: %v", err)
		}
		if len(checkpoints) != 2 || checkpoints[0].CheckpointKey != "watermark" || checkpoints[1].Cursor != "cursor-2" {
			t.Fatalf("unexpected checkpoints: %+v", checkpoints)
		}

		conflict, err := store.GetIntegrationConflict(ctx, scope, conflictResolvedID)
		if err != nil {
			t.Fatalf("GetIntegrationConflict: %v", err)
		}
		if conflict.Status != stores.IntegrationConflictStatusResolved {
			t.Fatalf("unexpected resolved conflict: %+v", conflict)
		}
		conflicts, err := store.ListIntegrationConflicts(ctx, scope, runOlderID, stores.IntegrationConflictStatusResolved)
		if err != nil {
			t.Fatalf("ListIntegrationConflicts: %v", err)
		}
		if len(conflicts) != 1 || conflicts[0].ID != conflictResolvedID {
			t.Fatalf("unexpected resolved conflicts: %+v", conflicts)
		}

		events, err := store.ListIntegrationChangeEvents(ctx, scope, agreement.ID)
		if err != nil {
			t.Fatalf("ListIntegrationChangeEvents: %v", err)
		}
		if len(events) != 2 || events[0].IdempotencyKey != "event-1-"+suffix || events[1].IdempotencyKey != "event-2-"+suffix {
			t.Fatalf("unexpected integration change events: %+v", events)
		}

		placement, err := store.GetPlacementRun(ctx, scope, agreement.ID, placementPrimaryID)
		if err != nil {
			t.Fatalf("GetPlacementRun: %v", err)
		}
		if placement.Status != stores.PlacementRunStatusCompleted {
			t.Fatalf("unexpected placement run: %+v", placement)
		}
		placements, err := store.ListPlacementRuns(ctx, scope, agreement.ID)
		if err != nil {
			t.Fatalf("ListPlacementRuns: %v", err)
		}
		if len(placements) != 1 || placements[0].ID != placementPrimaryID {
			t.Fatalf("unexpected placement runs: %+v", placements)
		}
	})
}

package fixtures

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/url"
	"path"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-uploader"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type LineageFixtureAssetKeys struct {
	UploadOnlySourceObjectKey     string `json:"upload_only_source_object_key"`
	ImportedV1SourceObjectKey     string `json:"imported_v1_source_object_key"`
	ImportedV1NormalizedObjectKey string `json:"imported_v1_normalized_object_key"`
	ImportedV2SourceObjectKey     string `json:"imported_v2_source_object_key"`
	ImportedV2NormalizedObjectKey string `json:"imported_v2_normalized_object_key"`
}

type LineageFixtureURLSet struct {
	UploadOnlyDocumentURL      string `json:"upload_only_document_url"`
	ImportedDocumentURL        string `json:"imported_document_url"`
	RepeatedImportDocumentURL  string `json:"repeated_import_document_url"`
	ImportedAgreementURL       string `json:"imported_agreement_url"`
	SourceBrowserURL           string `json:"source_browser_url"`
	SourceDetailURL            string `json:"source_detail_url"`
	SourceWorkspaceURL         string `json:"source_workspace_url"`
	SourceRevisionURL          string `json:"source_revision_url"`
	SourceCommentsURL          string `json:"source_comments_url"`
	SourceArtifactsURL         string `json:"source_artifacts_url"`
	SourceSearchURL            string `json:"source_search_url"`
	SourceSearchNormalizedURL  string `json:"source_search_normalized_url"`
	SourceSearchAgreementURL   string `json:"source_search_agreement_url"`
	SourceSearchCommentsURL    string `json:"source_search_comments_url"`
	ReconciliationQueueURL     string `json:"reconciliation_queue_url"`
	ReconciliationCandidateURL string `json:"reconciliation_candidate_url"`
}

var lineageFixtureNamespace = uuid.NameSpaceURL

func BuildLineageFixtureAssetKeys(scope stores.Scope) (LineageFixtureAssetKeys, error) {
	scope, err := normalizeFixtureScope(scope)
	if err != nil {
		return LineageFixtureAssetKeys{}, err
	}

	base := path.Join("tenant", scope.TenantID, "org", scope.OrgID, "docs", "lineage-fixtures")
	return LineageFixtureAssetKeys{
		UploadOnlySourceObjectKey:     path.Join(base, "upload-only.pdf"),
		ImportedV1SourceObjectKey:     path.Join(base, "google-v1.pdf"),
		ImportedV1NormalizedObjectKey: path.Join(base, "google-v1.normalized.pdf"),
		ImportedV2SourceObjectKey:     path.Join(base, "google-v2.pdf"),
		ImportedV2NormalizedObjectKey: path.Join(base, "google-v2.normalized.pdf"),
	}, nil
}

func BuildLineageFixtureURLs(basePath string, scope stores.Scope, set stores.LineageFixtureSet) (LineageFixtureURLSet, error) {
	scope, err := normalizeFixtureScope(scope)
	if err != nil {
		return LineageFixtureURLSet{}, err
	}

	basePath = "/" + strings.Trim(strings.TrimSpace(basePath), "/")
	if basePath == "/" {
		basePath = "/admin"
	}

	query := url.Values{
		"tenant_id": []string{scope.TenantID},
		"org_id":    []string{scope.OrgID},
	}.Encode()
	withQuery := func(resource, id string) string {
		id = strings.TrimSpace(id)
		if id == "" {
			return ""
		}
		return path.Join(basePath, "content", resource, id) + "?" + query
	}

	return LineageFixtureURLSet{
		UploadOnlyDocumentURL:      withQuery("esign_documents", set.UploadOnlyDocumentID),
		ImportedDocumentURL:        withQuery("esign_documents", set.ImportedDocumentID),
		RepeatedImportDocumentURL:  withQuery("esign_documents", set.RepeatedImportDocumentID),
		ImportedAgreementURL:       withQuery("esign_agreements", set.ImportedAgreementID),
		SourceBrowserURL:           path.Join(basePath, "esign", "sources") + "?" + query,
		SourceDetailURL:            path.Join(basePath, "esign", "sources", set.SourceDocumentID) + "?" + query,
		SourceWorkspaceURL:         path.Join(basePath, "esign", "sources", set.SourceDocumentID, "workspace") + "?" + query,
		SourceRevisionURL:          path.Join(basePath, "esign", "source-revisions", set.SecondSourceRevisionID) + "?" + query,
		SourceCommentsURL:          path.Join(basePath, "esign", "source-revisions", set.SecondSourceRevisionID, "comments") + "?" + query,
		SourceArtifactsURL:         path.Join(basePath, "esign", "source-revisions", set.SecondSourceRevisionID, "artifacts") + "?" + query,
		SourceSearchURL:            path.Join(basePath, "esign", "source-search") + "?" + query + "&q=fixture-google-file-legacy",
		SourceSearchNormalizedURL:  path.Join(basePath, "esign", "source-search") + "?" + query + "&q=fixture+normalized+text+for+repeated+revision",
		SourceSearchAgreementURL:   path.Join(basePath, "esign", "source-search") + "?" + query + "&q=Imported+Fixture+Agreement+Rev+2",
		SourceSearchCommentsURL:    path.Join(basePath, "esign", "source-search") + "?" + query + "&q=Need+legal+approval",
		ReconciliationQueueURL:     path.Join(basePath, "esign", "reconciliation-queue") + "?" + query,
		ReconciliationCandidateURL: path.Join(basePath, "esign", "reconciliation-queue", set.CandidateRelationshipID) + "?" + query,
	}, nil
}

func EnsureLineageQAFixtures(
	ctx context.Context,
	db bun.IDB,
	uploads *uploader.Manager,
	scope stores.Scope,
) (stores.LineageFixtureSet, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if db == nil {
		return stores.LineageFixtureSet{}, fmt.Errorf("lineage qa fixtures: db is required")
	}
	if uploads == nil {
		return stores.LineageFixtureSet{}, fmt.Errorf("lineage qa fixtures: upload manager is required")
	}

	scope, scopeErr := normalizeFixtureScope(scope)
	if scopeErr != nil {
		return stores.LineageFixtureSet{}, scopeErr
	}
	ids := buildLineageFixtureSet(scope)
	keys, keysErr := BuildLineageFixtureAssetKeys(scope)
	if keysErr != nil {
		return stores.LineageFixtureSet{}, keysErr
	}

	uploadOnlyPDF := fixtureBinary(1)
	importedV1PDF := fixtureBinary(3)
	importedV2PDF := fixtureBinary(4)

	if uploadErr := uploadLineageFixtureAssets(ctx, uploads, keys, uploadOnlyPDF, importedV1PDF, importedV2PDF); uploadErr != nil {
		return stores.LineageFixtureSet{}, uploadErr
	}

	firstNow := time.Date(2026, 3, 18, 12, 0, 0, 0, time.UTC)
	secondNow := firstNow.Add(2 * time.Hour)
	sourceCommentSyncPayload, payloadErr := buildLineageFixtureCommentSyncPayload(ids, secondNow)
	if payloadErr != nil {
		return stores.LineageFixtureSet{}, payloadErr
	}
	sourceCommentSyncPayloadSHA := sha256.Sum256(sourceCommentSyncPayload)

	if err := deleteFixtureRecords(ctx, db, ids); err != nil {
		return stores.LineageFixtureSet{}, err
	}
	if err := insertPrimaryLineageFixtures(ctx, db, scope, ids, keys, firstNow, secondNow, uploadOnlyPDF, importedV1PDF, importedV2PDF, sourceCommentSyncPayload, sourceCommentSyncPayloadSHA[:]); err != nil {
		return stores.LineageFixtureSet{}, err
	}
	if err := insertCandidateLineageFixtures(ctx, db, scope, ids, secondNow); err != nil {
		return stores.LineageFixtureSet{}, err
	}

	return ids, nil
}

func uploadLineageFixtureAssets(
	ctx context.Context,
	uploads *uploader.Manager,
	keys LineageFixtureAssetKeys,
	uploadOnlyPDF fixturePDFBinary,
	importedV1PDF fixturePDFBinary,
	importedV2PDF fixturePDFBinary,
) error {
	for _, upload := range []struct {
		key     string
		payload []byte
	}{
		{key: keys.UploadOnlySourceObjectKey, payload: uploadOnlyPDF.payload},
		{key: keys.ImportedV1SourceObjectKey, payload: importedV1PDF.payload},
		{key: keys.ImportedV1NormalizedObjectKey, payload: importedV1PDF.payload},
		{key: keys.ImportedV2SourceObjectKey, payload: importedV2PDF.payload},
		{key: keys.ImportedV2NormalizedObjectKey, payload: importedV2PDF.payload},
	} {
		if _, err := uploads.UploadFile(ctx, upload.key, upload.payload, uploader.WithContentType("application/pdf")); err != nil {
			return fmt.Errorf("lineage qa fixtures: upload %s: %w", strings.TrimSpace(upload.key), err)
		}
	}
	return nil
}

func buildLineageFixtureCommentSyncPayload(ids stores.LineageFixtureSet, secondNow time.Time) ([]byte, error) {
	payload, err := json.Marshal(services.SourceCommentSyncInput{
		SourceDocumentID: ids.SourceDocumentID,
		SourceRevisionID: ids.SecondSourceRevisionID,
		ProviderKind:     stores.SourceProviderKindGoogleDrive,
		SyncStatus:       services.SourceManagementCommentSyncSynced,
		AttemptedAt:      &secondNow,
		SyncedAt:         &secondNow,
		Threads: []services.SourceCommentProviderThread{{
			ProviderCommentID: "fixture-provider-comment-1",
			ThreadID:          "fixture-thread-1",
			Status:            stores.SourceCommentThreadStatusOpen,
			Anchor: services.SourceCommentProviderAnchor{
				Kind:  stores.SourceCommentAnchorKindPage,
				Label: "Page 2",
			},
			Author: services.SourceCommentProviderAuthor{
				DisplayName: "Fixture Reviewer",
				Email:       "reviewer@example.com",
				Type:        stores.SourceCommentAuthorTypeUser,
			},
			BodyText:       "Need legal approval",
			LastActivityAt: ptrTime(secondNow.Add(5 * time.Minute)),
			Messages: []services.SourceCommentProviderMessage{
				{
					ProviderMessageID: "fixture-provider-message-1",
					MessageKind:       stores.SourceCommentMessageKindComment,
					BodyText:          "Need legal approval",
					Author: services.SourceCommentProviderAuthor{
						DisplayName: "Fixture Reviewer",
						Email:       "reviewer@example.com",
						Type:        stores.SourceCommentAuthorTypeUser,
					},
					CreatedAt: &secondNow,
					UpdatedAt: &secondNow,
				},
				{
					ProviderMessageID:       "fixture-provider-message-2",
					ProviderParentMessageID: "fixture-provider-message-1",
					MessageKind:             stores.SourceCommentMessageKindReply,
					BodyText:                "Acknowledged by ops",
					Author: services.SourceCommentProviderAuthor{
						DisplayName: "Fixture Ops",
						Email:       "ops@example.com",
						Type:        stores.SourceCommentAuthorTypeUser,
					},
					CreatedAt: ptrTime(secondNow.Add(5 * time.Minute)),
					UpdatedAt: ptrTime(secondNow.Add(5 * time.Minute)),
				},
			},
		}},
	})
	if err != nil {
		return nil, fmt.Errorf("lineage qa fixtures: marshal source comment sync payload: %w", err)
	}
	return payload, nil
}

func insertPrimaryLineageFixtures(
	ctx context.Context,
	db bun.IDB,
	scope stores.Scope,
	ids stores.LineageFixtureSet,
	keys LineageFixtureAssetKeys,
	firstNow time.Time,
	secondNow time.Time,
	uploadOnlyPDF fixturePDFBinary,
	importedV1PDF fixturePDFBinary,
	importedV2PDF fixturePDFBinary,
	sourceCommentSyncPayload []byte,
	sourceCommentSyncPayloadSHA []byte,
) error {
	if err := executeFixtureInserts(ctx, db, uploadOnlyFixtureInserts(scope, ids, keys, firstNow, secondNow, uploadOnlyPDF, importedV1PDF)); err != nil {
		return err
	}
	if err := executeFixtureInserts(ctx, db, repeatedImportFixtureInserts(scope, ids, keys, secondNow, importedV2PDF)); err != nil {
		return err
	}
	return executeFixtureInserts(ctx, db, sourceCommentFixtureInserts(scope, ids, secondNow, sourceCommentSyncPayload, sourceCommentSyncPayloadSHA))
}

func uploadOnlyFixtureInserts(
	scope stores.Scope,
	ids stores.LineageFixtureSet,
	keys LineageFixtureAssetKeys,
	firstNow time.Time,
	secondNow time.Time,
	uploadOnlyPDF fixturePDFBinary,
	importedV1PDF fixturePDFBinary,
) []struct {
	label string
	query string
	args  []any
} {
	return []struct {
		label string
		query string
		args  []any
	}{
		{
			label: "insert upload-only document",
			query: `INSERT INTO documents (id, tenant_id, org_id, title, source_original_name, source_object_key, source_sha256, size_bytes, page_count, created_by_user_id, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			args: []any{ids.UploadOnlyDocumentID, scope.TenantID, scope.OrgID, "Upload Only Fixture", "upload-only.pdf", keys.UploadOnlySourceObjectKey, uploadOnlyPDF.sha256, uploadOnlyPDF.sizeBytes, uploadOnlyPDF.pageCount, "fixture-user", firstNow, firstNow},
		},
		{
			label: "insert source_document",
			query: `INSERT INTO source_documents (id, tenant_id, org_id, provider_kind, canonical_title, status, lineage_confidence, created_at, updated_at)
VALUES (?, ?, ?, 'google_drive', ?, 'active', 'exact', ?, ?)`,
			args: []any{ids.SourceDocumentID, scope.TenantID, scope.OrgID, "Imported Fixture Source", firstNow, firstNow},
		},
		{
			label: "insert legacy continuity handle",
			query: `INSERT INTO source_handles (id, tenant_id, org_id, source_document_id, provider_kind, external_file_id, account_id, drive_id, web_url, handle_status, valid_from, valid_to, created_at, updated_at)
VALUES (?, ?, ?, ?, 'google_drive', ?, ?, ?, ?, 'superseded', ?, ?, ?, ?)`,
			args: []any{ids.LegacySourceHandleID, scope.TenantID, scope.OrgID, ids.SourceDocumentID, "fixture-google-file-legacy", "fixture-account-legacy", "fixture-drive-root", "https://docs.google.com/document/d/fixture-google-file-legacy/edit", firstNow, secondNow, firstNow, secondNow},
		},
		{
			label: "insert active handle",
			query: `INSERT INTO source_handles (id, tenant_id, org_id, source_document_id, provider_kind, external_file_id, account_id, drive_id, web_url, handle_status, valid_from, valid_to, created_at, updated_at)
VALUES (?, ?, ?, ?, 'google_drive', ?, ?, ?, ?, 'active', ?, NULL, ?, ?)`,
			args: []any{ids.ActiveSourceHandleID, scope.TenantID, scope.OrgID, ids.SourceDocumentID, "fixture-google-file-1", "fixture-account-1", "fixture-drive-root", "https://docs.google.com/document/d/fixture-google-file-1/edit", firstNow, firstNow, firstNow},
		},
		{
			label: "insert first revision",
			query: `INSERT INTO source_revisions (id, tenant_id, org_id, source_document_id, source_handle_id, provider_revision_hint, modified_time, exported_at, exported_by_user_id, source_mime_type, metadata_json, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			args: []any{ids.FirstSourceRevisionID, scope.TenantID, scope.OrgID, ids.SourceDocumentID, ids.LegacySourceHandleID, "v1", firstNow, firstNow, "fixture-user", "application/vnd.google-apps.document", `{"origin":"native_google_import","revision_signature":"fixture-sig-v1"}`, firstNow, firstNow},
		},
		{
			label: "insert first artifact",
			query: `INSERT INTO source_artifacts (id, tenant_id, org_id, source_revision_id, artifact_kind, object_key, sha256, page_count, size_bytes, compatibility_tier, compatibility_reason, normalization_status, created_at, updated_at)
VALUES (?, ?, ?, ?, 'signable_pdf', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			args: []any{ids.FirstSourceArtifactID, scope.TenantID, scope.OrgID, ids.FirstSourceRevisionID, keys.ImportedV1SourceObjectKey, importedV1PDF.sha256, importedV1PDF.pageCount, importedV1PDF.sizeBytes, "full", "", "completed", firstNow, firstNow},
		},
		{
			label: "insert imported document",
			query: `INSERT INTO documents (id, tenant_id, org_id, title, source_original_name, source_object_key, normalized_object_key, source_sha256, size_bytes, page_count, source_type, source_google_file_id, source_google_doc_url, source_modified_time, source_exported_at, source_exported_by_user_id, source_mime_type, source_ingestion_mode, source_document_id, source_revision_id, source_artifact_id, created_by_user_id, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'google_drive', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			args: []any{ids.ImportedDocumentID, scope.TenantID, scope.OrgID, "Imported Fixture Source", "Imported Fixture Source.pdf", keys.ImportedV1SourceObjectKey, keys.ImportedV1NormalizedObjectKey, importedV1PDF.sha256, importedV1PDF.sizeBytes, importedV1PDF.pageCount, "fixture-google-file-1", "https://docs.google.com/document/d/fixture-google-file-1/edit", firstNow, firstNow, "fixture-user", "application/vnd.google-apps.document", "google_export_pdf", ids.SourceDocumentID, ids.FirstSourceRevisionID, ids.FirstSourceArtifactID, "fixture-user", firstNow, firstNow},
		},
		{
			label: "insert imported agreement",
			query: `INSERT INTO agreements (id, tenant_id, org_id, document_id, status, title, message, version, source_type, source_google_file_id, source_google_doc_url, source_modified_time, source_exported_at, source_exported_by_user_id, source_mime_type, source_ingestion_mode, source_revision_id, created_by_user_id, updated_by_user_id, created_at, updated_at)
VALUES (?, ?, ?, ?, 'draft', ?, ?, 1, 'google_drive', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			args: []any{ids.ImportedAgreementID, scope.TenantID, scope.OrgID, ids.ImportedDocumentID, "Imported Fixture Agreement", "Fixture agreement pinned to the first imported source revision.", "fixture-google-file-1", "https://docs.google.com/document/d/fixture-google-file-1/edit", firstNow, firstNow, "fixture-user", "application/vnd.google-apps.document", "google_export_pdf", ids.FirstSourceRevisionID, "fixture-user", "fixture-user", firstNow, firstNow},
		},
	}
}

func repeatedImportFixtureInserts(
	scope stores.Scope,
	ids stores.LineageFixtureSet,
	keys LineageFixtureAssetKeys,
	secondNow time.Time,
	importedV2PDF fixturePDFBinary,
) []struct {
	label string
	query string
	args  []any
} {
	return []struct {
		label string
		query string
		args  []any
	}{
		{
			label: "insert second revision",
			query: `INSERT INTO source_revisions (id, tenant_id, org_id, source_document_id, source_handle_id, provider_revision_hint, modified_time, exported_at, exported_by_user_id, source_mime_type, metadata_json, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			args: []any{ids.SecondSourceRevisionID, scope.TenantID, scope.OrgID, ids.SourceDocumentID, ids.ActiveSourceHandleID, "v2", secondNow, secondNow, "fixture-user", "application/vnd.google-apps.document", `{"origin":"native_google_import","revision_signature":"fixture-sig-v2"}`, secondNow, secondNow},
		},
		{
			label: "insert second artifact",
			query: `INSERT INTO source_artifacts (id, tenant_id, org_id, source_revision_id, artifact_kind, object_key, sha256, page_count, size_bytes, compatibility_tier, compatibility_reason, normalization_status, created_at, updated_at)
VALUES (?, ?, ?, ?, 'signable_pdf', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			args: []any{ids.SecondSourceArtifactID, scope.TenantID, scope.OrgID, ids.SecondSourceRevisionID, keys.ImportedV2SourceObjectKey, importedV2PDF.sha256, importedV2PDF.pageCount, importedV2PDF.sizeBytes, "full", "", "completed", secondNow, secondNow},
		},
		{
			label: "insert source fingerprint",
			query: `INSERT INTO source_fingerprints (id, tenant_id, org_id, source_revision_id, artifact_id, extract_version, status, raw_sha256, normalized_text_sha256, simhash64, minhash_json, chunk_hashes_json, extraction_metadata_json, error_code, error_message, token_count, created_at)
VALUES (?, ?, ?, ?, ?, ?, 'failed', ?, ?, '', '[]', '[]', ?, 'EXTRACTION_FAILED', 'PDF text extraction failed: document is encrypted or corrupted', 6, ?)`,
			args: []any{fixtureID(scope, "source-fingerprint"), scope.TenantID, scope.OrgID, ids.SecondSourceRevisionID, ids.SecondSourceArtifactID, stores.SourceExtractVersionPDFTextV1, strings.Repeat("b", 64), strings.Repeat("c", 64), `{"extractor":"ledongthuc/pdf","extract_version":"` + stores.SourceExtractVersionPDFTextV1 + `","normalized_text":"fixture normalized text for repeated revision","normalized_texts":["fixture normalized text for repeated revision"]}`, secondNow},
		},
		{
			label: "insert repeated-import document",
			query: `INSERT INTO documents (id, tenant_id, org_id, title, source_original_name, source_object_key, normalized_object_key, source_sha256, size_bytes, page_count, source_type, source_google_file_id, source_google_doc_url, source_modified_time, source_exported_at, source_exported_by_user_id, source_mime_type, source_ingestion_mode, source_document_id, source_revision_id, source_artifact_id, created_by_user_id, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'google_drive', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			args: []any{ids.RepeatedImportDocumentID, scope.TenantID, scope.OrgID, "Imported Fixture Source Rev 2", "Imported Fixture Source Rev 2.pdf", keys.ImportedV2SourceObjectKey, keys.ImportedV2NormalizedObjectKey, importedV2PDF.sha256, importedV2PDF.sizeBytes, importedV2PDF.pageCount, "fixture-google-file-1", "https://docs.google.com/document/d/fixture-google-file-1/edit", secondNow, secondNow, "fixture-user", "application/vnd.google-apps.document", "google_export_pdf", ids.SourceDocumentID, ids.SecondSourceRevisionID, ids.SecondSourceArtifactID, "fixture-user", secondNow, secondNow},
		},
		{
			label: "insert repeated imported agreement",
			query: `INSERT INTO agreements (id, tenant_id, org_id, document_id, status, title, message, version, source_type, source_google_file_id, source_google_doc_url, source_modified_time, source_exported_at, source_exported_by_user_id, source_mime_type, source_ingestion_mode, source_revision_id, created_by_user_id, updated_by_user_id, created_at, updated_at)
VALUES (?, ?, ?, ?, 'sent', ?, ?, 2, 'google_drive', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			args: []any{ids.RepeatedImportAgreementID, scope.TenantID, scope.OrgID, ids.RepeatedImportDocumentID, "Imported Fixture Agreement Rev 2", "Fixture agreement pinned to the repeated source revision.", "fixture-google-file-1", "https://docs.google.com/document/d/fixture-google-file-1/edit", secondNow, secondNow, "fixture-user", "application/vnd.google-apps.document", "google_export_pdf", ids.SecondSourceRevisionID, "fixture-user", "fixture-user", secondNow, secondNow},
		},
	}
}

func sourceCommentFixtureInserts(
	scope stores.Scope,
	ids stores.LineageFixtureSet,
	secondNow time.Time,
	sourceCommentSyncPayload []byte,
	sourceCommentSyncPayloadSHA []byte,
) []struct {
	label string
	query string
	args  []any
} {
	return []struct {
		label string
		query string
		args  []any
	}{
		{
			label: "insert source comment thread",
			query: `INSERT INTO source_comment_threads (id, tenant_id, org_id, source_document_id, source_revision_id, provider_kind, provider_comment_id, thread_id, status, anchor_kind, anchor_json, author_json, body_preview, message_count, reply_count, sync_status, last_synced_at, last_activity_at, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, 'google_drive', ?, ?, 'open', 'page', ?, ?, ?, 2, 1, 'synced', ?, ?, ?, ?)`,
			args: []any{fixtureID(scope, "source-comment-thread"), scope.TenantID, scope.OrgID, ids.SourceDocumentID, ids.SecondSourceRevisionID, "fixture-provider-comment-1", "fixture-thread-1", `{"kind":"page","label":"Page 2"}`, `{"display_name":"Fixture Reviewer","email":"reviewer@example.com","type":"user"}`, "Need legal approval", secondNow, secondNow, secondNow, secondNow},
		},
		{
			label: "insert source comment messages",
			query: `INSERT INTO source_comment_messages (id, tenant_id, org_id, source_comment_thread_id, source_revision_id, provider_message_id, provider_parent_message_id, message_kind, body_text, body_preview, author_json, created_at, updated_at)
VALUES
    (?, ?, ?, ?, ?, ?, '', 'comment', ?, ?, ?, ?, ?),
    (?, ?, ?, ?, ?, ?, ?, 'reply', ?, ?, ?, ?, ?)`,
			args: []any{fixtureID(scope, "source-comment-message-1"), scope.TenantID, scope.OrgID, fixtureID(scope, "source-comment-thread"), ids.SecondSourceRevisionID, "fixture-provider-message-1", "Need legal approval", "Need legal approval", `{"display_name":"Fixture Reviewer","email":"reviewer@example.com","type":"user"}`, secondNow, secondNow, fixtureID(scope, "source-comment-message-2"), scope.TenantID, scope.OrgID, fixtureID(scope, "source-comment-thread"), ids.SecondSourceRevisionID, "fixture-provider-message-2", "fixture-provider-message-1", "Acknowledged by ops", "Acknowledged by ops", `{"display_name":"Fixture Ops","email":"ops@example.com","type":"user"}`, secondNow.Add(5 * time.Minute), secondNow.Add(5 * time.Minute)},
		},
		{
			label: "insert source comment sync state",
			query: `INSERT INTO source_comment_sync_states (id, tenant_id, org_id, source_document_id, source_revision_id, provider_kind, sync_status, thread_count, message_count, payload_sha256, payload_json, last_attempt_at, last_synced_at, error_code, error_message, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, 'google_drive', 'synced', 1, 2, ?, ?, ?, ?, '', '', ?, ?)`,
			args: []any{fixtureID(scope, "source-comment-sync-state"), scope.TenantID, scope.OrgID, ids.SourceDocumentID, ids.SecondSourceRevisionID, hex.EncodeToString(sourceCommentSyncPayloadSHA), string(sourceCommentSyncPayload), secondNow, secondNow, secondNow, secondNow},
		},
	}
}

func insertCandidateLineageFixtures(
	ctx context.Context,
	db bun.IDB,
	scope stores.Scope,
	ids stores.LineageFixtureSet,
	secondNow time.Time,
) error {
	return executeFixtureInserts(ctx, db, []struct {
		label string
		query string
		args  []any
	}{
		{
			label: "insert candidate source_document",
			query: `INSERT INTO source_documents (id, tenant_id, org_id, provider_kind, canonical_title, status, lineage_confidence, created_at, updated_at)
VALUES (?, ?, ?, 'google_drive', ?, 'active', 'medium', ?, ?)`,
			args: []any{ids.CandidateSourceDocumentID, scope.TenantID, scope.OrgID, "Imported Fixture Source", secondNow, secondNow},
		},
		{
			label: "insert candidate handle",
			query: `INSERT INTO source_handles (id, tenant_id, org_id, source_document_id, provider_kind, external_file_id, account_id, drive_id, web_url, handle_status, valid_from, valid_to, created_at, updated_at)
VALUES (?, ?, ?, ?, 'google_drive', ?, ?, ?, ?, 'active', ?, NULL, ?, ?)`,
			args: []any{ids.CandidateSourceHandleID, scope.TenantID, scope.OrgID, ids.CandidateSourceDocumentID, "fixture-google-file-candidate", "fixture-account-2", "fixture-drive-root", "https://docs.google.com/document/d/fixture-google-file-candidate/edit", secondNow, secondNow, secondNow},
		},
		{
			label: "insert candidate relationship",
			query: `INSERT INTO source_relationships (id, tenant_id, org_id, left_source_document_id, right_source_document_id, relationship_type, confidence_band, confidence_score, status, evidence_json, created_by_user_id, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, 'same_logical_doc', 'medium', 0.72, 'pending_review', ?, ?, ?, ?)`,
			args: []any{ids.CandidateRelationshipID, scope.TenantID, scope.OrgID, ids.CandidateSourceDocumentID, ids.SourceDocumentID, `{"candidate_reason":"matching_title_with_partial_google_context"}`, "fixture-user", secondNow, secondNow},
		},
	})
}

func executeFixtureInserts(
	ctx context.Context,
	db bun.IDB,
	inserts []struct {
		label string
		query string
		args  []any
	},
) error {
	for _, insert := range inserts {
		if _, err := db.ExecContext(ctx, insert.query, insert.args...); err != nil {
			return fmt.Errorf("lineage qa fixtures: %s: %w", insert.label, err)
		}
	}
	return nil
}

func normalizeFixtureScope(scope stores.Scope) (stores.Scope, error) {
	scope.TenantID = strings.TrimSpace(scope.TenantID)
	scope.OrgID = strings.TrimSpace(scope.OrgID)
	if scope.TenantID == "" || scope.OrgID == "" {
		return stores.Scope{}, fmt.Errorf("lineage qa fixtures: tenant_id and org_id are required")
	}
	return scope, nil
}

func buildLineageFixtureSet(scope stores.Scope) stores.LineageFixtureSet {
	return stores.LineageFixtureSet{
		UploadOnlyDocumentID:      fixtureID(scope, "upload-only-document"),
		ImportedDocumentID:        fixtureID(scope, "imported-document"),
		ImportedAgreementID:       fixtureID(scope, "imported-agreement"),
		RepeatedImportAgreementID: fixtureID(scope, "repeated-import-agreement"),
		SourceDocumentID:          fixtureID(scope, "source-document"),
		LegacySourceHandleID:      fixtureID(scope, "legacy-source-handle"),
		ActiveSourceHandleID:      fixtureID(scope, "active-source-handle"),
		FirstSourceRevisionID:     fixtureID(scope, "first-source-revision"),
		FirstSourceArtifactID:     fixtureID(scope, "first-source-artifact"),
		RepeatedImportDocumentID:  fixtureID(scope, "repeated-import-document"),
		SecondSourceRevisionID:    fixtureID(scope, "second-source-revision"),
		SecondSourceArtifactID:    fixtureID(scope, "second-source-artifact"),
		CandidateSourceDocumentID: fixtureID(scope, "candidate-source-document"),
		CandidateSourceHandleID:   fixtureID(scope, "candidate-source-handle"),
		CandidateRelationshipID:   fixtureID(scope, "candidate-relationship"),
	}
}

func fixtureID(scope stores.Scope, label string) string {
	return uuid.NewSHA1(lineageFixtureNamespace, []byte(scope.TenantID+":"+scope.OrgID+":"+strings.TrimSpace(label))).String()
}

func deleteFixtureRecords(ctx context.Context, db bun.IDB, ids stores.LineageFixtureSet) error {
	for _, stmt := range []struct {
		query string
		args  []any
	}{
		{query: `DELETE FROM source_relationships WHERE id IN (?)`, args: []any{bun.List([]string{ids.CandidateRelationshipID})}},
		{query: `DELETE FROM source_comment_messages WHERE source_revision_id IN (?)`, args: []any{bun.List([]string{ids.SecondSourceRevisionID})}},
		{query: `DELETE FROM source_comment_threads WHERE source_revision_id IN (?)`, args: []any{bun.List([]string{ids.SecondSourceRevisionID})}},
		{query: `DELETE FROM source_comment_sync_states WHERE source_revision_id IN (?)`, args: []any{bun.List([]string{ids.SecondSourceRevisionID})}},
		{query: `DELETE FROM source_fingerprints WHERE source_revision_id IN (?)`, args: []any{bun.List([]string{ids.FirstSourceRevisionID, ids.SecondSourceRevisionID})}},
		{query: `DELETE FROM source_search_documents WHERE source_document_id IN (?)`, args: []any{bun.List([]string{ids.SourceDocumentID, ids.CandidateSourceDocumentID})}},
		{query: `DELETE FROM agreements WHERE id IN (?)`, args: []any{bun.List([]string{ids.ImportedAgreementID, ids.RepeatedImportAgreementID})}},
		{query: `DELETE FROM documents WHERE id IN (?)`, args: []any{bun.List([]string{ids.UploadOnlyDocumentID, ids.ImportedDocumentID, ids.RepeatedImportDocumentID})}},
		{query: `DELETE FROM source_artifacts WHERE id IN (?)`, args: []any{bun.List([]string{ids.FirstSourceArtifactID, ids.SecondSourceArtifactID})}},
		{query: `DELETE FROM source_revisions WHERE id IN (?)`, args: []any{bun.List([]string{ids.FirstSourceRevisionID, ids.SecondSourceRevisionID})}},
		{query: `DELETE FROM source_handles WHERE id IN (?)`, args: []any{bun.List([]string{ids.LegacySourceHandleID, ids.ActiveSourceHandleID, ids.CandidateSourceHandleID})}},
		{query: `DELETE FROM source_documents WHERE id IN (?)`, args: []any{bun.List([]string{ids.SourceDocumentID, ids.CandidateSourceDocumentID})}},
	} {
		if _, err := db.ExecContext(ctx, stmt.query, stmt.args...); err != nil {
			return fmt.Errorf("lineage qa fixtures: cleanup fixture records: %w", err)
		}
	}
	return nil
}

type fixturePDFBinary struct {
	payload   []byte
	sha256    string
	sizeBytes int
	pageCount int
}

func fixtureBinary(pageCount int) fixturePDFBinary {
	payload := services.GenerateDeterministicPDF(pageCount)
	sum := sha256.Sum256(payload)
	return fixturePDFBinary{
		payload:   payload,
		sha256:    hex.EncodeToString(sum[:]),
		sizeBytes: len(payload),
		pageCount: pageCount,
	}
}

func ptrTime(value time.Time) *time.Time {
	clone := value.UTC()
	return &clone
}

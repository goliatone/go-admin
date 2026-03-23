package fixtures

import (
	"context"
	"path/filepath"
	"testing"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	esignpersistence "github.com/goliatone/go-admin/examples/esign/internal/persistence"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-uploader"
	"github.com/uptrace/bun"
)

func TestEnsureLineageQAFixturesIsIdempotentAndUploadsArtifacts(t *testing.T) {
	ctx := context.Background()
	cfg := appcfg.Defaults()
	cfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectSQLite
	cfg.Persistence.Migrations.LocalOnly = true
	cfg.Persistence.SQLite.DSN = "file:" + filepath.Join(t.TempDir(), "lineage-fixtures.db") + "?_fk=1&_busy_timeout=5000"

	bootstrap, err := esignpersistence.Bootstrap(ctx, cfg)
	if err != nil {
		t.Fatalf("Bootstrap: %v", err)
	}
	t.Cleanup(func() { _ = bootstrap.Close() })

	scope := stores.Scope{TenantID: "tenant-bootstrap", OrgID: "org-bootstrap"}
	uploads := uploader.NewManager(uploader.WithProvider(uploader.NewFSProvider(t.TempDir())))

	first, err := EnsureLineageQAFixtures(ctx, bootstrap.BunDB, uploads, scope)
	if err != nil {
		t.Fatalf("EnsureLineageQAFixtures first: %v", err)
	}
	second, err := EnsureLineageQAFixtures(ctx, bootstrap.BunDB, uploads, scope)
	if err != nil {
		t.Fatalf("EnsureLineageQAFixtures second: %v", err)
	}
	if first != second {
		t.Fatalf("expected deterministic fixture ids, first=%+v second=%+v", first, second)
	}

	keys, err := BuildLineageFixtureAssetKeys(scope)
	if err != nil {
		t.Fatalf("BuildLineageFixtureAssetKeys: %v", err)
	}
	for _, key := range []string{
		keys.UploadOnlySourceObjectKey,
		keys.ImportedV1SourceObjectKey,
		keys.ImportedV1NormalizedObjectKey,
		keys.ImportedV2SourceObjectKey,
		keys.ImportedV2NormalizedObjectKey,
	} {
		payload, err := uploads.GetFile(ctx, key)
		if err != nil {
			t.Fatalf("GetFile %s: %v", key, err)
		}
		if len(payload) == 0 {
			t.Fatalf("expected payload for %s", key)
		}
	}

	var documents int
	if err := bootstrap.BunDB.NewRaw(`
SELECT COUNT(1)
FROM documents
WHERE id IN (?)
`, bun.In([]string{first.UploadOnlyDocumentID, first.ImportedDocumentID, first.RepeatedImportDocumentID})).Scan(ctx, &documents); err != nil {
		t.Fatalf("count seeded documents: %v", err)
	}
	if documents != 3 {
		t.Fatalf("expected 3 seeded documents, got %d", documents)
	}

	var handles int
	if err := bootstrap.BunDB.NewRaw(`
SELECT COUNT(1)
FROM source_handles
WHERE source_document_id = ?
`, first.SourceDocumentID).Scan(ctx, &handles); err != nil {
		t.Fatalf("count seeded source handles: %v", err)
	}
	if handles != 2 {
		t.Fatalf("expected 2 seeded source handles for multi-handle continuity, got %d", handles)
	}

	var revisionHandlePairs []struct {
		RevisionID     string `bun:"revision_id"`
		ExternalFileID string `bun:"external_file_id"`
		HandleStatus   string `bun:"handle_status"`
	}
	if err := bootstrap.BunDB.NewRaw(`
SELECT r.id AS revision_id, h.external_file_id, h.handle_status
FROM source_revisions r
JOIN source_handles h ON h.id = r.source_handle_id
WHERE r.source_document_id = ?
ORDER BY r.modified_time ASC, r.id ASC
`, first.SourceDocumentID).Scan(ctx, &revisionHandlePairs); err != nil {
		t.Fatalf("load seeded revision handles: %v", err)
	}
	if len(revisionHandlePairs) != 2 {
		t.Fatalf("expected 2 seeded revisions, got %+v", revisionHandlePairs)
	}
	if revisionHandlePairs[0].RevisionID != first.FirstSourceRevisionID || revisionHandlePairs[0].ExternalFileID != "fixture-google-file-legacy" || revisionHandlePairs[0].HandleStatus != stores.SourceHandleStatusSuperseded {
		t.Fatalf("expected first revision to remain pinned to the superseded legacy handle, got %+v", revisionHandlePairs[0])
	}
	if revisionHandlePairs[1].RevisionID != first.SecondSourceRevisionID || revisionHandlePairs[1].ExternalFileID != "fixture-google-file-1" || revisionHandlePairs[1].HandleStatus != stores.SourceHandleStatusActive {
		t.Fatalf("expected second revision to resolve through the active handle, got %+v", revisionHandlePairs[1])
	}

	urls, err := BuildLineageFixtureURLs("/admin", scope, first)
	if err != nil {
		t.Fatalf("BuildLineageFixtureURLs: %v", err)
	}
	if urls.UploadOnlyDocumentURL == "" || urls.ImportedAgreementURL == "" {
		t.Fatalf("expected detail urls, got %+v", urls)
	}
	if urls.SourceBrowserURL == "" || urls.SourceDetailURL == "" || urls.SourceRevisionURL == "" || urls.SourceSearchURL == "" {
		t.Fatalf("expected source-management runtime urls, got %+v", urls)
	}
}

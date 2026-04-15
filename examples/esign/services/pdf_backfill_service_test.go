package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"path/filepath"
	"strings"
	"testing"
	"time"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	esignpersistence "github.com/goliatone/go-admin/examples/esign/internal/persistence"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-uploader"
)

func TestPDFBackfillServiceRunIsIdempotent(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	objects := uploader.NewManager(uploader.WithProvider(uploader.NewFSProvider(t.TempDir())))
	source := GenerateDeterministicPDF(2)
	now := time.Date(2026, 3, 7, 10, 0, 0, 0, time.UTC)

	document := createLegacyBackfillDocument(t, ctx, store, scope, "doc-backfill-1", "tenant/tenant-1/org/org-1/docs/doc-backfill-1/source.pdf", source, now)
	if _, err := objects.UploadFile(ctx, document.SourceObjectKey, source, uploader.WithContentType("application/pdf")); err != nil {
		t.Fatalf("upload source pdf: %v", err)
	}

	service := NewPDFBackfillService(store, objects, WithPDFBackfillClock(func() time.Time { return now }))
	first, err := service.Run(ctx, scope, PDFBackfillInput{})
	if err != nil {
		t.Fatalf("Run first: %v", err)
	}
	if first.Scanned != 1 || first.Updated != 1 || first.Failed != 0 {
		t.Fatalf("expected first backfill scan/update, got %+v", first)
	}
	updated, err := store.Get(ctx, scope, document.ID)
	if err != nil {
		t.Fatalf("Get updated: %v", err)
	}
	if updated.PDFCompatibilityTier == "" || updated.PDFPolicyVersion == "" {
		t.Fatalf("expected derived pdf metadata after backfill, got %+v", updated)
	}
	if strings.TrimSpace(updated.NormalizedObjectKey) == "" {
		t.Fatalf("expected normalized object key after backfill, got %+v", updated)
	}
	_, getFileErr := objects.GetFile(ctx, updated.NormalizedObjectKey)
	if getFileErr != nil {
		t.Fatalf("expected normalized payload persisted: %v", getFileErr)
	}

	second, err := service.Run(ctx, scope, PDFBackfillInput{})
	if err != nil {
		t.Fatalf("Run second: %v", err)
	}
	if second.Scanned != 1 || second.Updated != 0 || second.Skipped != 1 || second.Failed != 0 {
		t.Fatalf("expected idempotent second run with skip, got %+v", second)
	}
}

func TestPDFBackfillServiceRelationalSQLiteMigrationSmoke(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-smoke", OrgID: "org-smoke"}
	dsn := "file:" + filepath.Join(t.TempDir(), "pdf_backfill_smoke.db") + "?_busy_timeout=5000&_foreign_keys=on"
	cfg := appcfg.Defaults()
	cfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectSQLite
	cfg.Persistence.Migrations.LocalOnly = true
	cfg.Persistence.SQLite.DSN = dsn
	cfg.Persistence.Postgres.DSN = ""

	sqliteStore, cleanup, err := esignpersistence.OpenStore(ctx, cfg)
	if err != nil {
		t.Fatalf("OpenStore: %v", err)
	}
	defer func() {
		if cleanup != nil {
			_ = cleanup()
		}
	}()

	objects := uploader.NewManager(uploader.WithProvider(uploader.NewFSProvider(t.TempDir())))
	source := GenerateDeterministicPDF(1)
	now := time.Date(2026, 3, 7, 10, 30, 0, 0, time.UTC)
	doc := createLegacyBackfillDocument(t, ctx, sqliteStore, scope, "doc-sqlite-smoke", "tenant/tenant-smoke/org/org-smoke/docs/doc-sqlite-smoke/source.pdf", source, now)
	_, uploadErr := objects.UploadFile(ctx, doc.SourceObjectKey, source, uploader.WithContentType("application/pdf"))
	if uploadErr != nil {
		t.Fatalf("upload source pdf: %v", uploadErr)
	}

	service := NewPDFBackfillService(sqliteStore, objects, WithPDFBackfillClock(func() time.Time { return now }))
	result, err := service.Run(ctx, scope, PDFBackfillInput{})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	if result.Scanned != 1 || result.Updated != 1 || result.Failed != 0 {
		t.Fatalf("expected sqlite smoke backfill update, got %+v", result)
	}

	if cleanup != nil {
		cleanupErr := cleanup()
		if cleanupErr != nil {
			t.Fatalf("close relational store: %v", cleanupErr)
		}
		cleanup = nil
	}
	reloaded, reloadCleanup, err := esignpersistence.OpenStore(ctx, cfg)
	if err != nil {
		t.Fatalf("reopen relational store: %v", err)
	}
	defer func() {
		if reloadCleanup != nil {
			_ = reloadCleanup()
		}
	}()

	reloadedDoc, err := reloaded.Get(ctx, scope, doc.ID)
	if err != nil {
		t.Fatalf("Get reloaded doc: %v", err)
	}
	if strings.TrimSpace(reloadedDoc.PDFCompatibilityTier) == "" || strings.TrimSpace(reloadedDoc.PDFPolicyVersion) == "" {
		t.Fatalf("expected persisted pdf metadata in sqlite smoke, got %+v", reloadedDoc)
	}
}

func TestPDFBackfillServiceFlagsSourceDigestMismatch(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	objects := uploader.NewManager(uploader.WithProvider(uploader.NewFSProvider(t.TempDir())))
	source := GenerateDeterministicPDF(1)
	now := time.Date(2026, 3, 7, 12, 0, 0, 0, time.UTC)

	document := createLegacyBackfillDocument(t, ctx, store, scope, "doc-backfill-mismatch", "tenant/tenant-1/org/org-1/docs/doc-backfill-mismatch/source.pdf", source, now)
	tampered := append([]byte{}, source...)
	tampered = append(tampered, []byte("\n%tampered\n")...)
	if _, err := objects.UploadFile(ctx, document.SourceObjectKey, tampered, uploader.WithContentType("application/pdf")); err != nil {
		t.Fatalf("upload tampered source pdf: %v", err)
	}

	service := NewPDFBackfillService(store, objects, WithPDFBackfillClock(func() time.Time { return now }))
	result, err := service.Run(ctx, scope, PDFBackfillInput{})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	if result.Updated != 1 || result.Failed != 0 {
		t.Fatalf("expected metadata update with digest mismatch classification, got %+v", result)
	}
	updated, err := store.Get(ctx, scope, document.ID)
	if err != nil {
		t.Fatalf("Get updated: %v", err)
	}
	if updated.PDFCompatibilityReason != pdfBackfillReasonSourceDigestMismatch {
		t.Fatalf("expected digest mismatch reason %q, got %q", pdfBackfillReasonSourceDigestMismatch, updated.PDFCompatibilityReason)
	}
	if updated.PDFCompatibilityTier != string(PDFCompatibilityTierUnsupported) {
		t.Fatalf("expected unsupported tier for digest mismatch, got %q", updated.PDFCompatibilityTier)
	}
}

func createLegacyBackfillDocument(t *testing.T, ctx context.Context, store stores.DocumentStore, scope stores.Scope, id, objectKey string, source []byte, now time.Time) stores.DocumentRecord {
	t.Helper()
	sum := sha256.Sum256(source)
	record, err := store.Create(ctx, scope, stores.DocumentRecord{
		ID:                 id,
		Title:              "Legacy Backfill Source",
		SourceObjectKey:    objectKey,
		SourceOriginalName: "source.pdf",
		SourceSHA256:       hex.EncodeToString(sum[:]),
		SourceType:         stores.SourceTypeUpload,
		SizeBytes:          int64(len(source)),
		PageCount:          1,
		CreatedAt:          now,
		UpdatedAt:          now,
		PDFPolicyVersion:   "",
	})
	if err != nil {
		t.Fatalf("Create legacy document: %v", err)
	}
	return record
}

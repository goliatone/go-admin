package services

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strings"
	"time"

	"github.com/goliatone/go-uploader"
	"github.com/ledongthuc/pdf"

	"github.com/goliatone/go-admin/examples/esign/stores"
	goerrors "github.com/goliatone/go-errors"
)

// DocumentUploadInput contains the minimum source data required to persist a document.
type DocumentUploadInput struct {
	ID                     string
	Title                  string
	ObjectKey              string
	PDF                    []byte
	CreatedBy              string
	UploadedAt             time.Time
	SourceType             string
	SourceGoogleFileID     string
	SourceGoogleDocURL     string
	SourceModifiedTime     *time.Time
	SourceExportedAt       *time.Time
	SourceExportedByUserID string
}

// DocumentMetadata captures extracted immutable source PDF metadata.
type DocumentMetadata struct {
	SHA256    string
	SizeBytes int64
	PageCount int
}

// DocumentService validates uploaded PDFs, extracts metadata, and persists document records.
type DocumentService struct {
	store       stores.DocumentStore
	objectStore documentObjectStore
	now         func() time.Time
}

// DocumentServiceOption customizes document service behavior.
type DocumentServiceOption func(*DocumentService)

type documentObjectStore interface {
	UploadFile(ctx context.Context, path string, content []byte, opts ...uploader.UploadOption) (string, error)
	GetFile(ctx context.Context, path string) ([]byte, error)
}

// WithDocumentClock sets the service clock.
func WithDocumentClock(now func() time.Time) DocumentServiceOption {
	return func(s *DocumentService) {
		if s == nil || now == nil {
			return
		}
		s.now = now
	}
}

// WithDocumentObjectStore configures immutable PDF blob persistence for document uploads/imports.
func WithDocumentObjectStore(store documentObjectStore) DocumentServiceOption {
	return func(s *DocumentService) {
		if s == nil {
			return
		}
		s.objectStore = store
	}
}

func NewDocumentService(store stores.Store, opts ...DocumentServiceOption) DocumentService {
	svc := DocumentService{
		store: store,
		now:   func() time.Time { return time.Now().UTC() },
	}
	for _, opt := range opts {
		if opt == nil {
			continue
		}
		opt(&svc)
	}
	return svc
}

// Upload validates source PDF bytes and persists immutable metadata.
func (s DocumentService) Upload(ctx context.Context, scope stores.Scope, input DocumentUploadInput) (stores.DocumentRecord, error) {
	if s.store == nil {
		return stores.DocumentRecord{}, domainValidationError("documents", "store", "not configured")
	}
	objectKey := strings.TrimSpace(input.ObjectKey)
	if objectKey == "" {
		return stores.DocumentRecord{}, domainValidationError("documents", "source_object_key", "required")
	}

	payload := append([]byte{}, input.PDF...)
	metadata, err := ExtractPDFMetadata(payload)
	if err != nil {
		return stores.DocumentRecord{}, err
	}
	if s.objectStore != nil {
		if _, err := s.objectStore.UploadFile(ctx, objectKey, payload,
			uploader.WithContentType("application/pdf"),
			uploader.WithCacheControl("no-store, no-cache, max-age=0, must-revalidate, private"),
		); err != nil {
			return stores.DocumentRecord{}, domainValidationError("documents", "object_store", "persist source pdf failed")
		}
		stored, err := s.objectStore.GetFile(ctx, objectKey)
		if err != nil || len(stored) == 0 {
			return stores.DocumentRecord{}, domainValidationError("documents", "object_store", "persisted source pdf is unavailable")
		}
		sum := sha256.Sum256(stored)
		if hex.EncodeToString(sum[:]) != metadata.SHA256 {
			return stores.DocumentRecord{}, domainValidationError("documents", "object_store", "persisted source pdf digest mismatch")
		}
	}

	now := s.now()
	if !input.UploadedAt.IsZero() {
		now = input.UploadedAt.UTC()
	}
	title := strings.TrimSpace(input.Title)
	if title == "" {
		title = "Untitled Document"
	}

	return s.store.Create(ctx, scope, stores.DocumentRecord{
		ID:                     strings.TrimSpace(input.ID),
		Title:                  title,
		SourceObjectKey:        objectKey,
		SourceSHA256:           metadata.SHA256,
		SourceType:             strings.TrimSpace(input.SourceType),
		SourceGoogleFileID:     strings.TrimSpace(input.SourceGoogleFileID),
		SourceGoogleDocURL:     strings.TrimSpace(input.SourceGoogleDocURL),
		SourceModifiedTime:     input.SourceModifiedTime,
		SourceExportedAt:       input.SourceExportedAt,
		SourceExportedByUserID: strings.TrimSpace(input.SourceExportedByUserID),
		SizeBytes:              metadata.SizeBytes,
		PageCount:              metadata.PageCount,
		CreatedAt:              now,
		UpdatedAt:              now,
	})
}

// ExtractPDFMetadata validates bytes as PDF and extracts deterministic metadata.
func ExtractPDFMetadata(raw []byte) (DocumentMetadata, error) {
	if len(bytes.TrimSpace(raw)) == 0 {
		return DocumentMetadata{}, domainValidationError("documents", "pdf", "required")
	}
	payload := append([]byte{}, raw...)
	reader, err := pdf.NewReader(bytes.NewReader(payload), int64(len(payload)))
	if err != nil {
		return DocumentMetadata{}, invalidPDFError("parse failed")
	}
	pageCount := reader.NumPage()
	if pageCount <= 0 {
		return DocumentMetadata{}, invalidPDFError("missing pages")
	}

	sum := sha256.Sum256(payload)
	return DocumentMetadata{
		SHA256:    hex.EncodeToString(sum[:]),
		SizeBytes: int64(len(payload)),
		PageCount: pageCount,
	}, nil
}

func invalidPDFError(reason string) error {
	return goerrors.New("invalid pdf payload", goerrors.CategoryValidation).
		WithCode(http.StatusBadRequest).
		WithTextCode(string(ErrorCodeMissingRequiredFields)).
		WithMetadata(map[string]any{"entity": "documents", "field": "pdf", "reason": strings.TrimSpace(reason)})
}

func domainValidationError(entity, field, reason string) error {
	meta := map[string]any{"entity": strings.TrimSpace(entity), "field": strings.TrimSpace(field)}
	if strings.TrimSpace(reason) != "" {
		meta["reason"] = strings.TrimSpace(reason)
	}
	return goerrors.New("invalid input", goerrors.CategoryValidation).
		WithCode(http.StatusBadRequest).
		WithTextCode(string(ErrorCodeMissingRequiredFields)).
		WithMetadata(meta)
}

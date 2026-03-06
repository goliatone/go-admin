package services

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"
	"time"
	"unicode"

	"github.com/goliatone/go-admin/examples/esign/stores"
	goerrors "github.com/goliatone/go-errors"
	"github.com/goliatone/go-uploader"
	"github.com/google/uuid"
)

const (
	defaultSavedSignatureLimitPerType = 10
	defaultSavedSignatureMaxPNGBytes  = 512 * 1024
	defaultSavedSignatureMaxLabelLen  = 100
)

// SavedSignatureLimitResolver resolves per-subject signature library limits.
type SavedSignatureLimitResolver func(ctx context.Context, scope stores.Scope, subject, signatureType string) int

type signerSavedSignatureObjectStore interface {
	UploadFile(ctx context.Context, path string, content []byte, opts ...uploader.UploadOption) (string, error)
}

// SavedSignerSignature captures the API payload shape for signer saved signatures.
type SavedSignerSignature struct {
	ID               string `json:"id"`
	Type             string `json:"type"`
	Label            string `json:"label,omitempty"`
	ThumbnailDataURL string `json:"thumbnail_data_url"`
	DataURL          string `json:"data_url,omitempty"`
	CreatedAt        string `json:"created_at"`
}

// SaveSignerSignatureInput captures create payload for a saved signer signature.
type SaveSignerSignatureInput struct {
	Type    string `json:"type"`
	Label   string `json:"label,omitempty"`
	DataURL string `json:"data_url"`
}

// SignerSavedSignatureServiceOption customizes saved-signature service behavior.
type SignerSavedSignatureServiceOption func(*SignerSavedSignatureService)

// WithSignerSavedSignatureClock overrides time source.
func WithSignerSavedSignatureClock(now func() time.Time) SignerSavedSignatureServiceOption {
	return func(s *SignerSavedSignatureService) {
		if s == nil || now == nil {
			return
		}
		s.now = now
	}
}

// WithSignerSavedSignatureDefaultLimit overrides default per-type signature cap.
func WithSignerSavedSignatureDefaultLimit(limit int) SignerSavedSignatureServiceOption {
	return func(s *SignerSavedSignatureService) {
		if s == nil || limit <= 0 {
			return
		}
		s.defaultLimitPerType = limit
	}
}

// WithSignerSavedSignatureLimitResolver configures per-subject limit overrides.
func WithSignerSavedSignatureLimitResolver(resolver SavedSignatureLimitResolver) SignerSavedSignatureServiceOption {
	return func(s *SignerSavedSignatureService) {
		if s == nil || resolver == nil {
			return
		}
		s.limitResolver = resolver
	}
}

// WithSignerSavedSignatureMaxPNGBytes sets max decoded PNG bytes.
func WithSignerSavedSignatureMaxPNGBytes(max int) SignerSavedSignatureServiceOption {
	return func(s *SignerSavedSignatureService) {
		if s == nil || max <= 0 {
			return
		}
		s.maxPNGBytes = max
	}
}

// WithSignerSavedSignatureMaxLabelLen sets max label length.
func WithSignerSavedSignatureMaxLabelLen(max int) SignerSavedSignatureServiceOption {
	return func(s *SignerSavedSignatureService) {
		if s == nil || max <= 0 {
			return
		}
		s.maxLabelLen = max
	}
}

// WithSignerSavedSignatureObjectStore configures optional canonical PNG object upload.
func WithSignerSavedSignatureObjectStore(store signerSavedSignatureObjectStore) SignerSavedSignatureServiceOption {
	return func(s *SignerSavedSignatureService) {
		if s == nil {
			return
		}
		s.objectStore = store
	}
}

// SignerSavedSignatureService orchestrates signer-scoped reusable signature CRUD operations.
type SignerSavedSignatureService struct {
	store               stores.SavedSignerSignatureStore
	now                 func() time.Time
	defaultLimitPerType int
	limitResolver       SavedSignatureLimitResolver
	maxPNGBytes         int
	maxLabelLen         int
	objectStore         signerSavedSignatureObjectStore
}

// NewSignerSavedSignatureService creates a saved-signature service.
func NewSignerSavedSignatureService(store stores.SavedSignerSignatureStore, opts ...SignerSavedSignatureServiceOption) SignerSavedSignatureService {
	svc := SignerSavedSignatureService{
		store:               store,
		now:                 func() time.Time { return time.Now().UTC() },
		defaultLimitPerType: defaultSavedSignatureLimitPerType,
		maxPNGBytes:         defaultSavedSignatureMaxPNGBytes,
		maxLabelLen:         defaultSavedSignatureMaxLabelLen,
	}
	for _, opt := range opts {
		if opt == nil {
			continue
		}
		opt(&svc)
	}
	if svc.defaultLimitPerType <= 0 {
		svc.defaultLimitPerType = defaultSavedSignatureLimitPerType
	}
	if svc.maxPNGBytes <= 0 {
		svc.maxPNGBytes = defaultSavedSignatureMaxPNGBytes
	}
	if svc.maxLabelLen <= 0 {
		svc.maxLabelLen = defaultSavedSignatureMaxLabelLen
	}
	return svc
}

// ListSavedSignatures lists signer-scoped reusable signatures filtered by type.
func (s SignerSavedSignatureService) ListSavedSignatures(ctx context.Context, scope stores.Scope, subject, signatureType string) ([]SavedSignerSignature, error) {
	if s.store == nil {
		return nil, goerrors.New("saved signature store not configured", goerrors.CategoryBadInput).
			WithCode(http.StatusNotImplemented).
			WithTextCode(string(ErrorCodeInvalidSignerState))
	}
	subject = normalizeSavedSignatureSubject(subject)
	signatureType, err := normalizeSavedSignatureType(signatureType)
	if err != nil {
		return nil, err
	}
	if subject == "" {
		return nil, domainValidationError("saved_signatures", "subject", "required")
	}
	rows, err := s.store.ListSavedSignerSignatures(ctx, scope, subject, signatureType)
	if err != nil {
		return nil, err
	}
	out := make([]SavedSignerSignature, 0, len(rows))
	for _, row := range rows {
		out = append(out, savedSignerSignatureFromRecord(row))
	}
	return out, nil
}

// SaveSignature validates and stores a signer-scoped reusable signature/initials payload.
func (s SignerSavedSignatureService) SaveSignature(ctx context.Context, scope stores.Scope, subject string, input SaveSignerSignatureInput) (SavedSignerSignature, error) {
	if s.store == nil {
		return SavedSignerSignature{}, goerrors.New("saved signature store not configured", goerrors.CategoryBadInput).
			WithCode(http.StatusNotImplemented).
			WithTextCode(string(ErrorCodeInvalidSignerState))
	}
	subject = normalizeSavedSignatureSubject(subject)
	signatureType, err := normalizeSavedSignatureType(input.Type)
	if err != nil {
		return SavedSignerSignature{}, err
	}
	if subject == "" {
		return SavedSignerSignature{}, domainValidationError("saved_signatures", "subject", "required")
	}
	label, err := sanitizeSavedSignatureLabel(input.Label, s.maxLabelLen)
	if err != nil {
		return SavedSignerSignature{}, err
	}
	canonicalDataURL, pngPayload, err := normalizePNGDataURL(input.DataURL, s.maxPNGBytes)
	if err != nil {
		return SavedSignerSignature{}, err
	}

	limit := s.resolveLimit(ctx, scope, subject, signatureType)
	currentCount, err := s.store.CountSavedSignerSignatures(ctx, scope, subject, signatureType)
	if err != nil {
		return SavedSignerSignature{}, err
	}
	if currentCount >= limit {
		return SavedSignerSignature{}, goerrors.New("saved signature limit reached", goerrors.CategoryConflict).
			WithCode(http.StatusConflict).
			WithTextCode(string(ErrorCodeSignatureLibraryLimit)).
			WithMetadata(map[string]any{
				"entity":        "saved_signatures",
				"field":         "limit",
				"type":          signatureType,
				"limit":         limit,
				"current_count": currentCount,
			})
	}

	now := s.now().UTC()
	record := stores.SavedSignerSignatureRecord{
		Subject:          subject,
		Type:             signatureType,
		Label:            label,
		ThumbnailDataURL: canonicalDataURL,
		CreatedAt:        now,
	}
	if s.objectStore != nil {
		objectKey, uploadErr := s.storeSignaturePNG(ctx, scope, subject, signatureType, now, pngPayload)
		if uploadErr != nil {
			return SavedSignerSignature{}, uploadErr
		}
		record.ObjectKey = objectKey
	}

	stored, err := s.store.CreateSavedSignerSignature(ctx, scope, record)
	if err != nil {
		return SavedSignerSignature{}, err
	}
	return savedSignerSignatureFromRecord(stored), nil
}

// DeleteSavedSignature removes a signer-scoped saved signature by id.
func (s SignerSavedSignatureService) DeleteSavedSignature(ctx context.Context, scope stores.Scope, subject, signatureID string) error {
	if s.store == nil {
		return goerrors.New("saved signature store not configured", goerrors.CategoryBadInput).
			WithCode(http.StatusNotImplemented).
			WithTextCode(string(ErrorCodeInvalidSignerState))
	}
	subject = normalizeSavedSignatureSubject(subject)
	signatureID = strings.TrimSpace(signatureID)
	if subject == "" {
		return domainValidationError("saved_signatures", "subject", "required")
	}
	if signatureID == "" {
		return domainValidationError("saved_signatures", "id", "required")
	}
	err := s.store.DeleteSavedSignerSignature(ctx, scope, subject, signatureID)
	if err != nil && isNotFoundError(err) {
		return nil
	}
	return err
}

func (s SignerSavedSignatureService) resolveLimit(ctx context.Context, scope stores.Scope, subject, signatureType string) int {
	limit := s.defaultLimitPerType
	if s.limitResolver != nil {
		if override := s.limitResolver(ctx, scope, subject, signatureType); override > 0 {
			limit = override
		}
	}
	if limit <= 0 {
		return defaultSavedSignatureLimitPerType
	}
	return limit
}

func (s SignerSavedSignatureService) storeSignaturePNG(ctx context.Context, scope stores.Scope, subject, signatureType string, now time.Time, payload []byte) (string, error) {
	if s.objectStore == nil {
		return "", nil
	}
	digest := sha256.Sum256(payload)
	subjectHash := sha256.Sum256([]byte(subject))
	objectKey := fmt.Sprintf(
		"tenant/%s/org/%s/signatures/library/%s/%s/%s-%d.png",
		scope.TenantID,
		scope.OrgID,
		signatureType,
		hex.EncodeToString(subjectHash[:8]),
		uuid.NewString(),
		now.UnixMilli(),
	)
	storedKey, err := s.objectStore.UploadFile(ctx, objectKey, payload)
	if err != nil {
		return "", goerrors.New("failed to persist saved signature object", goerrors.CategoryBadInput).
			WithCode(http.StatusBadGateway).
			WithTextCode(string(ErrorCodeInvalidSignerState)).
			WithMetadata(map[string]any{"sha256": hex.EncodeToString(digest[:])})
	}
	return strings.TrimSpace(storedKey), nil
}

func savedSignerSignatureFromRecord(record stores.SavedSignerSignatureRecord) SavedSignerSignature {
	thumbnail := strings.TrimSpace(record.ThumbnailDataURL)
	return SavedSignerSignature{
		ID:               strings.TrimSpace(record.ID),
		Type:             strings.TrimSpace(record.Type),
		Label:            strings.TrimSpace(record.Label),
		ThumbnailDataURL: thumbnail,
		DataURL:          thumbnail,
		CreatedAt:        record.CreatedAt.UTC().Format(time.RFC3339Nano),
	}
}

func normalizeSavedSignatureSubject(subject string) string {
	return strings.ToLower(strings.TrimSpace(subject))
}

func normalizeSavedSignatureType(signatureType string) (string, error) {
	normalized := strings.ToLower(strings.TrimSpace(signatureType))
	switch normalized {
	case stores.FieldTypeSignature, stores.FieldTypeInitials:
		return normalized, nil
	default:
		return "", domainValidationError("saved_signatures", "type", "must be signature or initials")
	}
}

func sanitizeSavedSignatureLabel(label string, maxLen int) (string, error) {
	label = strings.TrimSpace(label)
	if label == "" {
		return "", nil
	}
	filtered := strings.Map(func(r rune) rune {
		if r == '\n' || r == '\r' || r == '\t' {
			return ' '
		}
		if unicode.IsControl(r) {
			return -1
		}
		return r
	}, label)
	filtered = strings.TrimSpace(filtered)
	if maxLen > 0 && len(filtered) > maxLen {
		return "", domainValidationError("saved_signatures", "label", fmt.Sprintf("max length %d", maxLen))
	}
	return filtered, nil
}

func normalizePNGDataURL(raw string, maxPNGBytes int) (string, []byte, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", nil, domainValidationError("saved_signatures", "data_url", "required")
	}
	parts := strings.SplitN(raw, ",", 2)
	if len(parts) != 2 {
		return "", nil, domainValidationError("saved_signatures", "data_url", "invalid data url")
	}
	head := strings.ToLower(strings.TrimSpace(parts[0]))
	if head != "data:image/png;base64" {
		return "", nil, domainValidationError("saved_signatures", "data_url", "must be data:image/png;base64")
	}
	payload := strings.TrimSpace(parts[1])
	if payload == "" {
		return "", nil, domainValidationError("saved_signatures", "data_url", "missing payload")
	}
	decoded, err := base64.StdEncoding.DecodeString(payload)
	if err != nil {
		return "", nil, domainValidationError("saved_signatures", "data_url", "invalid base64 payload")
	}
	if len(decoded) == 0 {
		return "", nil, domainValidationError("saved_signatures", "data_url", "empty payload")
	}
	if maxPNGBytes > 0 && len(decoded) > maxPNGBytes {
		return "", nil, domainValidationError("saved_signatures", "data_url", fmt.Sprintf("payload exceeds %d bytes", maxPNGBytes))
	}
	if !isPNGPayload(decoded) {
		return "", nil, domainValidationError("saved_signatures", "data_url", "payload is not PNG")
	}
	encoded := base64.StdEncoding.EncodeToString(decoded)
	return "data:image/png;base64," + encoded, decoded, nil
}

func isPNGPayload(payload []byte) bool {
	if len(payload) < 8 {
		return false
	}
	signature := []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}
	for i := range signature {
		if payload[i] != signature[i] {
			return false
		}
	}
	return true
}

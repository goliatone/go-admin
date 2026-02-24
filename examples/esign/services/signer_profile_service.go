package services

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"
	"unicode"

	"github.com/goliatone/go-admin/examples/esign/stores"
	goerrors "github.com/goliatone/go-errors"
)

const (
	defaultSignerProfileTTL                 = 90 * 24 * time.Hour
	defaultSignerProfileMaxTextLength       = 256
	defaultSignerProfileMaxDrawnDataURLSize = 512 * 1024
	defaultSignerProfileMaxKeyLength        = 1024
)

// SignerProfile captures persisted signer profile fields used by the unified signer UI.
type SignerProfile struct {
	SchemaVersion         int    `json:"schemaVersion"`
	Key                   string `json:"key"`
	FullName              string `json:"fullName"`
	Initials              string `json:"initials"`
	TypedSignature        string `json:"typedSignature"`
	DrawnSignatureDataURL string `json:"drawnSignatureDataUrl"`
	DrawnInitialsDataURL  string `json:"drawnInitialsDataUrl"`
	Remember              bool   `json:"remember"`
	UpdatedAt             int64  `json:"updatedAt"`
	ExpiresAt             int64  `json:"expiresAt"`
}

// SignerProfilePatch is a partial profile update payload from the signer UI.
type SignerProfilePatch struct {
	FullName              *string `json:"fullName,omitempty"`
	Initials              *string `json:"initials,omitempty"`
	TypedSignature        *string `json:"typedSignature,omitempty"`
	DrawnSignatureDataURL *string `json:"drawnSignatureDataUrl,omitempty"`
	DrawnInitialsDataURL  *string `json:"drawnInitialsDataUrl,omitempty"`
	Remember              *bool   `json:"remember,omitempty"`
}

// SignerProfileServiceOption customizes signer profile service behavior.
type SignerProfileServiceOption func(*SignerProfileService)

// WithSignerProfileClock sets the clock used by signer profile persistence.
func WithSignerProfileClock(now func() time.Time) SignerProfileServiceOption {
	return func(s *SignerProfileService) {
		if s == nil || now == nil {
			return
		}
		s.now = now
	}
}

// WithSignerProfileTTL sets profile expiration.
func WithSignerProfileTTL(ttl time.Duration) SignerProfileServiceOption {
	return func(s *SignerProfileService) {
		if s == nil || ttl <= 0 {
			return
		}
		s.ttl = ttl
	}
}

// WithSignerProfilePersistDrawnSignature toggles drawn-signature persistence.
func WithSignerProfilePersistDrawnSignature(enabled bool) SignerProfileServiceOption {
	return func(s *SignerProfileService) {
		if s == nil {
			return
		}
		s.persistDrawnSignature = enabled
	}
}

// WithSignerProfileMaxTextLength sets the maximum allowed length for profile text fields.
func WithSignerProfileMaxTextLength(max int) SignerProfileServiceOption {
	return func(s *SignerProfileService) {
		if s == nil || max <= 0 {
			return
		}
		s.maxTextLen = max
	}
}

// WithSignerProfileMaxDrawnDataURLSize sets the maximum allowed drawn image payload size.
func WithSignerProfileMaxDrawnDataURLSize(max int) SignerProfileServiceOption {
	return func(s *SignerProfileService) {
		if s == nil || max <= 0 {
			return
		}
		s.maxDrawnDataURLSize = max
	}
}

// WithSignerProfileMaxKeyLength sets the maximum accepted profile key length.
func WithSignerProfileMaxKeyLength(max int) SignerProfileServiceOption {
	return func(s *SignerProfileService) {
		if s == nil || max <= 0 {
			return
		}
		s.maxKeyLen = max
	}
}

// SignerProfileService orchestrates signer profile CRUD persistence.
type SignerProfileService struct {
	store                 stores.SignerProfileStore
	now                   func() time.Time
	ttl                   time.Duration
	persistDrawnSignature bool
	maxTextLen            int
	maxDrawnDataURLSize   int
	maxKeyLen             int
}

// NewSignerProfileService creates a signer profile service.
func NewSignerProfileService(store stores.SignerProfileStore, opts ...SignerProfileServiceOption) SignerProfileService {
	svc := SignerProfileService{
		store:                 store,
		now:                   func() time.Time { return time.Now().UTC() },
		ttl:                   defaultSignerProfileTTL,
		persistDrawnSignature: true,
		maxTextLen:            defaultSignerProfileMaxTextLength,
		maxDrawnDataURLSize:   defaultSignerProfileMaxDrawnDataURLSize,
		maxKeyLen:             defaultSignerProfileMaxKeyLength,
	}
	for _, opt := range opts {
		if opt == nil {
			continue
		}
		opt(&svc)
	}
	return svc
}

// Get returns a persisted signer profile for a token-derived subject and profile key.
func (s SignerProfileService) Get(ctx context.Context, scope stores.Scope, subject, key string) (*SignerProfile, error) {
	if s.store == nil {
		return nil, goerrors.New("signer profile store not configured", goerrors.CategoryBadInput).
			WithCode(http.StatusNotImplemented).
			WithTextCode(string(ErrorCodeInvalidSignerState))
	}
	subject = normalizeSignerProfileSubject(subject)
	key, err := sanitizeSignerProfileKey(key, s.maxKeyLen)
	if err != nil {
		return nil, err
	}
	if subject == "" || key == "" {
		return nil, goerrors.New("profile subject and key are required", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode(string(ErrorCodeMissingRequiredFields))
	}
	record, err := s.store.GetSignerProfile(ctx, scope, subject, key, s.now())
	if err != nil {
		if isNotFoundError(err) {
			return nil, nil
		}
		return nil, err
	}
	if !record.Remember {
		return nil, nil
	}
	profile := signerProfileFromRecord(record)
	return &profile, nil
}

// Save merges and persists signer profile fields for a token-derived subject and profile key.
func (s SignerProfileService) Save(ctx context.Context, scope stores.Scope, subject, key string, patch SignerProfilePatch) (SignerProfile, error) {
	if s.store == nil {
		return SignerProfile{}, goerrors.New("signer profile store not configured", goerrors.CategoryBadInput).
			WithCode(http.StatusNotImplemented).
			WithTextCode(string(ErrorCodeInvalidSignerState))
	}
	subject = normalizeSignerProfileSubject(subject)
	key, err := sanitizeSignerProfileKey(key, s.maxKeyLen)
	if err != nil {
		return SignerProfile{}, err
	}
	if subject == "" || key == "" {
		return SignerProfile{}, goerrors.New("profile subject and key are required", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode(string(ErrorCodeMissingRequiredFields))
	}

	if patch.Remember != nil && !*patch.Remember {
		if err := s.store.DeleteSignerProfile(ctx, scope, subject, key); err != nil && !isNotFoundError(err) {
			return SignerProfile{}, err
		}
		now := s.now().UTC()
		return SignerProfile{
			SchemaVersion: 1,
			Key:           key,
			Remember:      false,
			UpdatedAt:     now.UnixMilli(),
			ExpiresAt:     now.UnixMilli(),
		}, nil
	}
	if !signerProfilePatchHasMutableFields(patch) {
		return SignerProfile{}, goerrors.New("signer profile patch must include at least one profile field", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode(string(ErrorCodeMissingRequiredFields))
	}

	current, err := s.store.GetSignerProfile(ctx, scope, subject, key, s.now())
	if err != nil {
		if !isNotFoundError(err) {
			return SignerProfile{}, err
		}
		current = stores.SignerProfileRecord{
			Subject:  subject,
			Key:      key,
			Remember: true,
		}
	}

	if patch.FullName != nil {
		value, verr := sanitizeSignerProfileText(*patch.FullName, "fullName", s.maxTextLen)
		if verr != nil {
			return SignerProfile{}, verr
		}
		current.FullName = value
	}
	if patch.Initials != nil {
		value, verr := sanitizeSignerProfileText(*patch.Initials, "initials", s.maxTextLen)
		if verr != nil {
			return SignerProfile{}, verr
		}
		current.Initials = value
	}
	if patch.TypedSignature != nil {
		value, verr := sanitizeSignerProfileText(*patch.TypedSignature, "typedSignature", s.maxTextLen)
		if verr != nil {
			return SignerProfile{}, verr
		}
		current.TypedSignature = value
	}
	if patch.DrawnSignatureDataURL != nil {
		value, verr := s.sanitizeDrawnDataURL(*patch.DrawnSignatureDataURL, "drawnSignatureDataUrl")
		if verr != nil {
			return SignerProfile{}, verr
		}
		current.DrawnSignatureDataURL = value
	}
	if patch.DrawnInitialsDataURL != nil {
		value, verr := s.sanitizeDrawnDataURL(*patch.DrawnInitialsDataURL, "drawnInitialsDataUrl")
		if verr != nil {
			return SignerProfile{}, verr
		}
		current.DrawnInitialsDataURL = value
	}
	if patch.Remember != nil {
		current.Remember = *patch.Remember
	}
	if !current.Remember {
		if err := s.store.DeleteSignerProfile(ctx, scope, subject, key); err != nil && !isNotFoundError(err) {
			return SignerProfile{}, err
		}
		now := s.now().UTC()
		return SignerProfile{
			SchemaVersion: 1,
			Key:           key,
			Remember:      false,
			UpdatedAt:     now.UnixMilli(),
			ExpiresAt:     now.UnixMilli(),
		}, nil
	}

	now := s.now().UTC()
	current.Subject = subject
	current.Key = key
	current.Remember = true
	current.UpdatedAt = now
	current.ExpiresAt = now.Add(s.ttl).UTC()
	if current.CreatedAt.IsZero() {
		current.CreatedAt = now
	}

	stored, err := s.store.UpsertSignerProfile(ctx, scope, current)
	if err != nil {
		return SignerProfile{}, err
	}
	return signerProfileFromRecord(stored), nil
}

// Clear deletes a persisted signer profile for a token-derived subject and profile key.
func (s SignerProfileService) Clear(ctx context.Context, scope stores.Scope, subject, key string) error {
	if s.store == nil {
		return goerrors.New("signer profile store not configured", goerrors.CategoryBadInput).
			WithCode(http.StatusNotImplemented).
			WithTextCode(string(ErrorCodeInvalidSignerState))
	}
	subject = normalizeSignerProfileSubject(subject)
	key, err := sanitizeSignerProfileKey(key, s.maxKeyLen)
	if err != nil {
		return err
	}
	if subject == "" || key == "" {
		return goerrors.New("profile subject and key are required", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode(string(ErrorCodeMissingRequiredFields))
	}
	err = s.store.DeleteSignerProfile(ctx, scope, subject, key)
	if err != nil && isNotFoundError(err) {
		return nil
	}
	return err
}

func signerProfileFromRecord(record stores.SignerProfileRecord) SignerProfile {
	record = cloneSignerProfileRecordValue(record)
	return SignerProfile{
		SchemaVersion:         1,
		Key:                   record.Key,
		FullName:              record.FullName,
		Initials:              record.Initials,
		TypedSignature:        record.TypedSignature,
		DrawnSignatureDataURL: record.DrawnSignatureDataURL,
		DrawnInitialsDataURL:  record.DrawnInitialsDataURL,
		Remember:              record.Remember,
		UpdatedAt:             record.UpdatedAt.UnixMilli(),
		ExpiresAt:             record.ExpiresAt.UnixMilli(),
	}
}

func cloneSignerProfileRecordValue(record stores.SignerProfileRecord) stores.SignerProfileRecord {
	record.Subject = normalizeSignerProfileSubject(record.Subject)
	record.Key = strings.TrimSpace(record.Key)
	record.FullName = strings.TrimSpace(record.FullName)
	record.Initials = strings.TrimSpace(record.Initials)
	record.TypedSignature = strings.TrimSpace(record.TypedSignature)
	record.DrawnSignatureDataURL = strings.TrimSpace(record.DrawnSignatureDataURL)
	record.DrawnInitialsDataURL = strings.TrimSpace(record.DrawnInitialsDataURL)
	record.CreatedAt = record.CreatedAt.UTC()
	record.UpdatedAt = record.UpdatedAt.UTC()
	record.ExpiresAt = record.ExpiresAt.UTC()
	return record
}

func normalizeSignerProfileSubject(subject string) string {
	return strings.ToLower(strings.TrimSpace(subject))
}

func sanitizeSignerProfileKey(value string, maxLen int) (string, error) {
	normalized := strings.TrimSpace(value)
	if normalized == "" {
		return "", nil
	}
	if maxLen > 0 && len(normalized) > maxLen {
		return "", goerrors.New("signer profile key exceeds max length", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode(string(ErrorCodeMissingRequiredFields)).
			WithMetadata(map[string]any{"field": "key", "max_length": maxLen})
	}
	if strings.IndexFunc(normalized, unicode.IsControl) >= 0 {
		return "", goerrors.New("signer profile key contains invalid characters", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode(string(ErrorCodeMissingRequiredFields)).
			WithMetadata(map[string]any{"field": "key"})
	}
	return normalized, nil
}

func signerProfilePatchHasMutableFields(patch SignerProfilePatch) bool {
	return patch.FullName != nil ||
		patch.Initials != nil ||
		patch.TypedSignature != nil ||
		patch.DrawnSignatureDataURL != nil ||
		patch.DrawnInitialsDataURL != nil
}

func sanitizeSignerProfileText(value, field string, maxLen int) (string, error) {
	value = strings.TrimSpace(value)
	if maxLen > 0 && len(value) > maxLen {
		return "", goerrors.New("signer profile field exceeds max length", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode(string(ErrorCodeMissingRequiredFields)).
			WithMetadata(map[string]any{"field": strings.TrimSpace(field), "max_length": maxLen})
	}
	return value, nil
}

func (s SignerProfileService) sanitizeDrawnDataURL(value, field string) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return "", nil
	}
	if !s.persistDrawnSignature {
		return "", goerrors.New("drawn signature persistence disabled", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode(string(ErrorCodeMissingRequiredFields)).
			WithMetadata(map[string]any{"field": strings.TrimSpace(field)})
	}
	if s.maxDrawnDataURLSize > 0 && len(value) > s.maxDrawnDataURLSize {
		return "", goerrors.New("drawn signature payload exceeds max size", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode(string(ErrorCodeMissingRequiredFields)).
			WithMetadata(map[string]any{"field": strings.TrimSpace(field), "max_size": s.maxDrawnDataURLSize})
	}
	if !strings.HasPrefix(strings.ToLower(value), "data:image/") {
		return "", goerrors.New("drawn signature must be an image data url", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode(string(ErrorCodeMissingRequiredFields)).
			WithMetadata(map[string]any{"field": strings.TrimSpace(field)})
	}
	return value, nil
}

func isNotFoundError(err error) bool {
	if err == nil {
		return false
	}
	var coded *goerrors.Error
	if errors.As(err, &coded) {
		return strings.EqualFold(strings.TrimSpace(coded.TextCode), "NOT_FOUND") || coded.Code == http.StatusNotFound
	}
	return false
}

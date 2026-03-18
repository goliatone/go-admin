package admin

import (
	"errors"
	"fmt"
	"strings"
)

var (
	// ErrTranslationExchangeUnsupportedFormat indicates a format outside CSV/JSON v1 support.
	ErrTranslationExchangeUnsupportedFormat = errors.New("translation exchange unsupported format")
	// ErrTranslationExchangeInvalidPayload indicates malformed exchange payloads.
	ErrTranslationExchangeInvalidPayload = errors.New("translation exchange invalid payload")
	// ErrTranslationExchangeMissingLinkage indicates unresolved deterministic linkage.
	ErrTranslationExchangeMissingLinkage = errors.New("translation exchange missing linkage")
	// ErrTranslationExchangeStaleSourceHash indicates stale source hash conflicts.
	ErrTranslationExchangeStaleSourceHash = errors.New("translation exchange stale source hash")
)

// TranslationExchangeUnsupportedFormatError captures unsupported upload format details.
type TranslationExchangeUnsupportedFormatError struct {
	Format    string   `json:"format"`
	Supported []string `json:"supported"`
}

func (e TranslationExchangeUnsupportedFormatError) Error() string {
	format := strings.TrimSpace(strings.ToLower(e.Format))
	if format == "" {
		format = "unknown"
	}
	return fmt.Sprintf("unsupported translation exchange format %q", format)
}

func (e TranslationExchangeUnsupportedFormatError) Unwrap() error {
	return ErrTranslationExchangeUnsupportedFormat
}

// TranslationExchangeInvalidPayloadError captures invalid payload details.
type TranslationExchangeInvalidPayloadError struct {
	Message  string         `json:"message"`
	Field    string         `json:"field"`
	Format   string         `json:"format"`
	Metadata map[string]any `json:"metadata"`
}

func (e TranslationExchangeInvalidPayloadError) Error() string {
	msg := strings.TrimSpace(e.Message)
	if msg == "" {
		msg = ErrTranslationExchangeInvalidPayload.Error()
	}
	return msg
}

func (e TranslationExchangeInvalidPayloadError) Unwrap() error {
	return ErrTranslationExchangeInvalidPayload
}

// TranslationExchangeConflictError captures row-level deterministic linkage conflicts.
type TranslationExchangeConflictError struct {
	Type               string `json:"type"`
	Index              int    `json:"index"`
	Resource           string `json:"resource"`
	EntityID           string `json:"entity_id"`
	FamilyID           string `json:"family_id"`
	TargetLocale       string `json:"target_locale"`
	FieldPath          string `json:"field_path"`
	CurrentSourceHash  string `json:"current_source_hash"`
	ProvidedSourceHash string `json:"provided_source_hash"`
}

func (e TranslationExchangeConflictError) Error() string {
	switch strings.TrimSpace(e.Type) {
	case "stale_source_hash":
		return "translation exchange source hash mismatch"
	default:
		return "translation exchange row linkage conflict"
	}
}

func (e TranslationExchangeConflictError) Unwrap() error {
	switch strings.TrimSpace(e.Type) {
	case "stale_source_hash":
		return ErrTranslationExchangeStaleSourceHash
	default:
		return ErrTranslationExchangeMissingLinkage
	}
}

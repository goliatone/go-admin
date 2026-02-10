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
	Format    string
	Supported []string
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
	Message  string
	Field    string
	Format   string
	Metadata map[string]any
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
	Type               string
	Index              int
	Resource           string
	EntityID           string
	TranslationGroupID string
	TargetLocale       string
	FieldPath          string
	CurrentSourceHash  string
	ProvidedSourceHash string
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

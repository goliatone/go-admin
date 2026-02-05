package admin

import (
	"errors"
	"net/http"
	"strings"

	cmsinterfaces "github.com/goliatone/go-cms/pkg/interfaces"
	goerrors "github.com/goliatone/go-errors"
)

// TranslationMeta mirrors the go-cms translation metadata contract.
type TranslationMeta = cmsinterfaces.TranslationMeta

// TranslationBundle wraps requested/resolved translations with locale metadata.
type TranslationBundle[T any] = cmsinterfaces.TranslationBundle[T]

// PageTranslation mirrors the go-cms page translation DTO.
type PageTranslation = cmsinterfaces.PageTranslation

// ContentTranslation mirrors the go-cms content translation DTO.
type ContentTranslation = cmsinterfaces.ContentTranslation

const (
	// CreateTranslationKey is the payload flag that explicitly allows creating a missing translation.
	CreateTranslationKey = "create_translation"
)

// IsTranslationMissing reports whether an error indicates a missing translation.
func IsTranslationMissing(err error) bool {
	if err == nil {
		return false
	}
	return errors.Is(err, cmsinterfaces.ErrTranslationMissing)
}

func createTranslationRequested(payload map[string]any) bool {
	if payload == nil {
		return false
	}
	if val, ok := payload[CreateTranslationKey]; ok {
		return toBool(val)
	}
	if val, ok := payload["create_missing_translation"]; ok {
		return toBool(val)
	}
	return false
}

func requestedLocaleFromPayload(payload map[string]any, fallback string) string {
	if payload != nil {
		if loc := strings.TrimSpace(toString(payload["requested_locale"])); loc != "" {
			return loc
		}
		if loc := strings.TrimSpace(toString(payload["locale"])); loc != "" {
			return loc
		}
		if loc := strings.TrimSpace(toString(payload["resolved_locale"])); loc != "" {
			return loc
		}
	}
	return strings.TrimSpace(fallback)
}

func translationCreateRequiredError(locale string) error {
	fields := map[string]string{"locale": "translation missing; explicit create_translation required"}
	err := goerrors.NewValidationFromMap("translation missing", fields).
		WithCode(http.StatusBadRequest).
		WithTextCode(TextCodeValidationError)
	if err.Metadata == nil {
		err.Metadata = map[string]any{}
	}
	if strings.TrimSpace(locale) != "" {
		err.Metadata["requested_locale"] = strings.TrimSpace(locale)
	}
	err.Metadata["translation_missing"] = true
	return err
}

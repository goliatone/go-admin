package admin

import (
	"context"
	"strings"

	translationservices "github.com/goliatone/go-admin/translations/services"
)

type TranslationEditorMemorySuggestionInput struct {
	TenantID          string
	OrgID             string
	ContentType       string
	SourceLocale      string
	TargetLocale      string
	ExcludeFamilyID   string
	FieldSources      map[string]string
	Limit             int
	CandidateRowLimit int
}

type TranslationEditorMemorySuggestion struct {
	Family        translationservices.FamilyRecord
	SourceVariant translationservices.FamilyVariant
	TargetVariant translationservices.FamilyVariant
	FieldPath     string
	SourceText    string
	SuggestedText string
}

type TranslationEditorMemorySuggestionStore interface {
	TranslationEditorMemorySuggestions(context.Context, TranslationEditorMemorySuggestionInput) ([]TranslationEditorMemorySuggestion, error)
}

func normalizeTranslationEditorMemoryInput(input TranslationEditorMemorySuggestionInput) TranslationEditorMemorySuggestionInput {
	input.TenantID = strings.TrimSpace(input.TenantID)
	input.OrgID = strings.TrimSpace(input.OrgID)
	input.ContentType = strings.TrimSpace(strings.ToLower(input.ContentType))
	input.SourceLocale = strings.TrimSpace(strings.ToLower(input.SourceLocale))
	input.TargetLocale = strings.TrimSpace(strings.ToLower(input.TargetLocale))
	input.ExcludeFamilyID = strings.TrimSpace(input.ExcludeFamilyID)
	if input.Limit <= 0 {
		input.Limit = 12
	}
	if input.Limit > 50 {
		input.Limit = 50
	}
	if input.CandidateRowLimit <= 0 {
		input.CandidateRowLimit = max(200, input.Limit*25)
	}
	if input.CandidateRowLimit < input.Limit {
		input.CandidateRowLimit = input.Limit
	}
	if input.CandidateRowLimit > 1000 {
		input.CandidateRowLimit = 1000
	}
	normalizedFields := map[string]string{}
	for path, value := range input.FieldSources {
		path = strings.TrimSpace(path)
		value = strings.TrimSpace(value)
		if path == "" || value == "" {
			continue
		}
		normalizedFields[path] = value
	}
	input.FieldSources = normalizedFields
	return input
}

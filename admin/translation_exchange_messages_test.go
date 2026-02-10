package admin

import "testing"

func TestTranslationExchangeMessageTypesAreStable(t *testing.T) {
	if got := (TranslationExportInput{}).Type(); got != translationExportCommandName {
		t.Fatalf("expected %q, got %q", translationExportCommandName, got)
	}
	if got := (TranslationImportValidateInput{}).Type(); got != translationImportValidateCommandName {
		t.Fatalf("expected %q, got %q", translationImportValidateCommandName, got)
	}
	if got := (TranslationImportApplyInput{}).Type(); got != translationImportApplyCommandName {
		t.Fatalf("expected %q, got %q", translationImportApplyCommandName, got)
	}
	if got := (TranslationImportRunInput{}).Type(); got != translationImportRunCommandName {
		t.Fatalf("expected %q, got %q", translationImportRunCommandName, got)
	}
}

func TestTranslationImportApplyInputValidateRequiresNormalizedRows(t *testing.T) {
	err := (TranslationImportApplyInput{Rows: []TranslationExchangeRow{
		{
			Resource:           "pages",
			EntityID:           "1",
			TranslationGroupID: "tg_1",
			TargetLocale:       "es",
			FieldPath:          "title",
		},
	}}).Validate()
	if err == nil {
		t.Fatalf("expected translated_text required error")
	}
}

func TestTranslationImportValidateInputValidateAcceptsLinkageOnlyRows(t *testing.T) {
	err := (TranslationImportValidateInput{Rows: []TranslationExchangeRow{
		{
			Resource:           "pages",
			EntityID:           "1",
			TranslationGroupID: "tg_1",
			TargetLocale:       "es",
			FieldPath:          "title",
		},
	}}).Validate()
	if err != nil {
		t.Fatalf("expected validate message to accept linkage-only row, got %v", err)
	}
}

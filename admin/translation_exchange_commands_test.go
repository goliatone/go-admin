package admin

import (
	"context"
	"testing"
)

type stubExchangeProcessor struct {
	exportResult   TranslationExportResult
	validateResult TranslationExchangeResult
	applyResult    TranslationExchangeResult
}

func (s *stubExchangeProcessor) Export(_ context.Context, _ TranslationExportInput) (TranslationExportResult, error) {
	return s.exportResult, nil
}

func (s *stubExchangeProcessor) ValidateImport(_ context.Context, _ TranslationImportValidateInput) (TranslationExchangeResult, error) {
	return s.validateResult, nil
}

func (s *stubExchangeProcessor) ApplyImport(_ context.Context, _ TranslationImportApplyInput) (TranslationExchangeResult, error) {
	return s.applyResult, nil
}

func TestTranslationExportCommandPopulatesOutput(t *testing.T) {
	service := &stubExchangeProcessor{
		exportResult: TranslationExportResult{RowCount: 2},
	}
	cmd := &TranslationExportCommand{Service: service}
	var out TranslationExportResult
	err := cmd.Execute(context.Background(), TranslationExportInput{
		Filter: TranslationExportFilter{
			Resources: []string{"pages"},
		},
		Output: &out,
	})
	if err != nil {
		t.Fatalf("execute failed: %v", err)
	}
	if out.RowCount != 2 {
		t.Fatalf("expected output row count 2, got %d", out.RowCount)
	}
}

func TestTranslationImportValidateCommandPopulatesResult(t *testing.T) {
	service := &stubExchangeProcessor{
		validateResult: TranslationExchangeResult{
			Summary: TranslationExchangeSummary{Processed: 1, Succeeded: 1},
		},
	}
	cmd := &TranslationImportValidateCommand{Service: service}
	var out TranslationExchangeResult
	err := cmd.Execute(context.Background(), TranslationImportValidateInput{
		Rows: []TranslationExchangeRow{
			{
				Resource:           "pages",
				EntityID:           "1",
				TranslationGroupID: "tg_1",
				TargetLocale:       "es",
				FieldPath:          "title",
			},
		},
		Result: &out,
	})
	if err != nil {
		t.Fatalf("execute failed: %v", err)
	}
	if out.Summary.Processed != 1 || out.Summary.Succeeded != 1 {
		t.Fatalf("unexpected output: %+v", out.Summary)
	}
}

func TestTranslationImportApplyCommandPopulatesResult(t *testing.T) {
	service := &stubExchangeProcessor{
		applyResult: TranslationExchangeResult{
			Summary: TranslationExchangeSummary{Processed: 1, Succeeded: 1},
		},
	}
	cmd := &TranslationImportApplyCommand{Service: service}
	var out TranslationExchangeResult
	err := cmd.Execute(context.Background(), TranslationImportApplyInput{
		Rows: []TranslationExchangeRow{
			{
				Resource:           "pages",
				EntityID:           "1",
				TranslationGroupID: "tg_1",
				TargetLocale:       "es",
				FieldPath:          "title",
				TranslatedText:     "Hola",
			},
		},
		Result: &out,
	})
	if err != nil {
		t.Fatalf("execute failed: %v", err)
	}
	if out.Summary.Processed != 1 || out.Summary.Succeeded != 1 {
		t.Fatalf("unexpected output: %+v", out.Summary)
	}
}

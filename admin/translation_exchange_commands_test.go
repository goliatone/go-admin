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

func TestTranslationExchangeCommandsExposeCLIOptions(t *testing.T) {
	tests := []struct {
		name string
		path []string
		cmd  interface {
			CLIHandler() any
			CLIOptions() CLIConfig
		}
	}{
		{
			name: "export",
			path: []string{"translations", "exchange", "export"},
			cmd:  &TranslationExportCommand{},
		},
		{
			name: "import validate",
			path: []string{"translations", "exchange", "import", "validate"},
			cmd:  &TranslationImportValidateCommand{},
		},
		{
			name: "import apply",
			path: []string{"translations", "exchange", "import", "apply"},
			cmd:  &TranslationImportApplyCommand{},
		},
		{
			name: "import run",
			path: []string{"translations", "exchange", "import", "run"},
			cmd:  &TranslationImportRunCommand{},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if tc.cmd.CLIHandler() == nil {
				t.Fatalf("expected CLI handler")
			}
			opts := tc.cmd.CLIOptions()
			if len(opts.Path) != len(tc.path) {
				t.Fatalf("expected path length %d, got %d", len(tc.path), len(opts.Path))
			}
			for i := range tc.path {
				if opts.Path[i] != tc.path[i] {
					t.Fatalf("expected path segment %d to be %q, got %q", i, tc.path[i], opts.Path[i])
				}
			}
			if opts.Description == "" {
				t.Fatalf("expected non-empty description")
			}
		})
	}
}

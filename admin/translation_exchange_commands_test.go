package admin

import (
	"context"
	"errors"
	"testing"

	goerrors "github.com/goliatone/go-errors"
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

// Task 16.1: Command safety semantics - nil service returns typed error
func TestTranslationExportCommandNilServiceReturnsError(t *testing.T) {
	cmd := &TranslationExportCommand{Service: nil}
	err := cmd.Execute(context.Background(), TranslationExportInput{
		Filter: TranslationExportFilter{Resources: []string{"pages"}},
	})
	if err == nil {
		t.Fatalf("expected error for nil service")
	}
	var domErr *goerrors.Error
	if !errors.As(err, &domErr) || domErr.TextCode != TextCodeServiceUnavailable {
		t.Fatalf("expected SERVICE_UNAVAILABLE error, got %v", err)
	}
}

func TestTranslationImportValidateCommandNilServiceReturnsError(t *testing.T) {
	cmd := &TranslationImportValidateCommand{Service: nil}
	err := cmd.Execute(context.Background(), TranslationImportValidateInput{
		Rows: []TranslationExchangeRow{
			{Resource: "pages", EntityID: "1", TranslationGroupID: "tg_1", TargetLocale: "es", FieldPath: "title"},
		},
	})
	if err == nil {
		t.Fatalf("expected error for nil service")
	}
	var domErr *goerrors.Error
	if !errors.As(err, &domErr) || domErr.TextCode != TextCodeServiceUnavailable {
		t.Fatalf("expected SERVICE_UNAVAILABLE error, got %v", err)
	}
}

func TestTranslationImportApplyCommandNilServiceReturnsError(t *testing.T) {
	cmd := &TranslationImportApplyCommand{Service: nil}
	err := cmd.Execute(context.Background(), TranslationImportApplyInput{
		Rows: []TranslationExchangeRow{
			{Resource: "pages", EntityID: "1", TranslationGroupID: "tg_1", TargetLocale: "es", FieldPath: "title", TranslatedText: "Hola"},
		},
	})
	if err == nil {
		t.Fatalf("expected error for nil service")
	}
	var domErr *goerrors.Error
	if !errors.As(err, &domErr) || domErr.TextCode != TextCodeServiceUnavailable {
		t.Fatalf("expected SERVICE_UNAVAILABLE error, got %v", err)
	}
}

func TestTranslationImportRunCommandNilValidatorReturnsError(t *testing.T) {
	cmd := &TranslationImportRunCommand{Validator: nil, Applier: &stubExchangeProcessor{}}
	err := cmd.Execute(context.Background(), TranslationImportRunInput{
		ValidateInput: TranslationImportValidateInput{
			Rows: []TranslationExchangeRow{
				{Resource: "pages", EntityID: "1", TranslationGroupID: "tg_1", TargetLocale: "es", FieldPath: "title"},
			},
		},
		ApplyInput: TranslationImportApplyInput{
			Rows: []TranslationExchangeRow{
				{Resource: "pages", EntityID: "1", TranslationGroupID: "tg_1", TargetLocale: "es", FieldPath: "title", TranslatedText: "Hola"},
			},
		},
	})
	if err == nil {
		t.Fatalf("expected error for nil validator")
	}
	var domErr *goerrors.Error
	if !errors.As(err, &domErr) || domErr.TextCode != TextCodeServiceUnavailable {
		t.Fatalf("expected SERVICE_UNAVAILABLE error, got %v", err)
	}
}

func TestTranslationImportRunCommandNilApplierReturnsError(t *testing.T) {
	cmd := &TranslationImportRunCommand{Validator: &stubExchangeProcessor{}, Applier: nil}
	err := cmd.Execute(context.Background(), TranslationImportRunInput{
		ValidateInput: TranslationImportValidateInput{
			Rows: []TranslationExchangeRow{
				{Resource: "pages", EntityID: "1", TranslationGroupID: "tg_1", TargetLocale: "es", FieldPath: "title"},
			},
		},
		ApplyInput: TranslationImportApplyInput{
			Rows: []TranslationExchangeRow{
				{Resource: "pages", EntityID: "1", TranslationGroupID: "tg_1", TargetLocale: "es", FieldPath: "title", TranslatedText: "Hola"},
			},
		},
	})
	if err == nil {
		t.Fatalf("expected error for nil applier")
	}
	var domErr *goerrors.Error
	if !errors.As(err, &domErr) || domErr.TextCode != TextCodeServiceUnavailable {
		t.Fatalf("expected SERVICE_UNAVAILABLE error, got %v", err)
	}
}

// Task 16.1: Command input validation - validation errors surface correctly
func TestTranslationExportCommandValidationError(t *testing.T) {
	service := &stubExchangeProcessor{}
	cmd := &TranslationExportCommand{Service: service}
	err := cmd.Execute(context.Background(), TranslationExportInput{
		Filter: TranslationExportFilter{Resources: []string{}}, // empty resources triggers validation error
	})
	if err == nil {
		t.Fatalf("expected validation error for empty resources")
	}
	var domErr *goerrors.Error
	if !errors.As(err, &domErr) || domErr.TextCode != TextCodeValidationError {
		t.Fatalf("expected VALIDATION_ERROR, got %v", err)
	}
}

func TestTranslationImportValidateCommandValidationError(t *testing.T) {
	service := &stubExchangeProcessor{}
	cmd := &TranslationImportValidateCommand{Service: service}
	err := cmd.Execute(context.Background(), TranslationImportValidateInput{
		Rows: []TranslationExchangeRow{}, // empty rows triggers validation error
	})
	if err == nil {
		t.Fatalf("expected validation error for empty rows")
	}
	var domErr *goerrors.Error
	if !errors.As(err, &domErr) || domErr.TextCode != TextCodeValidationError {
		t.Fatalf("expected VALIDATION_ERROR, got %v", err)
	}
}

func TestTranslationImportApplyCommandValidationError(t *testing.T) {
	service := &stubExchangeProcessor{}
	cmd := &TranslationImportApplyCommand{Service: service}
	err := cmd.Execute(context.Background(), TranslationImportApplyInput{
		Rows: []TranslationExchangeRow{
			{Resource: "pages", EntityID: "1", TranslationGroupID: "tg_1", TargetLocale: "es", FieldPath: "title"}, // missing translated_text
		},
	})
	if err == nil {
		t.Fatalf("expected validation error for missing translated_text")
	}
	var domErr *goerrors.Error
	if !errors.As(err, &domErr) || domErr.TextCode != TextCodeValidationError {
		t.Fatalf("expected VALIDATION_ERROR, got %v", err)
	}
}

func TestTranslationImportRunCommandValidationError(t *testing.T) {
	service := &stubExchangeProcessor{}
	cmd := &TranslationImportRunCommand{Validator: service, Applier: service}
	err := cmd.Execute(context.Background(), TranslationImportRunInput{
		ValidateInput: TranslationImportValidateInput{Rows: []TranslationExchangeRow{}}, // empty rows
		ApplyInput:    TranslationImportApplyInput{Rows: []TranslationExchangeRow{}},
	})
	if err == nil {
		t.Fatalf("expected validation error for empty rows")
	}
	var domErr *goerrors.Error
	if !errors.As(err, &domErr) || domErr.TextCode != TextCodeValidationError {
		t.Fatalf("expected VALIDATION_ERROR, got %v", err)
	}
}

// Task 16.1: Run command composes validate+apply and populates combined result
func TestTranslationImportRunCommandPopulatesCombinedResult(t *testing.T) {
	service := &stubExchangeProcessor{
		validateResult: TranslationExchangeResult{
			Summary: TranslationExchangeSummary{Processed: 2, Succeeded: 2},
		},
		applyResult: TranslationExchangeResult{
			Summary: TranslationExchangeSummary{Processed: 2, Succeeded: 2},
		},
	}
	cmd := &TranslationImportRunCommand{Validator: service, Applier: service}
	var out TranslationImportRunResult
	err := cmd.Execute(context.Background(), TranslationImportRunInput{
		ValidateInput: TranslationImportValidateInput{
			Rows: []TranslationExchangeRow{
				{Resource: "pages", EntityID: "1", TranslationGroupID: "tg_1", TargetLocale: "es", FieldPath: "title"},
			},
		},
		ApplyInput: TranslationImportApplyInput{
			Rows: []TranslationExchangeRow{
				{Resource: "pages", EntityID: "1", TranslationGroupID: "tg_1", TargetLocale: "es", FieldPath: "title", TranslatedText: "Hola"},
			},
		},
		Result: &out,
	})
	if err != nil {
		t.Fatalf("execute failed: %v", err)
	}
	if out.Validate.Summary.Processed != 2 {
		t.Fatalf("expected validate processed 2, got %d", out.Validate.Summary.Processed)
	}
	if out.Apply.Summary.Processed != 2 {
		t.Fatalf("expected apply processed 2, got %d", out.Apply.Summary.Processed)
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

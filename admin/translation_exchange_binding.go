package admin

import (
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"errors"
	"io"
	"mime/multipart"
	"path/filepath"
	"strings"

	"github.com/goliatone/go-command/dispatcher"
	router "github.com/goliatone/go-router"
)

const (
	translationExchangePermissionExport         = "admin.translations.export"
	translationExchangePermissionImportValidate = "admin.translations.import.validate"
	translationExchangePermissionImportApply    = "admin.translations.import.apply"
	translationExchangePermissionImportView     = "admin.translations.import.view"
)

var translationExchangeSupportedFormats = []string{"csv", "json"}

type translationExchangeCommandExecutor interface {
	Export(context.Context, TranslationExportInput) (TranslationExportResult, error)
	Validate(context.Context, TranslationImportValidateInput) (TranslationExchangeResult, error)
	Apply(context.Context, TranslationImportApplyInput) (TranslationExchangeResult, error)
}

type translationExchangeDispatcherExecutor struct{}

func (translationExchangeDispatcherExecutor) Export(ctx context.Context, input TranslationExportInput) (TranslationExportResult, error) {
	result := TranslationExportResult{}
	input.Output = &result
	if err := dispatcher.Dispatch(ctx, input); err != nil {
		return TranslationExportResult{}, err
	}
	return result, nil
}

func (translationExchangeDispatcherExecutor) Validate(ctx context.Context, input TranslationImportValidateInput) (TranslationExchangeResult, error) {
	result := TranslationExchangeResult{}
	input.Result = &result
	if err := dispatcher.Dispatch(ctx, input); err != nil {
		return TranslationExchangeResult{}, err
	}
	return result, nil
}

func (translationExchangeDispatcherExecutor) Apply(ctx context.Context, input TranslationImportApplyInput) (TranslationExchangeResult, error) {
	result := TranslationExchangeResult{}
	input.Result = &result
	if err := dispatcher.Dispatch(ctx, input); err != nil {
		return TranslationExchangeResult{}, err
	}
	return result, nil
}

type translationExchangeBinding struct {
	admin    *Admin
	executor translationExchangeCommandExecutor
	jobs     *translationExchangeAsyncJobStore
}

func newTranslationExchangeBinding(a *Admin) *translationExchangeBinding {
	if a == nil {
		return nil
	}
	return &translationExchangeBinding{
		admin:    a,
		executor: translationExchangeDispatcherExecutor{},
		jobs:     newTranslationExchangeAsyncJobStore(nil),
	}
}

func (b *translationExchangeBinding) Export(c router.Context) (any, error) {
	if b == nil || b.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation exchange binding", map[string]any{
			"component": "translation_exchange_binding",
		})
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.admin.requirePermission(adminCtx, translationExchangePermissionExport, "translations"); err != nil {
		return nil, err
	}
	input, payload, err := parseTranslationExportInput(c)
	if err != nil {
		return nil, err
	}
	asyncRequested := translationExchangeAsyncRequested(c, payload)
	if asyncRequested {
		return b.exportAsync(adminCtx, input)
	}
	result, err := b.executor.Export(adminCtx.Context, input)
	if err != nil {
		return nil, err
	}
	b.admin.recordActivity(adminCtx.Context, adminCtx.UserID, "translation.exchange.export.created", "translation_exchange", map[string]any{
		"row_count":      result.RowCount,
		"resource_count": len(input.Filter.Resources),
		"source_locale":  strings.TrimSpace(input.Filter.SourceLocale),
		"target_locales": append([]string{}, input.Filter.TargetLocales...),
	})
	return result, nil
}

func (b *translationExchangeBinding) Template(c router.Context) error {
	if b == nil || b.admin == nil {
		return serviceNotConfiguredDomainError("translation exchange binding", map[string]any{
			"component": "translation_exchange_binding",
		})
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.admin.requirePermission(adminCtx, translationExchangePermissionImportView, "translations"); err != nil {
		return err
	}
	format, err := detectTranslationExchangeFormat(c, "", "")
	if err != nil {
		return err
	}
	switch format {
	case "json":
		c.SetHeader("Content-Disposition", "attachment; filename=translation_exchange_template.json")
		return c.JSON(200, []map[string]any{
			{
				"resource":             "pages",
				"entity_id":            "page_123",
				"translation_group_id": "tg_123",
				"source_locale":        "en",
				"target_locale":        "es",
				"field_path":           "title",
				"source_text":          "Hello world",
				"translated_text":      "Hola mundo",
				"source_hash":          "0123456789abcdef",
				"path":                 "/home",
				"title":                "Home",
				"status":               "draft",
				"notes":                "",
			},
		})
	default:
		c.SetHeader("Content-Type", "text/csv")
		c.SetHeader("Content-Disposition", "attachment; filename=translation_exchange_template.csv")
		template := strings.Join([]string{
			"resource,entity_id,translation_group_id,source_locale,target_locale,field_path,source_text,translated_text,source_hash,path,title,status,notes",
			"pages,page_123,tg_123,en,es,title,Hello world,Hola mundo,0123456789abcdef,/home,Home,draft,",
		}, "\n")
		return c.SendString(template)
	}
}

func (b *translationExchangeBinding) ImportValidate(c router.Context) (any, error) {
	if b == nil || b.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation exchange binding", map[string]any{
			"component": "translation_exchange_binding",
		})
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.admin.requirePermission(adminCtx, translationExchangePermissionImportValidate, "translations"); err != nil {
		return nil, err
	}
	rows, _, _, err := parseTranslationImportRows(c, false)
	if err != nil {
		return nil, err
	}
	result, err := b.executor.Validate(adminCtx.Context, TranslationImportValidateInput{
		Rows: rows,
	})
	if err != nil {
		return nil, err
	}
	b.admin.recordActivity(adminCtx.Context, adminCtx.UserID, "translation.exchange.import.validated", "translation_exchange", map[string]any{
		"processed": result.Summary.Processed,
		"succeeded": result.Summary.Succeeded,
		"failed":    result.Summary.Failed,
	})
	recordTranslationExchangeConflicts(b.admin, adminCtx, "validate", result.Results)
	return result, nil
}

func (b *translationExchangeBinding) ImportApply(c router.Context) (any, error) {
	if b == nil || b.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation exchange binding", map[string]any{
			"component": "translation_exchange_binding",
		})
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.admin.requirePermission(adminCtx, translationExchangePermissionImportApply, "translations"); err != nil {
		return nil, err
	}
	rows, payload, _, err := parseTranslationImportRows(c, true)
	if err != nil {
		return nil, err
	}
	input := TranslationImportApplyInput{
		Rows:                    rows,
		AllowCreateMissing:      exchangeCreateTranslationRequested(payload),
		AllowSourceHashOverride: toBool(payload["allow_source_hash_override"]),
		ContinueOnError:         toBool(payload["continue_on_error"]),
		DryRun:                  toBool(payload["dry_run"]),
	}
	if translationExchangeAsyncRequested(c, payload) {
		return b.importApplyAsync(adminCtx, input)
	}
	result, err := b.executor.Apply(adminCtx.Context, input)
	if err != nil {
		return nil, err
	}
	b.admin.recordActivity(adminCtx.Context, adminCtx.UserID, "translation.exchange.import.applied", "translation_exchange", map[string]any{
		"processed":            result.Summary.Processed,
		"succeeded":            result.Summary.Succeeded,
		"failed":               result.Summary.Failed,
		"allow_create_missing": input.AllowCreateMissing,
		"continue_on_error":    input.ContinueOnError,
		"dry_run":              input.DryRun,
	})
	recordTranslationExchangeConflicts(b.admin, adminCtx, "apply", result.Results)
	return result, nil
}

func (b *translationExchangeBinding) JobStatus(c router.Context, id string) (any, error) {
	if b == nil || b.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation exchange binding", map[string]any{
			"component": "translation_exchange_binding",
		})
	}
	if strings.TrimSpace(id) == "" {
		id = strings.TrimSpace(c.Param("id", ""))
	}
	if strings.TrimSpace(id) == "" {
		return nil, requiredFieldDomainError("id", map[string]any{
			"component": "translation_exchange_binding",
		})
	}
	if b.jobs == nil {
		return nil, serviceNotConfiguredDomainError("translation exchange async jobs", map[string]any{
			"component": "translation_exchange_binding",
		})
	}
	job, ok := b.jobs.Get(id)
	if !ok {
		return nil, ErrNotFound
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.admin.requirePermission(adminCtx, strings.TrimSpace(job.Permission), "translations"); err != nil {
		return nil, err
	}
	return map[string]any{
		"job": translationExchangeAsyncJobPayload(job),
	}, nil
}

func (b *translationExchangeBinding) exportAsync(adminCtx AdminContext, input TranslationExportInput) (any, error) {
	if b == nil || b.jobs == nil {
		return nil, serviceNotConfiguredDomainError("translation exchange async jobs", map[string]any{
			"component": "translation_exchange_binding",
		})
	}
	job := b.jobs.Create("export", translationExchangePermissionExport, adminCtx.UserID)
	b.jobs.SetPollEndpoint(job.ID, b.jobStatusEndpoint(job.ID))
	b.jobs.MarkRunning(job.ID, map[string]any{
		"total":     0,
		"processed": 0,
		"succeeded": 0,
		"failed":    0,
	})

	result, err := b.executor.Export(adminCtx.Context, input)
	if err != nil {
		b.jobs.Fail(job.ID, map[string]any{
			"total":     0,
			"processed": 0,
			"succeeded": 0,
			"failed":    1,
		}, err)
		failed, _ := b.jobs.Get(job.ID)
		return map[string]any{
			"status": "accepted",
			"job":    translationExchangeAsyncJobPayload(failed),
		}, nil
	}

	b.admin.recordActivity(adminCtx.Context, adminCtx.UserID, "translation.exchange.export.created", "translation_exchange", map[string]any{
		"row_count":      result.RowCount,
		"resource_count": len(input.Filter.Resources),
		"source_locale":  strings.TrimSpace(input.Filter.SourceLocale),
		"target_locales": append([]string{}, input.Filter.TargetLocales...),
	})

	progress := map[string]any{
		"total":     result.RowCount,
		"processed": result.RowCount,
		"succeeded": result.RowCount,
		"failed":    0,
	}
	resultPayload := map[string]any{
		"summary": map[string]any{
			"row_count": result.RowCount,
			"format":    strings.TrimSpace(result.Format),
		},
	}
	b.jobs.Complete(job.ID, progress, resultPayload)
	complete, _ := b.jobs.Get(job.ID)
	return map[string]any{
		"status": "accepted",
		"job":    translationExchangeAsyncJobPayload(complete),
	}, nil
}

func (b *translationExchangeBinding) importApplyAsync(adminCtx AdminContext, input TranslationImportApplyInput) (any, error) {
	if b == nil || b.jobs == nil {
		return nil, serviceNotConfiguredDomainError("translation exchange async jobs", map[string]any{
			"component": "translation_exchange_binding",
		})
	}
	totalRows := len(input.Rows)
	job := b.jobs.Create("import.apply", translationExchangePermissionImportApply, adminCtx.UserID)
	b.jobs.SetPollEndpoint(job.ID, b.jobStatusEndpoint(job.ID))
	b.jobs.MarkRunning(job.ID, map[string]any{
		"total":     totalRows,
		"processed": 0,
		"succeeded": 0,
		"failed":    0,
	})

	result, err := b.executor.Apply(adminCtx.Context, input)
	if err != nil {
		b.jobs.Fail(job.ID, map[string]any{
			"total":     totalRows,
			"processed": 0,
			"succeeded": 0,
			"failed":    1,
		}, err)
		failed, _ := b.jobs.Get(job.ID)
		return map[string]any{
			"status": "accepted",
			"job":    translationExchangeAsyncJobPayload(failed),
		}, nil
	}

	b.admin.recordActivity(adminCtx.Context, adminCtx.UserID, "translation.exchange.import.applied", "translation_exchange", map[string]any{
		"processed":            result.Summary.Processed,
		"succeeded":            result.Summary.Succeeded,
		"failed":               result.Summary.Failed,
		"allow_create_missing": input.AllowCreateMissing,
		"continue_on_error":    input.ContinueOnError,
		"dry_run":              input.DryRun,
	})
	recordTranslationExchangeConflicts(b.admin, adminCtx, "apply", result.Results)

	progress := map[string]any{
		"total":     totalRows,
		"processed": result.Summary.Processed,
		"succeeded": result.Summary.Succeeded,
		"failed":    result.Summary.Failed,
	}
	resultPayload := map[string]any{
		"summary":   result.Summary,
		"conflicts": translationExchangeConflictSummary(result.Results),
	}
	b.jobs.Complete(job.ID, progress, resultPayload)
	complete, _ := b.jobs.Get(job.ID)
	return map[string]any{
		"status": "accepted",
		"job":    translationExchangeAsyncJobPayload(complete),
	}, nil
}

func (b *translationExchangeBinding) jobStatusEndpoint(id string) string {
	if b == nil || b.admin == nil {
		return ""
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return ""
	}
	adminAPIGroup := strings.TrimSpace(b.admin.AdminAPIGroup())
	if adminAPIGroup == "" {
		adminAPIGroup = "admin.api"
	}
	path := resolveURLWith(b.admin.URLs(), adminAPIGroup, "translations.jobs.id", map[string]any{"id": id}, nil)
	if strings.TrimSpace(path) != "" {
		return path
	}
	base := strings.TrimSuffix(adminAPIBasePath(b.admin), "/")
	if base == "" {
		return "/admin/api/translations/jobs/" + id
	}
	return base + "/translations/jobs/" + id
}

func parseTranslationExportInput(c router.Context) (TranslationExportInput, map[string]any, error) {
	body, err := parseOptionalJSONMap(c.Body())
	if err != nil {
		return TranslationExportInput{}, nil, err
	}
	filterPayload := extractMap(body["filter"])
	if len(filterPayload) == 0 {
		filterPayload = body
	}
	filter := TranslationExportFilter{
		Resources:         nonEmptyStrings(toStringSlice(filterPayload["resources"]), splitIDs(c.Query("resources")), splitIDs(c.Query("resource"))),
		EntityIDs:         nonEmptyStrings(toStringSlice(filterPayload["entity_ids"]), splitIDs(c.Query("entity_ids")), splitIDs(c.Query("entity_id")), splitIDs(c.Query("id")), splitIDs(c.Query("ids"))),
		SourceLocale:      firstNonEmpty(strings.TrimSpace(toString(filterPayload["source_locale"])), strings.TrimSpace(c.Query("source_locale")), strings.TrimSpace(c.Query("locale"))),
		TargetLocales:     nonEmptyStrings(toStringSlice(filterPayload["target_locales"]), splitIDs(c.Query("target_locales")), splitIDs(c.Query("target_locale"))),
		FieldPaths:        nonEmptyStrings(toStringSlice(filterPayload["field_paths"]), splitIDs(c.Query("field_paths")), splitIDs(c.Query("field_path"))),
		IncludeSourceHash: toBool(filterPayload["include_source_hash"]) || toBool(c.Query("include_source_hash")),
		Options:           extractMap(filterPayload["options"]),
	}
	if len(filter.Resources) == 0 {
		return TranslationExportInput{}, nil, TranslationExchangeInvalidPayloadError{
			Message: "resources required",
			Field:   "resources",
			Format:  "json",
		}
	}
	return TranslationExportInput{Filter: filter}, body, nil
}

func translationExchangeAsyncRequested(c router.Context, payload map[string]any) bool {
	return toBool(payload["async"]) || toBool(c.Query("async"))
}

func parseTranslationImportRows(c router.Context, requireTranslatedText bool) ([]TranslationExchangeRow, map[string]any, string, error) {
	if file, err := c.FormFile("file"); err == nil && file != nil {
		rows, format, parseErr := parseTranslationImportFile(c, file, requireTranslatedText)
		if parseErr != nil {
			return nil, nil, "", parseErr
		}
		payload := extractTranslationImportOptions(c, nil)
		return rows, payload, format, nil
	}
	raw := bytes.TrimSpace(c.Body())
	if len(raw) == 0 {
		return nil, nil, "", TranslationExchangeInvalidPayloadError{
			Message: "rows required",
			Field:   "rows",
		}
	}
	rows, payload, err := parseTranslationImportJSON(raw, requireTranslatedText)
	if err != nil {
		return nil, nil, "", err
	}
	payload = mergeImportOptions(payload, extractTranslationImportOptions(c, payload))
	return rows, payload, "json", nil
}

func parseTranslationImportFile(c router.Context, file *multipart.FileHeader, requireTranslatedText bool) ([]TranslationExchangeRow, string, error) {
	if file == nil {
		return nil, "", TranslationExchangeInvalidPayloadError{
			Message: "file required",
			Field:   "file",
		}
	}
	format, err := detectTranslationExchangeFormat(c, file.Filename, file.Header.Get("Content-Type"))
	if err != nil {
		return nil, "", err
	}
	fh, err := file.Open()
	if err != nil {
		return nil, "", TranslationExchangeInvalidPayloadError{
			Message: "unable to read import file",
			Field:   "file",
			Format:  format,
		}
	}
	defer fh.Close()
	var rows []TranslationExchangeRow
	switch format {
	case "json":
		payload, readErr := io.ReadAll(fh)
		if readErr != nil {
			return nil, "", TranslationExchangeInvalidPayloadError{
				Message: "unable to read import file",
				Field:   "file",
				Format:  format,
			}
		}
		var parseErr error
		rows, _, parseErr = parseTranslationImportJSON(payload, requireTranslatedText)
		if parseErr != nil {
			return nil, "", parseErr
		}
	case "csv":
		var parseErr error
		rows, parseErr = parseTranslationImportCSV(fh, requireTranslatedText)
		if parseErr != nil {
			return nil, "", parseErr
		}
	default:
		return nil, "", TranslationExchangeUnsupportedFormatError{
			Format:    format,
			Supported: translationExchangeSupportedFormats,
		}
	}
	return rows, format, nil
}

func parseTranslationImportJSON(raw []byte, requireTranslatedText bool) ([]TranslationExchangeRow, map[string]any, error) {
	payload := bytes.TrimSpace(raw)
	if len(payload) == 0 {
		return nil, nil, TranslationExchangeInvalidPayloadError{
			Message: "rows required",
			Field:   "rows",
			Format:  "json",
		}
	}
	switch payload[0] {
	case '[':
		var rows []TranslationExchangeRow
		if err := json.Unmarshal(payload, &rows); err != nil {
			return nil, nil, TranslationExchangeInvalidPayloadError{
				Message: "invalid json payload",
				Field:   "rows",
				Format:  "json",
			}
		}
		if len(rows) == 0 {
			return nil, nil, TranslationExchangeInvalidPayloadError{
				Message: "rows required",
				Field:   "rows",
				Format:  "json",
			}
		}
		if requireTranslatedText {
			for index, row := range rows {
				if strings.TrimSpace(row.TranslatedText) == "" {
					return nil, nil, TranslationExchangeInvalidPayloadError{
						Message: "row translated_text required",
						Field:   "translated_text",
						Format:  "json",
						Metadata: map[string]any{
							"row": index,
						},
					}
				}
			}
		}
		return rows, map[string]any{}, nil
	case '{':
		body := map[string]any{}
		if err := json.Unmarshal(payload, &body); err != nil {
			return nil, nil, TranslationExchangeInvalidPayloadError{
				Message: "invalid json payload",
				Field:   "rows",
				Format:  "json",
			}
		}
		rowsValue, ok := body["rows"]
		if !ok {
			return nil, nil, TranslationExchangeInvalidPayloadError{
				Message: "rows required",
				Field:   "rows",
				Format:  "json",
			}
		}
		rowsPayload, err := json.Marshal(rowsValue)
		if err != nil {
			return nil, nil, TranslationExchangeInvalidPayloadError{
				Message: "invalid rows payload",
				Field:   "rows",
				Format:  "json",
			}
		}
		var rows []TranslationExchangeRow
		if err := json.Unmarshal(rowsPayload, &rows); err != nil {
			return nil, nil, TranslationExchangeInvalidPayloadError{
				Message: "invalid rows payload",
				Field:   "rows",
				Format:  "json",
			}
		}
		if len(rows) == 0 {
			return nil, nil, TranslationExchangeInvalidPayloadError{
				Message: "rows required",
				Field:   "rows",
				Format:  "json",
			}
		}
		if requireTranslatedText {
			for index, row := range rows {
				if strings.TrimSpace(row.TranslatedText) == "" {
					return nil, nil, TranslationExchangeInvalidPayloadError{
						Message: "row translated_text required",
						Field:   "translated_text",
						Format:  "json",
						Metadata: map[string]any{
							"row": index,
						},
					}
				}
			}
		}
		return rows, body, nil
	default:
		return nil, nil, TranslationExchangeInvalidPayloadError{
			Message: "invalid json payload",
			Field:   "rows",
			Format:  "json",
		}
	}
}

func parseTranslationImportCSV(reader io.Reader, requireTranslatedText bool) ([]TranslationExchangeRow, error) {
	csvReader := csv.NewReader(reader)
	headers, err := csvReader.Read()
	if err != nil {
		if errors.Is(err, io.EOF) {
			return nil, TranslationExchangeInvalidPayloadError{
				Message: "empty csv payload",
				Field:   "rows",
				Format:  "csv",
			}
		}
		return nil, TranslationExchangeInvalidPayloadError{
			Message: "invalid csv payload",
			Field:   "rows",
			Format:  "csv",
		}
	}
	headerIndex := map[string]int{}
	for idx, header := range headers {
		normalized := strings.TrimSpace(strings.ToLower(header))
		if normalized == "" {
			continue
		}
		headerIndex[normalized] = idx
	}
	required := []string{"resource", "entity_id", "translation_group_id", "target_locale", "field_path"}
	if requireTranslatedText {
		required = append(required, "translated_text")
	}
	for _, key := range required {
		if _, ok := headerIndex[key]; !ok {
			return nil, TranslationExchangeInvalidPayloadError{
				Message: "missing required csv column",
				Field:   key,
				Format:  "csv",
				Metadata: map[string]any{
					"required_column": key,
				},
			}
		}
	}
	rows := make([]TranslationExchangeRow, 0)
	for index := 0; ; index++ {
		record, readErr := csvReader.Read()
		if errors.Is(readErr, io.EOF) {
			break
		}
		if readErr != nil {
			return nil, TranslationExchangeInvalidPayloadError{
				Message: "invalid csv payload",
				Field:   "rows",
				Format:  "csv",
			}
		}
		row := TranslationExchangeRow{
			Index:              index,
			Resource:           csvCell(record, headerIndex, "resource"),
			EntityID:           csvCell(record, headerIndex, "entity_id"),
			TranslationGroupID: csvCell(record, headerIndex, "translation_group_id"),
			SourceLocale:       csvCell(record, headerIndex, "source_locale"),
			TargetLocale:       csvCell(record, headerIndex, "target_locale"),
			FieldPath:          csvCell(record, headerIndex, "field_path"),
			SourceText:         csvCell(record, headerIndex, "source_text"),
			TranslatedText:     csvCell(record, headerIndex, "translated_text"),
			SourceHash:         csvCell(record, headerIndex, "source_hash"),
			Path:               csvCell(record, headerIndex, "path"),
			Title:              csvCell(record, headerIndex, "title"),
			Status:             csvCell(record, headerIndex, "status"),
			Notes:              csvCell(record, headerIndex, "notes"),
		}
		if isTranslationCSVRowEmpty(row) {
			continue
		}
		if requireTranslatedText && strings.TrimSpace(row.TranslatedText) == "" {
			return nil, TranslationExchangeInvalidPayloadError{
				Message: "row translated_text required",
				Field:   "translated_text",
				Format:  "csv",
				Metadata: map[string]any{
					"row": index,
				},
			}
		}
		rows = append(rows, row)
	}
	if len(rows) == 0 {
		return nil, TranslationExchangeInvalidPayloadError{
			Message: "rows required",
			Field:   "rows",
			Format:  "csv",
		}
	}
	return rows, nil
}

func detectTranslationExchangeFormat(c router.Context, filename, contentType string) (string, error) {
	format := strings.ToLower(strings.TrimSpace(c.Query("format")))
	if format == "" {
		format = strings.ToLower(strings.TrimSpace(c.FormValue("format")))
	}
	if format == "" {
		ext := strings.TrimPrefix(strings.ToLower(filepath.Ext(strings.TrimSpace(filename))), ".")
		if ext != "" {
			format = ext
		}
	}
	if format == "" {
		lowerType := strings.ToLower(strings.TrimSpace(contentType))
		switch {
		case strings.Contains(lowerType, "json"):
			format = "json"
		case strings.Contains(lowerType, "csv"):
			format = "csv"
		}
	}
	if format == "" {
		format = "csv"
	}
	switch format {
	case "csv", "json":
		return format, nil
	default:
		return "", TranslationExchangeUnsupportedFormatError{
			Format:    format,
			Supported: translationExchangeSupportedFormats,
		}
	}
}

func parseOptionalJSONMap(raw []byte) (map[string]any, error) {
	payload := bytes.TrimSpace(raw)
	if len(payload) == 0 {
		return map[string]any{}, nil
	}
	body := map[string]any{}
	if err := json.Unmarshal(payload, &body); err != nil {
		return nil, TranslationExchangeInvalidPayloadError{
			Message: "invalid json payload",
			Format:  "json",
		}
	}
	return body, nil
}

func csvCell(record []string, headerIndex map[string]int, key string) string {
	idx, ok := headerIndex[key]
	if !ok || idx < 0 || idx >= len(record) {
		return ""
	}
	return strings.TrimSpace(record[idx])
}

func isTranslationCSVRowEmpty(row TranslationExchangeRow) bool {
	return strings.TrimSpace(row.Resource) == "" &&
		strings.TrimSpace(row.EntityID) == "" &&
		strings.TrimSpace(row.TranslationGroupID) == "" &&
		strings.TrimSpace(row.TargetLocale) == "" &&
		strings.TrimSpace(row.FieldPath) == "" &&
		strings.TrimSpace(row.TranslatedText) == ""
}

func extractTranslationImportOptions(c router.Context, payload map[string]any) map[string]any {
	out := map[string]any{}
	if len(payload) > 0 {
		out = cloneAnyMap(payload)
	}
	assignQueryOrForm := func(key string) {
		if value := strings.TrimSpace(c.Query(key)); value != "" {
			out[key] = value
		}
		if value := strings.TrimSpace(c.FormValue(key)); value != "" {
			out[key] = value
		}
	}
	assignQueryOrForm("allow_create_missing")
	assignQueryOrForm("allow_source_hash_override")
	assignQueryOrForm("continue_on_error")
	assignQueryOrForm("dry_run")
	assignQueryOrForm(CreateTranslationKey)
	assignQueryOrForm("create_missing_translation")
	return out
}

func mergeImportOptions(base map[string]any, override map[string]any) map[string]any {
	if len(base) == 0 && len(override) == 0 {
		return map[string]any{}
	}
	out := map[string]any{}
	for key, value := range base {
		out[key] = value
	}
	for key, value := range override {
		out[key] = value
	}
	return out
}

func nonEmptyStrings(groups ...[]string) []string {
	out := []string{}
	for _, group := range groups {
		for _, value := range group {
			trimmed := strings.TrimSpace(value)
			if trimmed == "" {
				continue
			}
			out = append(out, trimmed)
		}
	}
	return dedupeStrings(out)
}

func recordTranslationExchangeConflicts(admin *Admin, ctx AdminContext, mode string, results []TranslationExchangeRowResult) {
	if admin == nil || len(results) == 0 {
		return
	}
	for _, row := range results {
		if strings.TrimSpace(row.Status) != translationExchangeRowStatusConflict {
			continue
		}
		conflictType := ""
		if row.Conflict != nil {
			conflictType = strings.TrimSpace(row.Conflict.Type)
		}
		metadata := map[string]any{
			"mode":                 strings.TrimSpace(mode),
			"index":                row.Index,
			"type":                 firstNonEmpty(conflictType, "missing_linkage"),
			"resource":             strings.TrimSpace(row.Resource),
			"entity_id":            strings.TrimSpace(row.EntityID),
			"translation_group_id": strings.TrimSpace(row.TranslationGroupID),
			"target_locale":        strings.TrimSpace(row.TargetLocale),
			"field_path":           strings.TrimSpace(row.FieldPath),
			"error":                strings.TrimSpace(row.Error),
		}
		if len(row.Metadata) > 0 {
			if code := strings.TrimSpace(toString(row.Metadata["error_code"])); code != "" {
				metadata["error_code"] = code
			}
			if hash := strings.TrimSpace(toString(row.Metadata["current_source_hash"])); hash != "" {
				metadata["current_source_hash"] = hash
			}
			if hash := strings.TrimSpace(toString(row.Metadata["provided_source_hash"])); hash != "" {
				metadata["provided_source_hash"] = hash
			}
		}
		admin.recordActivity(ctx.Context, ctx.UserID, "translation.exchange.import.row_conflict", "translation_exchange", metadata)
	}
}

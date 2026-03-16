package admin

import (
	"bytes"
	"encoding/base64"
	"encoding/csv"
	"encoding/json"
	"sort"
	"strings"
	"time"

	"github.com/goliatone/go-admin/internal/primitives"
)

const (
	translationExchangeDownloadKindArtifact = "artifact"
	translationExchangeDownloadKindInput    = "input"
	translationExchangeDownloadKindReport   = "report"
)

func translationExchangeHistoryMetaPayload(includeExamples bool) map[string]any {
	return map[string]any{
		"job_kinds":        []string{translationExchangeJobKindExport, translationExchangeJobKindImportValidate, translationExchangeJobKindImportApply},
		"job_statuses":     translationExchangeJobStates(),
		"download_kinds":   []string{translationExchangeDownloadKindArtifact, translationExchangeDownloadKindInput, translationExchangeDownloadKindReport},
		"include_examples": includeExamples,
	}
}

func translationExchangeHistoryPayload(jobs []translationExchangeAsyncJob, page, perPage int) map[string]any {
	if page <= 0 {
		page = 1
	}
	if perPage <= 0 {
		perPage = 20
	}

	sort.SliceStable(jobs, func(i, j int) bool {
		left := jobs[i]
		right := jobs[j]
		if !left.CreatedAt.Equal(right.CreatedAt) {
			return left.CreatedAt.After(right.CreatedAt)
		}
		if !left.UpdatedAt.Equal(right.UpdatedAt) {
			return left.UpdatedAt.After(right.UpdatedAt)
		}
		return strings.Compare(strings.TrimSpace(left.ID), strings.TrimSpace(right.ID)) < 0
	})

	total := len(jobs)
	start := (page - 1) * perPage
	if start > total {
		start = total
	}
	end := start + perPage
	if end > total {
		end = total
	}

	items := make([]map[string]any, 0, end-start)
	byKind := map[string]int{}
	byStatus := map[string]int{}
	for _, job := range jobs {
		kind := strings.TrimSpace(job.Kind)
		if kind == "" {
			kind = translationExchangeJobKindExport
		}
		status := normalizeTranslationExchangeJobStatus(job.Status)
		byKind[kind]++
		byStatus[status]++
	}
	for _, job := range jobs[start:end] {
		items = append(items, translationExchangeAsyncJobPayload(job))
	}

	return map[string]any{
		"items":    items,
		"page":     page,
		"per_page": perPage,
		"total":    total,
		"has_more": end < total,
		"counts": map[string]any{
			"by_kind":   byKind,
			"by_status": byStatus,
		},
	}
}

func translationExchangeHistoryExampleJobs(actorID string) []translationExchangeAsyncJob {
	actorID = strings.TrimSpace(primitives.FirstNonEmptyRaw(actorID, "demo-user"))
	now := time.Date(2026, 3, 15, 9, 30, 0, 0, time.UTC)

	exportRows := []TranslationExchangeRow{
		{
			Resource:           "pages",
			EntityID:           "page_translation_demo_exchange",
			TranslationGroupID: "tg_translation_demo_exchange",
			SourceLocale:       "en",
			TargetLocale:       "fr",
			FieldPath:          "title",
			SourceText:         "Translation Demo Exchange",
			SourceHash:         "hash_demo_exchange_title",
			Path:               "/translation-demo-exchange",
			Title:              "Translation Demo Exchange",
			Status:             translationExchangeWorkflowDraft,
			Notes:              "Fixture export row for the wizard history step.",
		},
		{
			Resource:           "pages",
			EntityID:           "page_translation_demo_exchange",
			TranslationGroupID: "tg_translation_demo_exchange",
			SourceLocale:       "en",
			TargetLocale:       "es",
			FieldPath:          "title",
			SourceText:         "Translation Demo Exchange",
			SourceHash:         "hash_demo_exchange_title",
			Path:               "/translation-demo-exchange",
			Title:              "Translation Demo Exchange",
			Status:             translationExchangeWorkflowDraft,
			Notes:              "Fixture export row for the wizard history step.",
		},
	}
	exportResult := TranslationExportResult{
		RowCount: len(exportRows),
		Format:   "json",
		Rows:     exportRows,
	}

	validateRows := []TranslationExchangeRow{
		{
			Index:              0,
			Resource:           "pages",
			EntityID:           "page_translation_demo_exchange",
			TranslationGroupID: "tg_translation_demo_exchange",
			SourceLocale:       "en",
			TargetLocale:       "fr",
			FieldPath:          "title",
			TranslatedText:     "Echange Traduction",
			SourceHash:         "hash_demo_exchange_title",
		},
		{
			Index:              1,
			Resource:           "pages",
			EntityID:           "page_translation_demo_exchange",
			TranslationGroupID: "tg_translation_demo_exchange",
			SourceLocale:       "en",
			TargetLocale:       "es",
			FieldPath:          "title",
			TranslatedText:     "Intercambio Traduccion",
			SourceHash:         "hash_demo_exchange_stale",
		},
	}
	validateResult := TranslationExchangeResult{
		Summary: TranslationExchangeSummary{
			Processed:      2,
			Succeeded:      1,
			Failed:         1,
			Conflicts:      1,
			PartialSuccess: true,
			ByStatus: map[string]int{
				translationExchangeRowStatusSuccess:  1,
				translationExchangeRowStatusConflict: 1,
			},
			ByConflict: map[string]int{
				translationExchangeConflictTypeStaleSource: 1,
			},
		},
		Results: []TranslationExchangeRowResult{
			{
				Index:              0,
				Resource:           "pages",
				EntityID:           "page_translation_demo_exchange",
				TranslationGroupID: "tg_translation_demo_exchange",
				TargetLocale:       "fr",
				FieldPath:          "title",
				Status:             translationExchangeRowStatusSuccess,
			},
			{
				Index:              1,
				Resource:           "pages",
				EntityID:           "page_translation_demo_exchange",
				TranslationGroupID: "tg_translation_demo_exchange",
				TargetLocale:       "es",
				FieldPath:          "title",
				Status:             translationExchangeRowStatusConflict,
				Error:              "source hash mismatch",
				Conflict: &TranslationExchangeConflictInfo{
					Type:               translationExchangeConflictTypeStaleSource,
					Message:            "source hash mismatch",
					CurrentSourceHash:  "hash_demo_exchange_title",
					ProvidedSourceHash: "hash_demo_exchange_stale",
				},
				Metadata: map[string]any{
					"error_code":           TextCodeTranslationExchangeStaleSourceHash,
					"current_source_hash":  "hash_demo_exchange_title",
					"provided_source_hash": "hash_demo_exchange_stale",
				},
			},
		},
		TotalRows: len(validateRows),
	}

	exportJob := translationExchangeAsyncJob{
		ID:           "txex_job_fixture_export_history",
		Kind:         translationExchangeJobKindExport,
		Status:       translationExchangeAsyncJobStatusCompleted,
		Permission:   translationExchangePermissionExport,
		CreatedBy:    actorID,
		Fixture:      true,
		PollEndpoint: "/admin/api/translations/exchange/jobs/txex_job_fixture_export_history",
		Request: map[string]any{
			"resource_count":      1,
			"resources":           []string{"pages"},
			"source_locale":       "en",
			"target_locales":      []string{"fr", "es"},
			"include_source_hash": true,
			"file_name":           "translation_exchange_export_demo.json",
		},
		Progress: map[string]any{
			"total":     exportResult.RowCount,
			"processed": exportResult.RowCount,
			"succeeded": exportResult.RowCount,
			"failed":    0,
		},
		Result:    translationExchangeExportResultPayload(exportResult),
		CreatedAt: now.Add(-4 * time.Hour),
		UpdatedAt: now.Add(-4 * time.Hour).Add(3 * time.Minute),
	}

	validatePayload := translationExchangeResultPayload(validateResult)
	validateDownloads := extractMap(validatePayload["downloads"])
	validateDownloads[translationExchangeDownloadKindInput] = translationExchangeJSONDownload(
		translationExchangeDownloadKindInput,
		"Download sample import",
		"translation_exchange_validate_demo.json",
		"application/json",
		validateRows,
	)
	validatePayload["downloads"] = validateDownloads

	validateJob := translationExchangeAsyncJob{
		ID:           "txex_job_fixture_validate_history",
		Kind:         translationExchangeJobKindImportValidate,
		Status:       translationExchangeAsyncJobStatusCompleted,
		Permission:   translationExchangePermissionImportValidate,
		CreatedBy:    actorID,
		Fixture:      true,
		PollEndpoint: "/admin/api/translations/exchange/jobs/txex_job_fixture_validate_history",
		Request: map[string]any{
			"row_count": len(validateRows),
			"format":    "json",
			"file_name": "translation_exchange_validate_demo.json",
		},
		Progress: map[string]any{
			"total":     validateResult.Summary.Processed,
			"processed": validateResult.Summary.Processed,
			"succeeded": validateResult.Summary.Succeeded,
			"failed":    validateResult.Summary.Failed,
			"conflicts": validateResult.Summary.Conflicts,
		},
		Result:    validatePayload,
		CreatedAt: now.Add(-90 * time.Minute),
		UpdatedAt: now.Add(-87 * time.Minute),
	}

	return []translationExchangeAsyncJob{validateJob, exportJob}
}

func translationExchangeJSONDownload(kind, label, filename, contentType string, payload any) map[string]any {
	raw, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		return nil
	}
	return translationExchangeRawDownload(kind, label, filename, contentType, raw)
}

func translationExchangeExportDownload(result TranslationExportResult) map[string]any {
	format := strings.ToLower(strings.TrimSpace(primitives.FirstNonEmptyRaw(result.Format, "json")))
	switch format {
	case "csv":
		buffer := &bytes.Buffer{}
		writer := csv.NewWriter(buffer)
		_ = writer.Write([]string{
			"resource",
			"entity_id",
			"translation_group_id",
			"source_locale",
			"target_locale",
			"field_path",
			"source_text",
			"translated_text",
			"source_hash",
			"path",
			"title",
			"status",
			"notes",
		})
		for _, row := range result.Rows {
			_ = writer.Write([]string{
				strings.TrimSpace(row.Resource),
				strings.TrimSpace(row.EntityID),
				strings.TrimSpace(row.TranslationGroupID),
				strings.TrimSpace(row.SourceLocale),
				strings.TrimSpace(row.TargetLocale),
				strings.TrimSpace(row.FieldPath),
				strings.TrimSpace(row.SourceText),
				strings.TrimSpace(row.TranslatedText),
				strings.TrimSpace(row.SourceHash),
				strings.TrimSpace(row.Path),
				strings.TrimSpace(row.Title),
				strings.TrimSpace(row.Status),
				strings.TrimSpace(row.Notes),
			})
		}
		writer.Flush()
		if writer.Error() != nil {
			return nil
		}
		return translationExchangeRawDownload(
			translationExchangeDownloadKindArtifact,
			"Download export CSV",
			"translation_exchange_export.csv",
			"text/csv",
			buffer.Bytes(),
		)
	default:
		return translationExchangeJSONDownload(
			translationExchangeDownloadKindArtifact,
			"Download export JSON",
			"translation_exchange_export.json",
			"application/json",
			result.Rows,
		)
	}
}

func translationExchangeValidationReportDownload(kind string, result TranslationExchangeResult) map[string]any {
	filename := "translation_exchange_validation_report.json"
	label := "Download validation report"
	if strings.TrimSpace(kind) == translationExchangeJobKindImportApply {
		filename = "translation_exchange_apply_report.json"
		label = "Download apply report"
	}
	payload := map[string]any{
		"summary": result.Summary,
		"results": result.Results,
	}
	if result.TotalRows > 0 {
		payload["total_rows"] = result.TotalRows
	}
	conflicts := translationExchangeConflictSummary(result.Results)
	if translationExchangeToInt(conflicts["total"]) > 0 {
		payload["conflicts"] = conflicts
	}
	return translationExchangeJSONDownload(
		translationExchangeDownloadKindReport,
		label,
		filename,
		"application/json",
		payload,
	)
}

func translationExchangeRawDownload(kind, label, filename, contentType string, raw []byte) map[string]any {
	if len(raw) == 0 {
		return nil
	}
	contentType = strings.TrimSpace(primitives.FirstNonEmptyRaw(contentType, "application/octet-stream"))
	filename = strings.TrimSpace(primitives.FirstNonEmptyRaw(filename, "translation_exchange_download"))
	return map[string]any{
		"kind":         strings.TrimSpace(kind),
		"label":        strings.TrimSpace(label),
		"filename":     filename,
		"content_type": contentType,
		"href":         "data:" + contentType + ";base64," + base64.StdEncoding.EncodeToString(raw),
	}
}

func translationExchangeDownloadsPayload(result map[string]any) map[string]any {
	downloads := extractMap(result["downloads"])
	if len(downloads) == 0 {
		return nil
	}
	return primitives.CloneAnyMap(downloads)
}

func translationExchangeJobFilePayload(kind string, request, result map[string]any) map[string]any {
	fileName := strings.TrimSpace(toString(request["file_name"]))
	format := strings.ToLower(strings.TrimSpace(toString(request["format"])))
	rowCount := translationExchangeToInt(request["row_count"])

	switch strings.TrimSpace(kind) {
	case translationExchangeJobKindExport:
		summary := extractMap(result["summary"])
		if rowCount <= 0 {
			rowCount = translationExchangeToInt(summary["row_count"])
		}
		if format == "" {
			format = strings.ToLower(strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(summary["format"]), "json")))
		}
		if fileName == "" {
			downloads := translationExchangeDownloadsPayload(result)
			if artifact := extractMap(downloads[translationExchangeDownloadKindArtifact]); len(artifact) > 0 {
				fileName = strings.TrimSpace(toString(artifact["filename"]))
			}
		}
	default:
		if fileName == "" {
			downloads := translationExchangeDownloadsPayload(result)
			for _, key := range []string{translationExchangeDownloadKindInput, translationExchangeDownloadKindReport} {
				entry := extractMap(downloads[key])
				if len(entry) == 0 {
					continue
				}
				fileName = strings.TrimSpace(toString(entry["filename"]))
				if format == "" {
					format = strings.TrimPrefix(strings.ToLower(strings.TrimSpace(toString(entry["content_type"]))), "application/")
				}
				break
			}
		}
	}

	if fileName == "" && format == "" && rowCount <= 0 {
		return nil
	}

	payload := map[string]any{}
	if fileName != "" {
		payload["name"] = fileName
	}
	if format != "" {
		payload["format"] = format
	}
	if rowCount > 0 {
		payload["row_count"] = rowCount
	}
	return payload
}

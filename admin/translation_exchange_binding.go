package admin

import (
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"errors"
	"github.com/goliatone/go-admin/internal/primitives"
	"io"
	"mime/multipart"
	"path/filepath"
	"strings"
	"time"

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

const (
	translationExchangeMaxUploadBytes = 25 * 1024 * 1024
	translationExchangeMaxRows        = 50000
)

var translationExchangeAllowedTopLevelKeys = map[string]map[string]struct{}{
	translationExchangeJobKindExport: {
		"filter":              {},
		"resources":           {},
		"resource":            {},
		"entity_ids":          {},
		"entity_id":           {},
		"source_locale":       {},
		"locale":              {},
		"target_locales":      {},
		"target_locale":       {},
		"field_paths":         {},
		"field_path":          {},
		"include_source_hash": {},
		"options":             {},
		"async":               {},
	},
	translationExchangeJobKindImportValidate: {
		"rows":      {},
		"async":     {},
		"strict":    {},
		"file_name": {},
	},
	translationExchangeJobKindImportApply: {
		"rows":                       {},
		"async":                      {},
		"allow_create_missing":       {},
		"allow_source_hash_override": {},
		"continue_on_error":          {},
		"dry_run":                    {},
		CreateTranslationKey:         {},
		"create_missing_translation": {},
		"strict":                     {},
		"file_name":                  {},
	},
}

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

func (b *translationExchangeBinding) Export(c router.Context) (payload any, err error) {
	startedAt := time.Now()
	obsCtx := c.Context()
	defer func() {
		recordTranslationAPIOperation(obsCtx, translationAPIObservation{
			Operation: "translations.exchange.export",
			Kind:      "write",
			RequestID: requestIDFromContext(obsCtx),
			TraceID:   traceIDFromContext(obsCtx),
			TenantID:  tenantIDFromContext(obsCtx),
			OrgID:     orgIDFromContext(obsCtx),
			Duration:  time.Since(startedAt),
			Err:       err,
		})
	}()
	if b == nil || b.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation exchange binding", map[string]any{
			"component": "translation_exchange_binding",
		})
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	obsCtx = adminCtx.Context
	setTranslationTraceHeaders(c, obsCtx)
	if err := enforceTranslationExchangeCSRF(c); err != nil {
		return nil, err
	}
	if err := b.admin.requirePermission(adminCtx, translationExchangePermissionExport, "translations"); err != nil {
		return nil, err
	}
	input, parsedPayload, err := parseTranslationExportInput(c)
	if err != nil {
		return nil, err
	}
	asyncRequested := translationExchangeAsyncRequested(c, parsedPayload)
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
	recordTranslationExchangeJobMetrics(adminCtx.Context, translationExchangeJobKindExport, translationExchangeAsyncJobStatusCompleted, time.Since(startedAt), result.RowCount)
	job := b.recordCompletedExchangeJob(adminCtx, translationExchangeJobKindExport, translationExchangePermissionExport, translationExchangeExportRequestPayload(input.Filter), translationExchangeExportResultPayload(result))
	return mergeTranslationExchangeExportPayload(result, job), nil
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
				"resource":             "content_items",
				"entity_id":            "item_123",
				"translation_group_id": "tg_123",
				"source_locale":        "en",
				"target_locale":        "es",
				"field_path":           "title",
				"source_text":          "Hello world",
				"translated_text":      "Hola mundo",
				"source_hash":          "0123456789abcdef",
				"path":                 "/example",
				"title":                "Example",
				"status":               "draft",
				"notes":                "",
			},
		})
	default:
		c.SetHeader("Content-Type", "text/csv")
		c.SetHeader("Content-Disposition", "attachment; filename=translation_exchange_template.csv")
		template := strings.Join([]string{
			"resource,entity_id,translation_group_id,source_locale,target_locale,field_path,source_text,translated_text,source_hash,path,title,status,notes",
			"content_items,item_123,tg_123,en,es,title,Hello world,Hola mundo,0123456789abcdef,/example,Example,draft,",
		}, "\n")
		return c.SendString(template)
	}
}

func (b *translationExchangeBinding) ImportValidate(c router.Context) (payload any, err error) {
	startedAt := time.Now()
	obsCtx := c.Context()
	defer func() {
		recordTranslationAPIOperation(obsCtx, translationAPIObservation{
			Operation: "translations.exchange.import_validate",
			Kind:      "write",
			RequestID: requestIDFromContext(obsCtx),
			TraceID:   traceIDFromContext(obsCtx),
			TenantID:  tenantIDFromContext(obsCtx),
			OrgID:     orgIDFromContext(obsCtx),
			Duration:  time.Since(startedAt),
			Err:       err,
		})
	}()
	if b == nil || b.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation exchange binding", map[string]any{
			"component": "translation_exchange_binding",
		})
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	obsCtx = adminCtx.Context
	setTranslationTraceHeaders(c, obsCtx)
	if err := enforceTranslationExchangeCSRF(c); err != nil {
		return nil, err
	}
	if err := b.admin.requirePermission(adminCtx, translationExchangePermissionImportValidate, "translations"); err != nil {
		return nil, err
	}
	rows, parsedPayload, format, err := parseTranslationImportRows(c, false)
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
	recordTranslationExchangeValidationDiagnostics(adminCtx.Context, translationExchangeJobKindImportValidate, format, result)
	recordTranslationExchangeJobMetrics(adminCtx.Context, translationExchangeJobKindImportValidate, translationExchangeAsyncJobStatusCompleted, time.Since(startedAt), len(rows))
	job := b.recordCompletedExchangeJob(adminCtx, translationExchangeJobKindImportValidate, translationExchangePermissionImportValidate, translationExchangeValidateRequestPayload(rows, parsedPayload, format), translationExchangeResultPayload(result))
	return mergeTranslationExchangeResultPayload(result, job), nil
}

func (b *translationExchangeBinding) ImportApply(c router.Context) (payload any, err error) {
	startedAt := time.Now()
	obsCtx := c.Context()
	defer func() {
		recordTranslationAPIOperation(obsCtx, translationAPIObservation{
			Operation: "translations.exchange.import_apply",
			Kind:      "write",
			RequestID: requestIDFromContext(obsCtx),
			TraceID:   traceIDFromContext(obsCtx),
			TenantID:  tenantIDFromContext(obsCtx),
			OrgID:     orgIDFromContext(obsCtx),
			Duration:  time.Since(startedAt),
			Err:       err,
		})
	}()
	if b == nil || b.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation exchange binding", map[string]any{
			"component": "translation_exchange_binding",
		})
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	obsCtx = adminCtx.Context
	setTranslationTraceHeaders(c, obsCtx)
	if err := enforceTranslationExchangeCSRF(c); err != nil {
		return nil, err
	}
	if err := b.admin.requirePermission(adminCtx, translationExchangePermissionImportApply, "translations"); err != nil {
		return nil, err
	}
	rows, parsedPayload, format, err := parseTranslationImportRows(c, true)
	if err != nil {
		return nil, err
	}
	input := TranslationImportApplyInput{
		Rows:                    rows,
		AllowCreateMissing:      exchangeCreateTranslationRequested(parsedPayload),
		AllowSourceHashOverride: toBool(parsedPayload["allow_source_hash_override"]),
		ContinueOnError:         toBool(parsedPayload["continue_on_error"]),
		DryRun:                  toBool(parsedPayload["dry_run"]),
	}
	if translationExchangeAsyncRequested(c, parsedPayload) {
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
	recordTranslationExchangeValidationDiagnostics(adminCtx.Context, translationExchangeJobKindImportApply, format, result)
	recordTranslationExchangeJobMetrics(adminCtx.Context, translationExchangeJobKindImportApply, translationExchangeAsyncJobStatusCompleted, time.Since(startedAt), len(rows))
	job := b.recordCompletedExchangeJob(adminCtx, translationExchangeJobKindImportApply, translationExchangePermissionImportApply, translationExchangeApplyRequestPayload(input, parsedPayload, format), translationExchangeResultPayload(result))
	return mergeTranslationExchangeResultPayload(result, job), nil
}

func (b *translationExchangeBinding) JobStatus(c router.Context, id string) (payload any, err error) {
	startedAt := time.Now()
	obsCtx := c.Context()
	defer func() {
		recordTranslationAPIOperation(obsCtx, translationAPIObservation{
			Operation: "translations.exchange.job_status",
			Kind:      "read",
			RequestID: requestIDFromContext(obsCtx),
			TraceID:   traceIDFromContext(obsCtx),
			TenantID:  tenantIDFromContext(obsCtx),
			OrgID:     orgIDFromContext(obsCtx),
			Duration:  time.Since(startedAt),
			Err:       err,
		})
	}()
	if b == nil || b.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation exchange binding", map[string]any{
			"component": "translation_exchange_binding",
		})
	}
	if strings.TrimSpace(id) == "" {
		id = strings.TrimSpace(firstNonEmpty(c.Param("job_id", ""), c.Param("id", "")))
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
	obsCtx = adminCtx.Context
	setTranslationTraceHeaders(c, obsCtx)
	if err := b.admin.requirePermission(adminCtx, strings.TrimSpace(job.Permission), "translations"); err != nil {
		return nil, err
	}
	if !translationExchangeJobVisibleToIdentity(job, translationIdentityFromAdminContext(adminCtx)) {
		return nil, permissionDenied(strings.TrimSpace(job.Permission), "translations")
	}
	return map[string]any{
		"job": translationExchangeAsyncJobPayload(job),
	}, nil
}

func (b *translationExchangeBinding) History(c router.Context) (payload any, err error) {
	startedAt := time.Now()
	obsCtx := c.Context()
	defer func() {
		recordTranslationAPIOperation(obsCtx, translationAPIObservation{
			Operation: "translations.exchange.history",
			Kind:      "read",
			RequestID: requestIDFromContext(obsCtx),
			TraceID:   traceIDFromContext(obsCtx),
			TenantID:  tenantIDFromContext(obsCtx),
			OrgID:     orgIDFromContext(obsCtx),
			Duration:  time.Since(startedAt),
			Err:       err,
		})
	}()
	if b == nil || b.admin == nil {
		return nil, serviceNotConfiguredDomainError("translation exchange binding", map[string]any{
			"component": "translation_exchange_binding",
		})
	}
	if b.jobs == nil {
		return nil, serviceNotConfiguredDomainError("translation exchange async jobs", map[string]any{
			"component": "translation_exchange_binding",
		})
	}

	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	obsCtx = adminCtx.Context
	setTranslationTraceHeaders(c, obsCtx)
	if err := b.requireHistoryPermission(adminCtx); err != nil {
		return nil, err
	}

	page := clampInt(atoiDefault(c.Query("page"), 1), 1, 10_000)
	perPage := clampInt(atoiDefault(c.Query("per_page"), 20), 1, 100)
	includeExamples := toBool(c.Query("include_examples"))
	kindFilter := translationExchangeHistoryJobKind(c.Query("kind"))
	statusFilter := translationExchangeHistoryJobStatus(c.Query("status"))

	identity := translationIdentityFromAdminContext(adminCtx)
	jobs := b.jobs.ListByActor(identity.ActorID)
	if includeExamples {
		jobs = append(jobs, translationExchangeHistoryExampleJobs(identity.ActorID)...)
	}

	filtered := make([]translationExchangeAsyncJob, 0, len(jobs))
	for _, job := range jobs {
		if !translationExchangeJobVisibleToIdentity(job, identity) {
			continue
		}
		if !b.canViewHistoryJob(adminCtx, job) {
			continue
		}
		if kindFilter != "" && !strings.EqualFold(strings.TrimSpace(job.Kind), kindFilter) {
			continue
		}
		if statusFilter != "" && !strings.EqualFold(normalizeTranslationExchangeJobStatus(job.Status), statusFilter) {
			continue
		}
		filtered = append(filtered, job)
	}

	return map[string]any{
		"history": translationExchangeHistoryPayload(filtered, page, perPage),
		"meta":    translationExchangeHistoryMetaPayload(includeExamples),
	}, nil
}

func (b *translationExchangeBinding) exportAsync(adminCtx AdminContext, input TranslationExportInput) (any, error) {
	if b == nil || b.jobs == nil {
		return nil, serviceNotConfiguredDomainError("translation exchange async jobs", map[string]any{
			"component": "translation_exchange_binding",
		})
	}
	actorID := translationExchangeActorID(adminCtx)
	if actorID == "" {
		return nil, permissionDenied(translationExchangePermissionExport, "translations")
	}
	identity := translationIdentityFromAdminContext(adminCtx)
	job := b.jobs.Create(
		translationExchangeJobKindExport,
		translationExchangePermissionExport,
		actorID,
		identity.TenantID,
		identity.OrgID,
		translationExchangeExportRequestPayload(input.Filter),
	)
	b.jobs.SetPollEndpoint(job.ID, b.jobStatusEndpoint(job.ID))
	b.jobs.SetTrace(job.ID, requestIDFromContext(adminCtx.Context), traceIDFromContext(adminCtx.Context))
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
	recordTranslationExchangeJobMetrics(adminCtx.Context, translationExchangeJobKindExport, translationExchangeAsyncJobStatusCompleted, 0, result.RowCount)

	progress := map[string]any{
		"total":     result.RowCount,
		"processed": result.RowCount,
		"succeeded": result.RowCount,
		"failed":    0,
	}
	resultPayload := translationExchangeExportResultPayload(result)
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
	actorID := translationExchangeActorID(adminCtx)
	if actorID == "" {
		return nil, permissionDenied(translationExchangePermissionImportApply, "translations")
	}
	identity := translationIdentityFromAdminContext(adminCtx)
	job := b.jobs.Create(
		translationExchangeJobKindImportApply,
		translationExchangePermissionImportApply,
		actorID,
		identity.TenantID,
		identity.OrgID,
		translationExchangeApplyRequestPayload(input, nil, ""),
	)
	b.jobs.SetPollEndpoint(job.ID, b.jobStatusEndpoint(job.ID))
	b.jobs.SetTrace(job.ID, requestIDFromContext(adminCtx.Context), traceIDFromContext(adminCtx.Context))
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
	recordTranslationExchangeValidationDiagnostics(adminCtx.Context, translationExchangeJobKindImportApply, "", result)
	recordTranslationExchangeJobMetrics(adminCtx.Context, translationExchangeJobKindImportApply, translationExchangeAsyncJobStatusCompleted, 0, totalRows)

	progress := map[string]any{
		"total":     totalRows,
		"processed": result.Summary.Processed,
		"succeeded": result.Summary.Succeeded,
		"failed":    result.Summary.Failed,
	}
	resultPayload := translationExchangeResultPayload(result)
	b.jobs.Complete(job.ID, progress, resultPayload)
	complete, _ := b.jobs.Get(job.ID)
	return map[string]any{
		"status": "accepted",
		"job":    translationExchangeAsyncJobPayload(complete),
	}, nil
}

func translationExchangeActorID(ctx AdminContext) string {
	return translationIdentityFromAdminContext(ctx).ActorID
}

func translationExchangeJobVisibleToIdentity(job translationExchangeAsyncJob, identity translationTransportIdentity) bool {
	owner := strings.TrimSpace(job.CreatedBy)
	actorID := strings.TrimSpace(identity.ActorID)
	if owner == "" || actorID == "" {
		return false
	}
	if !strings.EqualFold(owner, actorID) {
		return false
	}
	jobTenantID := strings.TrimSpace(job.TenantID)
	identityTenantID := strings.TrimSpace(identity.TenantID)
	if jobTenantID != "" || identityTenantID != "" {
		if jobTenantID == "" || identityTenantID == "" || !strings.EqualFold(jobTenantID, identityTenantID) {
			return false
		}
	}
	jobOrgID := strings.TrimSpace(job.OrgID)
	identityOrgID := strings.TrimSpace(identity.OrgID)
	if jobOrgID != "" || identityOrgID != "" {
		if jobOrgID == "" || identityOrgID == "" || !strings.EqualFold(jobOrgID, identityOrgID) {
			return false
		}
	}
	return true
}

func translationExchangeJobOwnedByActor(job translationExchangeAsyncJob, actorID string) bool {
	return translationExchangeJobVisibleToIdentity(job, translationTransportIdentity{ActorID: actorID})
}

func (b *translationExchangeBinding) requireHistoryPermission(adminCtx AdminContext) error {
	if b == nil || b.admin == nil || b.admin.authorizer == nil {
		return nil
	}
	if CanAny(
		b.admin.authorizer,
		adminCtx.Context,
		"translations",
		translationExchangePermissionImportView,
		translationExchangePermissionExport,
		translationExchangePermissionImportValidate,
		translationExchangePermissionImportApply,
	) {
		return nil
	}
	return permissionDenied(translationExchangePermissionImportView, "translations")
}

func (b *translationExchangeBinding) canViewHistoryJob(adminCtx AdminContext, job translationExchangeAsyncJob) bool {
	if b == nil || b.admin == nil || b.admin.authorizer == nil {
		return true
	}
	permission := strings.TrimSpace(job.Permission)
	if permission == "" {
		return CanAny(
			b.admin.authorizer,
			adminCtx.Context,
			"translations",
			translationExchangePermissionImportView,
			translationExchangePermissionExport,
			translationExchangePermissionImportValidate,
			translationExchangePermissionImportApply,
		)
	}
	return b.admin.authorizer.Can(adminCtx.Context, permission, "translations")
}

func translationExchangeHistoryJobKind(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case translationExchangeJobKindExport:
		return translationExchangeJobKindExport
	case translationExchangeJobKindImportValidate:
		return translationExchangeJobKindImportValidate
	case translationExchangeJobKindImportApply:
		return translationExchangeJobKindImportApply
	default:
		return ""
	}
}

func translationExchangeHistoryJobStatus(value string) string {
	switch normalizeTranslationExchangeJobStatus(value) {
	case translationExchangeAsyncJobStatusRunning:
		if strings.EqualFold(strings.TrimSpace(value), translationExchangeAsyncJobStatusRunning) {
			return translationExchangeAsyncJobStatusRunning
		}
	case translationExchangeAsyncJobStatusCompleted:
		if strings.EqualFold(strings.TrimSpace(value), translationExchangeAsyncJobStatusCompleted) {
			return translationExchangeAsyncJobStatusCompleted
		}
	case translationExchangeAsyncJobStatusFailed:
		if strings.EqualFold(strings.TrimSpace(value), translationExchangeAsyncJobStatusFailed) {
			return translationExchangeAsyncJobStatusFailed
		}
	}
	return ""
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
	path := resolveURLWith(b.admin.URLs(), adminAPIGroup, "translations.jobs.id", map[string]any{"job_id": id}, nil)
	if strings.TrimSpace(path) != "" {
		return path
	}
	base := strings.TrimSuffix(adminAPIBasePath(b.admin), "/")
	if base == "" {
		return "/admin/api/translations/exchange/jobs/" + id
	}
	return base + "/translations/exchange/jobs/" + id
}

func (b *translationExchangeBinding) jobHistoryEndpoint() string {
	statusPath := b.jobStatusEndpoint("__job_id__")
	if statusPath == "" {
		base := strings.TrimSuffix(adminAPIBasePath(b.admin), "/")
		if base == "" {
			return "/admin/api/translations/exchange/jobs"
		}
		return base + "/translations/exchange/jobs"
	}
	return strings.TrimSuffix(statusPath, "/__job_id__")
}

func (b *translationExchangeBinding) recordCompletedExchangeJob(adminCtx AdminContext, kind, permission string, request, result map[string]any) map[string]any {
	if b == nil || b.jobs == nil {
		return nil
	}
	actorID := translationExchangeActorID(adminCtx)
	if actorID == "" {
		actorID = strings.TrimSpace(primitives.FirstNonEmptyRaw(adminCtx.UserID, "system"))
	}
	identity := translationIdentityFromAdminContext(adminCtx)
	job := b.jobs.Create(kind, permission, actorID, identity.TenantID, identity.OrgID, request)
	b.jobs.SetPollEndpoint(job.ID, b.jobStatusEndpoint(job.ID))
	b.jobs.SetTrace(job.ID, requestIDFromContext(adminCtx.Context), traceIDFromContext(adminCtx.Context))
	progress := translationExchangeJobProgressFromResult(kind, result)
	b.jobs.Complete(job.ID, progress, result)
	stored, ok := b.jobs.Get(job.ID)
	if !ok {
		return nil
	}
	return translationExchangeAsyncJobPayload(stored)
}

func mergeTranslationExchangeExportPayload(result TranslationExportResult, job map[string]any) map[string]any {
	payload := map[string]any{
		"row_count": result.RowCount,
	}
	if format := strings.TrimSpace(result.Format); format != "" {
		payload["format"] = format
	}
	if len(result.Rows) > 0 {
		payload["rows"] = result.Rows
	}
	if len(job) > 0 {
		payload["job"] = job
	}
	return payload
}

func mergeTranslationExchangeResultPayload(result TranslationExchangeResult, job map[string]any) map[string]any {
	payload := translationExchangeResultPayload(result)
	if len(job) > 0 {
		payload["job"] = job
	}
	return payload
}

func translationExchangeExportRequestPayload(filter TranslationExportFilter) map[string]any {
	payload := map[string]any{
		"resource_count": len(filter.Resources),
		"file_name":      "translation_exchange_export.json",
	}
	if len(filter.Resources) > 0 {
		payload["resources"] = append([]string{}, filter.Resources...)
	}
	if len(filter.EntityIDs) > 0 {
		payload["entity_ids"] = append([]string{}, filter.EntityIDs...)
	}
	if sourceLocale := strings.TrimSpace(filter.SourceLocale); sourceLocale != "" {
		payload["source_locale"] = sourceLocale
	}
	if len(filter.TargetLocales) > 0 {
		payload["target_locales"] = append([]string{}, filter.TargetLocales...)
	}
	if len(filter.FieldPaths) > 0 {
		payload["field_paths"] = append([]string{}, filter.FieldPaths...)
	}
	if filter.IncludeSourceHash {
		payload["include_source_hash"] = true
	}
	return payload
}

func translationExchangeValidateRequestPayload(rows []TranslationExchangeRow, parsedPayload map[string]any, format string) map[string]any {
	payload := map[string]any{
		"row_count": len(rows),
		"format":    strings.TrimSpace(primitives.FirstNonEmptyRaw(format, "json")),
	}
	if fileName := strings.TrimSpace(toString(parsedPayload["file_name"])); fileName != "" {
		payload["file_name"] = fileName
	}
	if value, ok := parsedPayload["strict"]; ok {
		payload["strict"] = toBool(value)
	}
	return payload
}

func translationExchangeApplyRequestPayload(input TranslationImportApplyInput, parsedPayload map[string]any, format string) map[string]any {
	payload := translationExchangeValidateRequestPayload(input.Rows, parsedPayload, format)
	if input.AllowCreateMissing {
		payload["allow_create_missing"] = true
	}
	if input.AllowSourceHashOverride {
		payload["allow_source_hash_override"] = true
	}
	if input.ContinueOnError {
		payload["continue_on_error"] = true
	}
	if input.DryRun {
		payload["dry_run"] = true
	}
	return payload
}

func translationExchangeExportResultPayload(result TranslationExportResult) map[string]any {
	payload := map[string]any{
		"summary": map[string]any{
			"row_count": result.RowCount,
			"format":    strings.TrimSpace(result.Format),
		},
	}
	if download := translationExchangeExportDownload(result); len(download) > 0 {
		payload["downloads"] = map[string]any{
			translationExchangeDownloadKindArtifact: download,
		}
	}
	return payload
}

func translationExchangeResultPayload(result TranslationExchangeResult) map[string]any {
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
	if download := translationExchangeValidationReportDownload("", result); len(download) > 0 {
		payload["downloads"] = map[string]any{
			translationExchangeDownloadKindReport: download,
		}
	}
	return payload
}

func translationExchangeJobProgressFromResult(kind string, result map[string]any) map[string]any {
	progress := map[string]any{
		"processed": 0,
		"succeeded": 0,
		"failed":    0,
	}
	if kind == translationExchangeJobKindExport {
		summary := extractMap(result["summary"])
		total := translationExchangeToInt(summary["row_count"])
		progress["total"] = total
		progress["processed"] = total
		progress["succeeded"] = total
		return progress
	}
	summary := extractMap(result["summary"])
	progress["total"] = translationExchangeToInt(summary["processed"])
	progress["processed"] = translationExchangeToInt(summary["processed"])
	progress["succeeded"] = translationExchangeToInt(summary["succeeded"])
	progress["failed"] = translationExchangeToInt(summary["failed"])
	if conflicts := translationExchangeToInt(summary["conflicts"]); conflicts > 0 {
		progress["conflicts"] = conflicts
	}
	if skipped := translationExchangeToInt(summary["skipped"]); skipped > 0 {
		progress["skipped"] = skipped
	}
	return progress
}

func translationExchangeToInt(value any) int {
	switch typed := value.(type) {
	case int:
		return typed
	case int32:
		return int(typed)
	case int64:
		return int(typed)
	case float32:
		return int(typed)
	case float64:
		return int(typed)
	default:
		return 0
	}
}

func parseTranslationExportInput(c router.Context) (TranslationExportInput, map[string]any, error) {
	body, err := parseOptionalJSONMap(c.Body())
	if err != nil {
		return TranslationExportInput{}, nil, err
	}
	if err := validateTranslationExchangeTopLevelKeys(body, translationExchangeJobKindExport); err != nil {
		return TranslationExportInput{}, nil, err
	}
	if err := rejectTranslationClientIdentityFields(body); err != nil {
		return TranslationExportInput{}, nil, err
	}
	filterPayload := extractMap(body["filter"])
	if err := rejectTranslationClientIdentityFields(filterPayload); err != nil {
		return TranslationExportInput{}, nil, err
	}
	if len(filterPayload) == 0 {
		filterPayload = body
	}
	filter := TranslationExportFilter{
		Resources:         nonEmptyStrings(toStringSlice(filterPayload["resources"]), splitIDs(c.Query("resources")), splitIDs(c.Query("resource"))),
		EntityIDs:         nonEmptyStrings(toStringSlice(filterPayload["entity_ids"]), splitIDs(c.Query("entity_ids")), splitIDs(c.Query("entity_id")), splitIDs(c.Query("id")), splitIDs(c.Query("ids"))),
		SourceLocale:      primitives.FirstNonEmptyRaw(strings.TrimSpace(toString(filterPayload["source_locale"])), strings.TrimSpace(c.Query("source_locale")), strings.TrimSpace(c.Query("locale"))),
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
		if err := validateTranslationExchangeRowLimit(len(rows)); err != nil {
			return nil, nil, "", err
		}
		payload := extractTranslationImportOptions(c, nil)
		if fileName := strings.TrimSpace(file.Filename); fileName != "" {
			payload["file_name"] = fileName
		}
		return rows, payload, format, nil
	}
	raw := bytes.TrimSpace(c.Body())
	if len(raw) == 0 {
		return nil, nil, "", TranslationExchangeInvalidPayloadError{
			Message: "rows required",
			Field:   "rows",
		}
	}
	if err := validateTranslationExchangeJSONBodySize(len(raw)); err != nil {
		return nil, nil, "", err
	}
	rows, payload, err := parseTranslationImportJSON(raw, requireTranslatedText)
	if err != nil {
		return nil, nil, "", err
	}
	if err := validateTranslationExchangeRowLimit(len(rows)); err != nil {
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
	if err := validateTranslationExchangeUpload(file); err != nil {
		return nil, "", err
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
		if err := validateTranslationExchangeJSONBodySize(len(payload)); err != nil {
			return nil, nil, err
		}
		rawRows := []map[string]any{}
		if err := json.Unmarshal(payload, &rawRows); err != nil {
			return nil, nil, TranslationExchangeInvalidPayloadError{
				Message: "invalid json payload",
				Field:   "rows",
				Format:  "json",
			}
		}
		if err := validateTranslationExchangeJSONRows(rawRows); err != nil {
			return nil, nil, err
		}
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
		jobKind := translationExchangeJobKindImportValidate
		if requireTranslatedText {
			jobKind = translationExchangeJobKindImportApply
		}
		if err := validateTranslationExchangeTopLevelKeys(body, jobKind); err != nil {
			return nil, nil, err
		}
		if err := rejectTranslationClientIdentityFields(body); err != nil {
			return nil, nil, err
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
		rawRows := []map[string]any{}
		if err := json.Unmarshal(rowsPayload, &rawRows); err != nil {
			return nil, nil, TranslationExchangeInvalidPayloadError{
				Message: "invalid rows payload",
				Field:   "rows",
				Format:  "json",
			}
		}
		if err := validateTranslationExchangeJSONRows(rawRows); err != nil {
			return nil, nil, err
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
		if err := validateTranslationExchangeRowLimit(len(rows)); err != nil {
			return nil, err
		}
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

func validateTranslationExchangeUpload(file *multipart.FileHeader) error {
	if file == nil {
		return validationDomainError("file required", map[string]any{
			"field": "file",
		})
	}
	if file.Size > translationExchangeMaxUploadBytes {
		return validationDomainError("translation exchange upload exceeds file size limit", map[string]any{
			"field":       "file",
			"limit_bytes": translationExchangeMaxUploadBytes,
			"size_bytes":  file.Size,
		})
	}
	ext := strings.TrimPrefix(strings.ToLower(strings.TrimSpace(filepath.Ext(file.Filename))), ".")
	contentType := strings.ToLower(strings.TrimSpace(file.Header.Get("Content-Type")))
	allowed := map[string][]string{
		"csv":  {"text/csv", "application/csv", "application/vnd.ms-excel", "text/plain", "application/octet-stream"},
		"json": {"application/json", "text/json", "application/octet-stream", "text/plain"},
	}
	mimes, ok := allowed[ext]
	if !ok {
		return TranslationExchangeUnsupportedFormatError{
			Format:    ext,
			Supported: translationExchangeSupportedFormats,
		}
	}
	if contentType == "" {
		return nil
	}
	for _, mime := range mimes {
		if strings.Contains(contentType, mime) {
			return nil
		}
	}
	return validationDomainError("translation exchange upload MIME type not allowed", map[string]any{
		"field":        "file",
		"file_ext":     ext,
		"content_type": contentType,
	})
}

func validateTranslationExchangeJSONBodySize(size int) error {
	if size <= translationExchangeMaxUploadBytes {
		return nil
	}
	return validationDomainError("translation exchange payload exceeds file size limit", map[string]any{
		"field":       "rows",
		"limit_bytes": translationExchangeMaxUploadBytes,
		"size_bytes":  size,
	})
}

func validateTranslationExchangeRowLimit(count int) error {
	if count <= translationExchangeMaxRows {
		return nil
	}
	return validationDomainError("translation exchange payload exceeds row limit", map[string]any{
		"field":      "rows",
		"limit_rows": translationExchangeMaxRows,
		"row_count":  count,
	})
}

func validateTranslationExchangeTopLevelKeys(body map[string]any, jobKind string) error {
	if len(body) == 0 {
		return nil
	}
	allowed, ok := translationExchangeAllowedTopLevelKeys[jobKind]
	if !ok || len(allowed) == 0 {
		return nil
	}
	for key := range body {
		if _, valid := allowed[key]; valid {
			continue
		}
		return validationDomainError("unknown translation exchange top-level key", map[string]any{
			"field":       key,
			"job_kind":    jobKind,
			"strict_mode": true,
		})
	}
	return nil
}

func validateTranslationExchangeJSONRows(rows []map[string]any) error {
	allowed := map[string]struct{}{
		"resource":             {},
		"entity_id":            {},
		"translation_group_id": {},
		"source_locale":        {},
		"target_locale":        {},
		"field_path":           {},
		"source_text":          {},
		"translated_text":      {},
		"source_hash":          {},
		"path":                 {},
		"title":                {},
		"status":               {},
		"notes":                {},
		"metadata":             {},
		"create_translation":   {},
		"index":                {},
	}
	for index, row := range rows {
		for key := range row {
			if _, ok := allowed[key]; ok {
				continue
			}
			return validationDomainError("unknown translation exchange row field", map[string]any{
				"field":       key,
				"row":         index,
				"strict_mode": true,
			})
		}
	}
	return nil
}

func enforceTranslationExchangeCSRF(c router.Context) error {
	if c == nil {
		return nil
	}
	if !strings.EqualFold(strings.TrimSpace(c.Method()), "POST") {
		return nil
	}
	if strings.TrimSpace(c.Header("Cookie")) == "" {
		return nil
	}
	if strings.TrimSpace(c.Header("X-CSRF-Token")) != "" {
		return nil
	}
	host := strings.TrimSpace(firstNonEmpty(c.Header("X-Forwarded-Host"), c.Header("Host")))
	origin := strings.TrimSpace(firstNonEmpty(c.Header("Origin"), c.Header("Referer")))
	if host != "" && origin != "" && strings.Contains(origin, host) {
		return nil
	}
	return permissionDenied("csrf", "translations")
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
		out = primitives.CloneAnyMap(payload)
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
			"type":                 primitives.FirstNonEmptyRaw(conflictType, "missing_linkage"),
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

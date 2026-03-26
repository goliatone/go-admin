package admin

import (
	"context"
	"encoding/base64"
	"errors"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/goliatone/go-admin/internal/primitives"
)

type TranslationExchangeRuntime struct {
	store             TranslationExchangeRuntimeStore
	exporter          TranslationExchangeExporter
	applier           TranslationExchangeApplier
	applyService      *TranslationExchangeService
	leaseDuration     time.Duration
	heartbeatInterval time.Duration
	workerID          string

	mu      sync.Mutex
	running map[string]struct{}
}

func NewTranslationExchangeRuntime(store TranslationExchangeRuntimeStore, exporter TranslationExchangeExporter, applyService *TranslationExchangeService) *TranslationExchangeRuntime {
	if store == nil {
		return nil
	}
	return &TranslationExchangeRuntime{
		store:             store,
		exporter:          exporter,
		applyService:      applyService,
		leaseDuration:     30 * time.Second,
		heartbeatInterval: 10 * time.Second,
		workerID:          defaultTranslationExchangeRuntimeJobID(),
		running:           map[string]struct{}{},
	}
}

func (r *TranslationExchangeRuntime) Configure(exporter TranslationExchangeExporter, applier TranslationExchangeApplier) {
	if r == nil {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	if exporter != nil {
		r.exporter = exporter
	}
	if applier != nil {
		r.applier = applier
	}
}

func (r *TranslationExchangeRuntime) Start(ctx context.Context) error {
	if r == nil || r.store == nil {
		return nil
	}
	jobs, err := r.store.ListRecoverableJobs(ctx, time.Now().UTC(), 100)
	if err != nil {
		return err
	}
	for _, job := range jobs {
		r.ensureWorker(job.ID)
	}
	return nil
}

func (r *TranslationExchangeRuntime) QueueExport(ctx context.Context, job translationExchangeAsyncJob) (translationExchangeAsyncJob, error) {
	if r == nil || r.store == nil {
		return translationExchangeAsyncJob{}, serviceNotConfiguredDomainError("translation exchange runtime", map[string]any{
			"component": "translation_exchange_runtime",
		})
	}
	if strings.TrimSpace(job.Status) == "" {
		job.Status = translationExchangeAsyncJobStatusRunning
	}
	created, err := r.store.CreateJob(ctx, job)
	if err != nil {
		return translationExchangeAsyncJob{}, err
	}
	r.ensureWorker(created.ID)
	return created, nil
}

func (r *TranslationExchangeRuntime) QueueApply(ctx context.Context, identity translationTransportIdentity, job translationExchangeAsyncJob, rows []TranslationExchangeRow) (translationExchangeAsyncJob, bool, error) {
	if r == nil || r.store == nil {
		return translationExchangeAsyncJob{}, false, serviceNotConfiguredDomainError("translation exchange runtime", map[string]any{
			"component": "translation_exchange_runtime",
		})
	}
	if existing, ok, err := r.store.FindJobByRequestHash(ctx, job.Kind, identity, job.RequestHash); err != nil {
		return translationExchangeAsyncJob{}, false, err
	} else if ok {
		return existing, true, nil
	}
	if strings.TrimSpace(job.Status) == "" {
		job.Status = translationExchangeAsyncJobStatusRunning
	}
	created, err := r.store.CreateJob(ctx, job)
	if err != nil {
		return translationExchangeAsyncJob{}, false, err
	}
	if err := r.store.SaveJobRows(ctx, created, rows); err != nil {
		return translationExchangeAsyncJob{}, false, err
	}
	r.ensureWorker(created.ID)
	return created, false, nil
}

func (r *TranslationExchangeRuntime) RecordCompletedJob(ctx context.Context, job translationExchangeAsyncJob, rows []TranslationExchangeRow, result map[string]any) (translationExchangeAsyncJob, error) {
	if r == nil || r.store == nil {
		return translationExchangeAsyncJob{}, nil
	}
	job.Status = translationExchangeAsyncJobStatusRunning
	created, err := r.store.CreateJob(ctx, job)
	if err != nil {
		return translationExchangeAsyncJob{}, err
	}
	if len(rows) > 0 {
		if err := r.store.SaveJobRows(ctx, created, rows); err != nil {
			return translationExchangeAsyncJob{}, err
		}
	}
	if err := r.store.ReplaceJobArtifacts(ctx, created, translationExchangeArtifactsFromPayload(result)); err != nil {
		return translationExchangeAsyncJob{}, err
	}
	retention := translationExchangeJobRetentionPayload(created.PollEndpoint, result)
	return r.store.CompleteJob(ctx, created.ID, "", translationExchangeJobProgressFromResult(created.Kind, result), translationExchangeStoredResultPayload(result), retention, time.Now().UTC())
}

func (r *TranslationExchangeRuntime) GetJob(ctx context.Context, identity translationTransportIdentity, id string) (translationExchangeAsyncJob, bool, error) {
	if r == nil || r.store == nil {
		return translationExchangeAsyncJob{}, false, nil
	}
	return r.store.GetJob(ctx, identity, id)
}

func (r *TranslationExchangeRuntime) DeleteJob(ctx context.Context, identity translationTransportIdentity, id string) (translationExchangeAsyncJob, bool, error) {
	if r == nil || r.store == nil {
		return translationExchangeAsyncJob{}, false, nil
	}
	return r.store.DeleteJob(ctx, identity, id)
}

func (r *TranslationExchangeRuntime) ListJobs(ctx context.Context, query translationExchangeJobQuery) ([]translationExchangeAsyncJob, int, error) {
	if r == nil || r.store == nil {
		return nil, 0, nil
	}
	return r.store.ListJobs(ctx, query)
}

func (r *TranslationExchangeRuntime) ensureWorker(jobID string) {
	if r == nil {
		return
	}
	jobID = strings.TrimSpace(jobID)
	if jobID == "" {
		return
	}
	r.mu.Lock()
	if _, ok := r.running[jobID]; ok {
		r.mu.Unlock()
		return
	}
	r.running[jobID] = struct{}{}
	r.mu.Unlock()
	go func() {
		defer func() {
			r.mu.Lock()
			delete(r.running, jobID)
			r.mu.Unlock()
		}()
		r.runJob(context.Background(), jobID)
	}()
}

func (r *TranslationExchangeRuntime) runJob(ctx context.Context, jobID string) {
	now := time.Now().UTC()
	job, claimed, err := r.store.ClaimJob(ctx, jobID, r.workerID, now, now.Add(r.leaseDuration))
	if err != nil || !claimed {
		return
	}
	progressMu := sync.Mutex{}
	currentProgress := primitives.CloneAnyMap(job.Progress)
	heartbeatDone := make(chan struct{})
	go r.heartbeatLoop(ctx, job.ID, &progressMu, &currentProgress, heartbeatDone)
	defer close(heartbeatDone)

	switch strings.TrimSpace(job.Kind) {
	case translationExchangeJobKindExport:
		r.executeExportJob(ctx, job, &progressMu, &currentProgress)
	case translationExchangeJobKindImportApply:
		r.executeApplyJob(ctx, job, &progressMu, &currentProgress)
	}
}

func (r *TranslationExchangeRuntime) handlers() (TranslationExchangeExporter, TranslationExchangeApplier, *TranslationExchangeService) {
	if r == nil {
		return nil, nil, nil
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.exporter, r.applier, r.applyService
}

func (r *TranslationExchangeRuntime) heartbeatLoop(ctx context.Context, jobID string, mu *sync.Mutex, progress *map[string]any, done <-chan struct{}) {
	if r == nil || r.store == nil {
		return
	}
	ticker := time.NewTicker(r.heartbeatInterval)
	defer ticker.Stop()
	for {
		select {
		case <-done:
			return
		case <-ticker.C:
			now := time.Now().UTC()
			mu.Lock()
			snapshot := primitives.CloneAnyMap(*progress)
			mu.Unlock()
			_ = r.store.HeartbeatJob(ctx, jobID, r.workerID, snapshot, now, now.Add(r.leaseDuration))
		}
	}
}

func (r *TranslationExchangeRuntime) failJob(ctx context.Context, jobID string, failure error) {
	if r == nil || r.store == nil {
		return
	}
	_, _ = r.store.FailJob(ctx, jobID, r.workerID, map[string]any{"failed": 1}, failure, time.Now().UTC())
}

func (r *TranslationExchangeRuntime) executeExportJob(ctx context.Context, job translationExchangeAsyncJob, progressMu *sync.Mutex, currentProgress *map[string]any) {
	exporter, _, _ := r.handlers()
	if r == nil || exporter == nil {
		r.failJob(ctx, job.ID, errors.New("translation exchange exporter not configured"))
		return
	}
	input := translationExchangeExportInputFromRequest(job.Request)
	result, err := exporter.Export(ctx, input)
	if err != nil {
		r.failJob(ctx, job.ID, err)
		return
	}
	responsePayload := translationExchangeExportResultPayload(result)
	progress := map[string]any{
		"total":     result.RowCount,
		"processed": result.RowCount,
		"succeeded": result.RowCount,
		"failed":    0,
	}
	progressMu.Lock()
	*currentProgress = primitives.CloneAnyMap(progress)
	progressMu.Unlock()
	_ = r.store.ReplaceJobArtifacts(ctx, job, translationExchangeArtifactsFromPayload(responsePayload))
	_, _ = r.store.CompleteJob(ctx, job.ID, r.workerID, progress, translationExchangeStoredResultPayload(responsePayload), translationExchangeJobRetentionPayload(job.PollEndpoint, responsePayload), time.Now().UTC())
}

func (r *TranslationExchangeRuntime) executeApplyJob(ctx context.Context, job translationExchangeAsyncJob, progressMu *sync.Mutex, currentProgress *map[string]any) {
	_, applier, applyService := r.handlers()
	if r == nil || (applyService == nil && applier == nil) {
		r.failJob(ctx, job.ID, errors.New("translation exchange apply service not configured"))
		return
	}
	rows, err := r.store.ListJobRows(ctx, job.ID)
	if err != nil {
		r.failJob(ctx, job.ID, err)
		return
	}
	if applyService == nil {
		r.executeApplyJobWithExecutor(ctx, job, rows, applier, progressMu, currentProgress)
		return
	}
	input := translationExchangeApplyInputFromRequest(job.Request, rows)
	resolutions := translationExchangeResolutionMap(nil)
	seen := map[string]int{}
	result := TranslationExchangeResult{
		Results:   make([]TranslationExchangeRowResult, 0, len(rows)),
		TotalRows: len(rows),
	}
	for position, stored := range rows {
		if stored.Result != nil {
			if stored.SeenRegistered && strings.TrimSpace(stored.LinkageKey) != "" {
				seen[stored.LinkageKey] = stored.RowIndex
			}
			result.Add(*stored.Result)
			continue
		}
		outcome, applyErr := applyService.applyImportRow(ctx, input, stored.Input, stored.RowIndex, seen, resolutions)
		if applyErr != nil {
			r.failJob(ctx, job.ID, applyErr)
			return
		}
		stored.Result = &outcome.RowResult
		stored.LinkageKey = outcome.SeenKey
		stored.PayloadHash = strings.TrimSpace(toString(outcome.RowResult.Metadata["payload_hash"]))
		stored.SeenRegistered = outcome.SeenRegistered
		stored.CreateTranslation = stored.Input.CreateTranslation
		if appliedAt := strings.TrimSpace(toString(outcome.RowResult.Metadata["applied_at"])); appliedAt != "" {
			if parsed, parseErr := time.Parse(time.RFC3339Nano, appliedAt); parseErr == nil {
				stored.AppliedAt = parsed.UTC()
			}
		}
		if stored.AppliedAt.IsZero() && strings.EqualFold(strings.TrimSpace(outcome.RowResult.Status), translationExchangeRowStatusSuccess) {
			stored.AppliedAt = time.Now().UTC()
		}
		stored.UpdatedAt = time.Now().UTC()
		_ = r.store.UpsertJobRow(ctx, job.ID, stored)
		if outcome.SeenRegistered && strings.TrimSpace(outcome.SeenKey) != "" {
			seen[outcome.SeenKey] = stored.RowIndex
		}
		result.Add(outcome.RowResult)
		progress := translationExchangeProgressFromResultSummary(result.Summary, len(rows))
		progressMu.Lock()
		*currentProgress = primitives.CloneAnyMap(progress)
		progressMu.Unlock()
		if outcome.TerminalStop {
			for tail := position + 1; tail < len(rows); tail++ {
				pending := rows[tail]
				if pending.Result != nil {
					result.Add(*pending.Result)
					continue
				}
				rowResult := translationExchangeRowResult(tail, pending.Input)
				rowResult.Status = translationExchangeRowStatusSkipped
				rowResult.Error = "skipped due to previous row failure and continue_on_error=false"
				pending.Result = &rowResult
				pending.UpdatedAt = time.Now().UTC()
				_ = r.store.UpsertJobRow(ctx, job.ID, pending)
				result.Add(rowResult)
			}
			break
		}
	}
	inputRows := translationExchangeInputRowsFromStoredRows(rows)
	responsePayload := translationExchangeResultPayloadForKind(translationExchangeJobKindImportApply, result, inputRows)
	progress := translationExchangeProgressFromResultSummary(result.Summary, len(rows))
	progressMu.Lock()
	*currentProgress = primitives.CloneAnyMap(progress)
	progressMu.Unlock()
	_ = r.store.ReplaceJobArtifacts(ctx, job, translationExchangeArtifactsFromPayload(responsePayload))
	_, _ = r.store.CompleteJob(ctx, job.ID, r.workerID, progress, translationExchangeStoredResultPayload(responsePayload), translationExchangeJobRetentionPayload(job.PollEndpoint, responsePayload), time.Now().UTC())
}

func (r *TranslationExchangeRuntime) executeApplyJobWithExecutor(ctx context.Context, job translationExchangeAsyncJob, rows []translationExchangeStoredRow, applier TranslationExchangeApplier, progressMu *sync.Mutex, currentProgress *map[string]any) {
	if applier == nil {
		r.failJob(ctx, job.ID, errors.New("translation exchange apply service not configured"))
		return
	}
	input := translationExchangeApplyInputFromRequest(job.Request, rows)
	result, err := applier.ApplyImport(ctx, input)
	if err != nil {
		r.failJob(ctx, job.ID, err)
		return
	}
	resultsByIndex := map[int]TranslationExchangeRowResult{}
	for _, rowResult := range result.Results {
		resultsByIndex[rowResult.Index] = rowResult
	}
	for _, stored := range rows {
		rowResult, ok := resultsByIndex[stored.RowIndex]
		if !ok {
			continue
		}
		stored.Result = &rowResult
		stored.PayloadHash = strings.TrimSpace(toString(rowResult.Metadata["payload_hash"]))
		stored.LinkageKey = strings.TrimSpace(toString(rowResult.Metadata["linkage_key"]))
		stored.CreateTranslation = stored.Input.CreateTranslation
		if appliedAt := strings.TrimSpace(toString(rowResult.Metadata["applied_at"])); appliedAt != "" {
			if parsed, parseErr := time.Parse(time.RFC3339Nano, appliedAt); parseErr == nil {
				stored.AppliedAt = parsed.UTC()
			}
		}
		stored.UpdatedAt = time.Now().UTC()
		_ = r.store.UpsertJobRow(ctx, job.ID, stored)
	}
	responsePayload := translationExchangeResultPayloadForKind(translationExchangeJobKindImportApply, result, translationExchangeInputRowsFromStoredRows(rows))
	progress := translationExchangeProgressFromResultSummary(result.Summary, len(rows))
	progressMu.Lock()
	*currentProgress = primitives.CloneAnyMap(progress)
	progressMu.Unlock()
	_ = r.store.ReplaceJobArtifacts(ctx, job, translationExchangeArtifactsFromPayload(responsePayload))
	_, _ = r.store.CompleteJob(ctx, job.ID, r.workerID, progress, translationExchangeStoredResultPayload(responsePayload), translationExchangeJobRetentionPayload(job.PollEndpoint, responsePayload), time.Now().UTC())
}

func translationExchangeProgressFromResultSummary(summary TranslationExchangeSummary, total int) map[string]any {
	progress := map[string]any{
		"total":     total,
		"processed": summary.Processed,
		"succeeded": summary.Succeeded,
		"failed":    summary.Failed,
	}
	if summary.Conflicts > 0 {
		progress["conflicts"] = summary.Conflicts
	}
	if summary.Skipped > 0 {
		progress["skipped"] = summary.Skipped
	}
	return progress
}

func translationExchangeExportInputFromRequest(request map[string]any) TranslationExportInput {
	return TranslationExportInput{
		Filter: TranslationExportFilter{
			Resources:         toStringSlice(request["resources"]),
			EntityIDs:         toStringSlice(request["entity_ids"]),
			SourceLocale:      strings.TrimSpace(toString(request["source_locale"])),
			TargetLocales:     toStringSlice(request["target_locales"]),
			FieldPaths:        toStringSlice(request["field_paths"]),
			IncludeSourceHash: toBool(request["include_source_hash"]),
		},
	}
}

func translationExchangeApplyInputFromRequest(request map[string]any, storedRows []translationExchangeStoredRow) TranslationImportApplyInput {
	return TranslationImportApplyInput{
		Rows:                    translationExchangeInputRowsFromStoredRows(storedRows),
		AllowCreateMissing:      toBool(request["allow_create_missing"]),
		AllowSourceHashOverride: toBool(request["allow_source_hash_override"]),
		ContinueOnError:         toBool(request["continue_on_error"]),
		DryRun:                  toBool(request["dry_run"]),
	}
}

func translationExchangeInputRowsFromStoredRows(storedRows []translationExchangeStoredRow) []TranslationExchangeRow {
	if len(storedRows) == 0 {
		return nil
	}
	rows := make([]TranslationExchangeRow, 0, len(storedRows))
	sort.SliceStable(storedRows, func(i, j int) bool { return storedRows[i].RowIndex < storedRows[j].RowIndex })
	for _, row := range storedRows {
		rows = append(rows, cloneTranslationExchangeRow(row.Input))
	}
	return rows
}

func translationExchangeStoredResultPayload(payload map[string]any) map[string]any {
	out := primitives.CloneAnyMap(payload)
	delete(out, "downloads")
	return out
}

func translationExchangeArtifactsFromPayload(payload map[string]any) []translationExchangeJobArtifact {
	downloads := extractMap(payload["downloads"])
	if len(downloads) == 0 {
		return nil
	}
	artifacts := make([]translationExchangeJobArtifact, 0, len(downloads))
	keys := make([]string, 0, len(downloads))
	for key := range downloads {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	for _, key := range keys {
		entry := extractMap(downloads[key])
		content, contentType := translationExchangeDecodeDownloadHref(toString(entry["href"]), toString(entry["content_type"]))
		artifacts = append(artifacts, translationExchangeJobArtifact{
			Kind:        strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(entry["kind"]), key)),
			Label:       strings.TrimSpace(toString(entry["label"])),
			Filename:    strings.TrimSpace(toString(entry["filename"])),
			ContentType: strings.TrimSpace(contentType),
			Content:     content,
		})
	}
	return artifacts
}

func translationExchangeDecodeDownloadHref(href, fallbackContentType string) ([]byte, string) {
	href = strings.TrimSpace(href)
	if !strings.HasPrefix(href, "data:") {
		return nil, strings.TrimSpace(fallbackContentType)
	}
	parts := strings.SplitN(strings.TrimPrefix(href, "data:"), ",", 2)
	if len(parts) != 2 {
		return nil, strings.TrimSpace(fallbackContentType)
	}
	meta := strings.TrimSpace(parts[0])
	contentType := strings.TrimSpace(fallbackContentType)
	if before, after, ok := strings.Cut(meta, ";"); ok {
		if contentType == "" {
			contentType = strings.TrimSpace(before)
		}
		if strings.Contains(after, "base64") {
			content, err := base64.StdEncoding.DecodeString(parts[1])
			if err == nil {
				return content, contentType
			}
			return nil, contentType
		}
	}
	if contentType == "" {
		contentType = strings.TrimSpace(meta)
	}
	return []byte(parts[1]), contentType
}

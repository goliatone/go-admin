package admin

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/goliatone/go-admin/internal/primitives"
	"github.com/uptrace/bun"
)

type BunTranslationExchangeRuntimeStore struct {
	db *bun.DB
}

func NewBunTranslationExchangeRuntimeStore(db *bun.DB) *BunTranslationExchangeRuntimeStore {
	if db == nil {
		return nil
	}
	return &BunTranslationExchangeRuntimeStore{db: db}
}

type bunTranslationExchangeJobRecord struct {
	bun.BaseModel `bun:"table:exchange_jobs,alias:txj"`

	JobID          string     `bun:"job_id,pk" json:"job_id"`
	TenantID       string     `bun:"tenant_id" json:"tenant_id"`
	OrgID          string     `bun:"org_id" json:"org_id"`
	Kind           string     `bun:"kind" json:"kind"`
	Status         string     `bun:"status" json:"status"`
	CreatedBy      string     `bun:"created_by" json:"created_by"`
	Permission     string     `bun:"permission" json:"permission"`
	RequestHash    string     `bun:"request_hash" json:"request_hash"`
	RequestJSON    string     `bun:"request_json" json:"request_json"`
	ProgressJSON   string     `bun:"progress_json" json:"progress_json"`
	SummaryJSON    string     `bun:"summary_json" json:"summary_json"`
	ResultJSON     string     `bun:"result_json" json:"result_json"`
	RetentionJSON  string     `bun:"retention_json" json:"retention_json"`
	Error          string     `bun:"error" json:"error"`
	RequestID      string     `bun:"request_id" json:"request_id"`
	TraceID        string     `bun:"trace_id" json:"trace_id"`
	PollEndpoint   string     `bun:"poll_endpoint" json:"poll_endpoint"`
	WorkerID       string     `bun:"worker_id" json:"worker_id"`
	StartedAt      *time.Time `bun:"started_at" json:"started_at"`
	CompletedAt    *time.Time `bun:"completed_at" json:"completed_at"`
	HeartbeatAt    *time.Time `bun:"heartbeat_at" json:"heartbeat_at"`
	LeaseExpiresAt *time.Time `bun:"lease_expires_at" json:"lease_expires_at"`
	DeletedAt      *time.Time `bun:"deleted_at" json:"deleted_at"`
	CreatedAt      time.Time  `bun:"created_at" json:"created_at"`
	UpdatedAt      time.Time  `bun:"updated_at" json:"updated_at"`
}

type bunTranslationExchangeJobRowRecord struct {
	bun.BaseModel `bun:"table:translation_exchange_job_rows,alias:txjr"`

	JobID             string     `bun:"job_id,pk" json:"job_id"`
	RowIndex          int        `bun:"row_index,pk" json:"row_index"`
	TenantID          string     `bun:"tenant_id" json:"tenant_id"`
	OrgID             string     `bun:"org_id" json:"org_id"`
	Kind              string     `bun:"kind" json:"kind"`
	Status            string     `bun:"status" json:"status"`
	InputJSON         string     `bun:"input_json" json:"input_json"`
	ResultJSON        string     `bun:"result_json" json:"result_json"`
	LinkageKey        string     `bun:"linkage_key" json:"linkage_key"`
	PayloadHash       string     `bun:"payload_hash" json:"payload_hash"`
	SeenRegistered    bool       `bun:"seen_registered" json:"seen_registered"`
	CreateTranslation bool       `bun:"create_translation" json:"create_translation"`
	AppliedAt         *time.Time `bun:"applied_at" json:"applied_at"`
	CreatedAt         time.Time  `bun:"created_at" json:"created_at"`
	UpdatedAt         time.Time  `bun:"updated_at" json:"updated_at"`
}

type bunTranslationExchangeJobArtifactRecord struct {
	bun.BaseModel `bun:"table:translation_exchange_job_artifacts,alias:txja"`

	JobID        string    `bun:"job_id,pk" json:"job_id"`
	Kind         string    `bun:"kind,pk" json:"kind"`
	Label        string    `bun:"label" json:"label"`
	Filename     string    `bun:"filename" json:"filename"`
	ContentType  string    `bun:"content_type" json:"content_type"`
	ContentBytes []byte    `bun:"content_bytes" json:"content_bytes"`
	CreatedAt    time.Time `bun:"created_at" json:"created_at"`
	UpdatedAt    time.Time `bun:"updated_at" json:"updated_at"`
}

type bunTranslationExchangeApplyLedgerRecord struct {
	bun.BaseModel `bun:"table:translation_exchange_apply_ledger,alias:txal"`

	LedgerID          string    `bun:"ledger_id,pk" json:"ledger_id"`
	TenantID          string    `bun:"tenant_id" json:"tenant_id"`
	OrgID             string    `bun:"org_id" json:"org_id"`
	LinkageKey        string    `bun:"linkage_key" json:"linkage_key"`
	PayloadHash       string    `bun:"payload_hash" json:"payload_hash"`
	CreateTranslation bool      `bun:"create_translation" json:"create_translation"`
	WorkflowStatus    string    `bun:"workflow_status" json:"workflow_status"`
	AppliedAt         time.Time `bun:"applied_at" json:"applied_at"`
	RequestJSON       string    `bun:"request_json" json:"request_json"`
}

func (s *BunTranslationExchangeRuntimeStore) CreateJob(ctx context.Context, job translationExchangeAsyncJob) (translationExchangeAsyncJob, error) {
	if s == nil || s.db == nil {
		return translationExchangeAsyncJob{}, serviceNotConfiguredDomainError("translation exchange runtime store", map[string]any{
			"component": "translation_exchange_runtime_store_bun",
		})
	}
	record, err := bunTranslationExchangeJobRecordFromJob(job)
	if err != nil {
		return translationExchangeAsyncJob{}, err
	}
	if _, err := s.db.NewInsert().Model(&record).Exec(ctx); err != nil {
		return translationExchangeAsyncJob{}, err
	}
	return s.jobFromRecord(ctx, record)
}

func (s *BunTranslationExchangeRuntimeStore) FindJobByRequestHash(ctx context.Context, kind string, identity translationTransportIdentity, requestHash string) (translationExchangeAsyncJob, bool, error) {
	record := bunTranslationExchangeJobRecord{}
	err := s.db.NewSelect().
		Model(&record).
		Where("kind = ?", strings.TrimSpace(kind)).
		Where("request_hash = ?", strings.TrimSpace(requestHash)).
		Where("created_by = ?", strings.TrimSpace(identity.ActorID)).
		Where("COALESCE(tenant_id, '') = ?", strings.TrimSpace(identity.TenantID)).
		Where("COALESCE(org_id, '') = ?", strings.TrimSpace(identity.OrgID)).
		Where("deleted_at IS NULL").
		Limit(1).
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return translationExchangeAsyncJob{}, false, nil
		}
		return translationExchangeAsyncJob{}, false, err
	}
	job, err := s.jobFromRecord(ctx, record)
	if err != nil {
		return translationExchangeAsyncJob{}, false, err
	}
	return job, true, nil
}

func (s *BunTranslationExchangeRuntimeStore) GetJob(ctx context.Context, identity translationTransportIdentity, id string) (translationExchangeAsyncJob, bool, error) {
	record := bunTranslationExchangeJobRecord{}
	err := s.db.NewSelect().
		Model(&record).
		Where("job_id = ?", strings.TrimSpace(id)).
		Where("created_by = ?", strings.TrimSpace(identity.ActorID)).
		Where("COALESCE(tenant_id, '') = ?", strings.TrimSpace(identity.TenantID)).
		Where("COALESCE(org_id, '') = ?", strings.TrimSpace(identity.OrgID)).
		Where("deleted_at IS NULL").
		Limit(1).
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return translationExchangeAsyncJob{}, false, nil
		}
		return translationExchangeAsyncJob{}, false, err
	}
	job, err := s.jobFromRecord(ctx, record)
	if err != nil {
		return translationExchangeAsyncJob{}, false, err
	}
	return job, true, nil
}

func (s *BunTranslationExchangeRuntimeStore) ListJobs(ctx context.Context, query translationExchangeJobQuery) ([]translationExchangeAsyncJob, int, error) {
	if s == nil || s.db == nil {
		return nil, 0, nil
	}
	if query.Page <= 0 {
		query.Page = 1
	}
	if query.PerPage <= 0 {
		query.PerPage = 20
	}
	base := s.db.NewSelect().
		Model((*bunTranslationExchangeJobRecord)(nil)).
		Where("created_by = ?", strings.TrimSpace(query.Identity.ActorID)).
		Where("COALESCE(tenant_id, '') = ?", strings.TrimSpace(query.Identity.TenantID)).
		Where("COALESCE(org_id, '') = ?", strings.TrimSpace(query.Identity.OrgID)).
		Where("deleted_at IS NULL")
	if query.Kind != "" {
		base.Where("kind = ?", strings.TrimSpace(query.Kind))
	}
	if query.Status != "" {
		base.Where("status = ?", normalizeTranslationExchangeJobStatus(query.Status))
	}
	total, err := base.Clone().Count(ctx)
	if err != nil {
		return nil, 0, err
	}
	records := []bunTranslationExchangeJobRecord{}
	if err := base.
		OrderExpr("created_at DESC, updated_at DESC, job_id ASC").
		Limit(query.PerPage).
		Offset((query.Page-1)*query.PerPage).
		Scan(ctx, &records); err != nil {
		return nil, 0, err
	}
	jobs, _, err := s.jobsFromRecords(ctx, records)
	if err != nil {
		return nil, 0, err
	}
	return jobs, total, nil
}

func (s *BunTranslationExchangeRuntimeStore) DeleteJob(ctx context.Context, identity translationTransportIdentity, id string) (translationExchangeAsyncJob, bool, error) {
	job, ok, err := s.GetJob(ctx, identity, id)
	if err != nil || !ok {
		return translationExchangeAsyncJob{}, ok, err
	}
	err = s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		if _, err := tx.NewDelete().Model((*bunTranslationExchangeJobArtifactRecord)(nil)).Where("job_id = ?", job.ID).Exec(ctx); err != nil {
			return err
		}
		if _, err := tx.NewDelete().Model((*bunTranslationExchangeJobRowRecord)(nil)).Where("job_id = ?", job.ID).Exec(ctx); err != nil {
			return err
		}
		if _, err := tx.NewDelete().Model((*bunTranslationExchangeJobRecord)(nil)).Where("job_id = ?", job.ID).Exec(ctx); err != nil {
			return err
		}
		return nil
	})
	return job, err == nil, err
}

func (s *BunTranslationExchangeRuntimeStore) SaveJobRows(ctx context.Context, job translationExchangeAsyncJob, rows []TranslationExchangeRow) error {
	if s == nil || s.db == nil || strings.TrimSpace(job.ID) == "" {
		return nil
	}
	now := time.Now().UTC()
	records := make([]bunTranslationExchangeJobRowRecord, 0, len(rows))
	for index, row := range rows {
		row = normalizeTranslationExchangeRowIndex(row, index)
		raw, err := json.Marshal(row)
		if err != nil {
			return err
		}
		records = append(records, bunTranslationExchangeJobRowRecord{
			JobID:             job.ID,
			RowIndex:          row.Index,
			TenantID:          job.TenantID,
			OrgID:             job.OrgID,
			Kind:              job.Kind,
			Status:            "",
			InputJSON:         string(raw),
			CreateTranslation: row.CreateTranslation,
			CreatedAt:         now,
			UpdatedAt:         now,
		})
	}
	if len(records) == 0 {
		return nil
	}
	_, err := s.db.NewInsert().
		Model(&records).
		On("CONFLICT(job_id, row_index) DO UPDATE").
		Set("tenant_id = EXCLUDED.tenant_id").
		Set("org_id = EXCLUDED.org_id").
		Set("kind = EXCLUDED.kind").
		Set("input_json = EXCLUDED.input_json").
		Set("create_translation = EXCLUDED.create_translation").
		Set("updated_at = EXCLUDED.updated_at").
		Exec(ctx)
	return err
}

func (s *BunTranslationExchangeRuntimeStore) ListJobRows(ctx context.Context, jobID string) ([]translationExchangeStoredRow, error) {
	records := []bunTranslationExchangeJobRowRecord{}
	if err := s.db.NewSelect().
		Model(&records).
		Where("job_id = ?", strings.TrimSpace(jobID)).
		OrderExpr("row_index ASC").
		Scan(ctx); err != nil {
		return nil, err
	}
	out := make([]translationExchangeStoredRow, 0, len(records))
	for _, record := range records {
		row, err := translationExchangeStoredRowFromRecord(record)
		if err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, nil
}

func (s *BunTranslationExchangeRuntimeStore) UpsertJobRow(ctx context.Context, jobID string, row translationExchangeStoredRow) error {
	record, err := bunTranslationExchangeJobRowRecordFromStoredRow(strings.TrimSpace(jobID), row)
	if err != nil {
		return err
	}
	_, err = s.db.NewInsert().
		Model(&record).
		On("CONFLICT(job_id, row_index) DO UPDATE").
		Set("status = EXCLUDED.status").
		Set("input_json = EXCLUDED.input_json").
		Set("result_json = EXCLUDED.result_json").
		Set("linkage_key = EXCLUDED.linkage_key").
		Set("payload_hash = EXCLUDED.payload_hash").
		Set("seen_registered = EXCLUDED.seen_registered").
		Set("create_translation = EXCLUDED.create_translation").
		Set("applied_at = EXCLUDED.applied_at").
		Set("updated_at = EXCLUDED.updated_at").
		Exec(ctx)
	return err
}

func (s *BunTranslationExchangeRuntimeStore) ReplaceJobArtifacts(ctx context.Context, job translationExchangeAsyncJob, artifacts []translationExchangeJobArtifact) error {
	if s == nil || s.db == nil || strings.TrimSpace(job.ID) == "" {
		return nil
	}
	return s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		if _, err := tx.NewDelete().Model((*bunTranslationExchangeJobArtifactRecord)(nil)).Where("job_id = ?", job.ID).Exec(ctx); err != nil {
			return err
		}
		now := time.Now().UTC()
		records := make([]bunTranslationExchangeJobArtifactRecord, 0, len(artifacts))
		for _, artifact := range artifacts {
			records = append(records, bunTranslationExchangeJobArtifactRecord{
				JobID:        job.ID,
				Kind:         strings.TrimSpace(artifact.Kind),
				Label:        strings.TrimSpace(artifact.Label),
				Filename:     strings.TrimSpace(artifact.Filename),
				ContentType:  strings.TrimSpace(artifact.ContentType),
				ContentBytes: append([]byte{}, artifact.Content...),
				CreatedAt:    now,
				UpdatedAt:    now,
			})
		}
		if len(records) == 0 {
			return nil
		}
		_, err := tx.NewInsert().Model(&records).Exec(ctx)
		return err
	})
}

func (s *BunTranslationExchangeRuntimeStore) ClaimJob(ctx context.Context, jobID, workerID string, now, leaseUntil time.Time) (translationExchangeAsyncJob, bool, error) {
	if s == nil || s.db == nil {
		return translationExchangeAsyncJob{}, false, nil
	}
	var job translationExchangeAsyncJob
	ok := false
	err := s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		record := bunTranslationExchangeJobRecord{}
		if err := tx.NewSelect().Model(&record).Where("job_id = ?", strings.TrimSpace(jobID)).Limit(1).Scan(ctx); err != nil {
			return err
		}
		if normalizeTranslationExchangeJobStatus(record.Status) != translationExchangeAsyncJobStatusRunning {
			return nil
		}
		if record.LeaseExpiresAt != nil && record.LeaseExpiresAt.After(now) && !strings.EqualFold(strings.TrimSpace(record.WorkerID), strings.TrimSpace(workerID)) {
			return nil
		}
		record.WorkerID = strings.TrimSpace(workerID)
		record.StartedAt = coalesceTimePtr(record.StartedAt, now)
		record.HeartbeatAt = translationExchangeTimePtr(now)
		record.LeaseExpiresAt = translationExchangeTimePtr(leaseUntil)
		record.UpdatedAt = now
		if _, err := tx.NewUpdate().Model(&record).
			Column("worker_id", "started_at", "heartbeat_at", "lease_expires_at", "updated_at").
			WherePK().
			Exec(ctx); err != nil {
			return err
		}
		var convErr error
		job, convErr = s.jobFromRecordTx(ctx, tx, record)
		if convErr != nil {
			return convErr
		}
		ok = true
		return nil
	})
	return job, ok, err
}

func (s *BunTranslationExchangeRuntimeStore) HeartbeatJob(ctx context.Context, jobID, workerID string, progress map[string]any, now, leaseUntil time.Time) error {
	progressJSON, err := marshalTranslationExchangeJSON(primitives.CloneAnyMap(progress))
	if err != nil {
		return err
	}
	_, err = s.db.NewUpdate().
		Model((*bunTranslationExchangeJobRecord)(nil)).
		Set("progress_json = ?", progressJSON).
		Set("heartbeat_at = ?", now).
		Set("lease_expires_at = ?", leaseUntil).
		Set("updated_at = ?", now).
		Where("job_id = ?", strings.TrimSpace(jobID)).
		Where("worker_id = ?", strings.TrimSpace(workerID)).
		Exec(ctx)
	return err
}

func (s *BunTranslationExchangeRuntimeStore) CompleteJob(ctx context.Context, jobID, workerID string, progress, result, retention map[string]any, now time.Time) (translationExchangeAsyncJob, error) {
	resultJSON, err := marshalTranslationExchangeJSON(primitives.CloneAnyMap(result))
	if err != nil {
		return translationExchangeAsyncJob{}, err
	}
	progressJSON, err := marshalTranslationExchangeJSON(primitives.CloneAnyMap(progress))
	if err != nil {
		return translationExchangeAsyncJob{}, err
	}
	retentionJSON, err := marshalTranslationExchangeJSON(primitives.CloneAnyMap(retention))
	if err != nil {
		return translationExchangeAsyncJob{}, err
	}
	summaryJSON, err := marshalTranslationExchangeJSON(extractMap(result["summary"]))
	if err != nil {
		return translationExchangeAsyncJob{}, err
	}
	err = s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		_, execErr := tx.NewUpdate().
			Model((*bunTranslationExchangeJobRecord)(nil)).
			Set("status = ?", translationExchangeAsyncJobStatusCompleted).
			Set("progress_json = ?", progressJSON).
			Set("summary_json = ?", summaryJSON).
			Set("result_json = ?", resultJSON).
			Set("retention_json = ?", retentionJSON).
			Set("error = ''").
			Set("worker_id = ''").
			Set("heartbeat_at = ?", now).
			Set("lease_expires_at = NULL").
			Set("completed_at = ?", now).
			Set("updated_at = ?", now).
			Where("job_id = ?", strings.TrimSpace(jobID)).
			Where("(worker_id = ? OR worker_id = '')", strings.TrimSpace(workerID)).
			Exec(ctx)
		return execErr
	})
	if err != nil {
		return translationExchangeAsyncJob{}, err
	}
	return s.loadJobByID(ctx, jobID)
}

func (s *BunTranslationExchangeRuntimeStore) FailJob(ctx context.Context, jobID, workerID string, progress map[string]any, failure error, now time.Time) (translationExchangeAsyncJob, error) {
	progressJSON, err := marshalTranslationExchangeJSON(primitives.CloneAnyMap(progress))
	if err != nil {
		return translationExchangeAsyncJob{}, err
	}
	err = s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		_, execErr := tx.NewUpdate().
			Model((*bunTranslationExchangeJobRecord)(nil)).
			Set("status = ?", translationExchangeAsyncJobStatusFailed).
			Set("progress_json = ?", progressJSON).
			Set("error = ?", strings.TrimSpace(errorText(failure))).
			Set("worker_id = ''").
			Set("heartbeat_at = ?", now).
			Set("lease_expires_at = NULL").
			Set("updated_at = ?", now).
			Where("job_id = ?", strings.TrimSpace(jobID)).
			Where("(worker_id = ? OR worker_id = '')", strings.TrimSpace(workerID)).
			Exec(ctx)
		return execErr
	})
	if err != nil {
		return translationExchangeAsyncJob{}, err
	}
	return s.loadJobByID(ctx, jobID)
}

func (s *BunTranslationExchangeRuntimeStore) ListRecoverableJobs(ctx context.Context, now time.Time, limit int) ([]translationExchangeAsyncJob, error) {
	if s == nil || s.db == nil {
		return nil, nil
	}
	records := []bunTranslationExchangeJobRecord{}
	query := s.db.NewSelect().
		Model(&records).
		Where("status = ?", translationExchangeAsyncJobStatusRunning).
		Where("deleted_at IS NULL").
		Where("(lease_expires_at IS NULL OR lease_expires_at <= ?)", now).
		OrderExpr("updated_at ASC, created_at ASC")
	if limit > 0 {
		query = query.Limit(limit)
	}
	if err := query.Scan(ctx); err != nil {
		return nil, err
	}
	jobs, _, err := s.jobsFromRecords(ctx, records)
	return jobs, err
}

func (s *BunTranslationExchangeRuntimeStore) LookupApplyRecord(ctx context.Context, identity translationTransportIdentity, linkageKey, payloadHash string) (translationExchangeAppliedRecord, bool, error) {
	record := bunTranslationExchangeApplyLedgerRecord{}
	err := s.db.NewSelect().
		Model(&record).
		Where("COALESCE(tenant_id, '') = ?", strings.TrimSpace(identity.TenantID)).
		Where("COALESCE(org_id, '') = ?", strings.TrimSpace(identity.OrgID)).
		Where("linkage_key = ?", strings.TrimSpace(linkageKey)).
		Where("payload_hash = ?", strings.TrimSpace(payloadHash)).
		Limit(1).
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return translationExchangeAppliedRecord{}, false, nil
		}
		return translationExchangeAppliedRecord{}, false, err
	}
	return translationExchangeAppliedRecord{
		LinkageKey:  record.LinkageKey,
		PayloadHash: record.PayloadHash,
		Request: TranslationExchangeApplyRequest{
			CreateTranslation: record.CreateTranslation,
			WorkflowStatus:    record.WorkflowStatus,
		},
		AppliedAt: record.AppliedAt,
	}, true, nil
}

func (s *BunTranslationExchangeRuntimeStore) RecordApplyRecord(ctx context.Context, identity translationTransportIdentity, record translationExchangeAppliedRecord) (translationExchangeAppliedRecord, bool, error) {
	existing, ok, err := s.LookupApplyRecord(ctx, identity, record.LinkageKey, record.PayloadHash)
	if err != nil || ok {
		return existing, ok, err
	}
	requestJSON, err := marshalTranslationExchangeJSON(map[string]any{
		"linkage_key":        record.LinkageKey,
		"payload_hash":       record.PayloadHash,
		"create_translation": record.Request.CreateTranslation,
		"workflow_status":    record.Request.WorkflowStatus,
	})
	if err != nil {
		return translationExchangeAppliedRecord{}, false, err
	}
	entry := bunTranslationExchangeApplyLedgerRecord{
		LedgerID:          defaultTranslationExchangeRuntimeJobID(),
		TenantID:          strings.TrimSpace(identity.TenantID),
		OrgID:             strings.TrimSpace(identity.OrgID),
		LinkageKey:        strings.TrimSpace(record.LinkageKey),
		PayloadHash:       strings.TrimSpace(record.PayloadHash),
		CreateTranslation: record.Request.CreateTranslation,
		WorkflowStatus:    strings.TrimSpace(record.Request.WorkflowStatus),
		AppliedAt:         coalesceTime(record.AppliedAt, time.Now().UTC()),
		RequestJSON:       requestJSON,
	}
	if _, err := s.db.NewInsert().Model(&entry).Exec(ctx); err != nil {
		return translationExchangeAppliedRecord{}, false, err
	}
	record.AppliedAt = entry.AppliedAt
	return record, false, nil
}

func (s *BunTranslationExchangeRuntimeStore) jobsFromRecords(ctx context.Context, records []bunTranslationExchangeJobRecord) ([]translationExchangeAsyncJob, int, error) {
	if len(records) == 0 {
		return nil, 0, nil
	}
	artifactsByJob, err := s.loadArtifacts(ctx, jobIDsFromRecords(records))
	if err != nil {
		return nil, 0, err
	}
	out := make([]translationExchangeAsyncJob, 0, len(records))
	for _, record := range records {
		job, err := translationExchangeAsyncJobFromRecord(record)
		if err != nil {
			return nil, 0, err
		}
		job.Artifacts = cloneTranslationExchangeJobArtifacts(artifactsByJob[job.ID])
		out = append(out, job)
	}
	return out, len(out), nil
}

func (s *BunTranslationExchangeRuntimeStore) jobFromRecord(ctx context.Context, record bunTranslationExchangeJobRecord) (translationExchangeAsyncJob, error) {
	return s.jobFromRecordTx(ctx, s.db, record)
}

func (s *BunTranslationExchangeRuntimeStore) loadJobByID(ctx context.Context, id string) (translationExchangeAsyncJob, error) {
	record := bunTranslationExchangeJobRecord{}
	if err := s.db.NewSelect().
		Model(&record).
		Where("job_id = ?", strings.TrimSpace(id)).
		Where("deleted_at IS NULL").
		Limit(1).
		Scan(ctx); err != nil {
		return translationExchangeAsyncJob{}, err
	}
	return s.jobFromRecord(ctx, record)
}

func (s *BunTranslationExchangeRuntimeStore) jobFromRecordTx(ctx context.Context, db bun.IDB, record bunTranslationExchangeJobRecord) (translationExchangeAsyncJob, error) {
	job, err := translationExchangeAsyncJobFromRecord(record)
	if err != nil {
		return translationExchangeAsyncJob{}, err
	}
	artifacts, err := loadTranslationExchangeArtifactsByJob(ctx, db, []string{job.ID})
	if err != nil {
		return translationExchangeAsyncJob{}, err
	}
	job.Artifacts = cloneTranslationExchangeJobArtifacts(artifacts[job.ID])
	return job, nil
}

func (s *BunTranslationExchangeRuntimeStore) loadArtifacts(ctx context.Context, ids []string) (map[string][]translationExchangeJobArtifact, error) {
	return loadTranslationExchangeArtifactsByJob(ctx, s.db, ids)
}

func loadTranslationExchangeArtifactsByJob(ctx context.Context, db bun.IDB, ids []string) (map[string][]translationExchangeJobArtifact, error) {
	if len(ids) == 0 {
		return map[string][]translationExchangeJobArtifact{}, nil
	}
	records := []bunTranslationExchangeJobArtifactRecord{}
	if err := db.NewSelect().
		Model(&records).
		Where("job_id IN (?)", bun.List(ids)).
		OrderExpr("job_id ASC, kind ASC").
		Scan(ctx); err != nil {
		return nil, err
	}
	out := map[string][]translationExchangeJobArtifact{}
	for _, record := range records {
		out[record.JobID] = append(out[record.JobID], translationExchangeJobArtifact{
			Kind:        strings.TrimSpace(record.Kind),
			Label:       strings.TrimSpace(record.Label),
			Filename:    strings.TrimSpace(record.Filename),
			ContentType: strings.TrimSpace(record.ContentType),
			Content:     append([]byte{}, record.ContentBytes...),
		})
	}
	return out, nil
}

func jobIDsFromRecords(records []bunTranslationExchangeJobRecord) []string {
	out := make([]string, 0, len(records))
	for _, record := range records {
		if id := strings.TrimSpace(record.JobID); id != "" {
			out = append(out, id)
		}
	}
	return out
}

func bunTranslationExchangeJobRecordFromJob(job translationExchangeAsyncJob) (bunTranslationExchangeJobRecord, error) {
	requestJSON, err := marshalTranslationExchangeJSON(job.Request)
	if err != nil {
		return bunTranslationExchangeJobRecord{}, err
	}
	progressJSON, err := marshalTranslationExchangeJSON(job.Progress)
	if err != nil {
		return bunTranslationExchangeJobRecord{}, err
	}
	summaryJSON, err := marshalTranslationExchangeJSON(primitivesCloneMap(extractMap(job.Result["summary"]), job.Summary))
	if err != nil {
		return bunTranslationExchangeJobRecord{}, err
	}
	resultJSON, err := marshalTranslationExchangeJSON(job.Result)
	if err != nil {
		return bunTranslationExchangeJobRecord{}, err
	}
	retentionJSON, err := marshalTranslationExchangeJSON(job.Retention)
	if err != nil {
		return bunTranslationExchangeJobRecord{}, err
	}
	return bunTranslationExchangeJobRecord{
		JobID:          strings.TrimSpace(job.ID),
		TenantID:       strings.TrimSpace(job.TenantID),
		OrgID:          strings.TrimSpace(job.OrgID),
		Kind:           strings.TrimSpace(job.Kind),
		Status:         normalizeTranslationExchangeJobStatus(job.Status),
		CreatedBy:      strings.TrimSpace(job.CreatedBy),
		Permission:     strings.TrimSpace(job.Permission),
		RequestHash:    strings.TrimSpace(job.RequestHash),
		RequestJSON:    requestJSON,
		ProgressJSON:   progressJSON,
		SummaryJSON:    summaryJSON,
		ResultJSON:     resultJSON,
		RetentionJSON:  retentionJSON,
		Error:          strings.TrimSpace(job.Error),
		RequestID:      strings.TrimSpace(job.RequestID),
		TraceID:        strings.TrimSpace(job.TraceID),
		PollEndpoint:   strings.TrimSpace(job.PollEndpoint),
		WorkerID:       strings.TrimSpace(job.WorkerID),
		StartedAt:      translationExchangeTimePtr(job.StartedAt),
		CompletedAt:    translationExchangeTimePtr(job.CompletedAt),
		HeartbeatAt:    translationExchangeTimePtr(job.HeartbeatAt),
		LeaseExpiresAt: translationExchangeTimePtr(job.LeaseUntil),
		DeletedAt:      translationExchangeTimePtr(job.DeletedAt),
		CreatedAt:      coalesceTime(job.CreatedAt, time.Now().UTC()),
		UpdatedAt:      coalesceTime(job.UpdatedAt, time.Now().UTC()),
	}, nil
}

func translationExchangeAsyncJobFromRecord(record bunTranslationExchangeJobRecord) (translationExchangeAsyncJob, error) {
	job := translationExchangeAsyncJob{
		ID:           strings.TrimSpace(record.JobID),
		Kind:         strings.TrimSpace(record.Kind),
		Status:       normalizeTranslationExchangeJobStatus(record.Status),
		Permission:   strings.TrimSpace(record.Permission),
		CreatedBy:    strings.TrimSpace(record.CreatedBy),
		TenantID:     strings.TrimSpace(record.TenantID),
		OrgID:        strings.TrimSpace(record.OrgID),
		RequestHash:  strings.TrimSpace(record.RequestHash),
		Error:        strings.TrimSpace(record.Error),
		RequestID:    strings.TrimSpace(record.RequestID),
		TraceID:      strings.TrimSpace(record.TraceID),
		PollEndpoint: strings.TrimSpace(record.PollEndpoint),
		WorkerID:     strings.TrimSpace(record.WorkerID),
		CreatedAt:    record.CreatedAt.UTC(),
		UpdatedAt:    record.UpdatedAt.UTC(),
	}
	if record.StartedAt != nil {
		job.StartedAt = record.StartedAt.UTC()
	}
	if record.CompletedAt != nil {
		job.CompletedAt = record.CompletedAt.UTC()
	}
	if record.HeartbeatAt != nil {
		job.HeartbeatAt = record.HeartbeatAt.UTC()
	}
	if record.LeaseExpiresAt != nil {
		job.LeaseUntil = record.LeaseExpiresAt.UTC()
	}
	if record.DeletedAt != nil {
		job.DeletedAt = record.DeletedAt.UTC()
	}
	if err := unmarshalTranslationExchangeJSON(record.RequestJSON, &job.Request); err != nil {
		return translationExchangeAsyncJob{}, err
	}
	if err := unmarshalTranslationExchangeJSON(record.ProgressJSON, &job.Progress); err != nil {
		return translationExchangeAsyncJob{}, err
	}
	if err := unmarshalTranslationExchangeJSON(record.SummaryJSON, &job.Summary); err != nil {
		return translationExchangeAsyncJob{}, err
	}
	if err := unmarshalTranslationExchangeJSON(record.ResultJSON, &job.Result); err != nil {
		return translationExchangeAsyncJob{}, err
	}
	if err := unmarshalTranslationExchangeJSON(record.RetentionJSON, &job.Retention); err != nil {
		return translationExchangeAsyncJob{}, err
	}
	return job, nil
}

func bunTranslationExchangeJobRowRecordFromStoredRow(jobID string, row translationExchangeStoredRow) (bunTranslationExchangeJobRowRecord, error) {
	inputJSON, err := marshalTranslationExchangeJSON(row.Input)
	if err != nil {
		return bunTranslationExchangeJobRowRecord{}, err
	}
	resultJSON, err := marshalTranslationExchangeJSON(row.Result)
	if err != nil {
		return bunTranslationExchangeJobRowRecord{}, err
	}
	return bunTranslationExchangeJobRowRecord{
		JobID:             strings.TrimSpace(jobID),
		RowIndex:          row.RowIndex,
		Status:            strings.TrimSpace(resultStatus(row.Result)),
		InputJSON:         inputJSON,
		ResultJSON:        resultJSON,
		LinkageKey:        strings.TrimSpace(row.LinkageKey),
		PayloadHash:       strings.TrimSpace(row.PayloadHash),
		SeenRegistered:    row.SeenRegistered,
		CreateTranslation: row.CreateTranslation,
		AppliedAt:         translationExchangeTimePtr(row.AppliedAt),
		CreatedAt:         coalesceTime(time.Time{}, time.Now().UTC()),
		UpdatedAt:         coalesceTime(row.UpdatedAt, time.Now().UTC()),
	}, nil
}

func translationExchangeStoredRowFromRecord(record bunTranslationExchangeJobRowRecord) (translationExchangeStoredRow, error) {
	row := translationExchangeStoredRow{
		RowIndex:          record.RowIndex,
		LinkageKey:        strings.TrimSpace(record.LinkageKey),
		PayloadHash:       strings.TrimSpace(record.PayloadHash),
		SeenRegistered:    record.SeenRegistered,
		CreateTranslation: record.CreateTranslation,
		UpdatedAt:         record.UpdatedAt.UTC(),
	}
	if record.AppliedAt != nil {
		row.AppliedAt = record.AppliedAt.UTC()
	}
	if err := unmarshalTranslationExchangeJSON(record.InputJSON, &row.Input); err != nil {
		return translationExchangeStoredRow{}, err
	}
	if strings.TrimSpace(record.ResultJSON) != "" && strings.TrimSpace(record.ResultJSON) != "null" {
		result := TranslationExchangeRowResult{}
		if err := unmarshalTranslationExchangeJSON(record.ResultJSON, &result); err != nil {
			return translationExchangeStoredRow{}, err
		}
		row.Result = &result
	}
	return row, nil
}

func marshalTranslationExchangeJSON(value any) (string, error) {
	if value == nil {
		return "{}", nil
	}
	raw, err := json.Marshal(value)
	if err != nil {
		return "", err
	}
	if len(raw) == 0 {
		return "{}", nil
	}
	return string(raw), nil
}

func unmarshalTranslationExchangeJSON(raw string, target any) error {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		trimmed = "{}"
	}
	return json.Unmarshal([]byte(trimmed), target)
}

func translationExchangeTimePtr(value time.Time) *time.Time {
	if value.IsZero() {
		return nil
	}
	v := value.UTC()
	return &v
}

func translationExchangePtrTime(value time.Time) *time.Time {
	v := value.UTC()
	return &v
}

func coalesceTimePtr(value *time.Time, fallback time.Time) *time.Time {
	if value == nil || value.IsZero() {
		return translationExchangePtrTime(fallback)
	}
	v := value.UTC()
	return &v
}

func resultStatus(result *TranslationExchangeRowResult) string {
	if result == nil {
		return ""
	}
	return strings.TrimSpace(result.Status)
}

func primitivesCloneMap(preferred map[string]any, fallback map[string]any) map[string]any {
	if len(preferred) > 0 {
		return preferred
	}
	return fallback
}

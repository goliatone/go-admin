package admin

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/goliatone/go-admin/internal/primitives"
)

// TranslationExchangeRuntimeStore persists async exchange jobs, artifacts, row state, and apply dedupe records.
type TranslationExchangeRuntimeStore interface {
	CreateJob(context.Context, translationExchangeAsyncJob) (translationExchangeAsyncJob, error)
	FindJobByRequestHash(context.Context, string, translationTransportIdentity, string) (translationExchangeAsyncJob, bool, error)
	GetJob(context.Context, translationTransportIdentity, string) (translationExchangeAsyncJob, bool, error)
	ListJobs(context.Context, translationExchangeJobQuery) ([]translationExchangeAsyncJob, int, error)
	DeleteJob(context.Context, translationTransportIdentity, string) (translationExchangeAsyncJob, bool, error)
	SaveJobRows(context.Context, translationExchangeAsyncJob, []TranslationExchangeRow) error
	ListJobRows(context.Context, string) ([]translationExchangeStoredRow, error)
	UpsertJobRow(context.Context, string, translationExchangeStoredRow) error
	ReplaceJobArtifacts(context.Context, translationExchangeAsyncJob, []translationExchangeJobArtifact) error
	ClaimJob(context.Context, string, string, time.Time, time.Time) (translationExchangeAsyncJob, bool, error)
	HeartbeatJob(context.Context, string, string, map[string]any, time.Time, time.Time) error
	CompleteJob(context.Context, string, string, map[string]any, map[string]any, map[string]any, time.Time) (translationExchangeAsyncJob, error)
	FailJob(context.Context, string, string, map[string]any, error, time.Time) (translationExchangeAsyncJob, error)
	ListRecoverableJobs(context.Context, time.Time, int) ([]translationExchangeAsyncJob, error)
	LookupApplyRecord(context.Context, translationTransportIdentity, string, string) (translationExchangeAppliedRecord, bool, error)
	RecordApplyRecord(context.Context, translationTransportIdentity, translationExchangeAppliedRecord) (translationExchangeAppliedRecord, bool, error)
}

type translationExchangeJobArtifact struct {
	Kind        string `json:"kind"`
	Label       string `json:"label"`
	Filename    string `json:"filename"`
	ContentType string `json:"content_type"`
	Content     []byte `json:"content"`
}

type translationExchangeStoredRow struct {
	RowIndex          int                           `json:"row_index"`
	Input             TranslationExchangeRow        `json:"input"`
	Result            *TranslationExchangeRowResult `json:"result"`
	LinkageKey        string                        `json:"linkage_key"`
	PayloadHash       string                        `json:"payload_hash"`
	SeenRegistered    bool                          `json:"seen_registered"`
	CreateTranslation bool                          `json:"create_translation"`
	AppliedAt         time.Time                     `json:"applied_at"`
	UpdatedAt         time.Time                     `json:"updated_at"`
}

type translationExchangeJobQuery struct {
	Identity translationTransportIdentity `json:"identity"`
	Page     int                          `json:"page"`
	PerPage  int                          `json:"per_page"`
	Kind     string                       `json:"kind"`
	Status   string                       `json:"status"`
}

// MemoryTranslationExchangeRuntimeStore provides a non-persistent runtime store used by tests and fallback wiring.
type MemoryTranslationExchangeRuntimeStore struct {
	mu           sync.Mutex
	next         int64
	nowFn        func() time.Time
	idFn         func() string
	jobs         map[string]translationExchangeAsyncJob
	requestIndex map[string]string
	rows         map[string]map[int]translationExchangeStoredRow
	artifacts    map[string][]translationExchangeJobArtifact
	ledger       map[string]translationExchangeAppliedRecord
}

func NewMemoryTranslationExchangeRuntimeStore(nowFn func() time.Time) *MemoryTranslationExchangeRuntimeStore {
	if nowFn == nil {
		nowFn = func() time.Time { return time.Now().UTC() }
	}
	return &MemoryTranslationExchangeRuntimeStore{
		nowFn:        nowFn,
		idFn:         defaultTranslationExchangeRuntimeJobID,
		jobs:         map[string]translationExchangeAsyncJob{},
		requestIndex: map[string]string{},
		rows:         map[string]map[int]translationExchangeStoredRow{},
		artifacts:    map[string][]translationExchangeJobArtifact{},
		ledger:       map[string]translationExchangeAppliedRecord{},
	}
}

func defaultTranslationExchangeRuntimeJobID() string {
	raw := make([]byte, 16)
	if _, err := rand.Read(raw); err == nil {
		return "txex_job_" + hex.EncodeToString(raw)
	}
	return ""
}

func (s *MemoryTranslationExchangeRuntimeStore) CreateJob(_ context.Context, job translationExchangeAsyncJob) (translationExchangeAsyncJob, error) {
	if s == nil {
		return translationExchangeAsyncJob{}, nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.nowFn().UTC()
	if strings.TrimSpace(job.ID) == "" {
		job.ID = s.nextJobIDLocked()
	}
	job.CreatedAt = coalesceTime(job.CreatedAt, now)
	job.UpdatedAt = coalesceTime(job.UpdatedAt, now)
	job.Progress = primitives.CloneAnyMap(job.Progress)
	job.Request = primitives.CloneAnyMap(job.Request)
	job.Result = primitives.CloneAnyMap(job.Result)
	job.Retention = primitives.CloneAnyMap(job.Retention)
	job.Summary = primitives.CloneAnyMap(job.Summary)
	job.Artifacts = cloneTranslationExchangeJobArtifacts(job.Artifacts)
	s.jobs[job.ID] = cloneTranslationExchangeAsyncJob(job)
	if requestKey := translationExchangeAsyncJobRequestKey(job.Kind, job.CreatedBy, job.TenantID, job.OrgID, job.RequestHash); requestKey != "" {
		s.requestIndex[requestKey] = job.ID
	}
	return cloneTranslationExchangeAsyncJob(job), nil
}

func (s *MemoryTranslationExchangeRuntimeStore) FindJobByRequestHash(_ context.Context, kind string, identity translationTransportIdentity, requestHash string) (translationExchangeAsyncJob, bool, error) {
	if s == nil {
		return translationExchangeAsyncJob{}, false, nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	requestKey := translationExchangeAsyncJobRequestKey(kind, identity.ActorID, identity.TenantID, identity.OrgID, requestHash)
	id, ok := s.requestIndex[requestKey]
	if !ok {
		return translationExchangeAsyncJob{}, false, nil
	}
	job, ok := s.jobs[id]
	if !ok || !translationExchangeJobVisibleToIdentity(job, identity) {
		return translationExchangeAsyncJob{}, false, nil
	}
	return cloneTranslationExchangeAsyncJob(job), true, nil
}

func (s *MemoryTranslationExchangeRuntimeStore) GetJob(_ context.Context, identity translationTransportIdentity, id string) (translationExchangeAsyncJob, bool, error) {
	if s == nil {
		return translationExchangeAsyncJob{}, false, nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	job, ok := s.jobs[strings.TrimSpace(id)]
	if !ok || !translationExchangeJobVisibleToIdentity(job, identity) {
		return translationExchangeAsyncJob{}, false, nil
	}
	return cloneTranslationExchangeAsyncJob(job), true, nil
}

func (s *MemoryTranslationExchangeRuntimeStore) ListJobs(_ context.Context, query translationExchangeJobQuery) ([]translationExchangeAsyncJob, int, error) {
	if s == nil {
		return nil, 0, nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if query.Page <= 0 {
		query.Page = 1
	}
	if query.PerPage <= 0 {
		query.PerPage = 20
	}
	items := make([]translationExchangeAsyncJob, 0, len(s.jobs))
	for _, job := range s.jobs {
		if !translationExchangeJobVisibleToIdentity(job, query.Identity) {
			continue
		}
		if query.Kind != "" && !strings.EqualFold(strings.TrimSpace(job.Kind), strings.TrimSpace(query.Kind)) {
			continue
		}
		if query.Status != "" && !strings.EqualFold(normalizeTranslationExchangeJobStatus(job.Status), strings.TrimSpace(query.Status)) {
			continue
		}
		items = append(items, cloneTranslationExchangeAsyncJob(job))
	}
	sort.SliceStable(items, func(i, j int) bool {
		if !items[i].CreatedAt.Equal(items[j].CreatedAt) {
			return items[i].CreatedAt.After(items[j].CreatedAt)
		}
		if !items[i].UpdatedAt.Equal(items[j].UpdatedAt) {
			return items[i].UpdatedAt.After(items[j].UpdatedAt)
		}
		return strings.Compare(items[i].ID, items[j].ID) < 0
	})
	total := len(items)
	start := min((query.Page-1)*query.PerPage, total)
	end := min(start+query.PerPage, total)
	return append([]translationExchangeAsyncJob{}, items[start:end]...), total, nil
}

func (s *MemoryTranslationExchangeRuntimeStore) DeleteJob(_ context.Context, identity translationTransportIdentity, id string) (translationExchangeAsyncJob, bool, error) {
	if s == nil {
		return translationExchangeAsyncJob{}, false, nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	id = strings.TrimSpace(id)
	job, ok := s.jobs[id]
	if !ok || !translationExchangeJobVisibleToIdentity(job, identity) {
		return translationExchangeAsyncJob{}, false, nil
	}
	delete(s.jobs, id)
	delete(s.rows, id)
	delete(s.artifacts, id)
	if requestKey := translationExchangeAsyncJobRequestKey(job.Kind, job.CreatedBy, job.TenantID, job.OrgID, job.RequestHash); requestKey != "" {
		delete(s.requestIndex, requestKey)
	}
	return cloneTranslationExchangeAsyncJob(job), true, nil
}

func (s *MemoryTranslationExchangeRuntimeStore) SaveJobRows(_ context.Context, job translationExchangeAsyncJob, rows []TranslationExchangeRow) error {
	if s == nil {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	jobID := strings.TrimSpace(job.ID)
	if jobID == "" {
		return nil
	}
	stored := map[int]translationExchangeStoredRow{}
	now := s.nowFn().UTC()
	for index, row := range rows {
		row = normalizeTranslationExchangeRowIndex(row, index)
		stored[row.Index] = translationExchangeStoredRow{
			RowIndex:          row.Index,
			Input:             row,
			CreateTranslation: row.CreateTranslation,
			UpdatedAt:         now,
		}
	}
	s.rows[jobID] = stored
	return nil
}

func (s *MemoryTranslationExchangeRuntimeStore) ListJobRows(_ context.Context, jobID string) ([]translationExchangeStoredRow, error) {
	if s == nil {
		return nil, nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	rows := s.rows[strings.TrimSpace(jobID)]
	if len(rows) == 0 {
		return nil, nil
	}
	out := make([]translationExchangeStoredRow, 0, len(rows))
	for _, row := range rows {
		out = append(out, cloneTranslationExchangeStoredRow(row))
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].RowIndex < out[j].RowIndex })
	return out, nil
}

func (s *MemoryTranslationExchangeRuntimeStore) UpsertJobRow(_ context.Context, jobID string, row translationExchangeStoredRow) error {
	if s == nil {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	jobID = strings.TrimSpace(jobID)
	if jobID == "" {
		return nil
	}
	if _, ok := s.rows[jobID]; !ok {
		s.rows[jobID] = map[int]translationExchangeStoredRow{}
	}
	row.UpdatedAt = coalesceTime(row.UpdatedAt, s.nowFn().UTC())
	s.rows[jobID][row.RowIndex] = cloneTranslationExchangeStoredRow(row)
	return nil
}

func (s *MemoryTranslationExchangeRuntimeStore) ReplaceJobArtifacts(_ context.Context, job translationExchangeAsyncJob, artifacts []translationExchangeJobArtifact) error {
	if s == nil {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	jobID := strings.TrimSpace(job.ID)
	if jobID == "" {
		return nil
	}
	s.artifacts[jobID] = cloneTranslationExchangeJobArtifacts(artifacts)
	stored, ok := s.jobs[jobID]
	if ok {
		stored.Artifacts = cloneTranslationExchangeJobArtifacts(artifacts)
		stored.UpdatedAt = s.nowFn().UTC()
		s.jobs[jobID] = stored
	}
	return nil
}

func (s *MemoryTranslationExchangeRuntimeStore) ClaimJob(_ context.Context, jobID, workerID string, now, leaseUntil time.Time) (translationExchangeAsyncJob, bool, error) {
	if s == nil {
		return translationExchangeAsyncJob{}, false, nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	job, ok := s.jobs[strings.TrimSpace(jobID)]
	if !ok || normalizeTranslationExchangeJobStatus(job.Status) != translationExchangeAsyncJobStatusRunning {
		return translationExchangeAsyncJob{}, false, nil
	}
	if strings.TrimSpace(job.WorkerID) != "" && !job.LeaseUntil.IsZero() && job.LeaseUntil.After(now) && !strings.EqualFold(job.WorkerID, strings.TrimSpace(workerID)) {
		return translationExchangeAsyncJob{}, false, nil
	}
	job.WorkerID = strings.TrimSpace(workerID)
	job.StartedAt = coalesceTime(job.StartedAt, now)
	job.HeartbeatAt = now
	job.LeaseUntil = leaseUntil
	job.UpdatedAt = now
	s.jobs[job.ID] = job
	return cloneTranslationExchangeAsyncJob(job), true, nil
}

func (s *MemoryTranslationExchangeRuntimeStore) HeartbeatJob(_ context.Context, jobID, workerID string, progress map[string]any, now, leaseUntil time.Time) error {
	if s == nil {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	job, ok := s.jobs[strings.TrimSpace(jobID)]
	if !ok || !strings.EqualFold(strings.TrimSpace(job.WorkerID), strings.TrimSpace(workerID)) {
		return nil
	}
	job.Progress = primitives.CloneAnyMap(progress)
	job.HeartbeatAt = now
	job.LeaseUntil = leaseUntil
	job.UpdatedAt = now
	s.jobs[job.ID] = job
	return nil
}

func (s *MemoryTranslationExchangeRuntimeStore) CompleteJob(_ context.Context, jobID, workerID string, progress, result, retention map[string]any, now time.Time) (translationExchangeAsyncJob, error) {
	if s == nil {
		return translationExchangeAsyncJob{}, nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	job, ok := s.jobs[strings.TrimSpace(jobID)]
	if !ok {
		return translationExchangeAsyncJob{}, nil
	}
	if strings.TrimSpace(job.WorkerID) != "" && !strings.EqualFold(strings.TrimSpace(job.WorkerID), strings.TrimSpace(workerID)) {
		return translationExchangeAsyncJob{}, nil
	}
	job.Status = translationExchangeAsyncJobStatusCompleted
	job.Progress = primitives.CloneAnyMap(progress)
	job.Result = primitives.CloneAnyMap(result)
	job.Retention = primitives.CloneAnyMap(retention)
	job.Summary = extractMap(job.Result["summary"])
	job.Error = ""
	job.WorkerID = ""
	job.LeaseUntil = time.Time{}
	job.HeartbeatAt = now
	job.CompletedAt = now
	job.UpdatedAt = now
	if artifacts, ok := s.artifacts[job.ID]; ok {
		job.Artifacts = cloneTranslationExchangeJobArtifacts(artifacts)
	}
	s.jobs[job.ID] = job
	return cloneTranslationExchangeAsyncJob(job), nil
}

func (s *MemoryTranslationExchangeRuntimeStore) FailJob(_ context.Context, jobID, workerID string, progress map[string]any, failure error, now time.Time) (translationExchangeAsyncJob, error) {
	if s == nil {
		return translationExchangeAsyncJob{}, nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	job, ok := s.jobs[strings.TrimSpace(jobID)]
	if !ok {
		return translationExchangeAsyncJob{}, nil
	}
	if strings.TrimSpace(job.WorkerID) != "" && !strings.EqualFold(strings.TrimSpace(job.WorkerID), strings.TrimSpace(workerID)) {
		return translationExchangeAsyncJob{}, nil
	}
	job.Status = translationExchangeAsyncJobStatusFailed
	job.Progress = primitives.CloneAnyMap(progress)
	job.Error = strings.TrimSpace(errorText(failure))
	job.WorkerID = ""
	job.LeaseUntil = time.Time{}
	job.HeartbeatAt = now
	job.UpdatedAt = now
	s.jobs[job.ID] = job
	return cloneTranslationExchangeAsyncJob(job), nil
}

func (s *MemoryTranslationExchangeRuntimeStore) ListRecoverableJobs(_ context.Context, now time.Time, limit int) ([]translationExchangeAsyncJob, error) {
	if s == nil {
		return nil, nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]translationExchangeAsyncJob, 0, len(s.jobs))
	for _, job := range s.jobs {
		if normalizeTranslationExchangeJobStatus(job.Status) != translationExchangeAsyncJobStatusRunning {
			continue
		}
		if !job.LeaseUntil.IsZero() && job.LeaseUntil.After(now) {
			continue
		}
		out = append(out, cloneTranslationExchangeAsyncJob(job))
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].UpdatedAt.Before(out[j].UpdatedAt) })
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

func (s *MemoryTranslationExchangeRuntimeStore) LookupApplyRecord(_ context.Context, identity translationTransportIdentity, linkageKey, payloadHash string) (translationExchangeAppliedRecord, bool, error) {
	if s == nil {
		return translationExchangeAppliedRecord{}, false, nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	record, ok := s.ledger[translationExchangeAppliedLedgerKey(identity, linkageKey, payloadHash)]
	return cloneTranslationExchangeAppliedRecord(record), ok, nil
}

func (s *MemoryTranslationExchangeRuntimeStore) RecordApplyRecord(_ context.Context, identity translationTransportIdentity, record translationExchangeAppliedRecord) (translationExchangeAppliedRecord, bool, error) {
	if s == nil {
		return translationExchangeAppliedRecord{}, false, nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	key := translationExchangeAppliedLedgerKey(identity, record.LinkageKey, record.PayloadHash)
	if existing, ok := s.ledger[key]; ok {
		return cloneTranslationExchangeAppliedRecord(existing), true, nil
	}
	record.AppliedAt = coalesceTime(record.AppliedAt, s.nowFn().UTC())
	s.ledger[key] = cloneTranslationExchangeAppliedRecord(record)
	return cloneTranslationExchangeAppliedRecord(record), false, nil
}

func (s *MemoryTranslationExchangeRuntimeStore) nextJobIDLocked() string {
	for range 4 {
		if s.idFn == nil {
			break
		}
		id := strings.TrimSpace(s.idFn())
		if id == "" {
			continue
		}
		if _, exists := s.jobs[id]; exists {
			continue
		}
		return id
	}
	for {
		id := "txex_job_" + strconvFormatInt(s.next)
		s.next++
		if _, exists := s.jobs[id]; exists {
			continue
		}
		return id
	}
}

func cloneTranslationExchangeStoredRow(row translationExchangeStoredRow) translationExchangeStoredRow {
	clone := row
	clone.Input = cloneTranslationExchangeRow(row.Input)
	if row.Result != nil {
		result := *row.Result
		result.Metadata = primitives.CloneAnyMap(row.Result.Metadata)
		if row.Result.Conflict != nil {
			conflict := *row.Result.Conflict
			result.Conflict = &conflict
		}
		clone.Result = &result
	}
	return clone
}

func cloneTranslationExchangeRow(row TranslationExchangeRow) TranslationExchangeRow {
	clone := row
	clone.Metadata = primitives.CloneAnyMap(row.Metadata)
	return clone
}

func cloneTranslationExchangeJobArtifacts(in []translationExchangeJobArtifact) []translationExchangeJobArtifact {
	if len(in) == 0 {
		return nil
	}
	out := make([]translationExchangeJobArtifact, 0, len(in))
	for _, artifact := range in {
		copyArtifact := artifact
		copyArtifact.Content = append([]byte{}, artifact.Content...)
		out = append(out, copyArtifact)
	}
	return out
}

func cloneTranslationExchangeAppliedRecord(record translationExchangeAppliedRecord) translationExchangeAppliedRecord {
	clone := record
	return clone
}

func translationExchangeAppliedLedgerKey(identity translationTransportIdentity, linkageKey, payloadHash string) string {
	return strings.Join([]string{
		strings.ToLower(strings.TrimSpace(identity.TenantID)),
		strings.ToLower(strings.TrimSpace(identity.OrgID)),
		strings.TrimSpace(linkageKey),
		strings.TrimSpace(payloadHash),
	}, "::")
}

func coalesceTime(value time.Time, fallback time.Time) time.Time {
	if value.IsZero() {
		return fallback.UTC()
	}
	return value.UTC()
}

func normalizeTranslationExchangeRowIndex(row TranslationExchangeRow, fallback int) TranslationExchangeRow {
	if row.Index <= 0 {
		row.Index = fallback
	}
	return row
}

func errorText(err error) string {
	if err == nil {
		return ""
	}
	return strings.TrimSpace(err.Error())
}

func strconvFormatInt(value int64) string {
	if value == 0 {
		return "0"
	}
	sign := ""
	if value < 0 {
		sign = "-"
		value = -value
	}
	buf := [20]byte{}
	index := len(buf)
	for value > 0 {
		index--
		buf[index] = byte('0' + (value % 10))
		value /= 10
	}
	return sign + string(buf[index:])
}

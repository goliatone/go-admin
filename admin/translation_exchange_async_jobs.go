package admin

import (
	"crypto/rand"
	"encoding/hex"
	"github.com/goliatone/go-admin/internal/primitives"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	translationExchangeAsyncJobStatusRunning   = "running"
	translationExchangeAsyncJobStatusCompleted = "completed"
	translationExchangeAsyncJobStatusFailed    = "failed"
)

type translationExchangeAsyncJob struct {
	ID           string                           `json:"id"`
	Kind         string                           `json:"kind"`
	Status       string                           `json:"status"`
	Permission   string                           `json:"permission"`
	CreatedBy    string                           `json:"created_by"`
	TenantID     string                           `json:"tenant_id"`
	OrgID        string                           `json:"org_id"`
	Fixture      bool                             `json:"fixture"`
	RequestHash  string                           `json:"request_hash"`
	Request      map[string]any                   `json:"request"`
	PollEndpoint string                           `json:"poll_endpoint"`
	Progress     map[string]any                   `json:"progress"`
	Summary      map[string]any                   `json:"summary"`
	Result       map[string]any                   `json:"result"`
	Retention    map[string]any                   `json:"retention"`
	Artifacts    []translationExchangeJobArtifact `json:"artifacts"`
	Error        string                           `json:"error"`
	RequestID    string                           `json:"request_id"`
	TraceID      string                           `json:"trace_id"`
	WorkerID     string                           `json:"worker_id"`
	StartedAt    time.Time                        `json:"started_at"`
	CompletedAt  time.Time                        `json:"completed_at"`
	HeartbeatAt  time.Time                        `json:"heartbeat_at"`
	LeaseUntil   time.Time                        `json:"lease_until"`
	DeletedAt    time.Time                        `json:"deleted_at"`
	CreatedAt    time.Time                        `json:"created_at"`
	UpdatedAt    time.Time                        `json:"updated_at"`
}

type translationExchangeAsyncJobStore struct {
	mu           sync.Mutex
	next         int64
	jobs         map[string]translationExchangeAsyncJob
	requestIndex map[string]string
	nowFn        func() time.Time
	idFn         func() string
}

type translationExchangeAsyncJobCreateOptions struct {
	RequestHash string         `json:"request_hash"`
	Retention   map[string]any `json:"retention"`
}

func newTranslationExchangeAsyncJobStore(nowFn func() time.Time) *translationExchangeAsyncJobStore {
	if nowFn == nil {
		nowFn = func() time.Time { return time.Now().UTC() }
	}
	return &translationExchangeAsyncJobStore{
		next:         1,
		jobs:         map[string]translationExchangeAsyncJob{},
		requestIndex: map[string]string{},
		nowFn:        nowFn,
		idFn:         defaultTranslationExchangeAsyncJobID,
	}
}

func (s *translationExchangeAsyncJobStore) Create(kind, permission, actor, tenantID, orgID string, request map[string]any) translationExchangeAsyncJob {
	return s.CreateWithOptions(kind, permission, actor, tenantID, orgID, request, translationExchangeAsyncJobCreateOptions{})
}

func (s *translationExchangeAsyncJobStore) CreateWithOptions(kind, permission, actor, tenantID, orgID string, request map[string]any, opts translationExchangeAsyncJobCreateOptions) translationExchangeAsyncJob {
	if s == nil {
		return translationExchangeAsyncJob{}
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.nowFn().UTC()
	id := s.nextJobIDLocked()
	job := translationExchangeAsyncJob{
		ID:          id,
		Kind:        strings.TrimSpace(kind),
		Status:      translationExchangeAsyncJobStatusRunning,
		Permission:  strings.TrimSpace(permission),
		CreatedBy:   strings.TrimSpace(actor),
		TenantID:    strings.TrimSpace(tenantID),
		OrgID:       strings.TrimSpace(orgID),
		RequestHash: strings.TrimSpace(opts.RequestHash),
		Request:     primitives.CloneAnyMap(request),
		Progress: map[string]any{
			"processed": 0,
			"succeeded": 0,
			"failed":    0,
		},
		Retention: primitives.CloneAnyMap(opts.Retention),
		CreatedAt: now,
		UpdatedAt: now,
	}
	s.jobs[id] = job
	if requestKey := translationExchangeAsyncJobRequestKey(job.Kind, job.CreatedBy, job.TenantID, job.OrgID, job.RequestHash); requestKey != "" {
		s.requestIndex[requestKey] = id
	}
	return cloneTranslationExchangeAsyncJob(job)
}

func (s *translationExchangeAsyncJobStore) FindByRequestHash(kind, actor, tenantID, orgID, requestHash string) (translationExchangeAsyncJob, bool) {
	if s == nil {
		return translationExchangeAsyncJob{}, false
	}
	requestKey := translationExchangeAsyncJobRequestKey(kind, actor, tenantID, orgID, requestHash)
	if requestKey == "" {
		return translationExchangeAsyncJob{}, false
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	id, ok := s.requestIndex[requestKey]
	if !ok {
		return translationExchangeAsyncJob{}, false
	}
	job, ok := s.jobs[id]
	if !ok {
		delete(s.requestIndex, requestKey)
		return translationExchangeAsyncJob{}, false
	}
	return cloneTranslationExchangeAsyncJob(job), true
}

func (s *translationExchangeAsyncJobStore) SetTrace(id, requestID, traceID string) {
	if s == nil {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	job, ok := s.jobs[strings.TrimSpace(id)]
	if !ok {
		return
	}
	job.RequestID = strings.TrimSpace(requestID)
	job.TraceID = strings.TrimSpace(traceID)
	job.UpdatedAt = s.nowFn().UTC()
	s.jobs[id] = job
}

func (s *translationExchangeAsyncJobStore) nextJobIDLocked() string {
	if s == nil {
		return ""
	}
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
		id := "txex_job_" + strconv.FormatInt(s.next, 10)
		s.next++
		if _, exists := s.jobs[id]; exists {
			continue
		}
		return id
	}
}

func defaultTranslationExchangeAsyncJobID() string {
	raw := make([]byte, 16)
	if _, err := rand.Read(raw); err == nil {
		return "txex_job_" + hex.EncodeToString(raw)
	}
	return ""
}

func (s *translationExchangeAsyncJobStore) SetPollEndpoint(id, pollEndpoint string) {
	if s == nil {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	job, ok := s.jobs[strings.TrimSpace(id)]
	if !ok {
		return
	}
	job.PollEndpoint = strings.TrimSpace(pollEndpoint)
	job.UpdatedAt = s.nowFn().UTC()
	s.jobs[id] = job
}

func (s *translationExchangeAsyncJobStore) MarkRunning(id string, progress map[string]any) {
	if s == nil {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	job, ok := s.jobs[strings.TrimSpace(id)]
	if !ok {
		return
	}
	job.Status = translationExchangeAsyncJobStatusRunning
	if len(progress) > 0 {
		job.Progress = primitives.CloneAnyMap(progress)
	}
	job.UpdatedAt = s.nowFn().UTC()
	s.jobs[id] = job
}

func (s *translationExchangeAsyncJobStore) UpdateProgress(id string, progress map[string]any) {
	if s == nil {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	job, ok := s.jobs[strings.TrimSpace(id)]
	if !ok {
		return
	}
	if len(progress) > 0 {
		job.Progress = primitives.CloneAnyMap(progress)
	}
	job.UpdatedAt = s.nowFn().UTC()
	s.jobs[id] = job
}

func (s *translationExchangeAsyncJobStore) Complete(id string, progress map[string]any, result map[string]any) {
	if s == nil {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	job, ok := s.jobs[strings.TrimSpace(id)]
	if !ok {
		return
	}
	job.Status = translationExchangeAsyncJobStatusCompleted
	job.Error = ""
	job.Progress = primitives.CloneAnyMap(progress)
	job.Result = primitives.CloneAnyMap(result)
	job.UpdatedAt = s.nowFn().UTC()
	s.jobs[id] = job
}

func (s *translationExchangeAsyncJobStore) Fail(id string, progress map[string]any, err error) {
	if s == nil {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	job, ok := s.jobs[strings.TrimSpace(id)]
	if !ok {
		return
	}
	job.Status = translationExchangeAsyncJobStatusFailed
	if len(progress) > 0 {
		job.Progress = primitives.CloneAnyMap(progress)
	}
	if err != nil {
		job.Error = strings.TrimSpace(err.Error())
	}
	job.Result = nil
	job.UpdatedAt = s.nowFn().UTC()
	s.jobs[id] = job
}

func (s *translationExchangeAsyncJobStore) Get(id string) (translationExchangeAsyncJob, bool) {
	if s == nil {
		return translationExchangeAsyncJob{}, false
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	job, ok := s.jobs[strings.TrimSpace(id)]
	if !ok {
		return translationExchangeAsyncJob{}, false
	}
	return cloneTranslationExchangeAsyncJob(job), true
}

func (s *translationExchangeAsyncJobStore) SetRetention(id string, retention map[string]any) {
	if s == nil {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	job, ok := s.jobs[strings.TrimSpace(id)]
	if !ok {
		return
	}
	job.Retention = primitives.CloneAnyMap(retention)
	job.UpdatedAt = s.nowFn().UTC()
	s.jobs[id] = job
}

func (s *translationExchangeAsyncJobStore) Delete(id string) (translationExchangeAsyncJob, bool) {
	if s == nil {
		return translationExchangeAsyncJob{}, false
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	job, ok := s.jobs[strings.TrimSpace(id)]
	if !ok {
		return translationExchangeAsyncJob{}, false
	}
	delete(s.jobs, strings.TrimSpace(id))
	if requestKey := translationExchangeAsyncJobRequestKey(job.Kind, job.CreatedBy, job.TenantID, job.OrgID, job.RequestHash); requestKey != "" {
		delete(s.requestIndex, requestKey)
	}
	return cloneTranslationExchangeAsyncJob(job), true
}

func (s *translationExchangeAsyncJobStore) ListByActor(actorID string) []translationExchangeAsyncJob {
	if s == nil {
		return nil
	}
	actorID = strings.TrimSpace(actorID)
	s.mu.Lock()
	defer s.mu.Unlock()

	out := make([]translationExchangeAsyncJob, 0, len(s.jobs))
	for _, job := range s.jobs {
		if actorID != "" && !translationExchangeJobOwnedByActor(job, actorID) {
			continue
		}
		out = append(out, cloneTranslationExchangeAsyncJob(job))
	}
	return out
}

func cloneTranslationExchangeAsyncJob(job translationExchangeAsyncJob) translationExchangeAsyncJob {
	clone := job
	clone.Request = primitives.CloneAnyMap(job.Request)
	clone.Progress = primitives.CloneAnyMap(job.Progress)
	clone.Summary = primitives.CloneAnyMap(job.Summary)
	clone.Result = primitives.CloneAnyMap(job.Result)
	clone.Retention = primitives.CloneAnyMap(job.Retention)
	clone.Artifacts = cloneTranslationExchangeJobArtifacts(job.Artifacts)
	return clone
}

func translationExchangeAsyncJobPayload(job translationExchangeAsyncJob) map[string]any {
	payload := map[string]any{
		"id":            strings.TrimSpace(job.ID),
		"kind":          strings.TrimSpace(job.Kind),
		"status":        normalizeTranslationExchangeJobStatus(job.Status),
		"poll_endpoint": strings.TrimSpace(job.PollEndpoint),
		"progress":      primitives.CloneAnyMap(job.Progress),
		"created_at":    job.CreatedAt,
		"updated_at":    job.UpdatedAt,
	}
	if actorID := strings.TrimSpace(job.CreatedBy); actorID != "" {
		payload["actor"] = map[string]any{
			"id":    actorID,
			"label": actorID,
		}
	}
	if job.Fixture {
		payload["fixture"] = true
	}
	if len(job.Request) > 0 {
		payload["request"] = primitives.CloneAnyMap(job.Request)
	}
	if requestHash := strings.TrimSpace(job.RequestHash); requestHash != "" {
		payload["request_hash"] = requestHash
	}
	if requestID := strings.TrimSpace(job.RequestID); requestID != "" {
		payload["request_id"] = requestID
	}
	if traceID := strings.TrimSpace(job.TraceID); traceID != "" {
		payload["trace_id"] = traceID
	}
	if strings.TrimSpace(job.Error) != "" {
		payload["error"] = strings.TrimSpace(job.Error)
	}
	resultPayload := primitives.CloneAnyMap(job.Result)
	if len(resultPayload) == 0 && len(job.Summary) > 0 {
		resultPayload = map[string]any{
			"summary": primitives.CloneAnyMap(job.Summary),
		}
	}
	if downloads := translationExchangeArtifactDownloadsPayload(job.Artifacts); len(downloads) > 0 {
		if len(resultPayload) == 0 {
			resultPayload = map[string]any{}
		}
		if len(extractMap(resultPayload["downloads"])) == 0 {
			resultPayload["downloads"] = downloads
		}
	}
	if len(resultPayload) > 0 {
		payload["result"] = primitives.CloneAnyMap(resultPayload)
		if summary := extractMap(resultPayload["summary"]); len(summary) > 0 {
			payload["summary"] = primitives.CloneAnyMap(summary)
		}
		if downloads := translationExchangeDownloadsPayload(resultPayload); len(downloads) > 0 {
			payload["downloads"] = downloads
		}
	}
	if len(job.Retention) > 0 {
		payload["retention"] = primitives.CloneAnyMap(job.Retention)
	}
	if file := translationExchangeJobFilePayload(job.Kind, job.Request, resultPayload); len(file) > 0 {
		payload["file"] = file
	}
	return payload
}

func translationExchangeAsyncJobRequestKey(kind, actor, tenantID, orgID, requestHash string) string {
	kind = strings.TrimSpace(strings.ToLower(kind))
	actor = strings.TrimSpace(strings.ToLower(actor))
	tenantID = strings.TrimSpace(strings.ToLower(tenantID))
	orgID = strings.TrimSpace(strings.ToLower(orgID))
	requestHash = strings.TrimSpace(strings.ToLower(requestHash))
	if kind == "" || actor == "" || requestHash == "" {
		return ""
	}
	return strings.Join([]string{kind, actor, tenantID, orgID, requestHash}, "::")
}

func translationExchangeConflictSummary(results []TranslationExchangeRowResult) map[string]any {
	summary := map[string]any{
		"total":   0,
		"by_type": map[string]int{},
	}
	if len(results) == 0 {
		return summary
	}
	byType := map[string]int{}
	rows := make([]map[string]any, 0, len(results))
	total := 0
	for _, row := range results {
		if row.Conflict == nil {
			continue
		}
		conflictType := strings.TrimSpace(row.Conflict.Type)
		if conflictType == "" {
			conflictType = "unknown"
		}
		byType[conflictType]++
		total++
		rows = append(rows, map[string]any{
			"index":   row.Index,
			"type":    conflictType,
			"code":    translationExchangeConflictCode(row),
			"message": strings.TrimSpace(row.Conflict.Message),
		})
	}
	summary["total"] = total
	summary["by_type"] = byType
	if len(rows) > 0 {
		summary["rows"] = rows
	}
	return summary
}

func translationExchangeConflictCode(row TranslationExchangeRowResult) string {
	if len(row.Metadata) > 0 {
		if code := strings.TrimSpace(toString(row.Metadata["error_code"])); code != "" {
			return code
		}
	}
	switch strings.TrimSpace(row.Conflict.Type) {
	case translationExchangeConflictTypeDuplicateRow:
		return "DUPLICATE_ROW"
	case translationExchangeConflictTypeStaleSource:
		return "STALE_SOURCE_HASH"
	default:
		return "MISSING_LINKAGE"
	}
}

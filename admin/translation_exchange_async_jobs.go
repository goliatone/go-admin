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
	ID           string
	Kind         string
	Status       string
	Permission   string
	CreatedBy    string
	TenantID     string
	OrgID        string
	Fixture      bool
	Request      map[string]any
	PollEndpoint string
	Progress     map[string]any
	Result       map[string]any
	Error        string
	RequestID    string
	TraceID      string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type translationExchangeAsyncJobStore struct {
	mu    sync.Mutex
	next  int64
	jobs  map[string]translationExchangeAsyncJob
	nowFn func() time.Time
	idFn  func() string
}

func newTranslationExchangeAsyncJobStore(nowFn func() time.Time) *translationExchangeAsyncJobStore {
	if nowFn == nil {
		nowFn = func() time.Time { return time.Now().UTC() }
	}
	return &translationExchangeAsyncJobStore{
		next:  1,
		jobs:  map[string]translationExchangeAsyncJob{},
		nowFn: nowFn,
		idFn:  defaultTranslationExchangeAsyncJobID,
	}
}

func (s *translationExchangeAsyncJobStore) Create(kind, permission, actor, tenantID, orgID string, request map[string]any) translationExchangeAsyncJob {
	if s == nil {
		return translationExchangeAsyncJob{}
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.nowFn().UTC()
	id := s.nextJobIDLocked()
	job := translationExchangeAsyncJob{
		ID:         id,
		Kind:       strings.TrimSpace(kind),
		Status:     translationExchangeAsyncJobStatusRunning,
		Permission: strings.TrimSpace(permission),
		CreatedBy:  strings.TrimSpace(actor),
		TenantID:   strings.TrimSpace(tenantID),
		OrgID:      strings.TrimSpace(orgID),
		Request:    primitives.CloneAnyMap(request),
		Progress: map[string]any{
			"processed": 0,
			"succeeded": 0,
			"failed":    0,
		},
		CreatedAt: now,
		UpdatedAt: now,
	}
	s.jobs[id] = job
	return cloneTranslationExchangeAsyncJob(job)
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
	for attempt := 0; attempt < 4; attempt++ {
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
	clone.Result = primitives.CloneAnyMap(job.Result)
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
	if requestID := strings.TrimSpace(job.RequestID); requestID != "" {
		payload["request_id"] = requestID
	}
	if traceID := strings.TrimSpace(job.TraceID); traceID != "" {
		payload["trace_id"] = traceID
	}
	if strings.TrimSpace(job.Error) != "" {
		payload["error"] = strings.TrimSpace(job.Error)
	}
	if len(job.Result) > 0 {
		payload["result"] = primitives.CloneAnyMap(job.Result)
		if summary := extractMap(job.Result["summary"]); len(summary) > 0 {
			payload["summary"] = primitives.CloneAnyMap(summary)
		}
		if downloads := translationExchangeDownloadsPayload(job.Result); len(downloads) > 0 {
			payload["downloads"] = downloads
		}
	}
	if file := translationExchangeJobFilePayload(job.Kind, job.Request, job.Result); len(file) > 0 {
		payload["file"] = file
	}
	return payload
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

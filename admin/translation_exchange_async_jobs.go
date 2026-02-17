package admin

import (
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
	PollEndpoint string
	Progress     map[string]any
	Result       map[string]any
	Error        string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type translationExchangeAsyncJobStore struct {
	mu    sync.Mutex
	next  int64
	jobs  map[string]translationExchangeAsyncJob
	nowFn func() time.Time
}

func newTranslationExchangeAsyncJobStore(nowFn func() time.Time) *translationExchangeAsyncJobStore {
	if nowFn == nil {
		nowFn = func() time.Time { return time.Now().UTC() }
	}
	return &translationExchangeAsyncJobStore{
		next:  1,
		jobs:  map[string]translationExchangeAsyncJob{},
		nowFn: nowFn,
	}
}

func (s *translationExchangeAsyncJobStore) Create(kind, permission, actor string) translationExchangeAsyncJob {
	if s == nil {
		return translationExchangeAsyncJob{}
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.nowFn().UTC()
	id := "txex_job_" + strconv.FormatInt(s.next, 10)
	s.next++
	job := translationExchangeAsyncJob{
		ID:         id,
		Kind:       strings.TrimSpace(kind),
		Status:     translationExchangeAsyncJobStatusRunning,
		Permission: strings.TrimSpace(permission),
		CreatedBy:  strings.TrimSpace(actor),
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
		job.Progress = cloneAnyMap(progress)
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
	job.Progress = cloneAnyMap(progress)
	job.Result = cloneAnyMap(result)
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
		job.Progress = cloneAnyMap(progress)
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

func cloneTranslationExchangeAsyncJob(job translationExchangeAsyncJob) translationExchangeAsyncJob {
	clone := job
	clone.Progress = cloneAnyMap(job.Progress)
	clone.Result = cloneAnyMap(job.Result)
	return clone
}

func translationExchangeAsyncJobPayload(job translationExchangeAsyncJob) map[string]any {
	payload := map[string]any{
		"id":            strings.TrimSpace(job.ID),
		"kind":          strings.TrimSpace(job.Kind),
		"status":        normalizeTranslationExchangeJobStatus(job.Status),
		"poll_endpoint": strings.TrimSpace(job.PollEndpoint),
		"progress":      cloneAnyMap(job.Progress),
		"created_at":    job.CreatedAt,
		"updated_at":    job.UpdatedAt,
	}
	if strings.TrimSpace(job.Error) != "" {
		payload["error"] = strings.TrimSpace(job.Error)
	}
	if len(job.Result) > 0 {
		payload["result"] = cloneAnyMap(job.Result)
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

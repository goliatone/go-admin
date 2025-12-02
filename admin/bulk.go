package admin

import (
	"context"
	"errors"
	"strconv"
	"sync"
	"time"
)

// BulkRequest describes a requested bulk job.
type BulkRequest struct {
	Name   string
	Action string
	Total  int
}

// BulkJob captures bulk job state for UI/progress.
type BulkJob struct {
	ID                string    `json:"id"`
	Name              string    `json:"name"`
	Action            string    `json:"action,omitempty"`
	Status            string    `json:"status"`
	Total             int       `json:"total"`
	Processed         int       `json:"processed"`
	Progress          float64   `json:"progress,omitempty"`
	Errors            []string  `json:"errors,omitempty"`
	StartedAt         time.Time `json:"started_at,omitempty"`
	CompletedAt       time.Time `json:"completed_at,omitempty"`
	RollbackAvailable bool      `json:"rollback_available,omitempty"`
}

// BulkService manages bulk jobs.
type BulkService interface {
	Start(ctx context.Context, req BulkRequest) (BulkJob, error)
	List(ctx context.Context) []BulkJob
}

// BulkRollbacker optionally supports rollback operations.
type BulkRollbacker interface {
	Rollback(ctx context.Context, id string) (BulkJob, error)
}

// InMemoryBulkService stores jobs in memory and marks them completed immediately.
type InMemoryBulkService struct {
	mu            sync.Mutex
	nextID        int
	jobs          []BulkJob
	progressDelay time.Duration
}

// NewInMemoryBulkService constructs a bulk service with a sample job.
func NewInMemoryBulkService() *InMemoryBulkService {
	return &InMemoryBulkService{
		nextID:        2,
		progressDelay: 5 * time.Millisecond,
		jobs: []BulkJob{
			{
				ID:                "1",
				Name:              "sample.bulk",
				Action:            "cleanup",
				Status:            "completed",
				Total:             10,
				Processed:         10,
				Progress:          1,
				StartedAt:         time.Now().Add(-5 * time.Minute),
				CompletedAt:       time.Now().Add(-4 * time.Minute),
				RollbackAvailable: true,
			},
		},
	}
}

// Start records a bulk job and immediately completes it for demo purposes.
func (s *InMemoryBulkService) Start(ctx context.Context, req BulkRequest) (BulkJob, error) {
	_ = ctx
	if req.Name == "" {
		return BulkJob{}, errors.New("name required")
	}
	if req.Total <= 0 {
		req.Total = 10
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	id := strconv.Itoa(s.nextID)
	s.nextID++
	job := BulkJob{
		ID:        id,
		Name:      req.Name,
		Action:    req.Action,
		Status:    "running",
		Total:     req.Total,
		Processed: 0,
		Errors:    []string{},
		StartedAt: time.Now(),
	}
	s.jobs = append([]BulkJob{job}, s.jobs...)
	go s.runJob(job.ID)
	return job, nil
}

// List returns recorded jobs newest first.
func (s *InMemoryBulkService) List(ctx context.Context) []BulkJob {
	_ = ctx
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]BulkJob, len(s.jobs))
	for i, job := range s.jobs {
		jobCopy := job
		if jobCopy.Total > 0 {
			jobCopy.Progress = float64(jobCopy.Processed) / float64(jobCopy.Total)
		}
		out[i] = jobCopy
	}
	return out
}

// Rollback marks a job as rolled back.
func (s *InMemoryBulkService) Rollback(ctx context.Context, id string) (BulkJob, error) {
	_ = ctx
	s.mu.Lock()
	defer s.mu.Unlock()
	for i, job := range s.jobs {
		if job.ID != id {
			continue
		}
		job.Status = "rolled_back"
		job.CompletedAt = time.Now()
		job.Processed = 0
		job.Progress = 0
		s.jobs[i] = job
		return job, nil
	}
	return BulkJob{}, ErrNotFound
}

func (s *InMemoryBulkService) runJob(id string) {
	ticker := time.NewTicker(s.progressDelay)
	defer ticker.Stop()
	for range ticker.C {
		s.mu.Lock()
		index := -1
		for i, job := range s.jobs {
			if job.ID == id {
				index = i
				break
			}
		}
		if index == -1 {
			s.mu.Unlock()
			return
		}
		job := s.jobs[index]
		if job.Status == "rolled_back" {
			s.mu.Unlock()
			return
		}
		if job.Processed < job.Total {
			job.Processed++
		}
		if job.Processed >= job.Total {
			job.Status = "completed"
			job.CompletedAt = time.Now()
			job.RollbackAvailable = true
		}
		s.jobs[index] = job
		s.mu.Unlock()
		if job.Status == "completed" {
			return
		}
	}
}

// DisabledBulkService returns explicit errors when bulk is disabled.
type DisabledBulkService struct{}

func (DisabledBulkService) Start(ctx context.Context, req BulkRequest) (BulkJob, error) {
	_ = ctx
	_ = req
	return BulkJob{}, FeatureDisabledError{Feature: string(FeatureBulk)}
}

func (DisabledBulkService) List(ctx context.Context) []BulkJob {
	_ = ctx
	return nil
}

func (DisabledBulkService) Rollback(ctx context.Context, id string) (BulkJob, error) {
	_ = ctx
	_ = id
	return BulkJob{}, FeatureDisabledError{Feature: string(FeatureBulk)}
}

type bulkContextKey string

const (
	bulkNameKey   bulkContextKey = "bulk_name"
	bulkActionKey bulkContextKey = "bulk_action"
	bulkTotalKey  bulkContextKey = "bulk_total"
)

func withBulkContext(ctx context.Context, req BulkRequest) context.Context {
	ctx = context.WithValue(ctx, bulkNameKey, req.Name)
	ctx = context.WithValue(ctx, bulkActionKey, req.Action)
	ctx = context.WithValue(ctx, bulkTotalKey, req.Total)
	return ctx
}

func bulkRequestFromContext(ctx context.Context) BulkRequest {
	req := BulkRequest{}
	if ctx == nil {
		return req
	}
	if name, ok := ctx.Value(bulkNameKey).(string); ok {
		req.Name = name
	}
	if action, ok := ctx.Value(bulkActionKey).(string); ok {
		req.Action = action
	}
	if total, ok := ctx.Value(bulkTotalKey).(int); ok {
		req.Total = total
	}
	return req
}

// BulkCommand triggers a bulk job via the command bus.
type BulkCommand struct {
	Service BulkService
}

func (c *BulkCommand) Name() string { return "admin.bulk" }

func (c *BulkCommand) Execute(ctx context.Context) error {
	if c == nil || c.Service == nil {
		return FeatureDisabledError{Feature: string(FeatureBulk)}
	}
	req := bulkRequestFromContext(ctx)
	if req.Name == "" {
		return errors.New("name required")
	}
	_, err := c.Service.Start(ctx, req)
	return err
}

func (c *BulkCommand) CLIOptions() *CLIOptions {
	if c == nil {
		return nil
	}
	return &CLIOptions{
		Path:        []string{"admin", "bulk"},
		Description: "Trigger an admin bulk job (use context to pass name/action/total)",
		Group:       "admin",
	}
}

func supportsBulkRollback(svc BulkService) bool {
	_, ok := svc.(BulkRollbacker)
	return ok
}

package admin

import (
	"github.com/goliatone/go-admin/internal/primitives"
	"strings"
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

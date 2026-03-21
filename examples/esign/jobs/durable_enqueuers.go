package jobs

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

const (
	JobResourceKindGoogleImportRun = "google_import_run"
	JobResourceKindSourceRevision  = "source_revision"
)

type DurableSourceLineageProcessingEnqueuer struct {
	runtime *DurableJobRuntime
	now     func() time.Time
}

func NewDurableGoogleDriveImportEnqueue(runtime *DurableJobRuntime) func(context.Context, GoogleDriveImportMsg) error {
	if runtime == nil {
		return nil
	}
	return func(ctx context.Context, msg GoogleDriveImportMsg) error {
		payload, err := json.Marshal(msg)
		if err != nil {
			return fmt.Errorf("marshal google import job payload: %w", err)
		}
		scope := normalizeDispatchScope(msg.Scope)
		if scope.TenantID == "" || scope.OrgID == "" {
			return fmt.Errorf("google import durable enqueue scope is required")
		}
		now := time.Now().UTC()
		resourceID := strings.TrimSpace(msg.ImportRunID)
		if resourceID == "" {
			resourceID = strings.TrimSpace(msg.GoogleFileID)
		}
		_, _, err = runtime.Enqueue(ctx, scope, stores.JobRunEnqueueInput{
			JobName:         JobGoogleDriveImport,
			DedupeKey:       strings.TrimSpace(msg.DedupeKey),
			CorrelationID:   strings.TrimSpace(msg.CorrelationID),
			PayloadJSON:     string(payload),
			AvailableAt:     &now,
			ResourceKind:    JobResourceKindGoogleImportRun,
			ResourceID:      resourceID,
			ReplaceTerminal: true,
			RequestedAt:     now,
		})
		return err
	}
}

func NewDurableSourceLineageProcessingEnqueuer(runtime *DurableJobRuntime) services.SourceLineageProcessingTrigger {
	if runtime == nil {
		return DurableSourceLineageProcessingEnqueuer{}
	}
	return DurableSourceLineageProcessingEnqueuer{
		runtime: runtime,
		now:     func() time.Time { return time.Now().UTC() },
	}
}

func (e DurableSourceLineageProcessingEnqueuer) EnqueueLineageProcessing(ctx context.Context, scope stores.Scope, input services.SourceLineageProcessingInput) error {
	if e.runtime == nil {
		return fmt.Errorf("source lineage durable enqueue is not configured")
	}
	scope = normalizeDispatchScope(scope)
	if scope.TenantID == "" || scope.OrgID == "" {
		return fmt.Errorf("source lineage durable enqueue scope is required")
	}
	msg := SourceLineageProcessingMsg{
		Scope:            scope,
		ImportRunID:      strings.TrimSpace(input.ImportRunID),
		SourceDocumentID: strings.TrimSpace(input.SourceDocumentID),
		SourceRevisionID: strings.TrimSpace(input.SourceRevisionID),
		ArtifactID:       strings.TrimSpace(input.ArtifactID),
		ActorID:          strings.TrimSpace(input.ActorID),
		Metadata:         input.Metadata,
		CorrelationID:    strings.TrimSpace(input.CorrelationID),
		DedupeKey:        strings.TrimSpace(input.DedupeKey),
	}
	payload, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("marshal source lineage job payload: %w", err)
	}
	now := e.now
	if now == nil {
		now = func() time.Time { return time.Now().UTC() }
	}
	enqueuedAt := now().UTC()
	_, _, err = e.runtime.Enqueue(ctx, scope, stores.JobRunEnqueueInput{
		JobName:         JobSourceLineageProcessing,
		DedupeKey:       strings.TrimSpace(msg.DedupeKey),
		CorrelationID:   strings.TrimSpace(msg.CorrelationID),
		PayloadJSON:     string(payload),
		AvailableAt:     &enqueuedAt,
		ResourceKind:    JobResourceKindSourceRevision,
		ResourceID:      strings.TrimSpace(msg.SourceRevisionID),
		ReplaceTerminal: true,
		RequestedAt:     enqueuedAt,
	})
	return err
}

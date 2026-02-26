package admin

import (
	"context"
	"fmt"
	"github.com/goliatone/go-admin/internal/primitives"
	"strings"
	"time"

	"github.com/goliatone/go-command/flow"
)

// FSMLifecycleActivitySinkAdapter bridges go-command FSM lifecycle envelopes into admin activity entries.
type FSMLifecycleActivitySinkAdapter struct {
	sink ActivitySink
}

var _ flow.LifecycleActivitySink = (*FSMLifecycleActivitySinkAdapter)(nil)

// NewFSMLifecycleActivitySinkAdapter creates an adapter that forwards FSM lifecycle activity to an ActivitySink.
func NewFSMLifecycleActivitySinkAdapter(sink ActivitySink) *FSMLifecycleActivitySinkAdapter {
	return &FSMLifecycleActivitySinkAdapter{sink: sink}
}

// LogLifecycleActivity maps a lifecycle envelope into an admin activity entry.
func (a *FSMLifecycleActivitySinkAdapter) LogLifecycleActivity(ctx context.Context, envelope flow.LifecycleActivityEnvelope) error {
	if a == nil || a.sink == nil {
		return nil
	}
	return a.sink.Record(ctx, activityEntryFromFSMLifecycleEnvelope(envelope))
}

func activityEntryFromFSMLifecycleEnvelope(envelope flow.LifecycleActivityEnvelope) ActivityEntry {
	metadata := primitives.CloneAnyMap(envelope.Metadata)
	if metadata == nil {
		metadata = map[string]any{}
	}

	actor := strings.TrimSpace(envelope.ActorID)
	if actor == "" {
		actor = strings.TrimSpace(stringMetadata(metadata, "actor_id"))
	}

	tenant := strings.TrimSpace(envelope.TenantID)
	if tenant == "" {
		tenant = strings.TrimSpace(stringMetadata(metadata, "tenant"))
	}

	objectType := strings.TrimSpace(envelope.ObjectType)
	objectID := strings.TrimSpace(envelope.ObjectID)
	action := strings.TrimSpace(envelope.Verb)
	channel := strings.TrimSpace(envelope.Channel)
	phase := normalizeFSMLifecyclePhase(stringMetadata(metadata, "phase"), action)

	if phase != "" {
		metadata["phase"] = phase
	}
	if actor != "" && metadata["actor_id"] == nil {
		metadata["actor_id"] = actor
	}
	if tenant != "" && metadata["tenant"] == nil {
		metadata["tenant"] = tenant
	}
	if tenant != "" && metadata["tenant_id"] == nil {
		metadata["tenant_id"] = tenant
	}
	if objectType != "" && metadata["object_type"] == nil {
		metadata["object_type"] = objectType
	}
	if objectID != "" && metadata["object_id"] == nil {
		metadata["object_id"] = objectID
	}

	occurredAt := envelope.OccurredAt
	if occurredAt.IsZero() {
		occurredAt = time.Now().UTC()
	}

	return ActivityEntry{
		Actor:     actor,
		Action:    action,
		Object:    joinObject(objectType, objectID),
		Channel:   channel,
		Metadata:  metadata,
		CreatedAt: occurredAt,
	}
}

func normalizeFSMLifecyclePhase(raw, action string) string {
	phase := strings.ToLower(strings.TrimSpace(raw))
	switch phase {
	case string(flow.TransitionPhaseAttempted), string(flow.TransitionPhaseCommitted), string(flow.TransitionPhaseRejected):
		return phase
	}

	prefix := flow.LifecycleActivityVerbPrefix
	normalizedAction := strings.ToLower(strings.TrimSpace(action))
	if strings.HasPrefix(normalizedAction, prefix) {
		suffix := strings.TrimPrefix(normalizedAction, prefix)
		switch suffix {
		case string(flow.TransitionPhaseAttempted), string(flow.TransitionPhaseCommitted), string(flow.TransitionPhaseRejected):
			return suffix
		}
	}
	return ""
}

func stringMetadata(metadata map[string]any, key string) string {
	if metadata == nil {
		return ""
	}
	value, ok := metadata[key]
	if !ok || value == nil {
		return ""
	}
	return strings.TrimSpace(fmt.Sprint(value))
}

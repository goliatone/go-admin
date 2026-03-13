package httptransport

import (
	"encoding/json"
	"errors"
	"time"

	"github.com/goliatone/go-admin/pkg/go-sync/core"
)

// ReadResponse is the canonical read envelope exposed over HTTP.
type ReadResponse struct {
	Data      json.RawMessage `json:"data"`
	Revision  int64           `json:"revision"`
	UpdatedAt string          `json:"updated_at"`
	Metadata  map[string]any  `json:"metadata,omitempty"`
}

// MutationResponse is the canonical mutate success envelope exposed over HTTP.
type MutationResponse struct {
	Data      json.RawMessage `json:"data"`
	Revision  int64           `json:"revision"`
	UpdatedAt string          `json:"updated_at"`
	Applied   bool            `json:"applied"`
	Replay    bool            `json:"replay"`
	Metadata  map[string]any  `json:"metadata,omitempty"`
}

// ErrorEnvelope wraps transport-safe sync errors.
type ErrorEnvelope struct {
	Error ErrorPayload `json:"error"`
}

// ErrorPayload is the canonical transport error payload.
type ErrorPayload struct {
	Code    core.ErrorCode `json:"code"`
	Message string         `json:"message"`
	Details any            `json:"details,omitempty"`
}

// StaleRevisionDetails provides the latest revision and optional snapshot payload.
type StaleRevisionDetails struct {
	CurrentRevision int64         `json:"current_revision"`
	Resource        *ReadResponse `json:"resource,omitempty"`
}

// IdempotencyReplayDetails captures the replay metadata for repeated actions.
type IdempotencyReplayDetails struct {
	IdempotencyKey string        `json:"idempotency_key"`
	Resource       *ReadResponse `json:"resource,omitempty"`
}

// ReadResponseFromSnapshot converts a canonical snapshot into the HTTP read envelope.
func ReadResponseFromSnapshot(snapshot core.Snapshot) ReadResponse {
	return ReadResponse{
		Data:      cloneRawMessage(snapshot.Data),
		Revision:  snapshot.Revision,
		UpdatedAt: snapshot.UpdatedAt.UTC().Format(time.RFC3339),
		Metadata:  envelopeMetadata(snapshot),
	}
}

// MutationResponseFromResult converts a mutation result into the canonical HTTP success envelope.
func MutationResponseFromResult(result core.MutationResult) MutationResponse {
	response := MutationResponse{
		Data:      cloneRawMessage(result.Snapshot.Data),
		Revision:  result.Snapshot.Revision,
		UpdatedAt: result.Snapshot.UpdatedAt.UTC().Format(time.RFC3339),
		Applied:   result.Applied,
		Replay:    result.Replay,
		Metadata:  envelopeMetadata(result.Snapshot),
	}
	return response
}

// ErrorEnvelopeFromError converts canonical sync errors into transport envelopes.
func ErrorEnvelopeFromError(err error) ErrorEnvelope {
	if err == nil {
		return ErrorEnvelope{}
	}

	code, ok := core.ErrorCodeOf(err)
	if !ok {
		return ErrorEnvelope{
			Error: ErrorPayload{
				Code:    core.CodeTemporaryFailure,
				Message: err.Error(),
			},
		}
	}

	payload := ErrorPayload{
		Code:    code,
		Message: err.Error(),
	}
	switch code {
	case core.CodeStaleRevision:
		currentRevision, latest, _ := core.StaleRevisionDetails(err)
		details := StaleRevisionDetails{
			CurrentRevision: currentRevision,
		}
		if latest != nil {
			resource := ReadResponseFromSnapshot(*latest)
			details.Resource = &resource
		}
		payload.Message = "resource has a newer revision"
		payload.Details = details
	default:
		var syncErr *core.SyncError
		if errors.As(err, &syncErr) && syncErr != nil {
			payload.Message = syncErr.Message
			if syncErr.Details != nil {
				payload.Details = syncErr.Details
			}
		}
	}

	return ErrorEnvelope{Error: payload}
}

func cloneRawMessage(input []byte) json.RawMessage {
	if len(input) == 0 {
		return nil
	}
	out := make([]byte, len(input))
	copy(out, input)
	return out
}

func cloneMetadata(input map[string]any) map[string]any {
	if len(input) == 0 {
		return nil
	}
	out := make(map[string]any, len(input))
	for key, value := range input {
		out[key] = value
	}
	return out
}

func envelopeMetadata(snapshot core.Snapshot) map[string]any {
	metadata := cloneMetadata(snapshot.Metadata)
	if metadata == nil {
		metadata = make(map[string]any)
	}
	if _, ok := metadata["kind"]; !ok && snapshot.ResourceRef.Kind != "" {
		metadata["kind"] = snapshot.ResourceRef.Kind
	}
	if _, ok := metadata["scope"]; !ok && len(snapshot.ResourceRef.Scope) > 0 {
		scope := make(map[string]string, len(snapshot.ResourceRef.Scope))
		for key, value := range snapshot.ResourceRef.Scope {
			scope[key] = value
		}
		metadata["scope"] = scope
	}
	if len(metadata) == 0 {
		return nil
	}
	return metadata
}

package httptransport

import (
	"encoding/json"
	"errors"
	"io"
	"maps"
	"net/http"
	"strings"

	"github.com/goliatone/go-admin/pkg/go-sync/core"
)

const (
	// ResourceRoutePattern is the canonical v1 HTTP route for reads and PATCH mutations.
	ResourceRoutePattern = "/sync/resources/{kind}/{id}"
	// ResourceActionRoutePattern is the canonical v1 HTTP route for idempotent actions.
	ResourceActionRoutePattern = "/sync/resources/{kind}/{id}/actions/{operation}"
	defaultMaxBodyBytes        = 1 << 20
)

// RequestIdentity contains trusted request-derived sync metadata.
type RequestIdentity struct {
	Scope         map[string]string `json:"scope"`
	ActorID       string            `json:"actor_id"`
	ClientID      string            `json:"client_id"`
	CorrelationID string            `json:"correlation_id"`
}

// RequestIdentityResolver derives trusted scope and actor metadata from the request context.
type RequestIdentityResolver func(*http.Request) (RequestIdentity, error)

// HandlerOption customizes a transport Handler.
type HandlerOption func(*Handler)

// WithRequestIdentityResolver configures how trusted scope and actor metadata are derived.
func WithRequestIdentityResolver(resolver RequestIdentityResolver) HandlerOption {
	return func(handler *Handler) {
		if resolver != nil {
			handler.resolveIdentity = resolver
		}
	}
}

// WithMaxBodyBytes bounds JSON payload decoding for mutate and action requests.
func WithMaxBodyBytes(limit int64) HandlerOption {
	return func(handler *Handler) {
		if limit > 0 {
			handler.maxBodyBytes = limit
		}
	}
}

// Handler maps the canonical sync service onto HTTP handlers without owning route registration.
type Handler struct {
	service         core.SyncService
	resolveIdentity RequestIdentityResolver
	maxBodyBytes    int64
}

// MutationRequestBody is the canonical HTTP request envelope for PATCH and POST action mutations.
type MutationRequestBody struct {
	Operation        string          `json:"operation,omitempty"`
	Payload          json.RawMessage `json:"payload"`
	ExpectedRevision *int64          `json:"expected_revision"`
	IdempotencyKey   string          `json:"idempotency_key,omitempty"`
	Metadata         map[string]any  `json:"metadata,omitempty"`
}

type routeParams struct {
	Kind      string `json:"kind"`
	ID        string `json:"id"`
	Operation string `json:"operation"`
}

// NewHandler builds an HTTP mapping helper around a sync service.
func NewHandler(service core.SyncService, opts ...HandlerOption) (*Handler, error) {
	if service == nil {
		return nil, core.NewError(core.CodeTemporaryFailure, "sync service is required", nil)
	}

	handler := &Handler{
		service:         service,
		resolveIdentity: resolveAnonymousIdentity,
		maxBodyBytes:    defaultMaxBodyBytes,
	}
	for _, opt := range opts {
		if opt != nil {
			opt(handler)
		}
	}
	return handler, nil
}

// HandleRead maps `GET /sync/resources/{kind}/{id}` onto SyncService.Get.
func (handler *Handler) HandleRead(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, core.NewError(core.CodeInvalidMutation, "method not allowed", map[string]any{
			"method": r.Method,
		}))
		return
	}

	params, err := parseRouteParams(r, false)
	if err != nil {
		writeMappedError(w, err)
		return
	}

	identity, err := handler.resolveIdentity(r)
	if err != nil {
		writeMappedError(w, resolveIdentityError(err))
		return
	}

	snapshot, err := handler.service.Get(r.Context(), core.ResourceRef{
		Kind:  params.Kind,
		ID:    params.ID,
		Scope: cloneScope(identity.Scope),
	})
	if err != nil {
		writeMappedError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, ReadResponseFromSnapshot(snapshot))
}

// HandleMutate maps `PATCH /sync/resources/{kind}/{id}` onto SyncService.Mutate.
func (handler *Handler) HandleMutate(w http.ResponseWriter, r *http.Request) {
	handler.handleMutation(w, r, false)
}

// HandleAction maps `POST /sync/resources/{kind}/{id}/actions/{operation}` onto SyncService.Mutate.
func (handler *Handler) HandleAction(w http.ResponseWriter, r *http.Request) {
	handler.handleMutation(w, r, true)
}

func (handler *Handler) handleMutation(w http.ResponseWriter, r *http.Request, expectsOperationInPath bool) {
	expectedMethod := http.MethodPatch
	if expectsOperationInPath {
		expectedMethod = http.MethodPost
	}
	if r.Method != expectedMethod {
		writeError(w, http.StatusMethodNotAllowed, core.NewError(core.CodeInvalidMutation, "method not allowed", map[string]any{
			"method": r.Method,
		}))
		return
	}

	params, err := parseRouteParams(r, expectsOperationInPath)
	if err != nil {
		writeMappedError(w, err)
		return
	}

	identity, err := handler.resolveIdentity(r)
	if err != nil {
		writeMappedError(w, resolveIdentityError(err))
		return
	}

	body, err := decodeMutationRequestBody(w, r, handler.maxBodyBytes)
	if err != nil {
		writeMappedError(w, err)
		return
	}

	operation := strings.TrimSpace(body.Operation)
	if expectsOperationInPath {
		operation = params.Operation
	}
	if operation == "" {
		writeMappedError(w, core.NewError(core.CodeInvalidMutation, "operation is required", map[string]any{
			"field": "operation",
		}))
		return
	}
	if body.ExpectedRevision == nil {
		writeMappedError(w, core.NewError(core.CodeInvalidMutation, "expected revision is required", map[string]any{
			"field": "expected_revision",
		}))
		return
	}

	result, err := handler.service.Mutate(r.Context(), core.MutationInput{
		ResourceRef: core.ResourceRef{
			Kind:  params.Kind,
			ID:    params.ID,
			Scope: cloneScope(identity.Scope),
		},
		Operation:        operation,
		Payload:          cloneRawMessage(body.Payload),
		ExpectedRevision: *body.ExpectedRevision,
		IdempotencyKey:   strings.TrimSpace(body.IdempotencyKey),
		ActorID:          strings.TrimSpace(identity.ActorID),
		ClientID:         strings.TrimSpace(identity.ClientID),
		CorrelationID:    strings.TrimSpace(identity.CorrelationID),
		Metadata:         cloneMetadata(body.Metadata),
	})
	if err != nil {
		writeMappedError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, MutationResponseFromResult(result))
}

// StatusCodeForError maps canonical sync errors onto stable HTTP statuses.
func StatusCodeForError(err error) int {
	switch code, ok := core.ErrorCodeOf(err); {
	case !ok:
		return http.StatusInternalServerError
	case code == core.CodeNotFound:
		return http.StatusNotFound
	case code == core.CodeStaleRevision:
		return http.StatusConflict
	case code == core.CodeInvalidMutation:
		return http.StatusBadRequest
	case code == core.CodeRateLimited:
		return http.StatusTooManyRequests
	case code == core.CodeTransportUnavailable, code == core.CodeTemporaryFailure:
		return http.StatusServiceUnavailable
	default:
		return http.StatusInternalServerError
	}
}

func resolveAnonymousIdentity(_ *http.Request) (RequestIdentity, error) {
	return RequestIdentity{}, nil
}

func parseRouteParams(r *http.Request, expectsOperation bool) (routeParams, error) {
	params := routeParams{
		Kind:      strings.TrimSpace(r.PathValue("kind")),
		ID:        strings.TrimSpace(r.PathValue("id")),
		Operation: strings.TrimSpace(r.PathValue("operation")),
	}
	if params.Kind == "" {
		return routeParams{}, core.NewError(core.CodeInvalidMutation, "resource kind is required", map[string]any{
			"field": "kind",
		})
	}
	if params.ID == "" {
		return routeParams{}, core.NewError(core.CodeInvalidMutation, "resource id is required", map[string]any{
			"field": "id",
		})
	}
	if expectsOperation && params.Operation == "" {
		return routeParams{}, core.NewError(core.CodeInvalidMutation, "operation is required", map[string]any{
			"field": "operation",
		})
	}
	return params, nil
}

func decodeMutationRequestBody(w http.ResponseWriter, r *http.Request, maxBodyBytes int64) (MutationRequestBody, error) {
	if r.Body == nil {
		return MutationRequestBody{}, core.NewError(core.CodeInvalidMutation, "request body is required", nil)
	}

	bodyReader := r.Body
	if maxBodyBytes > 0 {
		bodyReader = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	}

	decoder := json.NewDecoder(bodyReader)
	decoder.DisallowUnknownFields()

	var body MutationRequestBody
	if err := decoder.Decode(&body); err != nil {
		switch {
		case errors.Is(err, io.EOF):
			return MutationRequestBody{}, core.NewError(core.CodeInvalidMutation, "request body is required", nil)
		default:
			return MutationRequestBody{}, core.NewWrappedError(core.CodeInvalidMutation, "invalid mutation request", nil, err)
		}
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		return MutationRequestBody{}, core.NewError(core.CodeInvalidMutation, "mutation request body must contain a single JSON object", nil)
	}
	return body, nil
}

func resolveIdentityError(err error) error {
	if err == nil {
		return nil
	}
	if code, ok := core.ErrorCodeOf(err); ok {
		switch code {
		case core.CodeInvalidMutation, core.CodeRateLimited, core.CodeTemporaryFailure, core.CodeTransportUnavailable:
			return err
		}
	}
	return core.NewWrappedError(core.CodeInvalidMutation, "request identity could not be resolved", nil, err)
}

func writeMappedError(w http.ResponseWriter, err error) {
	writeError(w, StatusCodeForError(err), err)
}

func writeError(w http.ResponseWriter, status int, err error) {
	writeJSON(w, status, ErrorEnvelopeFromError(err))
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func cloneScope(input map[string]string) map[string]string {
	if len(input) == 0 {
		return nil
	}
	output := make(map[string]string, len(input))
	maps.Copy(output, input)
	return output
}

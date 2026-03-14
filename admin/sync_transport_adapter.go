package admin

import (
	"fmt"
	"strings"

	router "github.com/goliatone/go-router"
)

// SyncTransportScopeResolver resolves consumer-owned canonical scope metadata
// from an authenticated admin request.
type SyncTransportScopeResolver func(router.Context, AuthenticatedRequestIdentity) (map[string]string, error)

// SyncTransportRequestMetadata captures trusted sync transport metadata that a
// consumer can adapt into its package-specific transport layer.
type SyncTransportRequestMetadata struct {
	ActorID       string
	RequestID     string
	CorrelationID string
	TraceID       string
	Scope         map[string]string
}

// SyncTransportAdapter resolves authenticated actor, scope, and trace metadata
// for go-admin consumers that expose pkg/go-sync transports.
type SyncTransportAdapter struct {
	ScopeDefaults AuthenticatedRequestScopeDefaults
	ResolveScope  SyncTransportScopeResolver
}

// Resolve returns trusted sync transport metadata without consulting
// browser-supplied actor or scope overrides.
func (a SyncTransportAdapter) Resolve(c router.Context) (SyncTransportRequestMetadata, error) {
	authenticated := ResolveAuthenticatedRequestIdentity(c, a.ScopeDefaults)
	if strings.TrimSpace(authenticated.ActorID) == "" {
		return SyncTransportRequestMetadata{}, fmt.Errorf("authenticated actor is required")
	}

	if a.ResolveScope == nil {
		return SyncTransportRequestMetadata{}, fmt.Errorf("sync transport scope resolver is required")
	}
	scope, err := a.ResolveScope(c, authenticated)
	if err != nil {
		return SyncTransportRequestMetadata{}, err
	}
	if len(scope) == 0 {
		return SyncTransportRequestMetadata{}, fmt.Errorf("canonical sync scope is required")
	}

	return SyncTransportRequestMetadata{
		ActorID:       strings.TrimSpace(authenticated.ActorID),
		RequestID:     strings.TrimSpace(authenticated.RequestID),
		CorrelationID: strings.TrimSpace(authenticated.CorrelationID),
		TraceID:       strings.TrimSpace(authenticated.TraceID),
		Scope:         cloneSyncTransportScope(scope),
	}, nil
}

func cloneSyncTransportScope(scope map[string]string) map[string]string {
	if len(scope) == 0 {
		return nil
	}
	out := make(map[string]string, len(scope))
	for key, value := range scope {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		out[key] = strings.TrimSpace(value)
	}
	return out
}

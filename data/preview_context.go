package data

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
)

type previewContextKey struct{}

func (s *Service) WithApplicationPreview(ctx context.Context, q ApplicationPreviewSessionQuery, surface string) (context.Context, PreviewReadContext, error) {
	read, err := s.ApplicationPreviewRead(ctx, q, surface)
	if err != nil {
		return ctx, PreviewReadContext{}, err
	}
	return context.WithValue(ctx, previewContextKey{}, read), read, nil
}
func ApplicationPreviewFromContext(ctx context.Context) (PreviewReadContext, error) {
	if ctx == nil {
		return PreviewReadContext{}, Error(CodeDenied)
	}
	read, ok := ctx.Value(previewContextKey{}).(PreviewReadContext)
	if !ok || read.Session.authorization == nil || read.Session.State != PreviewReady {
		return PreviewReadContext{}, Error(CodeDenied)
	}
	return read, nil
}

// Use at ordinary mutation/job/webhook/export boundaries before dispatch. Hosts
// must not spawn background work or drop this context on a preview request.
func RejectPreviewEffects(ctx context.Context) error {
	if ctx != nil && ctx.Value(previewContextKey{}) != nil {
		return Error(CodeDenied)
	}
	return nil
}
func (r PreviewReadContext) CacheKey() string {
	f := r.Session.authorization
	if f == nil {
		return ""
	}
	b, err := json.Marshal([]any{f.record.ApplicationID, f.record.EnvironmentID, r.Principal.ActorID, r.Principal.ScopeKey, r.Session.SessionID, r.Session.Selection, r.Session.SurfaceID})
	if err != nil {
		return ""
	}
	sum := sha256.Sum256(b)
	return "preview:" + hex.EncodeToString(sum[:])
}
func (s *Service) ValidatePreviewHost(ctx context.Context, application, environment, actor, scope string) error {
	if !s.previewEnabled() {
		return nil
	}
	p, err := s.principal(ctx)
	if err != nil {
		return err
	}
	if s.config.Preview.ApplicationID != application || s.config.Preview.EnvironmentID != environment || p.ActorID != actor || p.ScopeKey != scope {
		return Error(CodeDenied)
	}
	return nil
}

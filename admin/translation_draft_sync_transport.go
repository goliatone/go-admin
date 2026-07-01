package admin

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	synccore "github.com/goliatone/go-admin/pkg/go-sync/core"
	syncservice "github.com/goliatone/go-admin/pkg/go-sync/service"
	httptransport "github.com/goliatone/go-admin/pkg/go-sync/transport/http"
	router "github.com/goliatone/go-router"
)

type translationDraftSyncRequestIdentityContextKey struct{}

func (b *translationQueueBinding) ReadDraftSync(c router.Context) error {
	transport, err := newTranslationDraftSyncHTTPTransport(b)
	if err != nil {
		return err
	}
	return b.serveDraftSyncTransport(c, transport.HandleRead)
}

func (b *translationQueueBinding) MutateDraftSync(c router.Context) error {
	transport, err := newTranslationDraftSyncHTTPTransport(b)
	if err != nil {
		return err
	}
	return b.serveDraftSyncTransport(c, transport.HandleMutate)
}

func newTranslationDraftSyncHTTPTransport(binding *translationQueueBinding) (*httptransport.Handler, error) {
	store := newTranslationDraftSyncResourceStore(binding)
	if store == nil {
		return nil, serviceNotConfiguredDomainError("translation draft sync store", map[string]any{
			"component": "translation_draft_sync_transport",
		})
	}
	svc, err := syncservice.NewSyncService(store, nil)
	if err != nil {
		return nil, err
	}
	return httptransport.NewHandler(svc, httptransport.WithRequestIdentityResolver(translationDraftSyncRequestIdentityResolver()))
}

func (b *translationQueueBinding) serveDraftSyncTransport(c router.Context, handler func(http.ResponseWriter, *http.Request)) error {
	if handler == nil {
		return fmt.Errorf("translation draft sync transport handler is nil")
	}
	if b == nil || b.admin == nil {
		return serviceNotConfiguredDomainError("translation queue binding", map[string]any{
			"component": "translation_draft_sync_transport",
		})
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	setTranslationTraceHeaders(c, adminCtx.Context)
	if permissionErr := b.admin.requirePermission(adminCtx, PermAdminTranslationsEdit, "translations"); permissionErr != nil {
		return permissionErr
	}

	httpCtx, ok := router.AsHTTPContext(c)
	if !ok || httpCtx == nil || httpCtx.Request() == nil || httpCtx.Response() == nil {
		return synccore.NewError(synccore.CodeTransportUnavailable, "translation draft sync transport requires http context support", nil)
	}

	req := httpCtx.Request().Clone(c.Context())
	req.SetPathValue("kind", c.Param("kind"))
	req.SetPathValue("id", c.Param("id"))
	for key, value := range c.RouteParams() {
		req.SetPathValue(strings.TrimSpace(key), strings.TrimSpace(value))
	}
	identity, err := b.translationDraftSyncRequestIdentity(c, adminCtx)
	if err != nil {
		return err
	}
	req = withTranslationDraftSyncRequestIdentity(req, identity)
	handler(httpCtx.Response(), req)
	return nil
}

func (b *translationQueueBinding) translationDraftSyncRequestIdentity(c router.Context, adminCtx AdminContext) (httptransport.RequestIdentity, error) {
	metadata, err := SyncTransportAdapter{
		ScopeDefaults: b.admin.ScopeDefaults(),
		ResolveScope: func(c router.Context, authenticated AuthenticatedRequestIdentity) (map[string]string, error) {
			scope := map[string]string{
				ScopeTenantIDKey: strings.TrimSpace(firstNonEmpty(adminCtx.TenantID, authenticated.TenantID)),
				ScopeOrgIDKey:    strings.TrimSpace(firstNonEmpty(adminCtx.OrgID, authenticated.OrgID)),
				"channel":        translationChannelFromRequest(c, adminCtx, nil),
			}
			if strings.TrimSpace(scope[ScopeTenantIDKey]) == "" || strings.TrimSpace(scope[ScopeOrgIDKey]) == "" {
				return nil, synccore.NewError(synccore.CodeInvalidMutation, "tenant and org are required", map[string]any{
					"field": "scope",
				})
			}
			return scope, nil
		},
	}.Resolve(c)
	if err != nil {
		return httptransport.RequestIdentity{}, synccore.NewError(synccore.CodeInvalidMutation, err.Error(), map[string]any{
			"field": "request_identity",
		})
	}
	return httptransport.RequestIdentity{
		Scope:         metadata.Scope,
		ActorID:       metadata.ActorID,
		ClientID:      metadata.RequestID,
		CorrelationID: firstNonEmpty(metadata.CorrelationID, metadata.RequestID),
	}, nil
}

func translationDraftSyncRequestIdentityResolver() httptransport.RequestIdentityResolver {
	return func(r *http.Request) (httptransport.RequestIdentity, error) {
		identity, ok := translationDraftSyncRequestIdentityFromRequest(r)
		if !ok {
			return httptransport.RequestIdentity{}, synccore.NewError(synccore.CodeInvalidMutation, "trusted sync identity is required", map[string]any{
				"field": "request_identity",
			})
		}
		if strings.TrimSpace(identity.ActorID) == "" {
			return httptransport.RequestIdentity{}, synccore.NewError(synccore.CodeInvalidMutation, "authenticated actor is required", map[string]any{
				"field": "actor_id",
			})
		}
		if len(identity.Scope) == 0 || strings.TrimSpace(identity.Scope[ScopeTenantIDKey]) == "" || strings.TrimSpace(identity.Scope[ScopeOrgIDKey]) == "" {
			return httptransport.RequestIdentity{}, synccore.NewError(synccore.CodeInvalidMutation, "tenant and org are required", map[string]any{
				"field": "scope",
			})
		}
		return identity, nil
	}
}

func withTranslationDraftSyncRequestIdentity(req *http.Request, identity httptransport.RequestIdentity) *http.Request {
	if req == nil {
		return nil
	}
	ctx := context.WithValue(req.Context(), translationDraftSyncRequestIdentityContextKey{}, identity)
	return req.WithContext(ctx)
}

func translationDraftSyncRequestIdentityFromRequest(r *http.Request) (httptransport.RequestIdentity, bool) {
	if r == nil {
		return httptransport.RequestIdentity{}, false
	}
	identity, ok := r.Context().Value(translationDraftSyncRequestIdentityContextKey{}).(httptransport.RequestIdentity)
	return identity, ok
}

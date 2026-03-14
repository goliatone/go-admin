package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/stores"
	esignsync "github.com/goliatone/go-admin/examples/esign/sync"
	synccore "github.com/goliatone/go-admin/pkg/go-sync/core"
	httptransport "github.com/goliatone/go-admin/pkg/go-sync/transport/http"
	router "github.com/goliatone/go-router"
)

type trustedSyncRequestIdentityContextKey struct{}

func registerSyncRoutes(adminRoutes routeRegistrar, routes RouteSet, cfg registerConfig) {
	if cfg.sync == nil {
		return
	}
	securedRoutes := wrapRouteRegistrar(adminRoutes.router, composeMiddleware(adminRoutes.middleware, requireAuthenticatedAgreementRequest(cfg)))
	transport, err := httptransport.NewHandler(cfg.sync, httptransport.WithRequestIdentityResolver(newSyncRequestIdentityResolver()))
	if err != nil {
		return
	}

	securedRoutes.Get(routes.AdminSyncResource, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		return serveHTTPTransport(c, cfg, transport.HandleRead)
	}, requireAdminPermission(cfg, cfg.permissions.AdminView))

	securedRoutes.Patch(routes.AdminSyncResource, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		return serveHTTPMutationTransport(c, cfg, transport.HandleMutate)
	}, requireAdminPermission(cfg, cfg.permissions.AdminEdit))

	securedRoutes.Post(routes.AdminSyncResourceAction, func(c router.Context) error {
		if err := enforceTransportSecurity(c, cfg); err != nil {
			return asHandlerError(err)
		}
		return serveHTTPMutationTransport(c, cfg, transport.HandleAction)
	}, requireAdminPermission(cfg, cfg.permissions.AdminSend))

	if cfg.syncBootstrap != nil {
		securedRoutes.Post(routes.AdminSyncBootstrapAgreementDraft, func(c router.Context) error {
			if err := enforceTransportSecurity(c, cfg); err != nil {
				return asHandlerError(err)
			}
			actorID := resolveAuthenticatedAdminUserID(c)
			if actorID == "" {
				return writeAPIError(c, nil, http.StatusUnauthorized, "UNAUTHENTICATED", "authenticated actor is required", map[string]any{
					"field": "actor_id",
				})
			}
			payload, err := cfg.syncBootstrap.Bootstrap(c.Context(), cfg.resolveScope(c), actorID)
			if err != nil {
				return writeAPIError(c, err, http.StatusServiceUnavailable, string(synccore.CodeTemporaryFailure), "unable to bootstrap agreement draft", nil)
			}
			return c.JSON(http.StatusCreated, payload)
		}, requireAdminPermission(cfg, cfg.permissions.AdminCreate))
	}
}

func serveHTTPTransport(c router.Context, cfg registerConfig, handler func(http.ResponseWriter, *http.Request)) error {
	if handler == nil {
		return fmt.Errorf("sync transport handler is nil")
	}
	httpCtx, ok := router.AsHTTPContext(c)
	if !ok || httpCtx == nil || httpCtx.Request() == nil || httpCtx.Response() == nil {
		return fmt.Errorf("sync transport requires http context support")
	}
	req := httpCtx.Request().Clone(httpCtx.Request().Context())
	for key, value := range c.RouteParams() {
		req.SetPathValue(strings.TrimSpace(key), strings.TrimSpace(value))
	}
	identity, err := buildTrustedSyncRequestIdentity(c, cfg)
	if err != nil {
		return writeAPIError(c, err, http.StatusBadRequest, string(synccore.CodeInvalidMutation), "trusted sync identity is required", nil)
	}
	req = withTrustedSyncRequestIdentity(req, identity)
	handler(httpCtx.Response(), req)
	return nil
}

func serveHTTPMutationTransport(c router.Context, cfg registerConfig, handler func(http.ResponseWriter, *http.Request)) error {
	if handler == nil {
		return fmt.Errorf("sync transport handler is nil")
	}
	httpCtx, ok := router.AsHTTPContext(c)
	if !ok || httpCtx == nil || httpCtx.Request() == nil || httpCtx.Response() == nil {
		return fmt.Errorf("sync transport requires http context support")
	}
	req := httpCtx.Request().Clone(httpCtx.Request().Context())
	for key, value := range c.RouteParams() {
		req.SetPathValue(strings.TrimSpace(key), strings.TrimSpace(value))
	}
	identity, err := buildTrustedSyncRequestIdentity(c, cfg)
	if err != nil {
		return writeAPIError(c, err, http.StatusBadRequest, string(synccore.CodeInvalidMutation), "trusted sync identity is required", nil)
	}

	if req.Body != nil {
		body, err := io.ReadAll(req.Body)
		if err == nil {
			req.Body.Close()
			body = injectRequestIPMetadata(body, resolveAuditRequestIP(c, cfg))
			req.Body = io.NopCloser(bytes.NewReader(body))
			req.ContentLength = int64(len(body))
			req.GetBody = func() (io.ReadCloser, error) {
				return io.NopCloser(bytes.NewReader(body)), nil
			}
		}
	}

	req = withTrustedSyncRequestIdentity(req, identity)
	handler(httpCtx.Response(), req)
	return nil
}

func injectRequestIPMetadata(body []byte, ipAddress string) []byte {
	if len(body) == 0 || strings.TrimSpace(ipAddress) == "" {
		return body
	}
	payload := map[string]any{}
	if err := json.Unmarshal(body, &payload); err != nil {
		return body
	}
	metadata, ok := payload["metadata"].(map[string]any)
	if !ok || metadata == nil {
		metadata = map[string]any{}
	}
	if strings.TrimSpace(fmt.Sprint(metadata["ip_address"])) == "" {
		metadata["ip_address"] = strings.TrimSpace(ipAddress)
	}
	payload["metadata"] = metadata
	encoded, err := json.Marshal(payload)
	if err != nil {
		return body
	}
	return encoded
}

func newSyncRequestIdentityResolver() httptransport.RequestIdentityResolver {
	return func(r *http.Request) (httptransport.RequestIdentity, error) {
		identity, ok := trustedSyncRequestIdentityFromRequest(r)
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
		if len(identity.Scope) == 0 || strings.TrimSpace(identity.Scope["tenant_id"]) == "" || strings.TrimSpace(identity.Scope["org_id"]) == "" {
			return httptransport.RequestIdentity{}, synccore.NewError(synccore.CodeInvalidMutation, "tenant and org are required", map[string]any{
				"field": "scope",
			})
		}
		return identity, nil
	}
}

func buildTrustedSyncRequestIdentity(c router.Context, cfg registerConfig) (httptransport.RequestIdentity, error) {
	metadata, err := coreadmin.SyncTransportAdapter{
		ScopeDefaults: coreadmin.AuthenticatedRequestScopeDefaults{
			TenantID: strings.TrimSpace(cfg.defaultScope.TenantID),
			OrgID:    strings.TrimSpace(cfg.defaultScope.OrgID),
			Enabled:  strings.TrimSpace(cfg.defaultScope.TenantID) != "" || strings.TrimSpace(cfg.defaultScope.OrgID) != "",
		},
		ResolveScope: func(c router.Context, authenticated coreadmin.AuthenticatedRequestIdentity) (map[string]string, error) {
			resolvedScope := cfg.resolveScope(c)
			scope := stores.Scope{
				TenantID: strings.TrimSpace(resolvedScope.TenantID),
				OrgID:    strings.TrimSpace(resolvedScope.OrgID),
			}
			if strings.TrimSpace(scope.TenantID) == "" {
				scope.TenantID = strings.TrimSpace(authenticated.TenantID)
			}
			if strings.TrimSpace(scope.OrgID) == "" {
				scope.OrgID = strings.TrimSpace(authenticated.OrgID)
			}
			if strings.TrimSpace(scope.TenantID) == "" || strings.TrimSpace(scope.OrgID) == "" {
				return nil, synccore.NewError(synccore.CodeInvalidMutation, "tenant and org are required", map[string]any{
					"field": "scope",
				})
			}
			return esignsync.BuildIdentityScope(scope, authenticated.ActorID), nil
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
		CorrelationID: firstNonEmpty(metadata.CorrelationID, metadata.RequestID),
	}, nil
}

func withTrustedSyncRequestIdentity(req *http.Request, identity httptransport.RequestIdentity) *http.Request {
	if req == nil {
		return nil
	}
	ctx := context.WithValue(req.Context(), trustedSyncRequestIdentityContextKey{}, identity)
	return req.WithContext(ctx)
}

func trustedSyncRequestIdentityFromRequest(r *http.Request) (httptransport.RequestIdentity, bool) {
	if r == nil {
		return httptransport.RequestIdentity{}, false
	}
	identity, ok := r.Context().Value(trustedSyncRequestIdentityContextKey{}).(httptransport.RequestIdentity)
	return identity, ok
}

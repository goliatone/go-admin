package services

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"net/http"
	"reflect"
	"sort"
	"strings"
	"time"

	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
	gocore "github.com/goliatone/go-services/core"
	goservicesinbound "github.com/goliatone/go-services/inbound"
	servicesratelimit "github.com/goliatone/go-services/ratelimit"
	"github.com/uptrace/bun"
)

const (
	permissionServicesView         = "admin.services.view"
	permissionServicesConnect      = "admin.services.connect"
	permissionServicesEdit         = "admin.services.edit"
	permissionServicesRevoke       = "admin.services.revoke"
	permissionServicesReconsent    = "admin.services.reconsent"
	permissionServicesActivityView = "admin.services.activity.view"
	permissionServicesWebhooks     = "admin.services.webhooks"
)

func (m *Module) registerAPIRoutes() error {
	if m == nil || m.admin == nil {
		return nil
	}
	r := m.admin.ProtectedRouter()
	if r == nil {
		return fmt.Errorf("modules/services: protected router is not configured")
	}
	basePath := strings.TrimRight(m.admin.AdminAPIBasePath(), "/") + "/services"

	r.Get(basePath+"/providers", m.wrapServiceRoute(permissionServicesView, false, false, m.handleListProviders))
	r.Get(basePath+"/activity", m.wrapServiceRoute(permissionServicesActivityView, false, false, m.handleListActivity))
	r.Get(basePath+"/status", m.wrapServiceRoute(permissionServicesActivityView, false, false, m.handleServiceStatus))
	r.Get(basePath+"/extensions/diagnostics", m.wrapServiceRoute(permissionServicesView, false, false, m.handleExtensionDiagnostics))
	r.Post(basePath+"/activity/retention/cleanup", m.wrapServiceRoute(permissionServicesEdit, true, false, m.handleRunActivityRetentionCleanup))
	r.Get(basePath+"/installations", m.wrapServiceRoute(permissionServicesView, false, false, m.handleListInstallations))
	r.Get(basePath+"/installations/:ref", m.wrapServiceRoute(permissionServicesView, false, false, m.handleGetInstallation))
	r.Post(basePath+"/installations/:ref/begin", m.wrapServiceRoute(permissionServicesConnect, true, false, m.handleBeginInstallation))
	r.Post(basePath+"/installations/:ref/status", m.wrapServiceRoute(permissionServicesEdit, true, false, m.handleUpdateInstallationStatus))
	r.Post(basePath+"/installations/:ref/uninstall", m.wrapServiceRoute(permissionServicesRevoke, true, false, m.handleUninstallInstallation))
	r.Get(basePath+"/connections", m.wrapServiceRoute(permissionServicesView, false, false, m.handleListConnections))
	r.Get(basePath+"/connections/:ref", m.wrapServiceRoute(permissionServicesView, false, false, m.handleGetConnectionDetail))
	r.Post(basePath+"/connections/:ref/begin", m.wrapServiceRoute(permissionServicesConnect, true, false, m.handleBeginConnection))
	r.Get(basePath+"/connections/:ref/callback", m.wrapServiceRoute(permissionServicesConnect, false, false, m.handleCompleteCallback))
	r.Get(basePath+"/connections/:ref/grants", m.wrapServiceRoute(permissionServicesView, false, false, m.handleGetConnectionGrants))
	r.Post(basePath+"/connections/:ref/reconsent/begin", m.wrapServiceRoute(permissionServicesReconsent, true, false, m.handleBeginReconsent))
	r.Post(basePath+"/connections/:ref/refresh", m.wrapServiceRoute(permissionServicesEdit, true, false, m.handleRefreshConnection))
	r.Post(basePath+"/connections/:ref/revoke", m.wrapServiceRoute(permissionServicesRevoke, true, false, m.handleRevokeConnection))
	r.Post(basePath+"/capabilities/:provider/:capability/invoke", m.wrapServiceRoute(permissionServicesEdit, true, false, m.handleInvokeCapability))
	r.Post(basePath+"/webhooks/:provider", m.wrapServiceRoute(permissionServicesWebhooks, true, true, m.handleProviderWebhook))
	r.Get(basePath+"/subscriptions", m.wrapServiceRoute(permissionServicesView, false, false, m.handleListSubscriptions))
	r.Post(basePath+"/subscriptions/:ref/renew", m.wrapServiceRoute(permissionServicesEdit, true, false, m.handleRenewSubscription))
	r.Post(basePath+"/subscriptions/:ref/cancel", m.wrapServiceRoute(permissionServicesEdit, true, false, m.handleCancelSubscription))
	r.Post(basePath+"/sync/:ref/run", m.wrapServiceRoute(permissionServicesEdit, true, false, m.handleRunSync))
	r.Get(basePath+"/sync/:ref/status", m.wrapServiceRoute(permissionServicesView, false, false, m.handleGetSyncStatus))
	r.Get(basePath+"/rate-limits", m.wrapServiceRoute(permissionServicesView, false, false, m.handleListRateLimits))
	r.Get(basePath+"/rate-limits/runtime", m.wrapServiceRoute(permissionServicesView, false, false, m.handleListRateLimitsRuntime))
	r.Get(basePath+"/operations/status", m.wrapServiceRoute(permissionServicesView, false, false, m.handleListProviderOperationStatus))
	r.Post(basePath+"/inbound/:provider/:surface", m.wrapServiceRoute(permissionServicesWebhooks, true, true, m.handleProviderInbound))
	return nil
}

type serviceRouteHandler func(c router.Context, body map[string]any) (int, any, error)

func (m *Module) wrapServiceRoute(permission string, mutating bool, skipClientIdempotency bool, handler serviceRouteHandler) router.HandlerFunc {
	return func(c router.Context) error {
		if err := m.authorizeRoute(c, permission); err != nil {
			return writeServiceError(c, err)
		}

		body := map[string]any{}
		var rawBody []byte
		if mutating {
			rawBody = append([]byte(nil), c.Body()...)
			if len(rawBody) > 0 {
				parsedBody, err := parseJSONMap(rawBody)
				if err != nil {
					if !skipClientIdempotency {
						return writeServiceError(c, validationError("invalid JSON payload", map[string]any{"field": "body"}))
					}
				} else {
					body = parsedBody
				}
			}
		}

		var (
			idempotencyKey string
			dedupeKey      string
			payloadHash    string
		)
		if mutating && !skipClientIdempotency && m.config.API.RequireIdempotencyKey {
			idempotencyKey = strings.TrimSpace(c.Header("Idempotency-Key"))
			if idempotencyKey == "" {
				return writeServiceError(c, validationError("Idempotency-Key header is required", map[string]any{"field": "Idempotency-Key"}))
			}
			dedupeKey = idempotencyScopeKey(c, idempotencyKey)
			payloadHash = hashPayload(rawBody)
			if status, replayBody, ok, conflict := m.idempotencyStore.ReplayIfMatch(dedupeKey, payloadHash); ok {
				c.Status(status)
				if len(replayBody) == 0 {
					return c.Send([]byte("{}"))
				}
				return c.Send(replayBody)
			} else if conflict {
				return writeServiceError(c, conflictError("Idempotency key reuse with different payload", map[string]any{"idempotency_key": idempotencyKey}))
			}
		}

		status, payload, err := handler(c, body)
		if err != nil {
			return writeServiceError(c, err)
		}
		if status <= 0 {
			status = http.StatusOK
		}
		if payload == nil {
			payload = map[string]any{}
		}
		if mutating && !skipClientIdempotency && dedupeKey != "" {
			m.idempotencyStore.Store(dedupeKey, payloadHash, status, toBytesJSON(payload))
		}
		return c.JSON(status, payload)
	}
}

func (m *Module) authorizeRoute(c router.Context, permission string) error {
	if m == nil || m.admin == nil || strings.TrimSpace(permission) == "" {
		return nil
	}
	authorizer := m.admin.Authorizer()
	if authorizer == nil {
		return nil
	}
	if !authorizer.Can(c.Context(), permission, "services") {
		return forbiddenError(permission)
	}
	return nil
}

func (m *Module) handleListProviders(_ router.Context, _ map[string]any) (int, any, error) {
	if m.service == nil {
		return 0, nil, providerUnavailableError("services runtime is not configured", nil)
	}
	registry := m.service.Dependencies().Registry
	if registry == nil {
		return 0, map[string]any{"providers": []any{}}, nil
	}
	providers := registry.List()
	items := make([]map[string]any, 0, len(providers))
	for _, provider := range providers {
		if provider == nil {
			continue
		}
		caps := make([]map[string]any, 0, len(provider.Capabilities()))
		for _, capability := range provider.Capabilities() {
			caps = append(caps, map[string]any{
				"name":            capability.Name,
				"required_grants": append([]string(nil), capability.RequiredGrants...),
				"optional_grants": append([]string(nil), capability.OptionalGrants...),
				"denied_behavior": string(capability.DeniedBehavior),
			})
		}
		items = append(items, map[string]any{
			"id":                    strings.TrimSpace(provider.ID()),
			"auth_kind":             strings.TrimSpace(provider.AuthKind()),
			"supported_scope_types": append([]string(nil), provider.SupportedScopeTypes()...),
			"capabilities":          caps,
		})
	}
	response := newListResponse(items, len(items), len(items), 0, map[string]any{})
	response["providers"] = items
	return http.StatusOK, response, nil
}

func (m *Module) handleExtensionDiagnostics(_ router.Context, _ map[string]any) (int, any, error) {
	diag := m.ExtensionDiagnostics()
	return http.StatusOK, map[string]any{
		"extensions": map[string]any{
			"diagnostics_enabled":         m.config.Extensions.DiagnosticsEnabled,
			"registered_provider_packs":   append([]string(nil), diag.RegisteredProviderPacks...),
			"enabled_provider_packs":      append([]string(nil), diag.EnabledProviderPacks...),
			"disabled_provider_packs":     append([]string(nil), diag.DisabledProviderPacks...),
			"command_query_bundles":       append([]string(nil), diag.CommandQueryBundles...),
			"built_command_query_bundles": append([]string(nil), diag.BuiltCommandQueryBundles...),
			"lifecycle_subscribers":       append([]string(nil), diag.LifecycleSubscribers...),
			"feature_flags":               copyBoolMap(diag.FeatureFlags),
		},
	}, nil
}

func (m *Module) handleListActivity(c router.Context, _ map[string]any) (int, any, error) {
	filter, err := parseActivityListFilter(c)
	if err != nil {
		return 0, nil, err
	}
	page, err := m.listActivityFeed(c.Context(), filter)
	if err != nil {
		return 0, nil, err
	}
	response := newListResponse(page.Entries, page.Total, page.Limit, page.Offset, filter.toMap())
	response["entries"] = page.Entries
	response["action_label_overrides"] = copyStringMap(m.config.API.ActivityActionLabelOverrides)
	return http.StatusOK, response, nil
}

func (m *Module) handleListInstallations(c router.Context, _ map[string]any) (int, any, error) {
	providerIDFilter := strings.TrimSpace(c.Query("provider_id"))
	scopeTypeFilter := strings.TrimSpace(c.Query("scope_type"))
	scopeIDFilter := strings.TrimSpace(c.Query("scope_id"))
	installTypeFilter := strings.TrimSpace(c.Query("install_type"))
	statusFilter := strings.TrimSpace(c.Query("status"))
	qFilter := strings.TrimSpace(c.Query("q"))

	page := toInt(c.Query("page"), 1)
	if page <= 0 {
		page = 1
	}
	perPage := toInt(c.Query("per_page"), 25)
	if perPage <= 0 {
		perPage = 25
	}
	offset := (page - 1) * perPage

	if m.service != nil && providerIDFilter != "" && scopeTypeFilter != "" && scopeIDFilter != "" {
		installations, err := m.service.ListInstallations(c.Context(), providerIDFilter, gocore.ScopeRef{
			Type: scopeTypeFilter,
			ID:   scopeIDFilter,
		})
		if err != nil {
			return 0, nil, err
		}
		items := make([]map[string]any, 0, len(installations))
		for _, installation := range installations {
			if statusFilter != "" && !strings.EqualFold(statusFilter, strings.TrimSpace(string(installation.Status))) {
				continue
			}
			if installTypeFilter != "" && !strings.EqualFold(installTypeFilter, strings.TrimSpace(installation.InstallType)) {
				continue
			}
			if qFilter != "" {
				haystack := strings.ToLower(strings.Join([]string{
					strings.TrimSpace(installation.ProviderID),
					strings.TrimSpace(installation.ScopeType),
					strings.TrimSpace(installation.ScopeID),
					strings.TrimSpace(installation.InstallType),
					strings.TrimSpace(string(installation.Status)),
				}, " "))
				if !strings.Contains(haystack, strings.ToLower(qFilter)) {
					continue
				}
			}
			items = append(items, installationToMap(installation))
		}
		total := len(items)
		paged := paginateMaps(items, perPage, offset)
		response := newListResponse(paged, total, perPage, offset, map[string]any{
			"provider_id":  providerIDFilter,
			"scope_type":   scopeTypeFilter,
			"scope_id":     scopeIDFilter,
			"install_type": installTypeFilter,
			"status":       statusFilter,
			"q":            qFilter,
		})
		response["installations"] = paged
		return http.StatusOK, response, nil
	}

	db := resolveBunDB(m.config.PersistenceClient, m.repositoryFactory)
	if db == nil {
		return 0, nil, providerUnavailableError("persistence client is not configured", nil)
	}

	rows := []installationRecord{}
	query := db.NewSelect().Model(&rows).Order("created_at DESC").Limit(perPage).Offset(offset)
	countQuery := db.NewSelect().Table("service_installations")

	if providerID := providerIDFilter; providerID != "" {
		query = query.Where("provider_id = ?", providerID)
		countQuery = countQuery.Where("provider_id = ?", providerID)
	}
	if scopeType := scopeTypeFilter; scopeType != "" {
		query = query.Where("scope_type = ?", scopeType)
		countQuery = countQuery.Where("scope_type = ?", scopeType)
	}
	if scopeID := scopeIDFilter; scopeID != "" {
		query = query.Where("scope_id = ?", scopeID)
		countQuery = countQuery.Where("scope_id = ?", scopeID)
	}
	if status := statusFilter; status != "" {
		query = query.Where("status = ?", status)
		countQuery = countQuery.Where("status = ?", status)
	}
	if installType := installTypeFilter; installType != "" {
		query = query.Where("install_type = ?", installType)
		countQuery = countQuery.Where("install_type = ?", installType)
	}
	if qFilter != "" {
		likePattern := "%" + strings.ToLower(qFilter) + "%"
		query = query.Where(
			"(LOWER(provider_id) LIKE ? OR LOWER(scope_type) LIKE ? OR LOWER(scope_id) LIKE ? OR LOWER(install_type) LIKE ? OR LOWER(status) LIKE ?)",
			likePattern, likePattern, likePattern, likePattern, likePattern,
		)
		countQuery = countQuery.Where(
			"(LOWER(provider_id) LIKE ? OR LOWER(scope_type) LIKE ? OR LOWER(scope_id) LIKE ? OR LOWER(install_type) LIKE ? OR LOWER(status) LIKE ?)",
			likePattern, likePattern, likePattern, likePattern, likePattern,
		)
	}

	if err := query.Scan(c.Context()); err != nil {
		if errorsIsNoRows(err) {
			rows = []installationRecord{}
		} else {
			return 0, nil, err
		}
	}
	total, err := countQuery.Count(c.Context())
	if err != nil {
		return 0, nil, err
	}

	items := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		items = append(items, row.toMap())
	}

	response := newListResponse(items, total, perPage, offset, map[string]any{
		"provider_id":  providerIDFilter,
		"scope_type":   scopeTypeFilter,
		"scope_id":     scopeIDFilter,
		"install_type": installTypeFilter,
		"status":       statusFilter,
		"q":            qFilter,
	})
	response["installations"] = items
	return http.StatusOK, response, nil
}

func (m *Module) handleGetInstallation(c router.Context, _ map[string]any) (int, any, error) {
	installationID := routeParam(c, "ref", "id")
	if installationID == "" {
		return 0, nil, validationError("installation id is required", map[string]any{"field": "ref"})
	}
	if m.service == nil {
		return 0, nil, providerUnavailableError("services runtime is not configured", nil)
	}
	installation, err := m.service.GetInstallation(c.Context(), installationID)
	if err != nil {
		if isNotFound(err) {
			return 0, nil, missingResourceError("installation", map[string]any{"installation_id": installationID})
		}
		return 0, nil, err
	}
	return http.StatusOK, map[string]any{"installation": installationToMap(installation)}, nil
}

func (m *Module) handleBeginInstallation(c router.Context, body map[string]any) (int, any, error) {
	providerID := routeParam(c, "provider", "ref")
	if providerID == "" {
		return 0, nil, validationError("provider id is required", map[string]any{"field": "provider"})
	}
	scope, err := resolveScope(c.Context(), c, body)
	if err != nil {
		return 0, nil, err
	}
	if m.service == nil {
		return 0, nil, providerUnavailableError("services runtime is not configured", nil)
	}
	redirectURI := strings.TrimSpace(toString(body["redirect_uri"]))
	if redirectURI == "" {
		resolvedRedirect, err := m.resolveCallbackRedirectURI(c, providerID)
		if err != nil {
			return 0, nil, err
		}
		redirectURI = resolvedRedirect
	}
	requested := toStringSlice(body["requested_grants"])
	begin, err := m.service.Connect(c.Context(), gocore.ConnectRequest{
		ProviderID:      providerID,
		Scope:           scope,
		RedirectURI:     redirectURI,
		State:           strings.TrimSpace(toString(body["state"])),
		RequestedGrants: requested,
		Metadata:        extractMetadata(body),
	})
	if err != nil {
		return 0, nil, err
	}

	installation, err := m.service.UpsertInstallation(c.Context(), gocore.UpsertInstallationInput{
		ProviderID:  providerID,
		Scope:       scope,
		InstallType: firstNonEmpty(toString(body["install_type"]), "standard"),
		Status:      gocore.InstallationStatusActive,
		GrantedAt:   ptrTime(time.Now().UTC()),
		Metadata:    extractMetadata(body),
	})
	if err != nil {
		return 0, nil, err
	}

	return http.StatusOK, map[string]any{
		"begin":        begin,
		"installation": installationToMap(installation),
	}, nil
}

func (m *Module) handleUpdateInstallationStatus(c router.Context, body map[string]any) (int, any, error) {
	installationID := routeParam(c, "ref", "id")
	if installationID == "" {
		return 0, nil, validationError("installation id is required", map[string]any{"field": "ref"})
	}
	targetStatus := strings.TrimSpace(toString(body["status"]))
	if targetStatus == "" {
		return 0, nil, validationError("installation status is required", map[string]any{"field": "status"})
	}
	if m.service == nil {
		return 0, nil, providerUnavailableError("services runtime is not configured", nil)
	}
	reason := strings.TrimSpace(toString(body["reason"]))
	if err := m.service.UpdateInstallationStatus(c.Context(), installationID, targetStatus, reason); err != nil {
		if isNotFound(err) {
			return 0, nil, missingResourceError("installation", map[string]any{"installation_id": installationID})
		}
		return 0, nil, err
	}
	installation, err := m.service.GetInstallation(c.Context(), installationID)
	if err != nil {
		if isNotFound(err) {
			return 0, nil, missingResourceError("installation", map[string]any{"installation_id": installationID})
		}
		return 0, nil, err
	}
	return http.StatusOK, map[string]any{
		"status":          "ok",
		"installation_id": installationID,
		"installation":    installationToMap(installation),
	}, nil
}

func (m *Module) handleUninstallInstallation(c router.Context, body map[string]any) (int, any, error) {
	installationID := routeParam(c, "id", "ref")
	if installationID == "" {
		return 0, nil, validationError("installation id is required", map[string]any{"field": "id"})
	}
	if m.service == nil {
		return 0, nil, providerUnavailableError("services runtime is not configured", nil)
	}

	installation, err := m.service.GetInstallation(c.Context(), installationID)
	if err != nil {
		if isNotFound(err) {
			return 0, nil, missingResourceError("installation", map[string]any{"installation_id": installationID})
		}
		return 0, nil, err
	}

	reason := strings.TrimSpace(firstNonEmpty(toString(body["reason"]), "installation_uninstall"))
	if err := m.service.UpdateInstallationStatus(c.Context(), installationID, string(gocore.InstallationStatusUninstalled), reason); err != nil {
		return 0, nil, err
	}

	revokedConnections := 0
	if db := resolveBunDB(m.config.PersistenceClient, m.repositoryFactory); db != nil {
		connections := []connectionRecord{}
		err := db.NewSelect().Model(&connections).
			Where("provider_id = ?", installation.ProviderID).
			Where("scope_type = ?", installation.ScopeType).
			Where("scope_id = ?", installation.ScopeID).
			Where("status != ?", string(gocore.ConnectionStatusDisconnected)).
			Scan(c.Context())
		if err == nil {
			for _, conn := range connections {
				if revokeErr := m.service.Revoke(c.Context(), conn.ID, reason); revokeErr == nil {
					revokedConnections++
				}
			}
		}
	}
	updatedInstallation, err := m.service.GetInstallation(c.Context(), installationID)
	if err != nil && !isNotFound(err) {
		return 0, nil, err
	}
	installationPayload := map[string]any{}
	if err == nil {
		installationPayload = installationToMap(updatedInstallation)
	}

	return http.StatusOK, map[string]any{
		"status":              "ok",
		"installation_id":     installationID,
		"revoked_connections": revokedConnections,
		"installation":        installationPayload,
	}, nil
}

func (m *Module) handleListConnections(c router.Context, _ map[string]any) (int, any, error) {
	db := resolveBunDB(m.config.PersistenceClient, m.repositoryFactory)
	if db == nil {
		return 0, nil, providerUnavailableError("persistence client is not configured", nil)
	}
	page := toInt(c.Query("page"), 1)
	if page <= 0 {
		page = 1
	}
	perPage := toInt(c.Query("per_page"), 25)
	if perPage <= 0 {
		perPage = 25
	}
	offset := (page - 1) * perPage
	qFilter := strings.TrimSpace(c.Query("q"))

	rows := []connectionRecord{}
	query := db.NewSelect().Model(&rows).Order("created_at DESC").Limit(perPage).Offset(offset)
	countQuery := db.NewSelect().Table("service_connections")

	if providerID := strings.TrimSpace(c.Query("provider_id")); providerID != "" {
		query = query.Where("provider_id = ?", providerID)
		countQuery = countQuery.Where("provider_id = ?", providerID)
	}
	if scopeType := strings.TrimSpace(c.Query("scope_type")); scopeType != "" {
		query = query.Where("scope_type = ?", scopeType)
		countQuery = countQuery.Where("scope_type = ?", scopeType)
	}
	if scopeID := strings.TrimSpace(c.Query("scope_id")); scopeID != "" {
		query = query.Where("scope_id = ?", scopeID)
		countQuery = countQuery.Where("scope_id = ?", scopeID)
	}
	if status := strings.TrimSpace(c.Query("status")); status != "" {
		query = query.Where("status = ?", status)
		countQuery = countQuery.Where("status = ?", status)
	}
	if qFilter != "" {
		likePattern := "%" + strings.ToLower(qFilter) + "%"
		query = query.Where(
			"(LOWER(provider_id) LIKE ? OR LOWER(scope_type) LIKE ? OR LOWER(scope_id) LIKE ? OR LOWER(external_account_id) LIKE ? OR LOWER(status) LIKE ? OR LOWER(last_error) LIKE ?)",
			likePattern, likePattern, likePattern, likePattern, likePattern, likePattern,
		)
		countQuery = countQuery.Where(
			"(LOWER(provider_id) LIKE ? OR LOWER(scope_type) LIKE ? OR LOWER(scope_id) LIKE ? OR LOWER(external_account_id) LIKE ? OR LOWER(status) LIKE ? OR LOWER(last_error) LIKE ?)",
			likePattern, likePattern, likePattern, likePattern, likePattern, likePattern,
		)
	}

	if err := query.Scan(c.Context()); err != nil {
		if !errorsIsNoRows(err) {
			return 0, nil, err
		}
	}
	total, err := countQuery.Count(c.Context())
	if err != nil {
		return 0, nil, err
	}

	items := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		items = append(items, row.toMap())
	}

	response := newListResponse(items, total, perPage, offset, map[string]any{
		"provider_id": strings.TrimSpace(c.Query("provider_id")),
		"scope_type":  strings.TrimSpace(c.Query("scope_type")),
		"scope_id":    strings.TrimSpace(c.Query("scope_id")),
		"status":      strings.TrimSpace(c.Query("status")),
		"q":           qFilter,
	})
	response["connections"] = items
	return http.StatusOK, response, nil
}

func (m *Module) handleGetConnectionDetail(c router.Context, _ map[string]any) (int, any, error) {
	connectionID := routeParam(c, "ref", "id", "connection_id")
	if connectionID == "" {
		return 0, nil, validationError("connection id is required", map[string]any{"field": "ref"})
	}
	db := resolveBunDB(m.config.PersistenceClient, m.repositoryFactory)
	if db == nil {
		return 0, nil, providerUnavailableError("persistence client is not configured", nil)
	}

	connection := connectionRecord{}
	if err := db.NewSelect().Model(&connection).Where("id = ?", connectionID).Limit(1).Scan(c.Context()); err != nil {
		if errorsIsNoRows(err) {
			return 0, nil, missingResourceError("connection", map[string]any{"connection_id": connectionID})
		}
		return 0, nil, err
	}

	credentialHealth, err := loadConnectionCredentialHealth(c.Context(), db, connectionID, connection.LastError)
	if err != nil {
		return 0, nil, err
	}
	grantsSummary, err := m.loadConnectionGrantSummary(c.Context(), connectionID, connection.ProviderID)
	if err != nil {
		return 0, nil, err
	}
	subscriptionSummary, err := loadConnectionSubscriptionSummary(c.Context(), db, connectionID)
	if err != nil {
		return 0, nil, err
	}
	syncSummary, err := loadConnectionSyncSummary(c.Context(), db, connectionID, connection.LastError)
	if err != nil {
		return 0, nil, err
	}
	rateLimitSummary, err := loadConnectionRateLimitSummary(c.Context(), db, connection)
	if err != nil {
		return 0, nil, err
	}

	return http.StatusOK, map[string]any{
		"connection":           connection.toMap(),
		"credential_health":    credentialHealth,
		"grants_summary":       grantsSummary,
		"subscription_summary": subscriptionSummary,
		"sync_summary":         syncSummary,
		"rate_limit_summary":   rateLimitSummary,
	}, nil
}

func (m *Module) handleBeginConnection(c router.Context, body map[string]any) (int, any, error) {
	providerID := routeParam(c, "provider", "ref")
	if providerID == "" {
		return 0, nil, validationError("provider id is required", map[string]any{"field": "provider"})
	}
	if m.service == nil {
		return 0, nil, providerUnavailableError("services runtime is not configured", nil)
	}
	scope, err := resolveScope(c.Context(), c, body)
	if err != nil {
		return 0, nil, err
	}
	redirectURI := strings.TrimSpace(toString(body["redirect_uri"]))
	if redirectURI == "" {
		resolvedRedirect, err := m.resolveCallbackRedirectURI(c, providerID)
		if err != nil {
			return 0, nil, err
		}
		redirectURI = resolvedRedirect
	}
	response, err := m.service.Connect(c.Context(), gocore.ConnectRequest{
		ProviderID:      providerID,
		Scope:           scope,
		RedirectURI:     redirectURI,
		State:           strings.TrimSpace(toString(body["state"])),
		RequestedGrants: toStringSlice(body["requested_grants"]),
		Metadata:        extractMetadata(body),
	})
	if err != nil {
		return 0, nil, err
	}
	return http.StatusOK, map[string]any{"begin": response}, nil
}

func (m *Module) handleCompleteCallback(c router.Context, _ map[string]any) (int, any, error) {
	providerID := routeParam(c, "provider", "ref")
	if providerID == "" {
		return 0, nil, validationError("provider id is required", map[string]any{"field": "provider"})
	}
	if m.service == nil {
		return 0, nil, providerUnavailableError("services runtime is not configured", nil)
	}
	scope, err := resolveScope(c.Context(), c, queryToMetadata(c))
	if err != nil {
		return 0, nil, err
	}
	completion, err := m.service.CompleteCallback(c.Context(), gocore.CompleteAuthRequest{
		ProviderID:  providerID,
		Scope:       scope,
		Code:        strings.TrimSpace(c.Query("code")),
		State:       strings.TrimSpace(c.Query("state")),
		RedirectURI: strings.TrimSpace(c.Query("redirect_uri")),
		Metadata:    queryToMetadata(c),
	})
	if err != nil {
		return 0, nil, err
	}
	return http.StatusOK, map[string]any{"completion": completion}, nil
}

func (m *Module) handleGetConnectionGrants(c router.Context, _ map[string]any) (int, any, error) {
	connectionID := routeParam(c, "id", "ref")
	if connectionID == "" {
		return 0, nil, validationError("connection id is required", map[string]any{"field": "id"})
	}
	if m.service == nil {
		return 0, nil, providerUnavailableError("services runtime is not configured", nil)
	}
	grantStore := m.service.Dependencies().GrantStore
	if grantStore == nil {
		return 0, nil, providerUnavailableError("grant store is not configured", nil)
	}
	snapshot, found, err := grantStore.GetLatestSnapshot(c.Context(), connectionID)
	if err != nil {
		return 0, nil, err
	}
	if !found {
		return 0, nil, missingResourceError("grant_snapshot", map[string]any{"connection_id": connectionID})
	}
	return http.StatusOK, map[string]any{"snapshot": snapshot}, nil
}

func (m *Module) handleBeginReconsent(c router.Context, body map[string]any) (int, any, error) {
	connectionID := routeParam(c, "id", "ref")
	if connectionID == "" {
		return 0, nil, validationError("connection id is required", map[string]any{"field": "id"})
	}
	if m.service == nil {
		return 0, nil, providerUnavailableError("services runtime is not configured", nil)
	}
	redirectURI := strings.TrimSpace(toString(body["redirect_uri"]))
	if redirectURI == "" {
		providerID := strings.TrimSpace(toString(body["provider_id"]))
		if providerID == "" {
			providerID = m.lookupConnectionProvider(c.Context(), connectionID)
		}
		if providerID != "" {
			resolvedRedirect, err := m.resolveCallbackRedirectURI(c, providerID)
			if err != nil {
				return 0, nil, err
			}
			redirectURI = resolvedRedirect
		}
	}
	begin, err := m.service.StartReconsent(c.Context(), gocore.ReconsentRequest{
		ConnectionID:    connectionID,
		RedirectURI:     redirectURI,
		State:           strings.TrimSpace(toString(body["state"])),
		RequestedGrants: toStringSlice(body["requested_grants"]),
		Metadata:        extractMetadata(body),
	})
	if err != nil {
		return 0, nil, err
	}
	return http.StatusOK, map[string]any{"begin": begin}, nil
}

func (m *Module) handleRefreshConnection(c router.Context, body map[string]any) (int, any, error) {
	connectionID := routeParam(c, "id", "ref")
	if connectionID == "" {
		return 0, nil, validationError("connection id is required", map[string]any{"field": "id"})
	}
	providerID := strings.TrimSpace(toString(body["provider_id"]))
	if providerID == "" {
		providerID = m.lookupConnectionProvider(c.Context(), connectionID)
	}
	if providerID == "" {
		return 0, nil, validationError("provider id is required", map[string]any{"field": "provider_id"})
	}
	if m.worker != nil && m.config.Worker.Enabled && m.worker.HasEnqueuer() {
		err := m.worker.EnqueueRefresh(c.Context(), gocore.RefreshRequest{ProviderID: providerID, ConnectionID: connectionID}, strings.TrimSpace(c.Header("Idempotency-Key")))
		if err != nil {
			return 0, nil, providerUnavailableError("unable to enqueue refresh job", map[string]any{"reason": err.Error()})
		}
		return http.StatusAccepted, map[string]any{"queued": true, "job_id": "services.refresh"}, nil
	}
	if m.service == nil {
		return 0, nil, providerUnavailableError("services runtime is not configured", nil)
	}
	result, err := m.service.Refresh(c.Context(), gocore.RefreshRequest{ProviderID: providerID, ConnectionID: connectionID})
	if err != nil {
		return 0, nil, err
	}
	return http.StatusOK, map[string]any{"refresh": result}, nil
}

func (m *Module) handleRevokeConnection(c router.Context, body map[string]any) (int, any, error) {
	connectionID := routeParam(c, "id", "ref")
	if connectionID == "" {
		return 0, nil, validationError("connection id is required", map[string]any{"field": "id"})
	}
	if m.service == nil {
		return 0, nil, providerUnavailableError("services runtime is not configured", nil)
	}
	if err := m.service.Revoke(c.Context(), connectionID, strings.TrimSpace(toString(body["reason"]))); err != nil {
		return 0, nil, err
	}
	return http.StatusOK, map[string]any{"status": "revoked", "connection_id": connectionID}, nil
}

func (m *Module) handleInvokeCapability(c router.Context, body map[string]any) (int, any, error) {
	providerID := strings.TrimSpace(c.Param("provider", ""))
	capability := strings.TrimSpace(c.Param("capability", ""))
	if providerID == "" || capability == "" {
		return 0, nil, validationError("provider and capability are required", map[string]any{"field": "provider/capability"})
	}
	if m.service == nil {
		return 0, nil, providerUnavailableError("services runtime is not configured", nil)
	}
	scope, err := resolveScope(c.Context(), c, body)
	if err != nil {
		return 0, nil, err
	}
	result, err := m.service.InvokeCapability(c.Context(), gocore.InvokeCapabilityRequest{
		ProviderID:   providerID,
		Capability:   capability,
		Scope:        scope,
		ConnectionID: strings.TrimSpace(toString(body["connection_id"])),
		Payload:      extractMap(body["payload"]),
	})
	if err != nil {
		return 0, nil, err
	}
	if !result.Allowed && result.Mode == gocore.CapabilityDeniedBehaviorBlock {
		return 0, nil, goerrorsMissingPermissions(result)
	}
	return http.StatusOK, map[string]any{"result": result}, nil
}

func (m *Module) handleProviderWebhook(c router.Context, body map[string]any) (int, any, error) {
	providerID := strings.TrimSpace(c.Param("provider", ""))
	if providerID == "" {
		return 0, nil, validationError("provider id is required", map[string]any{"field": "provider"})
	}
	if m.webhookProcessor == nil {
		return 0, nil, providerUnavailableError("webhook processor is not configured", nil)
	}
	request := gocore.InboundRequest{
		ProviderID: providerID,
		Surface:    goservicesinbound.SurfaceWebhook,
		Headers:    collectInboundHeaders(c),
		Body:       append([]byte(nil), c.Body()...),
		Metadata:   mergeMetadata(queryToMetadata(c), extractMetadata(body)),
	}
	result, err := m.webhookProcessor.Process(c.Context(), request)
	if err != nil {
		if result.StatusCode == http.StatusUnauthorized {
			return 0, nil, goerrorsUnauthorized(err)
		}
		return 0, nil, err
	}
	status := result.StatusCode
	if status <= 0 {
		status = http.StatusAccepted
	}
	return status, map[string]any{"result": result}, nil
}

func (m *Module) handleListSubscriptions(c router.Context, _ map[string]any) (int, any, error) {
	db := resolveBunDB(m.config.PersistenceClient, m.repositoryFactory)
	if db == nil {
		return 0, nil, providerUnavailableError("persistence client is not configured", nil)
	}
	page := toInt(c.Query("page"), 1)
	if page <= 0 {
		page = 1
	}
	perPage := toInt(c.Query("per_page"), 25)
	if perPage <= 0 {
		perPage = 25
	}
	offset := (page - 1) * perPage
	qFilter := strings.TrimSpace(c.Query("q"))

	rows := []subscriptionRecord{}
	query := db.NewSelect().Model(&rows).Order("created_at DESC").Limit(perPage).Offset(offset)
	countQuery := db.NewSelect().Table("service_subscriptions")

	if providerID := strings.TrimSpace(c.Query("provider_id")); providerID != "" {
		query = query.Where("provider_id = ?", providerID)
		countQuery = countQuery.Where("provider_id = ?", providerID)
	}
	if connectionID := strings.TrimSpace(c.Query("connection_id")); connectionID != "" {
		query = query.Where("connection_id = ?", connectionID)
		countQuery = countQuery.Where("connection_id = ?", connectionID)
	}
	if status := strings.TrimSpace(c.Query("status")); status != "" {
		query = query.Where("status = ?", status)
		countQuery = countQuery.Where("status = ?", status)
	}
	if qFilter != "" {
		likePattern := "%" + strings.ToLower(qFilter) + "%"
		query = query.Where(
			"(LOWER(provider_id) LIKE ? OR LOWER(connection_id) LIKE ? OR LOWER(resource_type) LIKE ? OR LOWER(resource_id) LIKE ? OR LOWER(channel_id) LIKE ? OR LOWER(remote_subscription_id) LIKE ? OR LOWER(status) LIKE ?)",
			likePattern, likePattern, likePattern, likePattern, likePattern, likePattern, likePattern,
		)
		countQuery = countQuery.Where(
			"(LOWER(provider_id) LIKE ? OR LOWER(connection_id) LIKE ? OR LOWER(resource_type) LIKE ? OR LOWER(resource_id) LIKE ? OR LOWER(channel_id) LIKE ? OR LOWER(remote_subscription_id) LIKE ? OR LOWER(status) LIKE ?)",
			likePattern, likePattern, likePattern, likePattern, likePattern, likePattern, likePattern,
		)
	}

	if err := query.Scan(c.Context()); err != nil && !errorsIsNoRows(err) {
		return 0, nil, err
	}
	total, err := countQuery.Count(c.Context())
	if err != nil {
		return 0, nil, err
	}

	items := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		items = append(items, row.toMap())
	}

	response := newListResponse(items, total, perPage, offset, map[string]any{
		"provider_id":   strings.TrimSpace(c.Query("provider_id")),
		"connection_id": strings.TrimSpace(c.Query("connection_id")),
		"status":        strings.TrimSpace(c.Query("status")),
		"q":             qFilter,
	})
	response["subscriptions"] = items
	return http.StatusOK, response, nil
}

func (m *Module) handleRenewSubscription(c router.Context, body map[string]any) (int, any, error) {
	subscriptionID := routeParam(c, "ref", "id")
	if subscriptionID == "" {
		return 0, nil, validationError("subscription id is required", map[string]any{"field": "ref"})
	}
	if m.worker != nil && m.config.Worker.Enabled && m.worker.HasEnqueuer() {
		err := m.worker.EnqueueSubscriptionRenew(c.Context(), subscriptionID, extractMetadata(body), strings.TrimSpace(c.Header("Idempotency-Key")))
		if err != nil {
			return 0, nil, providerUnavailableError("unable to enqueue subscription renew job", map[string]any{"reason": err.Error()})
		}
		return http.StatusAccepted, map[string]any{"queued": true, "job_id": "services.subscription.renew"}, nil
	}
	if m.service == nil {
		return 0, nil, providerUnavailableError("services runtime is not configured", nil)
	}
	subscription, err := m.service.RenewSubscription(c.Context(), gocore.RenewSubscriptionRequest{
		SubscriptionID: subscriptionID,
		Metadata:       extractMetadata(body),
	})
	if err != nil {
		return 0, nil, err
	}
	return http.StatusOK, map[string]any{"subscription": subscription}, nil
}

func (m *Module) handleCancelSubscription(c router.Context, body map[string]any) (int, any, error) {
	subscriptionID := routeParam(c, "ref", "id")
	if subscriptionID == "" {
		return 0, nil, validationError("subscription id is required", map[string]any{"field": "ref"})
	}
	if m.service == nil {
		return 0, nil, providerUnavailableError("services runtime is not configured", nil)
	}
	if err := m.service.CancelSubscription(c.Context(), gocore.CancelSubscriptionRequest{
		SubscriptionID: subscriptionID,
		Reason:         strings.TrimSpace(toString(body["reason"])),
	}); err != nil {
		return 0, nil, err
	}
	return http.StatusOK, map[string]any{"status": "cancelled", "subscription_id": subscriptionID}, nil
}

func (m *Module) handleRunSync(c router.Context, body map[string]any) (int, any, error) {
	connectionID := routeParam(c, "ref", "connection_id", "id")
	if connectionID == "" {
		return 0, nil, validationError("connection id is required", map[string]any{"field": "ref"})
	}
	providerID := firstNonEmpty(strings.TrimSpace(toString(body["provider_id"])), m.lookupConnectionProvider(c.Context(), connectionID))
	if providerID == "" {
		return 0, nil, validationError("provider id is required", map[string]any{"field": "provider_id"})
	}
	resourceType := strings.TrimSpace(toString(body["resource_type"]))
	resourceID := strings.TrimSpace(toString(body["resource_id"]))
	if resourceType == "" || resourceID == "" {
		return 0, nil, validationError("resource_type and resource_id are required", map[string]any{"field": "resource_type/resource_id"})
	}
	metadata := extractMetadata(body)

	if m.worker != nil && m.config.Worker.Enabled && m.worker.HasEnqueuer() {
		err := m.worker.EnqueueSyncRun(c.Context(), connectionID, providerID, resourceType, resourceID, metadata, strings.TrimSpace(c.Header("Idempotency-Key")))
		if err != nil {
			return 0, nil, providerUnavailableError("unable to enqueue sync job", map[string]any{"reason": err.Error()})
		}
		return http.StatusAccepted, map[string]any{"queued": true, "job_id": "services.sync.incremental"}, nil
	}
	if m.syncOrchestrator == nil {
		return 0, nil, providerUnavailableError("sync orchestrator is not configured", nil)
	}
	job, err := m.syncOrchestrator.StartIncremental(c.Context(), connectionID, providerID, resourceType, resourceID, metadata)
	if err != nil {
		return 0, nil, err
	}
	return http.StatusOK, map[string]any{"job": job}, nil
}

func (m *Module) handleGetSyncStatus(c router.Context, _ map[string]any) (int, any, error) {
	connectionID := routeParam(c, "ref", "connection_id", "id")
	if connectionID == "" {
		return 0, nil, validationError("connection id is required", map[string]any{"field": "ref"})
	}
	db := resolveBunDB(m.config.PersistenceClient, m.repositoryFactory)
	if db == nil {
		return 0, nil, providerUnavailableError("persistence client is not configured", nil)
	}
	connection := connectionRecord{}
	if err := db.NewSelect().Model(&connection).Where("id = ?", connectionID).Limit(1).Scan(c.Context()); err != nil {
		if errorsIsNoRows(err) {
			return 0, nil, missingResourceError("connection", map[string]any{"connection_id": connectionID})
		}
		return 0, nil, err
	}

	summary, err := loadConnectionSyncSummary(c.Context(), db, connectionID, connection.LastError)
	if err != nil {
		return 0, nil, err
	}
	return http.StatusOK, map[string]any{
		"connection_id": connectionID,
		"sync_summary":  summary,
	}, nil
}

func (m *Module) handleListRateLimits(c router.Context, _ map[string]any) (int, any, error) {
	db := resolveBunDB(m.config.PersistenceClient, m.repositoryFactory)
	if db == nil {
		return 0, nil, providerUnavailableError("persistence client is not configured", nil)
	}

	page := toInt(c.Query("page"), 1)
	if page <= 0 {
		page = 1
	}
	perPage := toInt(c.Query("per_page"), 25)
	if perPage <= 0 {
		perPage = 25
	}
	offset := (page - 1) * perPage

	filter := rateLimitListFilter{
		ProviderID:   strings.TrimSpace(c.Query("provider_id")),
		ScopeType:    strings.TrimSpace(c.Query("scope_type")),
		ScopeID:      strings.TrimSpace(c.Query("scope_id")),
		BucketKey:    strings.TrimSpace(c.Query("bucket_key")),
		ConnectionID: strings.TrimSpace(firstNonEmpty(c.Query("connection_id"), c.Query("connection_ref"), c.Query("ref"))),
	}
	if filter.ConnectionID != "" && (filter.ProviderID == "" || filter.ScopeType == "" || filter.ScopeID == "") {
		connection := connectionRecord{}
		err := db.NewSelect().Model(&connection).Where("id = ?", filter.ConnectionID).Limit(1).Scan(c.Context())
		if err != nil && !errorsIsNoRows(err) {
			return 0, nil, err
		}
		if err == nil {
			if filter.ProviderID == "" {
				filter.ProviderID = strings.TrimSpace(connection.ProviderID)
			}
			if filter.ScopeType == "" {
				filter.ScopeType = strings.TrimSpace(connection.ScopeType)
			}
			if filter.ScopeID == "" {
				filter.ScopeID = strings.TrimSpace(connection.ScopeID)
			}
		}
	}

	rows := []rateLimitStateRecord{}
	query := db.NewSelect().Model(&rows).Order("updated_at DESC").Limit(perPage).Offset(offset)
	countQuery := db.NewSelect().Table("service_rate_limit_state")
	query = applyRateLimitFilterQuery(query, filter)
	countQuery = applyRateLimitFilterQuery(countQuery, filter)

	if err := query.Scan(c.Context()); err != nil && !errorsIsNoRows(err) {
		return 0, nil, err
	}
	total, err := countQuery.Count(c.Context())
	if err != nil {
		return 0, nil, err
	}

	items := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		items = append(items, row.toMap())
	}
	summary := summarizeRateLimitRows(rows)
	response := newListResponse(items, total, perPage, offset, filter.toMap())
	response["rate_limits"] = items
	response["summary"] = summary
	return http.StatusOK, response, nil
}

func (m *Module) handleListRateLimitsRuntime(c router.Context, _ map[string]any) (int, any, error) {
	db := resolveBunDB(m.config.PersistenceClient, m.repositoryFactory)
	if db == nil {
		return 0, nil, providerUnavailableError("persistence client is not configured", nil)
	}

	page := toInt(c.Query("page"), 1)
	if page <= 0 {
		page = 1
	}
	perPage := toInt(c.Query("per_page"), 25)
	if perPage <= 0 {
		perPage = 25
	}
	offset := (page - 1) * perPage

	filter := rateLimitListFilter{
		ProviderID:   strings.TrimSpace(c.Query("provider_id")),
		ScopeType:    strings.TrimSpace(c.Query("scope_type")),
		ScopeID:      strings.TrimSpace(c.Query("scope_id")),
		BucketKey:    strings.TrimSpace(c.Query("bucket_key")),
		ConnectionID: strings.TrimSpace(firstNonEmpty(c.Query("connection_id"), c.Query("connection_ref"), c.Query("ref"))),
	}
	if filter.ConnectionID != "" && (filter.ProviderID == "" || filter.ScopeType == "" || filter.ScopeID == "") {
		connection := connectionRecord{}
		err := db.NewSelect().Model(&connection).Where("id = ?", filter.ConnectionID).Limit(1).Scan(c.Context())
		if err != nil && !errorsIsNoRows(err) {
			return 0, nil, err
		}
		if err == nil {
			if filter.ProviderID == "" {
				filter.ProviderID = strings.TrimSpace(connection.ProviderID)
			}
			if filter.ScopeType == "" {
				filter.ScopeType = strings.TrimSpace(connection.ScopeType)
			}
			if filter.ScopeID == "" {
				filter.ScopeID = strings.TrimSpace(connection.ScopeID)
			}
		}
	}

	rows := []rateLimitStateRecord{}
	query := db.NewSelect().Model(&rows).Order("updated_at DESC").Limit(perPage).Offset(offset)
	countQuery := db.NewSelect().Table("service_rate_limit_state")
	query = applyRateLimitFilterQuery(query, filter)
	countQuery = applyRateLimitFilterQuery(countQuery, filter)

	if err := query.Scan(c.Context()); err != nil && !errorsIsNoRows(err) {
		return 0, nil, err
	}
	total, err := countQuery.Count(c.Context())
	if err != nil {
		return 0, nil, err
	}

	stateStore := resolveRateLimitStateStore(m.repositoryFactory)
	items := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		item := row.toMap()
		key := gocore.RateLimitKey{
			ProviderID: strings.TrimSpace(row.ProviderID),
			ScopeType:  strings.TrimSpace(row.ScopeType),
			ScopeID:    strings.TrimSpace(row.ScopeID),
			BucketKey:  strings.TrimSpace(row.BucketKey),
		}
		item["runtime"] = map[string]any{}
		if stateStore != nil {
			state, stateErr := stateStore.Get(c.Context(), key)
			if stateErr == nil {
				item["runtime"] = map[string]any{
					"last_status":     state.LastStatus,
					"attempts":        state.Attempts,
					"throttled_until": state.ThrottledUntil,
					"updated_at":      state.UpdatedAt,
					"metadata":        copyAnyMap(state.Metadata),
				}
			}
		}
		items = append(items, item)
	}

	summary := summarizeRateLimitRows(rows)
	response := newListResponse(items, total, perPage, offset, filter.toMap())
	response["rate_limits"] = items
	response["summary"] = summary
	return http.StatusOK, response, nil
}

func (m *Module) handleListProviderOperationStatus(c router.Context, _ map[string]any) (int, any, error) {
	db := resolveBunDB(m.config.PersistenceClient, m.repositoryFactory)
	if db == nil {
		return 0, nil, providerUnavailableError("persistence client is not configured", nil)
	}
	page := toInt(c.Query("page"), 1)
	if page <= 0 {
		page = 1
	}
	perPage := toInt(c.Query("per_page"), 25)
	if perPage <= 0 {
		perPage = 25
	}
	offset := (page - 1) * perPage

	rows := []connectionRecord{}
	query := db.NewSelect().Model(&rows).Order("updated_at DESC").Limit(perPage).Offset(offset)
	countQuery := db.NewSelect().Table("service_connections")
	if providerID := strings.TrimSpace(c.Query("provider_id")); providerID != "" {
		query = query.Where("provider_id = ?", providerID)
		countQuery = countQuery.Where("provider_id = ?", providerID)
	}
	if scopeType := strings.TrimSpace(c.Query("scope_type")); scopeType != "" {
		query = query.Where("scope_type = ?", scopeType)
		countQuery = countQuery.Where("scope_type = ?", scopeType)
	}
	if scopeID := strings.TrimSpace(c.Query("scope_id")); scopeID != "" {
		query = query.Where("scope_id = ?", scopeID)
		countQuery = countQuery.Where("scope_id = ?", scopeID)
	}
	if connectionID := strings.TrimSpace(firstNonEmpty(c.Query("connection_id"), c.Query("ref"))); connectionID != "" {
		query = query.Where("id = ?", connectionID)
		countQuery = countQuery.Where("id = ?", connectionID)
	}
	if err := query.Scan(c.Context()); err != nil && !errorsIsNoRows(err) {
		return 0, nil, err
	}
	total, err := countQuery.Count(c.Context())
	if err != nil {
		return 0, nil, err
	}

	now := time.Now().UTC()
	items := make([]map[string]any, 0, len(rows))
	for _, connection := range rows {
		status := map[string]any{
			"connection_id":         strings.TrimSpace(connection.ID),
			"provider_id":           strings.TrimSpace(connection.ProviderID),
			"scope_type":            strings.TrimSpace(connection.ScopeType),
			"scope_id":              strings.TrimSpace(connection.ScopeID),
			"last_operation_status": strings.TrimSpace(connection.Status),
			"last_operation_error":  strings.TrimSpace(connection.LastError),
			"operation_source":      "connection",
			"next_retry_at":         nil,
			"retry_backoff_seconds": 0,
		}

		outbox := lifecycleOutboxStatusRecord{}
		outboxErr := db.NewSelect().
			Model(&outbox).
			Where("connection_id = ?", connection.ID).
			Order("updated_at DESC").
			Limit(1).
			Scan(c.Context())
		if outboxErr != nil && !errorsIsNoRows(outboxErr) {
			return 0, nil, outboxErr
		}

		syncJob := syncJobStatusRecord{}
		syncErr := db.NewSelect().
			Model(&syncJob).
			Where("connection_id = ?", connection.ID).
			Order("updated_at DESC").
			Limit(1).
			Scan(c.Context())
		if syncErr != nil && !errorsIsNoRows(syncErr) {
			return 0, nil, syncErr
		}

		pickOutbox := outboxErr == nil
		if syncErr == nil && (!pickOutbox || syncJob.UpdatedAt.After(outbox.UpdatedAt)) {
			pickOutbox = false
		}
		if pickOutbox {
			status["operation_source"] = "lifecycle_outbox"
			status["last_operation_status"] = strings.TrimSpace(outbox.Status)
			status["last_operation_name"] = strings.TrimSpace(outbox.EventName)
			status["attempts"] = outbox.Attempts
			if strings.TrimSpace(outbox.LastError) != "" {
				status["last_operation_error"] = strings.TrimSpace(outbox.LastError)
			}
			status["next_retry_at"] = outbox.NextAttemptAt
		} else if syncErr == nil {
			status["operation_source"] = "sync_job"
			status["last_operation_status"] = strings.TrimSpace(syncJob.Status)
			status["last_operation_name"] = strings.TrimSpace(syncJob.Mode)
			status["attempts"] = syncJob.Attempts
			status["next_retry_at"] = syncJob.NextAttempt
		}

		nextRetryAt, _ := status["next_retry_at"].(*time.Time)
		if nextRetryAt != nil {
			backoff := int(nextRetryAt.UTC().Sub(now).Seconds())
			if backoff < 0 {
				backoff = 0
			}
			status["retry_backoff_seconds"] = backoff
		}
		items = append(items, status)
	}

	response := newListResponse(items, total, perPage, offset, map[string]any{
		"provider_id":   strings.TrimSpace(c.Query("provider_id")),
		"scope_type":    strings.TrimSpace(c.Query("scope_type")),
		"scope_id":      strings.TrimSpace(c.Query("scope_id")),
		"connection_id": strings.TrimSpace(firstNonEmpty(c.Query("connection_id"), c.Query("ref"))),
	})
	response["operation_statuses"] = items
	return http.StatusOK, response, nil
}

func (m *Module) handleProviderInbound(c router.Context, body map[string]any) (int, any, error) {
	providerID := strings.TrimSpace(c.Param("provider", ""))
	surface := strings.TrimSpace(c.Param("surface", ""))
	if providerID == "" || surface == "" {
		return 0, nil, validationError("provider and surface are required", map[string]any{"field": "provider/surface"})
	}
	if m.inboundDispatcher == nil {
		return 0, nil, providerUnavailableError("inbound dispatcher is not configured", nil)
	}
	request := gocore.InboundRequest{
		ProviderID: providerID,
		Surface:    strings.ToLower(surface),
		Headers:    collectInboundHeaders(c),
		Body:       append([]byte(nil), c.Body()...),
		Metadata:   mergeMetadata(queryToMetadata(c), extractMetadata(body)),
	}
	result, err := m.inboundDispatcher.Dispatch(c.Context(), request)
	if err != nil {
		if result.StatusCode == http.StatusUnauthorized {
			return 0, nil, goerrorsUnauthorized(err)
		}
		return 0, nil, err
	}
	status := result.StatusCode
	if status <= 0 {
		status = http.StatusAccepted
	}
	return status, map[string]any{"result": result}, nil
}

func parseActivityFilter(c router.Context) (gocore.ServicesActivityFilter, error) {
	from, err := toTime(c.Query("from"))
	if err != nil {
		return gocore.ServicesActivityFilter{}, validationError("from must be RFC3339", map[string]any{"field": "from"})
	}
	to, err := toTime(c.Query("to"))
	if err != nil {
		return gocore.ServicesActivityFilter{}, validationError("to must be RFC3339", map[string]any{"field": "to"})
	}
	page := toInt(c.Query("page"), 1)
	if page <= 0 {
		page = 1
	}
	perPage := toInt(c.Query("per_page"), 25)
	if perPage <= 0 {
		perPage = 25
	}
	return gocore.ServicesActivityFilter{
		ProviderID:  strings.TrimSpace(c.Query("provider_id")),
		ScopeType:   strings.TrimSpace(c.Query("scope_type")),
		ScopeID:     strings.TrimSpace(c.Query("scope_id")),
		Action:      strings.TrimSpace(c.Query("action")),
		Status:      gocore.ServiceActivityStatus(strings.TrimSpace(c.Query("status"))),
		From:        from,
		To:          to,
		Page:        page,
		PerPage:     perPage,
		Connections: toStringSlice(c.Query("connections")),
	}, nil
}

func resolveScope(ctx context.Context, c router.Context, payload map[string]any) (gocore.ScopeRef, error) {
	scopeType := strings.ToLower(strings.TrimSpace(firstNonEmpty(toString(payload["scope_type"]), c.Query("scope_type"))))
	scopeID := strings.TrimSpace(firstNonEmpty(toString(payload["scope_id"]), c.Query("scope_id")))

	if scopeType != "" && scopeID != "" {
		scope := gocore.ScopeRef{Type: scopeType, ID: scopeID}
		if err := scope.Validate(); err != nil {
			return gocore.ScopeRef{}, validationError("invalid scope", map[string]any{"field": "scope"})
		}
		return scope, nil
	}

	actor, ok := auth.ActorFromContext(ctx)
	if !ok || actor == nil {
		return gocore.ScopeRef{}, validationError("scope is required", map[string]any{"field": "scope"})
	}
	if scopeType == "org" {
		candidate := strings.TrimSpace(firstNonEmpty(scopeID, actor.OrganizationID, toString(payload["org_id"]), c.Query("org_id")))
		if candidate == "" {
			return gocore.ScopeRef{}, validationError("scope_id is required for org scope", map[string]any{"field": "scope_id"})
		}
		return gocore.ScopeRef{Type: "org", ID: candidate}, nil
	}
	userID := strings.TrimSpace(firstNonEmpty(actor.ActorID, actor.Subject, toString(payload["user_id"]), c.Query("user_id")))
	if userID == "" {
		return gocore.ScopeRef{}, validationError("scope_id is required for user scope", map[string]any{"field": "scope_id"})
	}
	return gocore.ScopeRef{Type: "user", ID: userID}, nil
}

func extractMetadata(body map[string]any) map[string]any {
	if body == nil {
		return map[string]any{}
	}
	metadata := map[string]any{}
	if rawMeta, ok := body["metadata"].(map[string]any); ok {
		for key, value := range rawMeta {
			metadata[key] = value
		}
	}
	return metadata
}

func extractMap(value any) map[string]any {
	if value == nil {
		return map[string]any{}
	}
	if typed, ok := value.(map[string]any); ok {
		return copyAnyMap(typed)
	}
	return map[string]any{}
}

func queryToMetadata(c router.Context) map[string]any {
	metadata := map[string]any{}
	for key, value := range c.Queries() {
		metadata[key] = value
	}
	return metadata
}

func mergeMetadata(left map[string]any, right map[string]any) map[string]any {
	merged := map[string]any{}
	for key, value := range left {
		merged[key] = value
	}
	for key, value := range right {
		merged[key] = value
	}
	return merged
}

func collectInboundHeaders(c router.Context) map[string]string {
	keys := []string{
		"Content-Type",
		"Idempotency-Key",
		"X-Idempotency-Key",
		"X-Delivery-ID",
		"X-Message-ID",
		"X-GitHub-Delivery",
		"X-Goog-Message-Number",
		"X-Goog-Channel-Id",
		"X-Goog-Channel-Token",
		"X-Signature",
		"X-Signature-256",
		"Authorization",
	}
	headers := map[string]string{}
	for _, key := range keys {
		if value := strings.TrimSpace(c.Header(key)); value != "" {
			headers[key] = value
		}
	}
	return headers
}

func idempotencyScopeKey(c router.Context, idempotencyKey string) string {
	actorID := actorIDFromContext(c.Context())
	if actorID == "" {
		actorID = strings.TrimSpace(c.Header("X-User-ID"))
	}
	if actorID == "" {
		actorID = "anonymous"
	}
	parts := []string{
		strings.TrimSpace(c.Method()),
		strings.TrimSpace(c.Path()),
		actorID,
		strings.TrimSpace(idempotencyKey),
	}
	return strings.Join(parts, "|")
}

func actorIDFromContext(ctx context.Context) string {
	if actor, ok := auth.ActorFromContext(ctx); ok && actor != nil {
		if strings.TrimSpace(actor.ActorID) != "" {
			return strings.TrimSpace(actor.ActorID)
		}
		if strings.TrimSpace(actor.Subject) != "" {
			return strings.TrimSpace(actor.Subject)
		}
	}
	return ""
}

func hashPayload(payload []byte) string {
	sum := sha256.Sum256(payload)
	return hex.EncodeToString(sum[:])
}

type rateLimitStateStore interface {
	Get(ctx context.Context, key gocore.RateLimitKey) (servicesratelimit.State, error)
}

func resolveRateLimitStateStore(factory any) rateLimitStateStore {
	if factory == nil {
		return nil
	}
	if typed, ok := factory.(rateLimitStateStore); ok {
		return typed
	}
	factoryValue := reflect.ValueOf(factory)
	if !factoryValue.IsValid() {
		return nil
	}
	method := factoryValue.MethodByName("RateLimitStateStore")
	if !method.IsValid() || method.Type().NumIn() != 0 || method.Type().NumOut() != 1 {
		return nil
	}
	results, ok := safeReflectMethodCall(method)
	if !ok || len(results) != 1 {
		return nil
	}
	candidate := results[0]
	if !candidate.IsValid() {
		return nil
	}
	if candidate.Kind() == reflect.Ptr && candidate.IsNil() {
		return nil
	}
	typed, ok := candidate.Interface().(rateLimitStateStore)
	if !ok {
		return nil
	}
	return typed
}

func safeReflectMethodCall(method reflect.Value) (_ []reflect.Value, ok bool) {
	defer func() {
		if recover() != nil {
			ok = false
		}
	}()
	return method.Call(nil), true
}

func paginateMaps(items []map[string]any, limit int, offset int) []map[string]any {
	if len(items) == 0 {
		return []map[string]any{}
	}
	if limit <= 0 {
		limit = len(items)
	}
	if offset < 0 {
		offset = 0
	}
	if offset >= len(items) {
		return []map[string]any{}
	}
	end := offset + limit
	if end > len(items) {
		end = len(items)
	}
	out := make([]map[string]any, 0, end-offset)
	for _, item := range items[offset:end] {
		out = append(out, copyAnyMap(item))
	}
	return out
}

func goerrorsMissingPermissions(result gocore.CapabilityResult) error {
	details := copyAnyMap(result.Metadata)
	details["missing_grants"] = toStringSlice(result.Metadata["missing_grants"])
	return missingPermissionsError("required grants are missing", details)
}

func loadConnectionCredentialHealth(
	ctx context.Context,
	db *bun.DB,
	connectionID string,
	lastError string,
) (map[string]any, error) {
	health := map[string]any{
		"has_active_credential":   false,
		"expires_at":              nil,
		"last_refresh_at":         nil,
		"next_refresh_attempt_at": nil,
		"last_error":              strings.TrimSpace(lastError),
	}
	if db == nil {
		return health, nil
	}

	credential := credentialHealthRecord{}
	err := db.NewSelect().
		Model(&credential).
		Where("connection_id = ?", strings.TrimSpace(connectionID)).
		Where("status = ?", "active").
		Order("version DESC").
		Limit(1).
		Scan(ctx)
	if err != nil && !errorsIsNoRows(err) {
		return nil, err
	}
	if err == nil {
		health["has_active_credential"] = true
		health["expires_at"] = credential.ExpiresAt
		health["refreshable"] = credential.Refreshable
		health["last_refresh_at"] = ptrTime(credential.UpdatedAt)
	}

	nextAttempt := outboxNextAttemptRecord{}
	err = db.NewSelect().
		Model(&nextAttempt).
		Column("next_attempt_at").
		Where("connection_id = ?", strings.TrimSpace(connectionID)).
		Where("next_attempt_at IS NOT NULL").
		Where("status IN (?)", bun.In([]string{"pending", "processing"})).
		Order("next_attempt_at ASC").
		Limit(1).
		Scan(ctx)
	if err != nil && !errorsIsNoRows(err) {
		return nil, err
	}
	if err == nil {
		health["next_refresh_attempt_at"] = nextAttempt.NextAttemptAt
	}

	return health, nil
}

func (m *Module) loadConnectionGrantSummary(ctx context.Context, connectionID string, providerID string) (map[string]any, error) {
	summary := map[string]any{
		"snapshot_found":   false,
		"version":          0,
		"captured_at":      nil,
		"requested_grants": []string{},
		"granted_grants":   []string{},
		"required_grants":  []string{},
		"missing_grants":   []string{},
	}
	if m == nil || m.service == nil {
		return summary, nil
	}
	grantStore := m.service.Dependencies().GrantStore
	if grantStore == nil {
		return summary, nil
	}

	requiredGrants := m.resolveProviderRequiredGrants(providerID)
	summary["required_grants"] = requiredGrants

	snapshot, found, err := grantStore.GetLatestSnapshot(ctx, strings.TrimSpace(connectionID))
	if err != nil {
		return nil, err
	}
	if !found {
		return summary, nil
	}
	requested := normalizeStringList(snapshot.Requested)
	granted := normalizeStringList(snapshot.Granted)
	missing := diffStringLists(requiredGrants, granted)

	summary["snapshot_found"] = true
	summary["version"] = snapshot.Version
	summary["captured_at"] = snapshot.CapturedAt.UTC()
	summary["requested_grants"] = requested
	summary["granted_grants"] = granted
	summary["missing_grants"] = missing
	return summary, nil
}

func (m *Module) resolveProviderRequiredGrants(providerID string) []string {
	if m == nil || m.service == nil {
		return []string{}
	}
	registry := m.service.Dependencies().Registry
	if registry == nil {
		return []string{}
	}
	provider, ok := registry.Get(strings.TrimSpace(providerID))
	if !ok || provider == nil {
		return []string{}
	}
	required := map[string]bool{}
	for _, capability := range provider.Capabilities() {
		for _, grant := range capability.RequiredGrants {
			if trimmed := strings.TrimSpace(grant); trimmed != "" {
				required[trimmed] = true
			}
		}
	}
	out := make([]string, 0, len(required))
	for grant := range required {
		out = append(out, grant)
	}
	sort.Strings(out)
	return out
}

func diffStringLists(expected []string, actual []string) []string {
	if len(expected) == 0 {
		return []string{}
	}
	actualSet := map[string]bool{}
	for _, value := range actual {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			actualSet[trimmed] = true
		}
	}
	out := make([]string, 0, len(expected))
	for _, value := range expected {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" || actualSet[trimmed] {
			continue
		}
		out = append(out, trimmed)
	}
	return out
}

func loadConnectionSubscriptionSummary(ctx context.Context, db *bun.DB, connectionID string) (map[string]any, error) {
	summary := map[string]any{
		"total":            0,
		"active":           0,
		"expiring":         0,
		"last_delivery_at": nil,
		"subscriptions":    []map[string]any{},
	}
	if db == nil {
		return summary, nil
	}
	rows := []subscriptionRecord{}
	if err := db.NewSelect().
		Model(&rows).
		Where("connection_id = ?", strings.TrimSpace(connectionID)).
		Order("updated_at DESC").
		Scan(ctx); err != nil && !errorsIsNoRows(err) {
		return nil, err
	}

	items := make([]map[string]any, 0, len(rows))
	active := 0
	expiring := 0
	var lastDeliveryAt *time.Time
	now := time.Now().UTC()
	for _, row := range rows {
		items = append(items, row.toMap())
		if strings.EqualFold(strings.TrimSpace(row.Status), string(gocore.SubscriptionStatusActive)) {
			active++
		}
		if row.ExpiresAt != nil && row.ExpiresAt.After(now) && row.ExpiresAt.Before(now.Add(24*time.Hour)) {
			expiring++
		}
		if row.LastNotifiedAt != nil {
			if lastDeliveryAt == nil || row.LastNotifiedAt.After(*lastDeliveryAt) {
				value := row.LastNotifiedAt.UTC()
				lastDeliveryAt = &value
			}
		}
	}

	summary["total"] = len(items)
	summary["active"] = active
	summary["expiring"] = expiring
	summary["last_delivery_at"] = lastDeliveryAt
	summary["subscriptions"] = items
	return summary, nil
}

func loadConnectionSyncSummary(ctx context.Context, db *bun.DB, connectionID string, lastError string) (map[string]any, error) {
	summary := map[string]any{
		"cursor_count":    0,
		"last_cursor":     "",
		"last_synced_at":  nil,
		"last_sync_error": strings.TrimSpace(lastError),
		"cursors":         []map[string]any{},
		"last_job":        nil,
	}
	if db == nil {
		return summary, nil
	}

	cursors := []syncCursorRecord{}
	if err := db.NewSelect().
		Model(&cursors).
		Where("connection_id = ?", strings.TrimSpace(connectionID)).
		Order("updated_at DESC").
		Scan(ctx); err != nil && !errorsIsNoRows(err) {
		return nil, err
	}
	cursorItems := make([]map[string]any, 0, len(cursors))
	var lastSyncedAt *time.Time
	for _, row := range cursors {
		cursorItems = append(cursorItems, row.toMap())
		if row.LastSyncedAt != nil {
			if lastSyncedAt == nil || row.LastSyncedAt.After(*lastSyncedAt) {
				value := row.LastSyncedAt.UTC()
				lastSyncedAt = &value
			}
		}
	}
	if len(cursors) > 0 {
		summary["last_cursor"] = strings.TrimSpace(cursors[0].Cursor)
	}
	summary["cursor_count"] = len(cursorItems)
	summary["last_synced_at"] = lastSyncedAt
	summary["cursors"] = cursorItems

	lastJob := syncJobStatusRecord{}
	err := db.NewSelect().
		Model(&lastJob).
		Where("connection_id = ?", strings.TrimSpace(connectionID)).
		Order("updated_at DESC").
		Limit(1).
		Scan(ctx)
	if err != nil && !errorsIsNoRows(err) {
		return nil, err
	}
	if err == nil {
		summary["last_job"] = lastJob.toMap()
		if strings.TrimSpace(lastError) == "" && strings.EqualFold(strings.TrimSpace(lastJob.Status), "failed") {
			summary["last_sync_error"] = "sync_job_failed"
		}
	}
	return summary, nil
}

func loadConnectionRateLimitSummary(ctx context.Context, db *bun.DB, connection connectionRecord) (map[string]any, error) {
	summary := map[string]any{
		"bucket_count":      0,
		"total_limit":       0,
		"total_remaining":   0,
		"next_reset_at":     nil,
		"max_retry_after":   0,
		"retry_after_trend": []map[string]any{},
	}
	if db == nil {
		return summary, nil
	}

	rows := []rateLimitStateRecord{}
	if err := db.NewSelect().
		Model(&rows).
		Where("provider_id = ?", strings.TrimSpace(connection.ProviderID)).
		Where("scope_type = ?", strings.TrimSpace(connection.ScopeType)).
		Where("scope_id = ?", strings.TrimSpace(connection.ScopeID)).
		Order("updated_at DESC").
		Scan(ctx); err != nil && !errorsIsNoRows(err) {
		return nil, err
	}

	rowSummary := summarizeRateLimitRows(rows)
	rowSummary["bucket_count"] = len(rows)
	rowSummary["provider_id"] = strings.TrimSpace(connection.ProviderID)
	rowSummary["scope_type"] = strings.TrimSpace(connection.ScopeType)
	rowSummary["scope_id"] = strings.TrimSpace(connection.ScopeID)
	rowSummary["retry_after_trend"] = buildRetryAfterTrend(rows)
	rowSummary["buckets"] = rowSummary["items"]
	delete(rowSummary, "items")
	return rowSummary, nil
}

func summarizeRateLimitRows(rows []rateLimitStateRecord) map[string]any {
	summary := map[string]any{
		"items":           []map[string]any{},
		"total_limit":     0,
		"total_remaining": 0,
		"next_reset_at":   nil,
		"max_retry_after": 0,
	}
	if len(rows) == 0 {
		return summary
	}
	items := make([]map[string]any, 0, len(rows))
	totalLimit := 0
	totalRemaining := 0
	maxRetryAfter := 0
	var nextResetAt *time.Time
	for _, row := range rows {
		items = append(items, row.toMap())
		totalLimit += row.Limit
		totalRemaining += row.Remaining
		if row.RetryAfter > maxRetryAfter {
			maxRetryAfter = row.RetryAfter
		}
		if row.ResetAt != nil {
			if nextResetAt == nil || row.ResetAt.Before(*nextResetAt) {
				value := row.ResetAt.UTC()
				nextResetAt = &value
			}
		}
	}
	summary["items"] = items
	summary["total_limit"] = totalLimit
	summary["total_remaining"] = totalRemaining
	summary["next_reset_at"] = nextResetAt
	summary["max_retry_after"] = maxRetryAfter
	return summary
}

func buildRetryAfterTrend(rows []rateLimitStateRecord) []map[string]any {
	if len(rows) == 0 {
		return []map[string]any{}
	}
	out := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		out = append(out, map[string]any{
			"bucket_key":  strings.TrimSpace(row.BucketKey),
			"retry_after": row.RetryAfter,
			"remaining":   row.Remaining,
			"observed_at": row.UpdatedAt.UTC(),
			"provider_id": strings.TrimSpace(row.ProviderID),
			"scope_type":  strings.TrimSpace(row.ScopeType),
			"scope_id":    strings.TrimSpace(row.ScopeID),
		})
	}
	return out
}

type rateLimitListFilter struct {
	ProviderID   string
	ScopeType    string
	ScopeID      string
	BucketKey    string
	ConnectionID string
}

func (f rateLimitListFilter) toMap() map[string]any {
	return map[string]any{
		"provider_id":   f.ProviderID,
		"scope_type":    f.ScopeType,
		"scope_id":      f.ScopeID,
		"bucket_key":    f.BucketKey,
		"connection_id": f.ConnectionID,
	}
}

func applyRateLimitFilterQuery(query *bun.SelectQuery, filter rateLimitListFilter) *bun.SelectQuery {
	if providerID := strings.TrimSpace(filter.ProviderID); providerID != "" {
		query = query.Where("provider_id = ?", providerID)
	}
	if scopeType := strings.TrimSpace(filter.ScopeType); scopeType != "" {
		query = query.Where("scope_type = ?", scopeType)
	}
	if scopeID := strings.TrimSpace(filter.ScopeID); scopeID != "" {
		query = query.Where("scope_id = ?", scopeID)
	}
	if bucketKey := strings.TrimSpace(filter.BucketKey); bucketKey != "" {
		query = query.Where("bucket_key = ?", bucketKey)
	}
	return query
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func routeParam(c router.Context, names ...string) string {
	for _, name := range names {
		if value := strings.TrimSpace(c.Param(name, "")); value != "" {
			return value
		}
	}
	return ""
}

func newListResponse(items []map[string]any, total int, limit int, offset int, filter map[string]any) map[string]any {
	if total < 0 {
		total = 0
	}
	if limit < 0 {
		limit = 0
	}
	if offset < 0 {
		offset = 0
	}
	page := 1
	if limit > 0 {
		page = (offset / limit) + 1
	}
	nextOffset := offset + len(items)
	hasMore := nextOffset < total
	return map[string]any{
		"items":          items,
		"total":          total,
		"limit":          limit,
		"offset":         offset,
		"page":           page,
		"per_page":       limit,
		"has_more":       hasMore,
		"has_next":       hasMore,
		"next_offset":    nextOffset,
		"filter_applied": compactFilterMap(filter),
	}
}

func compactFilterMap(input map[string]any) map[string]any {
	if len(input) == 0 {
		return map[string]any{}
	}
	out := map[string]any{}
	for key, value := range input {
		switch typed := value.(type) {
		case string:
			trimmed := strings.TrimSpace(typed)
			if trimmed == "" {
				continue
			}
			out[key] = trimmed
		case []string:
			values := normalizeStringList(typed)
			if len(values) == 0 {
				continue
			}
			out[key] = values
		case nil:
			continue
		default:
			out[key] = value
		}
	}
	return out
}

func ptrTime(value time.Time) *time.Time {
	if value.IsZero() {
		return nil
	}
	out := value.UTC()
	return &out
}

func (m *Module) lookupConnectionProvider(ctx context.Context, connectionID string) string {
	db := resolveBunDB(m.config.PersistenceClient, m.repositoryFactory)
	if db == nil {
		return ""
	}
	record := connectionRecord{}
	if err := db.NewSelect().Model(&record).Where("id = ?", strings.TrimSpace(connectionID)).Limit(1).Scan(ctx); err != nil {
		return ""
	}
	return strings.TrimSpace(record.ProviderID)
}

func errorsIsNoRows(err error) bool {
	return err == sql.ErrNoRows || strings.Contains(strings.ToLower(err.Error()), "no rows")
}

type installationRecord struct {
	bun.BaseModel `bun:"table:service_installations,alias:si"`

	ID          string         `bun:"id,pk"`
	ProviderID  string         `bun:"provider_id"`
	ScopeType   string         `bun:"scope_type"`
	ScopeID     string         `bun:"scope_id"`
	InstallType string         `bun:"install_type"`
	Status      string         `bun:"status"`
	GrantedAt   *time.Time     `bun:"granted_at"`
	RevokedAt   *time.Time     `bun:"revoked_at"`
	Metadata    map[string]any `bun:"metadata,type:jsonb"`
	CreatedAt   time.Time      `bun:"created_at"`
	UpdatedAt   time.Time      `bun:"updated_at"`
}

func (r installationRecord) toMap() map[string]any {
	return map[string]any{
		"id":           r.ID,
		"provider_id":  r.ProviderID,
		"scope_type":   r.ScopeType,
		"scope_id":     r.ScopeID,
		"install_type": r.InstallType,
		"status":       r.Status,
		"granted_at":   r.GrantedAt,
		"revoked_at":   r.RevokedAt,
		"metadata":     copyAnyMap(r.Metadata),
		"created_at":   r.CreatedAt,
		"updated_at":   r.UpdatedAt,
	}
}

func installationToMap(installation gocore.Installation) map[string]any {
	return map[string]any{
		"id":           strings.TrimSpace(installation.ID),
		"provider_id":  strings.TrimSpace(installation.ProviderID),
		"scope_type":   strings.TrimSpace(installation.ScopeType),
		"scope_id":     strings.TrimSpace(installation.ScopeID),
		"install_type": strings.TrimSpace(installation.InstallType),
		"status":       strings.TrimSpace(string(installation.Status)),
		"granted_at":   installation.GrantedAt,
		"revoked_at":   installation.RevokedAt,
		"metadata":     copyAnyMap(installation.Metadata),
		"created_at":   installation.CreatedAt,
		"updated_at":   installation.UpdatedAt,
	}
}

type connectionRecord struct {
	bun.BaseModel `bun:"table:service_connections,alias:sc"`

	ID                string    `bun:"id,pk"`
	ProviderID        string    `bun:"provider_id"`
	ScopeType         string    `bun:"scope_type"`
	ScopeID           string    `bun:"scope_id"`
	ExternalAccountID string    `bun:"external_account_id"`
	Status            string    `bun:"status"`
	LastError         string    `bun:"last_error"`
	CreatedAt         time.Time `bun:"created_at"`
	UpdatedAt         time.Time `bun:"updated_at"`
}

type credentialHealthRecord struct {
	bun.BaseModel `bun:"table:service_credentials,alias:scr"`

	ExpiresAt   *time.Time `bun:"expires_at"`
	UpdatedAt   time.Time  `bun:"updated_at"`
	Refreshable bool       `bun:"refreshable"`
}

type outboxNextAttemptRecord struct {
	bun.BaseModel `bun:"table:service_lifecycle_outbox,alias:slo"`

	NextAttemptAt *time.Time `bun:"next_attempt_at"`
}

func (r connectionRecord) toMap() map[string]any {
	return map[string]any{
		"id":                  r.ID,
		"provider_id":         r.ProviderID,
		"scope_type":          r.ScopeType,
		"scope_id":            r.ScopeID,
		"external_account_id": r.ExternalAccountID,
		"status":              r.Status,
		"last_error":          r.LastError,
		"created_at":          r.CreatedAt,
		"updated_at":          r.UpdatedAt,
	}
}

type subscriptionRecord struct {
	bun.BaseModel `bun:"table:service_subscriptions,alias:ss"`

	ID                   string         `bun:"id,pk"`
	ConnectionID         string         `bun:"connection_id"`
	ProviderID           string         `bun:"provider_id"`
	ResourceType         string         `bun:"resource_type"`
	ResourceID           string         `bun:"resource_id"`
	ChannelID            string         `bun:"channel_id"`
	RemoteSubscriptionID string         `bun:"remote_subscription_id"`
	CallbackURL          string         `bun:"callback_url"`
	Status               string         `bun:"status"`
	ExpiresAt            *time.Time     `bun:"expires_at"`
	LastNotifiedAt       *time.Time     `bun:"last_notified_at"`
	Metadata             map[string]any `bun:"metadata,type:jsonb"`
	CreatedAt            time.Time      `bun:"created_at"`
	UpdatedAt            time.Time      `bun:"updated_at"`
}

func (r subscriptionRecord) toMap() map[string]any {
	return map[string]any{
		"id":                     r.ID,
		"connection_id":          r.ConnectionID,
		"provider_id":            r.ProviderID,
		"resource_type":          r.ResourceType,
		"resource_id":            r.ResourceID,
		"channel_id":             r.ChannelID,
		"remote_subscription_id": r.RemoteSubscriptionID,
		"callback_url":           r.CallbackURL,
		"status":                 r.Status,
		"expires_at":             r.ExpiresAt,
		"last_notified_at":       r.LastNotifiedAt,
		"metadata":               copyAnyMap(r.Metadata),
		"created_at":             r.CreatedAt,
		"updated_at":             r.UpdatedAt,
	}
}

type syncCursorRecord struct {
	bun.BaseModel `bun:"table:service_sync_cursors,alias:ssc"`

	ID           string         `bun:"id,pk"`
	ConnectionID string         `bun:"connection_id"`
	ProviderID   string         `bun:"provider_id"`
	ResourceType string         `bun:"resource_type"`
	ResourceID   string         `bun:"resource_id"`
	Cursor       string         `bun:"cursor"`
	Status       string         `bun:"status"`
	LastSyncedAt *time.Time     `bun:"last_synced_at"`
	Metadata     map[string]any `bun:"metadata,type:jsonb"`
	CreatedAt    time.Time      `bun:"created_at"`
	UpdatedAt    time.Time      `bun:"updated_at"`
}

func (r syncCursorRecord) toMap() map[string]any {
	return map[string]any{
		"id":             r.ID,
		"connection_id":  r.ConnectionID,
		"provider_id":    r.ProviderID,
		"resource_type":  r.ResourceType,
		"resource_id":    r.ResourceID,
		"cursor":         r.Cursor,
		"status":         r.Status,
		"last_synced_at": r.LastSyncedAt,
		"metadata":       copyAnyMap(r.Metadata),
		"created_at":     r.CreatedAt,
		"updated_at":     r.UpdatedAt,
	}
}

type syncJobStatusRecord struct {
	bun.BaseModel `bun:"table:service_sync_jobs,alias:ssj"`

	ID           string         `bun:"id,pk"`
	ConnectionID string         `bun:"connection_id"`
	ProviderID   string         `bun:"provider_id"`
	Mode         string         `bun:"mode"`
	Checkpoint   string         `bun:"checkpoint"`
	Status       string         `bun:"status"`
	Attempts     int            `bun:"attempts"`
	NextAttempt  *time.Time     `bun:"next_attempt_at"`
	Metadata     map[string]any `bun:"metadata,type:jsonb"`
	CreatedAt    time.Time      `bun:"created_at"`
	UpdatedAt    time.Time      `bun:"updated_at"`
}

type lifecycleOutboxStatusRecord struct {
	bun.BaseModel `bun:"table:service_lifecycle_outbox,alias:slo"`

	EventName     string     `bun:"event_name"`
	Status        string     `bun:"status"`
	Attempts      int        `bun:"attempts"`
	NextAttemptAt *time.Time `bun:"next_attempt_at"`
	LastError     string     `bun:"last_error"`
	UpdatedAt     time.Time  `bun:"updated_at"`
}

func (r syncJobStatusRecord) toMap() map[string]any {
	return map[string]any{
		"id":              r.ID,
		"connection_id":   r.ConnectionID,
		"provider_id":     r.ProviderID,
		"mode":            r.Mode,
		"checkpoint":      r.Checkpoint,
		"status":          r.Status,
		"attempts":        r.Attempts,
		"next_attempt_at": r.NextAttempt,
		"metadata":        copyAnyMap(r.Metadata),
		"created_at":      r.CreatedAt,
		"updated_at":      r.UpdatedAt,
	}
}

type rateLimitStateRecord struct {
	bun.BaseModel `bun:"table:service_rate_limit_state,alias:sr"`

	ID         string         `bun:"id,pk"`
	ProviderID string         `bun:"provider_id"`
	ScopeType  string         `bun:"scope_type"`
	ScopeID    string         `bun:"scope_id"`
	BucketKey  string         `bun:"bucket_key"`
	Limit      int            `bun:"limit"`
	Remaining  int            `bun:"remaining"`
	ResetAt    *time.Time     `bun:"reset_at"`
	RetryAfter int            `bun:"retry_after"`
	Metadata   map[string]any `bun:"metadata,type:jsonb"`
	CreatedAt  time.Time      `bun:"created_at"`
	UpdatedAt  time.Time      `bun:"updated_at"`
}

func (r rateLimitStateRecord) toMap() map[string]any {
	return map[string]any{
		"id":          r.ID,
		"provider_id": r.ProviderID,
		"scope_type":  r.ScopeType,
		"scope_id":    r.ScopeID,
		"bucket_key":  r.BucketKey,
		"limit":       r.Limit,
		"remaining":   r.Remaining,
		"reset_at":    r.ResetAt,
		"retry_after": r.RetryAfter,
		"metadata":    copyAnyMap(r.Metadata),
		"created_at":  r.CreatedAt,
		"updated_at":  r.UpdatedAt,
	}
}

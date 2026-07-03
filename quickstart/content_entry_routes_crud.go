package quickstart

import (
	"context"
	"net/http"
	"path"
	"strings"
	"time"

	"github.com/goliatone/go-admin/admin"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

func (h *contentEntryHandlers) New(c router.Context) error {
	return h.newForPanel(c, "")
}

func (h *contentEntryHandlers) newForPanel(c router.Context, panelSlug string) error {
	panel, panelName, contentType, adminCtx, err := h.resolvePanelContext(c, panelSlug)
	if err != nil {
		return err
	}
	if contentTypeSchema(contentType, panel) == nil {
		return admin.ErrNotFound
	}
	if guardErr := h.guardPanel(c, panelName, panel, "create"); guardErr != nil {
		return guardErr
	}
	values := map[string]any{
		"locale": defaultLocaleValue("", h.cfg.DefaultLocale),
		"status": "draft",
	}
	return h.renderForm(c, panelName, panel, contentType, adminCtx, values, nil, false, "")
}

func (h *contentEntryHandlers) Create(c router.Context) error {
	return h.createForPanel(c, "")
}

func (h *contentEntryHandlers) createForPanel(c router.Context, panelSlug string) error {
	panel, panelName, contentType, adminCtx, err := h.resolvePanelContext(c, panelSlug)
	if err != nil {
		return err
	}
	schema := contentTypeSchema(contentType, panel)
	if schema == nil {
		return admin.ErrNotFound
	}
	if guardErr := h.guardPanel(c, panelName, panel, "create"); guardErr != nil {
		return guardErr
	}
	record, err := h.parseFormPayload(c, schema)
	if err != nil {
		return err
	}
	if locale := strings.TrimSpace(anyToString(record["locale"])); locale == "" {
		record["locale"] = defaultLocaleValue("", h.cfg.DefaultLocale)
	}
	if status := strings.TrimSpace(anyToString(record["status"])); status == "" {
		record["status"] = "draft"
	}
	created, err := panel.Create(adminCtx, record)
	if err != nil {
		return contentEntryRouteError(panelName, "create record", "", err)
	}
	baseSlug := contentTypeSlug(contentType, panelName)
	routes := newContentEntryRoutes(h.cfg.BasePath, baseSlug, adminCtx.Channel)
	return c.Redirect(contentEntryCreateRedirectTarget(baseSlug, anyToString(created["id"]), routes))
}

func (h *contentEntryHandlers) Edit(c router.Context) error {
	return h.editForPanel(c, "")
}

func (h *contentEntryHandlers) editForPanel(c router.Context, panelSlug string) error {
	panel, panelName, contentType, adminCtx, err := h.resolvePanelContext(c, panelSlug)
	if err != nil {
		return err
	}
	if guardErr := h.guardPanel(c, panelName, panel, "edit"); guardErr != nil {
		return guardErr
	}
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		return admin.ErrNotFound
	}
	record, err := panel.Get(adminCtx, id)
	if err != nil {
		return contentEntryRouteError(panelName, "load record", id, err)
	}
	if h != nil && h.editGuard != nil {
		handled, guardErr := h.editGuard(c, panelName, record)
		if guardErr != nil {
			return guardErr
		}
		if handled {
			return nil
		}
	}
	values := contentEntryValues(record)
	previewURL := h.previewActionURLForRecord(c, panelName, id, record, contentType)
	return h.renderForm(c, panelName, panel, contentType, adminCtx, values, record, true, previewURL)
}

func (h *contentEntryHandlers) Preview(c router.Context) error {
	return h.previewForPanel(c, "")
}

func (h *contentEntryHandlers) previewForPanel(c router.Context, panelSlug string) error {
	panel, panelName, contentType, adminCtx, err := h.resolvePanelContext(c, panelSlug)
	if err != nil {
		return err
	}
	if guardErr := h.guardPanel(c, panelName, panel, "edit"); guardErr != nil {
		return guardErr
	}
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		return admin.ErrNotFound
	}
	record, err := panel.Get(adminCtx, id)
	if err != nil {
		return contentEntryRouteError(panelName, "load record", id, err)
	}
	previewURL, err := h.previewURLForRecord(c.Context(), panelName, id, record, contentType)
	if err != nil {
		return contentEntryRouteError(panelName, "generate preview token", id, err)
	}
	if strings.TrimSpace(previewURL) == "" {
		return admin.ErrNotFound
	}
	return c.Redirect(previewURL)
}

func (h *contentEntryHandlers) Update(c router.Context) error {
	return h.updateForPanel(c, "")
}

func (h *contentEntryHandlers) updateForPanel(c router.Context, panelSlug string) error {
	panel, panelName, contentType, adminCtx, err := h.resolvePanelContext(c, panelSlug)
	if err != nil {
		return err
	}
	if guardErr := h.guardPanel(c, panelName, panel, "edit"); guardErr != nil {
		return guardErr
	}
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		return admin.ErrNotFound
	}
	existingRecord, err := panel.Get(adminCtx, id)
	if err != nil {
		return contentEntryRouteError(panelName, "load existing record", id, err)
	}
	existingTranslationState := contentEntryTranslationStateFromRecord(existingRecord)
	if existingTranslationState.InFallbackMode {
		requestedLocale := strings.TrimSpace(existingTranslationState.RequestedLocale)
		if requestedLocale == "" {
			requestedLocale = contentEntryRequestedLocale(c, "")
		}
		return goerrors.New("cannot save fallback content; create the requested translation first", goerrors.CategoryValidation).
			WithCode(http.StatusConflict).
			WithTextCode(textCodeTranslationFallbackEditBlocked).
			WithMetadata(map[string]any{
				"panel":                    strings.TrimSpace(panelName),
				"id":                       strings.TrimSpace(id),
				"requested_locale":         requestedLocale,
				"resolved_locale":          strings.TrimSpace(existingTranslationState.ResolvedLocale),
				"missing_requested_locale": existingTranslationState.MissingRequestedLocale,
				"fallback_used":            existingTranslationState.FallbackUsed,
			})
	}
	schema := contentTypeSchema(contentType, panel)
	record, err := h.parseFormPayload(c, schema)
	if err != nil {
		return err
	}
	if locale := strings.TrimSpace(anyToString(record["locale"])); locale == "" {
		record["locale"] = defaultLocaleValue("", h.cfg.DefaultLocale)
	}
	uiSchema := contentTypeUISchema(contentType)
	capabilities := contentTypeCapabilities(contentType)
	intentPolicy := contentEntryUpdateIntentPolicy(schema, uiSchema, capabilities, h.updateIntent)
	if len(intentPolicy.Arrays) > 0 {
		if isJSONRequest(c) {
			return goerrors.New("content-entry update intent is not supported for JSON requests", goerrors.CategoryValidation).
				WithCode(http.StatusBadRequest).
				WithTextCode("INVALID_FORM")
		}
		record, err = contentEntryApplyUpdateIntent(record, existingRecord, schema, uiSchema, capabilities, h.updateIntent)
		if err != nil {
			return err
		}
	}
	updated, err := panel.Update(adminCtx, id, record)
	if err != nil {
		return contentEntryRouteError(panelName, "update record", id, err)
	}
	routes := newContentEntryRoutes(h.cfg.BasePath, contentTypeSlug(contentType, panelName), adminCtx.Channel)
	if updatedID := strings.TrimSpace(anyToString(updated["id"])); updatedID != "" {
		target := routes.edit(updatedID)
		if locale := contentEntryRequestedLocale(c, existingTranslationState.RequestedLocale); locale != "" {
			target = appendQueryParam(target, "locale", locale)
		}
		return c.Redirect(target)
	}
	return c.Redirect(routes.index())
}

func (h *contentEntryHandlers) Delete(c router.Context) error {
	return h.deleteForPanel(c, "")
}

func (h *contentEntryHandlers) deleteForPanel(c router.Context, panelSlug string) error {
	panel, panelName, contentType, adminCtx, err := h.resolvePanelContext(c, panelSlug)
	if err != nil {
		return err
	}
	if err := h.guardPanel(c, panelName, panel, "delete"); err != nil {
		return err
	}
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		return admin.ErrNotFound
	}
	if err := panel.Delete(adminCtx, id); err != nil {
		return contentEntryRouteError(panelName, "delete record", id, err)
	}
	routes := newContentEntryRoutes(h.cfg.BasePath, contentTypeSlug(contentType, panelName), adminCtx.Channel)
	return c.Redirect(routes.index())
}

func (h *contentEntryHandlers) previewActionURLForRecord(c router.Context, panelName, id string, record map[string]any, contentType *admin.CMSContentType) string {
	if h == nil || h.admin == nil || h.admin.Preview() == nil || strings.TrimSpace(id) == "" {
		return ""
	}
	targetPath := h.previewTargetPathForRecord(record, contentType)
	if targetPath == "" || h.admin.BuildSitePreviewURL(targetPath, "preview-token-probe") == "" {
		return ""
	}
	slug := contentTypeSlug(contentType, canonicalPanelName(panelName))
	target := joinResolvedPath(resolveAdminContentEntryBasePath(h.adminURLs(), h.cfg.BasePath), path.Join(slug, id, "preview"))
	if channel := resolveContentChannel(c); channel != "" {
		target = appendQueryParam(target, "channel", channel)
	}
	if locale := contentEntryRequestedLocale(c, contentEntryTranslationStateFromRecord(record).RequestedLocale); locale != "" {
		target = appendQueryParam(target, "locale", locale)
	}
	return target
}

func (h *contentEntryHandlers) previewURLForRecord(ctx context.Context, panelName, id string, record map[string]any, contentType *admin.CMSContentType) (string, error) {
	if h == nil || h.admin == nil || strings.TrimSpace(id) == "" {
		return "", nil
	}
	targetPath := h.previewTargetPathForRecord(record, contentType)
	if targetPath == "" {
		return "", nil
	}
	previewSvc := h.admin.Preview()
	if previewSvc == nil {
		return "", nil
	}
	token, err := previewSvc.Generate(strings.TrimSpace(panelName), strings.TrimSpace(id), time.Hour)
	if err != nil {
		return "", err
	}
	return h.admin.BuildSitePreviewURL(targetPath, token), nil
}

func (h *contentEntryHandlers) previewTargetPathForRecord(record map[string]any, contentType *admin.CMSContentType) string {
	return admin.ResolveContentPreviewPathWithOptions(record, admin.ContentPreviewPathOptions{
		AllowSlugFallback: contentTypeAllowsSlugPreviewFallback(contentType),
	})
}

func contentTypeAllowsSlugPreviewFallback(contentType *admin.CMSContentType) bool {
	if contentType == nil {
		return false
	}
	contracts := admin.ReadContentTypeCapabilityContracts(*contentType)
	delivery := contracts.Delivery
	if siteAnyBool(delivery["enabled"]) {
		return true
	}
	routeOwner := strings.ToLower(strings.TrimSpace(admin.ContentTypeCapabilityString(contracts.Normalized, "route_owner")))
	if routeOwner == "" {
		routeOwner = strings.ToLower(strings.TrimSpace(admin.ContentTypeCapabilityString(contentType.Capabilities, "route_owner")))
	}
	return routeOwner != "" && routeOwner != "none"
}

func contentEntryValues(record map[string]any) map[string]any {
	values := map[string]any{}
	if record == nil {
		return values
	}
	for key, val := range record {
		if key == "data" {
			continue
		}
		values[key] = val
	}
	if data, ok := record["data"].(map[string]any); ok {
		for key, val := range data {
			if _, exists := values[key]; exists {
				continue
			}
			values[key] = val
		}
	}
	return values
}

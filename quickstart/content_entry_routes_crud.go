package quickstart

import (
	"context"
	"net/http"
	"net/url"
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
	if err := h.guardPanel(c, panelName, panel, "create"); err != nil {
		return err
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
	if err := h.guardPanel(c, panelName, panel, "create"); err != nil {
		return err
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
		return err
	}
	baseSlug := contentTypeSlug(contentType, panelName)
	routes := newContentEntryRoutes(h.cfg.BasePath, baseSlug, adminCtx.Environment)
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
	if err := h.guardPanel(c, panelName, panel, "edit"); err != nil {
		return err
	}
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		return admin.ErrNotFound
	}
	record, err := panel.Get(adminCtx, id)
	if err != nil {
		return err
	}
	values := contentEntryValues(record)
	previewURL, err := h.previewURLForRecord(c.Context(), panelName, id, record)
	if err != nil {
		return err
	}
	return h.renderForm(c, panelName, panel, contentType, adminCtx, values, record, true, previewURL)
}

func (h *contentEntryHandlers) Update(c router.Context) error {
	return h.updateForPanel(c, "")
}

func (h *contentEntryHandlers) updateForPanel(c router.Context, panelSlug string) error {
	panel, panelName, contentType, adminCtx, err := h.resolvePanelContext(c, panelSlug)
	if err != nil {
		return err
	}
	if err := h.guardPanel(c, panelName, panel, "edit"); err != nil {
		return err
	}
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		return admin.ErrNotFound
	}
	existingRecord, err := panel.Get(adminCtx, id)
	if err != nil {
		return err
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
	record, err := h.parseFormPayload(c, contentTypeSchema(contentType, panel))
	if err != nil {
		return err
	}
	if locale := strings.TrimSpace(anyToString(record["locale"])); locale == "" {
		record["locale"] = defaultLocaleValue("", h.cfg.DefaultLocale)
	}
	updated, err := panel.Update(adminCtx, id, record)
	if err != nil {
		return err
	}
	routes := newContentEntryRoutes(h.cfg.BasePath, contentTypeSlug(contentType, panelName), adminCtx.Environment)
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
		return err
	}
	routes := newContentEntryRoutes(h.cfg.BasePath, contentTypeSlug(contentType, panelName), adminCtx.Environment)
	return c.Redirect(routes.index())
}

func (h *contentEntryHandlers) previewURLForRecord(ctx context.Context, panelName, id string, record map[string]any) (string, error) {
	if h == nil || h.admin == nil || strings.TrimSpace(id) == "" {
		return "", nil
	}
	targetPath := resolveContentEntryPreviewPath(panelName, record)
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
	return buildSitePreviewURL(targetPath, token), nil
}

func resolveContentEntryPreviewPath(panelName string, record map[string]any) string {
	_ = panelName
	if record == nil {
		return ""
	}
	for _, key := range []string{"path", "preview_url"} {
		if resolved := normalizePreviewPath(anyToString(record[key])); resolved != "" {
			return resolved
		}
	}
	if data, ok := record["data"].(map[string]any); ok {
		for _, key := range []string{"path", "preview_url"} {
			if resolved := normalizePreviewPath(anyToString(data[key])); resolved != "" {
				return resolved
			}
		}
	}
	slug := strings.TrimSpace(anyToString(record["slug"]))
	if slug == "" {
		return ""
	}
	return normalizePreviewPath(slug)
}

func normalizePreviewPath(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return ""
	}
	if !strings.HasPrefix(trimmed, "/") {
		return "/" + trimmed
	}
	return trimmed
}

func buildSitePreviewURL(targetPath, token string) string {
	path := strings.TrimSpace(targetPath)
	token = strings.TrimSpace(token)
	if path == "" || token == "" {
		return ""
	}
	separator := "?"
	if strings.Contains(path, "?") {
		separator = "&"
	}
	return path + separator + "preview_token=" + url.QueryEscape(token)
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

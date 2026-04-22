package quickstart

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/goliatone/go-admin/admin"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

func (h *contentTypeBuilderHandlers) PublishContentType(c router.Context) error {
	return h.updateContentTypeStatus(c, "active")
}

func (h *contentTypeBuilderHandlers) DeprecateContentType(c router.Context) error {
	return h.updateContentTypeStatus(c, "deprecated")
}

func (h *contentTypeBuilderHandlers) CloneContentType(c router.Context) error {
	if guardErr := h.guard(c, "edit"); guardErr != nil {
		return guardErr
	}
	panel, err := h.panelFor("content_types")
	if err != nil {
		return err
	}
	req := struct {
		Slug string `json:"slug"`
		Name string `json:"name"`
	}{}
	if parseErr := parseJSONBody(c, &req); parseErr != nil {
		return parseErr
	}
	newSlug := strings.TrimSpace(req.Slug)
	if newSlug == "" {
		return goerrors.New("slug required", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("SLUG_REQUIRED")
	}
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		return goerrors.New("content type id required", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("ID_REQUIRED")
	}
	adminCtx := adminContextFromRequest(h.admin, c, h.cfg.DefaultLocale)
	record, err := panel.Get(adminCtx, id)
	if err != nil {
		return err
	}
	clone := map[string]any{}
	for key, value := range record {
		clone[key] = value
	}
	delete(clone, "id")
	delete(clone, "content_type_id")
	delete(clone, "created_at")
	delete(clone, "updated_at")
	delete(clone, "schema_version")
	clone["slug"] = newSlug
	clone["name"] = strings.TrimSpace(req.Name)
	if clone["name"] == "" {
		clone["name"] = fmt.Sprintf("%s Copy", strings.TrimSpace(anyToString(record["name"])))
	}
	clone["status"] = "draft"
	created, err := panel.Create(adminCtx, clone)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, created)
}

func (h *contentTypeBuilderHandlers) ContentTypeVersions(c router.Context) error {
	if err := h.guard(c, "read"); err != nil {
		return err
	}
	panel, err := h.panelFor("content_types")
	if err != nil {
		return err
	}
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		return goerrors.New("content type id required", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("ID_REQUIRED")
	}
	adminCtx := adminContextFromRequest(h.admin, c, h.cfg.DefaultLocale)
	record, err := panel.Get(adminCtx, id)
	if err != nil {
		return err
	}
	key := contentTypeKey(id, record)
	versions := h.versions.listVersions(key)
	if len(versions) == 0 {
		entry := buildVersionFromRecord(record)
		if entry.Schema != nil {
			h.versions.addVersion(key, entry)
			versions = h.versions.listVersions(key)
		}
	}
	return c.JSON(http.StatusOK, map[string]any{"versions": versions})
}

func (h *contentTypeBuilderHandlers) PublishBlockDefinition(c router.Context) error {
	if guardErr := h.guard(c, "edit"); guardErr != nil {
		return guardErr
	}
	return h.updateBlockDefinitionStatus(c, "active")
}

func (h *contentTypeBuilderHandlers) DeprecateBlockDefinition(c router.Context) error {
	if err := h.guard(c, "edit"); err != nil {
		return err
	}
	return h.updateBlockDefinitionStatus(c, "deprecated")
}

func (h *contentTypeBuilderHandlers) CloneBlockDefinition(c router.Context) error {
	if err := h.guard(c, "edit"); err != nil {
		return err
	}
	panel, err := h.panelFor("block_definitions")
	if err != nil {
		return err
	}
	req := struct {
		Type string `json:"type"`
		Slug string `json:"slug"`
	}{}
	if parseErr := parseJSONBody(c, &req); parseErr != nil {
		return parseErr
	}
	newType := strings.TrimSpace(req.Type)
	if newType == "" {
		return goerrors.New("type required", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("TYPE_REQUIRED")
	}
	newSlug := strings.TrimSpace(req.Slug)
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		return goerrors.New("block id required", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("ID_REQUIRED")
	}
	adminCtx := adminContextFromRequest(h.admin, c, h.cfg.DefaultLocale)
	record, err := panel.Get(adminCtx, id)
	if err != nil {
		return err
	}
	clone := map[string]any{}
	for key, value := range record {
		clone[key] = value
	}
	delete(clone, "id")
	delete(clone, "created_at")
	delete(clone, "updated_at")
	clone["type"] = newType
	if newSlug != "" {
		clone["slug"] = newSlug
	}
	if strings.TrimSpace(anyToString(clone["name"])) == "" {
		clone["name"] = fmt.Sprintf("%s Copy", strings.TrimSpace(anyToString(record["name"])))
	}
	created, err := panel.Create(adminCtx, clone)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, created)
}

func (h *contentTypeBuilderHandlers) BlockDefinitionVersions(c router.Context) error {
	if err := h.guard(c, "read"); err != nil {
		return err
	}
	panel, err := h.panelFor("block_definitions")
	if err != nil {
		return err
	}
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		return goerrors.New("block id required", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("ID_REQUIRED")
	}
	if h.contentSvc == nil {
		return goerrors.New("content service unavailable", goerrors.CategoryInternal).
			WithCode(http.StatusInternalServerError).
			WithTextCode("CONTENT_SERVICE_UNAVAILABLE")
	}
	adminCtx := adminContextFromRequest(h.admin, c, h.cfg.DefaultLocale)
	record, err := panel.Get(adminCtx, id)
	if err != nil {
		return err
	}
	definitionID := strings.TrimSpace(anyToString(record["id"]))
	if definitionID == "" {
		definitionID = id
	}
	versions, err := h.contentSvc.BlockDefinitionVersions(adminCtx.Context, definitionID)
	if err != nil {
		return err
	}
	output := buildBlockSchemaVersions(versions)
	if len(output) == 0 {
		entry := buildBlockVersionFromRecord(record)
		if len(entry.Schema) > 0 {
			output = append(output, entry)
		}
	}
	return c.JSON(http.StatusOK, map[string]any{"versions": output})
}

func (h *contentTypeBuilderHandlers) updateContentTypeStatus(c router.Context, status string) error {
	if guardErr := h.guard(c, "edit"); guardErr != nil {
		return guardErr
	}
	panel, err := h.panelFor("content_types")
	if err != nil {
		return err
	}
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		return goerrors.New("content type id required", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("ID_REQUIRED")
	}
	req := struct {
		Force                bool `json:"force"`
		AllowBreakingChanges bool `json:"allow_breaking_changes"`
	}{}
	if parseErr := parseJSONBody(c, &req); parseErr != nil {
		return parseErr
	}
	allowBreaking := req.Force || req.AllowBreakingChanges
	adminCtx := adminContextFromRequest(h.admin, c, h.cfg.DefaultLocale)

	record, recordErr := panel.Get(adminCtx, id)
	if recordErr != nil && !errors.Is(recordErr, admin.ErrNotFound) {
		return recordErr
	}

	resolvedID, resolvedFrom, resolveErr := h.resolveContentTypeID(adminCtx.Context, id, record)
	if resolveErr != nil {
		return resolveErr
	}
	if resolvedID == "" {
		h.logContentTypeIDMismatch("publish", id, resolvedID, resolvedFrom, record)
		return goerrors.New("content type not found", goerrors.CategoryNotFound).
			WithCode(http.StatusNotFound).
			WithTextCode(admin.TextCodeNotFound)
	}

	updatePayload := map[string]any{
		"status": status,
	}
	if status == "active" && allowBreaking {
		updatePayload["allow_breaking_changes"] = true
	}
	updated, err := panel.Update(adminCtx, resolvedID, updatePayload)
	if err != nil {
		if errors.Is(err, admin.ErrNotFound) {
			h.logContentTypeIDMismatch("publish", id, resolvedID, resolvedFrom, record)
			return goerrors.New("content type not found", goerrors.CategoryNotFound).
				WithCode(http.StatusNotFound).
				WithTextCode(admin.TextCodeNotFound)
		}
		return err
	}
	if status == "active" && h.versions != nil {
		key := contentTypeKey(resolvedID, updated)
		entry, ok := h.versions.flushPending(key)
		if !ok {
			entry = buildVersionFromRecord(updated)
		}
		if entry.Schema != nil {
			h.versions.addVersion(key, entry)
		}
	}
	return c.JSON(http.StatusOK, updated)
}

func (h *contentTypeBuilderHandlers) resolveContentTypeID(ctx context.Context, requestID string, record map[string]any) (string, string, error) {
	requestID = strings.TrimSpace(requestID)
	if requestID == "" {
		return "", "", nil
	}
	if h == nil || h.admin == nil {
		if record != nil {
			if resolved := resolveContentTypeUpdateID(requestID, record); resolved != "" {
				return resolved, "record", nil
			}
		}
		return requestID, "request", nil
	}
	svc := h.admin.ContentTypeService()
	if svc == nil {
		if record != nil {
			if resolved := resolveContentTypeUpdateID(requestID, record); resolved != "" {
				return resolved, "record", nil
			}
		}
		return requestID, "request", nil
	}

	if ct, err := svc.ContentType(ctx, requestID); err == nil && ct != nil {
		if id := strings.TrimSpace(ct.ID); id != "" {
			return id, "id", nil
		}
		return requestID, "id", nil
	} else if err != nil && !errors.Is(err, admin.ErrNotFound) {
		return "", "", err
	}

	if ct, err := svc.ContentTypeBySlug(ctx, requestID); err == nil && ct != nil {
		if id := strings.TrimSpace(ct.ID); id != "" {
			return id, "slug", nil
		}
		return requestID, "slug", nil
	} else if err != nil && !errors.Is(err, admin.ErrNotFound) {
		return "", "", err
	}

	return "", "", nil
}

func (h *contentTypeBuilderHandlers) logContentTypeIDMismatch(action, requestID, resolvedID, resolvedFrom string, record map[string]any) {
	if action == "" {
		action = "update"
	}
	recordID := ""
	recordTypeID := ""
	recordSlug := ""
	if record != nil {
		recordID = strings.TrimSpace(anyToString(record["id"]))
		recordTypeID = strings.TrimSpace(anyToString(record["content_type_id"]))
		recordSlug = strings.TrimSpace(anyToString(record["slug"]))
	}
	logger := resolveQuickstartAdminLogger(h.admin, "quickstart.content_types", nil, nil)
	logger.Warn("content type id mismatch",
		"action", action,
		"request_id", requestID,
		"resolved_id", resolvedID,
		"resolved_from", resolvedFrom,
		"record_id", recordID,
		"record_content_type_id", recordTypeID,
		"record_slug", recordSlug,
	)
}

func (h *contentTypeBuilderHandlers) updateBlockDefinitionStatus(c router.Context, status string) error {
	panel, err := h.panelFor("block_definitions")
	if err != nil {
		return err
	}
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		return goerrors.New("block id required", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("ID_REQUIRED")
	}
	adminCtx := adminContextFromRequest(h.admin, c, h.cfg.DefaultLocale)
	payload := map[string]any{
		"status": status,
	}
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "active":
		payload["transition"] = "publish"
	case "deprecated":
		payload["transition"] = "deprecate"
	}
	updated, err := panel.Update(adminCtx, id, payload)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, updated)
}

func contentTypeKey(id string, record map[string]any) string {
	if record != nil {
		if val := strings.TrimSpace(anyToString(record["id"])); val != "" {
			return val
		}
		if val := strings.TrimSpace(anyToString(record["content_type_id"])); val != "" {
			return val
		}
		if val := strings.TrimSpace(anyToString(record["slug"])); val != "" {
			return val
		}
	}
	return strings.TrimSpace(id)
}

func resolveContentTypeUpdateID(fallback string, record map[string]any) string {
	if record == nil {
		return strings.TrimSpace(fallback)
	}
	if val := strings.TrimSpace(anyToString(record["slug"])); val != "" {
		return val
	}
	if val := strings.TrimSpace(anyToString(record["id"])); val != "" {
		return val
	}
	if val := strings.TrimSpace(anyToString(record["content_type_id"])); val != "" {
		return val
	}
	return strings.TrimSpace(fallback)
}

func buildVersionFromRecord(record map[string]any) contentTypeSchemaVersion {
	schema := normalizeSchemaValue(record["schema"])
	if len(schema) == 0 {
		return contentTypeSchemaVersion{}
	}
	entry := contentTypeSchemaVersion{
		Schema:   schema,
		UISchema: normalizeSchemaValue(record["ui_schema"]),
	}
	if version := strings.TrimSpace(anyToString(record["schema_version"])); version != "" {
		entry.Version = version
	}
	if created := strings.TrimSpace(anyToString(record["updated_at"])); created != "" {
		entry.CreatedAt = created
	} else if created := strings.TrimSpace(anyToString(record["created_at"])); created != "" {
		entry.CreatedAt = created
	} else {
		entry.CreatedAt = time.Now().UTC().Format(time.RFC3339)
	}
	return entry
}

func buildBlockSchemaVersions(items []admin.CMSBlockDefinitionVersion) []blockSchemaVersion {
	if len(items) == 0 {
		return nil
	}
	out := make([]blockSchemaVersion, 0, len(items))
	for i := len(items) - 1; i >= 0; i-- {
		out = append(out, blockSchemaVersionFromCMS(items[i]))
	}
	return out
}

func blockSchemaVersionFromCMS(item admin.CMSBlockDefinitionVersion) blockSchemaVersion {
	version := strings.TrimSpace(item.SchemaVersion)
	schema := item.Schema
	if schema == nil {
		schema = map[string]any{}
	}
	createdAt := item.CreatedAt
	if createdAt.IsZero() {
		createdAt = item.UpdatedAt
	}
	created := createdAt.UTC().Format(time.RFC3339)
	if createdAt.IsZero() {
		created = time.Now().UTC().Format(time.RFC3339)
	}
	status := strings.TrimSpace(item.MigrationStatus)
	if status == "" {
		status = schemaMigrationStatusFromSchema(schema)
	}
	return blockSchemaVersion{
		Version:         version,
		Schema:          schema,
		CreatedAt:       created,
		MigrationStatus: status,
	}
}

func buildBlockVersionFromRecord(record map[string]any) blockSchemaVersion {
	schema := normalizeSchemaValue(record["schema"])
	if len(schema) == 0 {
		return blockSchemaVersion{}
	}
	entry := blockSchemaVersion{
		Schema: schema,
	}
	if version := strings.TrimSpace(anyToString(record["schema_version"])); version != "" {
		entry.Version = version
	}
	if status := strings.TrimSpace(anyToString(record["migration_status"])); status != "" {
		entry.MigrationStatus = status
	} else {
		entry.MigrationStatus = schemaMigrationStatusFromSchema(schema)
	}
	if created := strings.TrimSpace(anyToString(record["updated_at"])); created != "" {
		entry.CreatedAt = created
	} else if created := strings.TrimSpace(anyToString(record["created_at"])); created != "" {
		entry.CreatedAt = created
	} else {
		entry.CreatedAt = time.Now().UTC().Format(time.RFC3339)
	}
	return entry
}

func schemaMigrationStatusFromSchema(schema map[string]any) string {
	if schema == nil {
		return ""
	}
	if meta, ok := schema["metadata"].(map[string]any); ok {
		if status, ok := meta["migration_status"].(string); ok {
			return strings.TrimSpace(status)
		}
	}
	if meta, ok := schema["x-cms"].(map[string]any); ok {
		if status, ok := meta["migration_status"].(string); ok {
			return strings.TrimSpace(status)
		}
	}
	if meta, ok := schema["x-admin"].(map[string]any); ok {
		if status, ok := meta["migration_status"].(string); ok {
			return strings.TrimSpace(status)
		}
	}
	return ""
}

package admin

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	router "github.com/goliatone/go-router"
	"github.com/julienschmidt/httprouter"
)

func TestCMSWorkflowPreviewAndPublicAPIIntegration(t *testing.T) {
	cfg := Config{BasePath: "/admin", DefaultLocale: "en", EnablePublicAPI: true}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	if err := adm.RegisterCMSDemoPanels(); err != nil {
		t.Fatalf("register cms demo panels: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	pageBody := `{"title":"Draft Page","slug":"draft-page","path":"/draft-page","status":"draft","locale":"en","blocks":[{"_type":"hero","title":"Hello"}]}`
	createReq := httptest.NewRequest("POST", "/admin/api/pages", strings.NewReader(pageBody))
	createReq.Header.Set("Content-Type", "application/json")
	createRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(createRes, createReq)
	if createRes.Code != http.StatusOK {
		t.Fatalf("create page status: %d body=%s", createRes.Code, createRes.Body.String())
	}
	created := decodeJSONMap(t, createRes)
	createdRecord := extractRecord(created)
	pageID := toString(createdRecord["id"])
	pageSlug := toString(createdRecord["slug"])
	if pageID == "" {
		t.Fatalf("expected page id, got %+v", created)
	}
	if pageSlug == "" {
		pageSlug = "draft-page"
	}
	if blocks := extractBlocks(created); len(blocks) != 1 {
		t.Fatalf("expected embedded blocks on create, got %+v", created)
	}

	updateBody := `{"blocks":[{"_type":"hero","title":"Updated"}]}`
	updateReq := httptest.NewRequest("PUT", "/admin/api/pages/"+pageID, strings.NewReader(updateBody))
	updateReq.Header.Set("Content-Type", "application/json")
	updateRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(updateRes, updateReq)
	if updateRes.Code != http.StatusOK {
		t.Fatalf("update page status: %d body=%s", updateRes.Code, updateRes.Body.String())
	}
	updated := decodeJSONMap(t, updateRes)
	updatedBlocks := extractBlocks(updated)
	if len(updatedBlocks) != 1 || toString(updatedBlocks[0]["title"]) != "Updated" {
		t.Fatalf("expected updated embedded blocks, got %+v", updatedBlocks)
	}

	publicReq := httptest.NewRequest("GET", "/api/v1/pages/"+pageSlug, nil)
	publicRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(publicRes, publicReq)
	if publicRes.Code != http.StatusNotFound {
		t.Fatalf("expected draft to be hidden, got %d body=%s", publicRes.Code, publicRes.Body.String())
	}

	previewReq := httptest.NewRequest("GET", "/admin/api/pages/"+pageID+"/preview", nil)
	previewRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(previewRes, previewReq)
	if previewRes.Code != http.StatusOK {
		t.Fatalf("preview token status: %d body=%s", previewRes.Code, previewRes.Body.String())
	}
	previewPayload := decodeJSONMap(t, previewRes)
	token := toString(previewPayload["token"])
	if token == "" {
		t.Fatalf("expected preview token, got %+v", previewPayload)
	}

	adminPreviewReq := httptest.NewRequest("GET", "/admin/api/preview/"+token, nil)
	adminPreviewRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(adminPreviewRes, adminPreviewReq)
	if adminPreviewRes.Code != http.StatusOK {
		t.Fatalf("admin preview status: %d body=%s", adminPreviewRes.Code, adminPreviewRes.Body.String())
	}
	adminPreview := decodeJSONMap(t, adminPreviewRes)
	previewID := extractPreviewID(adminPreview)
	if previewID != pageID {
		t.Fatalf("expected preview id %q, got %+v", pageID, adminPreview)
	}
	adminBlocks := extractBlocks(adminPreview)
	if len(adminBlocks) != 1 || toString(adminBlocks[0]["title"]) != "Updated" {
		t.Fatalf("expected preview blocks to include updated payload, got %+v", adminBlocks)
	}

	publicPreviewReq := httptest.NewRequest("GET", "/api/v1/preview/"+token, nil)
	publicPreviewRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(publicPreviewRes, publicPreviewReq)
	if publicPreviewRes.Code != http.StatusOK {
		t.Fatalf("public preview status: %d body=%s", publicPreviewRes.Code, publicPreviewRes.Body.String())
	}
	publicPreview := decodeJSONMap(t, publicPreviewRes)
	if previewID := extractPreviewID(publicPreview); previewID != pageID {
		t.Fatalf("expected public preview id %q, got %+v", pageID, publicPreview)
	}
	publicBlocks := extractBlocks(publicPreview)
	if len(publicBlocks) != 1 || toString(publicBlocks[0]["title"]) != "Updated" {
		t.Fatalf("expected public preview blocks to include updated payload, got %+v", publicBlocks)
	}

	workflowReq := httptest.NewRequest("POST", "/admin/api/pages/actions/submit_for_approval", strings.NewReader(`{"id":"`+pageID+`"}`))
	workflowReq.Header.Set("Content-Type", "application/json")
	workflowRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(workflowRes, workflowReq)
	if workflowRes.Code != http.StatusOK {
		t.Fatalf("workflow submit status: %d body=%s", workflowRes.Code, workflowRes.Body.String())
	}

	status := fetchPageStatus(t, server, pageID)
	if status != "approval" {
		t.Fatalf("expected approval status, got %q", status)
	}

	publishReq := httptest.NewRequest("POST", "/admin/api/pages/actions/publish", strings.NewReader(`{"id":"`+pageID+`"}`))
	publishReq.Header.Set("Content-Type", "application/json")
	publishRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(publishRes, publishReq)
	if publishRes.Code != http.StatusOK {
		t.Fatalf("workflow publish status: %d body=%s", publishRes.Code, publishRes.Body.String())
	}

	status = fetchPageStatus(t, server, pageID)
	if status != "published" {
		t.Fatalf("expected published status, got %q", status)
	}

	publicReq = httptest.NewRequest("GET", "/api/v1/pages/"+pageSlug, nil)
	publicRes = httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(publicRes, publicReq)
	if publicRes.Code != http.StatusOK {
		t.Fatalf("expected published page, got %d body=%s", publicRes.Code, publicRes.Body.String())
	}
	publicPage := decodeJSONMap(t, publicRes)
	publishedBlocks := extractBlocks(publicPage)
	if len(publishedBlocks) != 1 || toString(publishedBlocks[0]["title"]) != "Updated" {
		t.Fatalf("expected published blocks to include updated payload, got %+v", publishedBlocks)
	}
}

func decodeJSONMap(t *testing.T, rr *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	payload := map[string]any{}
	if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	return payload
}

func fetchPageStatus(t *testing.T, server router.Server[*httprouter.Router], id string) string {
	t.Helper()
	getReq := httptest.NewRequest("GET", "/admin/api/pages/"+id, nil)
	getRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(getRes, getReq)
	if getRes.Code != http.StatusOK {
		t.Fatalf("fetch page status: %d body=%s", getRes.Code, getRes.Body.String())
	}
	page := decodeJSONMap(t, getRes)
	record := extractRecord(page)
	return strings.ToLower(strings.TrimSpace(toString(record["status"])))
}

func extractPreviewID(payload map[string]any) string {
	record := extractRecord(payload)
	if record != nil {
		if id := toString(record["id"]); id != "" {
			return id
		}
		if id := toString(record["ID"]); id != "" {
			return id
		}
	}
	if data, ok := payload["data"].(map[string]any); ok {
		if id := toString(data["id"]); id != "" {
			return id
		}
		if id := toString(data["ID"]); id != "" {
			return id
		}
	}
	if id := toString(payload["id"]); id != "" {
		return id
	}
	return toString(payload["ID"])
}

func extractBlocks(payload map[string]any) []map[string]any {
	if payload == nil {
		return nil
	}
	if data, ok := payload["data"].(map[string]any); ok {
		if blocks := extractBlocksFromAny(data["blocks"]); len(blocks) > 0 {
			return blocks
		}
		if blocks := extractBlocksFromAny(data["EmbeddedBlocks"]); len(blocks) > 0 {
			return blocks
		}
		if blocks := extractBlocksFromAny(data["embedded_blocks"]); len(blocks) > 0 {
			return blocks
		}
	}
	if blocks := extractBlocksFromAny(payload["blocks"]); len(blocks) > 0 {
		return blocks
	}
	if blocks := extractBlocksFromAny(payload["EmbeddedBlocks"]); len(blocks) > 0 {
		return blocks
	}
	return extractBlocksFromAny(payload["embedded_blocks"])
}

func extractBlocksFromAny(raw any) []map[string]any {
	switch typed := raw.(type) {
	case []map[string]any:
		return typed
	case []any:
		out := make([]map[string]any, 0, len(typed))
		for _, item := range typed {
			if block, ok := item.(map[string]any); ok {
				out = append(out, block)
			}
		}
		return out
	default:
		return nil
	}
}

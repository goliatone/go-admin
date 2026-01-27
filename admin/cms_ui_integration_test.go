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

func TestCMSContentTypeCRUDAndValidation(t *testing.T) {
	cfg := Config{BasePath: "/admin", DefaultLocale: "en"}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	if err := adm.RegisterCMSDemoPanels(); err != nil {
		t.Fatalf("register cms demo panels: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	createBody := `{"name":"FAQ","slug":"faq","schema":{"fields":[{"name":"question","type":"text","required":true}]}}`
	createReq := httptest.NewRequest("POST", "/admin/api/content_types", strings.NewReader(createBody))
	createReq.Header.Set("Content-Type", "application/json")
	createRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(createRes, createReq)
	if createRes.Code != http.StatusOK {
		t.Fatalf("create content type status: %d body=%s", createRes.Code, createRes.Body.String())
	}
	created := decodeJSONMap(t, createRes)
	if toString(created["slug"]) != "faq" {
		t.Fatalf("expected slug faq, got %+v", created)
	}

	updateBody := `{"description":"Frequently asked questions"}`
	updateReq := httptest.NewRequest("PUT", "/admin/api/content_types/faq", strings.NewReader(updateBody))
	updateReq.Header.Set("Content-Type", "application/json")
	updateRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(updateRes, updateReq)
	if updateRes.Code != http.StatusOK {
		t.Fatalf("update content type status: %d body=%s", updateRes.Code, updateRes.Body.String())
	}
	updated := decodeJSONMap(t, updateRes)
	if toString(updated["description"]) != "Frequently asked questions" {
		t.Fatalf("expected description update, got %+v", updated)
	}

	getReq := httptest.NewRequest("GET", "/admin/api/content_types/faq", nil)
	getRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(getRes, getReq)
	if getRes.Code != http.StatusOK {
		t.Fatalf("get content type status: %d body=%s", getRes.Code, getRes.Body.String())
	}
	fetched := decodeJSONMap(t, getRes)
	if toString(fetched["slug"]) != "faq" {
		t.Fatalf("expected slug faq, got %+v", fetched)
	}

	invalidBody := `{"name":"Broken","slug":"bad@slug"}`
	invalidReq := httptest.NewRequest("POST", "/admin/api/content_types", strings.NewReader(invalidBody))
	invalidReq.Header.Set("Content-Type", "application/json")
	invalidRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(invalidRes, invalidReq)
	if invalidRes.Code != http.StatusBadRequest {
		t.Fatalf("expected validation error, got %d body=%s", invalidRes.Code, invalidRes.Body.String())
	}
	var invalidPayload map[string]any
	_ = json.Unmarshal(invalidRes.Body.Bytes(), &invalidPayload)
	meta := map[string]any{}
	if errNode, ok := invalidPayload["error"].(map[string]any); ok {
		if rawMeta, ok := errNode["metadata"].(map[string]any); ok {
			meta = rawMeta
		}
	}
	fields, _ := meta["fields"].(map[string]any)
	if fields == nil || fields["schema"] == nil {
		t.Fatalf("expected schema validation error, got %+v", invalidPayload)
	}

	deleteReq := httptest.NewRequest("DELETE", "/admin/api/content_types/faq", nil)
	deleteRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(deleteRes, deleteReq)
	if deleteRes.Code != http.StatusOK {
		t.Fatalf("delete content type status: %d body=%s", deleteRes.Code, deleteRes.Body.String())
	}
}

func TestCMSBlockAdapterRoutes(t *testing.T) {
	cfg := Config{BasePath: "/admin", DefaultLocale: "en"}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	if err := adm.RegisterCMSDemoPanels(); err != nil {
		t.Fatalf("register cms demo panels: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	defsReq := httptest.NewRequest("GET", "/admin/api/block_definitions", nil)
	defsRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(defsRes, defsReq)
	if defsRes.Code != http.StatusOK {
		t.Fatalf("block definitions status: %d body=%s", defsRes.Code, defsRes.Body.String())
	}
	defsPayload := decodeJSONMap(t, defsRes)
	defs, ok := defsPayload["data"].([]any)
	if !ok || len(defs) == 0 {
		t.Fatalf("expected block definitions, got %+v", defsPayload)
	}

	pageID := fetchFirstPageID(t, server)

	blockBody := `{"definition_id":"hero","content_id":"` + pageID + `","region":"main","locale":"en","status":"draft","data":{"title":"Hello"}}`
	blockReq := httptest.NewRequest("POST", "/admin/api/blocks", strings.NewReader(blockBody))
	blockReq.Header.Set("Content-Type", "application/json")
	blockRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(blockRes, blockReq)
	if blockRes.Code != http.StatusOK {
		t.Fatalf("create block status: %d body=%s", blockRes.Code, blockRes.Body.String())
	}
	created := decodeJSONMap(t, blockRes)
	blockID := toString(created["id"])
	if blockID == "" {
		t.Fatalf("expected block id, got %+v", created)
	}
	if toString(created["content_id"]) != pageID {
		t.Fatalf("expected block content id %q, got %+v", pageID, created)
	}

	getReq := httptest.NewRequest("GET", "/admin/api/blocks/"+blockID, nil)
	getRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(getRes, getReq)
	if getRes.Code != http.StatusOK {
		t.Fatalf("get block status: %d body=%s", getRes.Code, getRes.Body.String())
	}

	contentBlocksReq := httptest.NewRequest("GET", "/admin/api/content/"+pageID+"/blocks", nil)
	contentBlocksRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(contentBlocksRes, contentBlocksReq)
	if contentBlocksRes.Code != http.StatusOK {
		t.Fatalf("content blocks status: %d body=%s", contentBlocksRes.Code, contentBlocksRes.Body.String())
	}
}

func fetchFirstPageID(t *testing.T, server router.Server[*httprouter.Router]) string {
	t.Helper()
	listReq := httptest.NewRequest("GET", "/admin/api/pages", nil)
	listRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("list pages status: %d body=%s", listRes.Code, listRes.Body.String())
	}
	payload := decodeJSONMap(t, listRes)
	items, ok := payload["data"].([]any)
	if !ok || len(items) == 0 {
		t.Fatalf("expected pages list, got %+v", payload)
	}
	first, ok := items[0].(map[string]any)
	if !ok {
		t.Fatalf("expected page map, got %+v", items[0])
	}
	id := toString(first["id"])
	if id == "" {
		t.Fatalf("expected page id, got %+v", first)
	}
	return id
}

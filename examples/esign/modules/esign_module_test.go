package modules

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-admin/quickstart"
	router "github.com/goliatone/go-router"
)

type allowAllAuthorizer struct{}

func (allowAllAuthorizer) Can(context.Context, string, string) bool { return true }

func TestESignModuleRegistersPanelsSettingsRoleDefaultsAndCommandActions(t *testing.T) {
	observability.ResetDefaultMetrics()
	t.Cleanup(observability.ResetDefaultMetrics)
	cfg := quickstart.NewAdminConfig("/admin", "E-Sign Test", "en")
	cfg.URLs.Admin.APIPrefix = "api"
	cfg.URLs.Admin.APIVersion = "v1"
	cfg.URLs.Public.APIPrefix = "api"
	cfg.URLs.Public.APIVersion = "v1"
	cfg.EnablePublicAPI = true

	adm, _, err := quickstart.NewAdmin(
		cfg,
		quickstart.AdapterHooks{},
		quickstart.WithAdminContext(context.Background()),
		quickstart.WithFeatureDefaults(map[string]bool{"esign": true}),
	)
	if err != nil {
		t.Fatalf("quickstart.NewAdmin: %v", err)
	}
	adm.WithAuthorizer(allowAllAuthorizer{})

	module := NewESignModule(cfg.BasePath, cfg.DefaultLocale, cfg.NavMenuCode)
	if err := adm.RegisterModule(module); err != nil {
		t.Fatalf("RegisterModule: %v", err)
	}

	server := router.NewFiberAdapter(func(_ *fiber.App) *fiber.App {
		return fiber.New(fiber.Config{EnablePrintRoutes: false})
	})
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("Initialize: %v", err)
	}

	if _, ok := adm.Registry().Panel(esignDocumentsPanelID); !ok {
		t.Fatalf("expected %s panel registration", esignDocumentsPanelID)
	}
	if _, ok := adm.Registry().Panel(esignAgreementsPanelID); !ok {
		t.Fatalf("expected %s panel registration", esignAgreementsPanelID)
	}

	if !hasSettingDefinition(adm, settingEmailDefaultFromName) || !hasSettingDefinition(adm, settingTokenTTLSeconds) || !hasSettingDefinition(adm, settingMaxSourceSizeBytes) {
		t.Fatalf("expected e-sign runtime settings definitions to be registered")
	}

	roles, _, err := adm.UserService().ListRoles(context.Background(), coreadmin.ListOptions{PerPage: 200})
	if err != nil {
		t.Fatalf("ListRoles: %v", err)
	}
	if !hasRoleKey(roles, "esign_admin") || !hasRoleKey(roles, "esign_operator") || !hasRoleKey(roles, "esign_viewer") {
		t.Fatalf("expected e-sign default role mappings to be created, got %+v", roles)
	}

	documentID := createPanelRecord(t, server, "/admin/api/v1/esign_documents?tenant_id=tenant-bootstrap&org_id=org-bootstrap", map[string]any{
		"title":             "Master Service Agreement",
		"source_object_key": "tenant/tenant-bootstrap/org/org-bootstrap/docs/master-service-agreement.pdf",
		"pdf_base64":        encodeTestPDF(1),
	})
	agreementID := createPanelRecord(t, server, "/admin/api/v1/esign_agreements?tenant_id=tenant-bootstrap&org_id=org-bootstrap", map[string]any{
		"document_id": documentID,
		"title":       "MSA Signature",
		"message":     "Please review and sign.",
	})
	seedAgreementAsSignable(t, module, agreementID)

	actionBody, _ := json.Marshal(map[string]any{"idempotency_key": "phase6-send-1"})
	actionReq := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign_agreements/actions/send?id="+agreementID+"&tenant_id=tenant-bootstrap&org_id=org-bootstrap", bytes.NewReader(actionBody))
	actionReq.Header.Set("Content-Type", "application/json")
	actionReq.Header.Set("X-User-ID", "ops-user")
	actionRes, err := server.WrappedRouter().Test(actionReq, -1)
	if err != nil {
		t.Fatalf("action request failed: %v", err)
	}
	defer actionRes.Body.Close()
	if actionRes.StatusCode != http.StatusOK {
		payload, _ := io.ReadAll(actionRes.Body)
		t.Fatalf("expected send action 200, got %d body=%s", actionRes.StatusCode, string(payload))
	}

	agreementDetail := getPanelDetail(t, server, "/admin/api/v1/esign_agreements/"+agreementID+"?tenant_id=tenant-bootstrap&org_id=org-bootstrap")
	status := toString(agreementDetail["status"])
	if status != "sent" {
		t.Fatalf("expected agreement status sent after action dispatch, got %q detail=%+v", status, agreementDetail)
	}
	assertMapHasKeys(t, agreementDetail,
		"source_type", "source_google_file_id", "source_google_doc_url",
		"source_modified_time", "source_exported_at", "source_exported_by_user_id",
	)
	timeline, ok := agreementDetail["timeline"].([]any)
	if !ok || len(timeline) == 0 {
		t.Fatalf("expected timeline entries in agreement detail, got %+v", agreementDetail["timeline"])
	}
	event := firstTimelineEventMap(t, timeline)
	assertMapHasKeys(t, event, "id", "event_type", "actor_type", "actor_id", "ip_address", "user_agent", "created_at", "metadata_raw")
	if sentEvent, ok := findTimelineEvent(timeline, "agreement.sent"); ok {
		assertMapHasKeys(t, sentEvent, "metadata")
		metadata, ok := sentEvent["metadata"].(map[string]any)
		if !ok {
			t.Fatalf("expected timeline metadata object, got %+v", sentEvent["metadata"])
		}
		assertMapHasKeys(t, metadata, "idempotency_key", "status")
		if toString(metadata["idempotency_key"]) != "phase6-send-1" {
			t.Fatalf("expected agreement.sent metadata.idempotency_key=phase6-send-1, got %+v", metadata)
		}
	}

	delivery, ok := agreementDetail["delivery"].(map[string]any)
	if !ok {
		t.Fatalf("expected delivery object in agreement detail, got %+v", agreementDetail["delivery"])
	}
	assertMapHasKeys(t, delivery, "agreement_id", "executed_status", "certificate_status", "distribution_status", "executed_object_key", "certificate_object_key", "last_error", "correlation_ids")

	menu := adm.Navigation().Resolve(context.Background(), cfg.DefaultLocale)
	if !hasMenuTargetKey(menu, "esign") {
		t.Fatalf("expected e-sign menu contribution in navigation")
	}
	if !hasMenuTarget(menu, esignAgreementsPanelID, "/admin/content/esign_agreements") {
		t.Fatalf("expected e-sign agreements menu entry in navigation")
	}
	if !hasMenuTarget(menu, esignDocumentsPanelID, "/admin/content/esign_documents") {
		t.Fatalf("expected e-sign documents menu entry in navigation")
	}

	providers := adm.Dashboard().Providers()
	for _, code := range []string{
		"esign.widget.agreement_stats",
		"esign.widget.signing_activity",
		"esign.widget.delivery_health",
		"esign.widget.pending_signatures",
	} {
		if !hasDashboardProvider(providers, code) {
			t.Fatalf("expected dashboard provider %q, got %+v", code, providers)
		}
	}

	widgets, err := adm.Dashboard().Resolve(coreadmin.AdminContext{
		Context: context.Background(),
		Locale:  cfg.DefaultLocale,
		UserID:  "ops-user",
	})
	if err != nil {
		t.Fatalf("Dashboard.Resolve: %v", err)
	}
	deliveryWidget, ok := findDashboardWidget(widgets, "esign.widget.delivery_health")
	if !ok {
		t.Fatalf("expected delivery health widget in dashboard payload, got %+v", widgets)
	}
	deliveryData, ok := deliveryWidget["data"].(map[string]any)
	if !ok {
		t.Fatalf("expected delivery health widget data map, got %+v", deliveryWidget["data"])
	}
	assertMapHasKeys(t, deliveryData,
		"slo_overall_pass",
		"slo_targets",
		"alerts",
		"job_success_rate",
		"emails_sent",
		"emails_failed",
		"signer_link_open_rate",
		"signer_submit_conversion_rate",
		"completion_delivery_success_rate",
	)
	if deliveryData["period"] != "rolling window" {
		t.Fatalf("expected rolling window period in delivery widget, got %+v", deliveryData["period"])
	}
}

func seedAgreementAsSignable(t *testing.T, module *ESignModule, agreementID string) {
	t.Helper()
	if module == nil {
		t.Fatalf("module is nil")
	}
	signerEmail := "signer@example.test"
	signerName := "Primary Signer"
	signerRole := stores.RecipientRoleSigner
	signingOrder := 1
	recipient, err := module.agreements.UpsertRecipientDraft(context.Background(), defaultModuleScope, agreementID, stores.RecipientDraftPatch{
		Email:        &signerEmail,
		Name:         &signerName,
		Role:         &signerRole,
		SigningOrder: &signingOrder,
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft: %v", err)
	}

	fieldType := stores.FieldTypeSignature
	pageNumber := 1
	posX := 0.15
	posY := 0.65
	width := 0.25
	height := 0.08
	required := true
	if _, err := module.agreements.UpsertFieldDraft(context.Background(), defaultModuleScope, agreementID, stores.FieldDraftPatch{
		RecipientID: &recipient.ID,
		Type:        &fieldType,
		PageNumber:  &pageNumber,
		PosX:        &posX,
		PosY:        &posY,
		Width:       &width,
		Height:      &height,
		Required:    &required,
	}); err != nil {
		t.Fatalf("UpsertFieldDraft: %v", err)
	}
}

func createPanelRecord(t *testing.T, server router.Server[*fiber.App], path string, payload map[string]any) string {
	t.Helper()
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "ops-user")
	res, err := server.WrappedRouter().Test(req, -1)
	if err != nil {
		t.Fatalf("create request failed: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		payload, _ := io.ReadAll(res.Body)
		t.Fatalf("expected create 200, got %d body=%s", res.StatusCode, string(payload))
	}
	out := map[string]any{}
	bodyBytes, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(bodyBytes, &out); err != nil {
		t.Fatalf("decode create response: %v", err)
	}
	id := toString(out["id"])
	if id == "" {
		t.Fatalf("expected record id in create response, got %+v", out)
	}
	return id
}

func getPanelDetail(t *testing.T, server router.Server[*fiber.App], path string) map[string]any {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, path, nil)
	req.Header.Set("X-User-ID", "ops-user")
	res, err := server.WrappedRouter().Test(req, -1)
	if err != nil {
		t.Fatalf("detail request failed: %v", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		payload, _ := io.ReadAll(res.Body)
		t.Fatalf("expected detail 200, got %d body=%s", res.StatusCode, string(payload))
	}
	out := map[string]any{}
	bodyBytes, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(bodyBytes, &out); err != nil {
		t.Fatalf("decode detail response: %v", err)
	}
	record, _ := out["data"].(map[string]any)
	if len(record) == 0 {
		t.Fatalf("expected detail response data payload, got %+v", out)
	}
	return record
}

func hasSettingDefinition(adm *coreadmin.Admin, key string) bool {
	if adm == nil || adm.SettingsService() == nil {
		return false
	}
	for _, def := range adm.SettingsService().Definitions() {
		if def.Key == key {
			return true
		}
	}
	return false
}

func hasRoleKey(roles []coreadmin.RoleRecord, roleKey string) bool {
	for _, role := range roles {
		if role.RoleKey == roleKey {
			return true
		}
	}
	return false
}

func hasMenuTargetKey(items []coreadmin.NavigationItem, key string) bool {
	for _, item := range items {
		if targetKey(item.Target) == key {
			return true
		}
		if hasMenuTargetKey(item.Children, key) {
			return true
		}
	}
	return false
}

func hasMenuTarget(items []coreadmin.NavigationItem, key, menuPath string) bool {
	for _, item := range items {
		if targetKey(item.Target) == key && targetPath(item.Target) == menuPath {
			return true
		}
		if hasMenuTarget(item.Children, key, menuPath) {
			return true
		}
	}
	return false
}

func hasDashboardProvider(providers []coreadmin.DashboardProviderSpec, code string) bool {
	for _, provider := range providers {
		if provider.Code == code {
			return true
		}
	}
	return false
}

func findDashboardWidget(widgets []map[string]any, definition string) (map[string]any, bool) {
	for _, widget := range widgets {
		if toString(widget["definition"]) == definition {
			return widget, true
		}
	}
	return nil, false
}

func targetKey(target map[string]any) string {
	if target == nil {
		return ""
	}
	if value, ok := target["key"].(string); ok {
		return value
	}
	return ""
}

func targetPath(target map[string]any) string {
	if target == nil {
		return ""
	}
	if value, ok := target["path"].(string); ok {
		return strings.TrimSpace(value)
	}
	return ""
}

func firstTimelineEventMap(t *testing.T, timeline []any) map[string]any {
	t.Helper()
	if len(timeline) == 0 {
		t.Fatalf("expected at least one timeline event")
	}
	event, ok := timeline[0].(map[string]any)
	if !ok {
		t.Fatalf("expected timeline entry object, got %+v", timeline[0])
	}
	return event
}

func findTimelineEvent(timeline []any, eventType string) (map[string]any, bool) {
	for _, raw := range timeline {
		event, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		if toString(event["event_type"]) == eventType {
			return event, true
		}
	}
	return nil, false
}

func assertMapHasKeys(t *testing.T, payload map[string]any, keys ...string) {
	t.Helper()
	for _, key := range keys {
		if _, ok := payload[key]; !ok {
			t.Fatalf("expected key %q in payload %+v", key, payload)
		}
	}
}

func encodeTestPDF(pageCount int) string {
	return base64.StdEncoding.EncodeToString(services.GenerateDeterministicPDF(pageCount))
}

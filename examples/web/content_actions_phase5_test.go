package main

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/stretchr/testify/require"
)

func TestContentActionContractsPhase5FixtureSnapshot(t *testing.T) {
	fixture := buildContentActionContractsPhase5Fixture(t)
	data, err := json.MarshalIndent(fixture, "", "  ")
	require.NoError(t, err, "marshal phase 5 fixture")

	path := filepath.Join("..", "..", "pkg", "client", "assets", "tests", "fixtures", "examples_web_action_contracts", "content_actions_phase5.json")
	if os.Getenv("UPDATE_FIXTURES") == "1" {
		require.NoError(t, os.MkdirAll(filepath.Dir(path), 0o755), "create phase 5 fixture directory")
		require.NoError(t, os.WriteFile(path, append(data, '\n'), 0o644), "write phase 5 fixture snapshot")
	}
	expected, err := os.ReadFile(path)
	require.NoError(t, err, "read phase 5 fixture snapshot")
	require.Equal(t, strings.TrimSpace(string(expected)), strings.TrimSpace(string(data)))
}

func TestContentActionContractsPhase5ExposeCanonicalListAndDetailState(t *testing.T) {
	fixture := buildContentActionContractsPhase5Fixture(t)

	pages := extractMap(fixture["pages"])
	pageList := extractMap(pages["list_contract"])
	pageDetail := extractMap(pages["detail_contract"])
	pageListRecord := extractMap(pageList["record"])
	pageDetailRecord := extractMap(pageDetail["data"])

	assertActionStateCode(t, extractMap(pageListRecord["_action_state"]), "delete", coreadmin.ActionDisabledReasonCodePreconditionFailed)
	assertActionStateCode(t, extractMap(pageListRecord["_action_state"]), "unpublish", coreadmin.ActionDisabledReasonCodePreconditionFailed)
	assertActionStateCode(t, extractMap(pageDetailRecord["_action_state"]), "delete", coreadmin.ActionDisabledReasonCodePreconditionFailed)
	assertActionStateCode(t, extractMap(pageDetailRecord["_action_state"]), "unpublish", coreadmin.ActionDisabledReasonCodePreconditionFailed)
	assertActionNamesPresent(t, extractMap(pageList["schema"])["actions"], "edit", "delete", "publish", "unpublish")
	assertActionNamesPresent(t, extractMap(pageDetail["schema"])["actions"], "edit", "delete", "publish", "unpublish")

	posts := extractMap(fixture["posts"])
	postList := extractMap(posts["list_contract"])
	postDetail := extractMap(posts["detail_contract"])
	postListRecord := extractMap(postList["record"])
	postDetailRecord := extractMap(postDetail["data"])

	assertActionStateCode(t, extractMap(postListRecord["_action_state"]), "schedule", coreadmin.ActionDisabledReasonCodePreconditionFailed)
	assertActionStateCode(t, extractMap(postDetailRecord["_action_state"]), "schedule", coreadmin.ActionDisabledReasonCodePreconditionFailed)
	assertActionNamesPresent(t, extractMap(postList["schema"])["actions"], "edit", "delete", "publish", "unpublish", "schedule")
	assertActionNamesPresent(t, extractMap(postDetail["schema"])["actions"], "edit", "delete", "publish", "unpublish", "schedule")
}

func TestContentActionContractsPhase5StructuredFailuresUseCanonicalCodes(t *testing.T) {
	fixture := buildContentActionContractsPhase5Fixture(t)

	pages := extractMap(fixture["pages"])
	pageFailures := extractMap(pages["execution_failures"])
	require.Equal(t, http.StatusConflict, toInt(extractMap(pageFailures["delete"])["status"]))
	require.Equal(t, coreadmin.TextCodePreconditionFailed, strings.TrimSpace(toString(extractMap(extractMap(pageFailures["delete"])["error"])["text_code"])), "delete payload=%+v", pageFailures["delete"])
	require.Equal(t, http.StatusConflict, toInt(extractMap(pageFailures["unpublish"])["status"]))
	require.Equal(t, coreadmin.TextCodePreconditionFailed, strings.TrimSpace(toString(extractMap(extractMap(pageFailures["unpublish"])["error"])["text_code"])), "unpublish payload=%+v", pageFailures["unpublish"])

	posts := extractMap(fixture["posts"])
	postFailures := extractMap(posts["execution_failures"])
	require.Equal(t, http.StatusConflict, toInt(extractMap(postFailures["schedule"])["status"]))
	require.Equal(t, coreadmin.TextCodePreconditionFailed, strings.TrimSpace(toString(extractMap(extractMap(postFailures["schedule"])["error"])["text_code"])), "schedule payload=%+v", postFailures["schedule"])
}

func buildContentActionContractsPhase5Fixture(t *testing.T) map[string]any {
	t.Helper()

	fx := newTranslationWorkflowFixture(t)
	pageListPayload := panelListBySlug(t, fx.handler, "pages", "home")
	pageRecord := extractListRecordBySlug(pageListPayload, "home")
	require.NotNil(t, pageRecord, "expected home page in list payload")
	pageID := strings.TrimSpace(toString(pageRecord["id"]))
	require.NotEmpty(t, pageID, "expected home page id")

	_, pageDetailPayload := doAdminJSONRequest(t, fx.handler, httpMethodGet, panelDetailPath("pages", pageID), nil)
	pageDeleteStatus, pageDeleteFailure := doAdminJSONRequest(t, fx.handler, httpMethodDelete, panelDetailPath("pages", pageID), nil)
	pageUnpublishStatus, pageUnpublishFailure := doAdminJSONRequest(t, fx.handler, httpMethodPost, panelActionPath("pages", "unpublish"), map[string]any{
		"id": pageID,
	})

	postListPayload := panelListBySlug(t, fx.handler, "posts", "getting-started-go")
	postRecord := extractListRecordBySlug(postListPayload, "getting-started-go")
	require.NotNil(t, postRecord, "expected seeded post in list payload")
	postID := strings.TrimSpace(toString(postRecord["id"]))
	require.NotEmpty(t, postID, "expected seeded post id")

	_, postDetailPayload := doAdminJSONRequest(t, fx.handler, httpMethodGet, panelDetailPath("posts", postID), nil)
	postScheduleStatus, postScheduleFailure := doAdminJSONRequest(t, fx.handler, httpMethodPost, panelActionPath("posts", "schedule"), map[string]any{
		"id": postID,
	})

	return map[string]any{
		"schema_version": 1,
		"pages": map[string]any{
			"list_contract": map[string]any{
				"schema": map[string]any{
					"actions": filterActionContracts(extractSchemaActions(pageListPayload), "edit", "delete", "publish", "unpublish"),
				},
				"record": filterRecordContract(pageRecord, "delete", "unpublish"),
			},
			"detail_contract": map[string]any{
				"schema": map[string]any{
					"actions": filterActionContracts(extractSchemaActions(pageDetailPayload), "edit", "delete", "publish", "unpublish"),
				},
				"data": filterRecordContract(extractTestRecord(pageDetailPayload), "delete", "unpublish"),
			},
			"execution_failures": map[string]any{
				"delete": map[string]any{
					"status": pageDeleteStatus,
					"error": filterExecutionFailure(
						extractMap(pageDeleteFailure["error"]),
						"blocked_action",
						"business_rule_id",
						"error_code",
						"page_role",
						"required_path",
						"required_status",
					),
				},
				"unpublish": map[string]any{
					"status": pageUnpublishStatus,
					"error": filterExecutionFailure(
						extractMap(pageUnpublishFailure["error"]),
						"blocked_action",
						"business_rule_id",
						"error_code",
						"page_role",
						"required_path",
						"required_status",
					),
				},
			},
		},
		"posts": map[string]any{
			"list_contract": map[string]any{
				"schema": map[string]any{
					"actions": filterActionContracts(extractSchemaActions(postListPayload), "edit", "delete", "publish", "unpublish", "schedule"),
				},
				"record": filterRecordContract(postRecord, "schedule"),
			},
			"detail_contract": map[string]any{
				"schema": map[string]any{
					"actions": filterActionContracts(extractSchemaActions(postDetailPayload), "edit", "delete", "publish", "unpublish", "schedule"),
				},
				"data": filterRecordContract(extractTestRecord(postDetailPayload), "schedule"),
			},
			"execution_failures": map[string]any{
				"schedule": map[string]any{
					"status": postScheduleStatus,
					"error": filterExecutionFailure(
						extractMap(postScheduleFailure["error"]),
						"current_status",
						"error_code",
						"required_status",
					),
				},
			},
		},
	}
}

func panelListBySlug(t *testing.T, handler http.Handler, panel, slug string) map[string]any {
	t.Helper()
	status, payload := doAdminJSONRequest(t, handler, httpMethodGet, panelCollectionPath(panel)+"?page=1&per_page=200", nil)
	require.Equal(t, 200, status, "list %s payload=%+v", panel, payload)
	require.NotNil(t, extractListRecordBySlug(payload, slug), "expected %s/%s in list payload", panel, slug)
	return payload
}

func extractListRecordBySlug(payload map[string]any, slug string) map[string]any {
	for _, item := range extractListRecords(payload) {
		record, _ := item.(map[string]any)
		if strings.EqualFold(strings.TrimSpace(toString(record["slug"])), strings.TrimSpace(slug)) {
			return record
		}
	}
	return nil
}

func extractSchemaActions(payload map[string]any) []any {
	return extractSlice(extractMap(payload["schema"])["actions"])
}

func filterActionContracts(actions []any, names ...string) []map[string]any {
	if len(actions) == 0 {
		return nil
	}
	allowed := map[string]struct{}{}
	for _, name := range names {
		allowed[strings.ToLower(strings.TrimSpace(name))] = struct{}{}
	}
	out := make([]map[string]any, 0, len(names))
	for _, item := range actions {
		action, _ := item.(map[string]any)
		name := strings.ToLower(strings.TrimSpace(toString(action["name"])))
		if _, ok := allowed[name]; !ok {
			continue
		}
		out = append(out, map[string]any{
			"name":         strings.TrimSpace(toString(action["name"])),
			"label":        strings.TrimSpace(toString(action["label"])),
			"scope":        strings.TrimSpace(toString(action["scope"])),
			"command_name": strings.TrimSpace(toString(action["command_name"])),
			"variant":      strings.TrimSpace(toString(action["variant"])),
		})
	}
	return out
}

func filterRecordContract(record map[string]any, actionNames ...string) map[string]any {
	if len(record) == 0 {
		return nil
	}
	out := map[string]any{
		"id":     stableContractID(record),
		"title":  stableRecordTitle(record),
		"slug":   strings.TrimSpace(toString(record["slug"])),
		"status": strings.TrimSpace(toString(record["status"])),
	}
	if path := strings.TrimSpace(toString(record["path"])); path != "" {
		out["path"] = path
	}
	if publishedAt := strings.TrimSpace(toString(record["published_at"])); publishedAt != "" && publishedAt != "<nil>" {
		out["published_at"] = publishedAt
	}
	out["_action_state"] = filterActionState(extractMap(record["_action_state"]), actionNames...)
	return out
}

func stableContractID(record map[string]any) string {
	if slug := strings.TrimSpace(toString(record["slug"])); slug != "" {
		return "slug:" + slug
	}
	return strings.TrimSpace(toString(record["id"]))
}

func stableRecordTitle(record map[string]any) string {
	if title := strings.TrimSpace(toString(record["title"])); title != "" {
		return title
	}
	if slug := strings.TrimSpace(toString(record["slug"])); slug != "" {
		return slug
	}
	return strings.TrimSpace(toString(record["id"]))
}

func filterActionState(state map[string]any, actionNames ...string) map[string]any {
	if len(state) == 0 {
		return nil
	}
	allowed := map[string]struct{}{}
	for _, name := range actionNames {
		allowed[strings.ToLower(strings.TrimSpace(name))] = struct{}{}
	}
	out := map[string]any{}
	for name, raw := range state {
		if _, ok := allowed[strings.ToLower(strings.TrimSpace(name))]; !ok {
			continue
		}
		entry := extractMap(raw)
		filtered := map[string]any{
			"enabled": entry["enabled"],
		}
		for _, key := range []string{"reason_code", "reason", "severity", "kind"} {
			if value := strings.TrimSpace(toString(entry[key])); value != "" {
				filtered[key] = value
			}
		}
		if metadata := extractMap(entry["metadata"]); len(metadata) > 0 {
			filtered["metadata"] = metadata
		}
		out[name] = filtered
	}
	return out
}

func filterExecutionFailure(errPayload map[string]any, metadataKeys ...string) map[string]any {
	if len(errPayload) == 0 {
		return nil
	}
	filtered := map[string]any{}
	for _, key := range []string{"category", "code", "message", "text_code"} {
		if value := errPayload[key]; value != nil && strings.TrimSpace(toString(value)) != "" {
			filtered[key] = value
		}
	}
	if metadata := filterExecutionFailureMetadata(extractMap(errPayload["metadata"]), metadataKeys...); len(metadata) > 0 {
		filtered["metadata"] = metadata
	}
	return filtered
}

func filterExecutionFailureMetadata(metadata map[string]any, keys ...string) map[string]any {
	if len(metadata) == 0 || len(keys) == 0 {
		return nil
	}
	allowed := map[string]struct{}{}
	for _, key := range keys {
		allowed[strings.TrimSpace(key)] = struct{}{}
	}
	filtered := map[string]any{}
	for key, value := range metadata {
		if _, ok := allowed[key]; ok {
			filtered[key] = value
		}
	}
	return filtered
}

func assertActionStateCode(t *testing.T, actionState map[string]any, actionName, code string) {
	t.Helper()
	entry := extractMap(actionState[actionName])
	require.Equal(t, code, strings.TrimSpace(toString(entry["reason_code"])), "unexpected reason_code for %s", actionName)
	require.Equal(t, false, entry["enabled"], "expected %s to be disabled", actionName)
}

func assertActionNamesPresent(t *testing.T, actions any, expected ...string) {
	t.Helper()
	seen := map[string]struct{}{}
	for _, action := range normalizeActionContracts(actions) {
		seen[strings.ToLower(strings.TrimSpace(toString(action["name"])))] = struct{}{}
	}
	for _, name := range expected {
		_, ok := seen[strings.ToLower(strings.TrimSpace(name))]
		require.True(t, ok, "expected action %s in schema.actions", name)
	}
}

func extractSlice(value any) []any {
	if values, ok := value.([]any); ok {
		return values
	}
	if values, ok := value.([]map[string]any); ok {
		out := make([]any, 0, len(values))
		for _, value := range values {
			out = append(out, value)
		}
		return out
	}
	return nil
}

func normalizeActionContracts(value any) []map[string]any {
	if actions, ok := value.([]map[string]any); ok {
		return actions
	}
	out := []map[string]any{}
	for _, item := range extractSlice(value) {
		action, _ := item.(map[string]any)
		if len(action) == 0 {
			continue
		}
		out = append(out, action)
	}
	return out
}

func extractMap(value any) map[string]any {
	if raw, ok := value.(map[string]any); ok {
		return raw
	}
	return map[string]any{}
}

const (
	httpMethodDelete = "DELETE"
	httpMethodGet    = "GET"
	httpMethodPost   = "POST"
)

func toInt(value any) int {
	switch typed := value.(type) {
	case int:
		return typed
	case int32:
		return int(typed)
	case int64:
		return int(typed)
	case float32:
		return int(typed)
	case float64:
		return int(typed)
	default:
		return 0
	}
}

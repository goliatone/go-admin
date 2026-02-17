package admin

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestTranslationPhase1ContractFixtures(t *testing.T) {
	files := []string{
		"pages_list_contract.json",
		"posts_list_contract.json",
		"news_list_contract.json",
	}
	allowedReasonCodes := map[string]struct{}{}
	for _, code := range ActionDisabledReasonCodes() {
		allowedReasonCodes[code] = struct{}{}
	}

	for _, file := range files {
		t.Run(file, func(t *testing.T) {
			payload := readPhase1Fixture(t, file)

			panel := strings.TrimSpace(toString(payload["panel"]))
			if panel == "" {
				t.Fatalf("expected panel in fixture %q", file)
			}

			schema, ok := payload["schema"].(map[string]any)
			if !ok {
				t.Fatalf("expected schema object in fixture %q", file)
			}
			rawActions, ok := schema["actions"].([]any)
			if !ok || len(rawActions) == 0 {
				t.Fatalf("expected schema.actions array in fixture %q", file)
			}
			actionsByName := map[string]map[string]any{}
			for _, raw := range rawActions {
				action, ok := raw.(map[string]any)
				if !ok {
					t.Fatalf("expected action object in fixture %q", file)
				}
				name := strings.TrimSpace(toString(action["name"]))
				if name == "" {
					t.Fatalf("expected action name in fixture %q", file)
				}
				actionsByName[name] = action
			}

			createTranslation, ok := actionsByName[CreateTranslationKey]
			if !ok {
				t.Fatalf("expected %q action in fixture %q", CreateTranslationKey, file)
			}
			if actionOrder(createTranslation) <= 0 {
				t.Fatalf("expected create_translation order in fixture %q", file)
			}
			assertCreateTranslationPayloadSchemaContract(t, createTranslation, file)

			for _, actionName := range []string{"view", "edit", "create_translation", "submit_for_approval", "publish", "delete"} {
				action, exists := actionsByName[actionName]
				if !exists {
					continue
				}
				if actionOrder(action) <= 0 {
					t.Fatalf("expected order for action %q in fixture %q", actionName, file)
				}
			}

			rawData, ok := payload["data"].([]any)
			if !ok || len(rawData) == 0 {
				t.Fatalf("expected fixture data array in %q", file)
			}
			record, ok := rawData[0].(map[string]any)
			if !ok {
				t.Fatalf("expected data[0] object in fixture %q", file)
			}
			rawState, ok := record["_action_state"].(map[string]any)
			if !ok {
				t.Fatalf("expected _action_state object in fixture %q", file)
			}

			for actionName := range actionsByName {
				entryRaw, exists := rawState[actionName]
				if !exists {
					t.Fatalf("expected _action_state entry for %q in fixture %q", actionName, file)
				}
				entry, ok := entryRaw.(map[string]any)
				if !ok {
					t.Fatalf("expected _action_state[%q] object in fixture %q", actionName, file)
				}
				enabled, ok := entry["enabled"].(bool)
				if !ok {
					t.Fatalf("expected _action_state[%q].enabled bool in fixture %q", actionName, file)
				}
				if !enabled {
					reason := strings.TrimSpace(toString(entry["reason"]))
					if reason == "" {
						t.Fatalf("expected disabled reason for %q in fixture %q", actionName, file)
					}
					reasonCode := strings.TrimSpace(toString(entry["reason_code"]))
					if reasonCode == "" {
						t.Fatalf("expected disabled reason_code for %q in fixture %q", actionName, file)
					}
					if _, allowed := allowedReasonCodes[reasonCode]; !allowed {
						t.Fatalf("unexpected reason_code %q in fixture %q", reasonCode, file)
					}
				}
			}
		})
	}
}

func readPhase1Fixture(t *testing.T, file string) map[string]any {
	t.Helper()
	path := filepath.Join("..", "pkg", "client", "assets", "tests", "fixtures", "translation_phase1", file)
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read fixture %q: %v", path, err)
	}
	payload := map[string]any{}
	if err := json.Unmarshal(raw, &payload); err != nil {
		t.Fatalf("unmarshal fixture %q: %v", path, err)
	}
	return payload
}

func assertCreateTranslationPayloadSchemaContract(t *testing.T, action map[string]any, fixtureFile string) {
	t.Helper()
	rawSchema, ok := action["payload_schema"].(map[string]any)
	if !ok {
		t.Fatalf("expected payload_schema object for create_translation in fixture %q", fixtureFile)
	}
	rawProps, ok := rawSchema["properties"].(map[string]any)
	if !ok {
		t.Fatalf("expected payload_schema.properties for create_translation in fixture %q", fixtureFile)
	}
	if _, exists := rawProps["available_locales"]; exists {
		t.Fatalf("expected create_translation payload schema to omit available_locales in fixture %q", fixtureFile)
	}
	for _, field := range []string{
		"locale",
		"missing_locales",
		"existing_locales",
		"recommended_locale",
		"required_for_publish",
	} {
		if _, exists := rawProps[field]; !exists {
			t.Fatalf("expected create_translation payload schema field %q in fixture %q", field, fixtureFile)
		}
	}
}

func actionOrder(action map[string]any) int {
	switch raw := action["order"].(type) {
	case int:
		return raw
	case int32:
		return int(raw)
	case int64:
		return int(raw)
	case float32:
		return int(raw)
	case float64:
		return int(raw)
	default:
		return 0
	}
}

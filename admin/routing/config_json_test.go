package routing

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestRootDerivationInputJSONUsesCanonicalURLsKey(t *testing.T) {
	raw := []byte(`{
		"base_path": "/admin",
		"urls": {
			"admin": {"base_path": "/console"}
		}
	}`)

	var input RootDerivationInput
	if err := json.Unmarshal(raw, &input); err != nil {
		t.Fatalf("unmarshal root derivation input: %v", err)
	}
	if input.BasePath != "/admin" {
		t.Fatalf("expected base_path to decode, got %q", input.BasePath)
	}
	if input.URLs.Admin.BasePath != "/console" {
		t.Fatalf("expected canonical urls key to decode, got %q", input.URLs.Admin.BasePath)
	}

	encoded, err := json.Marshal(RootDerivationInput{
		BasePath: "/admin",
		URLs: URLConfig{
			Admin: URLNamespaceConfig{BasePath: "/console"},
		},
	})
	if err != nil {
		t.Fatalf("marshal root derivation input: %v", err)
	}
	text := string(encoded)
	if !strings.Contains(text, `"urls"`) {
		t.Fatalf("expected canonical urls key in json, got %s", text)
	}
	if strings.Contains(text, `"ur_ls"`) {
		t.Fatalf("unexpected legacy urls key in json, got %s", text)
	}
}

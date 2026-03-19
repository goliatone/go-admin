package admin

import (
	"encoding/json"
	"reflect"
	"strings"
	"testing"
)

func TestConfigJSONUsesCanonicalURLsKey(t *testing.T) {
	raw := []byte(`{
		"base_path": "/admin",
		"urls": {
			"admin": {"base_path": "/console"},
			"public": {"api_prefix": "gateway"}
		}
	}`)

	var cfg Config
	if err := json.Unmarshal(raw, &cfg); err != nil {
		t.Fatalf("unmarshal config: %v", err)
	}
	if cfg.URLs.Admin.BasePath != "/console" {
		t.Fatalf("expected admin urls base path to decode, got %q", cfg.URLs.Admin.BasePath)
	}
	if cfg.URLs.Public.APIPrefix != "gateway" {
		t.Fatalf("expected public urls api prefix to decode, got %q", cfg.URLs.Public.APIPrefix)
	}

	field, ok := reflect.TypeOf(Config{}).FieldByName("URLs")
	if !ok {
		t.Fatal("expected Config.URLs field")
	}
	if got := field.Tag.Get("json"); got != "urls" {
		t.Fatalf("expected Config.URLs json tag urls, got %q", got)
	}
}

func TestDebugConfigJSONUsesCanonicalAllowedIPsKey(t *testing.T) {
	raw := []byte(`{
		"allowed_ips": ["127.0.0.1"],
		"repl": {
			"allowed_ips": ["10.0.0.1"]
		}
	}`)

	var cfg DebugConfig
	if err := json.Unmarshal(raw, &cfg); err != nil {
		t.Fatalf("unmarshal debug config: %v", err)
	}
	if len(cfg.AllowedIPs) != 1 || cfg.AllowedIPs[0] != "127.0.0.1" {
		t.Fatalf("expected debug allowed_ips to decode, got %#v", cfg.AllowedIPs)
	}
	if len(cfg.Repl.AllowedIPs) != 1 || cfg.Repl.AllowedIPs[0] != "10.0.0.1" {
		t.Fatalf("expected repl allowed_ips to decode, got %#v", cfg.Repl.AllowedIPs)
	}

	field, ok := reflect.TypeOf(DebugConfig{}).FieldByName("AllowedIPs")
	if !ok {
		t.Fatal("expected DebugConfig.AllowedIPs field")
	}
	if got := field.Tag.Get("json"); got != "allowed_ips" {
		t.Fatalf("expected DebugConfig.AllowedIPs json tag allowed_ips, got %q", got)
	}
	replField, ok := reflect.TypeOf(DebugREPLConfig{}).FieldByName("AllowedIPs")
	if !ok {
		t.Fatal("expected DebugREPLConfig.AllowedIPs field")
	}
	if got := replField.Tag.Get("json"); got != "allowed_ips" {
		t.Fatalf("expected DebugREPLConfig.AllowedIPs json tag allowed_ips, got %q", got)
	}
}

func TestBulkRoleChangeRequestJSONUsesCanonicalUserIDsKey(t *testing.T) {
	raw := []byte(`{"user_ids":["user-1","user-2"],"role_id":"role-1","assign":true}`)

	var req BulkRoleChangeRequest
	if err := json.Unmarshal(raw, &req); err != nil {
		t.Fatalf("unmarshal bulk role change request: %v", err)
	}
	if len(req.UserIDs) != 2 || req.UserIDs[0] != "user-1" || req.UserIDs[1] != "user-2" {
		t.Fatalf("expected canonical user_ids to decode, got %#v", req.UserIDs)
	}

	encoded, err := json.Marshal(BulkRoleChangeRequest{
		UserIDs: []string{"user-1"},
		RoleID:  "role-1",
	})
	if err != nil {
		t.Fatalf("marshal bulk role change request: %v", err)
	}
	text := string(encoded)
	if !strings.Contains(text, `"user_ids"`) {
		t.Fatalf("expected canonical user_ids key in json, got %s", text)
	}
	if strings.Contains(text, `"user_i_ds"`) {
		t.Fatalf("unexpected legacy user_i_ds key in json, got %s", text)
	}
}

package release

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestV2SourceManagementContractManifestSnapshot(t *testing.T) {
	repoRoot, err := DefaultRepoRoot()
	if err != nil {
		t.Fatalf("DefaultRepoRoot: %v", err)
	}
	data, err := MarshalV2SourceManagementContractManifest()
	if err != nil {
		t.Fatalf("MarshalV2SourceManagementContractManifest: %v", err)
	}

	path := DefaultV2SourceManagementContractManifestPath(repoRoot)
	if os.Getenv("UPDATE_FIXTURES") == "1" {
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			t.Fatalf("mkdir manifest dir: %v", err)
		}
		if err := os.WriteFile(path, append(data, '\n'), 0o644); err != nil {
			t.Fatalf("write manifest snapshot: %v", err)
		}
	}

	expected, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read manifest snapshot: %v", err)
	}
	if strings.TrimSpace(string(expected)) != strings.TrimSpace(string(data)) {
		t.Fatalf("v2 source-management contract manifest drift detected")
	}
}

func TestV2SourceManagementContractManifestCoversRequiredFamilies(t *testing.T) {
	manifest := BuildV2SourceManagementContractManifest()
	if manifest.SchemaVersion != v2SourceManagementContractManifestSchemaVersion {
		t.Fatalf("expected schema version %d, got %d", v2SourceManagementContractManifestSchemaVersion, manifest.SchemaVersion)
	}

	requiredEndpoints := map[string]string{
		"GET /admin/api/v1/esign/sources":                                       "SourceListPage",
		"GET /admin/api/v1/esign/sources/:source_document_id":                   "SourceDetail",
		"GET /admin/api/v1/esign/sources/:source_document_id/revisions":         "SourceRevisionPage",
		"GET /admin/api/v1/esign/sources/:source_document_id/relationships":     "SourceRelationshipPage",
		"GET /admin/api/v1/esign/sources/:source_document_id/comments":          "SourceCommentPage",
		"GET /admin/api/v1/esign/source-revisions/:source_revision_id/comments": "SourceCommentPage",
		"GET /admin/api/v1/esign/source-search":                                 "SourceSearchResults",
	}
	seenEndpoints := make(map[string]string, len(manifest.Endpoints))
	for _, endpoint := range manifest.Endpoints {
		seenEndpoints[endpoint.Method+" "+endpoint.Path] = endpoint.ResponseSchema
	}
	for key, responseSchema := range requiredEndpoints {
		if got := strings.TrimSpace(seenEndpoints[key]); got != responseSchema {
			t.Fatalf("expected endpoint %s => %s, got %q", key, responseSchema, got)
		}
	}

	requiredSchemas := map[string][]string{
		"SourceDetail":          {"provider", "active_handle", "latest_revision", "permissions", "links"},
		"SourceCommentPage":     {"items", "sync_status", "sync", "permissions", "links"},
		"SourceSearchResults":   {"items", "applied_query", "permissions", "links"},
		"SourceProviderSummary": {"kind", "label", "extension"},
	}
	manifestByName := make(map[string]V2SourceManagementContractSchema, len(manifest.Schemas))
	for _, schema := range manifest.Schemas {
		manifestByName[schema.Name] = schema
	}
	for schemaName, requiredFields := range requiredSchemas {
		schema, ok := manifestByName[schemaName]
		if !ok {
			t.Fatalf("expected schema %s in manifest", schemaName)
		}
		fields := make(map[string]struct{}, len(schema.Fields))
		for _, field := range schema.Fields {
			fields[field.Name] = struct{}{}
		}
		for _, requiredField := range requiredFields {
			if _, ok := fields[requiredField]; !ok {
				t.Fatalf("expected schema %s to include field %s", schemaName, requiredField)
			}
		}
	}

	providerSchema := manifestByName["SourceProviderSummary"]
	for _, field := range providerSchema.Fields {
		if strings.HasPrefix(field.Name, "google_") {
			t.Fatalf("expected provider-neutral schema fields, found %s", field.Name)
		}
	}
}

func TestV2SourceManagementContractManifestJSONRemainsProviderNeutral(t *testing.T) {
	data, err := MarshalV2SourceManagementContractManifest()
	if err != nil {
		t.Fatalf("MarshalV2SourceManagementContractManifest: %v", err)
	}
	var payload map[string]any
	if err := json.Unmarshal(data, &payload); err != nil {
		t.Fatalf("Unmarshal manifest JSON: %v", err)
	}
	if err := rejectGoogleSpecificJSONKeys(payload, "manifest"); err != nil {
		t.Fatalf("expected provider-neutral manifest keys: %v", err)
	}
}

func TestDefaultV2SourceManagementContractSourcePathsTracksManifestInputs(t *testing.T) {
	manifest := BuildV2SourceManagementContractManifest()
	paths := DefaultV2SourceManagementContractSourcePaths()
	if len(paths) != len(manifest.GeneratedFrom) {
		t.Fatalf("expected contract source paths to match generated_from list, got %+v vs %+v", paths, manifest.GeneratedFrom)
	}
	for idx, path := range manifest.GeneratedFrom {
		if strings.TrimSpace(paths[idx]) != strings.TrimSpace(path) {
			t.Fatalf("expected contract source path %d to be %q, got %q", idx, path, paths[idx])
		}
	}
}

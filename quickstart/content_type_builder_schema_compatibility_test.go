package quickstart

import (
	"context"
	"maps"
	"net/http"
	"testing"

	"github.com/goliatone/go-admin/admin"
	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
)

func TestMergeContentTypeSchemaPreservesBaseDefsAndMetadataWithoutOverwritingIncoming(t *testing.T) {
	base := map[string]any{
		"$defs": map[string]any{
			"shared": map[string]any{"type": "string"},
		},
		"metadata": map[string]any{
			"slug":           "post",
			"schema_version": "v1",
			"stable":         true,
		},
	}
	incoming := map[string]any{
		"type": "object",
		"$defs": map[string]any{
			"local": map[string]any{"type": "number"},
		},
		"metadata": map[string]any{
			"slug": "override",
		},
	}

	merged := mergeContentTypeSchema(base, incoming)
	defs, _ := merged["$defs"].(map[string]any)
	meta, _ := merged["metadata"].(map[string]any)

	if _, ok := defs["shared"]; !ok {
		t.Fatalf("expected base $defs entry to be merged")
	}
	if _, ok := defs["local"]; !ok {
		t.Fatalf("expected incoming $defs entry to be preserved")
	}
	if got := meta["slug"]; got != "override" {
		t.Fatalf("expected incoming metadata to win, got %v", got)
	}
	if got := meta["stable"]; got != true {
		t.Fatalf("expected missing base metadata to be merged, got %v", got)
	}

	baseDefs := base["$defs"].(map[string]any)
	delete(defs, "shared")
	if _, ok := baseDefs["shared"]; !ok {
		t.Fatalf("expected merged schema to clone base defs")
	}
}

func TestNormalizeCompatibilitySchemaConvertsLegacyFieldContracts(t *testing.T) {
	legacy := map[string]any{
		"fields": []any{
			map[string]any{"name": "title", "type": "string", "required": true},
			map[string]any{"name": "count", "schema": map[string]any{"type": "integer"}},
		},
		"additionalProperties": true,
	}

	normalized := normalizeCompatibilitySchema(legacy)
	props := extractProperties(normalized)
	required := requiredSet(normalized)

	if got := normalized["type"]; got != "object" {
		t.Fatalf("expected object schema, got %v", got)
	}
	if got := props["title"].(map[string]any)["type"]; got != "string" {
		t.Fatalf("expected title field to normalize string type, got %v", got)
	}
	if got := props["count"].(map[string]any)["type"]; got != "integer" {
		t.Fatalf("expected count field schema to be preserved, got %v", got)
	}
	if !required["title"] {
		t.Fatalf("expected title to remain required")
	}
	if got := normalized["additionalProperties"]; got != true {
		t.Fatalf("expected additionalProperties override, got %v", got)
	}
}

func TestCheckSchemaCompatibilityDetectsBreakingRequiredFieldAddition(t *testing.T) {
	oldSchema := map[string]any{
		"type": "object",
		"properties": map[string]any{
			"title": map[string]any{"type": "string"},
		},
	}
	newSchema := map[string]any{
		"type": "object",
		"properties": map[string]any{
			"title":   map[string]any{"type": "string"},
			"summary": map[string]any{"type": "string"},
		},
		"required": []string{"summary"},
	}

	result := checkSchemaCompatibility(oldSchema, newSchema)

	if result.Compatible {
		t.Fatalf("expected required field addition to be incompatible")
	}
	if result.ChangeLevel != compatChangeMajor {
		t.Fatalf("expected major change level, got %v", result.ChangeLevel)
	}
	if len(result.BreakingChanges) == 0 || result.BreakingChanges[0].Type != "required_added" {
		t.Fatalf("expected required_added breaking change, got %+v", result.BreakingChanges)
	}
}

func TestCompatibilityChangesFallsBackToWarningsForCompatibleExpansion(t *testing.T) {
	oldSchema := map[string]any{
		"type": "object",
		"properties": map[string]any{
			"status": map[string]any{
				"type": "string",
				"enum": []string{"draft"},
			},
		},
	}
	newSchema := map[string]any{
		"type": "object",
		"properties": map[string]any{
			"status": map[string]any{
				"type": "string",
				"enum": []string{"draft", "published"},
			},
			"summary": map[string]any{"type": "string"},
		},
	}

	breaking, warnings := compatibilityChanges(oldSchema, newSchema)

	if len(breaking) != 0 {
		t.Fatalf("expected no breaking changes, got %+v", breaking)
	}
	if len(warnings) < 2 {
		t.Fatalf("expected enum expansion and field-addition warnings, got %+v", warnings)
	}
}

type compatibilityPanelRepo struct {
	record map[string]any
}

func (r *compatibilityPanelRepo) List(context.Context, admin.ListOptions) ([]map[string]any, int, error) {
	return nil, 0, nil
}

func (r *compatibilityPanelRepo) Get(_ context.Context, id string) (map[string]any, error) {
	if id != "type-1" && id != "post" {
		return nil, admin.ErrNotFound
	}
	out := map[string]any{}
	maps.Copy(out, r.record)
	return out, nil
}

func (r *compatibilityPanelRepo) Create(_ context.Context, record map[string]any) (map[string]any, error) {
	return record, nil
}

func (r *compatibilityPanelRepo) Update(_ context.Context, id string, record map[string]any) (map[string]any, error) {
	return record, nil
}

func (r *compatibilityPanelRepo) Delete(context.Context, string) error { return nil }

func TestContentTypeCompatibilityUsesExtractedSchemaCompatibilityRuntime(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	svc := &stubContentTypeService{
		ct: admin.CMSContentType{ID: "type-1", Slug: "post", Name: "Post"},
	}
	adm, err := admin.New(cfg, admin.Dependencies{
		Registry:     admin.NewRegistry(),
		CMSContainer: stubCMSContainer{types: svc},
	})
	if err != nil {
		t.Fatalf("admin setup: %v", err)
	}

	repo := &compatibilityPanelRepo{
		record: map[string]any{
			"id":   "type-1",
			"slug": "post",
			"schema": map[string]any{
				"type": "object",
				"properties": map[string]any{
					"title": map[string]any{"type": "string"},
				},
			},
		},
	}
	panel := adm.Panel("content_types").WithRepository(repo)
	if _, err := adm.RegisterPanel("content_types", panel); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	handlers := newContentTypeBuilderHandlers(adm, cfg, nil, "", "")
	claims := &auth.JWTClaims{UserRole: string(auth.RoleAdmin)}
	ctx := router.NewMockContext()
	ctx.On("Context").Return(auth.WithClaimsContext(context.Background(), claims))
	ctx.ParamsM["id"] = "type-1"
	ctx.On("Body").Return([]byte(`{"schema":{"type":"object","properties":{"title":{"type":"string"},"summary":{"type":"string"}}}}`))

	var payload map[string]any
	ctx.On("JSON", http.StatusOK, mock.Anything).Run(func(args mock.Arguments) {
		if body, ok := args.Get(1).(map[string]any); ok {
			payload = body
		}
	}).Return(nil)

	if err := handlers.ContentTypeCompatibility(ctx); err != nil {
		t.Fatalf("compatibility route: %v", err)
	}
	if payload == nil {
		t.Fatalf("expected compatibility payload")
	}
	if got, _ := payload["compatible"].(bool); !got {
		t.Fatalf("expected compatible response, got %+v", payload)
	}
	if got, _ := payload["migration_required"].(bool); got {
		t.Fatalf("expected no migration_required flag, got %+v", payload)
	}
	if breaking, _ := payload["breaking_changes"].([]schemaChange); len(breaking) != 0 {
		t.Fatalf("expected no breaking changes, got %+v", breaking)
	}
	if warnings, _ := payload["warnings"].([]schemaChange); len(warnings) == 0 {
		t.Fatalf("expected warning entries for compatible schema expansion, got %+v", payload["warnings"])
	}
}

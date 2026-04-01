package cmsadapter

import (
	"reflect"
	"testing"
	"time"

	cmsblocks "github.com/goliatone/go-cms/blocks"
	"github.com/google/uuid"
)

func TestConvertBlockDefinitionClonesAndNormalizesFields(t *testing.T) {
	t.Parallel()

	desc := "Hero section"
	icon := "sparkles"
	category := "layout"
	schema := map[string]any{
		"x-block-type": "hero",
		"metadata": map[string]any{
			"schema_version":   "v2",
			"migration_status": "clean",
		},
	}
	uiSchema := map[string]any{"layout": "stacked"}

	def := &cmsblocks.Definition{
		ID:            uuid.New(),
		Name:          "Hero",
		Slug:          "hero-banner",
		Description:   &desc,
		Icon:          &icon,
		Category:      &category,
		Status:        "active",
		Schema:        schema,
		UISchema:      uiSchema,
		SchemaVersion: "",
	}

	got := ConvertBlockDefinition(reflect.ValueOf(def))

	if got.ID != "hero-banner" {
		t.Fatalf("expected slug-backed ID, got %q", got.ID)
	}
	if got.Type != "hero" {
		t.Fatalf("expected schema-derived type, got %q", got.Type)
	}
	if got.SchemaVersion != "v2" {
		t.Fatalf("expected schema-derived version, got %q", got.SchemaVersion)
	}
	if got.MigrationStatus != "clean" {
		t.Fatalf("expected schema-derived migration status, got %q", got.MigrationStatus)
	}
	if got.Description != desc || !got.DescriptionSet {
		t.Fatalf("expected description and DescriptionSet to be populated: %+v", got)
	}
	if got.Icon != icon || !got.IconSet {
		t.Fatalf("expected icon and IconSet to be populated: %+v", got)
	}
	if got.Category != category || !got.CategorySet {
		t.Fatalf("expected category and CategorySet to be populated: %+v", got)
	}
	if !reflect.DeepEqual(got.Schema, schema) {
		t.Fatalf("expected schema clone to match input, got %+v", got.Schema)
	}
	if !reflect.DeepEqual(got.UISchema, uiSchema) {
		t.Fatalf("expected ui schema clone to match input, got %+v", got.UISchema)
	}

	got.Schema["mutated"] = true
	got.UISchema["mutated"] = true
	if _, ok := schema["mutated"]; ok {
		t.Fatalf("expected source schema to remain unchanged: %+v", schema)
	}
	if _, ok := uiSchema["mutated"]; ok {
		t.Fatalf("expected source ui schema to remain unchanged: %+v", uiSchema)
	}
}

func TestConvertBlockDefinitionSupportsLegacyEnvironmentFallbacks(t *testing.T) {
	t.Parallel()

	type legacyBlockDefinition struct {
		ID          string
		Name        string
		Schema      map[string]any
		Environment string
	}

	got := ConvertBlockDefinition(reflect.ValueOf(&legacyBlockDefinition{
		ID:          "def-1",
		Name:        "Hero",
		Environment: "preview",
		Schema: map[string]any{
			"x-admin": map[string]any{
				"migration_status": "pending",
			},
		},
	}))

	if got.ID != "Hero" {
		t.Fatalf("expected name-backed ID fallback, got %q", got.ID)
	}
	if BlockDefinitionChannel(got) != "preview" {
		t.Fatalf("expected environment fallback channel %q, got %q", "preview", BlockDefinitionChannel(got))
	}
	if got.MigrationStatus != "pending" {
		t.Fatalf("expected x-admin migration status, got %q", got.MigrationStatus)
	}
	if got.Type != "Hero" {
		t.Fatalf("expected final type fallback to name, got %q", got.Type)
	}
}

func TestConvertBlockDefinitionVersionClonesAndDerivesFields(t *testing.T) {
	t.Parallel()

	now := time.Now().UTC().Truncate(time.Second)
	schema := map[string]any{
		"metadata": map[string]any{
			"migration_status": "outdated",
		},
	}
	defaults := map[string]any{"theme": "light"}
	version := &cmsblocks.DefinitionVersion{
		ID:            uuid.New(),
		DefinitionID:  uuid.New(),
		SchemaVersion: "v5",
		Schema:        schema,
		Defaults:      defaults,
		CreatedAt:     now,
		UpdatedAt:     now.Add(time.Minute),
	}

	got := ConvertBlockDefinitionVersion(reflect.ValueOf(version))

	if got.ID != version.ID.String() {
		t.Fatalf("expected version ID %q, got %q", version.ID.String(), got.ID)
	}
	if got.DefinitionID != version.DefinitionID.String() {
		t.Fatalf("expected definition ID %q, got %q", version.DefinitionID.String(), got.DefinitionID)
	}
	if got.SchemaVersion != "v5" {
		t.Fatalf("expected schema version %q, got %q", "v5", got.SchemaVersion)
	}
	if got.MigrationStatus != "outdated" {
		t.Fatalf("expected derived migration status %q, got %q", "outdated", got.MigrationStatus)
	}
	if !got.CreatedAt.Equal(now) || !got.UpdatedAt.Equal(now.Add(time.Minute)) {
		t.Fatalf("unexpected timestamps: %+v", got)
	}

	got.Schema["mutated"] = true
	got.Defaults["mutated"] = true
	if _, ok := schema["mutated"]; ok {
		t.Fatalf("expected source schema to remain unchanged: %+v", schema)
	}
	if _, ok := defaults["mutated"]; ok {
		t.Fatalf("expected source defaults to remain unchanged: %+v", defaults)
	}
}

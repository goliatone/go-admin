package main

import (
	"context"
	"io"
	"io/fs"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/examples/web/helpers"
	formgenopenapi "github.com/goliatone/go-formgen/pkg/openapi"
	formgenorchestrator "github.com/goliatone/go-formgen/pkg/orchestrator"
	formgenrender "github.com/goliatone/go-formgen/pkg/render"
)

func TestUserProfilesTimezoneFieldHasRelationshipEndpointMetadata(t *testing.T) {
	openapiFS, err := fs.Sub(webFS, "openapi")
	if err != nil {
		t.Fatalf("openapi sub fs: %v", err)
	}

	gen := helpers.NewUserFormGenerator(openapiFS, nil)
	if gen == nil {
		t.Fatalf("expected form generator")
	}

	for _, operationID := range []string{"createUserProfile", "updateUserProfile"} {
		html, err := gen.Generate(context.Background(), formgenorchestrator.Request{
			Source:      formgenopenapi.SourceFromFS("user_profiles.json"),
			OperationID: operationID,
		})
		if err != nil {
			t.Fatalf("generate %s: %v", operationID, err)
		}

		output := string(html)
		assertContains(t, output, `name="timezone"`)
		assertContains(t, output, `data-endpoint-url="/admin/api/timezones"`)
		assertContains(t, output, `data-endpoint-mode="search"`)
		assertContains(t, output, `data-endpoint-search-param="q"`)
		assertContains(t, output, `data-endpoint-results-path="data"`)
		assertContains(t, output, `data-endpoint-params-format="options"`)
		assertContains(t, output, `data-endpoint-params-limit="50"`)
	}
}

func TestUserProfilesTimezoneEditRendersCurrentValueMetadata(t *testing.T) {
	openapiFS, err := fs.Sub(webFS, "openapi")
	if err != nil {
		t.Fatalf("openapi sub fs: %v", err)
	}

	gen := helpers.NewUserFormGenerator(openapiFS, nil)
	if gen == nil {
		t.Fatalf("expected form generator")
	}

	html, err := gen.Generate(context.Background(), formgenorchestrator.Request{
		Source:      formgenopenapi.SourceFromFS("user_profiles.json"),
		OperationID: "updateUserProfile",
		RenderOptions: formgenrender.RenderOptions{
			Values: map[string]any{
				"timezone": "Europe/Paris",
			},
		},
	})
	if err != nil {
		t.Fatalf("generate updateUserProfile: %v", err)
	}

	output := string(html)
	assertContains(t, output, `name="timezone"`)
	assertContains(t, output, `data-relationship-current="Europe/Paris"`)
}

func TestUserProfilesTemplateLoadsRelationshipsRuntime(t *testing.T) {
	f, err := webFS.Open("templates/resources/user-profiles/form.html")
	if err != nil {
		t.Fatalf("open template: %v", err)
	}
	defer func() { _ = f.Close() }()

	raw, err := io.ReadAll(f)
	if err != nil {
		t.Fatalf("read template: %v", err)
	}
	content := string(raw)
	assertContains(t, content, `/runtime/formgen-relationships.min.js`)
	assertContains(t, content, `initRelationships`)
}

func assertContains(t *testing.T, haystack, needle string) {
	t.Helper()
	if !strings.Contains(haystack, needle) {
		t.Fatalf("expected output to contain %q", needle)
	}
}

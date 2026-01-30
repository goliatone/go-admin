package quickstart

import (
	"context"
	"net/http"
	"reflect"
	"testing"

	"github.com/goliatone/go-admin/admin"
	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
)

func TestBlockDefinitionFieldTypesGroupingAndOrder(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	handlers := newContentTypeBuilderHandlers(nil, cfg, nil, "", "")

	claims := &auth.JWTClaims{UserRole: string(auth.RoleAdmin)}
	ctx := router.NewMockContext()
	ctx.On("Context").Return(auth.WithClaimsContext(context.Background(), claims))

	var payload map[string]any
	ctx.On("JSON", http.StatusOK, mock.Anything).Run(func(args mock.Arguments) {
		if val, ok := args.Get(1).(map[string]any); ok {
			payload = val
		}
	}).Return(nil)

	if err := handlers.BlockDefinitionFieldTypes(ctx); err != nil {
		t.Fatalf("block definition field types handler: %v", err)
	}
	if payload == nil {
		t.Fatalf("expected payload")
	}

	groupsAny, ok := payload["categories"]
	if !ok {
		t.Fatalf("expected categories in payload")
	}
	groups, ok := groupsAny.([]admin.FieldTypeCategoryGroup)
	if !ok {
		t.Fatalf("expected categories to be []admin.FieldTypeCategoryGroup, got %T", groupsAny)
	}

	expectedCategories := []string{"text", "media", "choice", "number", "datetime", "relationship", "structure", "advanced"}
	if len(groups) != len(expectedCategories) {
		t.Fatalf("expected %d category groups, got %d", len(expectedCategories), len(groups))
	}
	for i, expected := range expectedCategories {
		if groups[i].Category.ID != expected {
			t.Fatalf("expected category %q at %d, got %q", expected, i, groups[i].Category.ID)
		}
		for _, def := range groups[i].FieldTypes {
			if def.Category != expected {
				t.Fatalf("expected field type %q to belong to %q, got %q", def.Type, expected, def.Category)
			}
		}
	}

	textExpected := []string{"string", "text", "richtext", "slug", "url", "email"}
	if got := fieldTypeIDs(groups[0].FieldTypes); !reflect.DeepEqual(got, textExpected) {
		t.Fatalf("unexpected text field types order: %v", got)
	}

	mediaExpected := []string{"image", "file"}
	if got := fieldTypeIDs(groups[1].FieldTypes); !reflect.DeepEqual(got, mediaExpected) {
		t.Fatalf("unexpected media field types order: %v", got)
	}
}

func fieldTypeIDs(defs []admin.FieldTypeDefinition) []string {
	out := make([]string, 0, len(defs))
	for _, def := range defs {
		out = append(out, def.Type)
	}
	return out
}

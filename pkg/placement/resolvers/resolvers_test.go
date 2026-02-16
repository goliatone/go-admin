package resolvers

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/pkg/placement/models"
)

func TestResolverContractConformance(t *testing.T) {
	ctx := context.Background()
	input := ResolveInput{
		FieldDefinitions: []models.FieldDefinition{
			{ID: "field-1", FieldType: "signature", Label: "Signer Signature", Required: true},
		},
	}
	resolvers := []PlacementResolver{
		NativePDFFormsResolver{},
		TextAnchorResolver{},
		OCRAnchorResolver{},
		MLLayoutResolver{},
	}
	for _, resolver := range resolvers {
		id := resolver.ID()
		if id == "" {
			t.Fatalf("expected resolver ID")
		}
		estimate, err := resolver.Estimate(ctx, input)
		if err != nil {
			t.Fatalf("%s Estimate: %v", id, err)
		}
		if estimate.ResolverID == "" {
			t.Fatalf("%s expected estimate resolver id", id)
		}
		result, err := resolver.Resolve(ctx, input)
		if err != nil {
			t.Fatalf("%s Resolve: %v", id, err)
		}
		if len(result.Suggestions) == 0 && len(result.UnresolvedDefinitionIDs) == 0 {
			t.Fatalf("%s expected suggestions or unresolved field IDs", id)
		}
	}
}

func TestNativePDFFormsResolverProducesSuggestionsFromNativeFields(t *testing.T) {
	resolver := NativePDFFormsResolver{}
	ctx := context.Background()

	pdf := []byte(`%PDF-1.7
1 0 obj
<< /Type /Annot /Subtype /Widget /T (Signer Signature) /Rect [100 200 240 240] >>
endobj
2 0 obj
<< /Type /Annot /Subtype /Widget /T (Signer Name) /Rect [120 260 300 292] >>
endobj`)

	result, err := resolver.Resolve(ctx, ResolveInput{
		DocumentBytes: pdf,
		FieldDefinitions: []models.FieldDefinition{
			{ID: "field-signature", FieldType: "signature", Label: "Signer Signature", Required: true},
			{ID: "field-name", FieldType: "name", Label: "Signer Name", Required: true},
		},
	})
	if err != nil {
		t.Fatalf("Resolve: %v", err)
	}
	if len(result.Suggestions) != 2 {
		t.Fatalf("expected 2 suggestions, got %d", len(result.Suggestions))
	}
	for _, suggestion := range result.Suggestions {
		if suggestion.Geometry.PageNumber != 1 {
			t.Fatalf("expected page 1, got %d", suggestion.Geometry.PageNumber)
		}
		if suggestion.Geometry.Width <= 0 || suggestion.Geometry.Height <= 0 {
			t.Fatalf("expected positive geometry, got %+v", suggestion.Geometry)
		}
		if suggestion.ResolverID != NativePDFFormsResolverID {
			t.Fatalf("expected resolver %q, got %q", NativePDFFormsResolverID, suggestion.ResolverID)
		}
	}
}

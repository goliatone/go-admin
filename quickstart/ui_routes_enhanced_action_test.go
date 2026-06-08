package quickstart

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestTranslationSSRInputCarriesEnhancedActionRuntimeOptions(t *testing.T) {
	options := uiRouteOptions{
		basePath: "/admin",
		enhancedActionRuntime: admin.EnhancedActionRuntimeOptions{
			RequestHeader:      "X-App-Action",
			RequestHeaderValue: "opaque-marker",
			Accept:             "application/vnd.example.action+json",
		},
	}

	input := translationSSRInput(nil, options, "/admin/api")

	if input.EnhancedAction != options.enhancedActionRuntime {
		t.Fatalf("expected enhanced action runtime options to be carried into SSR input, got %+v", input.EnhancedAction)
	}
}

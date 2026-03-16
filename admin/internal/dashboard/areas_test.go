package dashboard

import (
	"testing"

	uiplacement "github.com/goliatone/go-admin/ui/placement"
)

func TestDefaultAreaDefinitionsStayAlignedWithSharedDashboardPlacements(t *testing.T) {
	preferred := uiplacement.PreferredDashboardAreaCodes()
	definitions := DefaultAreaDefinitions()
	if len(definitions) != len(preferred) {
		t.Fatalf("expected %d default area definitions, got %d", len(preferred), len(definitions))
	}

	for idx, definition := range definitions {
		if definition.Code != preferred[idx] {
			t.Fatalf("expected definition %d code %q, got %q", idx, preferred[idx], definition.Code)
		}
	}
}

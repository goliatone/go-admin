package dashboard

import "testing"

func TestAreaCodeForPlacementUsesCanonicalCodes(t *testing.T) {
	if got := AreaCodeForPlacement(PlacementMain, ""); got != AreaCodeMain {
		t.Fatalf("expected main placement to resolve to %q, got %q", AreaCodeMain, got)
	}
	if got := AreaCodeForPlacement(PlacementSidebar, ""); got != AreaCodeSidebar {
		t.Fatalf("expected sidebar placement to resolve to %q, got %q", AreaCodeSidebar, got)
	}
	if got := AreaCodeForPlacement(PlacementFooter, ""); got != AreaCodeFooter {
		t.Fatalf("expected footer placement to resolve to %q, got %q", AreaCodeFooter, got)
	}
	if got := AreaCodeForPlacement(AreaPlacement("custom"), "admin.custom"); got != "admin.custom" {
		t.Fatalf("expected fallback area for unknown placement, got %q", got)
	}
}

func TestPreferredAreaCodesAndDefinitionsStayAligned(t *testing.T) {
	preferred := PreferredAreaCodes()
	if len(preferred) != 3 {
		t.Fatalf("expected three preferred areas, got %d", len(preferred))
	}

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

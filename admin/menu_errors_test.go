package admin

import (
	"errors"
	"testing"

	cms "github.com/goliatone/go-cms"
)

func TestNormalizeMenuTargetErrorMapsExplicitMenuTargetMisses(t *testing.T) {
	tests := []struct {
		name string
		err  error
	}{
		{
			name: "menu not found sentinel",
			err:  normalizeMenuTargetError(cms.ErrMenuNotFound),
		},
		{
			name: "go-cms menu item path message",
			err:  normalizeMenuTargetError(errors.New(`cms: menu item "admin_main.missing" not found`)),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if !errors.Is(tt.err, ErrMenuTargetNotFound) {
				t.Fatalf("expected ErrMenuTargetNotFound, got %v", tt.err)
			}
			if !isMenuTargetMissing(tt.err) {
				t.Fatalf("expected missing menu target classification, got %v", tt.err)
			}
		})
	}
}

func TestNormalizeMenuTargetErrorDoesNotGuessOnGenericNotFoundStrings(t *testing.T) {
	err := normalizeMenuTargetError(errors.New("report item not found in cache"))
	if errors.Is(err, ErrMenuTargetNotFound) {
		t.Fatalf("expected generic not-found string not to be treated as menu target miss: %v", err)
	}
}

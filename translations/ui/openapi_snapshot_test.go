package ui

import (
	"os"
	"path/filepath"
	"testing"
)

func TestTranslationOpenAPISnapshotMatchesCommittedArtifact(t *testing.T) {
	path := filepath.Join("openapi", "translations.json")
	want, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read committed openapi artifact: %v", err)
	}
	got := OpenAPISpec()
	if string(got) != string(want) {
		t.Fatalf("translation openapi snapshot drift detected")
	}
}

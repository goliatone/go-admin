package primitives

import (
	"os"
	"path/filepath"
	"testing"
)

func TestNormalizeFilePath(t *testing.T) {
	t.Parallel()

	if _, err := NormalizeFilePath("   "); err == nil {
		t.Fatal("expected blank path to fail")
	}

	got, err := NormalizeFilePath(" ./testdata/../fixtures/config.json ")
	if err != nil {
		t.Fatalf("NormalizeFilePath returned error: %v", err)
	}
	if got != filepath.Clean("./testdata/../fixtures/config.json") {
		t.Fatalf("unexpected normalized path %q", got)
	}
}

func TestReadTrustedFile(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")
	if err := os.WriteFile(path, []byte("payload"), 0o600); err != nil {
		t.Fatalf("write fixture: %v", err)
	}

	got, err := ReadTrustedFile(filepath.Join(dir, ".", "config.json"))
	if err != nil {
		t.Fatalf("ReadTrustedFile returned error: %v", err)
	}
	if string(got) != "payload" {
		t.Fatalf("unexpected payload %q", string(got))
	}
}

func TestOpenTrustedFile(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")
	if err := os.WriteFile(path, []byte("payload"), 0o600); err != nil {
		t.Fatalf("write fixture: %v", err)
	}

	file, err := OpenTrustedFile(filepath.Join(dir, ".", "config.json"))
	if err != nil {
		t.Fatalf("OpenTrustedFile returned error: %v", err)
	}
	defer func() {
		if closeErr := file.Close(); closeErr != nil {
			t.Fatalf("close trusted file: %v", closeErr)
		}
	}()

	info, err := file.Stat()
	if err != nil {
		t.Fatalf("stat opened file: %v", err)
	}
	if info.Name() != "config.json" {
		t.Fatalf("unexpected file name %q", info.Name())
	}
}

package passwordhash

import (
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	auth "github.com/goliatone/go-auth"
	"golang.org/x/crypto/bcrypt"
)

func TestHashPasswordUsesMinimumCostDuringTests(t *testing.T) {
	hash, err := HashPassword("secret")
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}

	cost, err := bcrypt.Cost([]byte(hash))
	if err != nil {
		t.Fatalf("read bcrypt cost: %v", err)
	}
	if cost != bcrypt.MinCost {
		t.Fatalf("expected bcrypt cost %d, got %d", bcrypt.MinCost, cost)
	}
}

func TestHashPasswordRejectsEmptyPassword(t *testing.T) {
	hash, err := HashPassword("")
	if hash != "" {
		t.Fatalf("expected empty hash, got %q", hash)
	}
	if !errors.Is(err, auth.ErrNoEmptyString) {
		t.Fatalf("expected ErrNoEmptyString, got %v", err)
	}
}

func TestExamplePackagesDelegateToInternalPasswordHash(t *testing.T) {
	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve current test file")
	}
	webDir := filepath.Clean(filepath.Join(filepath.Dir(currentFile), "..", ".."))

	for _, packageName := range []string{"handlers", "setup", "stores"} {
		path := filepath.Join(webDir, packageName, "password_hash.go")
		contents, err := os.ReadFile(path)
		if err != nil {
			t.Fatalf("read %s: %v", path, err)
		}
		source := string(contents)
		if !strings.Contains(source, "internal/passwordhash") {
			t.Fatalf("%s must delegate to the internal password hash owner", path)
		}
		for _, duplicate := range []string{"bcrypt", "isTestRun", "fastHashPassword"} {
			if strings.Contains(source, duplicate) {
				t.Fatalf("%s must not define %s", path, duplicate)
			}
		}
	}
}

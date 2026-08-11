package releasecheck

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"golang.org/x/mod/module"
)

func TestWriteModuleProxySupportsReadonlyConsumerDownload(t *testing.T) {
	moduleRoot := t.TempDir()
	writeTestFile(t, filepath.Join(moduleRoot, "go.mod"), "module example.com/release/root\n\ngo 1.26.5\n")
	writeTestFile(t, filepath.Join(moduleRoot, "root.go"), "package root\n\nconst Value = 1\n")

	proxyRoot := t.TempDir()
	version := module.Version{Path: "example.com/release/root", Version: "v1.2.3"}
	if err := WriteModuleProxy(moduleRoot, proxyRoot, version); err != nil {
		t.Fatalf("WriteModuleProxy() error = %v", err)
	}

	consumerRoot := t.TempDir()
	writeTestFile(t, filepath.Join(consumerRoot, "go.mod"), "module example.com/consumer\n\ngo 1.26.5\n\nrequire example.com/release/root v1.2.3\n")
	command := exec.CommandContext(t.Context(), "go", "mod", "download", "example.com/release/root@v1.2.3")
	command.Dir = consumerRoot
	command.Env = append(os.Environ(),
		"GOWORK=off",
		"GOFLAGS=-modcacherw",
		"GOPROXY=file://"+filepath.ToSlash(proxyRoot),
		"GONOSUMDB=example.com/release/root",
		"GOSUMDB=off",
		"GOMODCACHE="+filepath.Join(t.TempDir(), "modcache"),
		"GOCACHE="+filepath.Join(t.TempDir(), "gocache"),
	)
	if output, err := command.CombinedOutput(); err != nil {
		t.Fatalf("go mod download failed: %v\n%s", err, output)
	}

	goSum, err := os.ReadFile(filepath.Join(consumerRoot, "go.sum"))
	if err != nil {
		t.Fatalf("read consumer go.sum: %v", err)
	}
	for _, coordinate := range []string{
		"example.com/release/root v1.2.3 h1:",
		"example.com/release/root v1.2.3/go.mod h1:",
	} {
		if !strings.Contains(string(goSum), coordinate) {
			t.Fatalf("consumer go.sum missing %q:\n%s", coordinate, goSum)
		}
	}
}

func TestWriteModuleProxyRejectsMismatchedModulePath(t *testing.T) {
	moduleRoot := t.TempDir()
	writeTestFile(t, filepath.Join(moduleRoot, "go.mod"), "module example.com/wrong\n\ngo 1.26.5\n")

	err := WriteModuleProxy(
		moduleRoot,
		t.TempDir(),
		module.Version{Path: "example.com/expected", Version: "v1.0.0"},
	)
	if err == nil || !strings.Contains(err.Error(), `declares "example.com/wrong"`) {
		t.Fatalf("WriteModuleProxy() error = %v, want module-path mismatch", err)
	}
}

func writeTestFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
}

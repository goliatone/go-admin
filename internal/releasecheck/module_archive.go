package releasecheck

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"time"

	"golang.org/x/mod/modfile"
	"golang.org/x/mod/module"
	modzip "golang.org/x/mod/zip"
)

// RequiredClientArchivePaths lists the pinned browser dependencies that every
// root module release must contain.
var RequiredClientArchivePaths = []string{
	"pkg/client/assets/dist/third-party/iconoir/iconoir.css",
	"pkg/client/assets/dist/third-party/iconoir/LICENSE",
	"pkg/client/assets/dist/third-party/simple-datatables/style.css",
	"pkg/client/assets/dist/third-party/simple-datatables/LICENSE",
	"pkg/client/assets/dist/third-party/echarts/echarts.min.js",
	"pkg/client/assets/dist/third-party/echarts/LICENSE",
	"pkg/client/assets/dist/third-party/echarts/NOTICE",
}

// CheckRequiredModuleSource applies x/mod's real directory classification to
// moduleRoot and verifies that every required path is eligible for a module
// archive.
func CheckRequiredModuleSource(moduleRoot string, requiredPaths []string) error {
	checked, err := modzip.CheckDir(moduleRoot)
	if err != nil {
		return fmt.Errorf("check module source %q: %w", moduleRoot, err)
	}
	valid := make(map[string]struct{}, len(checked.Valid))
	for _, file := range checked.Valid {
		relative, err := filepath.Rel(moduleRoot, file)
		if err != nil {
			return fmt.Errorf("resolve module source path %q: %w", file, err)
		}
		valid[filepath.ToSlash(relative)] = struct{}{}
	}

	var missing []string
	for _, requiredPath := range requiredPaths {
		requiredPath = strings.TrimPrefix(filepath.ToSlash(strings.TrimSpace(requiredPath)), "./")
		if _, ok := valid[requiredPath]; !ok {
			missing = append(missing, requiredPath)
		}
	}
	slices.Sort(missing)
	if len(missing) > 0 {
		return fmt.Errorf("required module source paths are missing or omitted: %s", strings.Join(missing, ", "))
	}
	return nil
}

// CheckModuleArchive builds a module ZIP from moduleRoot with x/mod and
// verifies that every required source-relative path is present in the exact
// archive.
func CheckModuleArchive(moduleRoot string, version module.Version, requiredPaths []string) error {
	if err := CheckRequiredModuleSource(moduleRoot, requiredPaths); err != nil {
		return err
	}

	archive, err := createModuleArchive(moduleRoot, version)
	if err != nil {
		return err
	}
	reader, err := zip.NewReader(bytes.NewReader(archive.Bytes()), int64(archive.Len()))
	if err != nil {
		return fmt.Errorf("open module archive: %w", err)
	}
	entries := make(map[string]struct{}, len(reader.File))
	for _, file := range reader.File {
		entries[file.Name] = struct{}{}
	}

	prefix := version.Path + "@" + version.Version + "/"
	var missing []string
	for _, requiredPath := range requiredPaths {
		requiredPath = strings.TrimPrefix(filepath.ToSlash(strings.TrimSpace(requiredPath)), "./")
		archivePath := prefix + requiredPath
		if _, ok := entries[archivePath]; !ok {
			missing = append(missing, archivePath)
		}
	}
	slices.Sort(missing)
	if len(missing) > 0 {
		return fmt.Errorf("module archive omitted required paths: %s", strings.Join(missing, ", "))
	}
	return nil
}

// WriteModuleProxy writes one module version using the Go file-proxy protocol.
// The generated ZIP is built with x/mod from moduleRoot, so consumers exercise
// the same module-boundary and archive rules as a published coordinate.
func WriteModuleProxy(moduleRoot, proxyRoot string, version module.Version) error {
	if strings.TrimSpace(proxyRoot) == "" {
		return fmt.Errorf("module proxy root is required")
	}
	if err := module.CheckPath(version.Path); err != nil {
		return fmt.Errorf("invalid module path %q: %w", version.Path, err)
	}
	if err := module.Check(version.Path, version.Version); err != nil {
		return fmt.Errorf("invalid module version %q: %w", version.Version, err)
	}

	archive, err := createModuleArchive(moduleRoot, version)
	if err != nil {
		return err
	}
	modFile, err := readModuleGoMod(moduleRoot)
	if err != nil {
		return err
	}
	declaredPath := modfile.ModulePath(modFile)
	if declaredPath != version.Path {
		return fmt.Errorf("module go.mod declares %q, expected %q", declaredPath, version.Path)
	}
	escapedPath, err := module.EscapePath(version.Path)
	if err != nil {
		return fmt.Errorf("escape module path %q: %w", version.Path, err)
	}
	escapedVersion, err := module.EscapeVersion(version.Version)
	if err != nil {
		return fmt.Errorf("escape module version %q: %w", version.Version, err)
	}

	versionDir := filepath.Join(proxyRoot, filepath.FromSlash(escapedPath), "@v")
	if mkdirErr := os.MkdirAll(versionDir, 0o750); mkdirErr != nil {
		return fmt.Errorf("create module proxy directory: %w", mkdirErr)
	}
	info, err := json.Marshal(struct {
		Version string    `json:"Version"` //nolint:tagliatelle // The Go module proxy .info protocol requires this exact field name.
		Time    time.Time `json:"Time"`    //nolint:tagliatelle // The Go module proxy .info protocol requires this exact field name.
	}{Version: version.Version, Time: time.Now().UTC()})
	if err != nil {
		return fmt.Errorf("encode module proxy info: %w", err)
	}

	files := map[string][]byte{
		escapedVersion + ".info": append(info, '\n'),
		escapedVersion + ".mod":  modFile,
		escapedVersion + ".zip":  archive.Bytes(),
		"list":                   []byte(version.Version + "\n"),
	}
	for name, content := range files {
		path := filepath.Join(versionDir, name)
		if err := os.WriteFile(path, content, 0o600); err != nil {
			return fmt.Errorf("write module proxy file %q: %w", path, err)
		}
	}
	return nil
}

func readModuleGoMod(moduleRoot string) ([]byte, error) {
	root, err := os.OpenRoot(moduleRoot)
	if err != nil {
		return nil, fmt.Errorf("open module root: %w", err)
	}
	modFile, readErr := root.ReadFile("go.mod")
	closeErr := root.Close()
	if readErr != nil {
		return nil, fmt.Errorf("read module go.mod: %w", readErr)
	}
	if closeErr != nil {
		return nil, fmt.Errorf("close module root: %w", closeErr)
	}
	return modFile, nil
}

func createModuleArchive(moduleRoot string, version module.Version) (*bytes.Buffer, error) {
	var archive bytes.Buffer
	if err := modzip.CreateFromDir(&archive, version, moduleRoot); err != nil {
		return nil, fmt.Errorf("create module archive: %w", err)
	}
	return &archive, nil
}

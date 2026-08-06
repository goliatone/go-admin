package releasecheck

import (
	"archive/zip"
	"bytes"
	"fmt"
	"path/filepath"
	"slices"
	"strings"

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

	var archive bytes.Buffer
	if err := modzip.CreateFromDir(&archive, version, moduleRoot); err != nil {
		return fmt.Errorf("create module archive: %w", err)
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

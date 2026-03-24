package pathutil

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// NormalizeLocalPath trims and cleans a local file path.
func NormalizeLocalPath(path string) (string, error) {
	path = strings.TrimSpace(path)
	if path == "" {
		return "", fmt.Errorf("file path is required")
	}
	return filepath.Clean(path), nil
}

// ResolveWithinRoot resolves path under root and rejects escapes.
func ResolveWithinRoot(root, path string) (string, error) {
	root, err := NormalizeLocalPath(root)
	if err != nil {
		return "", err
	}
	path = strings.TrimSpace(path)
	if path == "" {
		return "", fmt.Errorf("file path is required")
	}
	if !filepath.IsAbs(path) {
		path = filepath.Join(root, path)
	}
	path = filepath.Clean(path)
	rel, err := filepath.Rel(root, path)
	if err != nil {
		return "", err
	}
	if rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) {
		return "", fmt.Errorf("path %q escapes trusted root %q", path, root)
	}
	return path, nil
}

// ReadFileWithinRoot reads a file that must remain inside root.
func ReadFileWithinRoot(root, path string) ([]byte, error) {
	resolved, err := ResolveWithinRoot(root, path)
	if err != nil {
		return nil, err
	}
	// #nosec G304 -- path is resolved relative to a trusted root and escapes are rejected.
	return os.ReadFile(resolved)
}

// OpenFileWithinRoot opens a file that must remain inside root.
func OpenFileWithinRoot(root, path string) (*os.File, error) {
	resolved, err := ResolveWithinRoot(root, path)
	if err != nil {
		return nil, err
	}
	// #nosec G304 -- path is resolved relative to a trusted root and escapes are rejected.
	return os.Open(resolved)
}

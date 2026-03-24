package primitives

import (
	"os"

	"github.com/goliatone/go-admin/internal/pathutil"
)

// NormalizeFilePath trims and cleans a local file path.
func NormalizeFilePath(path string) (string, error) {
	return pathutil.NormalizeLocalPath(path)
}

// ReadTrustedFile reads a normalized operator-controlled or application-owned file path.
func ReadTrustedFile(path string) ([]byte, error) {
	normalized, err := NormalizeFilePath(path)
	if err != nil {
		return nil, err
	}
	// #nosec G304 -- callers pass normalized local file paths from application config or internal runtime state.
	return os.ReadFile(normalized)
}

// ReadFileWithinRoot reads a file that must remain inside root.
func ReadFileWithinRoot(root, path string) ([]byte, error) {
	return pathutil.ReadFileWithinRoot(root, path)
}

// OpenTrustedFile opens a normalized operator-controlled or application-owned file path.
func OpenTrustedFile(path string) (*os.File, error) {
	normalized, err := NormalizeFilePath(path)
	if err != nil {
		return nil, err
	}
	// #nosec G304 -- callers pass normalized local file paths from application config or internal runtime state.
	return os.Open(normalized)
}

// OpenFileWithinRoot opens a file that must remain inside root.
func OpenFileWithinRoot(root, path string) (*os.File, error) {
	return pathutil.OpenFileWithinRoot(root, path)
}

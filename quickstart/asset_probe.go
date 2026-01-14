package quickstart

import (
	"os"
	"path/filepath"
	"strings"
)

// ResolveDiskAssetsDir returns the first candidate directory that contains the marker file.
func ResolveDiskAssetsDir(marker string, candidates ...string) string {
	marker = strings.TrimSpace(marker)
	for _, candidate := range candidates {
		dir := strings.TrimSpace(candidate)
		if dir == "" {
			continue
		}
		if marker == "" {
			if info, err := os.Stat(dir); err == nil && info.IsDir() {
				return dir
			}
			continue
		}
		if _, err := os.Stat(filepath.Join(dir, marker)); err == nil {
			return dir
		}
	}
	return ""
}

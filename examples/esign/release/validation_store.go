package release

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

func resolveValidationSQLiteDSN(runLabel string) (string, func()) {
	if strings.TrimSpace(os.Getenv("ESIGN_DATABASE_DSN")) != "" || strings.TrimSpace(os.Getenv("CONTENT_DATABASE_DSN")) != "" {
		return stores.ResolveSQLiteDSN(), nil
	}

	tempDir, err := os.MkdirTemp("", "go-admin-esign-release-*")
	if err != nil {
		return stores.ResolveSQLiteDSN(), nil
	}

	label := strings.TrimSpace(runLabel)
	if label == "" {
		label = "validation"
	}
	filename := fmt.Sprintf("%s-%d.db", label, time.Now().UTC().UnixNano())
	dsn := "file:" + filepath.Join(tempDir, filename) + "?cache=shared&_fk=1&_busy_timeout=5000"
	return dsn, func() {
		_ = os.RemoveAll(tempDir)
	}
}

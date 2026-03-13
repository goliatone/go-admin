package stores

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
)

const defaultESignSQLiteFilename = "go-admin-esign.db"

// ResolveSQLiteDSN returns the preferred SQLite DSN for local example usage.
func ResolveSQLiteDSN() string {
	cfg := appcfg.Active()
	if value := strings.TrimSpace(cfg.Persistence.SQLite.DSN); value != "" {
		return value
	}
	filename := strings.TrimSuffix(defaultESignSQLiteFilename, ".db")
	filename = fmt.Sprintf("%s-%d.db", filename, os.Getpid())
	return "file:" + filepath.Join(os.TempDir(), filename) + "?cache=shared&_fk=1&_busy_timeout=5000"
}

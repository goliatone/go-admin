package release

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	esignpersistence "github.com/goliatone/go-admin/examples/esign/internal/persistence"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

func resolveValidationSQLiteDSN(runLabel string) (string, func()) {
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

func newValidationRuntimeStore(ctx context.Context, dsn string) (stores.Store, func() error, error) {
	cfg := appcfg.Defaults()
	cfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectSQLite
	cfg.Migrations.LocalOnly = true
	cfg.SQLite.DSN = strings.TrimSpace(dsn)
	cfg.Postgres.DSN = ""

	bootstrap, err := esignpersistence.Bootstrap(ctx, cfg)
	if err != nil {
		return nil, nil, err
	}
	store, storeCleanup, err := esignpersistence.NewStoreAdapter(bootstrap)
	if err != nil {
		_ = bootstrap.Close()
		return nil, nil, err
	}
	return store, func() error {
		if storeCleanup != nil {
			if err := storeCleanup(); err != nil {
				_ = bootstrap.Close()
				return err
			}
		}
		return bootstrap.Close()
	}, nil
}

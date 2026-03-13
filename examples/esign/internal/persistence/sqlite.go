package persistence

import (
	"context"
	"database/sql"
	"fmt"
)

// ConfigureSQLiteConnection applies pragmatic defaults for local concurrency.
func ConfigureSQLiteConnection(ctx context.Context, db *sql.DB) error {
	if db == nil {
		return nil
	}
	statements := []string{
		`PRAGMA journal_mode=WAL`,
		`PRAGMA synchronous=NORMAL`,
		`PRAGMA busy_timeout=5000`,
	}
	for _, stmt := range statements {
		if _, err := db.ExecContext(ctx, stmt); err != nil {
			return fmt.Errorf("configure sqlite pragma (%s): %w", stmt, err)
		}
	}
	return nil
}

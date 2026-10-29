package data

import (
	"embed"
	"io/fs"
)

//go:embed sql/activity_ingestion/*.sql
var activityIngestionMigrations embed.FS

// ActivityIngestionMigrations exposes explicit SQLite/PostgreSQL receipt DDL.
// Apply the dialect's up migration after go-users activity/scope migrations.
// Receipts have no TTL or activity foreign key; restore and prune them together
// with the producer replay contract. Constructors never execute migrations.
func ActivityIngestionMigrations() fs.FS {
	source, err := fs.Sub(activityIngestionMigrations, "sql/activity_ingestion")
	if err != nil {
		panic(err)
	}
	return source
}

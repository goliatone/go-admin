package setup

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"path/filepath"
	"strings"
	"testing"
	"testing/fstest"

	persistence "github.com/goliatone/go-persistence-bun"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
)

type seedFixtureRow struct {
	bun.BaseModel `bun:"table:seed_fixture_rows"`
	ID            int     `bun:"id,pk"`
	Name          string  `bun:"name"`
	Required      *string `bun:"required"`
	ParentID      int     `bun:"parent_id"`
}

func newSeedFixtureClient(t *testing.T) *persistence.Client {
	t.Helper()
	dsn := "file:" + filepath.Join(t.TempDir(), "seeds.db") + "?_fk=1"
	db, err := sql.Open(sqliteshim.ShimName, dsn)
	if err != nil {
		t.Fatal(err)
	}
	db.SetMaxOpenConns(1)
	t.Cleanup(func() {
		if err := db.Close(); err != nil {
			t.Errorf("close database: %v", err)
		}
	})
	client, err := persistence.New(persistentConfig{driver: sqliteshim.ShimName, server: dsn}, db, sqlitedialect.New())
	if err != nil {
		t.Fatal(err)
	}
	client.DB().RegisterModel((*seedFixtureRow)(nil))
	for _, query := range []string{
		"PRAGMA foreign_keys=ON",
		"CREATE TABLE seed_parents(id INTEGER PRIMARY KEY)",
		"INSERT INTO seed_parents VALUES(1)",
		"CREATE TABLE seed_fixture_rows(id INTEGER PRIMARY KEY, name TEXT UNIQUE, required TEXT NOT NULL CHECK(required != 'invalid'), parent_id INTEGER REFERENCES seed_parents(id))",
		"INSERT INTO seed_fixture_rows VALUES(1, 'existing', 'preserved', 1)",
	} {
		if _, err := db.ExecContext(context.Background(), query); err != nil {
			t.Fatal(err)
		}
	}
	return client
}

func seedFixtureFS(rows string) fstest.MapFS {
	return fstest.MapFS{"seeds.yml": &fstest.MapFile{Data: []byte("- model: SeedFixtureRow\n  rows:\n" + rows)}}
}

func TestSeedFixturesSkipDuplicateRowsAndContinueAcrossFiles(t *testing.T) {
	client := newSeedFixtureClient(t)
	fsys := seedFixtureFS("    - {id: 1, name: changed, required: overwritten, parent_id: 1}\n    - {id: 2, name: existing, required: duplicate, parent_id: 1}\n    - {id: 3, name: later, required: inserted, parent_id: 1}\n")
	fsys["z_more.yml"] = &fstest.MapFile{Data: []byte("- model: SeedFixtureRow\n  rows:\n    - {id: 4, name: final, required: inserted, parent_id: 1}\n")}
	if err := loadSeedFixtures(context.Background(), client.DB(), fsys, DefaultSeedConfig()); err != nil {
		t.Fatal(err)
	}
	var rows []seedFixtureRow
	if err := client.DB().NewSelect().Model(&rows).Order("id").Scan(context.Background()); err != nil {
		t.Fatal(err)
	}
	if len(rows) != 3 || rows[0].Name != "existing" || rows[0].Required == nil || *rows[0].Required != "preserved" || rows[1].ID != 3 || rows[2].ID != 4 {
		t.Fatalf("unexpected persisted rows: %#v", rows)
	}
}

func TestSeedFixturesDoNotIgnoreOtherFailures(t *testing.T) {
	for _, tc := range []struct{ name, row string }{
		{"not null", "{id: 3, name: later, parent_id: 1}"},
		{"check", "{id: 3, name: later, required: invalid, parent_id: 1}"},
		{"foreign key", "{id: 3, name: later, required: valid, parent_id: 999}"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			client := newSeedFixtureClient(t)
			fsys := seedFixtureFS("    - {id: 1, name: existing, required: ignored, parent_id: 1}\n    - " + tc.row + "\n")
			err := loadSeedFixtures(context.Background(), client.DB(), fsys, DefaultSeedConfig())
			if err == nil {
				t.Fatal("expected non-duplicate failure after an ignored duplicate")
			}
		})
	}
}

func TestSeedFixturesRespectStrictAndTruncateOptions(t *testing.T) {
	for _, truncate := range []bool{false, true} {
		t.Run(fmt.Sprint(truncate), func(t *testing.T) {
			client := newSeedFixtureClient(t)
			cfg := DefaultSeedConfig()
			cfg.IgnoreDuplicates = false
			cfg.Truncate = truncate
			err := loadSeedFixtures(context.Background(), client.DB(), seedFixtureFS("    - {id: 1, name: replacement, required: replaced, parent_id: 1}\n"), cfg)
			if !truncate {
				if err == nil {
					t.Fatal("strict duplicate must fail")
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			var row seedFixtureRow
			if err := client.DB().NewSelect().Model(&row).Where("id = 1").Scan(context.Background()); err != nil {
				t.Fatal(err)
			}
			if row.Name != "replacement" {
				t.Fatalf("truncate did not replace seed: %s", row.Name)
			}
		})
	}
}

func TestLoadSeedGroupRetriesAfterFailure(t *testing.T) {
	client := newSeedFixtureClient(t)
	key := seedKey(client, SeedGroupUsers)
	t.Cleanup(func() { seedOnce.Delete(key) })
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	err := LoadSeedGroup(ctx, client, DefaultSeedConfig(), SeedGroupUsers)
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("expected cancellation, got %v", err)
	}
	// With a live context, the missing users table must be checked afresh rather
	// than returning the cached cancellation from the previous attempt.
	err = LoadSeedGroup(context.Background(), client, DefaultSeedConfig(), SeedGroupUsers)
	if err == nil || errors.Is(err, context.Canceled) || !strings.Contains(err.Error(), "no such table") {
		t.Fatalf("seed load was not retried: %v", err)
	}
}

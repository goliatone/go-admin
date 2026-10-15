package admin

import (
	"context"
	"database/sql"
	"os"
	"testing"

	_ "github.com/lib/pq"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
)

// GO_ADMIN_TEST_POSTGRES_DSN must name a disposable database: this test creates
// and drops the fixture table. It never connects to a default database.
func TestBunRepositoryAdapterQueryCompatibilityPostgres(t *testing.T) {
	dsn := os.Getenv("GO_ADMIN_TEST_POSTGRES_DSN")
	if dsn == "" {
		t.Skip("set GO_ADMIN_TEST_POSTGRES_DSN to a disposable PostgreSQL database")
	}
	sqldb, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatal(err)
	}
	db := bun.NewDB(sqldb, pgdialect.New())
	defer mustClose(t, "db", db)
	if _, err := db.NewCreateTable().Model((*bunTestProduct)(nil)).Exec(context.Background()); err != nil {
		t.Fatal(err)
	}
	defer func() {
		if _, err := db.NewDropTable().Model((*bunTestProduct)(nil)).Exec(context.Background()); err != nil {
			t.Error(err)
		}
	}()
	runBunRepositoryQueryCompatibility(t, db)
}

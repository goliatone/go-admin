package errorutil

import (
	"context"
	"errors"
	"fmt"
	"testing"

	goerrors "github.com/goliatone/go-errors"
	repository "github.com/goliatone/go-repository-bun"
	"github.com/lib/pq"
	"github.com/mattn/go-sqlite3"
)

func TestUniqueViolationClassification(t *testing.T) {
	duplicate := repository.MapDatabaseError(&pq.Error{Code: "23505"}, "postgres")
	for _, tc := range []struct {
		name string
		err  error
		want bool
	}{
		{"repository", duplicate, true},
		{"wrapped", fmt.Errorf("insert: %w", duplicate), true},
		{"sanitized", goerrors.Wrap(duplicate, goerrors.CategoryOperation, "insert failed"), true},
		{"postgres", &pq.Error{Code: "23505"}, true},
		{"sqlite unique", sqlite3.Error{Code: sqlite3.ErrConstraint, ExtendedCode: sqlite3.ErrConstraintUnique}, true},
		{"sqlite primary key", sqlite3.Error{Code: sqlite3.ErrConstraint, ExtendedCode: sqlite3.ErrConstraintPrimaryKey}, true},
		{"foreign key", sqlite3.Error{Code: sqlite3.ErrConstraint, ExtendedCode: sqlite3.ErrConstraintForeignKey}, false},
		{"misleading prose", errors.New("unique constraint failed"), false},
		{"not null", &pq.Error{Code: "23502"}, false},
		{"all duplicates", errors.Join(duplicate, duplicate), true},
		{"mixed", errors.Join(duplicate, context.Canceled), false},
		{"duplicate wrapper over mixed", goerrors.Wrap(errors.Join(duplicate, context.Canceled), repository.CategoryDatabaseDuplicate, "duplicate").WithTextCode("DUPLICATE_KEY"), false},
		{"nil", nil, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if got := All(tc.err, UniqueViolation); got != tc.want {
				t.Fatalf("classification = %v, want %v", got, tc.want)
			}
		})
	}
}

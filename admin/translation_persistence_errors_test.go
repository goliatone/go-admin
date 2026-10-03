package admin

import (
	"context"
	"errors"
	"fmt"
	"testing"

	cmscontent "github.com/goliatone/go-cms/content"
	goerrors "github.com/goliatone/go-errors"
	repository "github.com/goliatone/go-repository-bun"
	"github.com/lib/pq"
	"github.com/mattn/go-sqlite3"
)

func TestCreateTranslationPersistenceErrorUsesStableIdentity(t *testing.T) {
	dbDuplicate := repository.MapDatabaseError(&pq.Error{Code: "23505"}, "postgres")
	for _, original := range []error{dbDuplicate, fmt.Errorf("create: %w", dbDuplicate), goerrors.Wrap(dbDuplicate, goerrors.CategoryOperation, "create failed"), cmscontent.ErrSlugExists, ErrPathConflict, sqlite3.Error{Code: sqlite3.ErrConstraint, ExtendedCode: sqlite3.ErrConstraintUnique}} {
		mapped := mapCreateTranslationPersistenceError(original, "pages", "source", "en", "es", "family")
		var duplicate TranslationAlreadyExistsError
		if !errors.As(mapped, &duplicate) {
			t.Fatalf("expected translation duplicate for %T, got %v", original, mapped)
		}
		if duplicate.Panel != "pages" || duplicate.EntityID != "source" || duplicate.SourceLocale != "en" || duplicate.Locale != "es" || duplicate.FamilyID != "family" {
			t.Fatalf("lost conflict metadata: %+v", duplicate)
		}
		presented, status := DefaultErrorPresenter().Present(mapped)
		if status != 409 || presented.TextCode != TextCodeTranslationExists {
			t.Fatalf("unexpected response: %d %+v", status, presented)
		}
	}
	for _, original := range []error{context.Canceled, errors.Join(dbDuplicate, context.Canceled), repository.MapDatabaseError(&pq.Error{Code: "23503"}, "postgres"), errors.New("duplicate key mentioned in a different failure")} {
		if got := mapCreateTranslationPersistenceError(original, "pages", "id", "en", "es", "family"); got != original { //nolint:errorlint // Assert the original error object is returned unchanged.
			t.Fatalf("unrelated failure changed: %v", got)
		}
	}
}

type translationCloneConflictRepository struct {
	Repository
	failure error
}

func (r translationCloneConflictRepository) Create(context.Context, map[string]any) (map[string]any, error) {
	return nil, r.failure
}

func TestCreateTranslationCloneMapsRaceConflict(t *testing.T) {
	repo := translationCloneConflictRepository{Repository: NewMemoryRepository(), failure: repository.MapDatabaseError(&pq.Error{Code: "23505"}, "postgres")}
	binding := &panelBinding{name: "pages", admin: &Admin{config: Config{DefaultLocale: "en"}}, panel: &Panel{name: "pages", repo: repo}}
	_, err := binding.createTranslationViaPanelClone(AdminContext{Context: context.Background()}, "source", "es", "default", "family", map[string]any{"id": "source", "locale": "en"}, nil)
	var duplicate TranslationAlreadyExistsError
	if !errors.As(err, &duplicate) {
		t.Fatalf("expected typed conflict after precheck, got %v", err)
	}
}

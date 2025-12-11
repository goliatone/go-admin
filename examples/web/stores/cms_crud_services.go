package stores

import (
	"context"

	crud "github.com/goliatone/go-crud"
	repository "github.com/goliatone/go-repository-bun"
)

// NewPageCRUDService composes repository-backed reads with CMS-backed mutations.
func NewPageCRUDService(repo repository.Repository[*PageRecord], store PageRepository) crud.Service[*PageRecord] {
	base := crud.NewRepositoryService(repo)
	if repo == nil || store == nil {
		return base
	}

	return crud.ComposeService(base, crud.ServiceFuncs[*PageRecord]{
		Create: func(ctx crud.Context, record *PageRecord) (*PageRecord, error) {
			created, err := store.Create(ctx.UserContext(), pageRecordToMap(record))
			if err != nil {
				return nil, err
			}
			return refreshPageRecord(ctx, repo, created, record)
		},
		Update: func(ctx crud.Context, record *PageRecord) (*PageRecord, error) {
			id := stringID(record.ID)
			if id == "" {
				id = stringID(record.Slug)
			}
			updated, err := store.Update(ctx.UserContext(), id, pageRecordToMap(record))
			if err != nil {
				return nil, err
			}
			return refreshPageRecord(ctx, repo, updated, record)
		},
		Delete: func(ctx crud.Context, record *PageRecord) error {
			id := stringID(record.ID)
			if id == "" {
				id = stringID(record.Slug)
			}
			return store.Delete(ctx.UserContext(), id)
		},
	})
}

// NewPostCRUDService composes repository-backed reads with CMS-backed mutations.
func NewPostCRUDService(repo repository.Repository[*PostRecord], store PostRepository) crud.Service[*PostRecord] {
	base := crud.NewRepositoryService(repo)
	if repo == nil || store == nil {
		return base
	}

	return crud.ComposeService(base, crud.ServiceFuncs[*PostRecord]{
		Create: func(ctx crud.Context, record *PostRecord) (*PostRecord, error) {
			created, err := store.Create(ctx.UserContext(), postRecordToMap(record))
			if err != nil {
				return nil, err
			}
			return refreshPostRecord(ctx, repo, created, record)
		},
		Update: func(ctx crud.Context, record *PostRecord) (*PostRecord, error) {
			id := stringID(record.ID)
			if id == "" {
				id = stringID(record.Slug)
			}
			updated, err := store.Update(ctx.UserContext(), id, postRecordToMap(record))
			if err != nil {
				return nil, err
			}
			return refreshPostRecord(ctx, repo, updated, record)
		},
		Delete: func(ctx crud.Context, record *PostRecord) error {
			id := stringID(record.ID)
			if id == "" {
				id = stringID(record.Slug)
			}
			return store.Delete(ctx.UserContext(), id)
		},
	})
}

func refreshPageRecord(ctx crud.Context, repo repository.Repository[*PageRecord], fromStore map[string]any, fallback *PageRecord) (*PageRecord, error) {
	if repo != nil {
		if id := stringID(fromStore["id"]); id != "" {
			if rec, err := repo.GetByID(ctx.UserContext(), id); err == nil {
				return rec, nil
			}
		}
	}
	if fallback != nil && stringID(fallback.ID) != "" {
		if rec, err := repo.GetByID(ctx.UserContext(), stringID(fallback.ID)); err == nil {
			return rec, nil
		}
	}
	if len(fromStore) > 0 {
		return pageRecordFromMap(fromStore), nil
	}
	return fallback, nil
}

func refreshPostRecord(ctx crud.Context, repo repository.Repository[*PostRecord], fromStore map[string]any, fallback *PostRecord) (*PostRecord, error) {
	if repo != nil {
		if id := stringID(fromStore["id"]); id != "" {
			if rec, err := repo.GetByID(ctx.UserContext(), id); err == nil {
				return rec, nil
			}
		}
	}
	if fallback != nil && stringID(fallback.ID) != "" {
		if rec, err := repo.GetByID(ctx.UserContext(), stringID(fallback.ID)); err == nil {
			return rec, nil
		}
	}
	if len(fromStore) > 0 {
		return postRecordFromMap(fromStore), nil
	}
	return fallback, nil
}

// Ensure interfaces are referenced for go vet/static checks.
func _assertCRUDServiceUsage() {
	_ = context.Background()
}

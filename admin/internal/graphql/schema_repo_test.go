package graphql

import (
	"context"
	"errors"
	"testing"

	repository "github.com/goliatone/go-repository-bun"
	"github.com/stretchr/testify/require"
)

type schemaRepoTestRecord struct {
	Name string
}

var _ repository.Repository[schemaRepoTestRecord] = (*schemaRepo[schemaRepoTestRecord])(nil)

func TestSchemaRepoReadOnlyOperationsReturnSchemaRepositoryError(t *testing.T) {
	t.Parallel()

	repo := newSchemaRepo[schemaRepoTestRecord](schemaHandlers[schemaRepoTestRecord]())
	ctx := context.Background()

	record, err := repo.Get(ctx)
	require.ErrorIs(t, err, errSchemaRepository)
	require.Equal(t, schemaRepoTestRecord{}, record)

	records, total, err := repo.List(ctx)
	require.ErrorIs(t, err, errSchemaRepository)
	require.Nil(t, records)
	require.Zero(t, total)

	count, err := repo.Count(ctx)
	require.ErrorIs(t, err, errSchemaRepository)
	require.Zero(t, count)

	created, err := repo.Create(ctx, schemaRepoTestRecord{Name: "x"})
	require.ErrorIs(t, err, errSchemaRepository)
	require.Equal(t, schemaRepoTestRecord{}, created)

	updated, err := repo.Upsert(ctx, schemaRepoTestRecord{Name: "x"})
	require.ErrorIs(t, err, errSchemaRepository)
	require.Equal(t, schemaRepoTestRecord{}, updated)

	err = repo.Delete(ctx, schemaRepoTestRecord{Name: "x"})
	require.ErrorIs(t, err, errSchemaRepository)

	raw, err := repo.Raw(ctx, "select 1")
	require.ErrorIs(t, err, errSchemaRepository)
	require.Nil(t, raw)
}

func TestSchemaRepoKeepsHandlersAndScopeDefaults(t *testing.T) {
	t.Parallel()

	handlers := schemaHandlers[schemaRepoTestRecord]()
	repo := newSchemaRepo[schemaRepoTestRecord](handlers)

	record := repo.Handlers().NewRecord()
	require.Equal(t, schemaRepoTestRecord{}, record)
	require.Equal(t, handlers.GetID(record), repo.Handlers().GetID(record))
	require.Equal(t, repository.ScopeDefaults{}, repo.GetScopeDefaults())

	defaults := repository.ScopeDefaults{Select: []string{"tenant"}}
	require.NoError(t, repo.SetScopeDefaults(defaults))
	require.Equal(t, defaults, repo.GetScopeDefaults())

	repo.RegisterScope("tenant", repository.ScopeDefinition{})
	_, err := repo.GetByIdentifier(context.Background(), "abc")
	require.True(t, errors.Is(err, errSchemaRepository))
}

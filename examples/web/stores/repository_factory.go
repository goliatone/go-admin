package stores

import (
	repository "github.com/goliatone/go-repository-bun"
	"github.com/uptrace/bun"
)

type storeRepositoryPaginationPolicy int

const (
	storeRepositoryPaginationNoDefault storeRepositoryPaginationPolicy = iota
	storeRepositoryPaginationLegacy25
)

func newStoreRepository[T any](
	db *bun.DB,
	handlers repository.ModelHandlers[T],
	policy storeRepositoryPaginationPolicy,
	dbOpts ...repository.Option,
) repository.Repository[T] {
	switch policy {
	case storeRepositoryPaginationLegacy25:
		return repository.MustNewRepositoryWithConfig[T](
			db,
			handlers,
			dbOpts,
			repository.WithDefaultListPagination(25, 0),
		)
	default:
		return repository.MustNewRepositoryWithConfig[T](db, handlers, dbOpts)
	}
}

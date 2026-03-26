package graphql

import (
	"context"
	"errors"

	repository "github.com/goliatone/go-repository-bun"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

var errSchemaRepository = errors.New("schema-only repository")

type readOnlyRepository[T any] struct {
	err error
}

func newReadOnlyRepository[T any](err error) readOnlyRepository[T] {
	return readOnlyRepository[T]{err: err}
}

func (r readOnlyRepository[T]) Raw(context.Context, string, ...any) ([]T, error) {
	return nil, r.err
}

func (r readOnlyRepository[T]) RawTx(context.Context, bun.IDB, string, ...any) ([]T, error) {
	return nil, r.err
}

func (r readOnlyRepository[T]) Get(context.Context, ...repository.SelectCriteria) (T, error) {
	var zero T
	return zero, r.err
}

func (r readOnlyRepository[T]) GetTx(context.Context, bun.IDB, ...repository.SelectCriteria) (T, error) {
	var zero T
	return zero, r.err
}

func (r readOnlyRepository[T]) GetByID(context.Context, string, ...repository.SelectCriteria) (T, error) {
	var zero T
	return zero, r.err
}

func (r readOnlyRepository[T]) GetByIDTx(context.Context, bun.IDB, string, ...repository.SelectCriteria) (T, error) {
	var zero T
	return zero, r.err
}

func (r readOnlyRepository[T]) List(context.Context, ...repository.SelectCriteria) ([]T, int, error) {
	return nil, 0, r.err
}

func (r readOnlyRepository[T]) ListTx(context.Context, bun.IDB, ...repository.SelectCriteria) ([]T, int, error) {
	return nil, 0, r.err
}

func (r readOnlyRepository[T]) Count(context.Context, ...repository.SelectCriteria) (int, error) {
	return 0, r.err
}

func (r readOnlyRepository[T]) CountTx(context.Context, bun.IDB, ...repository.SelectCriteria) (int, error) {
	return 0, r.err
}

func (r readOnlyRepository[T]) Create(context.Context, T, ...repository.InsertCriteria) (T, error) {
	var zero T
	return zero, r.err
}

func (r readOnlyRepository[T]) CreateTx(context.Context, bun.IDB, T, ...repository.InsertCriteria) (T, error) {
	var zero T
	return zero, r.err
}

func (r readOnlyRepository[T]) CreateMany(context.Context, []T, ...repository.InsertCriteria) ([]T, error) {
	return nil, r.err
}

func (r readOnlyRepository[T]) CreateManyTx(context.Context, bun.IDB, []T, ...repository.InsertCriteria) ([]T, error) {
	return nil, r.err
}

func (r readOnlyRepository[T]) GetOrCreate(context.Context, T) (T, error) {
	var zero T
	return zero, r.err
}

func (r readOnlyRepository[T]) GetOrCreateTx(context.Context, bun.IDB, T) (T, error) {
	var zero T
	return zero, r.err
}

func (r readOnlyRepository[T]) GetByIdentifier(context.Context, string, ...repository.SelectCriteria) (T, error) {
	var zero T
	return zero, r.err
}

func (r readOnlyRepository[T]) GetByIdentifierTx(context.Context, bun.IDB, string, ...repository.SelectCriteria) (T, error) {
	var zero T
	return zero, r.err
}

func (r readOnlyRepository[T]) Update(context.Context, T, ...repository.UpdateCriteria) (T, error) {
	var zero T
	return zero, r.err
}

func (r readOnlyRepository[T]) UpdateTx(context.Context, bun.IDB, T, ...repository.UpdateCriteria) (T, error) {
	var zero T
	return zero, r.err
}

func (r readOnlyRepository[T]) UpdateMany(context.Context, []T, ...repository.UpdateCriteria) ([]T, error) {
	return nil, r.err
}

func (r readOnlyRepository[T]) UpdateManyTx(context.Context, bun.IDB, []T, ...repository.UpdateCriteria) ([]T, error) {
	return nil, r.err
}

func (r readOnlyRepository[T]) Upsert(context.Context, T, ...repository.UpdateCriteria) (T, error) {
	var zero T
	return zero, r.err
}

func (r readOnlyRepository[T]) UpsertTx(context.Context, bun.IDB, T, ...repository.UpdateCriteria) (T, error) {
	var zero T
	return zero, r.err
}

func (r readOnlyRepository[T]) UpsertMany(context.Context, []T, ...repository.UpdateCriteria) ([]T, error) {
	return nil, r.err
}

func (r readOnlyRepository[T]) UpsertManyTx(context.Context, bun.IDB, []T, ...repository.UpdateCriteria) ([]T, error) {
	return nil, r.err
}

func (r readOnlyRepository[T]) Delete(context.Context, T) error { return r.err }

func (r readOnlyRepository[T]) DeleteTx(context.Context, bun.IDB, T) error { return r.err }

func (r readOnlyRepository[T]) DeleteMany(context.Context, ...repository.DeleteCriteria) error {
	return r.err
}

func (r readOnlyRepository[T]) DeleteManyTx(context.Context, bun.IDB, ...repository.DeleteCriteria) error {
	return r.err
}

func (r readOnlyRepository[T]) DeleteWhere(context.Context, ...repository.DeleteCriteria) error {
	return r.err
}

func (r readOnlyRepository[T]) DeleteWhereTx(context.Context, bun.IDB, ...repository.DeleteCriteria) error {
	return r.err
}

func (r readOnlyRepository[T]) ForceDelete(context.Context, T) error { return r.err }

func (r readOnlyRepository[T]) ForceDeleteTx(context.Context, bun.IDB, T) error { return r.err }

type schemaRepo[T any] struct {
	readOnlyRepository[T]
	handlers      repository.ModelHandlers[T]
	scopeDefaults repository.ScopeDefaults
}

func newSchemaRepo[T any](handlers repository.ModelHandlers[T]) *schemaRepo[T] {
	return &schemaRepo[T]{
		readOnlyRepository: newReadOnlyRepository[T](errSchemaRepository),
		handlers:           handlers,
	}
}

func (r *schemaRepo[T]) Handlers() repository.ModelHandlers[T]            { return r.handlers }
func (r *schemaRepo[T]) RegisterScope(string, repository.ScopeDefinition) {}
func (r *schemaRepo[T]) SetScopeDefaults(defaults repository.ScopeDefaults) error {
	r.scopeDefaults = defaults
	return nil
}
func (r *schemaRepo[T]) GetScopeDefaults() repository.ScopeDefaults { return r.scopeDefaults }

func schemaHandlers[T any]() repository.ModelHandlers[T] {
	return repository.ModelHandlers[T]{
		NewRecord: func() T {
			var zero T
			return zero
		},
		GetID: func(T) uuid.UUID {
			return uuid.Nil
		},
		SetID: func(T, uuid.UUID) {},
	}
}

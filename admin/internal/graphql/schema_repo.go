package graphql

import (
	"context"
	"errors"

	repository "github.com/goliatone/go-repository-bun"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

var errSchemaRepository = errors.New("schema-only repository")

type schemaRepo[T any] struct {
	handlers      repository.ModelHandlers[T]
	scopeDefaults repository.ScopeDefaults
}

func newSchemaRepo[T any](handlers repository.ModelHandlers[T]) *schemaRepo[T] {
	return &schemaRepo[T]{handlers: handlers}
}

func (r *schemaRepo[T]) Raw(context.Context, string, ...any) ([]T, error) { return nil, errSchemaRepository }
func (r *schemaRepo[T]) RawTx(context.Context, bun.IDB, string, ...any) ([]T, error) {
	return nil, errSchemaRepository
}
func (r *schemaRepo[T]) Get(context.Context, ...repository.SelectCriteria) (T, error) {
	var zero T
	return zero, errSchemaRepository
}
func (r *schemaRepo[T]) GetTx(context.Context, bun.IDB, ...repository.SelectCriteria) (T, error) {
	var zero T
	return zero, errSchemaRepository
}
func (r *schemaRepo[T]) GetByID(context.Context, string, ...repository.SelectCriteria) (T, error) {
	var zero T
	return zero, errSchemaRepository
}
func (r *schemaRepo[T]) GetByIDTx(context.Context, bun.IDB, string, ...repository.SelectCriteria) (T, error) {
	var zero T
	return zero, errSchemaRepository
}
func (r *schemaRepo[T]) List(context.Context, ...repository.SelectCriteria) ([]T, int, error) {
	return nil, 0, errSchemaRepository
}
func (r *schemaRepo[T]) ListTx(context.Context, bun.IDB, ...repository.SelectCriteria) ([]T, int, error) {
	return nil, 0, errSchemaRepository
}
func (r *schemaRepo[T]) Count(context.Context, ...repository.SelectCriteria) (int, error) {
	return 0, errSchemaRepository
}
func (r *schemaRepo[T]) CountTx(context.Context, bun.IDB, ...repository.SelectCriteria) (int, error) {
	return 0, errSchemaRepository
}
func (r *schemaRepo[T]) Create(context.Context, T, ...repository.InsertCriteria) (T, error) {
	var zero T
	return zero, errSchemaRepository
}
func (r *schemaRepo[T]) CreateTx(context.Context, bun.IDB, T, ...repository.InsertCriteria) (T, error) {
	var zero T
	return zero, errSchemaRepository
}
func (r *schemaRepo[T]) CreateMany(context.Context, []T, ...repository.InsertCriteria) ([]T, error) {
	return nil, errSchemaRepository
}
func (r *schemaRepo[T]) CreateManyTx(context.Context, bun.IDB, []T, ...repository.InsertCriteria) ([]T, error) {
	return nil, errSchemaRepository
}
func (r *schemaRepo[T]) GetOrCreate(context.Context, T) (T, error) {
	var zero T
	return zero, errSchemaRepository
}
func (r *schemaRepo[T]) GetOrCreateTx(context.Context, bun.IDB, T) (T, error) {
	var zero T
	return zero, errSchemaRepository
}
func (r *schemaRepo[T]) GetByIdentifier(context.Context, string, ...repository.SelectCriteria) (T, error) {
	var zero T
	return zero, errSchemaRepository
}
func (r *schemaRepo[T]) GetByIdentifierTx(context.Context, bun.IDB, string, ...repository.SelectCriteria) (T, error) {
	var zero T
	return zero, errSchemaRepository
}
func (r *schemaRepo[T]) Update(context.Context, T, ...repository.UpdateCriteria) (T, error) {
	var zero T
	return zero, errSchemaRepository
}
func (r *schemaRepo[T]) UpdateTx(context.Context, bun.IDB, T, ...repository.UpdateCriteria) (T, error) {
	var zero T
	return zero, errSchemaRepository
}
func (r *schemaRepo[T]) UpdateMany(context.Context, []T, ...repository.UpdateCriteria) ([]T, error) {
	return nil, errSchemaRepository
}
func (r *schemaRepo[T]) UpdateManyTx(context.Context, bun.IDB, []T, ...repository.UpdateCriteria) ([]T, error) {
	return nil, errSchemaRepository
}
func (r *schemaRepo[T]) Upsert(context.Context, T, ...repository.UpdateCriteria) (T, error) {
	var zero T
	return zero, errSchemaRepository
}
func (r *schemaRepo[T]) UpsertTx(context.Context, bun.IDB, T, ...repository.UpdateCriteria) (T, error) {
	var zero T
	return zero, errSchemaRepository
}
func (r *schemaRepo[T]) UpsertMany(context.Context, []T, ...repository.UpdateCriteria) ([]T, error) {
	return nil, errSchemaRepository
}
func (r *schemaRepo[T]) UpsertManyTx(context.Context, bun.IDB, []T, ...repository.UpdateCriteria) ([]T, error) {
	return nil, errSchemaRepository
}
func (r *schemaRepo[T]) Delete(context.Context, T) error { return errSchemaRepository }
func (r *schemaRepo[T]) DeleteTx(context.Context, bun.IDB, T) error { return errSchemaRepository }
func (r *schemaRepo[T]) DeleteMany(context.Context, ...repository.DeleteCriteria) error { return errSchemaRepository }
func (r *schemaRepo[T]) DeleteManyTx(context.Context, bun.IDB, ...repository.DeleteCriteria) error {
	return errSchemaRepository
}
func (r *schemaRepo[T]) DeleteWhere(context.Context, ...repository.DeleteCriteria) error {
	return errSchemaRepository
}
func (r *schemaRepo[T]) DeleteWhereTx(context.Context, bun.IDB, ...repository.DeleteCriteria) error {
	return errSchemaRepository
}
func (r *schemaRepo[T]) ForceDelete(context.Context, T) error { return errSchemaRepository }
func (r *schemaRepo[T]) ForceDeleteTx(context.Context, bun.IDB, T) error { return errSchemaRepository }

func (r *schemaRepo[T]) Handlers() repository.ModelHandlers[T] { return r.handlers }
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

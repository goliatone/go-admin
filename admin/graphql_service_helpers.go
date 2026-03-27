package admin

import crud "github.com/goliatone/go-crud"

type readOnlyBatchCRUD[T any] struct {
	err error
}

func newReadOnlyBatchCRUD[T any](err error) readOnlyBatchCRUD[T] {
	return readOnlyBatchCRUD[T]{err: err}
}

func (s readOnlyBatchCRUD[T]) CreateBatch(crud.Context, []T) ([]T, error) {
	return nil, s.err
}

func (s readOnlyBatchCRUD[T]) UpdateBatch(crud.Context, []T) ([]T, error) {
	return nil, s.err
}

func (s readOnlyBatchCRUD[T]) DeleteBatch(crud.Context, []T) error {
	return s.err
}

type readOnlyCRUD[T any] struct {
	readOnlyBatchCRUD[T]
}

func newReadOnlyCRUD[T any](err error) readOnlyCRUD[T] {
	return readOnlyCRUD[T]{readOnlyBatchCRUD: newReadOnlyBatchCRUD[T](err)}
}

func (s readOnlyCRUD[T]) Create(crud.Context, T) (T, error) {
	var zero T
	return zero, s.err
}

func (s readOnlyCRUD[T]) Update(crud.Context, T) (T, error) {
	var zero T
	return zero, s.err
}

func (s readOnlyCRUD[T]) Delete(crud.Context, T) error {
	return s.err
}

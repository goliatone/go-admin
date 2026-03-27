package admin

import "context"

type genericPanelRepository[T any] struct {
	disabled        error
	list            func(context.Context, ListOptions) ([]T, int, error)
	get             func(context.Context, string) (T, error)
	save            func(context.Context, T) (T, error)
	deleteByID      func(context.Context, string) error
	fromRecord      func(map[string]any, string) T
	toRecord        func(T) map[string]any
	mutateListEntry func(T, map[string]any)
}

func newGenericPanelRepository[T any](
	disabled error,
	list func(context.Context, ListOptions) ([]T, int, error),
	get func(context.Context, string) (T, error),
	save func(context.Context, T) (T, error),
	deleteByID func(context.Context, string) error,
	fromRecord func(map[string]any, string) T,
	toRecord func(T) map[string]any,
	mutateListEntry func(T, map[string]any),
) *genericPanelRepository[T] {
	return &genericPanelRepository[T]{
		disabled:        disabled,
		list:            list,
		get:             get,
		save:            save,
		deleteByID:      deleteByID,
		fromRecord:      fromRecord,
		toRecord:        toRecord,
		mutateListEntry: mutateListEntry,
	}
}

func (r *genericPanelRepository[T]) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	if r == nil || r.list == nil {
		return nil, 0, r.disabledError()
	}
	items, total, err := r.list(ctx, opts)
	if err != nil {
		return nil, 0, err
	}
	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		record := r.toRecord(item)
		if r.mutateListEntry != nil {
			r.mutateListEntry(item, record)
		}
		out = append(out, record)
	}
	return out, total, nil
}

func (r *genericPanelRepository[T]) Get(ctx context.Context, id string) (map[string]any, error) {
	if r == nil || r.get == nil {
		return nil, r.disabledError()
	}
	item, err := r.get(ctx, id)
	if err != nil {
		return nil, err
	}
	return r.toRecord(item), nil
}

func (r *genericPanelRepository[T]) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	return r.Update(ctx, "", record)
}

func (r *genericPanelRepository[T]) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if r == nil || r.save == nil || r.fromRecord == nil {
		return nil, r.disabledError()
	}
	item, err := r.save(ctx, r.fromRecord(record, id))
	if err != nil {
		return nil, err
	}
	return r.toRecord(item), nil
}

func (r *genericPanelRepository[T]) Delete(ctx context.Context, id string) error {
	if r == nil || r.deleteByID == nil {
		return r.disabledError()
	}
	return r.deleteByID(ctx, id)
}

func (r *genericPanelRepository[T]) disabledError() error {
	if r != nil && r.disabled != nil {
		return r.disabled
	}
	return serviceNotConfiguredDomainError("panel repository", nil)
}

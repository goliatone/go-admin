package admin

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	goerrors "github.com/goliatone/go-errors"
	repository "github.com/goliatone/go-repository-bun"
	"github.com/uptrace/bun"
)

// BunRecordMapper converts between map payloads and repository models.
type BunRecordMapper[T any] struct {
	ToRecord func(map[string]any) (T, error)
	ToMap    func(T) (map[string]any, error)
}

// BunRepositoryAdapter wraps a go-repository-bun Repository to satisfy the admin Repository interface.
type BunRepositoryAdapter[T any] struct {
	repo            repository.Repository[T]
	baseCriteria    []repository.SelectCriteria
	updateCriteria  []repository.UpdateCriteria
	deleteCriteria  []repository.DeleteCriteria
	searchColumns   []string
	filterBuilders  map[string]func(any) repository.SelectCriteria
	recordConverter BunRecordMapper[T]
}

// BunRepositoryOption configures the BunRepositoryAdapter.
type BunRepositoryOption[T any] func(*BunRepositoryAdapter[T])

// WithBunBaseCriteria applies select criteria to every list/get call.
func WithBunBaseCriteria[T any](criteria ...repository.SelectCriteria) BunRepositoryOption[T] {
	return func(a *BunRepositoryAdapter[T]) {
		a.baseCriteria = append(a.baseCriteria, criteria...)
	}
}

// WithBunUpdateCriteria applies update criteria to every update call.
func WithBunUpdateCriteria[T any](criteria ...repository.UpdateCriteria) BunRepositoryOption[T] {
	return func(a *BunRepositoryAdapter[T]) {
		a.updateCriteria = append(a.updateCriteria, criteria...)
	}
}

// WithBunDeleteCriteria applies delete criteria to every delete call.
func WithBunDeleteCriteria[T any](criteria ...repository.DeleteCriteria) BunRepositoryOption[T] {
	return func(a *BunRepositoryAdapter[T]) {
		a.deleteCriteria = append(a.deleteCriteria, criteria...)
	}
}

// WithBunSearchColumns configures case-insensitive LIKE queries for the provided columns.
func WithBunSearchColumns[T any](columns ...string) BunRepositoryOption[T] {
	return func(a *BunRepositoryAdapter[T]) {
		a.searchColumns = append([]string{}, columns...)
	}
}

// WithBunFilterMapping configures per-field filter builders (fallback is equality).
func WithBunFilterMapping[T any](builders map[string]func(any) repository.SelectCriteria) BunRepositoryOption[T] {
	return func(a *BunRepositoryAdapter[T]) {
		if len(builders) == 0 {
			return
		}
		if a.filterBuilders == nil {
			a.filterBuilders = map[string]func(any) repository.SelectCriteria{}
		}
		for k, v := range builders {
			if k == "" || v == nil {
				continue
			}
			a.filterBuilders[k] = v
		}
	}
}

// WithBunRecordMapper overrides the default JSON-based mapper.
func WithBunRecordMapper[T any](mapper BunRecordMapper[T]) BunRepositoryOption[T] {
	return func(a *BunRepositoryAdapter[T]) {
		a.recordConverter = mapper
	}
}

// NewBunRepositoryAdapter constructs an adapter around a go-repository-bun Repository.
func NewBunRepositoryAdapter[T any](repo repository.Repository[T], opts ...BunRepositoryOption[T]) *BunRepositoryAdapter[T] {
	adapter := &BunRepositoryAdapter[T]{
		repo: repo,
		recordConverter: BunRecordMapper[T]{
			ToRecord: defaultBunToRecord[T],
			ToMap:    defaultBunToMap[T],
		},
	}
	for _, opt := range opts {
		opt(adapter)
	}
	return adapter
}

func (a *BunRepositoryAdapter[T]) ensureRepo() error {
	if a == nil || a.repo == nil {
		return ErrNotFound
	}
	return nil
}

// List delegates to the underlying repository with translated pagination/sort/filter/search.
func (a *BunRepositoryAdapter[T]) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	if err := a.ensureRepo(); err != nil {
		return nil, 0, err
	}
	criteria := append([]repository.SelectCriteria{}, a.baseCriteria...)

	per := opts.PerPage
	if per <= 0 {
		per = 10
	}
	page := opts.Page
	if page < 1 {
		page = 1
	}
	offset := (page - 1) * per
	criteria = append(criteria, repository.SelectPaginate(per, offset))

	if opts.SortBy != "" {
		dir := "ASC"
		if opts.SortDesc {
			dir = "DESC"
		}
		criteria = append(criteria, repository.OrderBy(fmt.Sprintf("%s %s", opts.SortBy, dir)))
	}

	search := strings.TrimSpace(opts.Search)
	if search == "" {
		if raw, ok := opts.Filters["_search"]; ok {
			search = strings.TrimSpace(fmt.Sprint(raw))
		}
	}
	if sc := a.buildSearchCriteria(search); sc != nil {
		criteria = append(criteria, sc)
	}

	for key, val := range opts.Filters {
		if key == "" || val == nil || key == "_search" {
			continue
		}
		if builder, ok := a.filterBuilders[key]; ok && builder != nil {
			if crit := builder(val); crit != nil {
				criteria = append(criteria, crit)
			}
			continue
		}
		criteria = append(criteria, repository.SelectBy(key, "=", fmt.Sprint(val)))
	}

	records, total, err := a.repo.List(ctx, criteria...)
	if err != nil {
		return nil, 0, mapBunError(err)
	}
	mapped, err := a.mapRecords(records)
	if err != nil {
		return nil, 0, err
	}
	return mapped, total, nil
}

// Get retrieves a single record by id.
func (a *BunRepositoryAdapter[T]) Get(ctx context.Context, id string) (map[string]any, error) {
	if err := a.ensureRepo(); err != nil {
		return nil, err
	}
	criteria := append([]repository.SelectCriteria{}, a.baseCriteria...)
	record, err := a.repo.GetByID(ctx, id, criteria...)
	if err != nil {
		return nil, mapBunError(err)
	}
	return a.recordConverter.ToMap(record)
}

// Create inserts a new record.
func (a *BunRepositoryAdapter[T]) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	if err := a.ensureRepo(); err != nil {
		return nil, err
	}
	entity, err := a.recordConverter.ToRecord(record)
	if err != nil {
		return nil, err
	}
	created, err := a.repo.Create(ctx, entity)
	if err != nil {
		return nil, mapBunError(err)
	}
	return a.recordConverter.ToMap(created)
}

// Update modifies an existing record by id.
func (a *BunRepositoryAdapter[T]) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if err := a.ensureRepo(); err != nil {
		return nil, err
	}
	current, err := a.repo.GetByID(ctx, id, a.baseCriteria...)
	if err != nil {
		return nil, mapBunError(err)
	}
	currentMap, err := a.recordConverter.ToMap(current)
	if err != nil {
		return nil, err
	}
	for k, v := range record {
		currentMap[k] = v
	}
	currentMap["id"] = id
	entity, err := a.recordConverter.ToRecord(currentMap)
	if err != nil {
		return nil, err
	}
	updated, err := a.repo.Update(ctx, entity, a.updateCriteria...)
	if err != nil {
		return nil, mapBunError(err)
	}
	return a.recordConverter.ToMap(updated)
}

// Delete removes a record by id.
func (a *BunRepositoryAdapter[T]) Delete(ctx context.Context, id string) error {
	if err := a.ensureRepo(); err != nil {
		return err
	}
	criteria := append([]repository.DeleteCriteria{}, a.deleteCriteria...)
	criteria = append(criteria, repository.DeleteByID(id))
	if err := a.repo.DeleteMany(ctx, criteria...); err != nil {
		return mapBunError(err)
	}
	return nil
}

func (a *BunRepositoryAdapter[T]) mapRecords(records []T) ([]map[string]any, error) {
	out := make([]map[string]any, 0, len(records))
	for _, rec := range records {
		mapped, err := a.recordConverter.ToMap(rec)
		if err != nil {
			return nil, err
		}
		out = append(out, mapped)
	}
	return out, nil
}

func (a *BunRepositoryAdapter[T]) buildSearchCriteria(term string) repository.SelectCriteria {
	if term = strings.TrimSpace(term); term == "" || len(a.searchColumns) == 0 {
		return nil
	}
	like := "%" + strings.ToLower(term) + "%"
	columns := []string{}
	for _, c := range a.searchColumns {
		if trimmed := strings.TrimSpace(c); trimmed != "" {
			columns = append(columns, trimmed)
		}
	}
	if len(columns) == 0 {
		return nil
	}
	return repository.SelectRawProcessor(func(q *bun.SelectQuery) *bun.SelectQuery {
		for idx, col := range columns {
			cond := fmt.Sprintf("LOWER(?TableAlias.%s) LIKE ?", col)
			if idx == 0 {
				q = q.Where(cond, like)
			} else {
				q = q.WhereOr(cond, like)
			}
		}
		return q
	})
}

func defaultBunToRecord[T any](payload map[string]any) (T, error) {
	var entity T
	if payload == nil {
		return entity, nil
	}
	bytes, err := json.Marshal(payload)
	if err != nil {
		return entity, err
	}
	if err := json.Unmarshal(bytes, &entity); err != nil {
		return entity, err
	}
	return entity, nil
}

func defaultBunToMap[T any](record T) (map[string]any, error) {
	bytes, err := json.Marshal(record)
	if err != nil {
		return nil, err
	}
	out := map[string]any{}
	if err := json.Unmarshal(bytes, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func mapBunError(err error) error {
	if err == nil {
		return nil
	}
	if repository.IsRecordNotFound(err) || goerrors.IsCategory(err, repository.CategoryDatabaseNotFound) {
		return ErrNotFound
	}
	return err
}

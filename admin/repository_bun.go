package admin

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	goerrors "github.com/goliatone/go-errors"
	repository "github.com/goliatone/go-repository-bun"
	"github.com/uptrace/bun"
)

// BunRecordMapper converts between map payloads and repository models.
type BunRecordMapper[T any] struct {
	ToRecord func(map[string]any) (T, error) `json:"to_record"`
	ToMap    func(T) (map[string]any, error) `json:"to_map"`
}

// BunRepositoryAdapter wraps a go-repository-bun Repository to satisfy the admin Repository interface.
type BunRepositoryAdapter[T any] struct {
	repo            repository.Repository[T]
	baseCriteria    []repository.SelectCriteria
	updateCriteria  []repository.UpdateCriteria
	deleteCriteria  []repository.DeleteCriteria
	searchColumns   []string
	filterBuilders  map[string]func(any) repository.SelectCriteria
	patchOptions    []repository.MapPatchOption
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

// WithBunRecordMapper overrides the default map-native mapper.
func WithBunRecordMapper[T any](mapper BunRecordMapper[T]) BunRepositoryOption[T] {
	return func(a *BunRepositoryAdapter[T]) {
		a.recordConverter = mapper
	}
}

// WithBunPatchAllowedFields restricts update patch payloads to a known allowlist.
func WithBunPatchAllowedFields[T any](fields ...string) BunRepositoryOption[T] {
	return func(a *BunRepositoryAdapter[T]) {
		if len(fields) == 0 {
			return
		}
		a.patchOptions = append(a.patchOptions, repository.WithPatchAllowedFields(fields...))
	}
}

// NewBunRepositoryAdapter constructs an adapter around a go-repository-bun Repository.
func NewBunRepositoryAdapter[T any](repo repository.Repository[T], opts ...BunRepositoryOption[T]) *BunRepositoryAdapter[T] {
	mapMapper := repository.NewMapRecordMapper[T](repository.MapRecordMapperConfig{
		ProjectionOptions: []repository.MapProjectionOption{
			repository.WithProjectionKeyMode(repository.MapKeyBun),
		},
		PatchOptions: []repository.MapPatchOption{
			repository.WithPatchKeyMode(repository.MapKeyBun),
			repository.WithPatchIgnoreUnknown(true),
		},
	})

	adapter := &BunRepositoryAdapter[T]{
		repo: repo,
		patchOptions: []repository.MapPatchOption{
			repository.WithPatchKeyMode(repository.MapKeyBun),
			repository.WithPatchIgnoreUnknown(true),
		},
		recordConverter: BunRecordMapper[T]{
			ToRecord: mapMapper.ToRecord,
			ToMap:    mapMapper.ToMap,
		},
	}
	for _, opt := range opts {
		opt(adapter)
	}
	return adapter
}

func (a *BunRepositoryAdapter[T]) ensureRepo() error {
	return ensureRepositoryAdapterConfigured(a != nil && a.repo != nil)
}

// List delegates to the underlying repository with translated pagination/sort/filter/search.
func (a *BunRepositoryAdapter[T]) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	if err := a.ensureRepo(); err != nil {
		return nil, 0, err
	}
	query := normalizeRepositoryAdapterListQuery(opts)
	criteria := append([]repository.SelectCriteria{}, a.baseCriteria...)

	criteria = append(criteria, repository.SelectPaginate(query.PerPage, query.Offset()))

	if order := query.OrderExpr(); order != "" {
		criteria = append(criteria, repository.OrderBy(order))
	}

	if sc := a.buildSearchCriteria(query.Search); sc != nil {
		criteria = append(criteria, sc)
	}

	for _, predicate := range query.FilterPredicates() {
		if crit := a.buildPredicateCriteria(predicate); crit != nil {
			criteria = append(criteria, crit)
		}
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

	if len(a.baseCriteria) > 0 {
		if _, err := a.repo.GetByID(ctx, id, a.baseCriteria...); err != nil {
			return nil, mapBunError(err)
		}
	}

	criteria := append([]repository.UpdateCriteria{}, a.updateCriteria...)
	patch := cloneMap(record)
	updated, err := repository.UpdateByIDWithMapPatch(
		ctx,
		a.repo,
		id,
		patch,
		criteria,
		a.patchOptions...,
	)
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

var repositoryAdapterIdentifierPattern = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$`)

func (a *BunRepositoryAdapter[T]) buildPredicateCriteria(predicate ListPredicate) repository.SelectCriteria {
	field, ok := normalizeRepositoryAdapterIdentifier(predicate.Field)
	if !ok {
		return invalidBunPredicateCriteria()
	}

	values := normalizePredicateValues(predicate.Values)
	if len(values) == 0 {
		return nil
	}

	if builder, ok := a.filterBuilders[field]; ok && builder != nil {
		if crit := builder(repositoryPredicateBuilderValue(values)); crit != nil {
			return crit
		}
		return nil
	}
	return repositoryPredicateCriteria(field, values, predicate.Operator)
}

func repositoryPredicateCriteria(field string, values []string, operator string) repository.SelectCriteria {
	value := strings.Join(values, ",")
	switch strings.ToLower(strings.TrimSpace(operator)) {
	case "", "eq":
		return repository.SelectBy(field, "=", value)
	case "ne", "neq":
		return repository.SelectBy(field, "!=", value)
	case "gt":
		return repository.SelectBy(field, ">", value)
	case "gte":
		return repository.SelectBy(field, ">=", value)
	case "lt":
		return repository.SelectBy(field, "<", value)
	case "lte":
		return repository.SelectBy(field, "<=", value)
	case "in":
		return bunAnyValuePredicate(field, values, false)
	case "nin":
		return bunAnyValuePredicate(field, values, true)
	case "like":
		return bunContainsPredicate(field, values, false)
	case "ilike", "contains":
		return bunContainsPredicate(field, values, true)
	default:
		return repository.SelectBy(field, "=", value)
	}
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

func normalizeRepositoryAdapterIdentifier(field string) (string, bool) {
	normalized := strings.TrimSpace(field)
	if !repositoryAdapterIdentifierPattern.MatchString(normalized) {
		return "", false
	}
	return normalized, true
}

func repositoryPredicateBuilderValue(values []string) any {
	if len(values) == 0 {
		return nil
	}
	if len(values) == 1 {
		return values[0]
	}
	out := make([]string, len(values))
	copy(out, values)
	return out
}

func invalidBunPredicateCriteria() repository.SelectCriteria {
	return repository.SelectRawProcessor(func(q *bun.SelectQuery) *bun.SelectQuery {
		return q.Where("1=0")
	})
}

func bunAnyValuePredicate(field string, values []string, negate bool) repository.SelectCriteria {
	if len(values) == 0 {
		return nil
	}
	return repository.SelectRawProcessor(func(q *bun.SelectQuery) *bun.SelectQuery {
		if !negate {
			return q.WhereGroup(" AND ", func(q *bun.SelectQuery) *bun.SelectQuery {
				for _, value := range values {
					q = q.WhereOr(fmt.Sprintf("?TableAlias.%s = ?", field), value)
				}
				return q
			})
		}
		for _, value := range values {
			q = q.Where(fmt.Sprintf("NOT (?TableAlias.%s = ?)", field), value)
		}
		return q
	})
}

func bunContainsPredicate(field string, values []string, caseInsensitive bool) repository.SelectCriteria {
	if len(values) == 0 {
		return nil
	}
	return repository.SelectRawProcessor(func(q *bun.SelectQuery) *bun.SelectQuery {
		return q.WhereGroup(" AND ", func(q *bun.SelectQuery) *bun.SelectQuery {
			for _, value := range values {
				pattern := "%" + strings.ToLower(strings.TrimSpace(value)) + "%"
				if !caseInsensitive {
					pattern = "%" + strings.TrimSpace(value) + "%"
				}
				cond := fmt.Sprintf("?TableAlias.%s LIKE ?", field)
				if caseInsensitive {
					cond = fmt.Sprintf("LOWER(?TableAlias.%s) LIKE ?", field)
				}
				q = q.WhereOr(cond, pattern)
			}
			return q
		})
	})
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

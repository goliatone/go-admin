package persistence

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type relationalStringFilter struct {
	field           string
	value           string
	caseInsensitive bool
}

type relationalDeleteFilter struct {
	field string
	value string
}

func relationalInitializeScopedID(id string, scope stores.Scope) (string, string, string) {
	id = strings.TrimSpace(id)
	if id == "" {
		id = uuid.NewString()
	}
	return id, scope.TenantID, scope.OrgID
}

func relationalLoadRecord[T any](ctx context.Context, idb bun.IDB, scope stores.Scope, table, field, value string) (T, error) {
	var zero T

	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return zero, err
	}
	value = strings.TrimSpace(value)
	if value == "" {
		return zero, relationalInvalidRecordError(table, field, "required")
	}

	record := zero
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where(field+" = ?", value).
		Scan(ctx); err != nil {
		return zero, mapSQLNotFound(err, table, value)
	}
	return record, nil
}

func relationalListRecords[T any](
	ctx context.Context,
	idb bun.IDB,
	scope stores.Scope,
	orderExpr string,
	apply func(*bun.SelectQuery) *bun.SelectQuery,
) ([]T, error) {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return nil, err
	}

	records := make([]T, 0)
	sel := idb.NewSelect().
		Model(&records).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID)
	if apply != nil {
		sel = apply(sel)
	}
	sel = sel.OrderExpr(orderExpr)
	if err := sel.Scan(ctx, &records); err != nil {
		return nil, err
	}
	return records, nil
}

func relationalListRequiredRecords[T any](
	ctx context.Context,
	idb bun.IDB,
	scope stores.Scope,
	table, field, value, orderExpr string,
) ([]T, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, relationalInvalidRecordError(table, field, "required")
	}
	return relationalListRecords[T](ctx, idb, scope, orderExpr, func(sel *bun.SelectQuery) *bun.SelectQuery {
		return sel.Where(field+" = ?", value)
	})
}

func relationalListRequiredPairRecords[T any](
	ctx context.Context,
	idb bun.IDB,
	scope stores.Scope,
	table, firstField, firstValue, secondField, secondValue, orderExpr string,
) ([]T, error) {
	firstValue = strings.TrimSpace(firstValue)
	if firstValue == "" {
		return nil, relationalInvalidRecordError(table, firstField, "required")
	}
	secondValue = strings.TrimSpace(secondValue)
	if secondValue == "" {
		return nil, relationalInvalidRecordError(table, secondField, "required")
	}
	return relationalListRecords[T](ctx, idb, scope, orderExpr, func(sel *bun.SelectQuery) *bun.SelectQuery {
		return sel.Where(firstField+" = ?", firstValue).Where(secondField+" = ?", secondValue)
	})
}

func relationalApplyStringFilters(sel *bun.SelectQuery, filters ...relationalStringFilter) *bun.SelectQuery {
	for _, filter := range filters {
		value := strings.TrimSpace(filter.value)
		if value == "" {
			continue
		}
		if filter.caseInsensitive {
			sel = sel.Where("LOWER("+filter.field+") = LOWER(?)", value)
			continue
		}
		sel = sel.Where(filter.field+" = ?", value)
	}
	return sel
}

func relationalListPaginatedRequiredRecords[T any](
	ctx context.Context,
	idb bun.IDB,
	scope stores.Scope,
	table, field, value, ascOrderExpr, descOrderExpr string,
	sortDesc bool,
	limit, offset int,
) ([]T, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, relationalInvalidRecordError(table, field, "required")
	}
	orderExpr := ascOrderExpr
	if sortDesc {
		orderExpr = descOrderExpr
	}
	return relationalListRecords[T](ctx, idb, scope, orderExpr, func(sel *bun.SelectQuery) *bun.SelectQuery {
		sel = sel.Where(field+" = ?", value)
		if limit > 0 {
			sel = sel.Limit(limit)
		}
		if offset > 0 {
			sel = sel.Offset(offset)
		}
		return sel
	})
}

func relationalSavePreparedRecord[T any](
	ctx context.Context,
	idb bun.IDB,
	scope stores.Scope,
	id string,
	record T,
	load func(context.Context, bun.IDB, stores.Scope, string) (T, error),
	prepare func(T, *T) (T, error),
	setScope func(T, stores.Scope) T,
	validate func(T, stores.Scope) error,
) (T, error) {
	var zero T

	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return zero, err
	}
	id = strings.TrimSpace(id)
	current, err := load(ctx, idb, scope, id)
	if err != nil {
		return zero, err
	}
	record = setScope(record, scope)
	record, err = prepare(record, &current)
	if err != nil {
		return zero, err
	}
	if validate != nil {
		if err := validate(record, scope); err != nil {
			return zero, err
		}
	}
	if _, err := idb.NewUpdate().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where("id = ?", id).
		Exec(ctx); err != nil {
		return zero, err
	}
	return record, nil
}

func relationalCreatePreparedRecord[T any](
	ctx context.Context,
	idb bun.IDB,
	scope stores.Scope,
	record T,
	initialize func(context.Context, bun.IDB, stores.Scope, T) (T, error),
	prepare func(T, *T) (T, error),
	validate func(context.Context, bun.IDB, stores.Scope, T) error,
) (T, error) {
	var zero T

	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return zero, err
	}
	record, err = initialize(ctx, idb, scope, record)
	if err != nil {
		return zero, err
	}
	record, err = prepare(record, nil)
	if err != nil {
		return zero, err
	}
	if validate != nil {
		if err := validate(ctx, idb, scope, record); err != nil {
			return zero, err
		}
	}
	if _, err := idb.NewInsert().Model(&record).Exec(ctx); err != nil {
		return zero, err
	}
	return record, nil
}

func relationalLoadRequiredPairRecord[T any](
	ctx context.Context,
	idb bun.IDB,
	scope stores.Scope,
	table, firstField, firstValue, secondField, secondValue, notFoundID string,
) (T, error) {
	var zero T

	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return zero, err
	}
	firstValue = strings.TrimSpace(firstValue)
	if firstValue == "" {
		return zero, relationalInvalidRecordError(table, firstField, "required")
	}
	secondValue = strings.TrimSpace(secondValue)
	if secondValue == "" {
		return zero, relationalInvalidRecordError(table, secondField, "required")
	}
	record := zero
	if err := idb.NewSelect().
		Model(&record).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID).
		Where(firstField+" = ?", firstValue).
		Where(secondField+" = ?", secondValue).
		Scan(ctx); err != nil {
		return zero, mapSQLNotFound(err, table, strings.TrimSpace(notFoundID))
	}
	return record, nil
}

func relationalDeleteScopedRecords(
	ctx context.Context,
	idb bun.IDB,
	scope stores.Scope,
	model any,
	filters ...relationalDeleteFilter,
) error {
	scope, err := normalizedStoreScope(scope)
	if err != nil {
		return err
	}
	del := idb.NewDelete().
		Model(model).
		Where("tenant_id = ?", scope.TenantID).
		Where("org_id = ?", scope.OrgID)
	for _, filter := range filters {
		value := strings.TrimSpace(filter.value)
		if value == "" {
			continue
		}
		del = del.Where(filter.field+" = ?", value)
	}
	_, err = del.Exec(ctx)
	return err
}

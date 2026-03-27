package admin

import (
	"sort"
	"time"

	"github.com/google/uuid"
)

type inMemoryListConfig[T any] struct {
	clone          func(T) T
	include        func(T, string, map[string]any) bool
	less           func(T, T) bool
	defaultPerPage int
}

func listInMemoryRecords[T any](records map[string]T, opts ListOptions, cfg inMemoryListConfig[T]) ([]T, int) {
	search := inMemoryListSearchTerm(opts)
	out := make([]T, 0, len(records))
	for _, record := range records {
		if cfg.include != nil && !cfg.include(record, search, opts.Filters) {
			continue
		}
		out = append(out, cfg.clone(record))
	}
	if cfg.less != nil {
		sort.Slice(out, func(i, j int) bool {
			return cfg.less(out[i], out[j])
		})
	}
	return paginateInMemory(out, opts, cfg.defaultPerPage)
}

func getInMemoryRecord[T any](records map[string]T, id string, clone func(T) T) (T, error) {
	record, ok := records[id]
	if !ok {
		var zero T
		return zero, ErrNotFound
	}
	return clone(record), nil
}

type inMemoryCreateConfig[T any] struct {
	clone   func(T) T
	id      func(T) string
	setID   func(*T, string)
	prepare func(*T, time.Time)
}

func createInMemoryRecord[T any](records map[string]T, record T, cfg inMemoryCreateConfig[T]) (T, error) {
	now := time.Now()
	if cfg.prepare != nil {
		cfg.prepare(&record, now)
	}
	if cfg.id != nil && cfg.id(record) == "" && cfg.setID != nil {
		cfg.setID(&record, uuid.NewString())
	}
	records[cfg.id(record)] = cfg.clone(record)
	return cfg.clone(record), nil
}

type inMemoryUpdateConfig[T any] struct {
	clone func(T) T
	merge func(*T, T, time.Time) error
}

func updateInMemoryRecord[T any](records map[string]T, id string, update T, cfg inMemoryUpdateConfig[T]) (T, error) {
	record, ok := records[id]
	if !ok {
		var zero T
		return zero, ErrNotFound
	}
	if cfg.merge != nil {
		if err := cfg.merge(&record, update, time.Now()); err != nil {
			var zero T
			return zero, err
		}
	}
	records[id] = cfg.clone(record)
	return cfg.clone(record), nil
}

func deleteInMemoryRecord[T any](records map[string]T, id string) error {
	if _, ok := records[id]; !ok {
		return ErrNotFound
	}
	delete(records, id)
	return nil
}

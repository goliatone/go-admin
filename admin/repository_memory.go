package admin

import (
	"context"
	"errors"
	"sort"
	"strconv"
	"strings"
	"sync"
)

// MemoryRepository is an in-memory implementation of Repository for testing/demo.
type MemoryRepository struct {
	mu     sync.Mutex
	data   []map[string]any
	nextID int
}

// NewMemoryRepository constructs a MemoryRepository.
func NewMemoryRepository() *MemoryRepository {
	return &MemoryRepository{nextID: 1, data: []map[string]any{}}
}

// List returns paginated records with simple filtering and sorting.
func (r *MemoryRepository) List(_ context.Context, opts ListOptions) ([]map[string]any, int, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	filtered := r.applyFilters(opts.Filters)
	total := len(filtered)

	if opts.SortBy != "" {
		sort.SliceStable(filtered, func(i, j int) bool {
			vi := filtered[i][opts.SortBy]
			vj := filtered[j][opts.SortBy]
			si := toString(vi)
			sj := toString(vj)
			if opts.SortDesc {
				return sj < si
			}
			return si < sj
		})
	}

	page := opts.Page
	if page < 1 {
		page = 1
	}
	per := opts.PerPage
	if per <= 0 {
		per = 10
	}
	start := (page - 1) * per
	if start > len(filtered) {
		return []map[string]any{}, total, nil
	}
	end := start + per
	if end > len(filtered) {
		end = len(filtered)
	}
	out := make([]map[string]any, 0, end-start)
	for _, rec := range filtered[start:end] {
		out = append(out, cloneMap(rec))
	}
	return out, total, nil
}

// Get retrieves a record by id.
func (r *MemoryRepository) Get(_ context.Context, id string) (map[string]any, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, rec := range r.data {
		if rec["id"] == id {
			return cloneMap(rec), nil
		}
	}
	return nil, errors.New("not found")
}

// Create inserts a new record.
func (r *MemoryRepository) Create(_ context.Context, record map[string]any) (map[string]any, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	rec := cloneMap(record)
	rec["id"] = strconv.Itoa(r.nextID)
	r.nextID++
	r.data = append(r.data, rec)
	return cloneMap(rec), nil
}

// Update modifies an existing record.
func (r *MemoryRepository) Update(_ context.Context, id string, record map[string]any) (map[string]any, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for i, rec := range r.data {
		if rec["id"] == id {
			for k, v := range record {
				rec[k] = v
			}
			rec["id"] = id
			r.data[i] = rec
			return cloneMap(rec), nil
		}
	}
	return nil, errors.New("not found")
}

// Delete removes a record by id.
func (r *MemoryRepository) Delete(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for i, rec := range r.data {
		if rec["id"] == id {
			r.data = append(r.data[:i], r.data[i+1:]...)
			return nil
		}
	}
	return ErrNotFound
}

func (r *MemoryRepository) applyFilters(filters map[string]any) []map[string]any {
	if len(filters) == 0 {
		return cloneSlice(r.data)
	}
	out := []map[string]any{}
	for _, rec := range r.data {
		match := true
		if needle, ok := filters["_search"]; ok && toString(needle) != "" {
			if !contains(rec, toString(needle)) {
				continue
			}
		}
		for k, v := range filters {
			if k == "_search" {
				continue
			}
			if val, ok := rec[k]; !ok || !strings.EqualFold(toString(val), toString(v)) {
				match = false
				break
			}
		}
		if match {
			out = append(out, cloneMap(rec))
		}
	}
	return out
}

func cloneMap(in map[string]any) map[string]any {
	out := make(map[string]any, len(in))
	for k, v := range in {
		out[k] = v
	}
	return out
}

func cloneSlice(in []map[string]any) []map[string]any {
	out := make([]map[string]any, 0, len(in))
	for _, rec := range in {
		out = append(out, cloneMap(rec))
	}
	return out
}

func toString(v any) string {
	switch t := v.(type) {
	case string:
		return t
	case int:
		return strconv.Itoa(t)
	case int64:
		return strconv.FormatInt(t, 10)
	case float64:
		return strconv.FormatFloat(t, 'f', -1, 64)
	default:
		return ""
	}
}

func contains(rec map[string]any, needle string) bool {
	ln := strings.ToLower(needle)
	for _, v := range rec {
		if strings.Contains(strings.ToLower(toString(v)), ln) {
			return true
		}
	}
	return false
}

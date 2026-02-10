package admin

import (
	"context"
	"strconv"
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

	paged, total := applyListOptionsToRecordMaps(cloneSlice(r.data), opts, listRecordOptions{})
	out := make([]map[string]any, 0, len(paged))
	for _, rec := range paged {
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
	return nil, ErrNotFound
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
	return nil, ErrNotFound
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
	case int8:
		return strconv.FormatInt(int64(t), 10)
	case int16:
		return strconv.FormatInt(int64(t), 10)
	case int32:
		return strconv.FormatInt(int64(t), 10)
	case int64:
		return strconv.FormatInt(t, 10)
	case uint:
		return strconv.FormatUint(uint64(t), 10)
	case uint8:
		return strconv.FormatUint(uint64(t), 10)
	case uint16:
		return strconv.FormatUint(uint64(t), 10)
	case uint32:
		return strconv.FormatUint(uint64(t), 10)
	case uint64:
		return strconv.FormatUint(t, 10)
	case float32:
		return strconv.FormatFloat(float64(t), 'f', -1, 32)
	case float64:
		return strconv.FormatFloat(t, 'f', -1, 64)
	case bool:
		return strconv.FormatBool(t)
	default:
		return ""
	}
}

package admin

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	crud "github.com/goliatone/go-crud"
)

// CRUDRepositoryAdapter wraps a go-crud Service so panels can target Bun-backed repos.
type CRUDRepositoryAdapter struct {
	service crud.Service[map[string]any]
}

// NewCRUDRepositoryAdapter constructs the adapter.
func NewCRUDRepositoryAdapter(service crud.Service[map[string]any]) *CRUDRepositoryAdapter {
	return &CRUDRepositoryAdapter{service: service}
}

// NewCRUDContext builds a minimal crud.Context backed by the provided context.
func NewCRUDContext(ctx context.Context) crud.Context {
	return newCrudAdapterContext(ctx)
}

// List delegates to the go-crud service using translated list options.
func (r *CRUDRepositoryAdapter) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	if r.service == nil {
		return nil, 0, ErrNotFound
	}
	c := newCrudAdapterContext(ctx)
	per := opts.PerPage
	if per <= 0 {
		per = 10
	}
	page := opts.Page
	if page < 1 {
		page = 1
	}
	offset := (page - 1) * per
	c.setQuery("limit", strconv.Itoa(per))
	c.setQuery("offset", strconv.Itoa(offset))
	if opts.SortBy != "" {
		dir := "asc"
		if opts.SortDesc {
			dir = "desc"
		}
		c.setQuery("order", fmt.Sprintf("%s %s", opts.SortBy, dir))
	}
	if opts.Search != "" {
		c.setQuery("_search", opts.Search)
	}

	for _, predicate := range NormalizeListPredicates(opts) {
		field := strings.TrimSpace(predicate.Field)
		if field == "" {
			continue
		}
		values := predicate.Values
		if len(values) == 0 {
			continue
		}
		operator := strings.ToLower(strings.TrimSpace(predicate.Operator))
		if operator == "" {
			operator = defaultListPredicateOperator
		}
		if field == "_search" {
			if opts.Search == "" {
				c.setQuery("_search", values[0])
			}
			continue
		}
		key := field + "__" + operator
		c.setQuery(key, strings.Join(values, ","))
	}
	criteria, _, err := crud.BuildQueryCriteria[map[string]any](c, crud.OpList)
	if err != nil {
		return nil, 0, err
	}
	return r.service.Index(c, criteria)
}

// Get retrieves a single record by id.
func (r *CRUDRepositoryAdapter) Get(ctx context.Context, id string) (map[string]any, error) {
	if r.service == nil {
		return nil, ErrNotFound
	}
	c := newCrudAdapterContext(ctx)
	result, err := r.service.Show(c, id, nil)
	return result, err
}

// Create inserts a record.
func (r *CRUDRepositoryAdapter) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	if r.service == nil {
		return nil, ErrNotFound
	}
	c := newCrudAdapterContext(ctx)
	return r.service.Create(c, cloneMap(record))
}

// Update modifies a record.
func (r *CRUDRepositoryAdapter) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if r.service == nil {
		return nil, ErrNotFound
	}
	c := newCrudAdapterContext(ctx)
	rec := cloneMap(record)
	rec["id"] = id
	return r.service.Update(c, rec)
}

// Delete removes a record by id.
func (r *CRUDRepositoryAdapter) Delete(ctx context.Context, id string) error {
	if r.service == nil {
		return ErrNotFound
	}
	c := newCrudAdapterContext(ctx)
	return r.service.Delete(c, map[string]any{"id": id})
}

// crudAdapterContext satisfies crud.Context for internal adapter calls.
type crudAdapterContext struct {
	ctx     context.Context
	queries map[string]string
	params  map[string]string
	body    []byte
}

func newCrudAdapterContext(ctx context.Context) *crudAdapterContext {
	return &crudAdapterContext{
		ctx:     ctx,
		queries: map[string]string{},
		params:  map[string]string{},
	}
}

func (c *crudAdapterContext) setQuery(k, v string) {
	if strings.TrimSpace(k) == "" {
		return
	}
	c.queries[k] = v
}

// Request
func (c *crudAdapterContext) UserContext() context.Context { return c.ctx }
func (c *crudAdapterContext) Params(key string, defaultValue ...string) string {
	if val, ok := c.params[key]; ok {
		return val
	}
	if len(defaultValue) > 0 {
		return defaultValue[0]
	}
	return ""
}
func (c *crudAdapterContext) BodyParser(out any) error { return nil }
func (c *crudAdapterContext) Query(key string, defaultValue ...string) string {
	if val, ok := c.queries[key]; ok {
		return val
	}
	if len(defaultValue) > 0 {
		return defaultValue[0]
	}
	return ""
}
func (c *crudAdapterContext) QueryValues(key string) []string {
	val, ok := c.queries[key]
	if !ok {
		return nil
	}
	if strings.Contains(val, ",") {
		raw := strings.Split(val, ",")
		out := make([]string, 0, len(raw))
		for _, item := range raw {
			if trimmed := strings.TrimSpace(item); trimmed != "" {
				out = append(out, trimmed)
			}
		}
		return out
	}
	if strings.TrimSpace(val) == "" {
		return nil
	}
	return []string{val}
}
func (c *crudAdapterContext) QueryInt(key string, defaultValue ...int) int {
	if val, ok := c.queries[key]; ok {
		if parsed, err := strconv.Atoi(val); err == nil {
			return parsed
		}
	}
	if len(defaultValue) > 0 {
		return defaultValue[0]
	}
	return 0
}
func (c *crudAdapterContext) Queries() map[string]string {
	out := make(map[string]string, len(c.queries))
	for k, v := range c.queries {
		out[k] = v
	}
	return out
}
func (c *crudAdapterContext) Body() []byte { return c.body }

// Response
func (c *crudAdapterContext) Status(status int) crud.Response { _ = status; return c }
func (c *crudAdapterContext) JSON(data any, ctype ...string) error {
	_ = data
	_ = ctype
	return nil
}
func (c *crudAdapterContext) SendStatus(status int) error {
	_ = status
	return nil
}

package admin

import (
	"context"
	"fmt"
	"maps"
	"sort"
	"strconv"
	"strings"
	"testing"

	crud "github.com/goliatone/go-crud"
	repository "github.com/goliatone/go-repository-bun"
)

type stubCRUDService struct {
	records          []map[string]any
	nextID           int
	capturedContext  crud.Context
	capturedCriteria []repository.SelectCriteria
}

func newStubCRUDService() *stubCRUDService {
	return &stubCRUDService{
		records: []map[string]any{},
		nextID:  1,
	}
}

func (s *stubCRUDService) Create(ctx crud.Context, record map[string]any) (map[string]any, error) {
	s.capturedContext = ctx
	rec := cloneMap(record)
	if rec["id"] == nil || rec["id"] == "" {
		rec["id"] = strconv.Itoa(s.nextID)
		s.nextID++
	}
	s.records = append(s.records, rec)
	return cloneMap(rec), nil
}

func (s *stubCRUDService) CreateBatch(ctx crud.Context, records []map[string]any) ([]map[string]any, error) {
	s.capturedContext = ctx
	out := []map[string]any{}
	for _, rec := range records {
		created, _ := s.Create(ctx, rec)
		out = append(out, created)
	}
	return out, nil
}

func (s *stubCRUDService) Update(ctx crud.Context, record map[string]any) (map[string]any, error) {
	s.capturedContext = ctx
	id, _ := record["id"].(string)
	for i, rec := range s.records {
		if rec["id"] == id {
			maps.Copy(rec, record)
			s.records[i] = rec
			return cloneMap(rec), nil
		}
	}
	return nil, ErrNotFound
}

func (s *stubCRUDService) UpdateBatch(ctx crud.Context, records []map[string]any) ([]map[string]any, error) {
	s.capturedContext = ctx
	out := []map[string]any{}
	for _, rec := range records {
		updated, _ := s.Update(ctx, rec)
		out = append(out, updated)
	}
	return out, nil
}

func (s *stubCRUDService) Delete(ctx crud.Context, record map[string]any) error {
	s.capturedContext = ctx
	id, _ := record["id"].(string)
	for i, rec := range s.records {
		if rec["id"] == id {
			s.records = append(s.records[:i], s.records[i+1:]...)
			return nil
		}
	}
	return ErrNotFound
}

func (s *stubCRUDService) DeleteBatch(ctx crud.Context, records []map[string]any) error {
	s.capturedContext = ctx
	for _, rec := range records {
		_ = s.Delete(ctx, rec)
	}
	return nil
}

func (s *stubCRUDService) Index(ctx crud.Context, criteria []repository.SelectCriteria) ([]map[string]any, int, error) {
	s.capturedContext = ctx
	s.capturedCriteria = criteria
	filtered := s.applyFilters(ctx)
	filtered = s.applySearch(ctx, filtered)
	filtered = s.applyOrder(ctx, filtered)
	filtered, total := s.applyPagination(ctx, filtered)
	return filtered, total, nil
}

func (s *stubCRUDService) Show(ctx crud.Context, id string, criteria []repository.SelectCriteria) (map[string]any, error) {
	s.capturedContext = ctx
	for _, rec := range s.records {
		if rec["id"] == id {
			return cloneMap(rec), nil
		}
	}
	return nil, ErrNotFound
}

func (s *stubCRUDService) applyFilters(ctx crud.Context) []map[string]any {
	out := []map[string]any{}
	queries := ctx.Queries()
	for _, rec := range s.records {
		match := true
		for k, v := range queries {
			if before, ok := strings.CutSuffix(k, "__eq"); ok {
				field := before
				if fmt.Sprint(rec[field]) != v {
					match = false
					break
				}
			}
		}
		if match {
			out = append(out, cloneMap(rec))
		}
	}
	return out
}

func (s *stubCRUDService) applySearch(ctx crud.Context, records []map[string]any) []map[string]any {
	term := ctx.Query("_search")
	if term == "" {
		return records
	}
	term = strings.ToLower(term)
	out := []map[string]any{}
	for _, rec := range records {
		name := strings.ToLower(fmt.Sprint(rec["name"]))
		if strings.Contains(name, term) {
			out = append(out, cloneMap(rec))
		}
	}
	return out
}

func (s *stubCRUDService) applyOrder(ctx crud.Context, records []map[string]any) []map[string]any {
	order := ctx.Query("order")
	if order == "" {
		return records
	}
	parts := strings.Fields(order)
	if len(parts) == 0 {
		return records
	}
	field := parts[0]
	desc := len(parts) > 1 && strings.EqualFold(parts[1], "desc")
	out := append([]map[string]any{}, records...)
	sort.SliceStable(out, func(i, j int) bool {
		a := fmt.Sprint(out[i][field])
		b := fmt.Sprint(out[j][field])
		if desc {
			return b < a
		}
		return a < b
	})
	return out
}

func (s *stubCRUDService) applyPagination(ctx crud.Context, records []map[string]any) ([]map[string]any, int) {
	limit := ctx.QueryInt("limit", len(records))
	offset := ctx.QueryInt("offset", 0)
	if offset > len(records) {
		return []map[string]any{}, len(records)
	}
	end := min(offset+limit, len(records))
	out := []map[string]any{}
	for _, rec := range records[offset:end] {
		out = append(out, cloneMap(rec))
	}
	return out, len(records)
}

func TestCRUDAdapterListPaginationAndFilters(t *testing.T) {
	service := newStubCRUDService()
	service.records = []map[string]any{
		{"id": "1", "name": "Alpha", "status": "draft"},
		{"id": "2", "name": "Beta", "status": "published"},
		{"id": "3", "name": "Gamma", "status": "published"},
	}
	adapter := NewCRUDRepositoryAdapter(service)

	opts := ListOptions{
		Page:     2,
		PerPage:  1,
		SortBy:   "name",
		SortDesc: true,
		Filters:  map[string]any{"status": "published"},
		Search:   "a",
	}
	results, total, err := adapter.List(context.Background(), opts)
	if err != nil {
		t.Fatalf("list error: %v", err)
	}
	if total != 2 {
		t.Fatalf("expected total=2, got %d", total)
	}
	if len(results) != 1 || results[0]["id"] != "2" {
		t.Fatalf("unexpected results: %+v", results)
	}
	if q := service.capturedContext.Query("order"); q == "" {
		t.Fatalf("expected order applied")
	}
	if len(service.capturedCriteria) == 0 {
		t.Fatalf("expected list criteria")
	}
}

func TestCRUDAdapterListSearchUsesLegacySearchFilterWhenSearchEmpty(t *testing.T) {
	service := newStubCRUDService()
	service.records = []map[string]any{
		{"id": "1", "name": "Alpha"},
		{"id": "2", "name": "Beta"},
	}
	adapter := NewCRUDRepositoryAdapter(service)

	results, total, err := adapter.List(context.Background(), ListOptions{
		PerPage: 10,
		Filters: map[string]any{"_search": "beta"},
	})
	if err != nil {
		t.Fatalf("list error: %v", err)
	}
	if total != 1 {
		t.Fatalf("expected total=1, got %d", total)
	}
	if len(results) != 1 || results[0]["id"] != "2" {
		t.Fatalf("unexpected results: %+v", results)
	}
	if q := service.capturedContext.Query("_search"); q != "beta" {
		t.Fatalf("expected _search query set from filters, got %q", q)
	}
}

func TestCRUDAdapterListPreservesOperatorAwarePredicates(t *testing.T) {
	service := newStubCRUDService()
	service.records = []map[string]any{
		{"id": "1", "name": "Alpha", "status": "draft"},
	}
	adapter := NewCRUDRepositoryAdapter(service)

	_, _, err := adapter.List(context.Background(), ListOptions{
		PerPage: 10,
		Predicates: []ListPredicate{
			{Field: "status", Operator: "in", Values: []string{"draft", "published"}},
		},
	})
	if err != nil {
		t.Fatalf("list error: %v", err)
	}
	if q := service.capturedContext.Query("status__in"); q != "draft,published" {
		t.Fatalf("expected operator-aware query, got %q", q)
	}
}

func TestCRUDAdapterCreateUpdateDelete(t *testing.T) {
	service := newStubCRUDService()
	adapter := NewCRUDRepositoryAdapter(service)

	created, err := adapter.Create(context.Background(), map[string]any{"name": "Item", "status": "draft"})
	if err != nil || created["id"] == "" {
		t.Fatalf("create failed: %v", err)
	}
	id := created["id"].(string)

	updated, err := adapter.Update(context.Background(), id, map[string]any{"status": "published"})
	if err != nil {
		t.Fatalf("update failed: %v", err)
	}
	if updated["status"] != "published" {
		t.Fatalf("unexpected update payload: %+v", updated)
	}

	if err := adapter.Delete(context.Background(), id); err != nil {
		t.Fatalf("delete failed: %v", err)
	}
	if len(service.records) != 0 {
		t.Fatalf("expected record removed")
	}
}

func TestCRUDAdapterMissingServiceReturnsNotFoundAcrossOperations(t *testing.T) {
	ctx := context.Background()

	var nilAdapter *CRUDRepositoryAdapter
	zeroAdapter := &CRUDRepositoryAdapter{}

	testCases := []struct {
		name string
		run  func(*CRUDRepositoryAdapter) error
	}{
		{
			name: "list",
			run: func(adapter *CRUDRepositoryAdapter) error {
				_, _, err := adapter.List(ctx, ListOptions{})
				return err
			},
		},
		{
			name: "get",
			run: func(adapter *CRUDRepositoryAdapter) error {
				_, err := adapter.Get(ctx, "missing")
				return err
			},
		},
		{
			name: "create",
			run: func(adapter *CRUDRepositoryAdapter) error {
				_, err := adapter.Create(ctx, map[string]any{"name": "Item"})
				return err
			},
		},
		{
			name: "update",
			run: func(adapter *CRUDRepositoryAdapter) error {
				_, err := adapter.Update(ctx, "missing", map[string]any{"name": "Item"})
				return err
			},
		},
		{
			name: "delete",
			run: func(adapter *CRUDRepositoryAdapter) error {
				return adapter.Delete(ctx, "missing")
			},
		},
	}

	for _, tc := range testCases {
		t.Run("nil/"+tc.name, func(t *testing.T) {
			if err := tc.run(nilAdapter); err != ErrNotFound {
				t.Fatalf("expected ErrNotFound, got %v", err)
			}
		})
		t.Run("zero/"+tc.name, func(t *testing.T) {
			if err := tc.run(zeroAdapter); err != ErrNotFound {
				t.Fatalf("expected ErrNotFound, got %v", err)
			}
		})
	}
}

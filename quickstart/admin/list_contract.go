package admincontract

import (
	"context"
	"fmt"
	"testing"
)

// ListPredicate is a transport-agnostic predicate shape for list contracts.
type ListPredicate struct {
	Field    string
	Operator string
	Values   []string
}

// ListOptions is a transport-agnostic list query shape for list contracts.
type ListOptions struct {
	Page       int
	PerPage    int
	SortBy     string
	SortDesc   bool
	Filters    map[string]any
	Predicates []ListPredicate
	Search     string
}

// ListFunc describes the contract target list function.
type ListFunc func(context.Context, ListOptions) ([]map[string]any, int, error)

// PaginationContractConfig configures assertions for a list total/pagination contract.
type PaginationContractConfig struct {
	TotalExpected int
	PerPage       int
	SortBy        string
	SortDesc      bool
	Filters       map[string]any
	Predicates    []ListPredicate
	Search        string
	UniqueKey     string
}

// AssertPaginationContract verifies that total is stable across pages and page slicing
// honors total/per-page semantics.
func AssertPaginationContract(t *testing.T, list ListFunc, cfg PaginationContractConfig) {
	t.Helper()
	if list == nil {
		t.Fatalf("list function is required")
	}

	perPage := cfg.PerPage
	if perPage <= 0 {
		perPage = 10
	}
	totalExpected := cfg.TotalExpected
	if totalExpected < 0 {
		t.Fatalf("total expected must be >= 0, got %d", totalExpected)
	}

	pageOne, totalOne, err := list(context.Background(), buildListOptions(cfg, 1, perPage))
	if err != nil {
		t.Fatalf("page 1 list failed: %v", err)
	}
	if totalOne != totalExpected {
		t.Fatalf("page 1 total mismatch: expected %d, got %d", totalExpected, totalOne)
	}
	expectedPageOneLen := expectedPageLen(totalExpected, perPage, 1)
	if len(pageOne) != expectedPageOneLen {
		t.Fatalf("page 1 size mismatch: expected %d, got %d", expectedPageOneLen, len(pageOne))
	}

	pageTwo, totalTwo, err := list(context.Background(), buildListOptions(cfg, 2, perPage))
	if err != nil {
		t.Fatalf("page 2 list failed: %v", err)
	}
	if totalTwo != totalExpected {
		t.Fatalf("page 2 total mismatch: expected %d, got %d", totalExpected, totalTwo)
	}
	expectedPageTwoLen := expectedPageLen(totalExpected, perPage, 2)
	if len(pageTwo) != expectedPageTwoLen {
		t.Fatalf("page 2 size mismatch: expected %d, got %d", expectedPageTwoLen, len(pageTwo))
	}

	lastPage := 1
	if totalExpected > 0 {
		lastPage = ((totalExpected - 1) / perPage) + 1
	}
	pageOutOfRange, totalOutOfRange, err := list(context.Background(), buildListOptions(cfg, lastPage+1, perPage))
	if err != nil {
		t.Fatalf("out-of-range page list failed: %v", err)
	}
	if totalOutOfRange != totalExpected {
		t.Fatalf("out-of-range page total mismatch: expected %d, got %d", totalExpected, totalOutOfRange)
	}
	if len(pageOutOfRange) != 0 {
		t.Fatalf("out-of-range page expected 0 records, got %d", len(pageOutOfRange))
	}

	if key := cfg.UniqueKey; key != "" {
		assertNoPageOverlap(t, key, pageOne, pageTwo)
	}
}

func buildListOptions(cfg PaginationContractConfig, page, perPage int) ListOptions {
	return ListOptions{
		Page:       page,
		PerPage:    perPage,
		SortBy:     cfg.SortBy,
		SortDesc:   cfg.SortDesc,
		Filters:    cloneMap(cfg.Filters),
		Predicates: clonePredicates(cfg.Predicates),
		Search:     cfg.Search,
	}
}

func expectedPageLen(total, perPage, page int) int {
	if total <= 0 || perPage <= 0 || page <= 0 {
		return 0
	}
	start := (page - 1) * perPage
	if start >= total {
		return 0
	}
	remaining := total - start
	if remaining < perPage {
		return remaining
	}
	return perPage
}

func assertNoPageOverlap(t *testing.T, key string, pageOne, pageTwo []map[string]any) {
	t.Helper()
	pageOneKeys := make(map[string]struct{}, len(pageOne))
	for idx, record := range pageOne {
		id := keyValue(record, key)
		if id == "" {
			t.Fatalf("page 1 record %d missing %q", idx, key)
		}
		pageOneKeys[id] = struct{}{}
	}
	for idx, record := range pageTwo {
		id := keyValue(record, key)
		if id == "" {
			t.Fatalf("page 2 record %d missing %q", idx, key)
		}
		if _, exists := pageOneKeys[id]; exists {
			t.Fatalf("pagination overlap detected for key %q=%q", key, id)
		}
	}
}

func keyValue(record map[string]any, key string) string {
	if record == nil {
		return ""
	}
	raw, ok := record[key]
	if !ok || raw == nil {
		return ""
	}
	return fmt.Sprint(raw)
}

func cloneMap(in map[string]any) map[string]any {
	if len(in) == 0 {
		return nil
	}
	out := make(map[string]any, len(in))
	for key, value := range in {
		out[key] = value
	}
	return out
}

func clonePredicates(in []ListPredicate) []ListPredicate {
	if len(in) == 0 {
		return nil
	}
	out := make([]ListPredicate, 0, len(in))
	for _, predicate := range in {
		out = append(out, ListPredicate{
			Field:    predicate.Field,
			Operator: predicate.Operator,
			Values:   append([]string{}, predicate.Values...),
		})
	}
	return out
}

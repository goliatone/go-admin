package site

import (
	"testing"

	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
)

func TestSearchQueryValuesNormalizesCommaSeparatedDistinctValues(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.On("QueryValues", "tag").Return([]string{" go, news ", "go"})
	ctx.On("Query", "tag").Return("")

	values := searchQueryValues(ctx, "tag")
	if len(values) != 2 || values[0] != "go" || values[1] != "news" {
		t.Fatalf("expected normalized [go news], got %+v", values)
	}
}

func TestSearchBaseFiltersNormalizesAliasesAndSkipsRanges(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.QueriesM = map[string]string{
		"q":                  "archive",
		"filter.visibility":  "public",
		"facet_tag":          "architecture",
		"published_year_gte": "2024",
		"date_from":          "2024-01-01",
		"content_type":       "post",
	}
	ctx.On("QueryValues", "filter.visibility").Return([]string{"public"})
	ctx.On("QueryValues", "facet_tag").Return([]string{"architecture"})
	ctx.On("QueryValues", "date_from").Return([]string{"2024-01-01"})
	ctx.On("QueryValues", "content_type").Return([]string{"post"})
	ctx.On("QueryValues", mock.Anything).Return([]string{})
	ctx.On("Query", mock.Anything).Return("")

	filters := searchBaseFilters(ctx)

	if _, ok := filters["published_year_gte"]; ok {
		t.Fatalf("expected range field to be excluded from filters, got %+v", filters)
	}
	if _, ok := filters["q"]; ok {
		t.Fatalf("expected reserved query field to be excluded from filters, got %+v", filters)
	}
	if got := filters["visibility"]; len(got) != 1 || got[0] != "public" {
		t.Fatalf("expected normalized visibility filter, got %+v", filters)
	}
	if got := filters["tag"]; len(got) != 1 || got[0] != "architecture" {
		t.Fatalf("expected normalized tag alias, got %+v", filters)
	}
	if got := filters["content_type"]; len(got) != 1 || got[0] != "post" {
		t.Fatalf("expected forwarded content_type alias, got %+v", filters)
	}
	if got := filters["date_from"]; len(got) != 1 || got[0] != "2024-01-01" {
		t.Fatalf("expected date_from alias retained, got %+v", filters)
	}
}

func TestSearchBaseRangesParsesBoundedValues(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.QueriesM = map[string]string{
		"published_year_gte":   "2024",
		"duration_seconds_lte": "3600",
	}
	ctx.On("QueryValues", "published_year_gte").Return([]string{"2024"})
	ctx.On("QueryValues", "duration_seconds_lte").Return([]string{"3600"})
	ctx.On("QueryValues", mock.Anything).Return([]string{})
	ctx.On("Query", mock.Anything).Return("")

	ranges := searchBaseRanges(ctx)
	if len(ranges) != 2 {
		t.Fatalf("expected two ranges, got %+v", ranges)
	}
	byField := map[string]map[string]any{}
	for _, item := range ranges {
		byField[item.Field] = map[string]any{"gte": item.GTE, "lte": item.LTE}
	}
	if intFromAny(byField["published_year"]["gte"]) != 2024 {
		t.Fatalf("expected published_year.gte=2024, got %+v", byField["published_year"])
	}
	if intFromAny(byField["duration_seconds"]["lte"]) != 3600 {
		t.Fatalf("expected duration_seconds.lte=3600, got %+v", byField["duration_seconds"])
	}
}

package handlers

import (
	"context"
	"expvar"
	"sort"
	"strings"
	"time"
)

const (
	userTabActivityQueryMSMetric     = "user_tab_activity_query_ms"
	userTabActivityResultCountMetric = "user_tab_activity_result_count"
	userTabActivityErrorCountMetric  = "user_tab_activity_error_count"
)

// UserTabActivityMetrics captures observability signals for users-tab activity queries.
type UserTabActivityMetrics interface {
	ObserveQueryDuration(ctx context.Context, duration time.Duration, tags map[string]string)
	ObserveResultCount(ctx context.Context, count int, tags map[string]string)
	IncrementErrorCount(ctx context.Context, tags map[string]string)
}

var defaultUserTabActivityMetrics UserTabActivityMetrics = newExpvarUserTabActivityMetrics()

type expvarUserTabActivityMetrics struct {
	queryDuration *expvar.Map
	resultCount   *expvar.Map
	errorCount    *expvar.Map
}

func newExpvarUserTabActivityMetrics() *expvarUserTabActivityMetrics {
	return &expvarUserTabActivityMetrics{
		queryDuration: expvar.NewMap(userTabActivityQueryMSMetric),
		resultCount:   expvar.NewMap(userTabActivityResultCountMetric),
		errorCount:    expvar.NewMap(userTabActivityErrorCountMetric),
	}
}

func (m *expvarUserTabActivityMetrics) ObserveQueryDuration(_ context.Context, duration time.Duration, tags map[string]string) {
	if m == nil {
		return
	}
	ms := duration.Milliseconds()
	if ms < 0 {
		ms = 0
	}
	m.queryDuration.Add(userTabActivityTagsKey(tags), ms)
}

func (m *expvarUserTabActivityMetrics) ObserveResultCount(_ context.Context, count int, tags map[string]string) {
	if m == nil {
		return
	}
	if count < 0 {
		count = 0
	}
	m.resultCount.Add(userTabActivityTagsKey(tags), int64(count))
}

func (m *expvarUserTabActivityMetrics) IncrementErrorCount(_ context.Context, tags map[string]string) {
	if m == nil {
		return
	}
	m.errorCount.Add(userTabActivityTagsKey(tags), 1)
}

func userTabActivityTagsKey(tags map[string]string) string {
	if len(tags) == 0 {
		return "total"
	}

	keys := make([]string, 0, len(tags))
	for key := range tags {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		keys = append(keys, key)
	}
	if len(keys) == 0 {
		return "total"
	}

	sort.Strings(keys)
	parts := make([]string, 0, len(keys))
	for _, key := range keys {
		value := strings.TrimSpace(tags[key])
		value = strings.ReplaceAll(value, ",", "_")
		value = strings.ReplaceAll(value, "=", "_")
		if value == "" {
			value = "unknown"
		}
		parts = append(parts, key+"="+value)
	}
	if len(parts) == 0 {
		return "total"
	}
	return strings.Join(parts, ",")
}

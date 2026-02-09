package handlers

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestUserTabActivityTagsKeyStableOrdering(t *testing.T) {
	tags := map[string]string{
		"tab":      "activity",
		"panel":    "users",
		"endpoint": "tab_json",
	}

	require.Equal(t, "endpoint=tab_json,panel=users,tab=activity", userTabActivityTagsKey(tags))
}

func TestDefaultUserTabActivityMetricsUseExpectedMetricNames(t *testing.T) {
	metrics, ok := defaultUserTabActivityMetrics.(*expvarUserTabActivityMetrics)
	require.True(t, ok, "expected expvar-backed default metrics")

	uniqueReason := fmt.Sprintf("test_%d", time.Now().UnixNano())
	tags := map[string]string{
		"panel":  "users",
		"tab":    "activity",
		"reason": uniqueReason,
	}
	key := userTabActivityTagsKey(tags)

	metrics.ObserveQueryDuration(context.Background(), 12*time.Millisecond, tags)
	metrics.ObserveResultCount(context.Background(), 3, tags)
	metrics.IncrementErrorCount(context.Background(), tags)

	require.Equal(t, "12", metrics.queryDuration.Get(key).String())
	require.Equal(t, "3", metrics.resultCount.Get(key).String())
	require.Equal(t, "1", metrics.errorCount.Get(key).String())
}

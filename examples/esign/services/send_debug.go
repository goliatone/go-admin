package services

import (
	"fmt"
	"maps"
	"sort"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

const sendDebugLogPrefix = "[esign-send]"

func SendDebugFields(scope stores.Scope, correlationID string, fields map[string]any) map[string]any {
	out := map[string]any{
		"tenant_id":      strings.TrimSpace(scope.TenantID),
		"org_id":         strings.TrimSpace(scope.OrgID),
		"correlation_id": strings.TrimSpace(correlationID),
	}
	maps.Copy(out, fields)
	return out
}

func LogSendDebug(component, phase string, fields map[string]any) {
	if fields == nil {
		fields = map[string]any{}
	}
	keys := make([]string, 0, len(fields))
	for key := range fields {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	parts := make([]string, 0, len(keys)+3)
	parts = append(parts,
		sendDebugLogPrefix,
		fmt.Sprintf("component=%s", strings.TrimSpace(component)),
		fmt.Sprintf("phase=%s", strings.TrimSpace(phase)),
	)
	for _, key := range keys {
		parts = append(parts, fmt.Sprintf("%s=%v", key, fields[key]))
	}
	observability.NamedLogger("esign.send").Debug(strings.Join(parts, " "))
}

func LogSendPhaseDuration(component, phase string, startedAt time.Time, fields map[string]any) {
	if fields == nil {
		fields = map[string]any{}
	}
	fields["elapsed_ms"] = time.Since(startedAt).Milliseconds()
	LogSendDebug(component, phase, fields)
}

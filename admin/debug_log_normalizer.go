package admin

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"math"
	"reflect"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"
)

const (
	debugLogDefaultMaxDepth           = 8
	debugLogDefaultMaxCollectionItems = 128
	debugLogDefaultMaxStringBytes     = 16 * 1024
	debugLogDefaultMaxStackBytes      = 64 * 1024
	debugLogDefaultMaxEventBytes      = 256 * 1024
	debugLogTruncated                 = "[truncated]"
	debugLogCycle                     = "[cycle]"
)

type debugLogVisit struct {
	kind reflect.Kind
	ptr  uintptr
}

type debugLogNormalizer struct {
	limits    DebugLogLimits
	remaining int
	active    map[debugLogVisit]bool
}

func normalizeDebugLogLimits(limits DebugLogLimits) DebugLogLimits {
	if limits.MaxDepth <= 0 {
		limits.MaxDepth = debugLogDefaultMaxDepth
	}
	if limits.MaxCollectionItems <= 0 {
		limits.MaxCollectionItems = debugLogDefaultMaxCollectionItems
	}
	if limits.MaxStringBytes <= 0 {
		limits.MaxStringBytes = debugLogDefaultMaxStringBytes
	}
	if limits.MaxStackBytes <= 0 {
		limits.MaxStackBytes = debugLogDefaultMaxStackBytes
	}
	if limits.MaxEventBytes <= 0 {
		limits.MaxEventBytes = debugLogDefaultMaxEventBytes
	}
	return limits
}

func debugNormalizeSlogRecord(attrs []debugLogBoundAttr, groups []string, record slog.Record, limits DebugLogLimits) (string, map[string]any) {
	limits = normalizeDebugLogLimits(limits)
	normalizer := newDebugLogNormalizer(limits)
	message := normalizer.normalizeString(record.Message, limits.MaxStringBytes)
	if len(attrs) == 0 && record.NumAttrs() == 0 {
		return message, nil
	}
	fields := map[string]any{}
	for _, attr := range attrs {
		normalizer.addAttr(fields, attr.groups, attr.attr)
	}
	record.Attrs(func(attr slog.Attr) bool {
		normalizer.addAttr(fields, groups, attr)
		return normalizer.remaining > 0
	})
	if len(fields) == 0 {
		return message, nil
	}
	if normalizer.remaining <= 0 {
		fields["_debug_truncated"] = true
	}
	return message, fields
}

func newDebugLogNormalizer(limits DebugLogLimits) *debugLogNormalizer {
	limits = normalizeDebugLogLimits(limits)
	return &debugLogNormalizer{
		limits:    limits,
		remaining: limits.MaxEventBytes,
		active:    map[debugLogVisit]bool{},
	}
}

func debugNormalizeLogContent(message string, fields map[string]any, limits DebugLogLimits) (string, map[string]any) {
	normalizer := newDebugLogNormalizer(limits)
	message = normalizer.normalizeString(message, normalizer.limits.MaxStringBytes)
	return message, normalizer.normalizeFields(fields)
}

func (n *debugLogNormalizer) normalizeFields(fields map[string]any) map[string]any {
	if len(fields) == 0 {
		return nil
	}
	keys := make([]string, 0, len(fields))
	for key := range fields {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	out := make(map[string]any, min(len(keys), n.limits.MaxCollectionItems)+1)
	limit := min(len(keys), n.limits.MaxCollectionItems)
	for _, key := range keys[:limit] {
		if n.remaining <= 0 || !n.consume(len(key)) {
			break
		}
		out[key] = n.normalize(fields[key], 0, debugLogStackKey(key))
	}
	if len(keys) > limit || n.remaining <= 0 {
		out["_debug_truncated"] = true
	}
	return out
}

// debugAddSlogAttr keeps the legacy method-adapter bridge JSON-safe while the
// final-record handler remains the preferred capture path.
func debugAddSlogAttr(dest map[string]any, groups []string, attr slog.Attr) {
	normalizer := newDebugLogNormalizer(DebugLogLimits{})
	normalizer.addAttr(dest, groups, attr)
}

func (n *debugLogNormalizer) addAttr(dest map[string]any, groups []string, attr slog.Attr) {
	if dest == nil || n.remaining <= 0 {
		return
	}
	value := debugResolveSlogValue(attr.Value)
	if value.Kind() == slog.KindGroup {
		nested := append([]string(nil), groups...)
		if key := strings.TrimSpace(attr.Key); key != "" {
			nested = append(nested, key)
		}
		for _, groupAttr := range value.Group() {
			n.addAttr(dest, nested, groupAttr)
		}
		return
	}
	key := strings.TrimSpace(attr.Key)
	if key == "" || !n.consume(len(key)) {
		return
	}
	target, depth, ok := n.ensureGroup(dest, groups)
	if !ok {
		return
	}
	if _, exists := target[key]; !exists && len(target) >= n.limits.MaxCollectionItems {
		target["_debug_truncated"] = true
		return
	}
	target[key] = n.normalize(value.Any(), depth, debugLogStackKey(key))
}

func debugResolveSlogValue(value slog.Value) (resolved slog.Value) {
	defer func() {
		if recovered := recover(); recovered != nil {
			resolved = slog.StringValue(fmt.Sprintf("[log value panic: %v]", recovered))
		}
	}()
	return value.Resolve()
}

func (n *debugLogNormalizer) ensureGroup(dest map[string]any, groups []string) (map[string]any, int, bool) {
	current := dest
	depth := 0
	for _, group := range groups {
		group = strings.TrimSpace(group)
		if group == "" {
			continue
		}
		if depth >= n.limits.MaxDepth {
			current["_debug_truncated"] = true
			return current, depth, false
		}
		child, ok := current[group].(map[string]any)
		if !ok {
			if len(current) >= n.limits.MaxCollectionItems || !n.consume(len(group)) {
				current["_debug_truncated"] = true
				return current, depth, false
			}
			child = map[string]any{}
			current[group] = child
		}
		current = child
		depth++
	}
	return current, depth, true
}

func debugLogStackKey(key string) bool {
	return key == "stack" || key == "stack_trace"
}

func (n *debugLogNormalizer) normalize(value any, depth int, stack bool) any {
	if value == nil {
		return nil
	}
	if n.remaining <= 0 {
		return debugLogTruncated
	}
	if depth >= n.limits.MaxDepth {
		n.consume(len(debugLogTruncated))
		return debugLogTruncated
	}

	reflected := reflect.ValueOf(value)
	if isNilReflectValue(reflected) {
		return nil
	}

	switch typed := value.(type) {
	case string:
		limit := n.limits.MaxStringBytes
		if stack {
			limit = n.limits.MaxStackBytes
		}
		return n.normalizeString(typed, limit)
	case []byte:
		return n.normalizeString(string(typed), n.limits.MaxStringBytes)
	case error:
		return n.normalizeString(debugSafeError(typed), n.limits.MaxStringBytes)
	case time.Time:
		return n.normalizeString(typed.Format(time.RFC3339Nano), n.limits.MaxStringBytes)
	case time.Duration:
		return n.normalizeString(typed.String(), n.limits.MaxStringBytes)
	case json.Number:
		return n.normalizeString(typed.String(), n.limits.MaxStringBytes)
	case fmt.Stringer:
		return n.normalizeString(debugSafeStringer(typed), n.limits.MaxStringBytes)
	case bool:
		n.consume(5)
		return typed
	case int, int8, int16, int32, int64,
		uint, uint8, uint16, uint32, uint64, uintptr:
		n.consume(24)
		return typed
	case float32:
		return n.normalizeFloat(float64(typed), 32)
	case float64:
		return n.normalizeFloat(typed, 64)
	}

	return n.normalizeReflect(reflected, depth, stack)
}

func (n *debugLogNormalizer) normalizeReflect(value reflect.Value, depth int, stack bool) any {
	if !value.IsValid() || isNilReflectValue(value) {
		return nil
	}
	if value.Kind() == reflect.Interface {
		return n.normalizeReflect(value.Elem(), depth, stack)
	}
	if value.Kind() == reflect.Pointer {
		if n.enter(value) {
			defer n.leave(value)
			return n.normalizeReflect(value.Elem(), depth+1, stack)
		}
		n.consume(len(debugLogCycle))
		return debugLogCycle
	}

	switch value.Kind() {
	case reflect.Map:
		if !n.enter(value) {
			n.consume(len(debugLogCycle))
			return debugLogCycle
		}
		defer n.leave(value)
		keys := value.MapKeys()
		sort.Slice(keys, func(i, j int) bool { return debugReflectKey(keys[i]) < debugReflectKey(keys[j]) })
		out := map[string]any{}
		limit := min(len(keys), n.limits.MaxCollectionItems)
		for _, keyValue := range keys[:limit] {
			key := debugReflectKey(keyValue)
			if key == "" || !n.consume(len(key)) {
				break
			}
			mapValue := value.MapIndex(keyValue)
			if !mapValue.IsValid() || !mapValue.CanInterface() {
				out[key] = "[unsupported value]"
				continue
			}
			out[key] = n.normalize(mapValue.Interface(), depth+1, debugLogStackKey(key))
		}
		if len(keys) > limit || n.remaining <= 0 {
			out["_debug_truncated"] = true
		}
		return out
	case reflect.Slice, reflect.Array:
		if value.Kind() == reflect.Slice {
			if !n.enter(value) {
				n.consume(len(debugLogCycle))
				return debugLogCycle
			}
			defer n.leave(value)
		}
		limit := min(value.Len(), n.limits.MaxCollectionItems)
		out := make([]any, 0, limit+1)
		for i := 0; i < limit && n.remaining > 0; i++ {
			item := value.Index(i)
			if !item.IsValid() || !item.CanInterface() {
				out = append(out, "[unsupported value]")
				continue
			}
			out = append(out, n.normalize(item.Interface(), depth+1, false))
		}
		if value.Len() > limit || n.remaining <= 0 {
			out = append(out, debugLogTruncated)
		}
		return out
	case reflect.String:
		return n.normalizeString(value.String(), n.limits.MaxStringBytes)
	case reflect.Bool:
		n.consume(5)
		return value.Bool()
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		n.consume(24)
		return value.Interface()
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64, reflect.Uintptr:
		n.consume(24)
		return value.Interface()
	case reflect.Float32, reflect.Float64:
		return n.normalizeFloat(value.Float(), value.Type().Bits())
	default:
		marker := fmt.Sprintf("[unsupported %s]", value.Type())
		return n.normalizeString(marker, n.limits.MaxStringBytes)
	}
}

func (n *debugLogNormalizer) normalizeFloat(value float64, bits int) any {
	n.consume(24)
	if math.IsNaN(value) || math.IsInf(value, 0) {
		return fmt.Sprintf("[non-finite %s]", strconv.FormatFloat(value, 'g', -1, bits))
	}
	return value
}

func (n *debugLogNormalizer) normalizeString(value string, limit int) string {
	if limit <= 0 {
		limit = n.limits.MaxStringBytes
	}
	truncated := false
	if len(value) > limit {
		value = truncateUTF8Bytes(value, max(0, limit-len("… [truncated]"))) + "… [truncated]"
		truncated = true
	}
	if len(value) > n.remaining {
		value = truncateUTF8Bytes(value, max(0, n.remaining-len("… [truncated]"))) + "… [truncated]"
		truncated = true
	}
	n.consume(len(value))
	if truncated && value == "… [truncated]" && n.remaining <= 0 {
		return debugLogTruncated
	}
	return value
}

func (n *debugLogNormalizer) consume(size int) bool {
	if size <= 0 {
		return n.remaining > 0
	}
	if size > n.remaining {
		n.remaining = 0
		return false
	}
	n.remaining -= size
	return true
}

func (n *debugLogNormalizer) enter(value reflect.Value) bool {
	ptr := reflectPointer(value)
	if ptr == 0 {
		return true
	}
	visit := debugLogVisit{kind: value.Kind(), ptr: ptr}
	if n.active[visit] {
		return false
	}
	n.active[visit] = true
	return true
}

func (n *debugLogNormalizer) leave(value reflect.Value) {
	ptr := reflectPointer(value)
	if ptr != 0 {
		delete(n.active, debugLogVisit{kind: value.Kind(), ptr: ptr})
	}
}

func reflectPointer(value reflect.Value) uintptr {
	switch value.Kind() {
	case reflect.Map, reflect.Pointer, reflect.Slice:
		if !value.IsNil() {
			return value.Pointer()
		}
	}
	return 0
}

func isNilReflectValue(value reflect.Value) bool {
	if !value.IsValid() {
		return true
	}
	switch value.Kind() {
	case reflect.Chan, reflect.Func, reflect.Interface, reflect.Map, reflect.Pointer, reflect.Slice:
		return value.IsNil()
	default:
		return false
	}
}

func debugReflectKey(value reflect.Value) (out string) {
	defer func() {
		if recovered := recover(); recovered != nil {
			out = fmt.Sprintf("[map key panic: %v]", recovered)
		}
	}()
	if !value.IsValid() || !value.CanInterface() {
		return ""
	}
	switch value.Kind() {
	case reflect.String:
		return value.String()
	case reflect.Bool:
		return strconv.FormatBool(value.Bool())
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return strconv.FormatInt(value.Int(), 10)
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64, reflect.Uintptr:
		return strconv.FormatUint(value.Uint(), 10)
	case reflect.Float32, reflect.Float64:
		return strconv.FormatFloat(value.Float(), 'g', -1, value.Type().Bits())
	default:
		return fmt.Sprintf("[unsupported key %s]", value.Type())
	}
}

func debugSafeError(err error) (out string) {
	defer func() {
		if recovered := recover(); recovered != nil {
			out = fmt.Sprintf("[error panic: %v]", recovered)
		}
	}()
	return err.Error()
}

func debugSafeStringer(value fmt.Stringer) (out string) {
	defer func() {
		if recovered := recover(); recovered != nil {
			out = fmt.Sprintf("[stringer panic: %v]", recovered)
		}
	}()
	return value.String()
}

func truncateUTF8Bytes(value string, limit int) string {
	if limit <= 0 {
		return ""
	}
	if len(value) <= limit {
		return value
	}
	value = value[:limit]
	for !utf8.ValidString(value) && len(value) > 0 {
		value = value[:len(value)-1]
	}
	return value
}

func debugTakeStringField(fields map[string]any, key string) string {
	if len(fields) == 0 {
		return ""
	}
	value, ok := fields[key]
	if !ok {
		return ""
	}
	delete(fields, key)
	if value == nil {
		return ""
	}
	if text, ok := value.(string); ok {
		return strings.TrimSpace(text)
	}
	return strings.TrimSpace(fmt.Sprint(value))
}

func debugSlogCaller(record slog.Record) (*LogCaller, string) {
	if record.PC == 0 {
		return nil, ""
	}
	frame, _ := runtime.CallersFrames([]uintptr{record.PC}).Next()
	if frame.File == "" && frame.Function == "" {
		return nil, ""
	}
	caller := &LogCaller{Function: frame.Function, File: frame.File, Line: frame.Line}
	source := frame.Function
	if source == "" && frame.Line > 0 {
		source = fmt.Sprintf("%s:%d", frame.File, frame.Line)
	}
	if source == "" {
		source = frame.File
	}
	return caller, source
}

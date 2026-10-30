package admin

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"math/big"
	"reflect"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"
)

var activityIngestionNumberPattern = regexp.MustCompile(`^(-?)(0|[1-9][0-9]*)(?:\.([0-9]+))?(?:[eE]([+-]?[0-9]+))?$`)
var activityIngestionReserved = map[string]bool{
	"_ingestion": true, "actor_type": true, "actorType": true, "actor_display": true, "object_display": true, "action_display": true,
	"actor_href": true, "object_href": true, "producer_id": true, "tenant_id": true, "org_id": true, "actor_id": true, "user_id": true, "role": true,
}

// DecodeActivityIngestionEvent is the shared strict wire decoder. It rejects
// duplicate/unknown fields, null optional envelope fields, trailing JSON, invalid
// UTF-8 and excessive depth/size, and canonicalizes exact decimal numbers.
func DecodeActivityIngestionEvent(raw []byte) (ActivityIngestionEvent, error) {
	value, err := decodeActivityIngestionJSON(raw, ActivityIngestionMaxEnvelopeBytes, false)
	if err != nil {
		return ActivityIngestionEvent{}, err
	}
	m, ok := value.(map[string]any)
	if !ok {
		return ActivityIngestionEvent{}, ErrActivityIngestionInvalid
	}
	if err = activityIngestionFields(m, "schema_version event_id occurred_at scope actor subject_user_id action object channel correlation_id metadata"); err != nil {
		return ActivityIngestionEvent{}, err
	}
	if err = activityIngestionEnvelopeObjects(m); err != nil {
		return ActivityIngestionEvent{}, err
	}
	if subject, exists := m["subject_user_id"]; exists && subject == "" {
		return ActivityIngestionEvent{}, ErrActivityIngestionInvalid
	}
	if v, exists := m["metadata"]; exists {
		if _, ok := v.(map[string]any); !ok {
			return ActivityIngestionEvent{}, ErrActivityIngestionInvalid
		}
	}
	encoded, err := encodeActivityIngestionJSON(m, ActivityIngestionMaxEnvelopeBytes, false)
	if err != nil {
		return ActivityIngestionEvent{}, err
	}
	var event ActivityIngestionEvent
	if json.Unmarshal(encoded, &event) != nil {
		return event, ErrActivityIngestionInvalid
	}
	return validateActivityIngestionEvent(event)
}

func activityIngestionEnvelopeObjects(m map[string]any) error {
	for key, fields := range map[string]string{"scope": "tenant_id org_id", "actor": "kind id", "object": "type id"} {
		value, exists := m[key]
		if !exists {
			continue
		}
		child, ok := value.(map[string]any)
		if !ok {
			return ErrActivityIngestionInvalid
		}
		if err := activityIngestionObjectFields(child, fields); err != nil {
			return err
		}
	}
	return nil
}

func activityIngestionObjectFields(child map[string]any, fields string) error {
	for name, value := range child {
		if (name == "tenant_id" || name == "org_id" || name == "id") && value == "" {
			return ErrActivityIngestionInvalid
		}
	}
	return activityIngestionFields(child, fields)
}
func activityIngestionFields(m map[string]any, allowed string) error {
	for k, v := range m {
		if !activityIngestionKnownField(k, allowed) || v == nil {
			return ErrActivityIngestionInvalid
		}
	}
	return nil
}
func activityIngestionKnownField(key, allowed string) bool {
	for field := range strings.FieldsSeq(allowed) {
		if key == field {
			return true
		}
	}
	return false
}
func normalizeActivityIngestionEvent(event ActivityIngestionEvent) (ActivityIngestionEvent, error) {
	// Bound raw input before json.Marshal, including direct service callers.
	event, err := validateActivityIngestionEvent(event)
	if err != nil {
		return event, err
	}
	raw, err := json.Marshal(event)
	if err != nil {
		return event, ErrActivityIngestionInvalid
	}
	if len(raw) > ActivityIngestionMaxEnvelopeBytes {
		return event, ErrActivityIngestionTooLarge
	}
	return event, nil
}
func validateActivityIngestionEvent(e ActivityIngestionEvent) (ActivityIngestionEvent, error) {
	if !validActivityIngestionEventIDs(e) {
		return e, ErrActivityIngestionInvalid
	}
	if e.OccurredAt.IsZero() || e.OccurredAt.Year() < 1 || e.OccurredAt.Year() > 9999 || e.OccurredAt.Nanosecond()%1000 != 0 {
		return e, ErrActivityIngestionInvalid
	}
	e.OccurredAt = e.OccurredAt.UTC()
	var err error
	e.Scope, err = activityIngestionScope(e.Scope, true)
	if err != nil {
		return e, err
	}
	e.SubjectUserID, err = activityIngestionUUID(e.SubjectUserID, true)
	if err != nil {
		return e, err
	}
	switch e.Actor.Kind {
	case "user":
		e.Actor.ID, err = activityIngestionUUID(e.Actor.ID, false)
		if err != nil {
			return e, err
		}
	case "system", "job":
		if e.Actor.ID != "" {
			return e, ErrActivityIngestionInvalid
		}
	default:
		return e, ErrActivityIngestionInvalid
	}
	if len(e.Metadata) == 0 {
		e.Metadata = json.RawMessage(`{}`)
	}
	value, err := decodeActivityIngestionMetadata(e.Metadata, ActivityIngestionMaxMetadataBytes)
	if err != nil {
		return e, err
	}
	if _, ok := value.(map[string]any); !ok {
		return e, ErrActivityIngestionInvalid
	}
	e.Metadata, err = encodeActivityIngestionJSONAtDepth(value, ActivityIngestionMaxMetadataBytes, true, 1)
	return e, err
}

func validActivityIngestionEventIDs(e ActivityIngestionEvent) bool {
	return e.SchemaVersion == 1 && validActivityIngestionID(e.EventID, 128) &&
		validActivityIngestionID(e.Action, 128) && validActivityIngestionID(e.Channel, 128) &&
		validActivityIngestionID(e.Object.Type, 128) && validActivityIngestionID(e.Object.ID, 512) &&
		(e.CorrelationID == "" || validActivityIngestionID(e.CorrelationID, 128))
}

// ActivityIngestionFingerprint compares normalized content under a retained
// algorithm version. Scope must already be resolved; disclosure/provenance are
// deliberately excluded. Equivalent decimals, UUIDs and UTC instants compare equal.
func ActivityIngestionFingerprint(event ActivityIngestionEvent, version int) (string, error) {
	if version != ActivityIngestionFingerprintV1 {
		return "", ErrActivityIngestionReplayVersion
	}
	event, err := normalizeActivityIngestionEvent(event)
	if err != nil {
		return "", err
	}
	if _, err = activityIngestionScope(event.Scope, false); err != nil {
		return "", err
	}
	raw, err := json.Marshal(event)
	if err != nil {
		return "", ErrActivityIngestionInvalid
	}
	sum := sha256.Sum256(append([]byte("activity.ingest.fingerprint.v1\n"), raw...))
	return hex.EncodeToString(sum[:]), nil
}

func decodeActivityIngestionJSON(raw []byte, limit int, reserved bool) (any, error) {
	return decodeActivityIngestionJSONAtDepth(raw, limit, reserved, 0)
}

// Metadata occupies depth one in the event envelope, including when supplied by
// a typed caller or disclosure callback. Keep every entry on that same boundary.
func decodeActivityIngestionMetadata(raw []byte, limit int) (any, error) {
	return decodeActivityIngestionJSONAtDepth(raw, limit, true, 1)
}

func decodeActivityIngestionJSONAtDepth(raw []byte, limit int, reserved bool, depth int) (any, error) {
	if len(raw) > ActivityIngestionMaxEnvelopeBytes || len(raw) > limit*2 {
		return nil, ErrActivityIngestionTooLarge
	}
	if !utf8.Valid(raw) {
		return nil, ErrActivityIngestionInvalid
	}
	d := json.NewDecoder(bytes.NewReader(raw))
	d.UseNumber()
	remaining := limit
	v, err := readActivityIngestionJSON(d, depth, &remaining, reserved)
	if err != nil {
		return nil, err
	}
	if _, err = d.Token(); !errors.Is(err, io.EOF) {
		return nil, ErrActivityIngestionInvalid
	}
	return v, nil
}
func readActivityIngestionJSON(d *json.Decoder, depth int, budget *int, reserved bool) (any, error) {
	if depth > ActivityIngestionMaxDepth {
		return nil, ErrActivityIngestionTooLarge
	}
	token, err := d.Token()
	if err != nil {
		return nil, ErrActivityIngestionInvalid
	}
	if delim, ok := token.(json.Delim); ok {
		*budget -= 2
		if *budget < 0 {
			return nil, ErrActivityIngestionTooLarge
		}
		switch delim {
		case '{':
			return readActivityIngestionObject(d, depth, budget, reserved)
		case '[':
			return readActivityIngestionArray(d, depth, budget, reserved)
		default:
			return nil, ErrActivityIngestionInvalid
		}
	}
	if n, ok := token.(json.Number); ok {
		normalized, numberErr := canonicalActivityIngestionNumber(n, *budget)
		if numberErr != nil {
			return nil, numberErr
		}
		*budget -= len(normalized)
		return normalized, nil
	}
	raw, err := json.Marshal(token)
	if err != nil {
		return nil, ErrActivityIngestionInvalid
	}
	*budget -= len(raw)
	if *budget < 0 {
		return nil, ErrActivityIngestionTooLarge
	}
	return token, nil
}

func readActivityIngestionObject(d *json.Decoder, depth int, budget *int, reserved bool) (any, error) {
	m := map[string]any{}
	for d.More() {
		keyToken, err := d.Token()
		if err != nil {
			return nil, ErrActivityIngestionInvalid
		}
		key, ok := keyToken.(string)
		if !ok {
			return nil, ErrActivityIngestionInvalid
		}
		if _, exists := m[key]; exists || (reserved && activityIngestionReserved[key]) {
			return nil, ErrActivityIngestionInvalid
		}
		keyBytes, err := json.Marshal(key)
		if err != nil {
			return nil, ErrActivityIngestionInvalid
		}
		*budget -= len(keyBytes) + 1
		if len(m) > 0 {
			*budget--
		}
		if *budget < 0 {
			return nil, ErrActivityIngestionTooLarge
		}
		child, err := readActivityIngestionJSON(d, depth+1, budget, reserved)
		if err != nil {
			return nil, err
		}
		m[key] = child
	}
	end, err := d.Token()
	if err != nil || end != json.Delim('}') {
		return nil, ErrActivityIngestionInvalid
	}
	return m, nil
}

func readActivityIngestionArray(d *json.Decoder, depth int, budget *int, reserved bool) (any, error) {
	a := []any{}
	for d.More() {
		if len(a) > 0 {
			*budget--
		}
		child, err := readActivityIngestionJSON(d, depth+1, budget, reserved)
		if err != nil {
			return nil, err
		}
		a = append(a, child)
	}
	end, err := d.Token()
	if err != nil || end != json.Delim(']') {
		return nil, ErrActivityIngestionInvalid
	}
	return a, nil
}

// canonicalActivityIngestionNumber checks total expanded size before allocation.
func canonicalActivityIngestionNumber(n json.Number, limit int) (json.Number, error) {
	p := activityIngestionNumberPattern.FindStringSubmatch(string(n))
	if p == nil {
		return "", ErrActivityIngestionInvalid
	}
	digits := strings.TrimLeft(p[2]+p[3], "0")
	if digits == "" {
		if limit < 1 {
			return "", ErrActivityIngestionTooLarge
		}
		return "0", nil
	}
	var exponent big.Int
	if p[4] != "" {
		if _, ok := exponent.SetString(p[4], 10); !ok {
			return "", ErrActivityIngestionInvalid
		}
	}
	clean := strings.TrimRight(digits, "0")
	exponent.Add(&exponent, big.NewInt(int64(len(digits)-len(clean)-len(p[3]))))
	if !exponent.IsInt64() {
		return "", ErrActivityIngestionTooLarge
	}
	shift := exponent.Int64()
	// PostgreSQL JSONB uses numeric with at most 16383 fractional digits.
	// Enforce the shared storage contract before expansion on every entry path;
	// a bounded JSON token must not become a permanently retryable SQL failure.
	if shift < -int64(ActivityIngestionMaxFractionDigits) {
		return "", ErrActivityIngestionTooLarge
	}
	sign := p[1]
	remaining := int64(limit - len(clean) - len(sign))
	if remaining < 0 || shift > remaining || shift < -int64(limit) {
		return "", ErrActivityIngestionTooLarge
	}
	point := int64(len(clean)) + shift
	switch {
	case shift >= 0:
		return json.Number(sign + clean + strings.Repeat("0", int(shift))), nil
	case point > 0:
		if remaining < 1 {
			return "", ErrActivityIngestionTooLarge
		}
		return json.Number(sign + clean[:point] + "." + clean[point:]), nil
	default:
		if remaining < 2-point {
			return "", ErrActivityIngestionTooLarge
		}
		return json.Number(sign + "0." + strings.Repeat("0", int(-point)) + clean), nil
	}
}

// Native factory inputs use a bounded encoder; floats and custom marshalers are
// rejected before json.Marshal can round data, execute code, or allocate freely.
func encodeActivityIngestionJSON(value any, limit int, reserved bool) ([]byte, error) {
	return encodeActivityIngestionJSONAtDepth(value, limit, reserved, 0)
}

func encodeActivityIngestionJSONAtDepth(value any, limit int, reserved bool, initialDepth int) ([]byte, error) {
	e := activityIngestionJSONEncoder{limit: limit, reserved: reserved}
	if err := e.write(value, initialDepth); err != nil {
		return nil, err
	}
	return e.buffer.Bytes(), nil
}

type activityIngestionJSONEncoder struct {
	buffer   bytes.Buffer
	limit    int
	reserved bool
}

func (e *activityIngestionJSONEncoder) put(raw []byte) error {
	if len(raw) > e.limit-e.buffer.Len() {
		return ErrActivityIngestionTooLarge
	}
	_, err := e.buffer.Write(raw)
	return err
}

func (e *activityIngestionJSONEncoder) write(v any, depth int) error {
	if depth > ActivityIngestionMaxDepth {
		return ErrActivityIngestionTooLarge
	}
	switch x := v.(type) {
	case map[string]any:
		return e.object(x, depth)
	case []any:
		return e.array(x, depth)
	case json.Number:
		n, err := canonicalActivityIngestionNumber(x, e.limit-e.buffer.Len())
		if err != nil {
			return err
		}
		return e.put([]byte(n))
	case string:
		return e.string(x)
	case nil:
		return e.put([]byte("null"))
	case bool:
		return e.put([]byte(strconv.FormatBool(x)))
	default:
		return e.integer(v)
	}
}

func (e *activityIngestionJSONEncoder) object(x map[string]any, depth int) error {
	if len(x) > e.limit-e.buffer.Len() {
		return ErrActivityIngestionTooLarge
	}
	if err := e.put([]byte("{")); err != nil {
		return err
	}
	keys := make([]string, 0, len(x))
	for k := range x {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for i, k := range keys {
		if e.reserved && activityIngestionReserved[k] {
			return ErrActivityIngestionInvalid
		}
		if i > 0 {
			if err := e.put([]byte(",")); err != nil {
				return err
			}
		}
		if err := e.write(k, depth+1); err != nil {
			return err
		}
		if err := e.put([]byte(":")); err != nil {
			return err
		}
		if err := e.write(x[k], depth+1); err != nil {
			return err
		}
	}
	return e.put([]byte("}"))
}

func (e *activityIngestionJSONEncoder) array(x []any, depth int) error {
	if len(x) > e.limit-e.buffer.Len() {
		return ErrActivityIngestionTooLarge
	}
	if err := e.put([]byte("[")); err != nil {
		return err
	}
	for i, v := range x {
		if i > 0 {
			if err := e.put([]byte(",")); err != nil {
				return err
			}
		}
		if err := e.write(v, depth+1); err != nil {
			return err
		}
	}
	return e.put([]byte("]"))
}

func (e *activityIngestionJSONEncoder) string(x string) error {
	if !utf8.ValidString(x) {
		return ErrActivityIngestionInvalid
	}
	if len(x) > e.limit-e.buffer.Len() {
		return ErrActivityIngestionTooLarge
	}
	raw, err := json.Marshal(x)
	if err != nil {
		return ErrActivityIngestionInvalid
	}
	return e.put(raw)
}

func (e *activityIngestionJSONEncoder) integer(v any) error {
	if v == nil {
		return ErrActivityIngestionInvalid
	}
	r := reflect.ValueOf(v)
	switch r.Kind() {
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return e.put([]byte(strconv.FormatInt(r.Int(), 10)))
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return e.put([]byte(strconv.FormatUint(r.Uint(), 10)))
	default:
		return ErrActivityIngestionInvalid
	}
}

func cloneActivityIngestionEvent(e ActivityIngestionEvent) ActivityIngestionEvent {
	e.Metadata = append(json.RawMessage(nil), e.Metadata...)
	return e
}
func activityIngestionValidInterval(now, from, until time.Time) bool {
	return !from.IsZero() && !until.IsZero() && until.After(from) && !now.Before(from) && now.Before(until)
}

// MarshalJSON omits unresolved scope dimensions instead of serializing invalid
// empty UUID strings. Shape validation and service resolution remain separate.
func (e ActivityIngestionEvent) MarshalJSON() ([]byte, error) {
	type wire ActivityIngestionEvent
	type wireScope struct {
		TenantID string `json:"tenant_id,omitempty"`
		OrgID    string `json:"org_id,omitempty"`
	}
	var scope *wireScope
	if e.Scope.TenantID != "" || e.Scope.OrgID != "" {
		scope = &wireScope{TenantID: e.Scope.TenantID, OrgID: e.Scope.OrgID}
	}
	return json.Marshal(struct {
		wire
		Scope *wireScope `json:"scope,omitempty"`
	}{wire: wire(e), Scope: scope})
}

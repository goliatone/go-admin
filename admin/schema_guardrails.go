package admin

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"sync"
	"time"

	goerrors "github.com/goliatone/go-errors"
)

// Schema validation limits
const (
	// DefaultSchemaMaxSizeBytes is the maximum JSON schema size in bytes (1MB)
	DefaultSchemaMaxSizeBytes = 1 * 1024 * 1024
	// DefaultSchemaMaxFields is the maximum number of fields allowed in a schema
	DefaultSchemaMaxFields = 200
	// DefaultSchemaMaxDepth is the maximum nesting depth for properties/items
	DefaultSchemaMaxDepth = 10
	// DefaultUISchemaMaxSizeBytes is the maximum UI schema overlay size (512KB)
	DefaultUISchemaMaxSizeBytes = 512 * 1024
	// DefaultPreviewHTMLMaxSizeBytes is the maximum generated HTML preview size (2MB)
	DefaultPreviewHTMLMaxSizeBytes = 2 * 1024 * 1024
)

// Reserved field names that cannot be used in content type schemas
var reservedFieldNames = map[string]bool{
	"_schema":      true,
	"_type":        true,
	"_id":          true,
	"_rev":         true,
	"_version":     true,
	"_created":     true,
	"_updated":     true,
	"_deleted":     true,
	"_meta":        true,
	"_permissions": true,
	"_tenant":      true,
	"_tenant_id":   true,
	"_org":         true,
	"_org_id":      true,
}

// SchemaGuardrails provides validation and security checks for content type schemas
type SchemaGuardrails struct {
	MaxSizeBytes           int
	MaxFields              int
	MaxDepth               int
	UISchemaMaxSizeBytes   int
	PreviewHTMLMaxSizeBytes int
	ReservedFields         map[string]bool
}

// NewSchemaGuardrails creates guardrails with default limits
func NewSchemaGuardrails() *SchemaGuardrails {
	return &SchemaGuardrails{
		MaxSizeBytes:           DefaultSchemaMaxSizeBytes,
		MaxFields:              DefaultSchemaMaxFields,
		MaxDepth:               DefaultSchemaMaxDepth,
		UISchemaMaxSizeBytes:   DefaultUISchemaMaxSizeBytes,
		PreviewHTMLMaxSizeBytes: DefaultPreviewHTMLMaxSizeBytes,
		ReservedFields:         reservedFieldNames,
	}
}

// SchemaGuardrailsOption configures guardrails
type SchemaGuardrailsOption func(*SchemaGuardrails)

// WithSchemaMaxSize sets the maximum schema size in bytes
func WithSchemaMaxSize(bytes int) SchemaGuardrailsOption {
	return func(g *SchemaGuardrails) {
		if bytes > 0 {
			g.MaxSizeBytes = bytes
		}
	}
}

// WithSchemaMaxFields sets the maximum number of fields
func WithSchemaMaxFields(count int) SchemaGuardrailsOption {
	return func(g *SchemaGuardrails) {
		if count > 0 {
			g.MaxFields = count
		}
	}
}

// WithSchemaMaxDepth sets the maximum nesting depth
func WithSchemaMaxDepth(depth int) SchemaGuardrailsOption {
	return func(g *SchemaGuardrails) {
		if depth > 0 {
			g.MaxDepth = depth
		}
	}
}

// SchemaValidationResult holds validation results
type SchemaValidationResult struct {
	Valid      bool              `json:"valid"`
	FieldCount int               `json:"field_count,omitempty"`
	MaxDepth   int               `json:"max_depth,omitempty"`
	SizeBytes  int               `json:"size_bytes,omitempty"`
	Errors     map[string]string `json:"errors,omitempty"`
}

// ValidateSchema performs comprehensive schema validation
func (g *SchemaGuardrails) ValidateSchema(schema map[string]any) (*SchemaValidationResult, error) {
	result := &SchemaValidationResult{
		Valid:  true,
		Errors: make(map[string]string),
	}

	// Check schema size
	schemaJSON, err := json.Marshal(schema)
	if err != nil {
		result.Valid = false
		result.Errors["schema"] = "invalid JSON schema format"
		return result, guardrailError("schema", "invalid JSON schema format")
	}

	result.SizeBytes = len(schemaJSON)
	if result.SizeBytes > g.MaxSizeBytes {
		result.Valid = false
		result.Errors["schema"] = fmt.Sprintf("schema exceeds maximum size of %d bytes (got %d)", g.MaxSizeBytes, result.SizeBytes)
		return result, guardrailError("schema", result.Errors["schema"])
	}

	// Count fields and check depth
	fieldCount, maxDepth := g.countFieldsAndDepth(schema, 0)
	result.FieldCount = fieldCount
	result.MaxDepth = maxDepth

	if fieldCount > g.MaxFields {
		result.Valid = false
		result.Errors["schema"] = fmt.Sprintf("schema exceeds maximum field count of %d (got %d)", g.MaxFields, fieldCount)
		return result, guardrailError("schema", result.Errors["schema"])
	}

	if maxDepth > g.MaxDepth {
		result.Valid = false
		result.Errors["schema"] = fmt.Sprintf("schema exceeds maximum depth of %d (got %d)", g.MaxDepth, maxDepth)
		return result, guardrailError("schema", result.Errors["schema"])
	}

	// Check for reserved field names
	reservedViolations := g.checkReservedFields(schema)
	if len(reservedViolations) > 0 {
		result.Valid = false
		result.Errors["reserved_fields"] = fmt.Sprintf("schema contains reserved field names: %s", strings.Join(reservedViolations, ", "))
		return result, guardrailError("reserved_fields", result.Errors["reserved_fields"])
	}

	return result, nil
}

// countFieldsAndDepth recursively counts fields and tracks nesting depth
func (g *SchemaGuardrails) countFieldsAndDepth(schema map[string]any, currentDepth int) (int, int) {
	fieldCount := 0
	maxDepth := currentDepth

	// Count properties
	if props, ok := schema["properties"].(map[string]any); ok {
		for _, propValue := range props {
			fieldCount++
			if propSchema, ok := propValue.(map[string]any); ok {
				// Recurse into nested object properties
				if _, hasProps := propSchema["properties"]; hasProps {
					subCount, subDepth := g.countFieldsAndDepth(propSchema, currentDepth+1)
					fieldCount += subCount
					if subDepth > maxDepth {
						maxDepth = subDepth
					}
				}
				// Check array items
				if items, ok := propSchema["items"].(map[string]any); ok {
					if _, hasProps := items["properties"]; hasProps {
						subCount, subDepth := g.countFieldsAndDepth(items, currentDepth+1)
						fieldCount += subCount
						if subDepth > maxDepth {
							maxDepth = subDepth
						}
					}
				}
			}
		}
	}

	// Handle definitions/defs
	for _, key := range []string{"definitions", "$defs"} {
		if defs, ok := schema[key].(map[string]any); ok {
			for _, defValue := range defs {
				if defSchema, ok := defValue.(map[string]any); ok {
					subCount, subDepth := g.countFieldsAndDepth(defSchema, currentDepth+1)
					fieldCount += subCount
					if subDepth > maxDepth {
						maxDepth = subDepth
					}
				}
			}
		}
	}

	return fieldCount, maxDepth
}

// checkReservedFields returns a list of reserved field names found in the schema
func (g *SchemaGuardrails) checkReservedFields(schema map[string]any) []string {
	violations := []string{}

	props, ok := schema["properties"].(map[string]any)
	if !ok {
		return violations
	}

	for fieldName := range props {
		if g.ReservedFields[fieldName] {
			violations = append(violations, fieldName)
		}
	}

	return violations
}

// ValidateUISchema validates UI schema overlay format and JSON Pointer targets
func (g *SchemaGuardrails) ValidateUISchema(uiSchema map[string]any, jsonSchema map[string]any) error {
	if uiSchema == nil {
		return nil
	}

	// Check UI schema size
	uiSchemaJSON, err := json.Marshal(uiSchema)
	if err != nil {
		return guardrailError("ui_schema", "invalid UI schema format")
	}

	if len(uiSchemaJSON) > g.UISchemaMaxSizeBytes {
		return guardrailError("ui_schema", fmt.Sprintf("UI schema exceeds maximum size of %d bytes (got %d)", g.UISchemaMaxSizeBytes, len(uiSchemaJSON)))
	}

	// Validate JSON Pointer targets reference existing fields
	if fields, ok := uiSchema["fields"].(map[string]any); ok {
		for pointer := range fields {
			if !g.validateJSONPointerTarget(pointer, jsonSchema) {
				return guardrailError("ui_schema", fmt.Sprintf("UI schema references non-existent field: %s", pointer))
			}
		}
	}

	// Validate layout references
	if layout, ok := uiSchema["layout"].(map[string]any); ok {
		if err := g.validateLayoutReferences(layout, jsonSchema); err != nil {
			return err
		}
	}

	return nil
}

// validateJSONPointerTarget checks if a JSON Pointer references a valid field
func (g *SchemaGuardrails) validateJSONPointerTarget(pointer string, schema map[string]any) bool {
	// Handle root pointer
	if pointer == "" || pointer == "/" {
		return true
	}

	// Normalize pointer (remove leading / if present)
	pointer = strings.TrimPrefix(pointer, "/")

	// Split by / for nested paths
	parts := strings.Split(pointer, "/")
	if len(parts) == 0 {
		return false
	}

	// Navigate schema to find the field
	current := schema
	for i, part := range parts {
		// Unescape JSON Pointer special characters
		part = strings.ReplaceAll(part, "~1", "/")
		part = strings.ReplaceAll(part, "~0", "~")

		props, ok := current["properties"].(map[string]any)
		if !ok {
			return false
		}

		field, exists := props[part]
		if !exists {
			return false
		}

		// If not the last part, continue navigating
		if i < len(parts)-1 {
			fieldSchema, ok := field.(map[string]any)
			if !ok {
				return false
			}
			current = fieldSchema
		}
	}

	return true
}

// validateLayoutReferences checks that layout tab/section field references exist
func (g *SchemaGuardrails) validateLayoutReferences(layout map[string]any, schema map[string]any) error {
	// Check tabs
	if tabs, ok := layout["tabs"].([]any); ok {
		for _, tab := range tabs {
			tabMap, ok := tab.(map[string]any)
			if !ok {
				continue
			}
			if fields, ok := tabMap["fields"].([]any); ok {
				for _, field := range fields {
					fieldStr, ok := field.(string)
					if !ok {
						continue
					}
					if !g.validateJSONPointerTarget(fieldStr, schema) {
						return guardrailError("ui_schema", fmt.Sprintf("layout tab references non-existent field: %s", fieldStr))
					}
				}
			}
		}
	}

	// Check sections
	if sections, ok := layout["sections"].([]any); ok {
		for _, section := range sections {
			sectionMap, ok := section.(map[string]any)
			if !ok {
				continue
			}
			if fields, ok := sectionMap["fields"].([]any); ok {
				for _, field := range fields {
					fieldStr, ok := field.(string)
					if !ok {
						continue
					}
					if !g.validateJSONPointerTarget(fieldStr, schema) {
						return guardrailError("ui_schema", fmt.Sprintf("layout section references non-existent field: %s", fieldStr))
					}
				}
			}
		}
	}

	return nil
}

// ValidatePreviewHTML checks generated HTML size limits
func (g *SchemaGuardrails) ValidatePreviewHTML(html []byte) error {
	if len(html) > g.PreviewHTMLMaxSizeBytes {
		return guardrailError("preview", fmt.Sprintf("generated preview exceeds maximum size of %d bytes (got %d)", g.PreviewHTMLMaxSizeBytes, len(html)))
	}
	return nil
}

// IsReservedFieldName checks if a field name is reserved
func (g *SchemaGuardrails) IsReservedFieldName(name string) bool {
	return g.ReservedFields[name]
}

// guardrailError creates a validation error for guardrail violations
func guardrailError(field, message string) error {
	fields := map[string]string{field: message}
	return goerrors.NewValidationFromMap("schema validation failed", fields)
}

// RateLimiter provides simple rate limiting for schema validation endpoints
type RateLimiter struct {
	mu          sync.Mutex
	requests    map[string][]time.Time
	maxRequests int
	window      time.Duration
}

// NewRateLimiter creates a rate limiter with the specified limits
func NewRateLimiter(maxRequests int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		requests:    make(map[string][]time.Time),
		maxRequests: maxRequests,
		window:      window,
	}
}

// DefaultSchemaRateLimiter returns a rate limiter with default settings
// (30 requests per minute per client)
func DefaultSchemaRateLimiter() *RateLimiter {
	return NewRateLimiter(30, time.Minute)
}

// Allow checks if a request from the given key should be allowed
func (r *RateLimiter) Allow(key string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	windowStart := now.Add(-r.window)

	// Get existing requests for this key
	requests, exists := r.requests[key]
	if !exists {
		r.requests[key] = []time.Time{now}
		return true
	}

	// Filter to only requests within the window
	var validRequests []time.Time
	for _, t := range requests {
		if t.After(windowStart) {
			validRequests = append(validRequests, t)
		}
	}

	// Check if under limit
	if len(validRequests) >= r.maxRequests {
		r.requests[key] = validRequests
		return false
	}

	// Add this request
	validRequests = append(validRequests, now)
	r.requests[key] = validRequests
	return true
}

// RateLimitError creates an error for rate limit violations
func RateLimitError() error {
	return goerrors.NewValidationFromMap("rate limit exceeded", map[string]string{
		"rate_limit": "too many requests, please try again later",
	})
}

// Cleanup removes expired entries from the rate limiter
func (r *RateLimiter) Cleanup() {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	windowStart := now.Add(-r.window)

	for key, requests := range r.requests {
		var validRequests []time.Time
		for _, t := range requests {
			if t.After(windowStart) {
				validRequests = append(validRequests, t)
			}
		}
		if len(validRequests) == 0 {
			delete(r.requests, key)
		} else {
			r.requests[key] = validRequests
		}
	}
}

// rateLimitKeyFromRequest extracts a client identifier from the request for rate limiting
func rateLimitKeyFromRequest(c interface{ IP() string }) string {
	if c == nil {
		return "unknown"
	}
	ip := c.IP()
	if ip == "" {
		return "unknown"
	}
	return ip
}

// jsonPointerPattern validates JSON Pointer format (RFC 6901)
var jsonPointerPattern = regexp.MustCompile(`^(/[^/]*)*$`)

// ValidateJSONPointerFormat checks if a string is a valid JSON Pointer
func ValidateJSONPointerFormat(pointer string) bool {
	if pointer == "" {
		return true // Empty string is valid root pointer
	}
	return jsonPointerPattern.MatchString(pointer)
}

// GuardrailedSchemaValidator wraps a SchemaValidator with guardrail checks
type GuardrailedSchemaValidator struct {
	inner      SchemaValidator
	guardrails *SchemaGuardrails
}

// NewGuardrailedSchemaValidator creates a validator with guardrail checks
func NewGuardrailedSchemaValidator(inner SchemaValidator, guardrails *SchemaGuardrails) *GuardrailedSchemaValidator {
	if guardrails == nil {
		guardrails = NewSchemaGuardrails()
	}
	return &GuardrailedSchemaValidator{
		inner:      inner,
		guardrails: guardrails,
	}
}

// Validate applies guardrails then delegates to the inner validator
func (v *GuardrailedSchemaValidator) Validate(ctx context.Context, schema map[string]any, opts SchemaValidationOptions) error {
	if v == nil || v.inner == nil {
		return errors.New("schema validator not configured")
	}

	// Apply schema guardrails first
	if _, err := v.guardrails.ValidateSchema(schema); err != nil {
		return err
	}

	// Validate UI schema overlay if present
	if len(opts.UISchema) > 0 {
		if err := v.guardrails.ValidateUISchema(opts.UISchema, schema); err != nil {
			return err
		}
	}

	// Delegate to inner validator
	return v.inner.Validate(ctx, schema, opts)
}

// Preview renders a form preview after guardrail validation
func (v *GuardrailedSchemaValidator) Preview(ctx context.Context, schema map[string]any, opts SchemaValidationOptions) ([]byte, error) {
	if v == nil || v.inner == nil {
		return nil, errors.New("schema validator not configured")
	}

	// Apply schema guardrails first
	if _, err := v.guardrails.ValidateSchema(schema); err != nil {
		return nil, err
	}

	// Validate UI schema overlay if present
	if len(opts.UISchema) > 0 {
		if err := v.guardrails.ValidateUISchema(opts.UISchema, schema); err != nil {
			return nil, err
		}
	}

	// Delegate to inner previewer
	previewer, ok := v.inner.(SchemaPreviewer)
	if !ok {
		return nil, errors.New("schema preview not configured")
	}

	html, err := previewer.Preview(ctx, schema, opts)
	if err != nil {
		return nil, err
	}

	// Check preview HTML size
	if err := v.guardrails.ValidatePreviewHTML(html); err != nil {
		return nil, err
	}

	return html, nil
}

// Guardrails returns the underlying guardrails instance
func (v *GuardrailedSchemaValidator) Guardrails() *SchemaGuardrails {
	if v == nil {
		return nil
	}
	return v.guardrails
}

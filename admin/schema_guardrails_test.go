package admin

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSchemaGuardrails_ValidateSchema_SizeLimit(t *testing.T) {
	g := NewSchemaGuardrails()
	g.MaxSizeBytes = 100 // Very small limit for testing

	// Create a schema that exceeds the size limit
	largeSchema := map[string]any{
		"type": "object",
		"properties": map[string]any{
			"field1": map[string]any{"type": "string", "description": "A very long description that will make the schema exceed the size limit when serialized to JSON"},
			"field2": map[string]any{"type": "string", "description": "Another very long description that will make the schema exceed the size limit when serialized to JSON"},
		},
	}

	result, err := g.ValidateSchema(largeSchema)
	require.Error(t, err)
	assert.False(t, result.Valid)
	assert.Contains(t, result.Errors["schema"], "exceeds maximum size")
}

func TestSchemaGuardrails_ValidateSchema_FieldCountLimit(t *testing.T) {
	g := NewSchemaGuardrails()
	g.MaxFields = 3 // Very small limit for testing

	// Create a schema with too many fields
	schema := map[string]any{
		"type": "object",
		"properties": map[string]any{
			"field1": map[string]any{"type": "string"},
			"field2": map[string]any{"type": "string"},
			"field3": map[string]any{"type": "string"},
			"field4": map[string]any{"type": "string"},
		},
	}

	result, err := g.ValidateSchema(schema)
	require.Error(t, err)
	assert.False(t, result.Valid)
	assert.Contains(t, result.Errors["schema"], "exceeds maximum field count")
}

func TestSchemaGuardrails_ValidateSchema_DepthLimit(t *testing.T) {
	g := NewSchemaGuardrails()
	g.MaxDepth = 2 // Very small limit for testing

	// Create a deeply nested schema
	schema := map[string]any{
		"type": "object",
		"properties": map[string]any{
			"level1": map[string]any{
				"type": "object",
				"properties": map[string]any{
					"level2": map[string]any{
						"type": "object",
						"properties": map[string]any{
							"level3": map[string]any{
								"type": "object",
								"properties": map[string]any{
									"level4": map[string]any{"type": "string"},
								},
							},
						},
					},
				},
			},
		},
	}

	result, err := g.ValidateSchema(schema)
	require.Error(t, err)
	assert.False(t, result.Valid)
	assert.Contains(t, result.Errors["schema"], "exceeds maximum depth")
}

func TestSchemaGuardrails_ValidateSchema_ReservedFields(t *testing.T) {
	g := NewSchemaGuardrails()

	// Create a schema with reserved field names
	schema := map[string]any{
		"type": "object",
		"properties": map[string]any{
			"title":   map[string]any{"type": "string"},
			"_schema": map[string]any{"type": "string"}, // Reserved
			"_type":   map[string]any{"type": "string"}, // Reserved
		},
	}

	result, err := g.ValidateSchema(schema)
	require.Error(t, err)
	assert.False(t, result.Valid)
	assert.Contains(t, result.Errors["reserved_fields"], "reserved field names")
}

func TestSchemaGuardrails_ValidateSchema_Valid(t *testing.T) {
	g := NewSchemaGuardrails()

	// Create a valid schema
	schema := map[string]any{
		"type": "object",
		"properties": map[string]any{
			"title":       map[string]any{"type": "string"},
			"description": map[string]any{"type": "string"},
			"status":      map[string]any{"type": "string"},
		},
	}

	result, err := g.ValidateSchema(schema)
	require.NoError(t, err)
	assert.True(t, result.Valid)
	assert.Equal(t, 3, result.FieldCount)
}

func TestSchemaGuardrails_ValidateUISchema_SizeLimit(t *testing.T) {
	g := NewSchemaGuardrails()
	g.UISchemaMaxSizeBytes = 50 // Very small limit

	jsonSchema := map[string]any{
		"type":       "object",
		"properties": map[string]any{"title": map[string]any{"type": "string"}},
	}

	largeUISchema := map[string]any{
		"fields": map[string]any{
			"title": map[string]any{
				"widget":      "textarea",
				"placeholder": "This is a very long placeholder text that will exceed the size limit",
			},
		},
	}

	err := g.ValidateUISchema(largeUISchema, jsonSchema)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "exceeds maximum size")
}

func TestSchemaGuardrails_ValidateUISchema_InvalidFieldReference(t *testing.T) {
	g := NewSchemaGuardrails()

	jsonSchema := map[string]any{
		"type": "object",
		"properties": map[string]any{
			"title": map[string]any{"type": "string"},
		},
	}

	uiSchema := map[string]any{
		"fields": map[string]any{
			"nonexistent": map[string]any{"widget": "textarea"}, // Field doesn't exist
		},
	}

	err := g.ValidateUISchema(uiSchema, jsonSchema)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "non-existent field")
}

func TestSchemaGuardrails_ValidateUISchema_Valid(t *testing.T) {
	g := NewSchemaGuardrails()

	jsonSchema := map[string]any{
		"type": "object",
		"properties": map[string]any{
			"title":       map[string]any{"type": "string"},
			"description": map[string]any{"type": "string"},
		},
	}

	uiSchema := map[string]any{
		"fields": map[string]any{
			"title":       map[string]any{"widget": "text"},
			"description": map[string]any{"widget": "textarea"},
		},
	}

	err := g.ValidateUISchema(uiSchema, jsonSchema)
	require.NoError(t, err)
}

func TestSchemaGuardrails_IsReservedFieldName(t *testing.T) {
	g := NewSchemaGuardrails()

	assert.True(t, g.IsReservedFieldName("_schema"))
	assert.True(t, g.IsReservedFieldName("_type"))
	assert.True(t, g.IsReservedFieldName("_id"))
	assert.True(t, g.IsReservedFieldName("_version"))
	assert.False(t, g.IsReservedFieldName("title"))
	assert.False(t, g.IsReservedFieldName("description"))
}

func TestRateLimiter_Allow(t *testing.T) {
	limiter := NewRateLimiter(3, time.Minute)

	// First 3 requests should be allowed
	assert.True(t, limiter.Allow("client1"))
	assert.True(t, limiter.Allow("client1"))
	assert.True(t, limiter.Allow("client1"))

	// 4th request should be denied
	assert.False(t, limiter.Allow("client1"))

	// Different client should still be allowed
	assert.True(t, limiter.Allow("client2"))
}

func TestRateLimiter_WindowExpiry(t *testing.T) {
	limiter := NewRateLimiter(2, 50*time.Millisecond)

	// Use up the limit
	assert.True(t, limiter.Allow("client1"))
	assert.True(t, limiter.Allow("client1"))
	assert.False(t, limiter.Allow("client1"))

	// Wait for window to expire
	time.Sleep(60 * time.Millisecond)

	// Should be allowed again
	assert.True(t, limiter.Allow("client1"))
}

func TestRateLimiter_Cleanup(t *testing.T) {
	limiter := NewRateLimiter(5, 50*time.Millisecond)

	// Add some requests
	limiter.Allow("client1")
	limiter.Allow("client2")

	// Wait for expiry
	time.Sleep(60 * time.Millisecond)

	// Cleanup
	limiter.Cleanup()

	// Verify requests map is cleaned
	limiter.mu.Lock()
	assert.Empty(t, limiter.requests)
	limiter.mu.Unlock()
}

func TestValidateJSONPointerFormat(t *testing.T) {
	assert.True(t, ValidateJSONPointerFormat(""))
	assert.True(t, ValidateJSONPointerFormat("/foo"))
	assert.True(t, ValidateJSONPointerFormat("/foo/bar"))
	assert.True(t, ValidateJSONPointerFormat("/foo/0/bar"))
	assert.False(t, ValidateJSONPointerFormat("foo")) // Missing leading /
}

func TestDefaultSchemaRateLimiter(t *testing.T) {
	limiter := DefaultSchemaRateLimiter()
	assert.NotNil(t, limiter)
	assert.Equal(t, 30, limiter.maxRequests)
	assert.Equal(t, time.Minute, limiter.window)
}

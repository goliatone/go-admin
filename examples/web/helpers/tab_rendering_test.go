package helpers

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestComposeFullName(t *testing.T) {
	tests := []struct {
		name      string
		firstName string
		lastName  string
		expected  string
	}{
		{"both names", "John", "Doe", "John Doe"},
		{"first name only", "John", "", "John"},
		{"last name only", "", "Doe", "Doe"},
		{"empty names", "", "", ""},
		{"whitespace names", "  ", "  ", ""},
		{"trimmed names", "  John  ", "  Doe  ", "John Doe"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := composeFullName(tt.firstName, tt.lastName)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestToString(t *testing.T) {
	tests := []struct {
		name     string
		input    any
		expected string
	}{
		{"nil value", nil, ""},
		{"string value", "hello", "hello"},
		{"trimmed string", "  hello  ", "hello"},
		{"empty string", "", ""},
		{"int value", 42, ""},
		{"bool value", true, ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := toString(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestToBool(t *testing.T) {
	tests := []struct {
		name     string
		input    any
		expected bool
	}{
		{"nil value", nil, false},
		{"true bool", true, true},
		{"false bool", false, false},
		{"string value", "true", false},
		{"int value", 1, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := toBool(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestBuildUserProfileSections(t *testing.T) {
	t.Run("complete user record", func(t *testing.T) {
		record := map[string]any{
			"first_name":        "John",
			"last_name":         "Doe",
			"username":          "johndoe",
			"email":             "john@example.com",
			"is_email_verified": true,
			"phone_number":      "+1234567890",
			"role":              "admin",
			"status":            "active",
			"created_at":        "2024-01-01T00:00:00Z",
			"last_login":        "2024-06-15T12:00:00Z",
		}

		sections := buildUserProfileSections(record)
		require.Len(t, sections, 3, "should have account, personal info, and dates sections")

		// Account section
		account := sections[0]
		assert.Equal(t, "account", account.ID)
		assert.Equal(t, "Account", account.Label)
		require.Len(t, account.Fields, 4, "should have username, email, role, status")

		// Check email field with verified badge
		emailField := account.Fields[1]
		assert.Equal(t, "email", emailField.Key)
		assert.Equal(t, ProfileFieldVerified, emailField.Type)
		assert.True(t, emailField.Verified)

		roleField := account.Fields[2]
		assert.Equal(t, ProfileFieldBadge, roleField.Type)

		statusField := account.Fields[3]
		assert.Equal(t, ProfileFieldStatus, statusField.Type)

		// Personal info section
		personalInfo := sections[1]
		assert.Equal(t, "personal_info", personalInfo.ID)
		assert.Equal(t, "Personal Info", personalInfo.Label)
		require.Len(t, personalInfo.Fields, 2, "should have full_name and phone_number")

		fullNameField := personalInfo.Fields[0]
		assert.Equal(t, "full_name", fullNameField.Key)
		assert.Equal(t, "John Doe", fullNameField.Value)
		assert.Equal(t, ProfileFieldText, fullNameField.Type)

		// Dates section
		dates := sections[2]
		assert.Equal(t, "dates", dates.ID)
		require.Len(t, dates.Fields, 2, "should have created_at and last_login")
	})

	t.Run("minimal user record", func(t *testing.T) {
		record := map[string]any{
			"email":  "user@example.com",
			"role":   "user",
			"status": "active",
		}

		sections := buildUserProfileSections(record)
		require.Len(t, sections, 1, "should have account section only")

		account := sections[0]
		require.Len(t, account.Fields, 3)
		assert.Equal(t, "email", account.Fields[0].Key)
	})

	t.Run("empty record", func(t *testing.T) {
		record := map[string]any{}

		sections := buildUserProfileSections(record)
		assert.Empty(t, sections, "should have no sections for empty record")
	})

	t.Run("hide_if_empty fields", func(t *testing.T) {
		record := map[string]any{
			"email":  "user@example.com",
			"role":   "user",
			"status": "active",
			// phone_number is empty - should have hide_if_empty
		}

		sections := buildUserProfileSections(record)
		for _, section := range sections {
			for _, field := range section.Fields {
				assert.NotEqual(t, "phone_number", field.Key, "phone_number should not be included when empty")
			}
		}
	})
}

func TestApplyUserProfileWidgetOverrides(t *testing.T) {
	t.Run("injects sections only", func(t *testing.T) {
		widgets := []map[string]any{
			{
				"definition": UserProfileWidgetCode,
				"data":       map[string]any{},
			},
		}
		record := map[string]any{
			"username": "johndoe",
			"email":    "john@example.com",
			"role":     "admin",
			"status":   "active",
		}

		ApplyUserProfileWidgetOverrides(widgets, record)

		data := widgets[0]["data"].(map[string]any)

		// Check sections (new format)
		sections, ok := data["sections"].([]ProfileSection)
		require.True(t, ok, "sections should be present")
		assert.NotEmpty(t, sections)
		_, hasLegacyValues := data["values"]
		assert.False(t, hasLegacyValues, "legacy values payload should be removed")
	})

		t.Run("skips non-profile widgets", func(t *testing.T) {
			widgets := []map[string]any{
				{
					"definition": UserActivityWidgetCode,
					"data":       map[string]any{},
				},
			}
		record := map[string]any{"username": "test"}

		ApplyUserProfileWidgetOverrides(widgets, record)

		data := widgets[0]["data"].(map[string]any)
		assert.Empty(t, data, "should not modify non-profile widgets")
	})

	t.Run("handles nil inputs", func(t *testing.T) {
		// Should not panic
		ApplyUserProfileWidgetOverrides(nil, nil)
		ApplyUserProfileWidgetOverrides([]map[string]any{}, nil)
		ApplyUserProfileWidgetOverrides(nil, map[string]any{})
	})
}

func TestProfileFieldTypes(t *testing.T) {
	assert.Equal(t, ProfileFieldType("text"), ProfileFieldText)
	assert.Equal(t, ProfileFieldType("badge"), ProfileFieldBadge)
	assert.Equal(t, ProfileFieldType("status"), ProfileFieldStatus)
	assert.Equal(t, ProfileFieldType("date"), ProfileFieldDate)
	assert.Equal(t, ProfileFieldType("relative"), ProfileFieldRelative)
	assert.Equal(t, ProfileFieldType("verified"), ProfileFieldVerified)
}

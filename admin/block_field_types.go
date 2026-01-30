package admin

import (
	"sort"
	"strings"
	"sync"
)

// FieldTypeDefinition describes a single field option in the Block Library palette.
type FieldTypeDefinition struct {
	Type        string         `json:"type"`
	Label       string         `json:"label"`
	Description string         `json:"description,omitempty"`
	Category    string         `json:"category"`
	Icon        string         `json:"icon,omitempty"`
	Defaults    map[string]any `json:"defaults,omitempty"`
	Order       int            `json:"order"`
}

// FieldTypeCategory describes a palette group.
type FieldTypeCategory struct {
	ID        string `json:"id"`
	Label     string `json:"label"`
	Icon      string `json:"icon,omitempty"`
	Order     int    `json:"order"`
	Collapsed bool   `json:"collapsed,omitempty"`
}

// FieldTypeCategoryGroup bundles field types by category.
type FieldTypeCategoryGroup struct {
	Category   FieldTypeCategory     `json:"category"`
	FieldTypes []FieldTypeDefinition `json:"field_types"`
}

// FieldTypeRegistry stores field type metadata for the Block Library palette.
type FieldTypeRegistry struct {
	mu         sync.RWMutex
	categories map[string]FieldTypeCategory
	entries    map[string]FieldTypeDefinition
}

// NewFieldTypeRegistry constructs an empty registry.
func NewFieldTypeRegistry() *FieldTypeRegistry {
	return &FieldTypeRegistry{
		categories: map[string]FieldTypeCategory{},
		entries:    map[string]FieldTypeDefinition{},
	}
}

// RegisterCategory adds or replaces a category definition.
func (r *FieldTypeRegistry) RegisterCategory(category FieldTypeCategory) {
	if r == nil {
		return
	}
	id := strings.ToLower(strings.TrimSpace(category.ID))
	if id == "" {
		return
	}
	category.ID = id
	if strings.TrimSpace(category.Label) == "" {
		category.Label = id
	}
	category.Icon = strings.TrimSpace(category.Icon)

	r.mu.Lock()
	defer r.mu.Unlock()
	if r.categories == nil {
		r.categories = map[string]FieldTypeCategory{}
	}
	r.categories[id] = category
}

// Register adds or replaces a field type definition.
func (r *FieldTypeRegistry) Register(def FieldTypeDefinition) {
	if r == nil {
		return
	}
	fieldType := strings.ToLower(strings.TrimSpace(def.Type))
	if fieldType == "" {
		return
	}
	def.Type = fieldType
	def.Category = strings.ToLower(strings.TrimSpace(def.Category))
	if strings.TrimSpace(def.Label) == "" {
		def.Label = fieldType
	}
	def.Icon = strings.TrimSpace(def.Icon)

	r.mu.Lock()
	defer r.mu.Unlock()
	if r.entries == nil {
		r.entries = map[string]FieldTypeDefinition{}
	}
	r.entries[fieldType] = def
}

// Categories returns registered categories ordered by position then ID.
func (r *FieldTypeRegistry) Categories() []FieldTypeCategory {
	if r == nil {
		return nil
	}
	r.mu.RLock()
	defer r.mu.RUnlock()
	if len(r.categories) == 0 {
		return nil
	}
	out := make([]FieldTypeCategory, 0, len(r.categories))
	for _, category := range r.categories {
		out = append(out, category)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Order == out[j].Order {
			return out[i].ID < out[j].ID
		}
		return out[i].Order < out[j].Order
	})
	return out
}

// FieldTypes returns registered field types ordered by category then position.
func (r *FieldTypeRegistry) FieldTypes() []FieldTypeDefinition {
	if r == nil {
		return nil
	}
	r.mu.RLock()
	defer r.mu.RUnlock()
	if len(r.entries) == 0 {
		return nil
	}
	out := make([]FieldTypeDefinition, 0, len(r.entries))
	for _, def := range r.entries {
		clone := def
		clone.Defaults = cloneAnyMap(def.Defaults)
		out = append(out, clone)
	}
	categoryOrder := map[string]int{}
	for _, category := range r.categories {
		categoryOrder[category.ID] = category.Order
	}
	sort.Slice(out, func(i, j int) bool {
		iOrder := categoryOrder[out[i].Category]
		jOrder := categoryOrder[out[j].Category]
		if iOrder != jOrder {
			return iOrder < jOrder
		}
		if out[i].Order != out[j].Order {
			return out[i].Order < out[j].Order
		}
		return out[i].Type < out[j].Type
	})
	return out
}

// Groups returns field types grouped by category in order.
func (r *FieldTypeRegistry) Groups() []FieldTypeCategoryGroup {
	if r == nil {
		return nil
	}
	categories := r.Categories()
	fieldTypes := r.FieldTypes()
	if len(categories) == 0 && len(fieldTypes) == 0 {
		return nil
	}
	categoryIDs := map[string]struct{}{}
	for _, category := range categories {
		categoryIDs[category.ID] = struct{}{}
	}
	byCategory := map[string][]FieldTypeDefinition{}
	for _, def := range fieldTypes {
		byCategory[def.Category] = append(byCategory[def.Category], def)
	}
	groups := make([]FieldTypeCategoryGroup, 0, len(categories))
	for _, category := range categories {
		items := byCategory[category.ID]
		groups = append(groups, FieldTypeCategoryGroup{
			Category:   category,
			FieldTypes: items,
		})
	}
	if len(byCategory) > len(categories) {
		unknown := map[string][]FieldTypeDefinition{}
		for key, defs := range byCategory {
			if _, ok := categoryIDs[key]; !ok {
				unknown[key] = defs
			}
		}
		if len(unknown) > 0 {
			unknownKeys := make([]string, 0, len(unknown))
			for key := range unknown {
				unknownKeys = append(unknownKeys, key)
			}
			sort.Strings(unknownKeys)
			for _, key := range unknownKeys {
				groups = append(groups, FieldTypeCategoryGroup{
					Category:   FieldTypeCategory{ID: key, Label: key, Order: 9999},
					FieldTypes: unknown[key],
				})
			}
		}
	}
	return groups
}

var (
	defaultBlockFieldTypeRegistry     *FieldTypeRegistry
	defaultBlockFieldTypeRegistryOnce sync.Once
)

// DefaultBlockFieldTypeRegistry returns the default block field type registry.
func DefaultBlockFieldTypeRegistry() *FieldTypeRegistry {
	defaultBlockFieldTypeRegistryOnce.Do(func() {
		defaultBlockFieldTypeRegistry = buildDefaultBlockFieldTypeRegistry()
	})
	return defaultBlockFieldTypeRegistry
}

// BlockFieldTypeGroups exposes the default grouped palette for the Block IDE.
func BlockFieldTypeGroups() []FieldTypeCategoryGroup {
	reg := DefaultBlockFieldTypeRegistry()
	if reg == nil {
		return nil
	}
	return reg.Groups()
}

func buildDefaultBlockFieldTypeRegistry() *FieldTypeRegistry {
	reg := NewFieldTypeRegistry()

	reg.RegisterCategory(FieldTypeCategory{ID: "text", Label: "Text", Icon: "text", Order: 10})
	reg.RegisterCategory(FieldTypeCategory{ID: "media", Label: "Media", Icon: "media", Order: 20})
	reg.RegisterCategory(FieldTypeCategory{ID: "choice", Label: "Choice", Icon: "choice", Order: 30})
	reg.RegisterCategory(FieldTypeCategory{ID: "number", Label: "Number", Icon: "number", Order: 40})
	reg.RegisterCategory(FieldTypeCategory{ID: "datetime", Label: "Date & Time", Icon: "datetime", Order: 50})
	reg.RegisterCategory(FieldTypeCategory{ID: "relationship", Label: "Relationship", Icon: "relationship", Order: 60})
	reg.RegisterCategory(FieldTypeCategory{ID: "structure", Label: "Structure", Icon: "structure", Order: 70})
	reg.RegisterCategory(FieldTypeCategory{ID: "advanced", Label: "Advanced", Icon: "advanced", Order: 80, Collapsed: true})

	// Text
	reg.Register(FieldTypeDefinition{
		Type:        "string",
		Label:       "Single Line Text",
		Description: "Short text value",
		Category:    "text",
		Icon:        "text",
		Defaults: map[string]any{
			"validation": map[string]any{
				"maxLength": 255,
			},
		},
		Order: 10,
	})
	reg.Register(FieldTypeDefinition{
		Type:        "text",
		Label:       "Multi Line Text",
		Description: "Paragraph text",
		Category:    "text",
		Icon:        "textarea",
		Defaults: map[string]any{
			"config": map[string]any{
				"rows": 4,
			},
		},
		Order: 20,
	})
	reg.Register(FieldTypeDefinition{
		Type:        "richtext",
		Label:       "Rich Text",
		Description: "Formatted text editor",
		Category:    "text",
		Icon:        "rich-text",
		Defaults: map[string]any{
			"config": map[string]any{
				"toolbar": "standard",
			},
		},
		Order: 30,
	})
	reg.Register(FieldTypeDefinition{
		Type:        "slug",
		Label:       "Slug",
		Description: "URL-friendly identifier",
		Category:    "text",
		Icon:        "slug",
		Defaults: map[string]any{
			"config": map[string]any{
				"sourceField": nil,
			},
		},
		Order: 40,
	})
	reg.Register(FieldTypeDefinition{
		Type:        "url",
		Label:       "URL",
		Description: "Website link",
		Category:    "text",
		Icon:        "url",
		Order:       50,
	})
	reg.Register(FieldTypeDefinition{
		Type:        "email",
		Label:       "Email",
		Description: "Email address",
		Category:    "text",
		Icon:        "email",
		Order:       60,
	})

	// Media
	reg.Register(FieldTypeDefinition{
		Type:        "image",
		Label:       "Image",
		Description: "Image asset",
		Category:    "media",
		Icon:        "image",
		Defaults: map[string]any{
			"config": map[string]any{
				"accept": "image/*",
			},
		},
		Order: 10,
	})
	reg.Register(FieldTypeDefinition{
		Type:        "file",
		Label:       "File",
		Description: "File attachment",
		Category:    "media",
		Icon:        "file",
		Order:       20,
	})

	// Choice
	reg.Register(FieldTypeDefinition{
		Type:        "boolean",
		Label:       "Boolean",
		Description: "True/false toggle",
		Category:    "choice",
		Icon:        "boolean",
		Defaults: map[string]any{
			"config": map[string]any{
				"displayAs": "toggle",
			},
		},
		Order: 10,
	})
	reg.Register(FieldTypeDefinition{
		Type:        "select",
		Label:       "Select",
		Description: "Dropdown selection",
		Category:    "choice",
		Icon:        "select",
		Defaults: map[string]any{
			"config": map[string]any{
				"options":  []any{},
				"multiple": false,
			},
		},
		Order: 20,
	})
	reg.Register(FieldTypeDefinition{
		Type:        "multiselect",
		Label:       "Multi Select",
		Description: "Multiple selections",
		Category:    "choice",
		Icon:        "multiselect",
		Defaults: map[string]any{
			"config": map[string]any{
				"options":  []any{},
				"multiple": true,
			},
		},
		Order: 30,
	})

	// Number
	reg.Register(FieldTypeDefinition{
		Type:        "integer",
		Label:       "Integer",
		Description: "Whole number",
		Category:    "number",
		Icon:        "integer",
		Order:       10,
	})
	reg.Register(FieldTypeDefinition{
		Type:        "decimal",
		Label:       "Decimal",
		Description: "Decimal number",
		Category:    "number",
		Icon:        "decimal",
		Defaults: map[string]any{
			"config": map[string]any{
				"precision": 2,
			},
		},
		Order: 20,
	})

	// Date & Time
	reg.Register(FieldTypeDefinition{
		Type:        "date",
		Label:       "Date",
		Description: "Calendar date",
		Category:    "datetime",
		Icon:        "date",
		Defaults: map[string]any{
			"config": map[string]any{
				"format": "YYYY-MM-DD",
			},
		},
		Order: 10,
	})
	reg.Register(FieldTypeDefinition{
		Type:        "datetime",
		Label:       "Date & Time",
		Description: "Date with time",
		Category:    "datetime",
		Icon:        "datetime",
		Order:       20,
	})

	// Relationship
	reg.Register(FieldTypeDefinition{
		Type:        "reference",
		Label:       "Reference",
		Description: "Link to another type",
		Category:    "relationship",
		Icon:        "reference",
		Defaults: map[string]any{
			"config": map[string]any{
				"targetType": nil,
			},
		},
		Order: 10,
	})

	// Structure
	reg.Register(FieldTypeDefinition{
		Type:        "group",
		Label:       "Group",
		Description: "Nested fields",
		Category:    "structure",
		Icon:        "group",
		Defaults: map[string]any{
			"config": map[string]any{
				"fields": []any{},
			},
		},
		Order: 10,
	})

	// Advanced
	reg.Register(FieldTypeDefinition{
		Type:        "json",
		Label:       "JSON",
		Description: "Raw JSON input",
		Category:    "advanced",
		Icon:        "json",
		Order:       10,
	})
	reg.Register(FieldTypeDefinition{
		Type:        "color",
		Label:       "Color",
		Description: "Color picker",
		Category:    "advanced",
		Icon:        "color",
		Defaults: map[string]any{
			"config": map[string]any{
				"format": "hex",
			},
		},
		Order: 20,
	})
	reg.Register(FieldTypeDefinition{
		Type:        "hidden",
		Label:       "Hidden",
		Description: "Hidden field",
		Category:    "advanced",
		Icon:        "hidden",
		Order:       30,
	})

	return reg
}

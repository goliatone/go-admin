package admin

import "time"

const (
	MenuRecordStatusDraft     = "draft"
	MenuRecordStatusPublished = "published"
)

// AdminMenuRecord is the normalized menu contract used by admin menu builder APIs.
type AdminMenuRecord struct {
	ID                 string     `json:"id"`
	Code               string     `json:"code"`
	Name               string     `json:"name,omitempty"`
	Description        string     `json:"description,omitempty"`
	Status             string     `json:"status"`
	Locale             string     `json:"locale,omitempty"`
	TranslationGroupID string     `json:"translation_group_id,omitempty"`
	Archived           bool       `json:"archived,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
	PublishedAt        *time.Time `json:"published_at,omitempty"`
	ArchivedAt         *time.Time `json:"archived_at,omitempty"`
}

// AdminMenuBindingRecord describes a menu location binding record.
type AdminMenuBindingRecord struct {
	ID              string     `json:"id"`
	Location        string     `json:"location"`
	MenuCode        string     `json:"menu_code"`
	ViewProfileCode string     `json:"view_profile_code,omitempty"`
	Locale          string     `json:"locale,omitempty"`
	Priority        int        `json:"priority"`
	Status          string     `json:"status"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
	PublishedAt     *time.Time `json:"published_at,omitempty"`
}

// AdminMenuViewProfileRecord describes a menu projection profile record.
type AdminMenuViewProfileRecord struct {
	Code           string     `json:"code"`
	Name           string     `json:"name"`
	Mode           string     `json:"mode"`
	MaxTopLevel    *int       `json:"max_top_level,omitempty"`
	MaxDepth       *int       `json:"max_depth,omitempty"`
	IncludeItemIDs []string   `json:"include_item_ids,omitempty"`
	ExcludeItemIDs []string   `json:"exclude_item_ids,omitempty"`
	Status         string     `json:"status"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
	PublishedAt    *time.Time `json:"published_at,omitempty"`
}

// AdminMenuPreviewSimulation captures preview-specific location/profile context.
type AdminMenuPreviewSimulation struct {
	RequestedID          string                  `json:"requested_id"`
	Location             string                  `json:"location,omitempty"`
	Locale               string                  `json:"locale,omitempty"`
	ViewProfile          string                  `json:"view_profile,omitempty"`
	IncludeDrafts        bool                    `json:"include_drafts"`
	PreviewTokenPresent  bool                    `json:"preview_token_present"`
	Binding              *AdminMenuBindingRecord `json:"binding,omitempty"`
	Profile              *AdminMenuViewProfileRecord `json:"profile,omitempty"`
}

// AdminMenuContracts exposes endpoint metadata and machine-readable menu error mapping.
type AdminMenuContracts struct {
	Endpoints map[string]string `json:"endpoints"`
	ErrorCode map[string]string `json:"error_codes"`
}

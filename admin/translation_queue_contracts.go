package admin

import "context"

import translationqueue "github.com/goliatone/go-admin/admin/internal/translationqueue"

type TranslationQueueUIOptions struct {
	EnhancedFilterSelects  bool `json:"enhanced_filter_selects"`
	ReviewerOptionEndpoint bool `json:"reviewer_option_endpoint,omitempty"`
}

type TranslationActorOptionPurpose string

const (
	TranslationActorOptionPurposeAssignee TranslationActorOptionPurpose = "assignee"
	TranslationActorOptionPurposeReviewer TranslationActorOptionPurpose = "reviewer"
)

type TranslationActorOptionQuery struct {
	Purpose        TranslationActorOptionPurpose `json:"purpose"`
	Search         string                        `json:"search,omitempty"`
	SelectedIDs    []string                      `json:"selected_ids,omitempty"`
	Page           int                           `json:"page,omitempty"`
	PerPage        int                           `json:"per_page,omitempty"`
	Channel        string                        `json:"channel,omitempty"`
	EntityType     string                        `json:"entity_type,omitempty"`
	SourceRecordID string                        `json:"source_record_id,omitempty"`
	FamilyID       string                        `json:"family_id,omitempty"`
	TargetLocale   string                        `json:"target_locale,omitempty"`
	AdminContext   AdminContext                  `json:"-"`
}

type TranslationActorOption struct {
	Value       string         `json:"value"`
	Label       string         `json:"label"`
	Description string         `json:"description,omitempty"`
	DisplayName string         `json:"display_name,omitempty"`
	AvatarURL   string         `json:"avatar_url,omitempty"`
	Metadata    map[string]any `json:"metadata,omitempty"`
}

type TranslationActorOptionProvider interface {
	ListTranslationActorOptions(context.Context, TranslationActorOptionQuery) ([]TranslationActorOption, error)
}

func TranslationQueueContractPayload() map[string]any {
	return translationqueue.ContractPayload()
}

func TranslationQueueSupportedFilterKeys() []string {
	return translationqueue.SupportedFilterKeys()
}

func TranslationQueueSupportedReviewStates() []string {
	return translationqueue.SupportedReviewStates()
}

func TranslationQueueSupportedSortKeys() []string {
	return translationqueue.SupportedSortKeys()
}

func TranslationQueueSavedFilterPresets() []map[string]any {
	return translationqueue.SavedFilterPresets()
}

func TranslationQueueSavedReviewFilterPresets() []map[string]any {
	return translationqueue.SavedReviewFilterPresets()
}

func TranslationQueuePresetQuery(presetID string) map[string]string {
	return translationqueue.AssignmentPresetQuery(presetID)
}

func TranslationQueueReviewAggregateCountKeys() []string {
	return translationqueue.ReviewAggregateCountKeys()
}

func translationQueueDefaultSortContract() map[string]any {
	return translationqueue.DefaultSortContract()
}

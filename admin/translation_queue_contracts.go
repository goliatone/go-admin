package admin

import translationqueue "github.com/goliatone/go-admin/admin/internal/translationqueue"

type TranslationQueueUIOptions struct {
	EnhancedFilterSelects bool `json:"enhanced_filter_selects"`
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

package admin

import translationqueue "github.com/goliatone/go-admin/admin/internal/translationqueue"

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

func TranslationQueueReviewAggregateCountKeys() []string {
	return translationqueue.ReviewAggregateCountKeys()
}

func translationQueueDefaultSortContract() map[string]any {
	return translationqueue.DefaultSortContract()
}

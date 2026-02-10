package jobs

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/pkg/admin"
)

// TranslationImportRunInputProvider resolves scheduled run input for exchange jobs.
type TranslationImportRunInputProvider func(context.Context) (admin.TranslationImportRunInput, error)

// NewTranslationImportRunJob builds an admin cron trigger command for translation import run flows.
func NewTranslationImportRunJob(schedule string, provider TranslationImportRunInputProvider) *admin.TranslationImportRunTriggerCommand {
	job := &admin.TranslationImportRunTriggerCommand{
		Schedule: strings.TrimSpace(schedule),
	}
	if provider != nil {
		job.BuildInput = func(ctx context.Context, _ admin.TranslationImportRunTriggerInput) (admin.TranslationImportRunInput, error) {
			return provider(ctx)
		}
	}
	return job
}

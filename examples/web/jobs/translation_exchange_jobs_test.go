package jobs

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/pkg/admin"
)

func TestNewTranslationImportRunJobBuildsCronTrigger(t *testing.T) {
	providerCalled := false
	job := NewTranslationImportRunJob(" @weekly ", func(context.Context) (admin.TranslationImportRunInput, error) {
		providerCalled = true
		return admin.TranslationImportRunInput{}, nil
	})

	if job == nil {
		t.Fatalf("expected trigger command")
	}
	if got := job.CronOptions().Expression; got != "@weekly" {
		t.Fatalf("expected cron expression @weekly, got %q", got)
	}
	if job.BuildInput == nil {
		t.Fatalf("expected trigger input builder")
	}
	if _, err := job.BuildInput(context.Background(), admin.TranslationImportRunTriggerInput{}); err != nil {
		t.Fatalf("unexpected build input error: %v", err)
	}
	if !providerCalled {
		t.Fatalf("expected provider to be called")
	}
}

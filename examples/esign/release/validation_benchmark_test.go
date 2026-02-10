package release

import (
	"context"
	"testing"
)

func BenchmarkValidationProfileSendSignFinalize(b *testing.B) {
	ctx := context.Background()
	cfg := ValidationConfig{AgreementCount: 1}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		if _, err := RunValidationProfile(ctx, cfg); err != nil {
			b.Fatalf("RunValidationProfile: %v", err)
		}
	}
}

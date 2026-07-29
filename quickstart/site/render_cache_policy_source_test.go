package site

import (
	"os"
	"regexp"
	"strings"
	"testing"
)

func TestRenderCachePolicyDoesNotRegressToReflection(t *testing.T) {
	body, err := os.ReadFile("render_cache_policy.go")
	if err != nil {
		t.Fatalf("read render_cache_policy.go: %v", err)
	}
	source := string(body)
	if strings.Contains(source, "renderCacheReflectBackendKind") {
		t.Fatal("render cache policy restored the legacy reflection helper")
	}
	if regexp.MustCompile(`\breflect\.`).MatchString(source) {
		t.Fatal("render cache policy must use its typed capability contract")
	}
}

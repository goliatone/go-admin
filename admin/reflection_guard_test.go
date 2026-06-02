package admin

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

func TestNormalPathsDoNotRegressToReflection(t *testing.T) {
	root := repositoryRoot(t)
	cases := []struct {
		path      string
		forbid    []string
		forbidRE  []string
		allowNote string
	}{
		{
			path:   "modules/services/api.go",
			forbid: []string{"safeReflectMethodCall", `MethodByName("RateLimitStateStore")`},
			forbidRE: []string{
				`\breflect\.(ValueOf|TypeOf)`,
			},
		},
		{
			path:   "quickstart/site/render_cache_policy.go",
			forbid: []string{"renderCacheReflectBackendKind"},
			forbidRE: []string{
				`\breflect\.`,
			},
		},
		{
			path:   "admin/debug_response_writer.go",
			forbid: []string{"FieldByName", "NewAt", "UnsafeAddr"},
			forbidRE: []string{
				`\breflect\.`,
			},
		},
		{
			path:   "admin/cms_gocms_translation_adapter.go",
			forbid: []string{"MethodByName", ".Call("},
			forbidRE: []string{
				`\breflect\.`,
			},
		},
		{
			path:   "admin/cms_gocms_container.go",
			forbid: []string{"MethodByName", ".Call("},
			forbidRE: []string{
				`\breflect\.`,
			},
		},
		{
			path: "admin/cms_adapter_translation_mapping.go",
			forbid: []string{
				"buildCreateTranslationMethodArgs",
				"applyCreateTranslationRequestFields",
				"setUUIDFieldByName",
			},
			allowNote: "record projection reflection is allowed here; request-shape reflection is not",
		},
	}

	for _, tc := range cases {
		t.Run(tc.path, func(t *testing.T) {
			body := readRepoFile(t, root, tc.path)
			for _, token := range tc.forbid {
				if strings.Contains(body, token) {
					t.Fatalf("forbidden reflection token %q found in %s", token, tc.path)
				}
			}
			for _, pattern := range tc.forbidRE {
				matched, err := regexp.MatchString(pattern, body)
				if err != nil {
					t.Fatalf("invalid guardrail regexp %q: %v", pattern, err)
				}
				if matched {
					note := strings.TrimSpace(tc.allowNote)
					if note != "" {
						note = ": " + note
					}
					t.Fatalf("forbidden reflection pattern %q found in %s%s", pattern, tc.path, note)
				}
			}
		})
	}
}

func TestGoCMSLegacyReflectionShimsStayRemoved(t *testing.T) {
	root := repositoryRoot(t)
	for _, path := range []string{
		"admin/cms_gocms_container_legacy.go",
		"admin/cms_gocms_translation_legacy.go",
	} {
		if _, err := os.Stat(filepath.Join(root, path)); err == nil {
			t.Fatalf("legacy reflection shim %s must not be restored", path)
		} else if !os.IsNotExist(err) {
			t.Fatalf("stat %s: %v", path, err)
		}
	}
}

func repositoryRoot(t *testing.T) string {
	t.Helper()
	dir, err := os.Getwd()
	if err != nil {
		t.Fatalf("get working directory: %v", err)
	}
	for {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			t.Fatal("repository root with go.mod not found")
		}
		dir = parent
	}
}

func readRepoFile(t *testing.T, root, path string) string {
	t.Helper()
	body, err := os.ReadFile(filepath.Join(root, path))
	if err != nil {
		t.Fatalf("read %s: %v", path, err)
	}
	return string(body)
}

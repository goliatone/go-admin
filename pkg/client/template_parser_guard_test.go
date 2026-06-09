package client

import (
	"fmt"
	"io/fs"
	"regexp"
	"strings"
	"testing"
)

func TestTemplatesAvoidUnsupportedSyntax(t *testing.T) {
	tplFS := Templates()
	violations := []string{}
	unsupportedIfTest := regexp.MustCompile(`{%\s*(?:if|elif)\b[^%}]*\bis\b`)
	unsupportedTagConcat := regexp.MustCompile(`{%(?:[^%}]|"[^"]*"|'[^']*')*~`)

	err := fs.WalkDir(tplFS, ".", func(path string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if d == nil || d.IsDir() {
			return nil
		}
		if !strings.HasSuffix(path, ".html") && !strings.HasSuffix(path, ".tmpl") {
			return nil
		}

		content, err := fs.ReadFile(tplFS, path)
		if err != nil {
			return err
		}
		lines := strings.Split(string(content), "\n")
		for idx, line := range lines {
			trimmed := strings.TrimSpace(line)
			if trimmed == "" || strings.HasPrefix(trimmed, "{#") {
				continue
			}
			if strings.Contains(line, "|default:[]") || strings.Contains(line, "|default:{}") {
				violations = append(violations, fmt.Sprintf("%s:%d", path, idx+1))
			}
			if unsupportedIfTest.MatchString(line) {
				violations = append(violations, fmt.Sprintf("%s:%d", path, idx+1))
			}
			if unsupportedTagConcat.MatchString(line) {
				violations = append(violations, fmt.Sprintf("%s:%d", path, idx+1))
			}
		}
		return nil
	})
	if err != nil {
		t.Fatalf("walk templates: %v", err)
	}
	if len(violations) != 0 {
		t.Fatalf("found unsupported literal defaults in templates: %s", strings.Join(violations, ", "))
	}
}

package services

import (
	"regexp"
	"strings"
)

var reminderFailureRedactionRules = []struct {
	pattern     *regexp.Regexp
	replacement string
}{
	{
		pattern:     regexp.MustCompile(`(?i)\b[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}\b`),
		replacement: "[redacted_email]",
	},
	{
		pattern:     regexp.MustCompile(`(?i)\b(bearer)\s+[a-z0-9\-._~+/]+=*\b`),
		replacement: "${1} [redacted_token]",
	},
	{
		pattern:     regexp.MustCompile(`(?i)(access_token|refresh_token|id_token|api_key|apikey|authorization|password|client_secret)\s*[:=]\s*['"]?[^\s'"]+`),
		replacement: "${1}=[redacted_secret]",
	},
	{
		pattern:     regexp.MustCompile(`(?i)([?&](access_token|refresh_token|id_token|api_key|apikey|authorization|password|client_secret)=)[^&\s]+`),
		replacement: "${1}[redacted_secret]",
	},
}

// sanitizeReminderFailureText redacts secrets/PII before internal persistence.
func sanitizeReminderFailureText(input string) string {
	value := strings.TrimSpace(input)
	if value == "" {
		return ""
	}
	for _, rule := range reminderFailureRedactionRules {
		value = rule.pattern.ReplaceAllString(value, rule.replacement)
	}
	if len(value) > 4096 {
		value = value[:4096] + "...[truncated]"
	}
	return value
}

package admin

import (
	"fmt"
	"regexp"
	"sort"
	"strings"
)

const (
	translationQASeverityWarning = "warning"
	translationQASeverityBlocker = "blocker"
)

var (
	translationQAPlaceholderPattern = regexp.MustCompile(`\{\{[^{}]+\}\}|%\[[0-9]+\][a-zA-Z]|%[sd]|%v|\{[a-zA-Z0-9_]+\}`)
	translationQAURLPattern         = regexp.MustCompile(`https?://[^\s<>"']+`)
	translationQAHTMLTagPattern     = regexp.MustCompile(`</?([a-zA-Z][a-zA-Z0-9:-]*)\b[^>]*>`)
)

func (b *translationQueueBinding) translationQAEnabled() bool {
	if b == nil || b.admin == nil {
		return false
	}
	return featureEnabledKey(b.admin.featureGate, string(FeatureTranslationQATerms)) ||
		featureEnabledKey(b.admin.featureGate, string(FeatureTranslationQAStyle))
}

func (b *translationQueueBinding) translationQAResults(editorCtx translationEditorContext) map[string]any {
	terminologyEnabled := b != nil && b.admin != nil && featureEnabledKey(b.admin.featureGate, string(FeatureTranslationQATerms))
	styleEnabled := b != nil && b.admin != nil && featureEnabledKey(b.admin.featureGate, string(FeatureTranslationQAStyle))

	categories := map[string]map[string]any{
		"terminology": translationQACategoryEnvelope("terminology", terminologyEnabled, string(FeatureTranslationQATerms)),
		"style":       translationQACategoryEnvelope("style", styleEnabled, string(FeatureTranslationQAStyle)),
	}
	findings := make([]map[string]any, 0, 8)

	if terminologyEnabled {
		for _, finding := range translationTerminologyQAFindings(editorCtx) {
			findings = append(findings, finding)
			translationQAAccumulateCategory(categories["terminology"], finding)
		}
	}
	if styleEnabled {
		for _, finding := range translationStyleQAFindings(editorCtx) {
			findings = append(findings, finding)
			translationQAAccumulateCategory(categories["style"], finding)
		}
	}

	sort.SliceStable(findings, func(i, j int) bool {
		left := findings[i]
		right := findings[j]
		leftSeverity := translationQASeverityRank(toString(left["severity"]))
		rightSeverity := translationQASeverityRank(toString(right["severity"]))
		if leftSeverity != rightSeverity {
			return leftSeverity < rightSeverity
		}
		leftCategory := strings.TrimSpace(strings.ToLower(toString(left["category"])))
		rightCategory := strings.TrimSpace(strings.ToLower(toString(right["category"])))
		if leftCategory != rightCategory {
			return leftCategory < rightCategory
		}
		leftPath := strings.TrimSpace(strings.ToLower(toString(left["field_path"])))
		rightPath := strings.TrimSpace(strings.ToLower(toString(right["field_path"])))
		if leftPath != rightPath {
			return leftPath < rightPath
		}
		return strings.TrimSpace(strings.ToLower(toString(left["id"]))) < strings.TrimSpace(strings.ToLower(toString(right["id"])))
	})

	warningCount := 0
	blockerCount := 0
	for _, finding := range findings {
		switch strings.TrimSpace(strings.ToLower(toString(finding["severity"]))) {
		case translationQASeverityBlocker:
			blockerCount++
		default:
			warningCount++
		}
	}

	categoryPayload := map[string]any{}
	for key, value := range categories {
		categoryPayload[key] = value
	}

	return map[string]any{
		"enabled": terminologyEnabled || styleEnabled,
		"summary": map[string]any{
			"finding_count": len(findings),
			"warning_count": warningCount,
			"blocker_count": blockerCount,
		},
		"categories":     categoryPayload,
		"findings":       findings,
		"save_blocked":   false,
		"submit_blocked": blockerCount > 0,
	}
}

func translationQACategoryEnvelope(category string, enabled bool, featureFlag string) map[string]any {
	return map[string]any{
		"category":      strings.TrimSpace(category),
		"enabled":       enabled,
		"feature_flag":  strings.TrimSpace(featureFlag),
		"finding_count": 0,
		"warning_count": 0,
		"blocker_count": 0,
	}
}

func translationQAAccumulateCategory(category map[string]any, finding map[string]any) {
	if category == nil {
		return
	}
	category["finding_count"] = intValue(category["finding_count"]) + 1
	if strings.EqualFold(strings.TrimSpace(toString(finding["severity"])), translationQASeverityBlocker) {
		category["blocker_count"] = intValue(category["blocker_count"]) + 1
		return
	}
	category["warning_count"] = intValue(category["warning_count"]) + 1
}

func translationQASeverityRank(value string) int {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case translationQASeverityBlocker:
		return 0
	default:
		return 1
	}
}

func translationTerminologyQAFindings(editorCtx translationEditorContext) []map[string]any {
	findings := []map[string]any{}
	for _, match := range translationEditorGlossaryMatches(editorCtx) {
		term := strings.TrimSpace(toString(match["term"]))
		preferred := strings.TrimSpace(toString(match["preferred_translation"]))
		if term == "" || preferred == "" {
			continue
		}
		for _, fieldPath := range toStringSlice(match["field_paths"]) {
			fieldPath = strings.TrimSpace(fieldPath)
			if fieldPath == "" {
				continue
			}
			targetValue := strings.ToLower(strings.TrimSpace(editorCtx.TargetFields[fieldPath]))
			if targetValue == "" || strings.Contains(targetValue, strings.ToLower(preferred)) {
				continue
			}
			findings = append(findings, map[string]any{
				"id":                    fmt.Sprintf("terminology:%s:%s", fieldPath, strings.ToLower(term)),
				"category":              "terminology",
				"severity":              translationQASeverityWarning,
				"field_path":            fieldPath,
				"message":               fmt.Sprintf("Use the preferred translation %q for %q.", preferred, term),
				"term":                  term,
				"preferred_translation": preferred,
				"source_locale":         strings.TrimSpace(editorCtx.SourceVariant.Locale),
				"target_locale":         strings.TrimSpace(editorCtx.TargetVariant.Locale),
			})
		}
	}
	return findings
}

func translationStyleQAFindings(editorCtx translationEditorContext) []map[string]any {
	findings := []map[string]any{}
	for _, fieldPath := range translationEditorFieldPaths(editorCtx) {
		sourceValue := strings.TrimSpace(editorCtx.SourceFields[fieldPath])
		targetValue := strings.TrimSpace(editorCtx.TargetFields[fieldPath])
		if sourceValue == "" || targetValue == "" {
			continue
		}
		findings = append(findings, translationStyleFindingsForTokens(fieldPath, "placeholder", translationQAPlaceholderTokens(sourceValue), translationQAPlaceholderTokens(targetValue))...)
		findings = append(findings, translationStyleFindingsForTokens(fieldPath, "url", translationQATokens(sourceValue, translationQAURLPattern), translationQATokens(targetValue, translationQAURLPattern))...)
		findings = append(findings, translationStyleFindingsForTokens(fieldPath, "html_tag", translationQAHTMLTags(sourceValue), translationQAHTMLTags(targetValue))...)
	}
	return findings
}

func translationStyleFindingsForTokens(fieldPath, tokenKind string, sourceTokens, targetTokens []string) []map[string]any {
	if len(sourceTokens) == 0 {
		return nil
	}
	targetSet := map[string]struct{}{}
	for _, token := range targetTokens {
		targetSet[strings.ToLower(strings.TrimSpace(token))] = struct{}{}
	}
	missing := []string{}
	for _, token := range sourceTokens {
		normalized := strings.ToLower(strings.TrimSpace(token))
		if normalized == "" {
			continue
		}
		if _, ok := targetSet[normalized]; ok {
			continue
		}
		missing = append(missing, token)
	}
	if len(missing) == 0 {
		return nil
	}
	sort.Strings(missing)
	message := fmt.Sprintf("Preserve %s tokens from the source: %s.", strings.ReplaceAll(tokenKind, "_", " "), strings.Join(missing, ", "))
	return []map[string]any{
		{
			"id":             fmt.Sprintf("style:%s:%s", fieldPath, tokenKind),
			"category":       "style",
			"severity":       translationQASeverityBlocker,
			"field_path":     fieldPath,
			"message":        message,
			"token_kind":     tokenKind,
			"missing_tokens": missing,
		},
	}
}

func translationQAPlaceholderTokens(value string) []string {
	return translationQATokens(value, translationQAPlaceholderPattern)
}

func translationQAHTMLTags(value string) []string {
	matches := translationQAHTMLTagPattern.FindAllStringSubmatch(value, -1)
	if len(matches) == 0 {
		return nil
	}
	out := make([]string, 0, len(matches))
	seen := map[string]struct{}{}
	for _, match := range matches {
		if len(match) < 2 {
			continue
		}
		tag := strings.ToLower(strings.TrimSpace(match[1]))
		if tag == "" {
			continue
		}
		if _, ok := seen[tag]; ok {
			continue
		}
		seen[tag] = struct{}{}
		out = append(out, tag)
	}
	sort.Strings(out)
	return out
}

func translationQATokens(value string, pattern *regexp.Regexp) []string {
	if pattern == nil {
		return nil
	}
	matches := pattern.FindAllString(value, -1)
	if len(matches) == 0 {
		return nil
	}
	out := make([]string, 0, len(matches))
	seen := map[string]struct{}{}
	for _, match := range matches {
		token := strings.TrimSpace(match)
		if token == "" {
			continue
		}
		normalized := strings.ToLower(token)
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		out = append(out, token)
	}
	sort.Strings(out)
	return out
}

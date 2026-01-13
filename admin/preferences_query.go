package admin

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	goerrors "github.com/goliatone/go-errors"
)

type preferenceQueryOptions struct {
	Levels           []PreferenceLevel
	Keys             []string
	IncludeTraces    bool
	IncludeVersions  bool
	IncludeEffective bool
	Base             map[string]any
}

func preferenceQueryOptionsFromContext(ctx context.Context) (preferenceQueryOptions, error) {
	opts := preferenceQueryOptions{}
	params := queryParamsFromContext(ctx)
	if len(params) == 0 {
		return opts, nil
	}
	var err error
	if levels, ok := params["levels"]; ok {
		opts.Levels, err = parsePreferenceLevels(levels)
		if err != nil {
			return opts, err
		}
	}
	if keys, ok := params["keys"]; ok {
		opts.Keys = parsePreferenceKeys(keys)
	}
	if traces, ok := params["include_traces"]; ok {
		opts.IncludeTraces = parsePreferenceQueryBool(traces)
	}
	if versions, ok := params["include_versions"]; ok {
		opts.IncludeVersions = parsePreferenceQueryBool(versions)
	}
	if base, ok := params["base"]; ok {
		opts.Base, err = parsePreferenceBase(base)
		if err != nil {
			return opts, err
		}
	}
	opts.IncludeEffective = opts.IncludeTraces || opts.IncludeVersions || len(opts.Levels) > 0 || len(opts.Keys) > 0
	return opts, nil
}

func parsePreferenceLevels(values []string) ([]PreferenceLevel, error) {
	parts := splitPreferenceQueryValues(values)
	if len(parts) == 0 {
		return nil, nil
	}
	out := make([]PreferenceLevel, 0, len(parts))
	seen := map[PreferenceLevel]bool{}
	for _, part := range parts {
		switch strings.ToLower(part) {
		case "system":
			if !seen[PreferenceLevelSystem] {
				out = append(out, PreferenceLevelSystem)
				seen[PreferenceLevelSystem] = true
			}
		case "tenant":
			if !seen[PreferenceLevelTenant] {
				out = append(out, PreferenceLevelTenant)
				seen[PreferenceLevelTenant] = true
			}
		case "org":
			if !seen[PreferenceLevelOrg] {
				out = append(out, PreferenceLevelOrg)
				seen[PreferenceLevelOrg] = true
			}
		case "user":
			if !seen[PreferenceLevelUser] {
				out = append(out, PreferenceLevelUser)
				seen[PreferenceLevelUser] = true
			}
		default:
			return nil, goerrors.New("invalid preference level", goerrors.CategoryValidation).
				WithCode(http.StatusBadRequest).
				WithMetadata(map[string]any{
					"level": part,
				})
		}
	}
	return out, nil
}

func parsePreferenceKeys(values []string) []string {
	parts := splitPreferenceQueryValues(values)
	return normalizePreferenceKeys(parts)
}

func parsePreferenceQueryBool(values []string) bool {
	for _, value := range values {
		if toBool(strings.TrimSpace(value)) {
			return true
		}
	}
	return false
}

func parsePreferenceBase(values []string) (map[string]any, error) {
	raw := ""
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			raw = trimmed
			break
		}
	}
	if raw == "" {
		return nil, nil
	}
	var out map[string]any
	if err := json.Unmarshal([]byte(raw), &out); err != nil {
		return nil, goerrors.New("invalid base payload", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithMetadata(map[string]any{
				"field": "base",
			})
	}
	return out, nil
}

func splitPreferenceQueryValues(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	out := []string{}
	for _, value := range values {
		parts := strings.FieldsFunc(value, func(r rune) bool {
			return r == ',' || r == ';' || r == ' ' || r == '\t' || r == '\n' || r == '\r'
		})
		for _, part := range parts {
			if trimmed := strings.TrimSpace(part); trimmed != "" {
				out = append(out, trimmed)
			}
		}
	}
	return out
}

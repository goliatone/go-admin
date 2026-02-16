package resolvers

import (
	"context"
	"fmt"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"github.com/goliatone/go-admin/pkg/placement/models"
	"github.com/google/uuid"
)

const NativePDFFormsResolverID = "native_pdf_forms_resolver"

var (
	pdfObjectPattern = regexp.MustCompile(`(?s)<<.*?>>`)
	pdfFieldName     = regexp.MustCompile(`/T\s*\(([^)]+)\)`)
	pdfFieldRect     = regexp.MustCompile(`/Rect\s*\[\s*([\-0-9.]+)\s+([\-0-9.]+)\s+([\-0-9.]+)\s+([\-0-9.]+)\s*\]`)
)

// NativePDFFormsResolver resolves suggestions from native PDF form field metadata.
type NativePDFFormsResolver struct{}

func (NativePDFFormsResolver) ID() string { return NativePDFFormsResolverID }

func (NativePDFFormsResolver) Estimate(_ context.Context, input ResolveInput) (models.Estimate, error) {
	nativeCount := len(input.NativeFormFields)
	if nativeCount == 0 {
		nativeCount = len(extractNativeFormFields(input.DocumentBytes))
	}
	estimate := models.Estimate{
		ResolverID: NativePDFFormsResolverID,
		Accuracy:   0.35,
		Cost:       0.15,
		Latency:    0.2,
		Supported:  true,
		Reason:     "fallback_estimate",
	}
	if nativeCount > 0 {
		estimate.Accuracy = 0.92
		estimate.Cost = 0.12
		estimate.Latency = 0.1
		estimate.Reason = "native_forms_detected"
	}
	return estimate, nil
}

func (NativePDFFormsResolver) Resolve(_ context.Context, input ResolveInput) (models.ResolveResult, error) {
	definitions := append([]models.FieldDefinition{}, input.FieldDefinitions...)
	if len(definitions) == 0 {
		return models.ResolveResult{}, nil
	}

	nativeFields := append([]models.NativeFormField{}, input.NativeFormFields...)
	if len(nativeFields) == 0 {
		nativeFields = extractNativeFormFields(input.DocumentBytes)
	}

	usedDefinition := map[string]bool{}
	suggestions := make([]models.Suggestion, 0)
	for _, native := range nativeFields {
		targetIdx := matchDefinitionIndex(definitions, usedDefinition, native)
		if targetIdx < 0 {
			continue
		}
		def := definitions[targetIdx]
		usedDefinition[def.ID] = true
		suggestions = append(suggestions, buildNativeSuggestion(def, native))
	}

	if len(suggestions) == 0 {
		suggestions = append(suggestions, fallbackSuggestions(definitions, usedDefinition, input.DocumentPageCount)...)
	}

	unresolved := make([]string, 0)
	for _, definition := range definitions {
		if usedDefinition[definition.ID] {
			continue
		}
		unresolved = append(unresolved, definition.ID)
	}
	sort.Strings(unresolved)

	return models.ResolveResult{
		Suggestions:             suggestions,
		UnresolvedDefinitionIDs: unresolved,
	}, nil
}

func buildNativeSuggestion(def models.FieldDefinition, native models.NativeFormField) models.Suggestion {
	confidence := 0.65
	matchType := "fallback"
	if matchesFieldLabel(def, native.Name) {
		confidence = 0.95
		matchType = "exact_label"
	} else if matchesTypeHint(def.FieldType, native.FieldTypeHint) {
		confidence = 0.8
		matchType = "type_hint"
	}
	return models.Suggestion{
		ID:                uuid.NewString(),
		FieldDefinitionID: def.ID,
		ResolverID:        NativePDFFormsResolverID,
		Confidence:        confidence,
		Geometry:          native.Geometry,
		Label:             strings.TrimSpace(native.Name),
		Metadata: map[string]any{
			"native_field_name": strings.TrimSpace(native.Name),
			"match_type":        matchType,
		},
	}
}

func fallbackSuggestions(definitions []models.FieldDefinition, used map[string]bool, pageCount int) []models.Suggestion {
	page := 1
	if pageCount > 0 {
		page = 1
	}
	out := make([]models.Suggestion, 0)
	x := 64.0
	y := 120.0
	for _, definition := range definitions {
		if used[definition.ID] {
			continue
		}
		out = append(out, models.Suggestion{
			ID:                uuid.NewString(),
			FieldDefinitionID: definition.ID,
			ResolverID:        NativePDFFormsResolverID,
			Confidence:        0.3,
			Geometry: models.Geometry{
				PageNumber: page,
				X:          x,
				Y:          y,
				Width:      180,
				Height:     28,
			},
			Label: strings.TrimSpace(definition.Label),
			Metadata: map[string]any{
				"match_type": "heuristic_fallback",
			},
		})
		x += 6
		y += 34
	}
	return out
}

func matchDefinitionIndex(definitions []models.FieldDefinition, used map[string]bool, native models.NativeFormField) int {
	bestIndex := -1
	bestScore := -1
	for i, definition := range definitions {
		if used[definition.ID] {
			continue
		}
		score := 0
		if matchesFieldLabel(definition, native.Name) {
			score += 3
		}
		if matchesTypeHint(definition.FieldType, native.FieldTypeHint) {
			score += 2
		}
		if score > bestScore {
			bestScore = score
			bestIndex = i
		}
	}
	if bestIndex >= 0 {
		return bestIndex
	}
	for i, definition := range definitions {
		if !used[definition.ID] {
			return i
		}
	}
	return -1
}

func matchesFieldLabel(def models.FieldDefinition, name string) bool {
	nameKey := canonicalToken(name)
	if nameKey == "" {
		return false
	}
	if canonicalToken(def.Label) == nameKey {
		return true
	}
	if canonicalToken(def.ID) == nameKey {
		return true
	}
	if strings.Contains(nameKey, canonicalToken(def.FieldType)) && canonicalToken(def.FieldType) != "" {
		return true
	}
	return false
}

func matchesTypeHint(fieldType, hint string) bool {
	ft := canonicalToken(fieldType)
	h := canonicalToken(hint)
	if ft == "" || h == "" {
		return false
	}
	return strings.Contains(h, ft) || strings.Contains(ft, h)
}

func canonicalToken(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" {
		return ""
	}
	replacer := strings.NewReplacer("-", "", "_", "", " ", "")
	return replacer.Replace(value)
}

func extractNativeFormFields(pdf []byte) []models.NativeFormField {
	if len(pdf) == 0 {
		return nil
	}
	text := string(pdf)
	objects := pdfObjectPattern.FindAllString(text, -1)
	out := make([]models.NativeFormField, 0)
	for _, object := range objects {
		nameMatches := pdfFieldName.FindStringSubmatch(object)
		rectMatches := pdfFieldRect.FindStringSubmatch(object)
		if len(nameMatches) < 2 || len(rectMatches) < 5 {
			continue
		}
		rect, ok := parseRect(rectMatches[1:5])
		if !ok {
			continue
		}
		out = append(out, models.NativeFormField{
			Name: strings.TrimSpace(nameMatches[1]),
			Geometry: models.Geometry{
				PageNumber: 1,
				X:          rect[0],
				Y:          rect[1],
				Width:      rect[2],
				Height:     rect[3],
			},
		})
	}
	return out
}

func parseRect(raw []string) ([4]float64, bool) {
	var out [4]float64
	if len(raw) != 4 {
		return out, false
	}
	for i := 0; i < 4; i++ {
		parsed, err := strconv.ParseFloat(strings.TrimSpace(raw[i]), 64)
		if err != nil {
			return out, false
		}
		out[i] = parsed
	}
	width := out[2] - out[0]
	height := out[3] - out[1]
	if width <= 0 || height <= 0 {
		return out, false
	}
	return [4]float64{out[0], out[1], width, height}, true
}

func ParseNativeFormFieldsForDebug(pdf []byte) []models.NativeFormField {
	fields := extractNativeFormFields(pdf)
	out := make([]models.NativeFormField, 0, len(fields))
	for _, field := range fields {
		out = append(out, field)
	}
	return out
}

func (NativePDFFormsResolver) String() string {
	return fmt.Sprintf("resolver<%s>", NativePDFFormsResolverID)
}

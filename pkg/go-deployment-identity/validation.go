package deploymentidentity

import (
	"bytes"
	"errors"
	"fmt"
	"image/png"
	"regexp"
	"strings"
	"unicode"
	"unicode/utf8"
)

const (
	MaxSeedBytes       = 1024
	MaxNamespaceBytes  = 256
	MaxNameBytes       = 128
	MaxLabelBytes      = 64
	MaxAltBytes        = 256
	MaxVisualTextBytes = 16
	MaxImageBytes      = 64 * 1024
	MaxImageDimension  = 256

	VisualKindMonogram = "monogram"
	VisualKindImage    = "image"
	MediaTypePNG       = "image/png"
)

var (
	colorPattern = regexp.MustCompile(`^#[0-9a-fA-F]{6}$`)
	labelPattern = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9._-]*$`)
)

// NormalizeText trims input, removes control characters, and bounds UTF-8
// without splitting a rune.
func NormalizeText(value string, limit int) string {
	value = strings.TrimSpace(value)
	if value == "" || limit <= 0 {
		return ""
	}
	var out strings.Builder
	for _, r := range value {
		if !unicode.IsPrint(r) || unicode.IsControl(r) {
			continue
		}
		size := utf8.RuneLen(r)
		if out.Len()+size > limit {
			break
		}
		out.WriteRune(r)
	}
	return strings.TrimSpace(out.String())
}

// Validate normalizes, validates, and defensively copies generator output.
func Validate(persona Persona) (Persona, error) {
	persona = normalizePersona(persona)
	if err := validatePersonaMetadata(persona); err != nil {
		return Persona{}, err
	}
	switch persona.Visual.Kind {
	case VisualKindMonogram:
		if err := validateMonogram(persona.Visual); err != nil {
			return Persona{}, err
		}
	case VisualKindImage:
		if err := validateImage(&persona.Visual); err != nil {
			return Persona{}, err
		}
	default:
		return Persona{}, fmt.Errorf("unsupported persona visual kind %q", persona.Visual.Kind)
	}
	return persona, nil
}

func normalizePersona(persona Persona) Persona {
	persona.Name = NormalizeText(persona.Name, MaxNameBytes)
	persona.Algorithm = NormalizeText(persona.Algorithm, MaxLabelBytes)
	persona.Version = NormalizeText(persona.Version, MaxLabelBytes)
	persona.Source = NormalizeText(persona.Source, MaxLabelBytes)
	persona.Visual.Text = NormalizeText(persona.Visual.Text, MaxVisualTextBytes)
	persona.Visual.Alt = NormalizeText(persona.Visual.Alt, MaxAltBytes)
	persona.Visual.Background = strings.ToLower(strings.TrimSpace(persona.Visual.Background))
	persona.Visual.Foreground = strings.ToLower(strings.TrimSpace(persona.Visual.Foreground))
	persona.Visual.MediaType = strings.ToLower(strings.TrimSpace(persona.Visual.MediaType))
	persona.Visual.Data = append([]byte(nil), persona.Visual.Data...)
	return persona
}

func validatePersonaMetadata(persona Persona) error {
	if persona.Name == "" {
		return errors.New("persona name is required")
	}
	if !validLabel(persona.Algorithm) || !validLabel(persona.Version) {
		return errors.New("persona algorithm and version must be safe labels")
	}
	if persona.Source != "" && !validLabel(persona.Source) {
		return errors.New("persona source must be a safe label")
	}
	if persona.Visual.Alt == "" {
		return errors.New("persona visual alternative text is required")
	}
	return nil
}

func validateMonogram(visual Visual) error {
	if visual.Text == "" {
		return errors.New("monogram text is required")
	}
	if !validColor(visual.Background) || !validColor(visual.Foreground) {
		return errors.New("monogram colors must use six-digit hex notation")
	}
	if visual.MediaType != "" || len(visual.Data) != 0 {
		return errors.New("monogram visual cannot contain image data")
	}
	return nil
}

func validateImage(visual *Visual) error {
	if visual.MediaType != MediaTypePNG {
		return fmt.Errorf("unsupported persona image media type %q", visual.MediaType)
	}
	if len(visual.Data) == 0 || len(visual.Data) > MaxImageBytes {
		return errors.New("persona image payload is empty or exceeds its limit")
	}
	config, err := png.DecodeConfig(bytes.NewReader(visual.Data))
	if err != nil {
		return errors.New("persona image payload is not a valid PNG")
	}
	if config.Width < 1 || config.Height < 1 ||
		config.Width > MaxImageDimension || config.Height > MaxImageDimension {
		return errors.New("persona image dimensions exceed their limit")
	}
	if _, err := png.Decode(bytes.NewReader(visual.Data)); err != nil {
		return errors.New("persona image payload is not a valid PNG")
	}
	visual.Text = ""
	visual.Background = ""
	visual.Foreground = ""
	return nil
}

func validLabel(value string) bool {
	return value != "" && labelPattern.MatchString(value)
}

func validColor(value string) bool {
	return colorPattern.MatchString(value)
}

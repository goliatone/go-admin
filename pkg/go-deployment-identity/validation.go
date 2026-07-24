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

	if persona.Name == "" {
		return Persona{}, errors.New("persona name is required")
	}
	if !validLabel(persona.Algorithm) || !validLabel(persona.Version) {
		return Persona{}, errors.New("persona algorithm and version must be safe labels")
	}
	if persona.Source != "" && !validLabel(persona.Source) {
		return Persona{}, errors.New("persona source must be a safe label")
	}
	if persona.Visual.Alt == "" {
		return Persona{}, errors.New("persona visual alternative text is required")
	}
	switch persona.Visual.Kind {
	case VisualKindMonogram:
		if persona.Visual.Text == "" {
			return Persona{}, errors.New("monogram text is required")
		}
		if !validColor(persona.Visual.Background) || !validColor(persona.Visual.Foreground) {
			return Persona{}, errors.New("monogram colors must use six-digit hex notation")
		}
		if persona.Visual.MediaType != "" || len(persona.Visual.Data) != 0 {
			return Persona{}, errors.New("monogram visual cannot contain image data")
		}
	case VisualKindImage:
		if persona.Visual.MediaType != MediaTypePNG {
			return Persona{}, fmt.Errorf("unsupported persona image media type %q", persona.Visual.MediaType)
		}
		if len(persona.Visual.Data) == 0 || len(persona.Visual.Data) > MaxImageBytes {
			return Persona{}, errors.New("persona image payload is empty or exceeds its limit")
		}
		config, err := png.DecodeConfig(bytes.NewReader(persona.Visual.Data))
		if err != nil {
			return Persona{}, errors.New("persona image payload is not a valid PNG")
		}
		if config.Width < 1 || config.Height < 1 ||
			config.Width > MaxImageDimension || config.Height > MaxImageDimension {
			return Persona{}, errors.New("persona image dimensions exceed their limit")
		}
		persona.Visual.Text = ""
		persona.Visual.Background = ""
		persona.Visual.Foreground = ""
	default:
		return Persona{}, fmt.Errorf("unsupported persona visual kind %q", persona.Visual.Kind)
	}
	return persona, nil
}

func validLabel(value string) bool {
	return value != "" && labelPattern.MatchString(value)
}

func validColor(value string) bool {
	return colorPattern.MatchString(value)
}

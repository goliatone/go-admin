package identicon

import (
	"errors"
	"fmt"
	"strings"
)

const (
	Algorithm = "go-admin-identicon"
	VersionV1 = "v1"
)

// Palette is a curated foreground/background pair.
type Palette struct {
	Foreground string
	Background string
}

var defaultPalettes = []Palette{
	{Foreground: "#0f766e", Background: "#ccfbf1"},
	{Foreground: "#1d4ed8", Background: "#dbeafe"},
	{Foreground: "#6d28d9", Background: "#ede9fe"},
	{Foreground: "#be123c", Background: "#ffe4e6"},
	{Foreground: "#c2410c", Background: "#ffedd5"},
}

type config struct {
	version   string
	size      int
	palettes  []Palette
	namespace *string
}

// Option configures a Generator.
type Option func(*config) error

// WithVersion selects a supported compatibility version.
func WithVersion(version string) Option {
	return func(cfg *config) error {
		if strings.TrimSpace(version) != VersionV1 {
			return fmt.Errorf("unsupported identicon version %q", version)
		}
		cfg.version = VersionV1
		return nil
	}
}

// WithSize sets the square PNG size. Sizes must be 32..256 and divisible by 8.
func WithSize(size int) Option {
	return func(cfg *config) error {
		if size < 32 || size > 256 || size%8 != 0 {
			return fmt.Errorf("identicon size %d must be 32..256 and divisible by 8", size)
		}
		cfg.size = size
		return nil
	}
}

// WithPalettes replaces the curated palette choices.
func WithPalettes(palettes ...Palette) Option {
	return func(cfg *config) error {
		if len(palettes) == 0 || len(palettes) > 16 {
			return errors.New("identicon palettes must contain 1..16 entries")
		}
		for _, palette := range palettes {
			if !safeColor(palette.Foreground) || !safeColor(palette.Background) {
				return errors.New("identicon palettes require six-digit hex colors")
			}
		}
		cfg.palettes = append([]Palette(nil), palettes...)
		return nil
	}
}

// WithNamespace overrides Input.Namespace. An empty value explicitly shares
// identities across application namespaces.
func WithNamespace(namespace string) Option {
	return func(cfg *config) error {
		value := namespace
		cfg.namespace = &value
		return nil
	}
}

func safeColor(value string) bool {
	if len(value) != 7 || value[0] != '#' {
		return false
	}
	for _, char := range value[1:] {
		if !((char >= '0' && char <= '9') || (char >= 'a' && char <= 'f') || (char >= 'A' && char <= 'F')) {
			return false
		}
	}
	return true
}

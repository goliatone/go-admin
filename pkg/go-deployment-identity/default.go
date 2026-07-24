package deploymentidentity

import (
	"crypto/sha256"
	"errors"
	"strings"
)

const (
	DefaultAlgorithm = "go-admin-monogram"
	DefaultVersion   = "v1"
)

var (
	defaultAdjectives = [...]string{
		"amber", "brisk", "calm", "clear", "gentle", "lively", "lucid", "steady",
		"swift", "verdant", "vivid", "warm",
	}
	defaultNouns = [...]string{
		"badger", "falcon", "heron", "lynx", "otter", "panda", "raven", "turtle",
		"whale", "wren", "yak", "zebra",
	}
	defaultPalettes = [...][2]string{
		{"#0f766e", "#f0fdfa"},
		{"#1d4ed8", "#eff6ff"},
		{"#6d28d9", "#f5f3ff"},
		{"#a21caf", "#fdf4ff"},
		{"#be123c", "#fff1f2"},
		{"#c2410c", "#fff7ed"},
	}
)

// DefaultGenerator is the dependency-light structured persona generator.
type DefaultGenerator struct{}

// NewDefaultGenerator constructs the versioned core generator.
func NewDefaultGenerator() Generator {
	return DefaultGenerator{}
}

// Generate creates a stable name and monogram visual.
func (DefaultGenerator) Generate(input Input) (Persona, error) {
	seed := NormalizeText(input.Seed, MaxSeedBytes)
	if seed == "" {
		return Persona{}, errors.New("deployment identity seed is required")
	}
	namespace := NormalizeText(input.Namespace, MaxNamespaceBytes)
	digest := Digest(DefaultAlgorithm, DefaultVersion, namespace, seed)
	adjective := defaultAdjectives[int(digest[0])%len(defaultAdjectives)]
	noun := defaultNouns[int(digest[1])%len(defaultNouns)]
	name := adjective + "-" + noun
	palette := defaultPalettes[int(digest[2])%len(defaultPalettes)]
	text := strings.ToUpper(adjective[:1] + noun[:1])
	return Persona{
		Name:      name,
		Algorithm: DefaultAlgorithm,
		Version:   DefaultVersion,
		Source:    "default",
		Visual: Visual{
			Kind:       VisualKindMonogram,
			Text:       text,
			Alt:        name + " deployment persona",
			Background: palette[0],
			Foreground: palette[1],
		},
	}, nil
}

// Digest returns the domain-separated digest used by versioned generators.
func Digest(algorithm, version, namespace, seed string) [sha256.Size]byte {
	var input strings.Builder
	input.WriteString("go-admin/deployment-persona/")
	input.WriteString(algorithm)
	input.WriteByte('/')
	input.WriteString(version)
	input.WriteByte(0)
	input.WriteString(namespace)
	input.WriteByte(0)
	input.WriteString(seed)
	return sha256.Sum256([]byte(input.String()))
}

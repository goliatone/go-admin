// Package identicon provides a deterministic, local PNG deployment persona.
package identicon

import (
	"errors"
	"strings"

	deploymentidentity "github.com/goliatone/go-admin/pkg/go-deployment-identity"
)

var (
	adjectives = [...]string{"bright", "calm", "clever", "gentle", "lively", "lucid", "steady", "swift"}
	nouns      = [...]string{"badger", "falcon", "heron", "lynx", "otter", "panda", "raven", "turtle"}
)

// Generator renders versioned mirrored-grid PNG personas.
type Generator struct {
	config config
}

var _ deploymentidentity.Generator = (*Generator)(nil)

// New constructs an identicon generator.
func New(options ...Option) (*Generator, error) {
	cfg := config{
		version:  VersionV1,
		size:     64,
		palettes: append([]Palette(nil), defaultPalettes...),
	}
	for _, option := range options {
		if option != nil {
			if err := option(&cfg); err != nil {
				return nil, err
			}
		}
	}
	return &Generator{config: cfg}, nil
}

// Generate creates a stable name, mirrored grid, and PNG.
func (g *Generator) Generate(input deploymentidentity.Input) (deploymentidentity.Persona, error) {
	if g == nil {
		return deploymentidentity.Persona{}, errors.New("identicon generator is nil")
	}
	seed := deploymentidentity.NormalizeText(input.Seed, deploymentidentity.MaxSeedBytes)
	if seed == "" {
		return deploymentidentity.Persona{}, errors.New("deployment identity seed is required")
	}
	namespace := deploymentidentity.NormalizeText(input.Namespace, deploymentidentity.MaxNamespaceBytes)
	if g.config.namespace != nil {
		namespace = deploymentidentity.NormalizeText(*g.config.namespace, deploymentidentity.MaxNamespaceBytes)
	}
	digest := deploymentidentity.Digest(Algorithm, g.config.version, namespace, seed)
	name := adjectives[int(digest[0])%len(adjectives)] + "-" + nouns[int(digest[1])%len(nouns)]
	palette := g.config.palettes[int(digest[2])%len(g.config.palettes)]
	data, err := renderPNG(digest, g.config.size, palette)
	if err != nil {
		return deploymentidentity.Persona{}, err
	}
	return deploymentidentity.Persona{
		Name:      name,
		Algorithm: Algorithm,
		Version:   g.config.version,
		Source:    "identicon",
		Visual: deploymentidentity.Visual{
			Kind:      deploymentidentity.VisualKindImage,
			Alt:       name + " deployment persona",
			MediaType: deploymentidentity.MediaTypePNG,
			Data:      data,
		},
	}, nil
}

// Grid exposes the deterministic 5x5 mirrored cell layout for tests and
// custom renderers.
func Grid(input deploymentidentity.Input, version string) ([5][5]bool, error) {
	if strings.TrimSpace(version) != VersionV1 {
		return [5][5]bool{}, errors.New("unsupported identicon version")
	}
	seed := deploymentidentity.NormalizeText(input.Seed, deploymentidentity.MaxSeedBytes)
	if seed == "" {
		return [5][5]bool{}, errors.New("deployment identity seed is required")
	}
	digest := deploymentidentity.Digest(Algorithm, version,
		deploymentidentity.NormalizeText(input.Namespace, deploymentidentity.MaxNamespaceBytes), seed)
	return gridFromDigest(digest), nil
}

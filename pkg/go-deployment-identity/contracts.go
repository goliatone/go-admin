// Package deploymentidentity defines deterministic, presentation-safe
// identities for deployed artifacts.
package deploymentidentity

// Input is the normalized, stable input supplied to a Generator.
type Input struct {
	Seed        string
	Namespace   string
	CommitSHA   string
	AppID       string
	AppName     string
	Environment string
}

// Generator creates a deterministic persona for an artifact.
type Generator interface {
	Generate(Input) (Persona, error)
}

// GeneratorFunc adapts a function to Generator.
type GeneratorFunc func(Input) (Persona, error)

// Generate implements Generator.
func (f GeneratorFunc) Generate(input Input) (Persona, error) {
	return f(input)
}

// Persona is a bounded display identity. It is not a unique identifier.
type Persona struct {
	Name      string `json:"name"`
	Visual    Visual `json:"visual"`
	Algorithm string `json:"algorithm"`
	Version   string `json:"version"`
	Source    string `json:"source,omitempty"`
}

// Visual describes either a structured monogram or a passive image.
type Visual struct {
	Kind       string `json:"kind"`
	Text       string `json:"text,omitempty"`
	Alt        string `json:"alt"`
	Background string `json:"background,omitempty"`
	Foreground string `json:"foreground,omitempty"`
	MediaType  string `json:"media_type,omitempty"`
	Data       []byte `json:"data,omitempty"`
}

// Clone returns a defensive copy.
func (p Persona) Clone() Persona {
	p.Visual.Data = append([]byte(nil), p.Visual.Data...)
	return p
}

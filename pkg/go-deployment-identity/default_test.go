package deploymentidentity

import (
	"bytes"
	"image"
	"image/color"
	"image/png"
	"reflect"
	"sync"
	"testing"
)

func TestDefaultGeneratorGoldenVector(t *testing.T) {
	persona, err := NewDefaultGenerator().Generate(Input{Seed: "0123456789abcdef", Namespace: "example"})
	if err != nil {
		t.Fatal(err)
	}
	validated, err := Validate(persona)
	if err != nil {
		t.Fatal(err)
	}
	if validated.Name != "gentle-wren" || validated.Visual.Text != "GW" ||
		validated.Visual.Background != "#c2410c" || validated.Visual.Foreground != "#fff7ed" {
		t.Fatalf("unexpected golden persona: %+v", validated)
	}
}

func TestDefaultGeneratorConcurrentDeterminism(t *testing.T) {
	input := Input{Seed: "stable-seed", Namespace: "stable-app"}
	want, err := NewDefaultGenerator().Generate(input)
	if err != nil {
		t.Fatal(err)
	}
	var wg sync.WaitGroup
	for range 32 {
		wg.Go(func() {
			got, generateErr := NewDefaultGenerator().Generate(input)
			if generateErr != nil || !reflect.DeepEqual(got, want) {
				t.Errorf("Generate() = %+v, %v; want %+v", got, generateErr, want)
			}
		})
	}
	wg.Wait()
}

func TestValidateDefensiveCopyAndLimits(t *testing.T) {
	var encoded bytes.Buffer
	source := image.NewRGBA(image.Rect(0, 0, 1, 1))
	source.Set(0, 0, color.Black)
	if err := png.Encode(&encoded, source); err != nil {
		t.Fatal(err)
	}
	data := encoded.Bytes()
	persona, err := Validate(Persona{
		Name: "image", Algorithm: "test", Version: "v1",
		Visual: Visual{Kind: VisualKindImage, Alt: "image", MediaType: MediaTypePNG, Data: data},
	})
	if err != nil {
		t.Fatal(err)
	}
	data[0] = 9
	if bytes.Equal(persona.Visual.Data, data) {
		t.Fatal("validated persona aliases source data")
	}
	clone := persona.Clone()
	clone.Visual.Data[0] = 8
	if persona.Visual.Data[0] == clone.Visual.Data[0] {
		t.Fatal("Clone aliases visual data")
	}
}

func TestValidateRejectsInvalidPNG(t *testing.T) {
	_, err := Validate(Persona{
		Name: "image", Algorithm: "test", Version: "v1",
		Visual: Visual{Kind: VisualKindImage, Alt: "image", MediaType: MediaTypePNG, Data: []byte("not png")},
	})
	if err == nil {
		t.Fatal("Validate accepted invalid PNG data")
	}
}

func TestGeneratorFunc(t *testing.T) {
	var generator Generator = GeneratorFunc(func(input Input) (Persona, error) {
		return Persona{Name: input.Seed}, nil
	})
	got, err := generator.Generate(Input{Seed: "ok"})
	if err != nil || got.Name != "ok" {
		t.Fatalf("Generate() = %+v, %v", got, err)
	}
}

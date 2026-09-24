package identicon

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"image"
	"image/draw"
	"image/png"
	"sync"
	"testing"

	deploymentidentity "github.com/goliatone/go-admin/pkg/go-deployment-identity"
)

func TestGeneratorGoldenVector(t *testing.T) {
	generator, err := New()
	if err != nil {
		t.Fatal(err)
	}
	persona, err := generator.Generate(deploymentidentity.Input{Seed: "0123456789abcdef", Namespace: "example"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = deploymentidentity.Validate(persona); err != nil {
		t.Fatal(err)
	}
	decoded, err := png.Decode(bytes.NewReader(persona.Visual.Data))
	if err != nil {
		t.Fatal(err)
	}
	if decoded.Bounds() != image.Rect(0, 0, 64, 64) {
		t.Fatalf("invalid PNG bounds: %v", decoded.Bounds())
	}
	// Pin the visual independently of standard-library compression changes.
	// Repeatability and rollback tests below still require byte-identical PNGs.
	pixels := image.NewNRGBA(decoded.Bounds())
	draw.Draw(pixels, pixels.Bounds(), decoded, decoded.Bounds().Min, draw.Src)
	sum := sha256.Sum256(pixels.Pix)
	if persona.Name != "lively-raven" || hex.EncodeToString(sum[:]) != "8790bc2a82705748921ea88944aa99e0d69d1d0e21ec7ab3f28a62f01a5d0c41" {
		t.Fatalf("unexpected golden vector: name=%s pixels=%s", persona.Name, hex.EncodeToString(sum[:]))
	}
}

func TestGridIsMirrored(t *testing.T) {
	grid, err := Grid(deploymentidentity.Input{Seed: "seed", Namespace: "app"}, VersionV1)
	if err != nil {
		t.Fatal(err)
	}
	for y := range 5 {
		for x := range 5 {
			if grid[y][x] != grid[y][4-x] {
				t.Fatalf("row %d is not mirrored: %+v", y, grid[y])
			}
		}
	}
}

func TestGeneratorConcurrentDeterminism(t *testing.T) {
	generator, err := New(WithSize(96))
	if err != nil {
		t.Fatal(err)
	}
	input := deploymentidentity.Input{Seed: "seed", Namespace: "app"}
	want, err := generator.Generate(input)
	if err != nil {
		t.Fatal(err)
	}
	var wg sync.WaitGroup
	for range 24 {
		wg.Go(func() {
			got, err := generator.Generate(input)
			if err != nil || got.Name != want.Name || !bytes.Equal(got.Visual.Data, want.Visual.Data) {
				t.Errorf("non-deterministic result: %v", err)
			}
		})
	}
	wg.Wait()
}

func TestGeneratorRollbackABAReproducesPersona(t *testing.T) {
	generator, err := New()
	if err != nil {
		t.Fatal(err)
	}
	namespace := "rollback-check"
	first, err := generator.Generate(deploymentidentity.Input{Seed: "artifact-a", Namespace: namespace})
	if err != nil {
		t.Fatal(err)
	}
	middle, err := generator.Generate(deploymentidentity.Input{Seed: "artifact-b", Namespace: namespace})
	if err != nil {
		t.Fatal(err)
	}
	final, err := generator.Generate(deploymentidentity.Input{Seed: "artifact-a", Namespace: namespace})
	if err != nil {
		t.Fatal(err)
	}
	if first.Name == middle.Name && bytes.Equal(first.Visual.Data, middle.Visual.Data) {
		t.Fatal("A and B unexpectedly produced the same complete persona")
	}
	if first.Name != final.Name || !bytes.Equal(first.Visual.Data, final.Visual.Data) {
		t.Fatal("A → B → A did not restore byte-equivalent persona output")
	}
}

func TestOptionsAreBoundedAndStable(t *testing.T) {
	if _, err := New(WithSize(31)); err == nil {
		t.Fatal("accepted invalid size")
	}
	if _, err := New(WithVersion("v2")); err == nil {
		t.Fatal("accepted invalid version")
	}
	first, err := New(WithNamespace("shared"), WithPalettes(Palette{"#000000", "#ffffff"}))
	if err != nil {
		t.Fatal(err)
	}
	second, err := New(WithNamespace("shared"), WithPalettes(Palette{"#000000", "#ffffff"}))
	if err != nil {
		t.Fatal(err)
	}
	a, err := first.Generate(deploymentidentity.Input{Seed: "seed", Namespace: "ignored-a"})
	if err != nil {
		t.Fatal(err)
	}
	b, err := second.Generate(deploymentidentity.Input{Seed: "seed", Namespace: "ignored-b"})
	if err != nil {
		t.Fatal(err)
	}
	if a.Name != b.Name || !bytes.Equal(a.Visual.Data, b.Visual.Data) {
		t.Fatal("equivalent effective configuration is unstable")
	}
}

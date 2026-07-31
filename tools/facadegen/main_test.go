package main

import (
	"strings"
	"testing"
)

func TestManualDeclsIncludeGenericMessageFactoryFallbacks(t *testing.T) {
	builder := &facadeBuilder{
		hasIntPtr:                                 true,
		hasRegisterMessageFactory:                 true,
		hasRegisterMessageResultFactory:           true,
		hasRegisterContextMessageFactory:          true,
		hasRegisterContextMessageResultFactory:    true,
		hasRegisterSetMessageFactory:              true,
		hasRegisterSetMessageResultFactory:        true,
		hasRegisterSetContextMessageFactory:       true,
		hasRegisterSetContextMessageResultFactory: true,
	}

	generated := strings.Join(builder.manualDecls(), "\n")
	for _, name := range []string{
		"func RegisterMessageFactory[T any]",
		"func RegisterMessageResultFactory[T any, R any]",
		"func RegisterContextMessageFactory[T any]",
		"func RegisterContextMessageResultFactory[T any, R any]",
		"func RegisterSetMessageFactory[T any]",
		"func RegisterSetMessageResultFactory[T any, R any]",
		"func RegisterSetContextMessageFactory[T any]",
		"func RegisterSetContextMessageResultFactory[T any, R any]",
	} {
		if !strings.Contains(generated, name) {
			t.Fatalf("manual declarations missing %q:\n%s", name, generated)
		}
	}
}

func TestManualDeclsSkipGenericMessageFactoriesRenderedNormally(t *testing.T) {
	builder := &facadeBuilder{
		hasIntPtr:                                       true,
		hasRegisterMessageFactory:                       true,
		generatedRegisterMessageFactory:                 true,
		hasRegisterMessageResultFactory:                 true,
		generatedRegisterMessageResultFactory:           true,
		hasRegisterContextMessageFactory:                true,
		generatedRegisterContextMessageFactory:          true,
		hasRegisterContextMessageResultFactory:          true,
		generatedRegisterContextMessageResultFactory:    true,
		hasRegisterSetMessageFactory:                    true,
		generatedRegisterSetMessageFactory:              true,
		hasRegisterSetMessageResultFactory:              true,
		generatedRegisterSetMessageResultFactory:        true,
		hasRegisterSetContextMessageFactory:             true,
		generatedRegisterSetContextMessageFactory:       true,
		hasRegisterSetContextMessageResultFactory:       true,
		generatedRegisterSetContextMessageResultFactory: true,
	}

	if declarations := builder.manualDecls(); len(declarations) != 0 {
		t.Fatalf("manual declarations = %v, want none", declarations)
	}
}

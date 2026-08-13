package admincontract

import (
	"reflect"
	"testing"

	rootcontract "github.com/goliatone/go-admin/testkit/admincontract"
)

func TestContractTypesAliasRootContract(t *testing.T) {
	tests := []struct {
		name       string
		quickstart reflect.Type
		root       reflect.Type
	}{
		{name: "predicate", quickstart: reflect.TypeOf(ListPredicate{}), root: reflect.TypeOf(rootcontract.ListPredicate{})},
		{name: "options", quickstart: reflect.TypeOf(ListOptions{}), root: reflect.TypeOf(rootcontract.ListOptions{})},
		{name: "config", quickstart: reflect.TypeOf(PaginationContractConfig{}), root: reflect.TypeOf(rootcontract.PaginationContractConfig{})},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if test.quickstart != test.root {
				t.Fatalf("quickstart contract must alias root contract: %v != %v", test.quickstart, test.root)
			}
		})
	}
}

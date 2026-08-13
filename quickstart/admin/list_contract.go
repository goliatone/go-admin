// Package admincontract provides reusable repository contract assertions.
package admincontract

import (
	"testing"

	rootcontract "github.com/goliatone/go-admin/testkit/admincontract"
)

// ListPredicate is a transport-agnostic predicate shape for list contracts.
type ListPredicate = rootcontract.ListPredicate

// ListOptions is a transport-agnostic list query shape for list contracts.
type ListOptions = rootcontract.ListOptions

// ListFunc describes the contract target list function.
type ListFunc = rootcontract.ListFunc

// PaginationContractConfig configures assertions for a list total/pagination contract.
type PaginationContractConfig = rootcontract.PaginationContractConfig

// AssertPaginationContract verifies that total is stable across pages and page slicing
// honors total/per-page semantics.
func AssertPaginationContract(t *testing.T, list ListFunc, cfg PaginationContractConfig) {
	rootcontract.AssertPaginationContract(t, list, cfg)
}

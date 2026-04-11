package release

import (
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestValidateV2ContractFreezeGuardPassesForCurrentSnapshot(t *testing.T) {
	repoRoot, err := DefaultRepoRoot()
	if err != nil {
		t.Fatalf("DefaultRepoRoot: %v", err)
	}
	guardPath := filepath.Join(repoRoot, "examples/esign/release/v2_contract_freeze_guard.json")
	guard, err := LoadV2ContractFreezeGuard(guardPath)
	if err != nil {
		t.Fatalf("LoadV2ContractFreezeGuard: %v", err)
	}
	issues, err := ValidateV2ContractFreezeGuard(repoRoot, guard, time.Date(2026, 2, 16, 12, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("ValidateV2ContractFreezeGuard: %v", err)
	}
	if len(issues) != 0 {
		t.Fatalf("expected no v2 contract-freeze issues, got %+v", issues)
	}
}

func TestValidateV2ContractFreezeGuardBlocksPostFreezeMismatchWithoutApproval(t *testing.T) {
	repoRoot, err := DefaultRepoRoot()
	if err != nil {
		t.Fatalf("DefaultRepoRoot: %v", err)
	}
	guardPath := filepath.Join(repoRoot, "examples/esign/release/v2_contract_freeze_guard.json")
	guard, err := LoadV2ContractFreezeGuard(guardPath)
	if err != nil {
		t.Fatalf("LoadV2ContractFreezeGuard: %v", err)
	}
	guard.ContractHash = "deadbeef"
	guard.ExceptionApprovalRef = ""
	guard.ExceptionApprovedBy = ""

	issues, err := ValidateV2ContractFreezeGuard(repoRoot, guard, time.Date(2026, 2, 17, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("ValidateV2ContractFreezeGuard: %v", err)
	}
	if len(issues) == 0 {
		t.Fatalf("expected post-freeze mismatch issue")
	}
	joined := strings.Join(issues, " | ")
	if !strings.Contains(joined, "post-freeze contract change blocked") {
		t.Fatalf("expected post-freeze block issue, got %s", joined)
	}
}

func TestValidateV2ContractFreezeGuardAllowsApprovedPostFreezeException(t *testing.T) {
	repoRoot, err := DefaultRepoRoot()
	if err != nil {
		t.Fatalf("DefaultRepoRoot: %v", err)
	}
	guardPath := filepath.Join(repoRoot, "examples/esign/release/v2_contract_freeze_guard.json")
	guard, err := LoadV2ContractFreezeGuard(guardPath)
	if err != nil {
		t.Fatalf("LoadV2ContractFreezeGuard: %v", err)
	}
	guard.ContractHash = "deadbeef"
	guard.ExceptionApprovalRef = "REL-2807-EX-001"
	guard.ExceptionApprovedBy = "release-owner"

	issues, err := ValidateV2ContractFreezeGuard(repoRoot, guard, time.Date(2026, 2, 17, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("ValidateV2ContractFreezeGuard: %v", err)
	}
	if len(issues) != 0 {
		t.Fatalf("expected approved post-freeze exception to pass, got %+v", issues)
	}
}

func TestValidateV2ContractFreezeGuardRequiresSourceManagementCoverage(t *testing.T) {
	repoRoot, err := DefaultRepoRoot()
	if err != nil {
		t.Fatalf("DefaultRepoRoot: %v", err)
	}
	guardPath := filepath.Join(repoRoot, "examples/esign/release/v2_contract_freeze_guard.json")
	guard, err := LoadV2ContractFreezeGuard(guardPath)
	if err != nil {
		t.Fatalf("LoadV2ContractFreezeGuard: %v", err)
	}
	guard.TrackedFiles = []string{"examples/esign/release/v2_source_management_contract_manifest.json"}

	issues, err := ValidateV2ContractFreezeGuard(repoRoot, guard, time.Date(2026, 3, 22, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("ValidateV2ContractFreezeGuard: %v", err)
	}
	if len(issues) == 0 {
		t.Fatal("expected tracked file coverage issue")
	}
	joined := strings.Join(issues, " | ")
	if !strings.Contains(joined, "tracked_files missing required v2 source-management contract snapshot") {
		t.Fatalf("expected tracked file coverage issue, got %s", joined)
	}
}

func TestValidateV2ContractFreezeGuardRequiresContractSourceInputs(t *testing.T) {
	repoRoot, err := DefaultRepoRoot()
	if err != nil {
		t.Fatalf("DefaultRepoRoot: %v", err)
	}
	guardPath := filepath.Join(repoRoot, "examples/esign/release/v2_contract_freeze_guard.json")
	guard, err := LoadV2ContractFreezeGuard(guardPath)
	if err != nil {
		t.Fatalf("LoadV2ContractFreezeGuard: %v", err)
	}
	guard.TrackedFiles = []string{
		"examples/esign/release/v2_source_management_contract_manifest.json",
		"pkg/client/assets/tests/fixtures/source_management_contracts/contract_fixtures.json",
	}

	issues, err := ValidateV2ContractFreezeGuard(repoRoot, guard, time.Date(2026, 3, 22, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("ValidateV2ContractFreezeGuard: %v", err)
	}
	if len(issues) == 0 {
		t.Fatal("expected missing contract source input issue")
	}
	joined := strings.Join(issues, " | ")
	if !strings.Contains(joined, "examples/esign/services/lineage_contracts.go") {
		t.Fatalf("expected missing lineage contract source input, got %s", joined)
	}
	if !strings.Contains(joined, "examples/esign/handlers/register_lineage_routes.go") {
		t.Fatalf("expected missing route registration source input, got %s", joined)
	}
}

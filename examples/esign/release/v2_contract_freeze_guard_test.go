package release

import (
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestValidateV2ContractFreezeGuardPassesForCurrentSnapshot(t *testing.T) {
	repoRoot, err := filepath.Abs(filepath.Join("..", "..", ".."))
	if err != nil {
		t.Fatalf("Abs repoRoot: %v", err)
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
	repoRoot, err := filepath.Abs(filepath.Join("..", "..", ".."))
	if err != nil {
		t.Fatalf("Abs repoRoot: %v", err)
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
	repoRoot, err := filepath.Abs(filepath.Join("..", "..", ".."))
	if err != nil {
		t.Fatalf("Abs repoRoot: %v", err)
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


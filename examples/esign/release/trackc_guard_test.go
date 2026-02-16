package release

import (
	"path/filepath"
	"testing"
)

func TestValidateTrackCContractGuardPassesForCurrentSnapshot(t *testing.T) {
	repoRoot, err := filepath.Abs(filepath.Join("..", "..", ".."))
	if err != nil {
		t.Fatalf("Abs repoRoot: %v", err)
	}
	guardPath := filepath.Join(repoRoot, "examples/esign/release/trackc_contract_guard.json")
	guard, err := LoadTrackCContractGuard(guardPath)
	if err != nil {
		t.Fatalf("LoadTrackCContractGuard: %v", err)
	}
	issues, err := ValidateTrackCContractGuard(repoRoot, guard)
	if err != nil {
		t.Fatalf("ValidateTrackCContractGuard: %v", err)
	}
	if len(issues) != 0 {
		t.Fatalf("expected no Track C guard issues, got %+v", issues)
	}
}

func TestValidateTrackCContractGuardDetectsHashMismatch(t *testing.T) {
	repoRoot, err := filepath.Abs(filepath.Join("..", "..", ".."))
	if err != nil {
		t.Fatalf("Abs repoRoot: %v", err)
	}
	guardPath := filepath.Join(repoRoot, "examples/esign/release/trackc_contract_guard.json")
	guard, err := LoadTrackCContractGuard(guardPath)
	if err != nil {
		t.Fatalf("LoadTrackCContractGuard: %v", err)
	}
	guard.ContractHash = "deadbeef"
	issues, err := ValidateTrackCContractGuard(repoRoot, guard)
	if err != nil {
		t.Fatalf("ValidateTrackCContractGuard: %v", err)
	}
	if len(issues) == 0 {
		t.Fatal("expected guard hash mismatch issue")
	}
}

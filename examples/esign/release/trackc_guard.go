package release

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// TrackCContractGuard defines the contract-shape guardrails enforced in tests/CI.
type TrackCContractGuard struct {
	TrackedFiles          []string `json:"tracked_files"`
	ContractHash          string   `json:"contract_hash"`
	LedgerPath            string   `json:"ledger_path"`
	RequiredLedgerEntryID string   `json:"required_ledger_entry_id"`
}

// LoadTrackCContractGuard reads and decodes a guard configuration file.
func LoadTrackCContractGuard(path string) (TrackCContractGuard, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return TrackCContractGuard{}, err
	}
	var guard TrackCContractGuard
	if err := json.Unmarshal(raw, &guard); err != nil {
		return TrackCContractGuard{}, err
	}
	return guard, nil
}

// ComputeContractShapeHash returns a deterministic hash over tracked contract files.
func ComputeContractShapeHash(repoRoot string, trackedFiles []string) (string, error) {
	hasher := sha256.New()
	for _, relPath := range trackedFiles {
		relPath = filepath.ToSlash(strings.TrimSpace(relPath))
		if relPath == "" {
			continue
		}
		absPath := filepath.Join(repoRoot, filepath.FromSlash(relPath))
		raw, err := os.ReadFile(absPath)
		if err != nil {
			return "", fmt.Errorf("read tracked file %s: %w", relPath, err)
		}
		_, _ = hasher.Write([]byte(relPath))
		_, _ = hasher.Write([]byte("\n"))
		_, _ = hasher.Write(raw)
		_, _ = hasher.Write([]byte("\n"))
	}
	return hex.EncodeToString(hasher.Sum(nil)), nil
}

// ValidateTrackCContractGuard validates contract hash snapshot and ledger entry requirements.
func ValidateTrackCContractGuard(repoRoot string, guard TrackCContractGuard) ([]string, error) {
	issues := make([]string, 0)
	if len(guard.TrackedFiles) == 0 {
		issues = append(issues, "tracked_files is required")
		return issues, nil
	}
	if strings.TrimSpace(guard.ContractHash) == "" {
		issues = append(issues, "contract_hash is required")
	}
	if strings.TrimSpace(guard.LedgerPath) == "" {
		issues = append(issues, "ledger_path is required")
	}
	if strings.TrimSpace(guard.RequiredLedgerEntryID) == "" {
		issues = append(issues, "required_ledger_entry_id is required")
	}

	computedHash, err := ComputeContractShapeHash(repoRoot, guard.TrackedFiles)
	if err != nil {
		return issues, err
	}
	if strings.TrimSpace(guard.ContractHash) != computedHash {
		issues = append(issues, "contract-shape hash mismatch: update guard snapshot + ledger entry")
	}

	ledgerAbsPath := filepath.Join(repoRoot, filepath.FromSlash(strings.TrimSpace(guard.LedgerPath)))
	ledgerRaw, err := os.ReadFile(ledgerAbsPath)
	if err != nil {
		return issues, err
	}
	ledger := string(ledgerRaw)
	section := resolveLedgerSection(ledger, strings.TrimSpace(guard.RequiredLedgerEntryID))
	if strings.TrimSpace(section) == "" {
		issues = append(issues, "required Track C ledger entry is missing")
		return issues, nil
	}

	requiredMarkers := []string{
		"breaking_change_rationale:",
		"measurable_gain:",
		"impacted_endpoints:",
		"backend_tests:",
		"frontend_tests:",
		"contract_hash: " + computedHash,
	}
	for _, marker := range requiredMarkers {
		if strings.Contains(section, marker) {
			continue
		}
		issues = append(issues, "ledger entry missing required marker: "+marker)
	}

	return issues, nil
}

func resolveLedgerSection(ledger, entryID string) string {
	entryID = strings.TrimSpace(entryID)
	if entryID == "" {
		return ""
	}
	heading := "## " + entryID
	start := strings.Index(ledger, heading)
	if start < 0 {
		return ""
	}
	rest := ledger[start+len(heading):]
	next := strings.Index(rest, "\n## ")
	if next < 0 {
		return ledger[start:]
	}
	return ledger[start : start+len(heading)+next]
}

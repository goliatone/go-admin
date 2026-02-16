package release

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const v2ContractFreezeDateLayout = "2006-01-02"

// V2ContractFreezeGuard defines v2 GA contract freeze guardrails.
type V2ContractFreezeGuard struct {
	TrackedFiles         []string `json:"tracked_files"`
	ContractHash         string   `json:"contract_hash"`
	FreezeDate           string   `json:"freeze_date"`
	ReleaseOwner         string   `json:"release_owner"`
	ExceptionApprovalRef string   `json:"exception_approval_ref"`
	ExceptionApprovedBy  string   `json:"exception_approved_by"`
}

// LoadV2ContractFreezeGuard reads and decodes a v2 contract freeze guard configuration file.
func LoadV2ContractFreezeGuard(path string) (V2ContractFreezeGuard, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return V2ContractFreezeGuard{}, err
	}
	var guard V2ContractFreezeGuard
	if err := json.Unmarshal(raw, &guard); err != nil {
		return V2ContractFreezeGuard{}, err
	}
	return guard, nil
}

// ValidateV2ContractFreezeGuard validates v2 contract freeze snapshot and post-freeze exception rules.
func ValidateV2ContractFreezeGuard(repoRoot string, guard V2ContractFreezeGuard, now time.Time) ([]string, error) {
	issues := make([]string, 0)
	if len(guard.TrackedFiles) == 0 {
		issues = append(issues, "tracked_files is required")
		return issues, nil
	}
	if strings.TrimSpace(guard.ContractHash) == "" {
		issues = append(issues, "contract_hash is required")
	}
	if strings.TrimSpace(guard.FreezeDate) == "" {
		issues = append(issues, "freeze_date is required")
	}
	if strings.TrimSpace(guard.ReleaseOwner) == "" {
		issues = append(issues, "release_owner is required")
	}

	freezeDate, err := time.Parse(v2ContractFreezeDateLayout, strings.TrimSpace(guard.FreezeDate))
	if err != nil {
		issues = append(issues, "freeze_date must use YYYY-MM-DD format")
		return issues, nil
	}
	afterFreeze := !now.Before(freezeDate)

	computedHash, err := ComputeContractShapeHash(repoRoot, guard.TrackedFiles)
	if err != nil {
		return issues, err
	}
	if strings.TrimSpace(guard.ContractHash) != computedHash {
		if afterFreeze {
			if strings.TrimSpace(guard.ExceptionApprovalRef) == "" || strings.TrimSpace(guard.ExceptionApprovedBy) == "" {
				issues = append(issues, "post-freeze contract change blocked: release-owner exception approval is required")
			}
		} else {
			issues = append(issues, "pre-freeze contract-shape hash mismatch: update guard snapshot before freeze")
		}
	}

	if strings.TrimSpace(guard.ExceptionApprovalRef) != "" && strings.TrimSpace(guard.ExceptionApprovedBy) == "" {
		issues = append(issues, "exception_approved_by is required when exception_approval_ref is set")
	}
	if strings.TrimSpace(guard.ExceptionApprovedBy) != "" && strings.TrimSpace(guard.ExceptionApprovalRef) == "" {
		issues = append(issues, "exception_approval_ref is required when exception_approved_by is set")
	}
	return issues, nil
}

// DefaultV2ContractFreezeGuardPath resolves the canonical v2 guard file path.
func DefaultV2ContractFreezeGuardPath(repoRoot string) string {
	return filepath.Join(repoRoot, "examples/esign/release/v2_contract_freeze_guard.json")
}

// FormatV2FreezeDate validates and normalizes YYYY-MM-DD dates.
func FormatV2FreezeDate(value string) (string, error) {
	parsed, err := time.Parse(v2ContractFreezeDateLayout, strings.TrimSpace(value))
	if err != nil {
		return "", fmt.Errorf("invalid freeze date: %w", err)
	}
	return parsed.Format(v2ContractFreezeDateLayout), nil
}

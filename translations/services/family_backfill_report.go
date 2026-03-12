package services

import (
	"encoding/json"
	"os"
	"sort"
)

const BackfillReportSchemaVersionCurrent = 1

type BackfillReportFamily struct {
	ID             string   `json:"id"`
	ContentType    string   `json:"content_type"`
	SourceLocale   string   `json:"source_locale"`
	ReadinessState string   `json:"readiness_state"`
	BlockerCodes   []string `json:"blocker_codes,omitempty"`
}

type BackfillReportSummary struct {
	Families    int `json:"families"`
	Variants    int `json:"variants"`
	Assignments int `json:"assignments"`
	Blockers    int `json:"blockers"`
	Warnings    int `json:"warnings"`
}

type BackfillReport struct {
	SchemaVersion int                    `json:"schema_version"`
	Checksum      string                 `json:"checksum"`
	Summary       BackfillReportSummary  `json:"summary"`
	WarningCounts map[string]int         `json:"warning_counts,omitempty"`
	Families      []BackfillReportFamily `json:"families,omitempty"`
}

func BuildBackfillReport(plan BackfillPlan) BackfillReport {
	report := BackfillReport{
		SchemaVersion: BackfillReportSchemaVersionCurrent,
		Checksum:      plan.Checksum,
		WarningCounts: map[string]int{},
		Families:      make([]BackfillReportFamily, 0, len(plan.Families)),
	}
	for _, family := range plan.Families {
		report.Summary.Families++
		report.Summary.Variants += len(family.Variants)
		report.Summary.Assignments += len(family.Assignments)
		report.Summary.Blockers += len(family.Blockers)
		report.Families = append(report.Families, BackfillReportFamily{
			ID:             family.ID,
			ContentType:    family.ContentType,
			SourceLocale:   family.SourceLocale,
			ReadinessState: family.ReadinessState,
			BlockerCodes:   normalizedStringSlice(family.BlockerCodes),
		})
	}
	for _, warning := range plan.Warnings {
		report.Summary.Warnings++
		code := warning.Code
		if code == "" {
			code = "unknown"
		}
		report.WarningCounts[code]++
	}
	sort.SliceStable(report.Families, func(i, j int) bool {
		return report.Families[i].ID < report.Families[j].ID
	})
	if len(report.WarningCounts) == 0 {
		report.WarningCounts = nil
	}
	return report
}

func WriteBackfillReport(path string, report BackfillReport) error {
	raw, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, raw, 0o644)
}

package services

import (
	"context"
	"fmt"
	"strings"
)

type QualityGateOptions struct {
	MaxAmbiguousSourceWarningRate float64
	OnRollback                    func(context.Context, error) error
}

type QualityGateReport struct {
	Warnings int
	Families int
}

func EvaluateBackfillQualityGates(ctx context.Context, plan BackfillPlan, opts QualityGateOptions) (QualityGateReport, error) {
	report := QualityGateReport{
		Warnings: len(plan.Warnings),
		Families: len(plan.Families),
	}
	if opts.MaxAmbiguousSourceWarningRate <= 0 {
		opts.MaxAmbiguousSourceWarningRate = 0.005
	}

	ambiguousWarnings := 0
	for _, warning := range plan.Warnings {
		if strings.EqualFold(strings.TrimSpace(warning.Code), "ambiguous_source_locale") {
			ambiguousWarnings++
		}
	}
	if report.Families > 0 {
		rate := float64(ambiguousWarnings) / float64(report.Families)
		if rate > opts.MaxAmbiguousSourceWarningRate {
			err := fmt.Errorf("translation backfill quality gate failed: ambiguous source warning rate %.4f exceeds %.4f", rate, opts.MaxAmbiguousSourceWarningRate)
			if opts.OnRollback != nil {
				_ = opts.OnRollback(ctx, err)
			}
			return report, err
		}
	}
	for _, family := range plan.Families {
		seenLocales := map[string]struct{}{}
		for _, variant := range family.Variants {
			locale := strings.TrimSpace(strings.ToLower(variant.Locale))
			if _, ok := seenLocales[locale]; ok {
				err := fmt.Errorf("translation backfill quality gate failed: duplicate locale %s for family %s", locale, family.ID)
				if opts.OnRollback != nil {
					_ = opts.OnRollback(ctx, err)
				}
				return report, err
			}
			seenLocales[locale] = struct{}{}
		}
	}
	return report, nil
}

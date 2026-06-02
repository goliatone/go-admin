package quickstart

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"sort"
	"strings"

	"github.com/goliatone/go-admin/admin"
	"github.com/uptrace/bun"
)

// ScopeDriftRepairCommandName is the quickstart command name for the explicit
// blank-scope repair operation.
const ScopeDriftRepairCommandName = "quickstart.scope_drift.repair"

// ScopeDriftInspector is the small database inspection contract used by
// quickstart diagnostics to find blank tenant/org rows in scoped tables.
type ScopeDriftInspector interface {
	CheckBlankScopeRows(ctx context.Context, table string) (ScopeDriftTableCheck, error)
}

// ScopeDriftRepairer is the mutation contract used by the explicit repair
// command. It must only update allowlisted rows whose tenant/org scope is blank.
type ScopeDriftRepairer interface {
	RepairBlankScopeRows(ctx context.Context, table string, scope ScopeDriftRepairScope) (int, error)
}

// ScopeDriftTableCheck captures one table's blank scope diagnostic result.
type ScopeDriftTableCheck struct {
	Table     string
	Count     int
	Available bool
	Error     string
}

// ScopeDriftRepairScope captures the configured single-tenant defaults used by
// scope drift repair.
type ScopeDriftRepairScope struct {
	TenantID string `json:"tenant_id"`
	OrgID    string `json:"org_id"`
}

// ScopeDriftRepairInput controls the explicit scope drift repair command.
type ScopeDriftRepairInput struct {
	Apply  bool                    `json:"apply"`
	Tables []string                `json:"tables,omitempty"`
	Result *ScopeDriftRepairReport `json:"-"`
}

func (ScopeDriftRepairInput) Type() string { return ScopeDriftRepairCommandName }

func (ScopeDriftRepairInput) Validate() error { return nil }

// ScopeDriftTableRepair captures one table's repair outcome.
type ScopeDriftTableRepair struct {
	Table         string `json:"table"`
	BeforeCount   int    `json:"before_count"`
	AfterCount    int    `json:"after_count"`
	RepairedCount int    `json:"repaired_count"`
	Available     bool   `json:"available"`
	Error         string `json:"error,omitempty"`
}

// ScopeDriftRepairReport summarizes a dry-run or apply repair operation.
type ScopeDriftRepairReport struct {
	DryRun             bool                    `json:"dry_run"`
	Applied            bool                    `json:"applied"`
	ScopeMode          ScopeMode               `json:"scope_mode"`
	DefaultTenantID    string                  `json:"default_tenant_id"`
	DefaultOrgID       string                  `json:"default_org_id"`
	Tables             []ScopeDriftTableRepair `json:"tables"`
	TotalBeforeCount   int                     `json:"total_before_count"`
	TotalAfterCount    int                     `json:"total_after_count"`
	TotalRepairedCount int                     `json:"total_repaired_count"`
}

// ScopeDriftRepairCommand dispatches the explicit quickstart scope repair.
type ScopeDriftRepairCommand struct {
	Config    admin.Config        `json:"config"`
	Inspector ScopeDriftInspector `json:"-"`
	Repairer  ScopeDriftRepairer  `json:"-"`
}

func (c *ScopeDriftRepairCommand) Execute(ctx context.Context, input ScopeDriftRepairInput) error {
	if c == nil {
		return errors.New("scope drift repair command is not configured")
	}
	report, err := RepairScopeDrift(ctx, c.Config, c.Inspector, c.Repairer, input)
	if input.Result != nil {
		*input.Result = report
	}
	return err
}

// BunScopeDriftInspector checks allowlisted scoped tables through Bun.
type BunScopeDriftInspector struct {
	db *bun.DB
}

// NewBunScopeDriftInspector returns a Bun-backed scope drift inspector.
func NewBunScopeDriftInspector(db *bun.DB) *BunScopeDriftInspector {
	return &BunScopeDriftInspector{db: db}
}

var quickstartScopeDriftTables = []string{
	"content_families",
	"locale_variants",
	"family_blockers",
	"translation_assignments",
}

func quickstartDoctorScopeDriftCheck(cfg admin.Config, inspector ScopeDriftInspector) admin.DoctorCheck {
	return admin.DoctorCheck{
		ID:          "quickstart.scope_drift",
		Label:       "Quickstart Scope Drift",
		Description: "Checks single-tenant translation tables for blank tenant/org rows.",
		Help:        "Use this check after enabling single-tenant scope defaults or migrating translation data. Blank scoped rows can remain globally visible unless repaired.",
		Action: admin.NewManualDoctorAction(
			"Run a scope repair dry-run, then backfill blank tenant/org rows to the configured single-tenant defaults.",
			"Review scope repair",
		),
		Run: func(ctx context.Context, _ *admin.Admin) admin.DoctorCheckOutput {
			return quickstartDoctorScopeDriftRun(ctx, cfg, inspector)
		},
	}
}

// RepairScopeDrift runs the explicit single-tenant scope repair. When Apply is
// false it reports affected rows without mutating data.
//
//nolint:gocyclo,nestif // Repair reporting and apply-mode branching are kept together for auditability.
func RepairScopeDrift(ctx context.Context, cfg admin.Config, inspector ScopeDriftInspector, repairer ScopeDriftRepairer, input ScopeDriftRepairInput) (ScopeDriftRepairReport, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	scopeCfg := ScopeConfigFromAdmin(cfg)
	scope := ScopeDriftRepairScope{
		TenantID: strings.TrimSpace(scopeCfg.DefaultTenantID),
		OrgID:    strings.TrimSpace(scopeCfg.DefaultOrgID),
	}
	report := ScopeDriftRepairReport{
		DryRun:          !input.Apply,
		Applied:         input.Apply,
		ScopeMode:       scopeCfg.Mode,
		DefaultTenantID: scope.TenantID,
		DefaultOrgID:    scope.OrgID,
	}
	if scopeCfg.Mode != ScopeModeSingle {
		return report, errors.New("scope drift repair requires single-tenant mode")
	}
	if scope.TenantID == "" || scope.OrgID == "" {
		return report, errors.New("scope drift repair requires configured default tenant_id and org_id")
	}
	if inspector == nil {
		return report, errors.New("scope drift repair requires a scope drift inspector")
	}
	if input.Apply && repairer == nil {
		return report, errors.New("scope drift repair apply requires a scope drift repairer")
	}

	tables, err := normalizeScopeDriftRepairTables(input.Tables)
	if err != nil {
		return report, err
	}
	var errs []error
	for _, table := range tables {
		result := ScopeDriftTableRepair{Table: table}
		before, checkErr := inspector.CheckBlankScopeRows(ctx, table)
		if checkErr != nil {
			errs = append(errs, fmt.Errorf("%s inspect: %w", table, checkErr))
		}
		result.Available = before.Available
		result.Error = strings.TrimSpace(before.Error)
		result.BeforeCount = before.Count
		result.AfterCount = before.Count
		if !before.Available {
			report.Tables = append(report.Tables, result)
			continue
		}
		if checkErr == nil && input.Apply && before.Count > 0 {
			repaired, repairErr := repairer.RepairBlankScopeRows(ctx, table, scope)
			if repairErr != nil {
				errs = append(errs, fmt.Errorf("%s repair: %w", table, repairErr))
				result.Error = repairErr.Error()
			} else {
				result.RepairedCount = repaired
				after, afterErr := inspector.CheckBlankScopeRows(ctx, table)
				if afterErr != nil {
					errs = append(errs, fmt.Errorf("%s recheck: %w", table, afterErr))
					result.Error = afterErr.Error()
				} else {
					result.AfterCount = after.Count
					result.Available = after.Available
					result.Error = strings.TrimSpace(after.Error)
				}
			}
		}
		report.Tables = append(report.Tables, result)
	}
	for _, table := range report.Tables {
		if table.Available {
			report.TotalBeforeCount += table.BeforeCount
			report.TotalAfterCount += table.AfterCount
			report.TotalRepairedCount += table.RepairedCount
		}
	}
	return report, errors.Join(errs...)
}

func quickstartDoctorScopeDriftRun(ctx context.Context, cfg admin.Config, inspector ScopeDriftInspector) admin.DoctorCheckOutput {
	if ctx == nil {
		ctx = context.Background()
	}
	scopeCfg := ScopeConfigFromAdmin(cfg)
	metadata := quickstartScopeDriftBaseMetadata(scopeCfg)
	if scopeCfg.Mode != ScopeModeSingle {
		metadata["skipped"] = true
		metadata["skip_reason"] = "multi_tenant_mode"
		return admin.DoctorCheckOutput{
			Summary:  "Scope drift check skipped for multi-tenant mode",
			Metadata: metadata,
		}
	}
	if inspector == nil {
		metadata["available"] = false
		return admin.DoctorCheckOutput{
			Summary: "Scope drift check unavailable; no inspectable database source is configured",
			Findings: quickstartScopeDriftUnavailableFindings(
				"quickstart.scope_drift.inspector_missing",
				"No inspectable database source is configured for scope drift diagnostics",
				"Wire quickstart.WithScopeDriftInspector or quickstart.NewBunScopeDriftInspector with the quickstart Bun database.",
				nil,
			),
			Metadata: metadata,
		}
	}

	results, err := quickstartScopeDriftInspectTables(ctx, inspector)
	metadata["tables"] = quickstartScopeDriftTableMetadata(results)
	metadata["available"] = quickstartScopeDriftAnyAvailable(results)
	if err != nil {
		return admin.DoctorCheckOutput{
			Summary: "Scope drift check failed",
			Findings: []admin.DoctorFinding{{
				Severity:  admin.DoctorSeverityWarn,
				Code:      "quickstart.scope_drift.inspect_failed",
				Component: "translation.scope",
				Message:   "Failed to inspect scoped translation tables",
				Hint:      "Verify the configured scope drift inspector and database connection before relying on scope diagnostics.",
				Metadata: map[string]any{
					"error": err.Error(),
				},
			}},
			Metadata: metadata,
		}
	}

	findings := quickstartScopeDriftFindings(results)
	if len(findings) == 0 {
		return admin.DoctorCheckOutput{
			Summary:  "No blank scoped rows found in inspectable translation tables",
			Metadata: metadata,
		}
	}
	return admin.DoctorCheckOutput{
		Summary:  quickstartScopeDriftSummary(results),
		Findings: findings,
		Metadata: metadata,
	}
}

func quickstartScopeDriftBaseMetadata(scopeCfg ScopeConfig) map[string]any {
	return map[string]any{
		"scope_mode": string(scopeCfg.Mode),
		"default_scope": map[string]string{
			"tenant_id": strings.TrimSpace(scopeCfg.DefaultTenantID),
			"org_id":    strings.TrimSpace(scopeCfg.DefaultOrgID),
		},
		"inspected_tables": append([]string{}, quickstartScopeDriftTables...),
	}
}

func quickstartScopeDriftInspectTables(ctx context.Context, inspector ScopeDriftInspector) ([]ScopeDriftTableCheck, error) {
	results := make([]ScopeDriftTableCheck, 0, len(quickstartScopeDriftTables))
	var errs []error
	for _, table := range quickstartScopeDriftTables {
		result, err := inspector.CheckBlankScopeRows(ctx, table)
		if err != nil {
			errs = append(errs, fmt.Errorf("%s: %w", table, err))
			result = ScopeDriftTableCheck{
				Table:     table,
				Available: false,
				Error:     err.Error(),
			}
		}
		result.Table = normalizeScopeDriftTable(result.Table)
		if result.Table == "" {
			result.Table = table
		}
		results = append(results, result)
	}
	return results, errors.Join(errs...)
}

func quickstartScopeDriftFindings(results []ScopeDriftTableCheck) []admin.DoctorFinding {
	findings := []admin.DoctorFinding{}
	for _, result := range results {
		table := normalizeScopeDriftTable(result.Table)
		if table == "" {
			table = result.Table
		}
		if !result.Available {
			findings = append(findings, quickstartScopeDriftUnavailableFindings(
				"quickstart.scope_drift.table_unavailable",
				fmt.Sprintf("Scope drift diagnostics could not inspect %q", table),
				"Ensure the table exists and the configured inspector can read scoped translation tables.",
				map[string]any{
					"table": table,
					"error": strings.TrimSpace(result.Error),
				},
			)...)
			continue
		}
		if result.Count <= 0 {
			continue
		}
		findings = append(findings, admin.DoctorFinding{
			Severity:  admin.DoctorSeverityWarn,
			Code:      "quickstart.scope_drift.blank_rows",
			Component: "translation.scope",
			Message:   fmt.Sprintf("%s has %d row(s) with blank tenant/org scope", table, result.Count),
			Hint:      "Run a scope repair dry-run, then backfill blank tenant/org rows to the configured single-tenant defaults.",
			Metadata: map[string]any{
				"table": table,
				"count": result.Count,
			},
		})
	}
	return findings
}

func quickstartScopeDriftUnavailableFindings(code string, message string, hint string, metadata map[string]any) []admin.DoctorFinding {
	return []admin.DoctorFinding{{
		Severity:  admin.DoctorSeverityInfo,
		Code:      strings.TrimSpace(code),
		Component: "translation.scope",
		Message:   strings.TrimSpace(message),
		Hint:      strings.TrimSpace(hint),
		Metadata:  metadata,
	}}
}

func quickstartScopeDriftSummary(results []ScopeDriftTableCheck) string {
	blankTables := 0
	blankRows := 0
	unavailable := 0
	for _, result := range results {
		if !result.Available {
			unavailable++
			continue
		}
		if result.Count > 0 {
			blankTables++
			blankRows += result.Count
		}
	}
	if blankRows > 0 {
		return fmt.Sprintf("Found %d blank scoped row(s) across %d table(s)", blankRows, blankTables)
	}
	if unavailable > 0 {
		return fmt.Sprintf("Scope drift check completed with %d unavailable table(s)", unavailable)
	}
	return "No blank scoped rows found in inspectable translation tables"
}

func quickstartScopeDriftTableMetadata(results []ScopeDriftTableCheck) []map[string]any {
	out := make([]map[string]any, 0, len(results))
	for _, result := range results {
		out = append(out, map[string]any{
			"table":     result.Table,
			"count":     result.Count,
			"available": result.Available,
			"error":     strings.TrimSpace(result.Error),
		})
	}
	return out
}

func quickstartScopeDriftAnyAvailable(results []ScopeDriftTableCheck) bool {
	for _, result := range results {
		if result.Available {
			return true
		}
	}
	return false
}

func registerQuickstartScopeDriftRepairCommand(adm *admin.Admin, cfg admin.Config, options adminOptions) error {
	if adm == nil || options.scopeDriftInspector == nil || options.scopeDriftRepairer == nil {
		return nil
	}
	bus := adm.Commands()
	if _, err := admin.RegisterCommand(bus, &ScopeDriftRepairCommand{
		Config:    cfg,
		Inspector: options.scopeDriftInspector,
		Repairer:  options.scopeDriftRepairer,
	}); err != nil {
		return err
	}
	return admin.RegisterMessageFactory(bus, ScopeDriftRepairCommandName, buildScopeDriftRepairInput)
}

func buildScopeDriftRepairInput(payload map[string]any, _ []string) (ScopeDriftRepairInput, error) {
	input := ScopeDriftRepairInput{}
	if payload == nil {
		return input, nil
	}
	if value, ok := payload["apply"]; ok {
		input.Apply = scopeDriftPayloadBool(value)
	}
	if value, ok := payload["dry_run"]; ok && scopeDriftPayloadBool(value) {
		input.Apply = false
	}
	input.Tables = scopeDriftPayloadStringSlice(payload["tables"])
	if table := strings.TrimSpace(fmt.Sprint(payload["table"])); table != "" && table != "<nil>" {
		input.Tables = append(input.Tables, table)
	}
	return input, nil
}

func normalizeScopeDriftRepairTables(in []string) ([]string, error) {
	if len(in) == 0 {
		return append([]string{}, quickstartScopeDriftTables...), nil
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(in))
	for _, raw := range in {
		table := normalizeScopeDriftTable(raw)
		if table == "" {
			return nil, fmt.Errorf("scope drift repair table %q is not allowlisted", strings.TrimSpace(raw))
		}
		if _, ok := seen[table]; ok {
			continue
		}
		seen[table] = struct{}{}
		out = append(out, table)
	}
	sort.Strings(out)
	return out, nil
}

func scopeDriftPayloadBool(value any) bool {
	switch v := value.(type) {
	case bool:
		return v
	case string:
		switch strings.ToLower(strings.TrimSpace(v)) {
		case "1", "true", "yes", "y", "on", "apply":
			return true
		}
	case int:
		return v != 0
	case int64:
		return v != 0
	case float64:
		return v != 0
	}
	return false
}

func scopeDriftPayloadStringSlice(value any) []string {
	switch v := value.(type) {
	case []string:
		return append([]string{}, v...)
	case []any:
		out := make([]string, 0, len(v))
		for _, item := range v {
			if text := strings.TrimSpace(fmt.Sprint(item)); text != "" && text != "<nil>" {
				out = append(out, text)
			}
		}
		return out
	case string:
		if strings.TrimSpace(v) == "" {
			return nil
		}
		parts := strings.Split(v, ",")
		out := make([]string, 0, len(parts))
		for _, part := range parts {
			if text := strings.TrimSpace(part); text != "" {
				out = append(out, text)
			}
		}
		return out
	default:
		return nil
	}
}

func (i *BunScopeDriftInspector) CheckBlankScopeRows(ctx context.Context, table string) (ScopeDriftTableCheck, error) {
	table = normalizeScopeDriftTable(table)
	if table == "" {
		return ScopeDriftTableCheck{Available: false, Error: "table is not allowlisted"}, nil
	}
	if i == nil || i.db == nil {
		return ScopeDriftTableCheck{Table: table, Available: false, Error: "bun database is not configured"}, nil
	}
	var count int
	err := i.db.NewSelect().
		TableExpr(table).
		ColumnExpr("COUNT(*)").
		Where("(tenant_id IS NULL OR tenant_id = '' OR org_id IS NULL OR org_id = '')").
		Scan(ctx, &count)
	if err != nil {
		if isScopeDriftTableUnavailableError(err) {
			return ScopeDriftTableCheck{Table: table, Available: false, Error: err.Error()}, nil
		}
		return ScopeDriftTableCheck{Table: table, Available: false, Error: err.Error()}, err
	}
	return ScopeDriftTableCheck{Table: table, Count: count, Available: true}, nil
}

func (i *BunScopeDriftInspector) RepairBlankScopeRows(ctx context.Context, table string, scope ScopeDriftRepairScope) (int, error) {
	table = normalizeScopeDriftTable(table)
	if table == "" {
		return 0, errors.New("table is not allowlisted")
	}
	if i == nil || i.db == nil {
		return 0, errors.New("bun database is not configured")
	}
	result, err := i.db.NewUpdate().
		TableExpr(table).
		Set("tenant_id = CASE WHEN tenant_id IS NULL OR tenant_id = '' THEN ? ELSE tenant_id END", strings.TrimSpace(scope.TenantID)).
		Set("org_id = CASE WHEN org_id IS NULL OR org_id = '' THEN ? ELSE org_id END", strings.TrimSpace(scope.OrgID)).
		Where("(tenant_id IS NULL OR tenant_id = '' OR org_id IS NULL OR org_id = '')").
		Exec(ctx)
	if err != nil {
		return 0, err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return 0, err
	}
	return int(affected), nil
}

func normalizeScopeDriftTable(table string) string {
	table = strings.TrimSpace(table)
	if slices.Contains(quickstartScopeDriftTables, table) {
		return table
	}
	return ""
}

func isScopeDriftTableUnavailableError(err error) bool {
	if err == nil {
		return false
	}
	message := strings.ToLower(err.Error())
	return strings.Contains(message, "no such table") ||
		strings.Contains(message, "does not exist") ||
		strings.Contains(message, "undefined_table")
}

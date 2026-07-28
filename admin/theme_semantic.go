package admin

import (
	"maps"
	"sort"
	"strings"

	gotheme "github.com/goliatone/go-theme"
)

// ThemeTokenDiagnostic mirrors go-theme's renderer-neutral token lifecycle
// without changing the legacy view payload shape.
type ThemeTokenDiagnostic struct {
	Token      string `json:"token"`
	Canonical  string `json:"canonical,omitempty"`
	Variable   string `json:"variable,omitempty"`
	Constraint string `json:"constraint,omitempty"`
	Status     string `json:"status"`
	Consumer   string `json:"consumer,omitempty"`
	Reason     string `json:"reason,omitempty"`
}

var adminSemanticTokenSpecs = map[string]gotheme.TokenSpec{
	"admin.shell.background":             {Constraint: gotheme.ConstraintColor},
	"admin.header.background":            {Constraint: gotheme.ConstraintColor},
	"admin.header.border":                {Constraint: gotheme.ConstraintColor},
	"admin.page.gap":                     {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.background":           {Constraint: gotheme.ConstraintColor},
	"admin.sidebar.text":                 {Constraint: gotheme.ConstraintColor},
	"admin.sidebar.text-active":          {Constraint: gotheme.ConstraintColor},
	"admin.sidebar.item-hover":           {Constraint: gotheme.ConstraintColor},
	"admin.sidebar.width":                {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.padding-inline":       {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.padding-block":        {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.item-height":          {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.title-height":         {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.section-gap":          {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.icon-size":            {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.footer-height":        {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.brand-max-height":     {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.brand-max-width":      {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.brand-collapsed-size": {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.brand-align":          {Constraint: gotheme.ConstraintAlignment},
	"datagrid.header.background":         {Constraint: gotheme.ConstraintColor},
	"datagrid.header.text":               {Constraint: gotheme.ConstraintColor},
	"datagrid.row.background":            {Constraint: gotheme.ConstraintColor},
	"datagrid.row.hover":                 {Constraint: gotheme.ConstraintColor},
	"datagrid.row.selected":              {Constraint: gotheme.ConstraintColor},
	"datagrid.border":                    {Constraint: gotheme.ConstraintColor},
	"datagrid.empty.text":                {Constraint: gotheme.ConstraintColor},
	"datagrid.pagination.text":           {Constraint: gotheme.ConstraintColor},
	"form.control.background":            {Constraint: gotheme.ConstraintColor},
	"form.control.text":                  {Constraint: gotheme.ConstraintColor},
	"form.control.border":                {Constraint: gotheme.ConstraintColor},
	"form.control.border-focus":          {Constraint: gotheme.ConstraintColor},
	"form.control.placeholder":           {Constraint: gotheme.ConstraintColor},
	"form.control.disabled-background":   {Constraint: gotheme.ConstraintColor},
	"form.control.disabled-text":         {Constraint: gotheme.ConstraintColor},
	"form.control.invalid-border":        {Constraint: gotheme.ConstraintColor},
	"form.control.height":                {Constraint: gotheme.ConstraintNonnegativeLength},
	"form.control.radius":                {Constraint: gotheme.ConstraintNonnegativeLength},
	"form.label.text":                    {Constraint: gotheme.ConstraintColor},
	"form.help.text":                     {Constraint: gotheme.ConstraintColor},
	"form.error.text":                    {Constraint: gotheme.ConstraintColor},
	"dashboard.surface":                  {Constraint: gotheme.ConstraintColor},
	"dashboard.card.background":          {Constraint: gotheme.ConstraintColor},
	"dashboard.card.border":              {Constraint: gotheme.ConstraintColor},
	"dashboard.card.radius":              {Constraint: gotheme.ConstraintNonnegativeLength},
	"dashboard.card.shadow":              {Constraint: gotheme.ConstraintShadow},
	"dashboard.metric.label":             {Constraint: gotheme.ConstraintColor},
	"dashboard.metric.value":             {Constraint: gotheme.ConstraintColor},
	"dashboard.metric.trend-positive":    {Constraint: gotheme.ConstraintColor},
	"dashboard.metric.trend-negative":    {Constraint: gotheme.ConstraintColor},
	"dashboard.chart.axis":               {Constraint: gotheme.ConstraintColor},
	"dashboard.chart.grid":               {Constraint: gotheme.ConstraintColor},
	"dashboard.chart.tooltip-surface":    {Constraint: gotheme.ConstraintColor},
	"dashboard.chart.tooltip-text":       {Constraint: gotheme.ConstraintColor},
}

var adminSemanticAliases = map[string]string{
	"sidebar-width":                "admin.sidebar.width",
	"sidebar-padding-x":            "admin.sidebar.padding-inline",
	"sidebar-padding-y":            "admin.sidebar.padding-block",
	"sidebar-item-height":          "admin.sidebar.item-height",
	"sidebar-title-height":         "admin.sidebar.title-height",
	"sidebar-gap-sections":         "admin.sidebar.section-gap",
	"sidebar-icon-size":            "admin.sidebar.icon-size",
	"sidebar-footer-height":        "admin.sidebar.footer-height",
	"sidebar-brand-max-height":     "admin.sidebar.brand-max-height",
	"sidebar-brand-max-width":      "admin.sidebar.brand-max-width",
	"sidebar-brand-collapsed-size": "admin.sidebar.brand-collapsed-size",
	"sidebar-brand-align":          "admin.sidebar.brand-align",
}

var adminLegacyRootVariables = map[string]string{
	"primary":                      "--color-primary",
	"accent":                       "--color-accent",
	"surface":                      "--color-surface",
	"sidebar-width":                "--sidebar-width",
	"sidebar-padding-x":            "--sidebar-padding-x",
	"sidebar-padding-y":            "--sidebar-padding-y",
	"sidebar-item-height":          "--sidebar-item-height",
	"sidebar-title-height":         "--sidebar-title-height",
	"sidebar-gap-sections":         "--sidebar-gap-sections",
	"sidebar-icon-size":            "--sidebar-icon-size",
	"sidebar-footer-height":        "--sidebar-footer-height",
	"sidebar-brand-max-height":     "--sidebar-brand-max-height",
	"sidebar-brand-max-width":      "--sidebar-brand-max-width",
	"sidebar-brand-collapsed-size": "--sidebar-brand-collapsed-size",
	"sidebar-brand-align":          "--sidebar-brand-align",
}

var adminConsumedSemanticTokens = map[string]struct{}{
	"admin.shell.background":             {},
	"admin.header.background":            {},
	"admin.header.border":                {},
	"admin.page.gap":                     {},
	"admin.sidebar.background":           {},
	"admin.sidebar.text":                 {},
	"admin.sidebar.text-active":          {},
	"admin.sidebar.item-hover":           {},
	"admin.sidebar.width":                {},
	"admin.sidebar.padding-inline":       {},
	"admin.sidebar.padding-block":        {},
	"admin.sidebar.item-height":          {},
	"admin.sidebar.section-gap":          {},
	"admin.sidebar.icon-size":            {},
	"admin.sidebar.footer-height":        {},
	"admin.sidebar.brand-max-height":     {},
	"admin.sidebar.brand-max-width":      {},
	"admin.sidebar.brand-collapsed-size": {},
	"admin.sidebar.brand-align":          {},
	"datagrid.header.background":         {},
	"datagrid.header.text":               {},
	"datagrid.row.background":            {},
	"datagrid.row.hover":                 {},
	"datagrid.row.selected":              {},
	"datagrid.border":                    {},
	"datagrid.empty.text":                {},
	"datagrid.pagination.text":           {},
	"color.surface.canvas":               {},
	"color.surface.default":              {},
	"color.surface.subtle":               {},
	"color.surface.raised":               {},
	"color.text.primary":                 {},
	"color.text.secondary":               {},
	"color.text.inverse":                 {},
	"color.border.default":               {},
	"color.focus.ring":                   {},
	"color.action.primary":               {},
	"color.action.primary-hover":         {},
	"color.status.success":               {},
	"color.status.warning":               {},
	"color.status.danger":                {},
	"color.status.info":                  {},
	"font.family.body":                   {},
	"font.family.heading":                {},
	"font.size.body":                     {},
	"font.weight.body":                   {},
	"font.weight.emphasis":               {},
	"line.height.body":                   {},
	"letter.spacing.body":                {},
	"space.surface":                      {},
	"space.stack":                        {},
	"size.control.height":                {},
	"radius.control":                     {},
	"radius.surface":                     {},
	"shadow.surface":                     {},
}

// AdminSemanticProfile returns the portable semantic profile extended with
// the package tokens transported or consumed by go-admin.
func AdminSemanticProfile() gotheme.TokenProfile {
	profile := gotheme.PortableSemanticProfile()
	profile.Name = "go-admin"
	maps.Copy(profile.Tokens, adminSemanticTokenSpecs)
	maps.Copy(profile.Aliases, adminSemanticAliases)
	return profile
}

func normalizeThemeProjection(selection *ThemeSelection) *ThemeSelection {
	if selection == nil {
		return nil
	}

	selection.CSSVars = safeExplicitCSSVariables(selection.CSSVars)

	profile := AdminSemanticProfile()
	projection := gotheme.ProjectCSSVariables(selection.Tokens, gotheme.ProjectionOptions{Profile: &profile})
	semantic := map[string]string{}
	root := map[string]string{}
	for _, diagnostic := range projection.Diagnostics {
		if diagnostic.Status != gotheme.TokenResolved {
			continue
		}
		if _, approved := profile.Tokens[diagnostic.Canonical]; !approved {
			continue
		}
		value, projected := projection.Variables[diagnostic.Variable]
		if !projected {
			continue
		}
		semantic[diagnostic.Canonical] = value
		root[diagnostic.Variable] = value
	}
	for alias, variable := range adminLegacyRootVariables {
		canonical := profile.Aliases[alias]
		if _, canonicalPresent := selection.Tokens[canonical]; canonicalPresent {
			continue
		}
		value, present := selection.Tokens[alias]
		if !present {
			continue
		}
		safe := gotheme.ProjectCSSVariables(
			map[string]string{alias: value},
			gotheme.ProjectionOptions{Profile: &profile},
		)
		for _, diagnostic := range safe.Diagnostics {
			if diagnostic.Status != gotheme.TokenResolved {
				continue
			}
			if projected, ok := safe.Variables[diagnostic.Variable]; ok {
				root[variable] = projected
			}
			break
		}
	}

	selection.SemanticTokens = nilIfEmpty(semantic)
	selection.RootCSSVarsInline = serializeCSSVariables(root)
	selection.Diagnostics = appendAdminConsumerDiagnostics(
		convertThemeDiagnostics(projection.Diagnostics),
		semantic,
	)
	return selection
}

func appendAdminConsumerDiagnostics(diagnostics []ThemeTokenDiagnostic, semantic map[string]string) []ThemeTokenDiagnostic {
	if len(semantic) == 0 {
		return diagnostics
	}
	keys := make([]string, 0, len(semantic))
	for token := range semantic {
		keys = append(keys, token)
	}
	sort.Strings(keys)
	for _, token := range keys {
		status := gotheme.TokenUnused
		if _, consumed := adminConsumedSemanticTokens[token]; consumed {
			status = gotheme.TokenConsumed
		}
		diagnostics = append(diagnostics, ThemeTokenDiagnostic{
			Token:     token,
			Canonical: token,
			Variable:  semanticCSSVariable(token),
			Status:    string(status),
			Consumer:  "go-admin/client",
		})
	}
	return diagnostics
}

func semanticCSSVariable(token string) string {
	return "--" + strings.NewReplacer(".", "-", "_", "-").Replace(strings.TrimSpace(token))
}

func safeExplicitCSSVariables(values map[string]string) map[string]string {
	if len(values) == 0 {
		return nil
	}
	out := map[string]string{}
	for variable, value := range values {
		variable = strings.TrimSpace(variable)
		if !strings.HasPrefix(variable, "--") {
			continue
		}
		token := strings.TrimPrefix(variable, "--")
		projection := gotheme.ProjectCSSVariables(map[string]string{token: value}, gotheme.ProjectionOptions{})
		if projected, ok := projection.Variables[variable]; ok {
			out[variable] = projected
		}
	}
	return nilIfEmpty(out)
}

func serializeCSSVariables(values map[string]string) string {
	if len(values) == 0 {
		return ""
	}
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	var out strings.Builder
	for _, key := range keys {
		out.WriteString(key)
		out.WriteByte(':')
		out.WriteString(values[key])
		out.WriteByte(';')
	}
	return out.String()
}

func convertThemeDiagnostics(diagnostics []gotheme.TokenDiagnostic) []ThemeTokenDiagnostic {
	if len(diagnostics) == 0 {
		return nil
	}
	out := make([]ThemeTokenDiagnostic, 0, len(diagnostics))
	for _, diagnostic := range diagnostics {
		out = append(out, ThemeTokenDiagnostic{
			Token:      diagnostic.Token,
			Canonical:  diagnostic.Canonical,
			Variable:   diagnostic.Variable,
			Constraint: string(diagnostic.Constraint),
			Status:     string(diagnostic.Status),
			Consumer:   diagnostic.Consumer,
			Reason:     diagnostic.Reason,
		})
	}
	return out
}

func cloneThemeDiagnostics(src []ThemeTokenDiagnostic) []ThemeTokenDiagnostic {
	if len(src) == 0 {
		return nil
	}
	return append([]ThemeTokenDiagnostic(nil), src...)
}

func nilIfEmpty(values map[string]string) map[string]string {
	if len(values) == 0 {
		return nil
	}
	return values
}

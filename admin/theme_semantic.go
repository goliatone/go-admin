package admin

import (
	"maps"
	"sort"
	"strings"

	formgenrender "github.com/goliatone/go-formgen/pkg/render"
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
	"admin.shell.background":                         {Constraint: gotheme.ConstraintColor},
	"admin.header.background":                        {Constraint: gotheme.ConstraintColor},
	"admin.header.border":                            {Constraint: gotheme.ConstraintColor},
	"admin.header.height":                            {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.page.gap":                                 {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.background":                       {Constraint: gotheme.ConstraintColor},
	"admin.sidebar.border":                           {Constraint: gotheme.ConstraintColor},
	"admin.sidebar.text":                             {Constraint: gotheme.ConstraintColor},
	"admin.sidebar.text-active":                      {Constraint: gotheme.ConstraintColor},
	"admin.sidebar.item-hover":                       {Constraint: gotheme.ConstraintColor},
	"admin.sidebar.width":                            {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.padding-inline":                   {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.padding-block":                    {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.header-padding-block-start":       {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.header-padding-block-end":         {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.item-height":                      {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.item-content-gap":                 {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.item-radius":                      {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.item-stack-gap":                   {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.nested-indent":                    {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.nested-branch-offset":             {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.nested-item-block-inset":          {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.nested-item-inset":                {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.nested-item-padding-inline-start": {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.utility-padding-block-start":      {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.utility-padding-block-end":        {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.title-height":                     {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.section-gap":                      {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.icon-size":                        {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.footer-height":                    {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.brand-max-height":                 {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.brand-max-width":                  {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.brand-collapsed-size":             {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.brand-align":                      {Constraint: gotheme.ConstraintAlignment},
	"admin.sidebar.user-avatar-size":                 {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.user-content-gap":                 {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.user-footer-padding-block-start":  {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.user-footer-padding-block-end":    {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.user-name-font-size":              {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.sidebar.user-name-line-height":            {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.modal.surface":                            {Constraint: gotheme.ConstraintColor},
	"admin.modal.text":                               {Constraint: gotheme.ConstraintColor},
	"admin.modal.border":                             {Constraint: gotheme.ConstraintColor},
	"admin.modal.backdrop":                           {Constraint: gotheme.ConstraintColor},
	"admin.modal.radius":                             {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.modal.shadow":                             {Constraint: gotheme.ConstraintShadow},
	"admin.modal.padding-block":                      {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.modal.padding-inline":                     {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.modal.viewport-padding":                   {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.modal.max-height":                         {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.modal.width":                              {Constraint: gotheme.ConstraintNonnegativeLength},
	"admin.action-menu.surface":                      {Constraint: gotheme.ConstraintColor},
	"admin.action-menu.text":                         {Constraint: gotheme.ConstraintColor},
	"admin.action-menu.border":                       {Constraint: gotheme.ConstraintColor},
	"admin.status.surface":                           {Constraint: gotheme.ConstraintColor},
	"admin.status.text":                              {Constraint: gotheme.ConstraintColor},
	"admin.status.border":                            {Constraint: gotheme.ConstraintColor},
	"admin.filter.surface":                           {Constraint: gotheme.ConstraintColor},
	"admin.filter.text":                              {Constraint: gotheme.ConstraintColor},
	"admin.filter.border":                            {Constraint: gotheme.ConstraintColor},
	"admin.quick-filter.surface":                     {Constraint: gotheme.ConstraintColor},
	"admin.quick-filter.text":                        {Constraint: gotheme.ConstraintColor},
	"admin.quick-filter.ring":                        {Constraint: gotheme.ConstraintColor},
	"datagrid.header.background":                     {Constraint: gotheme.ConstraintColor},
	"datagrid.header.text":                           {Constraint: gotheme.ConstraintColor},
	"datagrid.row.background":                        {Constraint: gotheme.ConstraintColor},
	"datagrid.row.hover":                             {Constraint: gotheme.ConstraintColor},
	"datagrid.row.selected":                          {Constraint: gotheme.ConstraintColor},
	"datagrid.row.selected-text":                     {Constraint: gotheme.ConstraintColor},
	"datagrid.border":                                {Constraint: gotheme.ConstraintColor},
	"datagrid.empty.text":                            {Constraint: gotheme.ConstraintColor},
	"datagrid.pagination.text":                       {Constraint: gotheme.ConstraintColor},
	"datagrid.pagination.control-background":         {Constraint: gotheme.ConstraintColor},
	"datagrid.pagination.control-border":             {Constraint: gotheme.ConstraintColor},
	"datagrid.pagination.control-text":               {Constraint: gotheme.ConstraintColor},
	"datagrid.pagination.page-text":                  {Constraint: gotheme.ConstraintColor},
	"datagrid.pagination.active-background":          {Constraint: gotheme.ConstraintColor},
	"datagrid.pagination.active-border":              {Constraint: gotheme.ConstraintColor},
	"datagrid.pagination.active-text":                {Constraint: gotheme.ConstraintColor},
	"datagrid.pagination.active-shadow":              {Constraint: gotheme.ConstraintShadow},
	"datagrid.pagination.hover-background":           {Constraint: gotheme.ConstraintColor},
	"datagrid.pagination.hover-border":               {Constraint: gotheme.ConstraintColor},
	"datagrid.pagination.hover-text":                 {Constraint: gotheme.ConstraintColor},
	"datagrid.pagination.focus-background":           {Constraint: gotheme.ConstraintColor},
	"datagrid.pagination.focus-border":               {Constraint: gotheme.ConstraintColor},
	"datagrid.pagination.focus-text":                 {Constraint: gotheme.ConstraintColor},
	"datagrid.pagination.disabled-background":        {Constraint: gotheme.ConstraintColor},
	"datagrid.pagination.disabled-border":            {Constraint: gotheme.ConstraintColor},
	"datagrid.pagination.disabled-text":              {Constraint: gotheme.ConstraintColor},
	"datagrid.pagination.disabled-opacity":           {Constraint: gotheme.ConstraintNumber},
	"datagrid.pagination.radius":                     {Constraint: gotheme.ConstraintNonnegativeLength},
	"datagrid.pagination.control-height":             {Constraint: gotheme.ConstraintNonnegativeLength},
	"datagrid.pagination.page-width":                 {Constraint: gotheme.ConstraintNonnegativeLength},
	"datagrid.pagination.gap":                        {Constraint: gotheme.ConstraintNonnegativeLength},
	"datagrid.pagination.padding-inline":             {Constraint: gotheme.ConstraintNonnegativeLength},
	"datagrid.pagination.font-size":                  {Constraint: gotheme.ConstraintNonnegativeLength},
	"datagrid.pagination.line-height":                {Constraint: gotheme.ConstraintNonnegativeLength},
	"datagrid.pagination.font-weight":                {Constraint: gotheme.ConstraintFontWeight},
	"datagrid.pagination.ellipsis-size":              {Constraint: gotheme.ConstraintNonnegativeLength},
	"dashboard.surface":                              {Constraint: gotheme.ConstraintColor},
	"dashboard.card.background":                      {Constraint: gotheme.ConstraintColor},
	"dashboard.card.border":                          {Constraint: gotheme.ConstraintColor},
	"dashboard.card.radius":                          {Constraint: gotheme.ConstraintNonnegativeLength},
	"dashboard.card.shadow":                          {Constraint: gotheme.ConstraintShadow},
	"dashboard.metric.label":                         {Constraint: gotheme.ConstraintColor},
	"dashboard.metric.value":                         {Constraint: gotheme.ConstraintColor},
	"dashboard.metric.trend-positive":                {Constraint: gotheme.ConstraintColor},
	"dashboard.metric.trend-negative":                {Constraint: gotheme.ConstraintColor},
	"dashboard.chart.axis":                           {Constraint: gotheme.ConstraintColor},
	"dashboard.chart.grid":                           {Constraint: gotheme.ConstraintColor},
	"dashboard.chart.tooltip-surface":                {Constraint: gotheme.ConstraintColor},
	"dashboard.chart.tooltip-text":                   {Constraint: gotheme.ConstraintColor},
}

var adminSemanticAliases = map[string]string{
	"sidebar-width":                "admin.sidebar.width",
	"sidebar-padding-x":            "admin.sidebar.padding-inline",
	"sidebar-padding-y":            "admin.sidebar.padding-block",
	"sidebar-item-height":          "admin.sidebar.item-height",
	"sidebar-item-content-gap":     "admin.sidebar.item-content-gap",
	"sidebar-item-radius":          "admin.sidebar.item-radius",
	"sidebar-item-stack-gap":       "admin.sidebar.item-stack-gap",
	"sidebar-nested-indent":        "admin.sidebar.nested-indent",
	"sidebar-title-height":         "admin.sidebar.title-height",
	"sidebar-gap-sections":         "admin.sidebar.section-gap",
	"sidebar-icon-size":            "admin.sidebar.icon-size",
	"sidebar-footer-height":        "admin.sidebar.footer-height",
	"sidebar-brand-max-height":     "admin.sidebar.brand-max-height",
	"sidebar-brand-max-width":      "admin.sidebar.brand-max-width",
	"sidebar-brand-collapsed-size": "admin.sidebar.brand-collapsed-size",
	"sidebar-brand-align":          "admin.sidebar.brand-align",
	"sidebar-user-avatar-size":     "admin.sidebar.user-avatar-size",
}

var adminLegacyRootVariables = map[string]string{
	"primary":                      "--color-primary",
	"accent":                       "--color-accent",
	"surface":                      "--color-surface",
	"sidebar-width":                "--sidebar-width",
	"sidebar-padding-x":            "--sidebar-padding-x",
	"sidebar-padding-y":            "--sidebar-padding-y",
	"sidebar-item-height":          "--sidebar-item-height",
	"sidebar-item-content-gap":     "--sidebar-item-content-gap",
	"sidebar-item-radius":          "--sidebar-item-radius",
	"sidebar-item-stack-gap":       "--sidebar-item-stack-gap",
	"sidebar-nested-indent":        "--sidebar-nested-indent",
	"sidebar-title-height":         "--sidebar-title-height",
	"sidebar-gap-sections":         "--sidebar-gap-sections",
	"sidebar-icon-size":            "--sidebar-icon-size",
	"sidebar-footer-height":        "--sidebar-footer-height",
	"sidebar-brand-max-height":     "--sidebar-brand-max-height",
	"sidebar-brand-max-width":      "--sidebar-brand-max-width",
	"sidebar-brand-collapsed-size": "--sidebar-brand-collapsed-size",
	"sidebar-brand-align":          "--sidebar-brand-align",
	"sidebar-user-avatar-size":     "--sidebar-user-avatar-size",
}

// adminSemanticConsumerChains mirror the concrete CSS/template fallback order.
// The first resolved token in each chain is the value that the client actually
// uses. Single-token chains represent direct consumers that are not shadowed by
// a package-specific token.
var adminSemanticConsumerChains = [][]string{
	{"admin.shell.background", "color.surface.canvas"},
	{"admin.header.background", "color.surface.default"},
	{"admin.header.border", "color.border.default"},
	{"admin.header.height"},
	{"admin.page.gap", "space.stack"},
	{"admin.sidebar.background", "color.surface.default"},
	{"admin.sidebar.border", "color.border.default"},
	{"admin.sidebar.text", "color.text.primary"},
	{"admin.sidebar.text-active", "color.text.inverse"},
	{"admin.sidebar.item-hover", "color.surface.subtle"},
	{"admin.sidebar.width"},
	{"admin.sidebar.padding-inline", "space.surface"},
	{"admin.sidebar.padding-block", "space.surface"},
	{"admin.sidebar.header-padding-block-start", "admin.sidebar.padding-block", "space.surface"},
	{"admin.sidebar.header-padding-block-end", "admin.sidebar.padding-block", "space.surface"},
	{"admin.sidebar.item-height", "size.control.height"},
	{"admin.sidebar.item-content-gap"},
	{"admin.sidebar.item-radius", "radius.control"},
	{"admin.sidebar.item-stack-gap"},
	{"admin.sidebar.nested-indent"},
	{"admin.sidebar.nested-branch-offset"},
	{"admin.sidebar.nested-item-block-inset"},
	{"admin.sidebar.nested-item-inset"},
	{"admin.sidebar.nested-item-padding-inline-start", "admin.sidebar.padding-inline", "space.surface"},
	{"admin.sidebar.utility-padding-block-start", "admin.sidebar.padding-block", "space.surface"},
	{"admin.sidebar.utility-padding-block-end", "admin.sidebar.padding-block", "space.surface"},
	{"admin.sidebar.section-gap", "space.stack"},
	{"admin.sidebar.icon-size"},
	{"admin.sidebar.footer-height"},
	{"admin.sidebar.brand-max-height"},
	{"admin.sidebar.brand-max-width"},
	{"admin.sidebar.brand-collapsed-size"},
	{"admin.sidebar.brand-align"},
	{"admin.sidebar.user-avatar-size"},
	{"admin.sidebar.user-content-gap", "admin.sidebar.item-content-gap"},
	{"admin.sidebar.user-footer-padding-block-start", "admin.sidebar.padding-block", "space.surface"},
	{"admin.sidebar.user-footer-padding-block-end", "admin.sidebar.padding-block", "space.surface"},
	{"admin.sidebar.user-name-font-size", "font.size.body"},
	{"admin.sidebar.user-name-line-height"},
	{"admin.modal.surface", "color.surface.raised"},
	{"admin.modal.text", "color.text.primary"},
	{"admin.modal.border", "color.border.default"},
	{"admin.modal.backdrop", "color.text.primary"},
	{"admin.modal.radius", "radius.surface"},
	{"admin.modal.shadow", "shadow.surface"},
	{"admin.modal.padding-block", "space.surface"},
	{"admin.modal.padding-inline", "space.surface"},
	{"admin.modal.viewport-padding", "space.surface"},
	{"admin.modal.max-height"},
	{"admin.modal.width"},
	{"admin.action-menu.surface", "color.surface.raised"},
	{"admin.action-menu.text", "color.text.primary"},
	{"admin.action-menu.border", "color.border.default"},
	{"admin.status.surface", "color.surface.subtle"},
	{"admin.status.text", "color.text.primary"},
	{"admin.status.border", "color.border.default"},
	{"admin.filter.surface", "color.surface.default"},
	{"admin.filter.text", "color.text.primary"},
	{"admin.filter.border", "color.border.default"},
	{"admin.quick-filter.surface", "color.surface.subtle"},
	{"admin.quick-filter.text", "color.text.primary"},
	{"admin.quick-filter.ring", "color.focus.ring"},
	{"datagrid.header.background", "color.surface.subtle"},
	{"datagrid.header.text", "color.text.secondary"},
	{"datagrid.row.background", "color.surface.default"},
	{"datagrid.row.hover", "color.surface.subtle"},
	{"datagrid.row.selected", "color.action.primary"},
	{"datagrid.row.selected-text", "color.text.inverse"},
	{"datagrid.border", "color.border.default"},
	{"datagrid.empty.text", "color.text.secondary"},
	{"datagrid.pagination.text", "color.text.secondary"},
	{"datagrid.pagination.control-background", "color.surface.default"},
	{"datagrid.pagination.control-border", "datagrid.border", "color.border.default"},
	{"datagrid.pagination.control-text", "datagrid.pagination.text", "color.text.secondary"},
	{"datagrid.pagination.page-text", "datagrid.pagination.text", "color.text.secondary"},
	{"datagrid.pagination.active-background", "datagrid.row.selected", "color.action.primary"},
	{"datagrid.pagination.active-border", "datagrid.border", "color.border.default"},
	{"datagrid.pagination.active-text", "color.text.inverse"},
	{"datagrid.pagination.active-shadow"},
	{"datagrid.pagination.hover-background", "color.surface.subtle"},
	{"datagrid.pagination.hover-border", "datagrid.pagination.control-border", "datagrid.border", "color.border.default"},
	{"datagrid.pagination.hover-text", "datagrid.pagination.page-text", "datagrid.pagination.text", "color.text.secondary"},
	{"datagrid.pagination.focus-background", "datagrid.pagination.hover-background", "color.surface.subtle"},
	{"datagrid.pagination.focus-border", "color.focus.ring", "datagrid.pagination.control-border", "color.border.default"},
	{"datagrid.pagination.focus-text", "datagrid.pagination.hover-text", "datagrid.pagination.page-text", "color.text.secondary"},
	{"datagrid.pagination.disabled-background", "datagrid.pagination.control-background", "color.surface.default"},
	{"datagrid.pagination.disabled-border", "datagrid.pagination.control-border", "datagrid.border", "color.border.default"},
	{"datagrid.pagination.disabled-text", "color.text.secondary"},
	{"datagrid.pagination.disabled-opacity"},
	{"datagrid.pagination.radius", "radius.control"},
	{"datagrid.pagination.control-height", "size.control.height"},
	{"datagrid.pagination.page-width"},
	{"datagrid.pagination.gap"},
	{"datagrid.pagination.padding-inline"},
	{"datagrid.pagination.font-size", "font.size.body"},
	{"datagrid.pagination.line-height", "line.height.body"},
	{"datagrid.pagination.font-weight", "font.weight.emphasis"},
	{"datagrid.pagination.ellipsis-size"},
	{formgenrender.FormContainerMaxWidthToken},
	{"form.control.background", "color.surface.default"},
	{"form.control.text", "color.text.primary"},
	{"form.control.border", "color.border.default"},
	{"form.control.placeholder", "color.text.secondary"},
	{"form.control.disabled-background", "color.surface.subtle"},
	{"form.control.disabled-text", "color.text.secondary"},
	{"form.control.radius", "radius.control"},
	{"color.surface.default"},
	{"color.surface.subtle"},
	{"color.surface.raised"},
	{"color.text.primary"},
	{"color.text.secondary"},
	{"color.text.inverse"},
	{"color.border.default"},
	{"color.focus.ring"},
	{"color.action.primary"},
	{"color.action.primary-hover"},
	{"color.status.success"},
	{"color.status.warning"},
	{"color.status.danger"},
	{"color.status.info"},
	{"font.family.body"},
	{"font.family.heading", "font.family.body"},
	{"font.size.body"},
	{"font.size.heading", "font.size.body"},
	{"font.weight.body"},
	{"font.weight.emphasis"},
	{"font.weight.heading", "font.weight.emphasis"},
	{"line.height.body"},
	{"line.height.heading"},
	{"letter.spacing.body"},
	{"letter.spacing.heading", "letter.spacing.body"},
	{"radius.surface"},
	{"shadow.surface"},
}

// AdminSemanticProfile returns the portable semantic profile extended with
// the package tokens transported or consumed by go-admin.
func AdminSemanticProfile() gotheme.TokenProfile {
	profile := gotheme.PortableSemanticProfile()
	profile.Name = "go-admin"
	maps.Copy(profile.Tokens, adminSemanticTokenSpecs)
	maps.Copy(profile.Aliases, adminSemanticAliases)
	for token, spec := range formgenrender.FormSemanticTokenSpecs() {
		profile.Tokens[token] = gotheme.TokenSpec{
			Constraint: gotheme.ValueConstraint(spec.Constraint),
		}
		for _, alias := range spec.Aliases {
			profile.Aliases[alias] = token
		}
	}
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
	consumedTokens := consumedAdminSemanticTokens(semantic)
	keys := make([]string, 0, len(semantic))
	for token := range semantic {
		keys = append(keys, token)
	}
	sort.Strings(keys)
	for _, token := range keys {
		status := gotheme.TokenUnused
		if _, consumed := consumedTokens[token]; consumed {
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

func consumedAdminSemanticTokens(semantic map[string]string) map[string]struct{} {
	consumed := map[string]struct{}{}
	for _, chain := range adminSemanticConsumerChains {
		for _, token := range chain {
			if _, resolved := semantic[token]; !resolved {
				continue
			}
			consumed[token] = struct{}{}
			break
		}
	}
	return consumed
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

package client

import (
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

type customizationSurfaceEntry struct {
	tier                string
	owner               string
	source              string
	consumers           []string
	rootClass           string
	behaviorSelectors   []string
	semanticVariables   []string
	accessibility       string
	delivery            string
	overridePolicy      string
	compatibilityPolicy string
}

type compatibilitySurfaceEntry struct {
	source           string
	replacement      string
	removalRelease   string
	removalCondition string
}

var retainedCompatibilitySurfaces = map[string]compatibilitySurfaceEntry{
	"admin-page-header-partial": {
		source: "templates/partials/admin-page-header.html", replacement: "layout.html page-header blocks",
		removalRelease: "v0.133.0", removalCondition: "repository and downstream template-usage audit reports no includes",
	},
	"admin-page-heading-partial": {
		source: "templates/partials/admin-page-heading.html", replacement: "layout.html page-title blocks",
		removalRelease: "v0.133.0", removalCondition: "repository and downstream template-usage audit reports no includes",
	},
	"datagrid-action-classes": {
		source: "assets/src/styles/components.css", replacement: "action-menu BEM anatomy and data hooks",
		removalRelease: "v0.133.0", removalCondition: "repository and downstream DOM/CSS usage audit reports no legacy selectors",
	},
	"status-badge-class": {
		source: "assets/src/styles/components.css", replacement: "status-chip anatomy and status vocabulary",
		removalRelease: "v0.133.0", removalCondition: "repository and downstream DOM/CSS usage audit reports no status-badge selectors",
	},
}

// customizationSurfaceInventory is the executable support/ownership catalog
// for authenticated shell and reusable component surfaces. Documentation may
// describe these entries in more detail, but changes to ownership or support
// tier must update this inventory and its source assertions deliberately.
var customizationSurfaceInventory = map[string]customizationSurfaceEntry{
	"authenticated-shell": {
		tier: "canonical-shell", owner: "go-admin", source: "templates/layout.html",
		consumers: []string{"crud", "content", "activity", "feature-flags", "media", "translations", "dashboard"},
	},
	"sidebar": {
		tier: "bounded-structural-partial", owner: "go-admin", source: "templates/partials/sidebar.html",
		consumers: []string{"authenticated-shell"},
	},
	"breadcrumbs": {
		tier: "bounded-structural-partial", owner: "go-admin", source: "templates/partials/breadcrumbs.html",
		consumers: []string{"authenticated-shell"},
	},
	"footer": {
		tier: "bounded-structural-partial", owner: "go-admin", source: "templates/partials/admin-footer.html",
		consumers: []string{"authenticated-shell"},
	},
	"modal": {
		tier: "public-browser-component", owner: "go-admin-client", source: "assets/src/shared/modal.ts",
		consumers: []string{"embedded-admin", "browser-package"},
		rootClass: "go-admin-modal", behaviorSelectors: []string{"data-go-admin-modal", "data-go-admin-modal-backdrop"},
		semanticVariables: []string{
			"--admin-modal-surface", "--admin-modal-text", "--admin-modal-border", "--admin-modal-backdrop",
			"--admin-modal-radius", "--admin-modal-shadow", "--admin-modal-padding-block",
			"--admin-modal-padding-inline", "--admin-modal-viewport-padding",
			"--admin-modal-max-height", "--admin-modal-width",
		},
		accessibility:       "dialog semantics, accessible naming, focus trap/return, topmost dismissal",
		delivery:            "embedded output.css and @goliatone/go-admin-client/components.css",
		overridePolicy:      "validated semantic variables and additive containerClass",
		compatibilityPolicy: "size names and lifecycle selectors remain additive",
	},
	"action-menu": {
		tier: "reusable-ssr-primitive", owner: "go-admin", source: "templates/partials/action-menu.html",
		consumers: []string{"ssr", "translations", "datagrid"},
		rootClass: "action-menu", behaviorSelectors: []string{"data-action-menu", "data-action-menu-trigger", "data-action-menu-content", "data-action-menu-item"},
		semanticVariables:   []string{"--admin-action-menu-surface", "--admin-action-menu-text", "--admin-action-menu-border"},
		accessibility:       "menu roles, expanded state, keyboard navigation, disabled items, focus restoration",
		delivery:            "SSR template plus embedded/public component stylesheet",
		overridePolicy:      "semantic variables; behavior remains data-attribute owned",
		compatibilityPolicy: "legacy DataGrid class selectors retained during migration window",
	},
	"status-badge": {
		tier: "reusable-ssr-primitive", owner: "go-admin", source: "templates/partials/status-badge.html",
		consumers: []string{"ssr", "translations", "feature-flags", "dashboard", "datagrid"},
		rootClass: "status-chip", behaviorSelectors: []string{"data-status", "data-tone"},
		semanticVariables:   []string{"--admin-status-surface", "--admin-status-text", "--admin-status-border"},
		accessibility:       "text label remains present; decorative icons are hidden from assistive technology",
		delivery:            "SSR/TypeScript vocabulary plus embedded/public component stylesheet",
		overridePolicy:      "registered tones resolve through semantic variables",
		compatibilityPolicy: "badge aliases remain mapped to status-chip anatomy",
	},
	"filter-panel": {
		tier: "reusable-ssr-primitive", owner: "go-admin", source: "templates/partials/filter-panel.html",
		consumers: []string{"ssr", "translations", "datagrid"},
		rootClass: "filter-panel", behaviorSelectors: []string{"data-filter-panel", "data-filter-panel-form", "data-filter-field"},
		semanticVariables:   []string{"--admin-filter-surface", "--admin-filter-text", "--admin-filter-border"},
		accessibility:       "native details/form controls and preserved query submission",
		delivery:            "SSR/client anatomy plus embedded/public component stylesheet",
		overridePolicy:      "semantic variables; product fields and query semantics stay caller-owned",
		compatibilityPolicy: "native no-JavaScript behavior remains supported",
	},
	"quick-filters": {
		tier: "reusable-ssr-primitive", owner: "go-admin", source: "templates/partials/quick-filters.html",
		consumers: []string{"ssr", "translations", "datagrid"},
		rootClass: "quick-filters", behaviorSelectors: []string{"data-quick-filters", "data-quick-filter-value"},
		semanticVariables:   []string{"--admin-quick-filter-surface", "--admin-quick-filter-text", "--admin-quick-filter-ring"},
		accessibility:       "named group and aria-current selection state",
		delivery:            "SSR/client anatomy plus embedded/public component stylesheet",
		overridePolicy:      "registered tone variables; filter predicates stay caller-owned",
		compatibilityPolicy: "existing link/query semantics remain supported",
	},
	"dashboard-widgets": {
		tier: "package-owned-renderer", owner: "go-dashboard", source: "templates/dashboard_widget_content.html",
		consumers: []string{"dashboard"},
	},
	"page-header-alias": {
		tier: "compatibility", owner: "go-admin", source: "templates/partials/admin-page-header.html",
		consumers: []string{"legacy-host-overlays"},
	},
	"page-heading-alias": {
		tier: "compatibility", owner: "go-admin", source: "templates/partials/admin-page-heading.html",
		consumers: []string{"legacy-host-overlays"},
	},
	"cards": {
		tier: "internal", owner: "go-admin", source: "templates/partials/metric-card.html",
		consumers: []string{"dashboard-shell"},
	},
	"tabs": {
		tier: "internal", owner: "go-admin", source: "templates/partials/tab-panel.html",
		consumers: []string{"admin-pages"},
	},
	"toast": {
		tier: "internal", owner: "go-admin-client", source: "templates/partials/toast-container.html",
		consumers: []string{"embedded-admin"},
	},
}

func TestCustomizationSurfaceInventoryHasConcreteOwnership(t *testing.T) {
	allowedTiers := map[string]bool{
		"canonical-shell": true, "bounded-structural-partial": true,
		"reusable-ssr-primitive": true, "public-browser-component": true,
		"host-override": true, "package-owned-renderer": true,
		"compatibility": true, "internal": true,
	}
	for name, entry := range customizationSurfaceInventory {
		if !allowedTiers[entry.tier] {
			t.Errorf("%s has unsupported tier %q", name, entry.tier)
		}
		if entry.owner == "" || entry.source == "" || len(entry.consumers) == 0 {
			t.Errorf("%s must name an owner, source, and runtime consumers: %#v", name, entry)
		}
		if _, err := fs.Stat(Templates(), filepath.ToSlash(entry.source)); err == nil {
			continue
		}
		if _, err := os.Stat(entry.source); err != nil {
			t.Errorf("%s source %q is unavailable: %v", name, entry.source, err)
		}
	}
}

func TestRequiredPromotedComponentInventoryIsBounded(t *testing.T) {
	required := map[string]string{
		"modal": "public-browser-component", "action-menu": "reusable-ssr-primitive",
		"status-badge": "reusable-ssr-primitive", "filter-panel": "reusable-ssr-primitive",
		"quick-filters": "reusable-ssr-primitive",
	}
	for name, tier := range required {
		entry, ok := customizationSurfaceInventory[name]
		if !ok || entry.tier != tier {
			t.Errorf("required component %s must be inventoried as %s; got %#v", name, tier, entry)
		}
		if entry.rootClass == "" || len(entry.behaviorSelectors) == 0 || len(entry.semanticVariables) == 0 ||
			entry.accessibility == "" || entry.delivery == "" || entry.overridePolicy == "" || entry.compatibilityPolicy == "" {
			t.Errorf("required component %s has an incomplete support contract: %#v", name, entry)
		}
	}
	for _, name := range []string{"cards", "tabs", "toast", "dashboard-widgets"} {
		if entry := customizationSurfaceInventory[name]; entry.tier == "reusable-ssr-primitive" || entry.tier == "public-browser-component" {
			t.Errorf("%s cannot be promoted without updating the bounded delivery contract", name)
		}
	}
}

func TestRetainedCompatibilitySurfacesHaveRemovalGates(t *testing.T) {
	for name, entry := range retainedCompatibilitySurfaces {
		if entry.source == "" || entry.replacement == "" || entry.removalRelease == "" || entry.removalCondition == "" {
			t.Errorf("compatibility surface %s has an incomplete removal policy: %#v", name, entry)
			continue
		}
		if entry.removalRelease < "v0.133.0" {
			t.Errorf("compatibility surface %s cannot be removed before two coordinated minor releases: %s", name, entry.removalRelease)
		}
		if !strings.Contains(entry.removalCondition, "downstream") || !strings.Contains(entry.removalCondition, "audit") {
			t.Errorf("compatibility surface %s must require a downstream usage audit: %q", name, entry.removalCondition)
		}
		if _, err := os.Stat(entry.source); err != nil {
			t.Errorf("compatibility surface %s source %q is unavailable: %v", name, entry.source, err)
		}
	}

	css := string(mustReadFile(t, "assets/src/styles/components.css"))
	for _, selector := range []string{".actions-menu", ".action-item", ".status-badge"} {
		if !strings.Contains(css, selector) {
			t.Errorf("documented compatibility selector %q disappeared before its removal gate", selector)
		}
	}
}

func TestDisconnectedComponentSourcesAreRemoved(t *testing.T) {
	for _, path := range []string{
		"assets/src/styles/components/action-menu.css",
		"assets/src/styles/components/filter-panel.css",
		"assets/src/styles/components/quick-filters.css",
		"assets/src/styles/translation-tokens.css",
		"assets/src/datatable/actions.css",
	} {
		if _, err := os.Stat(path); !os.IsNotExist(err) {
			t.Errorf("disconnected component source %q must be removed; stat err=%v", path, err)
		}
	}
}

func TestQuickstartDoesNotMaintainACompetingSidebarTemplate(t *testing.T) {
	if _, err := os.Stat("../../quickstart/templates/partials/sidebar.html"); !os.IsNotExist(err) {
		t.Fatalf("quickstart sidebar must resolve pkg/client's canonical template; stat err=%v", err)
	}
}

func TestPromotedComponentCSSUsesStableAnatomyAndSemanticFallbacks(t *testing.T) {
	content, err := os.ReadFile("assets/src/styles/components.css")
	if err != nil {
		t.Fatalf("read canonical component CSS: %v", err)
	}
	css := string(content)
	for _, selector := range []string{
		".go-admin-modal__container", ".go-admin-modal__surface",
		".go-admin-modal__header", ".go-admin-modal__body",
		".go-admin-modal__footer", ".go-admin-modal__close",
		".action-menu__trigger", ".action-menu__content", ".action-menu__item",
		".status-chip", ".status-chip__count",
		".filter-panel__trigger", ".filter-panel__form", ".filter-panel__field",
		".quick-filters__items", ".quick-filter", ".quick-filter__count",
		"@media (prefers-reduced-motion: reduce)",
	} {
		if !strings.Contains(css, selector) {
			t.Errorf("canonical component CSS is missing anatomy/state selector %q", selector)
		}
	}
	for _, fallback := range []string{
		"var(--admin-modal-surface, var(--color-surface-raised, #ffffff))",
		"var(--admin-modal-text, var(--color-text-primary, #111827))",
		"var(--admin-modal-border, var(--color-border-default, #e5e7eb))",
		"var(--admin-modal-radius, var(--radius-surface, 0.75rem))",
		"var(--admin-modal-shadow, var(--shadow-surface, var(--shadow-overlay,",
		"var(--admin-modal-padding-block, var(--space-surface, 1rem))",
		"var(--admin-modal-padding-inline, var(--space-surface, 1.25rem))",
		"var(--admin-modal-viewport-padding, var(--space-surface, 1rem))",
		"var(--admin-modal-max-height, 90vh)",
		"var(--admin-modal-width, var(--modal-size-lg, 32rem))",
		"var(--admin-action-menu-surface, var(--color-surface-raised, #ffffff))",
		"var(--admin-action-menu-text, var(--color-text-primary, #374151))",
		"var(--admin-action-menu-border, var(--color-border-default, #e5e7eb))",
		"var(--admin-status-surface, var(--color-surface-subtle, #f3f4f6))",
		"var(--admin-status-text, var(--color-text-primary, #374151))",
		"var(--admin-status-border, var(--color-border-default, #d1d5db))",
		"var(--admin-filter-surface, var(--color-surface-default, #f9fafb))",
		"var(--admin-filter-surface, var(--color-surface-default, #ffffff))",
		"var(--admin-filter-text, var(--color-text-primary, #374151))",
		"var(--admin-filter-border, var(--color-border-default, #e5e7eb))",
		"var(--admin-quick-filter-surface, var(--color-surface-subtle, #f3f4f6))",
		"var(--admin-quick-filter-text, var(--color-text-primary, #374151))",
		"var(--admin-quick-filter-ring, var(--color-focus-ring, #3b82f6))",
	} {
		if !strings.Contains(css, fallback) {
			t.Errorf("canonical component CSS is missing scoped/portable/literal fallback %q", fallback)
		}
	}
}

func TestCanonicalFilterPanelStylesHaveNoHigherSpecificityCompetitor(t *testing.T) {
	input := string(mustReadFile(t, "assets/input.css"))
	if strings.Contains(input, ".filter-panel.filter-panel") {
		t.Fatal("input.css must not override the canonical filter-panel component owner")
	}
}

func TestActionMenuRenderersShareStableAnatomy(t *testing.T) {
	sources := []string{
		"templates/partials/action-menu.html",
		"assets/src/datatable/actions.ts",
		"assets/src/translation-dashboard/index.ts",
		"assets/src/translation-family/index.ts",
	}
	for _, path := range sources {
		content, err := os.ReadFile(path)
		if err != nil {
			t.Fatalf("read action-menu renderer %s: %v", path, err)
		}
		markup := string(content)
		for _, contract := range []string{
			"action-menu", "action-menu__trigger", "action-menu__content",
			"action-menu__item", "data-action-menu", "data-action-menu-trigger",
			"data-action-menu-content", "data-action-menu-item",
		} {
			if !strings.Contains(markup, contract) {
				t.Errorf("action-menu renderer %s is missing stable contract %q", path, contract)
			}
		}
		for _, presentation := range []string{
			"action-menu relative flex justify-end",
			"action-menu__trigger rounded-md p-2",
			"action-menu__content hidden absolute right-0",
			"action-menu__item flex w-full items-center",
		} {
			if strings.Contains(markup, presentation) {
				t.Errorf("action-menu renderer %s still owns presentation utilities %q", path, presentation)
			}
		}
	}

	controller, err := os.ReadFile("assets/src/shared/action-menu.ts")
	if err != nil {
		t.Fatalf("read shared action-menu controller: %v", err)
	}
	for _, selector := range []string{
		"[data-action-menu]", "[data-action-menu-trigger]",
		"[data-action-menu-content]", "[data-action-menu-item]",
	} {
		if !strings.Contains(string(controller), selector) {
			t.Errorf("shared action-menu controller is missing behavior selector %q", selector)
		}
	}
}

func TestFilterRenderersShareStableAnatomyAndProgressiveSemantics(t *testing.T) {
	filterSources := []string{
		"templates/partials/filter-panel.html",
		"templates/resources/translations/families.html",
		"templates/resources/translations/matrix.html",
		"assets/src/translation-matrix/index.ts",
	}
	for _, path := range filterSources {
		content, err := os.ReadFile(path)
		if err != nil {
			t.Fatalf("read filter-panel renderer %s: %v", path, err)
		}
		markup := string(content)
		for _, contract := range []string{
			"filter-panel", "filter-panel__trigger", "filter-panel__form",
			"filter-panel__grid", "filter-panel__field", "filter-panel__actions",
		} {
			if !strings.Contains(markup, contract) {
				t.Errorf("filter-panel renderer %s is missing stable contract %q", path, contract)
			}
		}
		for _, presentation := range []string{
			"filter-panel rounded-lg border", "filter-panel__trigger cursor-pointer",
			"filter-panel__form p-4 border-t", "filter-panel__grid grid gap-3",
			"filter-panel__field grid gap-1",
		} {
			if strings.Contains(markup, presentation) {
				t.Errorf("filter-panel renderer %s still owns presentation utilities %q", path, presentation)
			}
		}
	}

	partial, err := os.ReadFile("templates/partials/filter-panel.html")
	if err != nil {
		t.Fatalf("read canonical filter-panel partial: %v", err)
	}
	for _, semantic := range []string{"<details", "<summary", "<form", `method="{{ method }}"`, `name="{{ filter.name }}"`} {
		if !strings.Contains(string(partial), semantic) {
			t.Errorf("canonical filter-panel partial is missing no-JavaScript form semantic %q", semantic)
		}
	}

	quickSources := []string{
		"templates/partials/quick-filters.html",
		"templates/resources/translations/matrix.html",
		"assets/src/datatable/quick-filters.ts",
		"assets/src/translation-matrix/index.ts",
	}
	for _, path := range quickSources {
		content, err := os.ReadFile(path)
		if err != nil {
			t.Fatalf("read quick-filter renderer %s: %v", path, err)
		}
		markup := string(content)
		for _, contract := range []string{"quick-filters", "quick-filter", "data-quick-filter-value", "data-tone", "data-state"} {
			if !strings.Contains(markup, contract) {
				t.Errorf("quick-filter renderer %s is missing stable contract %q", path, contract)
			}
		}
		for _, presentation := range []string{
			"quick-filters flex flex-wrap", "quick-filter inline-flex items-center",
			"bg-emerald-100", "bg-rose-100", "ring-2 ring",
		} {
			if strings.Contains(markup, presentation) {
				t.Errorf("quick-filter renderer %s still owns framework presentation %q", path, presentation)
			}
		}
	}
	if !strings.Contains(string(mustReadFile(t, "templates/partials/quick-filters.html")), `href="{{ qf.href }}"`) {
		t.Error("canonical quick-filter partial must retain link/query behavior without JavaScript")
	}
}

func mustReadFile(t *testing.T, path string) []byte {
	t.Helper()
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %s: %v", path, err)
	}
	return content
}

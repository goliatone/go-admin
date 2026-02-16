package setup

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"path"
	"sort"
	"strings"

	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/quickstart"
)

func targetKey(target map[string]any) string {
	if target == nil {
		return ""
	}
	if key, ok := target["key"].(string); ok && strings.TrimSpace(key) != "" {
		return strings.TrimSpace(key)
	}
	if pathVal, ok := target["path"].(string); ok && strings.TrimSpace(pathVal) != "" {
		return strings.TrimSpace(pathVal)
	}
	return ""
}

const (
	// NavigationMenuCode is the default menu identifier for the admin sidebar.
	NavigationMenuCode = "admin_main"
	// SiteNavigationMenuCode is the default menu identifier for the public site navigation.
	SiteNavigationMenuCode = "site_main"
	// NavigationGroupMain is the parent node for primary navigation entries.
	NavigationGroupMain = NavigationMenuCode + ".nav-group-main"
	// NavigationGroupOthers groups secondary/utility links.
	NavigationGroupOthers = NavigationMenuCode + ".nav-group-others"
	// NavigationSectionContent wraps content-related modules (pages, posts, media).
	NavigationSectionContent = NavigationGroupMain + ".content"
	// NavigationSectionDashboard is the top-level dashboard link.
	NavigationSectionDashboard = NavigationGroupMain + ".dashboard"
	// NavigationSectionShop demonstrates a nested submenu.
	NavigationSectionShop = NavigationGroupMain + ".shop"
)

// SetupNavigation seeds the CMS menu service with grouped, translatable navigation.
func SetupNavigation(ctx context.Context, menuSvc admin.CMSMenuService, basePath, menuCode, locale string) error {
	if menuSvc == nil {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if menuCode == "" {
		menuCode = NavigationMenuCode
	}
	if strings.TrimSpace(locale) == "" {
		locale = "en"
	}

	groups := []admin.MenuItem{
		{
			ID:            NavigationGroupMain,
			Type:          admin.MenuItemTypeGroup,
			GroupTitle:    "Navigation",
			GroupTitleKey: "menu.group.main",
			Position:      prtInt(0),
			Menu:          menuCode,
		},
		{
			ID:            NavigationGroupOthers,
			Type:          admin.MenuItemTypeGroup,
			GroupTitle:    "Tools",
			GroupTitleKey: "menu.group.others",
			Position:      prtInt(90),
			Menu:          menuCode,
		},
	}
	content := admin.MenuItem{
		ID:          NavigationSectionContent,
		Type:        admin.MenuItemTypeItem,
		Label:       "Content",
		LabelKey:    "menu.content",
		Icon:        "page",
		Position:    prtInt(10),
		Collapsible: true,
		Collapsed:   false,
		Target: map[string]any{
			"type": "url",
			"path": path.Join(basePath, "content", "pages"),
			"key":  "content",
		},
		Menu:        menuCode,
		ParentID:    NavigationGroupMain,
		Permissions: append([]string{}, quickstart.DefaultContentParentPermissions()...),
	}
	dashboard := admin.MenuItem{
		ID:       NavigationSectionDashboard,
		Type:     admin.MenuItemTypeItem,
		Label:    "Dashboard",
		LabelKey: "menu.dashboard",
		Icon:     "home",
		Target: map[string]any{
			"type": "url",
			"path": basePath,
			"key":  "dashboard",
		},
		Position: prtInt(5),
		Menu:     menuCode,
		ParentID: NavigationGroupMain,
	}
	contentChildren := []admin.MenuItem{
		{
			ID:       NavigationSectionContent + ".pages",
			Label:    "Pages",
			LabelKey: "menu.content.pages",
			Target: map[string]any{
				"type": "url",
				"path": path.Join(basePath, "content", "pages"),
				"key":  "pages",
			},
			Position: prtInt(1),
			Menu:     menuCode,
			ParentID: NavigationSectionContent,
			// No permissions needed - parent Content already checks them
		},
		{
			ID:       NavigationSectionContent + ".posts",
			Label:    "Posts",
			LabelKey: "menu.content.posts",
			Target: map[string]any{
				"type": "url",
				"path": path.Join(basePath, "content", "posts"),
				"key":  "posts",
			},
			Position: prtInt(2),
			Menu:     menuCode,
			ParentID: NavigationSectionContent,
			// No permissions needed - parent Content already checks them
		},
	}
	shop := admin.MenuItem{
		ID:          NavigationSectionShop,
		Type:        admin.MenuItemTypeItem,
		Label:       "My Shop",
		LabelKey:    "menu.shop",
		Icon:        "shop",
		Position:    prtInt(40),
		Collapsible: true,
		Collapsed:   false,
		Target: map[string]any{
			"type": "url",
			"path": path.Join(basePath, "shop"),
			"key":  NavigationSectionShop,
		},
		Menu:     menuCode,
		ParentID: NavigationGroupMain,
	}
	shopChildren := []admin.MenuItem{
		{
			ID:       NavigationSectionShop + ".products",
			Label:    "Products",
			LabelKey: "menu.shop.products",
			Target: map[string]any{
				"type": "url",
				"path": path.Join(basePath, "products"),
				"key":  "products",
			},
			Position: prtInt(1),
			Menu:     menuCode,
			ParentID: NavigationSectionShop,
		},
		{
			ID:       NavigationSectionShop + ".orders",
			Label:    "Orders",
			LabelKey: "menu.shop.orders",
			Target: map[string]any{
				"type": "url",
				"path": path.Join(basePath, "orders"),
				"key":  "orders",
			},
			Position: prtInt(2),
			Menu:     menuCode,
			ParentID: NavigationSectionShop,
		},
		{
			ID:       NavigationSectionShop + ".customers",
			Label:    "Customers",
			LabelKey: "menu.shop.customers",
			Target: map[string]any{
				"type": "url",
				"path": path.Join(basePath, "customers"),
				"key":  "customers",
			},
			Position: prtInt(3),
			Menu:     menuCode,
			ParentID: NavigationSectionShop,
		},
	}
	analytics := admin.MenuItem{
		ID:       NavigationGroupMain + ".analytics",
		Label:    "Analytics",
		LabelKey: "menu.analytics",
		Icon:     "stats-report",
		Target: map[string]any{
			"type": "url",
			"path": path.Join(basePath, "analytics"),
			"key":  "analytics",
		},
		Position: prtInt(60),
		Menu:     menuCode,
		ParentID: NavigationGroupMain,
	}
	separator := admin.MenuItem{
		ID:       NavigationGroupMain + ".separator",
		Type:     admin.MenuItemTypeSeparator,
		Position: prtInt(80),
		Menu:     menuCode,
	}
	secondary := []admin.MenuItem{
		{
			ID:       NavigationGroupOthers + ".help",
			Label:    "Help & Support",
			LabelKey: "menu.help",
			Icon:     "question-mark",
			Target: map[string]any{
				"type": "url",
				"path": path.Join(basePath, "help"),
				"key":  "help",
			},
			Position: prtInt(10),
			Menu:     menuCode,
			ParentID: NavigationGroupOthers,
		},
	}

	items := append([]admin.MenuItem{}, groups...)
	items = append(items, dashboard)
	items = append(items, content)
	items = append(items, contentChildren...)
	items = append(items, shop)
	items = append(items, shopChildren...)
	items = append(items, analytics, separator)
	items = append(items, secondary...)

	return quickstart.SeedNavigation(ctx, quickstart.SeedNavigationOptions{
		MenuSvc:  menuSvc,
		MenuCode: menuCode,
		Items:    items,
		Locale:   locale,
		Reset:    strings.EqualFold(os.Getenv("RESET_NAV_MENU"), "true"),
		Logf:     nil,
	})
}

func navDebugEnabled() bool {
	return strings.EqualFold(os.Getenv("NAV_DEBUG"), "true") || strings.EqualFold(os.Getenv("NAV_DEBUG_LOG"), "true")
}

func debugLogf(format string, args ...any) {
	if !navDebugEnabled() {
		return
	}
	log.Printf(format, args...)
}

func describeMenuItem(item admin.MenuItem) string {
	tgt := targetKey(item.Target)
	label := strings.TrimSpace(item.Label)
	if label == "" {
		label = strings.TrimSpace(item.LabelKey)
	}
	if label == "" {
		label = "(unnamed)"
	}
	pos := 0
	if item.Position != nil {
		pos = *item.Position
	}
	if tgt != "" {
		return fmt.Sprintf("%s (target=%s id=%s pos=%d)", label, tgt, item.ID, pos)
	}
	return fmt.Sprintf("%s (id=%s pos=%d)", label, item.ID, pos)
}

func flattenMenuIDs(items []admin.MenuItem, out *[]string) {
	for _, item := range items {
		if strings.TrimSpace(item.ID) != "" {
			*out = append(*out, item.ID)
		}
		if len(item.Children) > 0 {
			flattenMenuIDs(item.Children, out)
		}
	}
}

// EnsureDashboardFirstOptions customizes dashboard/content menu reconciliation behavior.
type EnsureDashboardFirstOptions struct {
	// EnsureContentParentPath controls whether a path is injected into the Content parent target
	// when it is missing. Keeping it false allows the parent to remain non-clickable.
	EnsureContentParentPath bool
}

// EnsureDashboardFirst updates persisted menu item positions so Dashboard renders before Content.
// This is useful for persistent CMS backends where module menu items are only inserted once.
func EnsureDashboardFirst(ctx context.Context, menuSvc admin.CMSMenuService, basePath, menuCode, locale string) error {
	return EnsureDashboardFirstWithOptions(ctx, menuSvc, basePath, menuCode, locale, EnsureDashboardFirstOptions{
		EnsureContentParentPath: true,
	})
}

// EnsureDashboardFirstWithOptions updates persisted menu ordering with optional content-parent tuning.
func EnsureDashboardFirstWithOptions(ctx context.Context, menuSvc admin.CMSMenuService, basePath, menuCode, locale string, opts EnsureDashboardFirstOptions) error {
	if menuSvc == nil {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if menuCode == "" {
		menuCode = NavigationMenuCode
	}
	if strings.TrimSpace(locale) == "" {
		locale = "en"
	}
	basePath = "/" + strings.Trim(strings.TrimSpace(basePath), "/")
	if basePath == "/" {
		basePath = "/admin"
	}

	menu, err := menuSvc.Menu(ctx, menuCode, locale)
	if err != nil || menu == nil || len(menu.Items) == 0 {
		return err
	}

	var mainGroup *admin.MenuItem
	for idx := range menu.Items {
		item := &menu.Items[idx]
		if !strings.EqualFold(item.Type, admin.MenuItemTypeGroup) {
			continue
		}
		if strings.EqualFold(item.GroupTitleKey, "menu.group.main") ||
			strings.EqualFold(item.LabelKey, "menu.group.main") ||
			strings.EqualFold(item.GroupTitle, "Navigation") ||
			strings.EqualFold(item.Label, "Navigation") {
			mainGroup = item
			break
		}
	}
	if mainGroup == nil {
		debugLogf("[nav repair] main group not found for menu=%s locale=%s", menuCode, locale)
		return nil
	}

	var dashboardItem *admin.MenuItem
	var contentItem *admin.MenuItem
	for idx := range mainGroup.Children {
		child := &mainGroup.Children[idx]
		if strings.EqualFold(child.LabelKey, "menu.dashboard") ||
			strings.EqualFold(strings.TrimSpace(child.Label), "dashboard") ||
			strings.EqualFold(targetKey(child.Target), "dashboard") {
			dashboardItem = child
		}
		if strings.EqualFold(child.LabelKey, "menu.content") ||
			strings.EqualFold(strings.TrimSpace(child.Label), "content") ||
			strings.EqualFold(targetKey(child.Target), "content") {
			contentItem = child
		}
	}

	childrenSummary := []string{}
	for _, child := range mainGroup.Children {
		childrenSummary = append(childrenSummary, describeMenuItem(child))
	}
	debugLogf("[nav repair] before menu=%s locale=%s mainGroup=%s children=%v", menuCode, locale, mainGroup.ID, childrenSummary)

	dashboardIndex := -1
	contentIndex := -1
	for idx := range mainGroup.Children {
		if dashboardItem != nil && mainGroup.Children[idx].ID == dashboardItem.ID {
			dashboardIndex = idx
		}
		if contentItem != nil && mainGroup.Children[idx].ID == contentItem.ID {
			contentIndex = idx
		}
	}

	if dashboardItem == nil {
		debugLogf("[nav repair] dashboard item not found in main group (menu=%s locale=%s)", menuCode, locale)
	}
	if contentItem == nil {
		debugLogf("[nav repair] content item not found in main group (menu=%s locale=%s)", menuCode, locale)
	}

	// go-cms treats Position as a 0-based insertion index; in-memory service treats Position
	// as a sort key (1-based, 0 means "keep existing"). Keep the repair backend-aware.
	dashboardPos := 1
	contentPos := 10
	if _, ok := menuSvc.(*admin.GoCMSMenuAdapter); ok {
		dashboardPos = 0
		contentPos = 1
	}

	needsRepair := dashboardItem != nil && dashboardIndex != 0
	if needsRepair || (dashboardItem != nil && contentItem != nil && contentIndex != 1) {
		debugLogf("[nav repair] applying menu repairs (dashboardPos=%d contentPos=%d dashboardIndex=%d contentIndex=%d)", dashboardPos, contentPos, dashboardIndex, contentIndex)
	}

	if dashboardItem != nil && dashboardIndex != 0 {
		updated := *dashboardItem
		updated.Position = &dashboardPos
		if err := menuSvc.UpdateMenuItem(ctx, menuCode, updated); err != nil {
			return err
		}
	}

	if contentItem != nil && dashboardItem != nil && contentIndex != 1 {
		updated := *contentItem
		updated.Position = &contentPos
		updated.Collapsible = true
		if updated.Target == nil {
			updated.Target = map[string]any{}
		}
		if _, ok := updated.Target["type"]; !ok {
			updated.Target["type"] = "url"
		}
		if _, ok := updated.Target["path"]; !ok && opts.EnsureContentParentPath {
			updated.Target["path"] = path.Join(basePath, "content", "pages")
		}
		if _, ok := updated.Target["key"]; !ok {
			updated.Target["key"] = "content"
		}
		if err := menuSvc.UpdateMenuItem(ctx, menuCode, updated); err != nil {
			return err
		}
	}

	updatedMenu, err := menuSvc.Menu(ctx, menuCode, locale)
	if err != nil || updatedMenu == nil {
		return err
	}

	var updatedMainGroup *admin.MenuItem
	for idx := range updatedMenu.Items {
		item := &updatedMenu.Items[idx]
		if !strings.EqualFold(item.Type, admin.MenuItemTypeGroup) {
			continue
		}
		if strings.EqualFold(item.GroupTitleKey, "menu.group.main") ||
			strings.EqualFold(item.LabelKey, "menu.group.main") ||
			strings.EqualFold(item.GroupTitle, "Navigation") ||
			strings.EqualFold(item.Label, "Navigation") {
			updatedMainGroup = item
			break
		}
	}

	if updatedMainGroup != nil {
		afterSummary := []string{}
		for _, child := range updatedMainGroup.Children {
			afterSummary = append(afterSummary, describeMenuItem(child))
		}
		debugLogf("[nav repair] after menu=%s locale=%s mainGroup=%s children=%v", menuCode, locale, updatedMainGroup.ID, afterSummary)
		if navDebugEnabled() && strings.EqualFold(os.Getenv("NAV_DEBUG_LOG"), "true") {
			if raw, err := json.Marshal(updatedMainGroup.Children); err == nil {
				debugLogf("[nav repair] after children json=%s", string(raw))
			}
		}
	}

	// If we're on go-cms and the ordering still didn't change, force a deterministic reorder
	// across the entire menu (go-cms requires providing all item IDs).
	if _, ok := menuSvc.(*admin.GoCMSMenuAdapter); ok && updatedMainGroup != nil && len(updatedMainGroup.Children) > 1 {
		first := strings.ToLower(strings.TrimSpace(updatedMainGroup.Children[0].LabelKey))
		if first == "" {
			first = strings.ToLower(strings.TrimSpace(targetKey(updatedMainGroup.Children[0].Target)))
		}
		if first != "menu.dashboard" && first != "dashboard" {
			debugLogf("[nav repair] fallback to ReorderMenu for go-cms (dashboard still not first)")

			orderedRoot := make([]admin.MenuItem, 0, len(updatedMenu.Items))
			orderedRoot = append(orderedRoot, updatedMenu.Items...)
			for idx := range orderedRoot {
				if !strings.EqualFold(orderedRoot[idx].Type, admin.MenuItemTypeGroup) {
					continue
				}
				if !strings.EqualFold(orderedRoot[idx].ID, updatedMainGroup.ID) {
					continue
				}
				children := append([]admin.MenuItem{}, orderedRoot[idx].Children...)
				reordered := make([]admin.MenuItem, 0, len(children))
				var dash *admin.MenuItem
				var content *admin.MenuItem
				rest := make([]admin.MenuItem, 0, len(children))
				for i := range children {
					child := children[i]
					if strings.EqualFold(child.LabelKey, "menu.dashboard") || strings.EqualFold(targetKey(child.Target), "dashboard") || strings.EqualFold(child.Label, "Dashboard") {
						tmp := child
						dash = &tmp
						continue
					}
					if strings.EqualFold(child.LabelKey, "menu.content") || strings.EqualFold(targetKey(child.Target), "content") || strings.EqualFold(child.Label, "Content") {
						tmp := child
						content = &tmp
						continue
					}
					rest = append(rest, child)
				}
				if dash != nil {
					reordered = append(reordered, *dash)
				}
				if content != nil {
					reordered = append(reordered, *content)
				}
				reordered = append(reordered, rest...)
				orderedRoot[idx].Children = reordered
				break
			}

			orderedIDs := []string{}
			flattenMenuIDs(orderedRoot, &orderedIDs)
			if len(orderedIDs) > 0 {
				if err := menuSvc.ReorderMenu(ctx, menuCode, orderedIDs); err != nil {
					return err
				}
			}
		}
	}

	return nil
}

// EnsureContentParentPermissions reconciles the persisted Content parent permissions
// so newly introduced content surfaces remain visible without forcing a full menu reset.
func EnsureContentParentPermissions(ctx context.Context, menuSvc admin.CMSMenuService, menuCode, locale string) error {
	if menuSvc == nil {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if menuCode == "" {
		menuCode = NavigationMenuCode
	}
	if strings.TrimSpace(locale) == "" {
		locale = "en"
	}

	menu, err := menuSvc.Menu(ctx, menuCode, locale)
	if err != nil || menu == nil || len(menu.Items) == 0 {
		return err
	}

	var contentItem *admin.MenuItem
	for idx := range menu.Items {
		item := &menu.Items[idx]
		if !strings.EqualFold(item.Type, admin.MenuItemTypeGroup) {
			continue
		}
		for childIdx := range item.Children {
			child := &item.Children[childIdx]
			if strings.EqualFold(child.LabelKey, "menu.content") ||
				strings.EqualFold(strings.TrimSpace(child.Label), "content") ||
				strings.EqualFold(targetKey(child.Target), "content") {
				contentItem = child
				break
			}
		}
		if contentItem != nil {
			break
		}
	}
	if contentItem == nil {
		return nil
	}

	desired := quickstart.DefaultContentParentPermissions()
	merged := mergePermissions(contentItem.Permissions, desired)
	if samePermissions(contentItem.Permissions, merged) {
		return nil
	}

	updated := *contentItem
	updated.Permissions = merged
	return menuSvc.UpdateMenuItem(ctx, menuCode, updated)
}

func mergePermissions(existing []string, required []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(existing)+len(required))
	add := func(value string) {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			return
		}
		key := strings.ToLower(trimmed)
		if _, ok := seen[key]; ok {
			return
		}
		seen[key] = struct{}{}
		out = append(out, trimmed)
	}
	for _, value := range existing {
		add(value)
	}
	for _, value := range required {
		add(value)
	}
	return out
}

func samePermissions(left []string, right []string) bool {
	if len(left) != len(right) {
		return false
	}
	normalize := func(input []string) []string {
		out := make([]string, 0, len(input))
		for _, value := range input {
			trimmed := strings.ToLower(strings.TrimSpace(value))
			if trimmed == "" {
				continue
			}
			out = append(out, trimmed)
		}
		sort.Strings(out)
		return out
	}
	lhs := normalize(left)
	rhs := normalize(right)
	if len(lhs) != len(rhs) {
		return false
	}
	for idx := range lhs {
		if lhs[idx] != rhs[idx] {
			return false
		}
	}
	return true
}

// NavigationIntegrityReport captures lightweight health metrics for a persisted menu tree.
type NavigationIntegrityReport struct {
	MenuCode        string
	Locale          string
	NodeCount       int
	RootCount       int
	OrphanCount     int
	CycleCount      int
	SelfParentCount int
	RepairedCount   int
}

func (r NavigationIntegrityReport) HasIssues() bool {
	return r.OrphanCount > 0 || r.CycleCount > 0 || r.SelfParentCount > 0
}

// AnalyzeNavigationIntegrity summarizes the current in-memory navigation tree shape.
func AnalyzeNavigationIntegrity(items []admin.MenuItem, menuCode, locale string) NavigationIntegrityReport {
	report := NavigationIntegrityReport{
		MenuCode: strings.TrimSpace(menuCode),
		Locale:   strings.TrimSpace(locale),
	}
	if len(items) == 0 {
		return report
	}

	flat := flattenMenuTree(items)
	report.NodeCount = len(flat)
	report.RootCount = len(items)
	if len(flat) == 0 {
		return report
	}

	idSet := map[string]bool{}
	parentByID := map[string]string{}
	for _, item := range flat {
		id := strings.TrimSpace(item.ID)
		if id == "" {
			continue
		}
		idSet[id] = true
		parentByID[id] = strings.TrimSpace(item.ParentID)
	}

	for _, item := range flat {
		id := strings.TrimSpace(item.ID)
		parentID := strings.TrimSpace(item.ParentID)
		if id == "" {
			continue
		}
		if parentID == "" {
			continue
		}
		if id == parentID {
			report.SelfParentCount++
			continue
		}
		if !idSet[parentID] {
			report.OrphanCount++
		}
	}

	cycleNodes := map[string]bool{}
	for id := range parentByID {
		path := []string{}
		seen := map[string]int{}
		current := id
		for current != "" {
			if idx, ok := seen[current]; ok {
				for _, cycleID := range path[idx:] {
					cycleNodes[cycleID] = true
				}
				break
			}
			seen[current] = len(path)
			path = append(path, current)
			next, ok := parentByID[current]
			if !ok {
				break
			}
			current = strings.TrimSpace(next)
		}
	}
	report.CycleCount = len(cycleNodes)
	return report
}

// RepairNavigationIntegrity repairs known menu corruption patterns and returns a health report.
func RepairNavigationIntegrity(ctx context.Context, menuSvc admin.CMSMenuService, menuCode, locale string) (NavigationIntegrityReport, error) {
	report := NavigationIntegrityReport{
		MenuCode: strings.TrimSpace(menuCode),
		Locale:   strings.TrimSpace(locale),
	}
	if menuSvc == nil {
		return report, nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if report.MenuCode == "" {
		report.MenuCode = NavigationMenuCode
	}
	if report.Locale == "" {
		report.Locale = "en"
	}

	repaired := 0
	// Best-effort targeted repair for the Content parent row, including hidden malformed rows
	// that may not appear in resolved navigation trees.
	if changed, err := repairContentParentTarget(ctx, menuSvc, report.MenuCode, report.Locale); err != nil {
		return report, err
	} else if changed {
		repaired++
	}

	menu, err := menuSvc.Menu(ctx, report.MenuCode, report.Locale)
	if err != nil {
		return report, err
	}
	if menu == nil {
		report.RepairedCount = repaired
		return report, nil
	}

	mainGroupID := resolveMainGroupID(menu.Items)
	flat := flattenMenuTree(menu.Items)
	idSet := map[string]bool{}
	for _, item := range flat {
		id := strings.TrimSpace(item.ID)
		if id != "" {
			idSet[id] = true
		}
	}

	for _, item := range flat {
		id := strings.TrimSpace(item.ID)
		if id == "" {
			continue
		}
		parentID := strings.TrimSpace(item.ParentID)
		if parentID != id {
			continue
		}
		updated := item
		fallbackParent := inferParentID(id, idSet)
		if isContentNode(item) && mainGroupID != "" {
			fallbackParent = mainGroupID
		}
		updated.ParentID = fallbackParent
		updated.ParentCode = fallbackParent
		if err := menuSvc.UpdateMenuItem(ctx, report.MenuCode, updated); err != nil {
			if errors.Is(err, admin.ErrNotFound) {
				continue
			}
			return report, err
		}
		repaired++
	}

	menu, err = menuSvc.Menu(ctx, report.MenuCode, report.Locale)
	if err != nil {
		return report, err
	}
	report = AnalyzeNavigationIntegrity(menu.Items, report.MenuCode, report.Locale)
	report.RepairedCount = repaired
	return report, nil
}

// LogNavigationIntegritySummary emits a compact startup health summary for persisted navigation.
func LogNavigationIntegritySummary(ctx context.Context, menuSvc admin.CMSMenuService, menuCode, locale string) (NavigationIntegrityReport, error) {
	report, err := RepairNavigationIntegrity(ctx, menuSvc, menuCode, locale)
	if err != nil {
		return report, err
	}
	log.Printf(
		"[nav integrity] menu=%s locale=%s nodes=%d roots=%d orphans=%d cycles=%d self_parent=%d repaired=%d",
		report.MenuCode,
		report.Locale,
		report.NodeCount,
		report.RootCount,
		report.OrphanCount,
		report.CycleCount,
		report.SelfParentCount,
		report.RepairedCount,
	)
	return report, nil
}

func repairContentParentTarget(ctx context.Context, menuSvc admin.CMSMenuService, menuCode, locale string) (bool, error) {
	contentIDs := []string{
		NavigationSectionContent,
		"nav-group-main.content",
		strings.TrimSpace(menuCode) + ".nav-group-main.content",
	}
	parentIDs := []string{
		NavigationGroupMain,
		"nav-group-main",
		strings.TrimSpace(menuCode) + ".nav-group-main",
	}
	contentPermissions := quickstart.DefaultContentParentPermissions()

	menu, err := menuSvc.Menu(ctx, menuCode, locale)
	if err != nil || menu == nil {
		return false, err
	}
	mainGroupID := resolveMainGroupID(menu.Items)
	content := resolveContentNode(menu.Items)
	if content != nil {
		if !contentNodeNeedsRepair(*content, mainGroupID, contentPermissions) {
			return false, nil
		}
		updated := *content
		updated.Collapsible = true
		updated.Label = "Content"
		updated.LabelKey = "menu.content"
		updated.Icon = "page"
		if mainGroupID != "" {
			updated.ParentID = mainGroupID
			updated.ParentCode = mainGroupID
		}
		updated.Permissions = mergePermissions(updated.Permissions, contentPermissions)
		if updated.Target == nil {
			updated.Target = map[string]any{}
		}
		updated.Target["type"] = "url"
		updated.Target["key"] = "content"
		updated.Target["name"] = "admin.pages"
		delete(updated.Target, "path")
		if err := menuSvc.UpdateMenuItem(ctx, menuCode, updated); err != nil {
			return false, err
		}
		return true, nil
	}

	// Fallback for hidden malformed rows that don't appear in resolved tree.
	for _, contentID := range contentIDs {
		contentID = strings.TrimSpace(contentID)
		if contentID == "" {
			continue
		}
		for _, parentID := range parentIDs {
			parentID = strings.TrimSpace(parentID)
			if parentID == "" {
				continue
			}
			item := admin.MenuItem{
				ID:          contentID,
				Type:        admin.MenuItemTypeItem,
				Label:       "Content",
				LabelKey:    "menu.content",
				Icon:        "page",
				Menu:        menuCode,
				Locale:      locale,
				ParentID:    parentID,
				ParentCode:  parentID,
				Collapsible: true,
				Collapsed:   false,
				Permissions: append([]string{}, contentPermissions...),
				Target: map[string]any{
					"type": "url",
					"key":  "content",
					"name": "admin.pages",
				},
			}
			if err := menuSvc.UpdateMenuItem(ctx, menuCode, item); err != nil {
				if errors.Is(err, admin.ErrNotFound) {
					continue
				}
				msg := strings.ToLower(strings.TrimSpace(err.Error()))
				if strings.Contains(msg, "not found") {
					continue
				}
				return false, err
			}
			return true, nil
		}
	}
	return false, nil
}

func flattenMenuTree(items []admin.MenuItem) []admin.MenuItem {
	if len(items) == 0 {
		return nil
	}
	out := make([]admin.MenuItem, 0, len(items))
	for _, item := range items {
		out = append(out, item)
		if len(item.Children) > 0 {
			out = append(out, flattenMenuTree(item.Children)...)
		}
	}
	return out
}

func resolveMainGroupID(items []admin.MenuItem) string {
	for _, item := range items {
		if !strings.EqualFold(item.Type, admin.MenuItemTypeGroup) {
			continue
		}
		if strings.EqualFold(item.GroupTitleKey, "menu.group.main") ||
			strings.EqualFold(item.LabelKey, "menu.group.main") ||
			strings.EqualFold(item.GroupTitle, "Navigation") ||
			strings.EqualFold(item.Label, "Navigation") {
			return strings.TrimSpace(item.ID)
		}
	}
	return ""
}

func resolveContentNode(items []admin.MenuItem) *admin.MenuItem {
	for idx := range items {
		if isContentNode(items[idx]) {
			return &items[idx]
		}
		if len(items[idx].Children) > 0 {
			if child := resolveContentNode(items[idx].Children); child != nil {
				return child
			}
		}
	}
	return nil
}

func isContentNode(item admin.MenuItem) bool {
	return strings.EqualFold(strings.TrimSpace(item.LabelKey), "menu.content") ||
		strings.EqualFold(strings.TrimSpace(item.Label), "content") ||
		strings.EqualFold(targetKey(item.Target), "content")
}

func inferParentID(id string, idSet map[string]bool) string {
	canonicalID := strings.TrimSpace(id)
	if canonicalID == "" {
		return ""
	}
	idx := strings.LastIndex(canonicalID, ".")
	if idx <= 0 {
		return ""
	}
	candidate := strings.TrimSpace(canonicalID[:idx])
	if candidate == "" || candidate == canonicalID {
		return ""
	}
	if len(idSet) > 0 && !idSet[candidate] {
		return ""
	}
	return candidate
}

func contentNodeNeedsRepair(item admin.MenuItem, mainGroupID string, requiredPermissions []string) bool {
	if !item.Collapsible {
		return true
	}
	if strings.TrimSpace(item.LabelKey) != "menu.content" {
		return true
	}
	if strings.TrimSpace(targetKey(item.Target)) != "content" {
		return true
	}
	if _, ok := item.Target["path"]; ok {
		return true
	}
	if mainGroupID != "" && strings.TrimSpace(item.ParentID) != mainGroupID {
		return true
	}
	for _, permission := range requiredPermissions {
		if !menuPermissionIncluded(item.Permissions, permission) {
			return true
		}
	}
	return false
}

func menuPermissionIncluded(perms []string, permission string) bool {
	needle := strings.TrimSpace(permission)
	if needle == "" {
		return true
	}
	for _, perm := range perms {
		if strings.EqualFold(strings.TrimSpace(perm), needle) {
			return true
		}
	}
	return false
}

// RemoveLegacyTranslationToolsMenuItems removes translation links previously seeded under Tools.
// Translation navigation is rendered via the dedicated Translations menu in the UI.
func RemoveLegacyTranslationToolsMenuItems(ctx context.Context, menuSvc admin.CMSMenuService, menuCode, locale string) error {
	if menuSvc == nil {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	menuCode = strings.TrimSpace(menuCode)
	if menuCode == "" {
		menuCode = NavigationMenuCode
	}
	locale = strings.TrimSpace(locale)
	if locale == "" {
		locale = "en"
	}

	menu, err := menuSvc.Menu(ctx, menuCode, locale)
	if err != nil || menu == nil {
		return err
	}

	ids := []string{}
	collectLegacyTranslationToolItemIDs(menu.Items, &ids)
	if len(ids) == 0 {
		return nil
	}

	for _, id := range ids {
		itemID := strings.TrimSpace(id)
		if itemID == "" {
			continue
		}
		if err := menuSvc.DeleteMenuItem(ctx, menuCode, itemID); err != nil {
			if errors.Is(err, admin.ErrNotFound) {
				continue
			}
			msg := strings.ToLower(strings.TrimSpace(err.Error()))
			if strings.Contains(msg, "not found") {
				continue
			}
			return err
		}
	}
	return nil
}

func collectLegacyTranslationToolItemIDs(items []admin.MenuItem, out *[]string) {
	for _, item := range items {
		if isLegacyTranslationToolsItem(item) {
			*out = append(*out, item.ID)
		}
		if len(item.Children) > 0 {
			collectLegacyTranslationToolItemIDs(item.Children, out)
		}
	}
}

func isLegacyTranslationToolsItem(item admin.MenuItem) bool {
	labelKey := strings.ToLower(strings.TrimSpace(item.LabelKey))
	if labelKey != "menu.translations.queue" && labelKey != "menu.translations.exchange" {
		return false
	}
	parentID := strings.ToLower(strings.TrimSpace(item.ParentID))
	if strings.Contains(parentID, ".nav-group-others") || parentID == "nav-group-others" {
		return true
	}
	return false
}

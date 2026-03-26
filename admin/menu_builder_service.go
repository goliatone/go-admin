package admin

import (
	"context"
	"fmt"
	"maps"
	"net/url"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/goliatone/go-admin/internal/primitives"
)

const defaultMenuBuilderMaxDepth = 8

// MenuBuilderService stores admin menu-builder metadata and coordinates menu mutations.
type MenuBuilderService struct {
	mu       sync.RWMutex
	menus    map[string]AdminMenuRecord
	bindings map[string]AdminMenuBindingRecord
	profiles map[string]AdminMenuViewProfileRecord
}

func NewMenuBuilderService() *MenuBuilderService {
	now := time.Now().UTC()
	full := AdminMenuViewProfileRecord{
		Code:        "full",
		Name:        "Full",
		Mode:        "full",
		Status:      MenuRecordStatusPublished,
		CreatedAt:   now,
		UpdatedAt:   now,
		PublishedAt: &now,
	}
	return &MenuBuilderService{
		menus:    map[string]AdminMenuRecord{},
		bindings: map[string]AdminMenuBindingRecord{},
		profiles: map[string]AdminMenuViewProfileRecord{"full": full},
	}
}

func normalizeMenuStatus(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case MenuRecordStatusDraft, MenuRecordStatusPublished:
		return strings.ToLower(strings.TrimSpace(status))
	default:
		return MenuRecordStatusDraft
	}
}

func normalizeMenuCode(code string) string {
	code = strings.TrimSpace(code)
	if code == "" {
		return ""
	}
	return strings.ReplaceAll(strings.ToLower(code), " ", "_")
}

func menuBindingKey(location, locale, menuCode, profile string) string {
	return strings.ToLower(strings.TrimSpace(location)) + "|" +
		strings.ToLower(strings.TrimSpace(locale)) + "|" +
		strings.ToLower(strings.TrimSpace(menuCode)) + "|" +
		strings.ToLower(strings.TrimSpace(profile))
}

func (s *MenuBuilderService) Contracts(endpoints map[string]string) AdminMenuContracts {
	contractsEndpoints := map[string]string{}
	maps.Copy(contractsEndpoints, endpoints)
	return AdminMenuContracts{
		Endpoints: contractsEndpoints,
		ErrorCode: map[string]string{
			"cycle":          TextCodeMenuValidationCycle,
			"depth":          TextCodeMenuValidationDepth,
			"invalid_target": TextCodeMenuValidationInvalidTarget,
		},
		ContentNavigation: contentNavigationContractsPayload(map[string]string{
			"content.navigation": contractsEndpoints["content.navigation"],
		}),
	}
}

func (s *MenuBuilderService) ListMenus() []AdminMenuRecord {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]AdminMenuRecord, 0, len(s.menus))
	for _, record := range s.menus {
		out = append(out, record)
	}
	sort.SliceStable(out, func(i, j int) bool {
		return strings.ToLower(out[i].Code) < strings.ToLower(out[j].Code)
	})
	return out
}

func (s *MenuBuilderService) GetMenu(id string) (AdminMenuRecord, bool) {
	id = normalizeMenuCode(id)
	s.mu.RLock()
	defer s.mu.RUnlock()
	record, ok := s.menus[id]
	return record, ok
}

func (s *MenuBuilderService) ensureMenuFromService(ctx context.Context, svc CMSMenuService, id string, locale string) (AdminMenuRecord, error) {
	if record, ok := s.GetMenu(id); ok {
		return record, nil
	}
	if svc == nil {
		return AdminMenuRecord{}, ErrNotFound
	}
	menu, err := svc.Menu(ctx, id, locale)
	if err != nil {
		return AdminMenuRecord{}, err
	}
	now := time.Now().UTC()
	record := AdminMenuRecord{
		ID:        normalizeMenuCode(primitives.FirstNonEmptyRaw(menu.ID, menu.Code, id)),
		Code:      normalizeMenuCode(primitives.FirstNonEmptyRaw(menu.Code, id)),
		Name:      strings.TrimSpace(menu.Code),
		Status:    MenuRecordStatusPublished,
		CreatedAt: now,
		UpdatedAt: now,
	}
	s.mu.Lock()
	s.menus[record.ID] = record
	s.mu.Unlock()
	return record, nil
}

func (s *MenuBuilderService) CreateMenu(ctx context.Context, svc CMSMenuService, input map[string]any, defaultLocale string) (AdminMenuRecord, error) {
	code := normalizeMenuCode(primitives.FirstNonEmptyRaw(
		toString(input["code"]),
		toString(input["id"]),
		NormalizeMenuSlug(toString(input["name"])),
	))
	if code == "" {
		return AdminMenuRecord{}, requiredFieldDomainError("code", map[string]any{"field": "code"})
	}
	if svc == nil {
		return AdminMenuRecord{}, serviceUnavailableDomainError("menu service not available", map[string]any{"service": "menu"})
	}
	if _, err := svc.CreateMenu(ctx, code); err != nil {
		return AdminMenuRecord{}, err
	}
	now := time.Now().UTC()
	record := AdminMenuRecord{
		ID:          code,
		Code:        code,
		Name:        strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(input["name"]), code)),
		Description: strings.TrimSpace(toString(input["description"])),
		Status:      normalizeMenuStatus(toString(input["status"])),
		Locale:      strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(input["locale"]), defaultLocale)),
		FamilyID:    strings.TrimSpace(toString(input["family_id"])),
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if record.Status == MenuRecordStatusPublished {
		record.PublishedAt = &now
	}
	s.mu.Lock()
	s.menus[record.ID] = record
	s.mu.Unlock()
	return record, nil
}

func (s *MenuBuilderService) UpdateMenu(id string, input map[string]any) (AdminMenuRecord, error) {
	id = normalizeMenuCode(id)
	s.mu.Lock()
	defer s.mu.Unlock()
	record, ok := s.menus[id]
	if !ok {
		return AdminMenuRecord{}, ErrNotFound
	}
	if name := strings.TrimSpace(toString(input["name"])); name != "" {
		record.Name = name
	}
	if description := strings.TrimSpace(toString(input["description"])); description != "" || input["description"] != nil {
		record.Description = description
	}
	if locale := strings.TrimSpace(toString(input["locale"])); locale != "" {
		record.Locale = locale
	}
	if groupID := strings.TrimSpace(toString(input["family_id"])); groupID != "" {
		record.FamilyID = groupID
	}
	if archivedRaw, exists := input["archived"]; exists {
		archived := false
		if v, ok := archivedRaw.(bool); ok {
			archived = v
		}
		record.Archived = archived
		if archived {
			now := time.Now().UTC()
			record.ArchivedAt = &now
		} else {
			record.ArchivedAt = nil
		}
	}
	record.UpdatedAt = time.Now().UTC()
	s.menus[id] = record
	return record, nil
}

func (s *MenuBuilderService) DeleteMenu(id string, force bool) error {
	id = normalizeMenuCode(id)
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.menus[id]; !ok {
		return ErrNotFound
	}
	if !force {
		for _, binding := range s.bindings {
			if strings.EqualFold(binding.MenuCode, id) && strings.EqualFold(binding.Status, MenuRecordStatusPublished) {
				return conflictDomainError("menu is referenced by active location bindings", map[string]any{
					"menu_code": id,
					"location":  binding.Location,
				})
			}
		}
	}
	delete(s.menus, id)
	for key, binding := range s.bindings {
		if strings.EqualFold(binding.MenuCode, id) {
			delete(s.bindings, key)
		}
	}
	return nil
}

func (s *MenuBuilderService) SetMenuStatus(id, status string) (AdminMenuRecord, error) {
	id = normalizeMenuCode(id)
	status = normalizeMenuStatus(status)
	s.mu.Lock()
	defer s.mu.Unlock()
	record, ok := s.menus[id]
	if !ok {
		return AdminMenuRecord{}, ErrNotFound
	}
	record.Status = status
	record.UpdatedAt = time.Now().UTC()
	if status == MenuRecordStatusPublished {
		now := time.Now().UTC()
		record.PublishedAt = &now
	} else {
		record.PublishedAt = nil
	}
	s.menus[id] = record
	return record, nil
}

func (s *MenuBuilderService) ArchiveMenu(id string, archived bool) (AdminMenuRecord, error) {
	id = normalizeMenuCode(id)
	s.mu.Lock()
	defer s.mu.Unlock()
	record, ok := s.menus[id]
	if !ok {
		return AdminMenuRecord{}, ErrNotFound
	}
	record.Archived = archived
	record.UpdatedAt = time.Now().UTC()
	if archived {
		now := time.Now().UTC()
		record.ArchivedAt = &now
	} else {
		record.ArchivedAt = nil
	}
	s.menus[id] = record
	return record, nil
}

func (s *MenuBuilderService) CloneMenu(ctx context.Context, svc CMSMenuService, sourceCode, targetCode string, defaultLocale string) (AdminMenuRecord, error) {
	sourceCode = normalizeMenuCode(sourceCode)
	if sourceCode == "" {
		return AdminMenuRecord{}, requiredFieldDomainError("id", map[string]any{"field": "id"})
	}
	if targetCode == "" {
		targetCode = sourceCode + "_copy"
	}
	targetCode = normalizeMenuCode(targetCode)
	if targetCode == sourceCode {
		targetCode = sourceCode + "_clone"
	}
	if svc == nil {
		return AdminMenuRecord{}, serviceUnavailableDomainError("menu service not available", map[string]any{"service": "menu"})
	}
	sourceMenu, err := svc.Menu(ctx, sourceCode, defaultLocale)
	if err != nil {
		return AdminMenuRecord{}, err
	}
	record, err := s.CreateMenu(ctx, svc, map[string]any{
		"code":   targetCode,
		"name":   targetCode,
		"status": MenuRecordStatusDraft,
		"locale": defaultLocale,
	}, defaultLocale)
	if err != nil {
		return AdminMenuRecord{}, err
	}
	cloned := cloneMenuTree(sourceMenu.Items)
	if _, err := s.UpsertMenuItems(ctx, svc, targetCode, cloned, defaultLocale); err != nil {
		return AdminMenuRecord{}, err
	}
	return record, nil
}

func cloneMenuTree(items []MenuItem) []MenuItem {
	if len(items) == 0 {
		return nil
	}
	out := make([]MenuItem, 0, len(items))
	for _, item := range items {
		clone := item
		clone.ID = strings.TrimSpace(item.ID)
		clone.ParentID = strings.TrimSpace(item.ParentID)
		clone.ParentCode = strings.TrimSpace(item.ParentCode)
		clone.Target = primitives.CloneAnyMap(item.Target)
		clone.Badge = primitives.CloneAnyMap(item.Badge)
		clone.Permissions = append([]string{}, item.Permissions...)
		clone.Classes = append([]string{}, item.Classes...)
		clone.Styles = primitives.CloneStringMapNilOnEmpty(item.Styles)
		clone.Children = cloneMenuTree(item.Children)
		out = append(out, clone)
	}
	return out
}

func (s *MenuBuilderService) ListBindings() []AdminMenuBindingRecord {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]AdminMenuBindingRecord, 0, len(s.bindings))
	for _, binding := range s.bindings {
		out = append(out, binding)
	}
	sort.SliceStable(out, func(i, j int) bool {
		if out[i].Location == out[j].Location {
			if out[i].Priority == out[j].Priority {
				return out[i].MenuCode < out[j].MenuCode
			}
			return out[i].Priority > out[j].Priority
		}
		return out[i].Location < out[j].Location
	})
	return out
}

func (s *MenuBuilderService) ResolveBinding(location string, locale string) *AdminMenuBindingRecord {
	location = strings.TrimSpace(location)
	locale = strings.TrimSpace(locale)
	s.mu.RLock()
	defer s.mu.RUnlock()
	var best *AdminMenuBindingRecord
	for _, binding := range s.bindings {
		if !strings.EqualFold(binding.Location, location) {
			continue
		}
		if binding.Locale != "" && locale != "" && !strings.EqualFold(binding.Locale, locale) {
			continue
		}
		current := binding
		if best == nil || current.Priority > best.Priority {
			best = &current
		}
	}
	return best
}

func (s *MenuBuilderService) UpsertBinding(location string, input map[string]any) (AdminMenuBindingRecord, error) {
	location = strings.TrimSpace(location)
	if location == "" {
		return AdminMenuBindingRecord{}, requiredFieldDomainError("location", map[string]any{"field": "location"})
	}
	menuCode := normalizeMenuCode(primitives.FirstNonEmptyRaw(toString(input["menu_code"]), toString(input["menu"])))
	if menuCode == "" {
		return AdminMenuBindingRecord{}, requiredFieldDomainError("menu_code", map[string]any{"field": "menu_code"})
	}
	locale := strings.TrimSpace(toString(input["locale"]))
	viewProfile := normalizeMenuCode(primitives.FirstNonEmptyRaw(toString(input["view_profile_code"]), toString(input["view_profile"])))
	priority := atoiDefault(toString(input["priority"]), 0)
	status := normalizeMenuStatus(toString(input["status"]))
	now := time.Now().UTC()
	key := menuBindingKey(location, locale, menuCode, viewProfile)
	s.mu.Lock()
	defer s.mu.Unlock()
	record, exists := s.bindings[key]
	if !exists {
		record = AdminMenuBindingRecord{
			ID:        fmt.Sprintf("%s|%s|%s", strings.ToLower(location), strings.ToLower(locale), menuCode),
			CreatedAt: now,
		}
	}
	record.Location = location
	record.MenuCode = menuCode
	record.ViewProfileCode = viewProfile
	record.Locale = locale
	record.Priority = priority
	record.Status = status
	record.UpdatedAt = now
	if status == MenuRecordStatusPublished {
		record.PublishedAt = &now
	} else {
		record.PublishedAt = nil
	}
	s.bindings[key] = record
	return record, nil
}

func (s *MenuBuilderService) ListViewProfiles() []AdminMenuViewProfileRecord {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]AdminMenuViewProfileRecord, 0, len(s.profiles))
	for _, profile := range s.profiles {
		out = append(out, profile)
	}
	sort.SliceStable(out, func(i, j int) bool {
		return strings.ToLower(out[i].Code) < strings.ToLower(out[j].Code)
	})
	return out
}

func (s *MenuBuilderService) GetViewProfile(code string) (AdminMenuViewProfileRecord, bool) {
	code = normalizeMenuCode(code)
	s.mu.RLock()
	defer s.mu.RUnlock()
	record, ok := s.profiles[code]
	return record, ok
}

func (s *MenuBuilderService) UpsertViewProfile(code string, input map[string]any) (AdminMenuViewProfileRecord, error) {
	code = normalizeMenuCode(primitives.FirstNonEmptyRaw(code, toString(input["code"])))
	if code == "" {
		return AdminMenuViewProfileRecord{}, requiredFieldDomainError("code", map[string]any{"field": "code"})
	}
	mode := strings.ToLower(strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(input["mode"]), "full")))
	if mode == "" {
		mode = "full"
	}
	switch mode {
	case "full", "top_level_limit", "max_depth", "include_ids", "exclude_ids", "composed":
	default:
		return AdminMenuViewProfileRecord{}, validationDomainError("invalid view profile mode", map[string]any{
			"field": "mode",
			"value": mode,
		})
	}
	status := normalizeMenuStatus(toString(input["status"]))
	now := time.Now().UTC()
	s.mu.Lock()
	defer s.mu.Unlock()
	record, exists := s.profiles[code]
	if !exists {
		record = AdminMenuViewProfileRecord{
			Code:      code,
			CreatedAt: now,
		}
	}
	record.Code = code
	record.Name = strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(input["name"]), code))
	record.Mode = mode
	record.MaxTopLevel = menuBuilderIntPointer(input["max_top_level"])
	record.MaxDepth = menuBuilderIntPointer(input["max_depth"])
	record.IncludeItemIDs = menuBuilderStringSlice(input["include_item_ids"])
	record.ExcludeItemIDs = menuBuilderStringSlice(input["exclude_item_ids"])
	record.Status = status
	record.UpdatedAt = now
	if status == MenuRecordStatusPublished {
		record.PublishedAt = &now
	} else {
		record.PublishedAt = nil
	}
	s.profiles[code] = record
	return record, nil
}

func (s *MenuBuilderService) DeleteViewProfile(code string) error {
	code = normalizeMenuCode(code)
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.profiles[code]; !ok {
		return ErrNotFound
	}
	delete(s.profiles, code)
	for key, binding := range s.bindings {
		if strings.EqualFold(binding.ViewProfileCode, code) {
			binding.ViewProfileCode = ""
			s.bindings[key] = binding
		}
	}
	return nil
}

func (s *MenuBuilderService) PublishViewProfile(code string, publish bool) (AdminMenuViewProfileRecord, error) {
	code = normalizeMenuCode(code)
	s.mu.Lock()
	defer s.mu.Unlock()
	record, ok := s.profiles[code]
	if !ok {
		return AdminMenuViewProfileRecord{}, ErrNotFound
	}
	now := time.Now().UTC()
	if publish {
		record.Status = MenuRecordStatusPublished
		record.PublishedAt = &now
	} else {
		record.Status = MenuRecordStatusDraft
		record.PublishedAt = nil
	}
	record.UpdatedAt = now
	s.profiles[code] = record
	return record, nil
}

func (s *MenuBuilderService) UpsertMenuItems(ctx context.Context, svc CMSMenuService, menuCode string, tree []MenuItem, defaultLocale string) (*Menu, error) {
	menuCode = normalizeMenuCode(menuCode)
	if menuCode == "" {
		return nil, requiredFieldDomainError("id", map[string]any{"field": "id"})
	}
	if svc == nil {
		return nil, serviceUnavailableDomainError("menu service not available", map[string]any{"service": "menu"})
	}
	if _, err := svc.CreateMenu(ctx, menuCode); err != nil {
		return nil, err
	}
	normalized, err := normalizeMenuTreeForUpsert(tree, menuCode, defaultLocale)
	if err != nil {
		return nil, err
	}
	current, err := svc.Menu(ctx, menuCode, "")
	if err != nil {
		return nil, err
	}
	if current != nil {
		roots := append([]MenuItem{}, current.Items...)
		for _, root := range roots {
			if strings.TrimSpace(root.ID) == "" {
				continue
			}
			if err := svc.DeleteMenuItem(ctx, menuCode, root.ID); err != nil {
				return nil, err
			}
		}
	}
	if err := upsertTreeRecursive(ctx, svc, menuCode, normalized); err != nil {
		return nil, err
	}
	return svc.Menu(ctx, menuCode, defaultLocale)
}

func upsertTreeRecursive(ctx context.Context, svc CMSMenuService, menuCode string, tree []MenuItem) error {
	for _, item := range tree {
		created := item
		if err := svc.AddMenuItem(ctx, menuCode, created); err != nil {
			return err
		}
		if len(item.Children) > 0 {
			if err := upsertTreeRecursive(ctx, svc, menuCode, item.Children); err != nil {
				return err
			}
		}
	}
	return nil
}

func normalizeMenuTreeForUpsert(tree []MenuItem, menuCode, defaultLocale string) ([]MenuItem, error) {
	usedIDs := map[string]struct{}{}
	out := make([]MenuItem, 0, len(tree))
	for idx, item := range tree {
		normalized, err := normalizeMenuItemForUpsert(item, "", menuCode, defaultLocale, 1, defaultMenuBuilderMaxDepth, usedIDs, idx)
		if err != nil {
			return nil, err
		}
		out = append(out, normalized)
	}
	return out, nil
}

func normalizeMenuItemForUpsert(item MenuItem, parentID, menuCode, defaultLocale string, depth, maxDepth int, usedIDs map[string]struct{}, index int) (MenuItem, error) {
	if depth > maxDepth {
		return MenuItem{}, menuValidationDepthError(maxDepth, map[string]any{
			"depth": depth,
		})
	}
	if err := validateMenuTarget(item); err != nil {
		return MenuItem{}, err
	}
	id := strings.TrimSpace(item.ID)
	if id == "" {
		base := NormalizeMenuSlug(primitives.FirstNonEmptyRaw(item.Label, item.GroupTitle, item.LabelKey, item.GroupTitleKey))
		if base == "" {
			base = fmt.Sprintf("item_%d", index+1)
		}
		id = base
	}
	if _, exists := usedIDs[strings.ToLower(id)]; exists {
		id = fmt.Sprintf("%s_%d", id, depth+index+1)
	}
	usedIDs[strings.ToLower(id)] = struct{}{}
	item.ID = id
	item.ParentID = strings.TrimSpace(parentID)
	item.ParentCode = item.ParentID
	item.Menu = menuCode
	item.Type = NormalizeMenuItemType(item.Type)
	if item.Locale == "" {
		item.Locale = defaultLocale
	}
	if item.Position == nil {
		item.Position = new(index + 1)
	}
	if strings.TrimSpace(item.Code) == "" {
		item.Code = item.ID
	}
	if len(item.Children) > 0 {
		children := make([]MenuItem, 0, len(item.Children))
		for idx, child := range item.Children {
			normalized, err := normalizeMenuItemForUpsert(child, item.ID, menuCode, defaultLocale, depth+1, maxDepth, usedIDs, idx)
			if err != nil {
				return MenuItem{}, err
			}
			children = append(children, normalized)
		}
		item.Children = children
	}
	if strings.TrimSpace(item.ID) != "" && strings.TrimSpace(item.ParentID) != "" && strings.EqualFold(item.ID, item.ParentID) {
		return MenuItem{}, menuValidationCycleError(map[string]any{
			"id":        item.ID,
			"parent_id": item.ParentID,
		})
	}
	return item, nil
}

func validateMenuTarget(item MenuItem) error {
	itemType := strings.ToLower(strings.TrimSpace(item.Type))
	if itemType == "" {
		itemType = MenuItemTypeItem
	}
	if itemType == MenuItemTypeGroup || itemType == MenuItemTypeSeparator {
		return nil
	}
	target := item.Target
	if target == nil {
		target = map[string]any{}
	}
	targetType := strings.ToLower(strings.TrimSpace(toString(target["type"])))
	switch targetType {
	case "", "content", "route", "module", "external":
	default:
		return menuValidationInvalidTargetError(map[string]any{
			"field": "target.type",
			"type":  targetType,
			"id":    item.ID,
		})
	}
	switch targetType {
	case "", "route", "module":
		if strings.TrimSpace(toString(target["url"])) == "" &&
			strings.TrimSpace(toString(target["path"])) == "" &&
			strings.TrimSpace(toString(target["key"])) == "" &&
			strings.TrimSpace(toString(target["route"])) == "" &&
			strings.TrimSpace(toString(target["module"])) == "" {
			return menuValidationInvalidTargetError(map[string]any{
				"field": "target",
				"id":    item.ID,
			})
		}
	case "content":
		if strings.TrimSpace(toString(target["content_id"])) == "" &&
			strings.TrimSpace(toString(target["slug"])) == "" &&
			strings.TrimSpace(toString(target["path"])) == "" {
			return menuValidationInvalidTargetError(map[string]any{
				"field": "target.content_id",
				"id":    item.ID,
			})
		}
	case "external":
		raw := strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(target["url"]), toString(target["href"])))
		if raw == "" {
			return menuValidationInvalidTargetError(map[string]any{
				"field": "target.url",
				"id":    item.ID,
			})
		}
		parsed, err := url.Parse(raw)
		if err != nil || parsed.Scheme == "" || parsed.Host == "" {
			return menuValidationInvalidTargetError(map[string]any{
				"field": "target.url",
				"id":    item.ID,
				"value": raw,
			})
		}
	}
	return nil
}

func menuBuilderIntPointer(raw any) *int {
	value := atoiDefault(toString(raw), -1)
	if value < 0 {
		return nil
	}
	return new(value)
}

func menuBuilderStringSlice(raw any) []string {
	if raw == nil {
		return nil
	}
	switch typed := raw.(type) {
	case []string:
		out := make([]string, 0, len(typed))
		for _, value := range typed {
			trimmed := strings.TrimSpace(value)
			if trimmed == "" {
				continue
			}
			out = append(out, trimmed)
		}
		return out
	case []any:
		out := make([]string, 0, len(typed))
		for _, value := range typed {
			trimmed := strings.TrimSpace(toString(value))
			if trimmed == "" {
				continue
			}
			out = append(out, trimmed)
		}
		return out
	default:
		return nil
	}
}

func projectMenuForProfile(menu *Menu, profile AdminMenuViewProfileRecord) *Menu {
	if menu == nil {
		return nil
	}
	out := menuBuilderCloneMenu(menu)
	if out == nil {
		return nil
	}
	items := out.Items
	switch profile.Mode {
	case "top_level_limit":
		if profile.MaxTopLevel != nil && *profile.MaxTopLevel >= 0 && *profile.MaxTopLevel < len(items) {
			items = append([]MenuItem{}, items[:*profile.MaxTopLevel]...)
		}
	case "max_depth":
		items = truncateMenuDepth(items, profile.MaxDepth, 1)
	case "include_ids":
		if len(profile.IncludeItemIDs) > 0 {
			includeSet := map[string]struct{}{}
			for _, id := range profile.IncludeItemIDs {
				includeSet[strings.ToLower(strings.TrimSpace(id))] = struct{}{}
			}
			items = filterMenuByIDs(items, includeSet, true)
		}
	case "exclude_ids":
		if len(profile.ExcludeItemIDs) > 0 {
			excludeSet := map[string]struct{}{}
			for _, id := range profile.ExcludeItemIDs {
				excludeSet[strings.ToLower(strings.TrimSpace(id))] = struct{}{}
			}
			items = filterMenuByIDs(items, excludeSet, false)
		}
	case "composed":
		if len(profile.ExcludeItemIDs) > 0 {
			excludeSet := map[string]struct{}{}
			for _, id := range profile.ExcludeItemIDs {
				excludeSet[strings.ToLower(strings.TrimSpace(id))] = struct{}{}
			}
			items = filterMenuByIDs(items, excludeSet, false)
		}
		if len(profile.IncludeItemIDs) > 0 {
			includeSet := map[string]struct{}{}
			for _, id := range profile.IncludeItemIDs {
				includeSet[strings.ToLower(strings.TrimSpace(id))] = struct{}{}
			}
			items = filterMenuByIDs(items, includeSet, true)
		}
		if profile.MaxDepth != nil {
			items = truncateMenuDepth(items, profile.MaxDepth, 1)
		}
		if profile.MaxTopLevel != nil && *profile.MaxTopLevel >= 0 && *profile.MaxTopLevel < len(items) {
			items = append([]MenuItem{}, items[:*profile.MaxTopLevel]...)
		}
	}
	out.Items = items
	return out
}

func truncateMenuDepth(items []MenuItem, maxDepth *int, current int) []MenuItem {
	if maxDepth == nil || *maxDepth <= 0 {
		return items
	}
	out := make([]MenuItem, 0, len(items))
	for _, item := range items {
		clone := item
		if current >= *maxDepth {
			clone.Children = nil
		} else {
			clone.Children = truncateMenuDepth(item.Children, maxDepth, current+1)
		}
		out = append(out, clone)
	}
	return out
}

func filterMenuByIDs(items []MenuItem, set map[string]struct{}, include bool) []MenuItem {
	out := make([]MenuItem, 0, len(items))
	for _, item := range items {
		key := strings.ToLower(strings.TrimSpace(item.ID))
		_, exists := set[key]
		keep := exists
		if !include {
			keep = !exists
		}
		clone := item
		clone.Children = filterMenuByIDs(item.Children, set, include)
		if keep || len(clone.Children) > 0 {
			out = append(out, clone)
		}
	}
	return out
}

func menuBuilderCloneMenu(menu *Menu) *Menu {
	if menu == nil {
		return nil
	}
	copy := *menu
	copy.Items = menuBuilderCloneMenuItems(copy.Items)
	return &copy
}

func menuBuilderCloneMenuItems(items []MenuItem) []MenuItem {
	if len(items) == 0 {
		return nil
	}
	out := make([]MenuItem, 0, len(items))
	for _, item := range items {
		clone := item
		clone.Target = primitives.CloneAnyMap(item.Target)
		clone.Badge = primitives.CloneAnyMap(item.Badge)
		clone.Permissions = append([]string{}, item.Permissions...)
		clone.Classes = append([]string{}, item.Classes...)
		clone.Styles = primitives.CloneStringMapNilOnEmpty(item.Styles)
		clone.Children = menuBuilderCloneMenuItems(item.Children)
		out = append(out, clone)
	}
	return out
}

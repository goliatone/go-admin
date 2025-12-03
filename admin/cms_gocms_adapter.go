package admin

import (
	"context"
	"errors"
	"fmt"
	"reflect"
	"strings"
	"unicode"

	cms "github.com/goliatone/go-cms"
	"github.com/google/uuid"
)

// GoCMSMenuAdapter maps the go-cms menu service into the Admin CMSMenuService contract.
type GoCMSMenuAdapter struct {
	service any
}

// NewGoCMSMenuAdapter wraps a go-cms MenuService.
func NewGoCMSMenuAdapter(service cms.MenuService) *GoCMSMenuAdapter {
	return NewGoCMSMenuAdapterFromAny(service)
}

// NewGoCMSMenuAdapterFromAny wraps a go-cms-compatible menu service via reflection (useful for stubs in tests).
func NewGoCMSMenuAdapterFromAny(service any) *GoCMSMenuAdapter {
	if service == nil {
		return nil
	}
	return &GoCMSMenuAdapter{service: service}
}

// CreateMenu delegates to the underlying go-cms service.
func (a *GoCMSMenuAdapter) CreateMenu(ctx context.Context, code string) (*Menu, error) {
	if a == nil || a.service == nil {
		return nil, ErrNotFound
	}
	method := a.method("CreateMenu")
	if !method.IsValid() {
		return nil, ErrNotFound
	}

	input, err := a.buildCreateMenuInput(method.Type().In(1), sanitizeMenuCode(code))
	if err != nil {
		return nil, err
	}

	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), input})
	if err := extractError(results); err != nil {
		return nil, err
	}

	menu := &Menu{Code: code}
	if len(results) > 0 && results[0].IsValid() && !results[0].IsNil() {
		menu = convertGoCMSMenu(results[0])
	}
	return menu, nil
}

// AddMenuItem inserts a menu item using the go-cms menu service.
func (a *GoCMSMenuAdapter) AddMenuItem(ctx context.Context, menuCode string, item MenuItem) error {
	if a == nil || a.service == nil {
		return ErrNotFound
	}
	method := a.method("AddMenuItem")
	if !method.IsValid() {
		return ErrNotFound
	}
	menuID, err := a.menuID(ctx, menuCode)
	if err != nil {
		return err
	}
	input, err := a.buildAddMenuItemInput(method.Type().In(1), menuID, item)
	if err != nil {
		return err
	}
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), input})
	return extractError(results)
}

// UpdateMenuItem updates an item target/position and refreshes the translation for the provided locale when present.
func (a *GoCMSMenuAdapter) UpdateMenuItem(ctx context.Context, menuCode string, item MenuItem) error {
	if a == nil || a.service == nil {
		return ErrNotFound
	}
	if _, err := a.menuID(ctx, menuCode); err != nil {
		return err
	}
	itemID, err := uuid.Parse(strings.TrimSpace(item.ID))
	if err != nil {
		return err
	}

	method := a.method("UpdateMenuItem")
	if !method.IsValid() {
		return ErrNotFound
	}
	input, err := a.buildUpdateMenuItemInput(method.Type().In(1), itemID, item)
	if err != nil {
		return err
	}
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), input})
	if err := extractError(results); err != nil {
		return err
	}

	if strings.TrimSpace(item.Label) == "" || item.Locale == "" {
		return nil
	}
	return a.upsertTranslation(ctx, itemID, item.Locale, item.Label)
}

// DeleteMenuItem removes an item via the go-cms menu service.
func (a *GoCMSMenuAdapter) DeleteMenuItem(ctx context.Context, menuCode, id string) error {
	if a == nil || a.service == nil {
		return ErrNotFound
	}
	method := a.method("DeleteMenuItem")
	if !method.IsValid() {
		return ErrNotFound
	}
	itemID, err := uuid.Parse(strings.TrimSpace(id))
	if err != nil {
		return err
	}
	input := a.buildDeleteMenuItemInput(method.Type().In(1), itemID)
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), input})
	return extractError(results)
}

// ReorderMenu repositions items while preserving their parents.
func (a *GoCMSMenuAdapter) ReorderMenu(ctx context.Context, menuCode string, orderedIDs []string) error {
	if a == nil || a.service == nil {
		return ErrNotFound
	}
	method := a.method("BulkReorderMenuItems")
	if !method.IsValid() {
		return ErrNotFound
	}
	menu, err := a.menu(ctx, menuCode)
	if err != nil {
		return err
	}
	menuID, ok := extractUUID(menu, "ID")
	if !ok {
		return ErrNotFound
	}
	parentMap := collectMenuParents(menu)
	input := a.buildReorderInput(method.Type().In(1), menuID, parentMap, orderedIDs)
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), input})
	return extractError(results)
}

// Menu resolves a localized navigation tree from go-cms.
func (a *GoCMSMenuAdapter) Menu(ctx context.Context, code, locale string) (*Menu, error) {
	if a == nil || a.service == nil {
		return nil, ErrNotFound
	}
	method := a.method("ResolveNavigation")
	if !method.IsValid() {
		return nil, ErrNotFound
	}
	normalizedCode := sanitizeMenuCode(code)
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), reflect.ValueOf(normalizedCode), reflect.ValueOf(locale)})
	if err := extractError(results); err != nil {
		return nil, err
	}
	if len(results) == 0 || !results[0].IsValid() {
		return &Menu{Code: code}, nil
	}
	items := convertNavigationNodes(results[0], locale)
	return &Menu{Code: code, Items: items}, nil
}

func (a *GoCMSMenuAdapter) method(name string) reflect.Value {
	if a == nil || a.service == nil {
		return reflect.Value{}
	}
	return reflect.ValueOf(a.service).MethodByName(name)
}

func (a *GoCMSMenuAdapter) buildCreateMenuInput(t reflect.Type, code string) (reflect.Value, error) {
	val := reflect.New(t).Elem()
	setStringField(val, "Code", code)
	setUUIDField(val, "CreatedBy", uuid.Nil)
	setUUIDField(val, "UpdatedBy", uuid.Nil)
	return val, nil
}

func (a *GoCMSMenuAdapter) buildAddMenuItemInput(t reflect.Type, menuID uuid.UUID, item MenuItem) (reflect.Value, error) {
	label := strings.TrimSpace(item.Label)
	if label == "" {
		if lbl, ok := item.Target["label"].(string); ok && strings.TrimSpace(lbl) != "" {
			label = strings.TrimSpace(lbl)
		} else {
			return reflect.Value{}, errors.New("menu item label required")
		}
	}
	val := reflect.New(t).Elem()
	setUUIDValue(val.FieldByName("MenuID"), menuID)
	if parent, err := uuidFromString(item.ParentID); err == nil && parent != nil {
		setUUIDPtr(val.FieldByName("ParentID"), parent)
	}
	if item.Position > 0 {
		setIntField(val, "Position", item.Position)
	}
	target := mergeMenuTarget(item)
	setMapField(val, "Target", target)
	setUUIDField(val, "CreatedBy", uuid.Nil)
	setUUIDField(val, "UpdatedBy", uuid.Nil)

	translations := buildTranslations(val.FieldByName("Translations").Type(), label, item.Locale)
	if translations.IsValid() {
		val.FieldByName("Translations").Set(translations)
	}
	if strings.TrimSpace(item.Locale) == "" {
		setBoolField(val, "AllowMissingTranslations", true)
	}
	return val, nil
}

func (a *GoCMSMenuAdapter) buildUpdateMenuItemInput(t reflect.Type, itemID uuid.UUID, item MenuItem) (reflect.Value, error) {
	val := reflect.New(t).Elem()
	setUUIDValue(val.FieldByName("ItemID"), itemID)
	if item.Position > 0 {
		setIntPtr(val.FieldByName("Position"), item.Position)
	}
	if parent, err := uuidFromString(item.ParentID); err == nil && parent != nil {
		setUUIDPtr(val.FieldByName("ParentID"), parent)
	}
	target := mergeMenuTarget(item)
	setMapField(val, "Target", target)
	setUUIDField(val, "UpdatedBy", uuid.Nil)
	return val, nil
}

func (a *GoCMSMenuAdapter) buildDeleteMenuItemInput(t reflect.Type, itemID uuid.UUID) reflect.Value {
	val := reflect.New(t).Elem()
	setUUIDValue(val.FieldByName("ItemID"), itemID)
	setBoolField(val, "CascadeChildren", true)
	setUUIDField(val, "DeletedBy", uuid.Nil)
	return val
}

func (a *GoCMSMenuAdapter) buildReorderInput(t reflect.Type, menuID uuid.UUID, parents map[string]*uuid.UUID, orderedIDs []string) reflect.Value {
	val := reflect.New(t).Elem()
	setUUIDValue(val.FieldByName("MenuID"), menuID)
	setUUIDField(val, "UpdatedBy", uuid.Nil)
	itemsField := val.FieldByName("Items")
	if itemsField.IsValid() && itemsField.Kind() == reflect.Slice {
		slice := reflect.MakeSlice(itemsField.Type(), 0, len(orderedIDs))
		for idx, id := range orderedIDs {
			elem := reflect.New(itemsField.Type().Elem()).Elem()
			if parsed, err := uuid.Parse(strings.TrimSpace(id)); err == nil {
				setUUIDValue(elem.FieldByName("ItemID"), parsed)
			}
			if parent := parents[strings.TrimSpace(id)]; parent != nil {
				setUUIDPtr(elem.FieldByName("ParentID"), parent)
			}
			setIntField(elem, "Position", idx+1)
			slice = reflect.Append(slice, elem)
		}
		itemsField.Set(slice)
	}
	return val
}

func (a *GoCMSMenuAdapter) menuID(ctx context.Context, code string) (uuid.UUID, error) {
	menu, err := a.menu(ctx, code)
	if err != nil {
		return uuid.Nil, err
	}
	if id, ok := extractUUID(menu, "ID"); ok {
		return id, nil
	}
	return uuid.Nil, ErrNotFound
}

func (a *GoCMSMenuAdapter) menu(ctx context.Context, code string) (reflect.Value, error) {
	method := a.method("GetMenuByCode")
	if !method.IsValid() {
		return reflect.Value{}, ErrNotFound
	}
	normalized := sanitizeMenuCode(code)
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), reflect.ValueOf(normalized)})
	if err := extractError(results); err != nil {
		return reflect.Value{}, err
	}
	if len(results) == 0 || results[0].IsNil() {
		return reflect.Value{}, ErrNotFound
	}
	return deref(results[0]), nil
}

func (a *GoCMSMenuAdapter) upsertTranslation(ctx context.Context, itemID uuid.UUID, locale, label string) error {
	method := a.method("AddMenuItemTranslation")
	if !method.IsValid() {
		return nil
	}
	t := method.Type().In(1)
	val := reflect.New(t).Elem()
	setUUIDValue(val.FieldByName("ItemID"), itemID)
	setStringField(val, "Locale", locale)
	setStringField(val, "Label", label)
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), val})
	if err := extractError(results); err != nil {
		return err
	}
	return nil
}

func mergeMenuTarget(item MenuItem) map[string]any {
	target := cloneAnyMap(item.Target)
	if target == nil {
		target = map[string]any{}
	}
	if _, ok := target["icon"]; !ok && item.Icon != "" {
		target["icon"] = item.Icon
	}
	if _, ok := target["badge"]; !ok && item.Badge != nil {
		target["badge"] = cloneAnyMap(item.Badge)
	}
	if _, ok := target["classes"]; !ok && len(item.Classes) > 0 {
		target["classes"] = append([]string{}, item.Classes...)
	}
	if _, ok := target["styles"]; !ok && len(item.Styles) > 0 {
		target["styles"] = cloneStringMap(item.Styles)
	}
	if _, ok := target["permissions"]; !ok && len(item.Permissions) > 0 {
		target["permissions"] = append([]string{}, item.Permissions...)
	}
	if _, ok := target["locale"]; !ok && item.Locale != "" {
		target["locale"] = item.Locale
	}
	return target
}

func buildTranslations(sliceType reflect.Type, label, locale string) reflect.Value {
	if sliceType.Kind() != reflect.Slice {
		return reflect.Value{}
	}
	elemType := sliceType.Elem()
	translation := reflect.New(elemType).Elem()
	setStringField(translation, "Locale", locale)
	setStringField(translation, "Label", label)
	slice := reflect.MakeSlice(sliceType, 0, 1)
	return reflect.Append(slice, translation)
}

func convertGoCMSMenu(menuVal reflect.Value) *Menu {
	menuVal = deref(menuVal)
	menu := &Menu{}
	if code := menuVal.FieldByName("Code"); code.IsValid() && code.Kind() == reflect.String {
		menu.Code = code.String()
	}
	if items := menuVal.FieldByName("Items"); items.IsValid() {
		menu.Items = convertNavigationNodes(items, "")
	}
	return menu
}

func convertNavigationNodes(value reflect.Value, locale string) []MenuItem {
	value = deref(value)
	out := []MenuItem{}
	if !value.IsValid() {
		return out
	}
	switch value.Kind() {
	case reflect.Slice:
		for i := 0; i < value.Len(); i++ {
			out = append(out, convertNavigationNode(value.Index(i), locale))
		}
	}
	return out
}

func convertNavigationNode(value reflect.Value, locale string) MenuItem {
	value = deref(value)
	item := MenuItem{}
	if id, ok := extractUUID(value, "ID"); ok {
		item.ID = id.String()
	}
	if label := value.FieldByName("Label"); label.IsValid() && label.Kind() == reflect.String {
		item.Label = label.String()
	}
	if target := value.FieldByName("Target"); target.IsValid() {
		if m, ok := target.Interface().(map[string]any); ok {
			item.Target = cloneAnyMap(m)
		}
	}
	if url := value.FieldByName("URL"); url.IsValid() && url.Kind() == reflect.String && url.String() != "" {
		if item.Target == nil {
			item.Target = map[string]any{}
		}
		if _, ok := item.Target["url"]; !ok {
			item.Target["url"] = url.String()
		}
	}
	if len(item.Target) > 0 {
		applyMetadataFromTarget(&item, locale)
	}
	if children := value.FieldByName("Children"); children.IsValid() {
		item.Children = convertNavigationNodes(children, locale)
	}
	if item.Locale == "" {
		item.Locale = locale
	}
	return item
}

func applyMetadataFromTarget(item *MenuItem, locale string) {
	if item == nil || item.Target == nil {
		return
	}
	if icon, ok := item.Target["icon"].(string); ok && icon != "" {
		item.Icon = icon
	}
	if badge, ok := item.Target["badge"].(map[string]any); ok {
		item.Badge = cloneAnyMap(badge)
	}
	if classes, ok := asStringSlice(item.Target["classes"]); ok {
		item.Classes = classes
	}
	if styles, ok := item.Target["styles"].(map[string]string); ok {
		item.Styles = cloneStringMap(styles)
	} else if raw, ok := item.Target["styles"].(map[string]any); ok {
		item.Styles = map[string]string{}
		for k, v := range raw {
			if str, ok := v.(string); ok {
				item.Styles[k] = str
			}
		}
	}
	if perms, ok := asStringSlice(item.Target["permissions"]); ok {
		item.Permissions = perms
	}
	if loc, ok := item.Target["locale"].(string); ok && strings.TrimSpace(loc) != "" {
		item.Locale = strings.TrimSpace(loc)
	} else if item.Locale == "" {
		item.Locale = locale
	}
}

func asStringSlice(val any) ([]string, bool) {
	switch v := val.(type) {
	case []string:
		return append([]string{}, v...), true
	case []any:
		out := []string{}
		for _, entry := range v {
			if s, ok := entry.(string); ok {
				out = append(out, s)
			}
		}
		return out, len(out) > 0
	default:
		return nil, false
	}
}

func extractError(results []reflect.Value) error {
	if len(results) == 0 {
		return nil
	}
	last := results[len(results)-1]
	if !last.IsValid() || last.IsNil() {
		return nil
	}
	if err, ok := last.Interface().(error); ok {
		return err
	}
	return nil
}

func extractUUID(val reflect.Value, field string) (uuid.UUID, bool) {
	val = deref(val)
	if !val.IsValid() {
		return uuid.Nil, false
	}
	if (val.Kind() == reflect.Struct || val.Kind() == reflect.Array) && val.Type().PkgPath() == "github.com/google/uuid" && val.Type().Name() == "UUID" {
		if id, ok := val.Interface().(uuid.UUID); ok {
			return id, true
		}
	}
	if f := val.FieldByName(field); f.IsValid() {
		switch f.Kind() {
		case reflect.Array:
			if f.Type().PkgPath() == "github.com/google/uuid" && f.Type().Name() == "UUID" {
				if id, ok := f.Interface().(uuid.UUID); ok {
					return id, true
				}
			}
		case reflect.Struct:
			if f.Type().PkgPath() == "github.com/google/uuid" && f.Type().Name() == "UUID" {
				if id, ok := f.Interface().(uuid.UUID); ok {
					return id, true
				}
			}
		case reflect.Pointer:
			if f.Type().Elem().PkgPath() == "github.com/google/uuid" && f.Type().Elem().Name() == "UUID" && !f.IsNil() {
				if id, ok := f.Elem().Interface().(uuid.UUID); ok {
					return id, true
				}
			}
			if !f.IsNil() {
				return extractUUID(f.Elem(), field)
			}
		}
	}
	return uuid.Nil, false
}

func deref(val reflect.Value) reflect.Value {
	for val.IsValid() && val.Kind() == reflect.Pointer {
		val = val.Elem()
	}
	return val
}

func setStringField(val reflect.Value, name string, value string) {
	if !val.IsValid() {
		return
	}
	f := val.FieldByName(name)
	if f.IsValid() && f.Kind() == reflect.String && f.CanSet() {
		f.SetString(value)
	}
}

func setUUIDField(val reflect.Value, name string, id uuid.UUID) {
	if !val.IsValid() {
		return
	}
	f := val.FieldByName(name)
	setUUIDValue(f, id)
}

func setUUIDValue(val reflect.Value, id uuid.UUID) {
	if !val.IsValid() || !val.CanSet() {
		return
	}
	switch val.Kind() {
	case reflect.Struct, reflect.Array:
		if val.Type().PkgPath() == "github.com/google/uuid" && val.Type().Name() == "UUID" {
			val.Set(reflect.ValueOf(id))
		}
	case reflect.Pointer:
		ptr := reflect.New(val.Type().Elem())
		setUUIDValue(ptr.Elem(), id)
		val.Set(ptr)
	}
}

func setUUIDPtr(val reflect.Value, id *uuid.UUID) {
	if !val.IsValid() || id == nil {
		return
	}
	if val.Kind() == reflect.Pointer && val.CanSet() {
		ptr := reflect.New(val.Type().Elem())
		setUUIDValue(ptr.Elem(), *id)
		val.Set(ptr)
	}
}

func setMapField(val reflect.Value, name string, data map[string]any) {
	if !val.IsValid() || data == nil {
		return
	}
	f := val.FieldByName(name)
	if f.IsValid() && f.CanSet() && f.Kind() == reflect.Map {
		f.Set(reflect.ValueOf(data))
	}
}

func setIntField(val reflect.Value, name string, value int) {
	if !val.IsValid() {
		return
	}
	f := val.FieldByName(name)
	if f.IsValid() && f.CanSet() && f.Kind() == reflect.Int {
		f.SetInt(int64(value))
	}
}

func setIntPtr(val reflect.Value, value int) {
	if !val.IsValid() || !val.CanSet() {
		return
	}
	switch val.Kind() {
	case reflect.Pointer:
		ptr := reflect.New(val.Type().Elem())
		if ptr.Elem().Kind() == reflect.Int {
			ptr.Elem().SetInt(int64(value))
			val.Set(ptr)
		}
	}
}

func setBoolField(val reflect.Value, name string, value bool) {
	if !val.IsValid() {
		return
	}
	f := val.FieldByName(name)
	if f.IsValid() && f.CanSet() && f.Kind() == reflect.Bool {
		f.SetBool(value)
	}
}

func uuidFromString(id string) (*uuid.UUID, error) {
	trimmed := strings.TrimSpace(id)
	if trimmed == "" {
		return nil, nil
	}
	parsed, err := uuid.Parse(trimmed)
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}

func collectMenuParents(menu reflect.Value) map[string]*uuid.UUID {
	menu = deref(menu)
	result := map[string]*uuid.UUID{}
	items := menu.FieldByName("Items")
	collectItemParents(items, nil, result)
	return result
}

func collectItemParents(items reflect.Value, parent *uuid.UUID, dest map[string]*uuid.UUID) {
	items = deref(items)
	if !items.IsValid() || items.Kind() != reflect.Slice {
		return
	}
	for i := 0; i < items.Len(); i++ {
		item := deref(items.Index(i))
		currentParent := parent
		if pField := item.FieldByName("ParentID"); pField.IsValid() && pField.Kind() == reflect.Pointer && !pField.IsNil() {
			if pid, ok := pField.Interface().(*uuid.UUID); ok {
				currentParent = pid
			}
		}
		id, ok := extractUUID(item, "ID")
		if ok {
			dest[id.String()] = currentParent
		}
		children := item.FieldByName("Children")
		collectItemParents(children, currentParent, dest)
	}
}

func (a *GoCMSMenuAdapter) String() string {
	return fmt.Sprintf("GoCMSMenuAdapter{%T}", a.service)
}

func sanitizeMenuCode(code string) string {
	trimmed := strings.TrimSpace(code)
	normalized := strings.Map(func(r rune) rune {
		switch {
		case unicode.IsLetter(r), unicode.IsDigit(r), r == '-', r == '_':
			return r
		default:
			return '_'
		}
	}, trimmed)
	if normalized == "" {
		return trimmed
	}
	return normalized
}

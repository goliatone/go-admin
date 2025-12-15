package admin

import (
	"context"
	"errors"
	"fmt"
	"reflect"
	"strings"

	"github.com/google/uuid"
)

// GoCMSWidgetAdapter maps the go-cms widget service into CMSWidgetService using reflection.
type GoCMSWidgetAdapter struct {
	service     any
	definitions map[string]uuid.UUID
	idToCode    map[uuid.UUID]string
}

// NewGoCMSWidgetAdapter wraps a go-cms WidgetService (or compatible type).
func NewGoCMSWidgetAdapter(service any) *GoCMSWidgetAdapter {
	if service == nil {
		return nil
	}
	return &GoCMSWidgetAdapter{service: service, definitions: map[string]uuid.UUID{}, idToCode: map[uuid.UUID]string{}}
}

func minimalWidgetSchema() map[string]any {
	return map[string]any{"fields": []any{}}
}

func normalizeWidgetDefinition(def WidgetDefinition) (code string, displayName string, schema map[string]any) {
	code = strings.TrimSpace(def.Code)
	if code == "" {
		code = strings.TrimSpace(def.Name)
	}
	displayName = strings.TrimSpace(def.Name)
	if displayName == "" {
		displayName = code
	}
	schema = def.Schema
	if len(schema) == 0 {
		schema = minimalWidgetSchema()
	}
	return code, displayName, schema
}

func (a *GoCMSWidgetAdapter) RegisterAreaDefinition(ctx context.Context, def WidgetAreaDefinition) error {
	if a == nil || a.service == nil {
		return ErrNotFound
	}
	method := reflect.ValueOf(a.service).MethodByName("RegisterAreaDefinition")
	if !method.IsValid() {
		return ErrNotFound
	}
	input := reflect.New(method.Type().In(1)).Elem()
	setStringField(input, "Code", def.Code)
	setStringField(input, "Name", def.Name)
	if def.Scope != "" {
		setStringField(input, "Scope", def.Scope)
	}
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), input})
	return extractError(results)
}

func (a *GoCMSWidgetAdapter) RegisterDefinition(ctx context.Context, def WidgetDefinition) error {
	if a == nil || a.service == nil {
		return ErrNotFound
	}
	method := reflect.ValueOf(a.service).MethodByName("RegisterDefinition")
	if !method.IsValid() {
		return ErrNotFound
	}
	code, displayName, schema := normalizeWidgetDefinition(def)
	if code == "" {
		return fmt.Errorf("widget definition code is required")
	}
	input := reflect.New(method.Type().In(1)).Elem()
	// go-cms widget definitions don't expose a stable "code" field; persist go-admin's
	// provider code in Name so it can be used as a durable identifier.
	setStringField(input, "Name", code)
	setStringPtr(input.FieldByName("Description"), displayName)
	setMapField(input, "Schema", schema)
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), input})
	if err := extractError(results); err != nil {
		return err
	}
	if len(results) > 0 {
		if id, ok := extractUUID(results[0], "ID"); ok {
			a.definitions[code] = id
			a.idToCode[id] = code
		}
	}
	return nil
}

func (a *GoCMSWidgetAdapter) DeleteDefinition(ctx context.Context, code string) error {
	if a == nil || a.service == nil {
		return ErrNotFound
	}
	method := reflect.ValueOf(a.service).MethodByName("DeleteDefinition")
	if !method.IsValid() {
		return ErrNotFound
	}
	code = strings.TrimSpace(code)
	a.refreshDefinitions(ctx)
	id, ok := a.definitions[code]
	if !ok {
		return ErrNotFound
	}
	input := reflect.New(method.Type().In(1)).Elem()
	setUUIDField(input, "ID", id)
	setBoolField(input, "HardDelete", true)
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), input})
	return extractError(results)
}

func (a *GoCMSWidgetAdapter) Areas() []WidgetAreaDefinition {
	method := reflect.ValueOf(a.service).MethodByName("ListAreaDefinitions")
	if !method.IsValid() {
		return nil
	}
	results := method.Call([]reflect.Value{reflect.ValueOf(context.Background())})
	if err := extractError(results); err != nil {
		return nil
	}
	if len(results) == 0 {
		return nil
	}
	value := deref(results[0])
	areas := []WidgetAreaDefinition{}
	switch value.Kind() {
	case reflect.Slice:
		for i := 0; i < value.Len(); i++ {
			areas = append(areas, convertAreaDefinition(value.Index(i)))
		}
	}
	return areas
}

func (a *GoCMSWidgetAdapter) Definitions() []WidgetDefinition {
	method := reflect.ValueOf(a.service).MethodByName("ListDefinitions")
	if !method.IsValid() {
		return nil
	}
	results := method.Call([]reflect.Value{reflect.ValueOf(context.Background())})
	if err := extractError(results); err != nil {
		return nil
	}
	if len(results) == 0 {
		return nil
	}
	value := deref(results[0])
	defs := []WidgetDefinition{}
	switch value.Kind() {
	case reflect.Slice:
		for i := 0; i < value.Len(); i++ {
			def := convertWidgetDefinition(value.Index(i))
			if def.Code != "" {
				if id, ok := extractUUID(deref(value.Index(i)), "ID"); ok {
					a.definitions[def.Code] = id
					a.idToCode[id] = def.Code
				}
			}
			defs = append(defs, def)
		}
	}
	return defs
}

func (a *GoCMSWidgetAdapter) SaveInstance(ctx context.Context, instance WidgetInstance) (*WidgetInstance, error) {
	if a == nil || a.service == nil {
		return nil, fmt.Errorf("adapter or service nil")
	}
	defCode := strings.TrimSpace(instance.DefinitionCode)
	a.refreshDefinitions(ctx)
	defID, ok := a.definitions[defCode]
	if !ok {
		return nil, fmt.Errorf("definition %q not found in cache (have %d definitions)", defCode, len(a.definitions))
	}
	if strings.TrimSpace(instance.Area) != "" {
		_ = a.RegisterAreaDefinition(ctx, WidgetAreaDefinition{Code: instance.Area, Name: instance.Area, Scope: "global"})
	}
	if strings.TrimSpace(instance.ID) == "" {
		return a.createInstance(ctx, defID, instance)
	}
	return a.updateInstance(ctx, instance)
}

func (a *GoCMSWidgetAdapter) createInstance(ctx context.Context, defID uuid.UUID, instance WidgetInstance) (*WidgetInstance, error) {
	if defID == uuid.Nil {
		return nil, fmt.Errorf("createInstance called with nil defID for instance code=%q", instance.DefinitionCode)
	}
	method := reflect.ValueOf(a.service).MethodByName("CreateInstance")
	if !method.IsValid() {
		return nil, fmt.Errorf("CreateInstance method not found")
	}
	input := reflect.New(method.Type().In(1)).Elem()
	setUUIDField(input, "DefinitionID", defID)
	if strings.TrimSpace(instance.Area) != "" {
		setStringPtr(input.FieldByName("AreaCode"), instance.Area)
	}
	if instance.Position > 0 {
		setIntField(input, "Position", instance.Position)
	}
	if instance.Span > 0 {
		setIntField(input, "Span", instance.Span)
	}
	setBoolField(input, "Hidden", instance.Hidden)
	setMapField(input, "Configuration", cloneAnyMap(instance.Config))
	actor := actorUUID(ctx)
	setUUIDField(input, "CreatedBy", actor)
	setUUIDField(input, "UpdatedBy", actor)
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), input})
	if err := extractError(results); err != nil {
		return nil, err
	}
	if len(results) == 0 {
		return nil, errors.New("widget instance not returned")
	}
	converted := convertWidgetInstance(results[0])
	converted.DefinitionCode = strings.TrimSpace(instance.DefinitionCode)
	return &converted, nil
}

func (a *GoCMSWidgetAdapter) updateInstance(ctx context.Context, instance WidgetInstance) (*WidgetInstance, error) {
	method := reflect.ValueOf(a.service).MethodByName("UpdateInstance")
	if !method.IsValid() {
		return nil, ErrNotFound
	}
	uid, err := uuid.Parse(strings.TrimSpace(instance.ID))
	if err != nil {
		return nil, err
	}
	input := reflect.New(method.Type().In(1)).Elem()
	setUUIDValue(input.FieldByName("InstanceID"), uid)
	setMapField(input, "Configuration", cloneAnyMap(instance.Config))
	if instance.Position > 0 {
		setIntPtr(input.FieldByName("Position"), instance.Position)
	}
	if instance.Span > 0 {
		setIntPtr(input.FieldByName("Span"), instance.Span)
	}
	setBoolPtr(input.FieldByName("Hidden"), instance.Hidden)
	if strings.TrimSpace(instance.Area) != "" {
		setStringPtr(input.FieldByName("AreaCode"), instance.Area)
	}
	actor := actorUUID(ctx)
	setUUIDField(input, "UpdatedBy", actor)
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), input})
	if err := extractError(results); err != nil {
		return nil, err
	}
	if len(results) == 0 {
		return nil, errors.New("widget instance not returned")
	}
	converted := convertWidgetInstance(results[0])
	converted.DefinitionCode = strings.TrimSpace(instance.DefinitionCode)
	return &converted, nil
}

func (a *GoCMSWidgetAdapter) DeleteInstance(ctx context.Context, id string) error {
	if a == nil || a.service == nil {
		return ErrNotFound
	}
	method := reflect.ValueOf(a.service).MethodByName("DeleteInstance")
	if !method.IsValid() {
		return ErrNotFound
	}
	uid, err := uuid.Parse(strings.TrimSpace(id))
	if err != nil {
		return err
	}
	input := reflect.New(method.Type().In(1)).Elem()
	setUUIDValue(input.FieldByName("InstanceID"), uid)
	setUUIDField(input, "DeletedBy", actorUUID(ctx))
	setBoolField(input, "HardDelete", true)
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx), input})
	return extractError(results)
}

func (a *GoCMSWidgetAdapter) ListInstances(ctx context.Context, filter WidgetInstanceFilter) ([]WidgetInstance, error) {
	if a == nil || a.service == nil {
		return nil, ErrNotFound
	}
	a.refreshDefinitions(ctx)
	var method reflect.Value
	if filter.Area != "" {
		method = reflect.ValueOf(a.service).MethodByName("ListInstancesByArea")
	} else {
		method = reflect.ValueOf(a.service).MethodByName("ListAllInstances")
	}
	if !method.IsValid() {
		return nil, ErrNotFound
	}
	args := []reflect.Value{reflect.ValueOf(ctx)}
	if filter.Area != "" {
		args = append(args, reflect.ValueOf(filter.Area))
	}
	results := method.Call(args)
	if err := extractError(results); err != nil {
		return nil, err
	}
	if len(results) == 0 {
		return nil, nil
	}
	value := deref(results[0])
	out := []WidgetInstance{}
	switch value.Kind() {
	case reflect.Slice:
		for i := 0; i < value.Len(); i++ {
			inst := convertWidgetInstance(value.Index(i))
			if defID, ok := extractUUID(value.Index(i), "DefinitionID"); ok {
				if code, ok := a.idToCode[defID]; ok {
					inst.DefinitionCode = code
				}
			}
			out = append(out, inst)
		}
	}
	return out, nil
}

func (a *GoCMSWidgetAdapter) refreshDefinitions(ctx context.Context) {
	if a == nil || a.service == nil {
		return
	}
	if ctx == nil {
		ctx = context.Background()
	}
	method := reflect.ValueOf(a.service).MethodByName("ListDefinitions")
	if !method.IsValid() {
		return
	}
	results := method.Call([]reflect.Value{reflect.ValueOf(ctx)})
	if err := extractError(results); err != nil {
		return
	}
	if len(results) == 0 || !results[0].IsValid() {
		return
	}
	value := deref(results[0])
	if value.Kind() != reflect.Slice {
		return
	}
	for i := 0; i < value.Len(); i++ {
		item := deref(value.Index(i))
		if !item.IsValid() {
			continue
		}
		id, ok := extractUUID(item, "ID")
		if !ok || id == uuid.Nil {
			continue
		}
		name, ok := getStringField(item, "Name")
		if !ok {
			continue
		}
		code := strings.TrimSpace(name)
		if code == "" {
			continue
		}
		a.definitions[code] = id
		a.idToCode[id] = code
	}
}

func convertAreaDefinition(val reflect.Value) WidgetAreaDefinition {
	val = deref(val)
	def := WidgetAreaDefinition{}
	if code, ok := getStringField(val, "Code"); ok {
		def.Code = code
	}
	if name, ok := getStringField(val, "Name"); ok {
		def.Name = name
	}
	if scope, ok := getStringField(val, "Scope"); ok {
		def.Scope = scope
	}
	return def
}

func convertWidgetDefinition(val reflect.Value) WidgetDefinition {
	val = deref(val)
	def := WidgetDefinition{}
	if name, ok := getStringField(val, "Name"); ok {
		code := strings.TrimSpace(name)
		def.Code = code
		def.Name = code
	}
	if schemaField := val.FieldByName("Schema"); schemaField.IsValid() {
		if schema, ok := schemaField.Interface().(map[string]any); ok {
			def.Schema = cloneAnyMap(schema)
		}
	}
	return def
}

func convertWidgetInstance(val reflect.Value) WidgetInstance {
	val = deref(val)
	inst := WidgetInstance{}
	if id, ok := extractUUID(val, "ID"); ok {
		inst.ID = id.String()
	}
	if defID, ok := extractUUID(val, "DefinitionID"); ok {
		inst.DefinitionCode = defID.String()
	}
	if areaPtr := val.FieldByName("AreaCode"); areaPtr.IsValid() {
		area := deref(areaPtr)
		if area.IsValid() && area.Kind() == reflect.String {
			inst.Area = area.String()
		}
	}
	if config := val.FieldByName("Configuration"); config.IsValid() {
		if data, ok := config.Interface().(map[string]any); ok {
			inst.Config = cloneAnyMap(data)
		}
	}
	if pos, ok := getIntField(val, "Position"); ok {
		inst.Position = pos
	}
	if span, ok := getIntField(val, "Span"); ok {
		inst.Span = span
	}
	if hidden, ok := getBoolField(val, "Hidden"); ok {
		inst.Hidden = hidden
	}
	return inst
}

func actorUUID(ctx context.Context) uuid.UUID {
	if parsed, err := uuid.Parse(strings.TrimSpace(actorFromContext(ctx))); err == nil {
		return parsed
	}
	return uuid.New()
}

func getStringField(val reflect.Value, name string) (string, bool) {
	f := val.FieldByName(name)
	if f.IsValid() && f.Kind() == reflect.String {
		return f.String(), true
	}
	return "", false
}

func getIntField(val reflect.Value, name string) (int, bool) {
	f := val.FieldByName(name)
	if f.IsValid() && f.Kind() == reflect.Int {
		return int(f.Int()), true
	}
	return 0, false
}

func getBoolField(val reflect.Value, name string) (bool, bool) {
	f := val.FieldByName(name)
	if f.IsValid() && f.Kind() == reflect.Bool {
		return f.Bool(), true
	}
	return false, false
}

// func setStringPtr(field reflect.Value, value string) {
// 	if !field.IsValid() || !field.CanSet() {
// 		return
// 	}
// 	switch field.Kind() {
// 	case reflect.Pointer:
// 		ptr := reflect.New(field.Type().Elem())
// 		if ptr.Elem().Kind() == reflect.String {
// 			ptr.Elem().SetString(value)
// 			field.Set(ptr)
// 		}
// 	}
// }

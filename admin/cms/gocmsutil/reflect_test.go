package gocmsutil

import (
	"reflect"
	"testing"

	"github.com/google/uuid"
)

type reflectHelperRecord struct {
	ID       uuid.UUID
	ParentID *uuid.UUID
	Metadata map[string]any
	Name     string
	Position int
}

func TestDerefHandlesPointersAndInterfaces(t *testing.T) {
	record := &reflectHelperRecord{Name: "home"}
	var wrapped any = record

	val := Deref(reflect.ValueOf(wrapped))
	if !val.IsValid() || val.Kind() != reflect.Struct {
		t.Fatalf("expected dereferenced struct value, got %v", val.Kind())
	}
	if val.FieldByName("Name").String() != "home" {
		t.Fatalf("expected dereferenced name, got %q", val.FieldByName("Name").String())
	}
}

func TestExtractUUIDReadsDirectAndPointerFields(t *testing.T) {
	parentID := uuid.New()
	record := reflectHelperRecord{
		ID:       uuid.New(),
		ParentID: &parentID,
	}

	if parsed, ok := ExtractUUID(reflect.ValueOf(record), "ID"); !ok || parsed != record.ID {
		t.Fatalf("expected direct uuid %s, got %s ok=%v", record.ID, parsed, ok)
	}
	if parsed, ok := ExtractUUID(reflect.ValueOf(&record), "ParentID"); !ok || parsed != parentID {
		t.Fatalf("expected pointer uuid %s, got %s ok=%v", parentID, parsed, ok)
	}
}

func TestMapFieldAnyReturnsCloneForStringMaps(t *testing.T) {
	record := reflectHelperRecord{
		Metadata: map[string]any{"title": "Home"},
	}

	cloned := MapFieldAny(reflect.ValueOf(record), "Metadata")
	if cloned["title"] != "Home" {
		t.Fatalf("expected title Home, got %v", cloned["title"])
	}
	cloned["title"] = "Changed"
	if record.Metadata["title"] != "Home" {
		t.Fatalf("expected source map to remain unchanged, got %v", record.Metadata["title"])
	}
}

func TestSettersAndGetIntFieldApplyOnlyCompatibleFields(t *testing.T) {
	record := &reflectHelperRecord{}
	val := reflect.ValueOf(record)

	SetStringField(val, "Name", "about")
	SetMapField(val, "Metadata", map[string]any{"path": "/about"})

	if record.Name != "about" {
		t.Fatalf("expected updated name, got %q", record.Name)
	}
	if record.Metadata["path"] != "/about" {
		t.Fatalf("expected updated metadata, got %v", record.Metadata["path"])
	}
	record.Position = 4
	if pos, ok := GetIntField(val, "Position"); !ok || pos != 4 {
		t.Fatalf("expected position 4, got %d ok=%v", pos, ok)
	}
}

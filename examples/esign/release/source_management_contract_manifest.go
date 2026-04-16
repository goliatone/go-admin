package release

import (
	"encoding/json"
	"fmt"
	"path/filepath"
	"reflect"
	"runtime"
	"sort"
	"strings"

	"github.com/goliatone/go-admin/examples/esign/services"
)

const (
	v2SourceManagementContractManifestSchemaVersion = 1
)

type V2SourceManagementContractManifest struct {
	SchemaVersion int                                `json:"schema_version"`
	ContractSet   string                             `json:"contract_set"`
	GeneratedFrom []string                           `json:"generated_from"`
	Endpoints     []V2SourceManagementContractRoute  `json:"endpoints"`
	Schemas       []V2SourceManagementContractSchema `json:"schemas"`
}

type V2SourceManagementContractRoute struct {
	Method         string   `json:"method"`
	Path           string   `json:"path"`
	PathParams     []string `json:"path_params,omitempty"`
	QuerySchema    string   `json:"query_schema,omitempty"`
	RequestSchema  string   `json:"request_schema,omitempty"`
	ResponseSchema string   `json:"response_schema"`
}

type V2SourceManagementContractSchema struct {
	Name   string                                 `json:"name"`
	Kind   string                                 `json:"kind"`
	Fields []V2SourceManagementContractFieldShape `json:"fields,omitempty"`
}

type V2SourceManagementContractFieldShape struct {
	Name     string `json:"name"`
	Optional bool   `json:"optional"`
	Type     string `json:"type"`
	Ref      string `json:"ref,omitempty"`
	Key      string `json:"key,omitempty"`
	Value    string `json:"value,omitempty"`
}

func BuildV2SourceManagementContractManifest() V2SourceManagementContractManifest {
	schemaTypes := collectV2SourceManagementSchemaTypes()
	schemas := make([]V2SourceManagementContractSchema, 0, len(schemaTypes))
	for _, schemaType := range schemaTypes {
		schemas = append(schemas, buildV2ContractSchema(schemaType))
	}
	sort.SliceStable(schemas, func(i, j int) bool {
		return schemas[i].Name < schemas[j].Name
	})

	return V2SourceManagementContractManifest{
		SchemaVersion: v2SourceManagementContractManifestSchemaVersion,
		ContractSet:   "v2_source_management",
		GeneratedFrom: []string{
			"examples/esign/services/lineage_contracts.go",
			"examples/esign/handlers/register_lineage_routes.go",
		},
		Endpoints: []V2SourceManagementContractRoute{
			{Method: "GET", Path: services.DefaultSourceManagementBasePath + "/sources", QuerySchema: "SourceListQuery", ResponseSchema: "SourceListPage"},
			{Method: "GET", Path: services.DefaultSourceManagementBasePath + "/sources/:source_document_id", PathParams: []string{"source_document_id"}, ResponseSchema: "SourceDetail"},
			{Method: "GET", Path: services.DefaultSourceManagementBasePath + "/sources/:source_document_id/workspace", PathParams: []string{"source_document_id"}, QuerySchema: "SourceWorkspaceQuery", ResponseSchema: "SourceWorkspace"},
			{Method: "GET", Path: services.DefaultSourceManagementBasePath + "/sources/:source_document_id/revisions", PathParams: []string{"source_document_id"}, QuerySchema: "SourceRevisionListQuery", ResponseSchema: "SourceRevisionPage"},
			{Method: "GET", Path: services.DefaultSourceManagementBasePath + "/sources/:source_document_id/relationships", PathParams: []string{"source_document_id"}, QuerySchema: "SourceRelationshipListQuery", ResponseSchema: "SourceRelationshipPage"},
			{Method: "GET", Path: services.DefaultSourceManagementBasePath + "/sources/:source_document_id/agreements", PathParams: []string{"source_document_id"}, QuerySchema: "SourceAgreementListQuery", ResponseSchema: "SourceAgreementPage"},
			{Method: "GET", Path: services.DefaultSourceManagementBasePath + "/sources/:source_document_id/handles", PathParams: []string{"source_document_id"}, ResponseSchema: "SourceHandlePage"},
			{Method: "GET", Path: services.DefaultSourceManagementBasePath + "/sources/:source_document_id/comments", PathParams: []string{"source_document_id"}, QuerySchema: "SourceCommentListQuery", ResponseSchema: "SourceCommentPage"},
			{Method: "GET", Path: services.DefaultSourceManagementBasePath + "/source-revisions/:source_revision_id", PathParams: []string{"source_revision_id"}, ResponseSchema: "SourceRevisionDetail"},
			{Method: "GET", Path: services.DefaultSourceManagementBasePath + "/source-revisions/:source_revision_id/artifacts", PathParams: []string{"source_revision_id"}, ResponseSchema: "SourceArtifactPage"},
			{Method: "GET", Path: services.DefaultSourceManagementBasePath + "/source-revisions/:source_revision_id/comments", PathParams: []string{"source_revision_id"}, QuerySchema: "SourceCommentListQuery", ResponseSchema: "SourceCommentPage"},
			{Method: "GET", Path: services.DefaultSourceManagementBasePath + "/source-search", QuerySchema: "SourceSearchQuery", ResponseSchema: "SourceSearchResults"},
			{Method: "GET", Path: services.DefaultSourceManagementBasePath + "/reconciliation-queue", QuerySchema: "ReconciliationQueueQuery", ResponseSchema: "ReconciliationQueuePage"},
			{Method: "GET", Path: services.DefaultSourceManagementBasePath + "/reconciliation-queue/:relationship_id", PathParams: []string{"relationship_id"}, ResponseSchema: "ReconciliationCandidateDetail"},
			{Method: "POST", Path: services.DefaultSourceManagementBasePath + "/reconciliation-queue/:relationship_id/review", PathParams: []string{"relationship_id"}, RequestSchema: "ReconciliationReviewRequest", ResponseSchema: "ReconciliationReviewResponse"},
		},
		Schemas: schemas,
	}
}

func MarshalV2SourceManagementContractManifest() ([]byte, error) {
	manifest := BuildV2SourceManagementContractManifest()
	return json.MarshalIndent(manifest, "", "  ")
}

func DefaultRepoRoot() (string, error) {
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		return "", fmt.Errorf("resolve repo root: runtime caller unavailable")
	}
	return filepath.Clean(filepath.Join(filepath.Dir(filename), "..", "..", "..")), nil
}

func DefaultV2SourceManagementContractManifestPath(repoRoot string) string {
	return filepath.Join(strings.TrimSpace(repoRoot), "examples/esign/release/v2_source_management_contract_manifest.json")
}

func DefaultV2SourceManagementFixtureSnapshotPath(repoRoot string) string {
	return filepath.Join(strings.TrimSpace(repoRoot), "pkg/client/assets/tests/fixtures/source_management_contracts/contract_fixtures.json")
}

func DefaultV2SourceManagementRunbookPath(repoRoot string) string {
	return filepath.Join(strings.TrimSpace(repoRoot), "examples/esign/release/V2_SOURCE_MANAGEMENT_RUNBOOK.md")
}

func DefaultV2SourceManagementLedgerPath(repoRoot string) string {
	return filepath.Join(strings.TrimSpace(repoRoot), "examples/esign/release/V2_SOURCE_MANAGEMENT_CONTRACT_LEDGER.md")
}

func DefaultV2SourceManagementContractSourcePaths() []string {
	return append([]string(nil), BuildV2SourceManagementContractManifest().GeneratedFrom...)
}

func collectV2SourceManagementSchemaTypes() []reflect.Type {
	rootTypes := []reflect.Type{
		typeOf[services.SourceListQuery](),
		typeOf[services.SourceRevisionListQuery](),
		typeOf[services.SourceRelationshipListQuery](),
		typeOf[services.SourceAgreementListQuery](),
		typeOf[services.SourceCommentListQuery](),
		typeOf[services.SourceWorkspaceQuery](),
		typeOf[services.SourceSearchQuery](),
		typeOf[services.ReconciliationQueueQuery](),
		typeOf[services.SourceListPage](),
		typeOf[services.SourceDetail](),
		typeOf[services.SourceWorkspace](),
		typeOf[services.SourceRevisionPage](),
		typeOf[services.SourceRelationshipPage](),
		typeOf[services.SourceAgreementPage](),
		typeOf[services.SourceHandlePage](),
		typeOf[services.SourceRevisionDetail](),
		typeOf[services.SourceArtifactPage](),
		typeOf[services.SourceCommentPage](),
		typeOf[services.SourceSearchResults](),
		typeOf[services.ReconciliationQueuePage](),
		typeOf[services.ReconciliationCandidateDetail](),
		typeOf[services.ReconciliationReviewRequest](),
		typeOf[services.ReconciliationReviewResponse](),
	}
	seen := make(map[reflect.Type]struct{})
	for _, rootType := range rootTypes {
		collectNamedStructTypes(rootType, seen)
	}

	out := make([]reflect.Type, 0, len(seen))
	for schemaType := range seen {
		out = append(out, schemaType)
	}
	return out
}

func collectNamedStructTypes(value reflect.Type, seen map[reflect.Type]struct{}) {
	value = unwrapContractType(value)
	if value == nil {
		return
	}
	if isManifestLeafType(value) {
		return
	}
	switch value.Kind() {
	case reflect.Struct:
		if value.Name() == "" {
			return
		}
		if _, ok := seen[value]; ok {
			return
		}
		seen[value] = struct{}{}
		for field := range value.Fields() {
			if field.PkgPath != "" {
				continue
			}
			if _, ok := parseJSONFieldName(field); !ok {
				continue
			}
			collectNamedStructTypes(field.Type, seen)
		}
	case reflect.Slice, reflect.Array:
		collectNamedStructTypes(value.Elem(), seen)
	case reflect.Map:
		collectNamedStructTypes(value.Elem(), seen)
	}
}

func buildV2ContractSchema(value reflect.Type) V2SourceManagementContractSchema {
	value = unwrapContractType(value)
	schema := V2SourceManagementContractSchema{
		Name: value.Name(),
		Kind: value.Kind().String(),
	}
	for field := range value.Fields() {
		if field.PkgPath != "" {
			continue
		}
		name, ok := parseJSONFieldName(field)
		if !ok {
			continue
		}
		typeName, refName, keyName, valueName := describeContractFieldType(field.Type)
		schema.Fields = append(schema.Fields, V2SourceManagementContractFieldShape{
			Name:     name,
			Optional: field.Type.Kind() == reflect.Pointer || strings.Contains(string(field.Tag), ",omitempty"),
			Type:     typeName,
			Ref:      refName,
			Key:      keyName,
			Value:    valueName,
		})
	}
	return schema
}

func describeContractFieldType(value reflect.Type) (string, string, string, string) {
	original := value
	value = unwrapContractType(value)
	if value == nil {
		return "invalid", "", "", ""
	}
	if isTimeType(value) {
		return "datetime", "", "", ""
	}
	switch value.Kind() {
	case reflect.String:
		return "string", "", "", ""
	case reflect.Bool:
		return "bool", "", "", ""
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64,
		reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return describeContractNumericType(value.Kind()), "", "", ""
	case reflect.Float32, reflect.Float64:
		return "number", "", "", ""
	case reflect.Struct:
		return "object", value.Name(), "", ""
	case reflect.Slice, reflect.Array:
		return describeContractArrayType(value)
	case reflect.Map:
		return describeContractMapType(value)
	case reflect.Interface:
		return "any", "", "", ""
	default:
		if original.Kind() == reflect.Pointer && original.Elem().Kind() == reflect.Struct {
			return "object", value.Name(), "", ""
		}
		return value.Kind().String(), "", "", ""
	}
}

func describeContractNumericType(kind reflect.Kind) string {
	switch kind {
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return "integer"
	default:
		return "unsigned_integer"
	}
}

func describeContractArrayType(value reflect.Type) (string, string, string, string) {
	elemType, elemRef, _, _ := describeContractFieldType(value.Elem())
	if elemRef == "" && value.Elem().Kind() == reflect.Interface {
		elemType = "any"
	}
	return "array", firstNonEmpty(elemRef, elemType), "", ""
}

func describeContractMapType(value reflect.Type) (string, string, string, string) {
	keyType, _, _, _ := describeContractFieldType(value.Key())
	valueType, valueRef, _, _ := describeContractFieldType(value.Elem())
	return "map", "", keyType, firstNonEmpty(valueRef, valueType)
}

func unwrapContractType(value reflect.Type) reflect.Type {
	for value != nil && value.Kind() == reflect.Pointer {
		value = value.Elem()
	}
	return value
}

func isTimeType(value reflect.Type) bool {
	return value.PkgPath() == "time" && value.Name() == "Time"
}

func isManifestLeafType(value reflect.Type) bool {
	return isTimeType(value)
}

func parseJSONFieldName(field reflect.StructField) (string, bool) {
	tag := strings.TrimSpace(field.Tag.Get("json"))
	if tag == "-" {
		return "", false
	}
	if tag == "" {
		return field.Name, true
	}
	name := strings.TrimSpace(strings.Split(tag, ",")[0])
	if name == "" {
		name = field.Name
	}
	return name, true
}

func typeOf[T any]() reflect.Type {
	return reflect.TypeFor[T]()
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

package workflowauthoring

import (
	"encoding/json"
	"errors"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/goliatone/go-command/flow"
	"github.com/uptrace/bun"
)

var (
	ErrAuthoringRecordRequired = errors.New("authoring record required")
	ErrMachineIDRequired       = errors.New("machine_id required")
)

type MachineRow struct {
	bun.BaseModel `bun:"table:workflow_authoring_machines"`

	MachineID           string     `bun:"machine_id,pk" json:"machine_id"`
	Name                string     `bun:"name,notnull" json:"name"`
	Version             string     `bun:"version,notnull" json:"version"`
	ETag                string     `bun:"etag,notnull" json:"e_tag"`
	Draft               string     `bun:"draft,notnull" json:"draft"`
	Diagnostics         string     `bun:"diagnostics,notnull" json:"diagnostics"`
	UpdatedAt           time.Time  `bun:"updated_at,notnull" json:"updated_at"`
	PublishedAt         *time.Time `bun:"published_at" json:"published_at"`
	PublishedDefinition string     `bun:"published_definition" json:"published_definition"`
	DeletedAt           *time.Time `bun:"deleted_at" json:"deleted_at"`
}

type VersionRow struct {
	bun.BaseModel `bun:"table:workflow_authoring_versions"`

	MachineID           string     `bun:"machine_id,pk" json:"machine_id"`
	Version             string     `bun:"version,pk" json:"version"`
	Name                string     `bun:"name,notnull" json:"name"`
	ETag                string     `bun:"etag,notnull" json:"e_tag"`
	Draft               string     `bun:"draft,notnull" json:"draft"`
	Diagnostics         string     `bun:"diagnostics,notnull" json:"diagnostics"`
	UpdatedAt           time.Time  `bun:"updated_at,notnull" json:"updated_at"`
	PublishedAt         *time.Time `bun:"published_at" json:"published_at"`
	PublishedDefinition string     `bun:"published_definition" json:"published_definition"`
	DeletedAt           *time.Time `bun:"deleted_at" json:"deleted_at"`
}

func ParseCursorOffset(cursor string) int {
	offset, err := strconv.Atoi(strings.TrimSpace(cursor))
	if err != nil || offset < 0 {
		return 0
	}
	return offset
}

func AuthoringRecordETag(machineID, version string) string {
	return strings.TrimSpace(machineID) + ":" + strings.TrimSpace(version)
}

func CloneTimePtr(value *time.Time) *time.Time {
	if value == nil {
		return nil
	}
	normalized := value.UTC()
	return &normalized
}

func CloneMachine(rec *flow.AuthoringMachineRecord) (*flow.AuthoringMachineRecord, error) {
	if rec == nil {
		return nil, nil
	}
	raw, err := json.Marshal(rec)
	if err != nil {
		return nil, err
	}
	out := &flow.AuthoringMachineRecord{}
	if err := json.Unmarshal(raw, out); err != nil {
		return nil, err
	}
	return out, nil
}

func NormalizeMachineRecord(rec *flow.AuthoringMachineRecord) (*flow.AuthoringMachineRecord, error) {
	next, err := CloneMachine(rec)
	if err != nil {
		return nil, err
	}
	if next == nil {
		return nil, ErrAuthoringRecordRequired
	}
	next.MachineID = strings.TrimSpace(next.MachineID)
	if next.MachineID == "" {
		return nil, ErrMachineIDRequired
	}
	next.Version = strings.TrimSpace(next.Version)
	if next.Version == "" {
		next.Version = "1"
	}
	next.Name = strings.TrimSpace(next.Name)
	if next.Name == "" && next.Draft.Definition != nil {
		next.Name = strings.TrimSpace(next.Draft.Definition.Name)
	}
	if next.Name == "" {
		next.Name = next.MachineID
	}
	next.ETag = strings.TrimSpace(next.ETag)
	if next.ETag == "" {
		next.ETag = AuthoringRecordETag(next.MachineID, next.Version)
	}
	if next.UpdatedAt.IsZero() {
		next.UpdatedAt = time.Now().UTC()
	} else {
		next.UpdatedAt = next.UpdatedAt.UTC()
	}
	if next.PublishedAt != nil {
		value := next.PublishedAt.UTC()
		next.PublishedAt = &value
	}
	if next.DeletedAt != nil {
		value := next.DeletedAt.UTC()
		next.DeletedAt = &value
	}
	sort.SliceStable(next.Diagnostics, func(i, j int) bool {
		return strings.TrimSpace(next.Diagnostics[i].Path) < strings.TrimSpace(next.Diagnostics[j].Path)
	})
	return next, nil
}

func MachineRowFromRecord(rec *flow.AuthoringMachineRecord) (MachineRow, error) {
	encoded, err := authoringRecordPayload(rec)
	if err != nil {
		return MachineRow{}, err
	}
	return MachineRow{
		MachineID:           encoded.machineID,
		Name:                encoded.name,
		Version:             encoded.version,
		ETag:                encoded.etag,
		Draft:               encoded.draft,
		Diagnostics:         encoded.diagnostics,
		UpdatedAt:           encoded.updatedAt,
		PublishedAt:         encoded.publishedAt,
		PublishedDefinition: encoded.publishedDefinition,
		DeletedAt:           encoded.deletedAt,
	}, nil
}

func VersionRowFromRecord(rec *flow.AuthoringMachineRecord) (VersionRow, error) {
	encoded, err := authoringRecordPayload(rec)
	if err != nil {
		return VersionRow{}, err
	}
	return VersionRow{
		MachineID:           encoded.machineID,
		Version:             encoded.version,
		Name:                encoded.name,
		ETag:                encoded.etag,
		Draft:               encoded.draft,
		Diagnostics:         encoded.diagnostics,
		UpdatedAt:           encoded.updatedAt,
		PublishedAt:         encoded.publishedAt,
		PublishedDefinition: encoded.publishedDefinition,
		DeletedAt:           encoded.deletedAt,
	}, nil
}

type encodedAuthoringRecord struct {
	machineID           string
	name                string
	version             string
	etag                string
	draft               string
	diagnostics         string
	updatedAt           time.Time
	publishedAt         *time.Time
	publishedDefinition string
	deletedAt           *time.Time
}

func authoringRecordPayload(rec *flow.AuthoringMachineRecord) (encodedAuthoringRecord, error) {
	if rec == nil {
		return encodedAuthoringRecord{}, ErrAuthoringRecordRequired
	}
	draftRaw, err := json.Marshal(rec.Draft)
	if err != nil {
		return encodedAuthoringRecord{}, err
	}
	diagsRaw, err := json.Marshal(rec.Diagnostics)
	if err != nil {
		return encodedAuthoringRecord{}, err
	}
	publishedRaw := ""
	if rec.PublishedDefinition != nil {
		publishedBytes, publishedErr := json.Marshal(rec.PublishedDefinition)
		if publishedErr != nil {
			return encodedAuthoringRecord{}, publishedErr
		}
		publishedRaw = string(publishedBytes)
	}
	return encodedAuthoringRecord{
		machineID:           strings.TrimSpace(rec.MachineID),
		name:                strings.TrimSpace(rec.Name),
		version:             strings.TrimSpace(rec.Version),
		etag:                strings.TrimSpace(rec.ETag),
		draft:               string(draftRaw),
		diagnostics:         string(diagsRaw),
		updatedAt:           rec.UpdatedAt.UTC(),
		publishedAt:         CloneTimePtr(rec.PublishedAt),
		publishedDefinition: publishedRaw,
		deletedAt:           CloneTimePtr(rec.DeletedAt),
	}, nil
}

func MachineFromRow(row MachineRow) (*flow.AuthoringMachineRecord, error) {
	return recordFromRow(
		row.MachineID,
		row.Name,
		row.Version,
		row.ETag,
		row.Draft,
		row.Diagnostics,
		row.UpdatedAt,
		row.PublishedAt,
		row.PublishedDefinition,
		row.DeletedAt,
	)
}

func VersionFromRow(row VersionRow) (*flow.AuthoringMachineRecord, error) {
	return recordFromRow(
		row.MachineID,
		row.Name,
		row.Version,
		row.ETag,
		row.Draft,
		row.Diagnostics,
		row.UpdatedAt,
		row.PublishedAt,
		row.PublishedDefinition,
		row.DeletedAt,
	)
}

func recordFromRow(machineID, name, version, etag, draftRaw, diagnosticsRaw string, updatedAt time.Time, publishedAt *time.Time, publishedDefinitionRaw string, deletedAt *time.Time) (*flow.AuthoringMachineRecord, error) {
	draft := flow.DraftMachineDocument{}
	if err := json.Unmarshal([]byte(draftRaw), &draft); err != nil {
		return nil, err
	}
	diags := []flow.ValidationDiagnostic{}
	if strings.TrimSpace(diagnosticsRaw) != "" {
		if err := json.Unmarshal([]byte(diagnosticsRaw), &diags); err != nil {
			return nil, err
		}
	}
	var published *flow.MachineDefinition
	if strings.TrimSpace(publishedDefinitionRaw) != "" {
		value := &flow.MachineDefinition{}
		if err := json.Unmarshal([]byte(publishedDefinitionRaw), value); err != nil {
			return nil, err
		}
		published = value
	}
	return &flow.AuthoringMachineRecord{
		MachineID:           strings.TrimSpace(machineID),
		Name:                strings.TrimSpace(name),
		Version:             strings.TrimSpace(version),
		ETag:                strings.TrimSpace(etag),
		Draft:               draft,
		Diagnostics:         append([]flow.ValidationDiagnostic(nil), diags...),
		UpdatedAt:           updatedAt.UTC(),
		PublishedAt:         CloneTimePtr(publishedAt),
		PublishedDefinition: published,
		DeletedAt:           CloneTimePtr(deletedAt),
	}, nil
}

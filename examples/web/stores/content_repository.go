package stores

import (
	"strings"

	repository "github.com/goliatone/go-repository-bun"
	"github.com/google/uuid"
)

func pageModelHandlers() repository.ModelHandlers[*PageRecord] {
	return repository.ModelHandlers[*PageRecord]{
		NewRecord: func() *PageRecord { return &PageRecord{} },
		GetID: func(record *PageRecord) uuid.UUID {
			if record == nil {
				return uuid.Nil
			}
			return record.ID
		},
		SetID: func(record *PageRecord, id uuid.UUID) {
			if record == nil {
				return
			}
			if id == uuid.Nil {
				id = uuid.New()
			}
			record.ID = id
		},
		GetIdentifier: func() string {
			return "ID"
		},
		GetIdentifierValue: func(record *PageRecord) string {
			if record == nil {
				return ""
			}
			if record.Slug != "" {
				return record.Slug
			}
			return record.ID.String()
		},
		ResolveIdentifier: func(identifier string) []repository.IdentifierOption {
			trimmed := strings.TrimSpace(identifier)
			if trimmed == "" {
				return nil
			}
			return []repository.IdentifierOption{
				{Column: "ID", Value: trimmed},
				{Column: "Slug", Value: trimmed},
				{Column: "Title", Value: trimmed},
			}
		},
	}
}

func postModelHandlers() repository.ModelHandlers[*PostRecord] {
	return repository.ModelHandlers[*PostRecord]{
		NewRecord: func() *PostRecord { return &PostRecord{} },
		GetID: func(record *PostRecord) uuid.UUID {
			if record == nil {
				return uuid.Nil
			}
			return record.ID
		},
		SetID: func(record *PostRecord, id uuid.UUID) {
			if record == nil {
				return
			}
			if id == uuid.Nil {
				id = uuid.New()
			}
			record.ID = id
		},
		GetIdentifier: func() string {
			return "ID"
		},
		GetIdentifierValue: func(record *PostRecord) string {
			if record == nil {
				return ""
			}
			if record.Slug != "" {
				return record.Slug
			}
			return record.ID.String()
		},
		ResolveIdentifier: func(identifier string) []repository.IdentifierOption {
			trimmed := strings.TrimSpace(identifier)
			if trimmed == "" {
				return nil
			}
			return []repository.IdentifierOption{
				{Column: "ID", Value: trimmed},
				{Column: "Slug", Value: trimmed},
				{Column: "Title", Value: trimmed},
				{Column: "Category", Value: trimmed},
			}
		},
	}
}

func mediaModelHandlers() repository.ModelHandlers[*MediaRecord] {
	return repository.ModelHandlers[*MediaRecord]{
		NewRecord: func() *MediaRecord { return &MediaRecord{} },
		GetID: func(record *MediaRecord) uuid.UUID {
			if record == nil {
				return uuid.Nil
			}
			return record.ID
		},
		SetID: func(record *MediaRecord, id uuid.UUID) {
			if record == nil {
				return
			}
			if id == uuid.Nil {
				id = uuid.New()
			}
			record.ID = id
		},
		GetIdentifier: func() string {
			return "ID"
		},
		GetIdentifierValue: func(record *MediaRecord) string {
			if record == nil {
				return ""
			}
			if record.Filename != "" {
				return record.Filename
			}
			return record.ID.String()
		},
		ResolveIdentifier: func(identifier string) []repository.IdentifierOption {
			trimmed := strings.TrimSpace(identifier)
			if trimmed == "" {
				return nil
			}
			return []repository.IdentifierOption{
				{Column: "ID", Value: trimmed},
				{Column: "Filename", Value: trimmed},
				{Column: "URL", Value: trimmed},
			}
		},
	}
}

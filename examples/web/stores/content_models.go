package stores

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

var (
	contentIDNamespace = uuid.MustParse("9b1c4c42-5cc2-43ff-8e21-9f7c7fd5c6e0")
)

func seedContentUUID(seed string) uuid.UUID {
	trimmed := strings.TrimSpace(seed)
	if trimmed == "" {
		trimmed = uuid.NewString()
	}
	return uuid.NewSHA1(contentIDNamespace, []byte(trimmed))
}

// PageRecord maps the page payload exposed by go-crud.
type PageRecord struct {
	bun.BaseModel `bun:"table:pages,alias:p" crud:"resource:page"`

	ID              uuid.UUID  `json:"id" bun:"id,pk,type:uuid"`
	Title           string     `json:"title" bun:"title"`
	Slug            string     `json:"slug" bun:"slug"`
	Status          string     `json:"status" bun:"status"`
	ParentID        *uuid.UUID `json:"parent_id,omitempty" bun:"parent_id"`
	MetaTitle       string     `json:"meta_title,omitempty" bun:"meta_title"`
	MetaDescription string     `json:"meta_description,omitempty" bun:"meta_description"`
	Content         string     `json:"content,omitempty" bun:"content"`
	PreviewURL      string     `json:"preview_url,omitempty" bun:"preview_url"`
	PublishedAt     *time.Time `json:"published_at,omitempty" bun:"published_at,nullzero"`
	CreatedAt       *time.Time `json:"created_at,omitempty" bun:"created_at,nullzero,default:current_timestamp"`
	UpdatedAt       *time.Time `json:"updated_at,omitempty" bun:"updated_at,nullzero,default:current_timestamp"`
}

// PostRecord represents posts exposed via go-crud.
type PostRecord struct {
	bun.BaseModel `bun:"table:posts,alias:po" crud:"resource:post"`

	ID            uuid.UUID  `json:"id" bun:"id,pk,type:uuid"`
	Title         string     `json:"title" bun:"title"`
	Slug          string     `json:"slug" bun:"slug"`
	Status        string     `json:"status" bun:"status"`
	Author        string     `json:"author,omitempty" bun:"author"`
	Excerpt       string     `json:"excerpt,omitempty" bun:"excerpt"`
	Content       string     `json:"content,omitempty" bun:"content"`
	Category      string     `json:"category,omitempty" bun:"category"`
	FeaturedImage string     `json:"featured_image,omitempty" bun:"featured_image"`
	Tags          []string   `json:"tags,omitempty" bun:"tags,type:jsonb"`
	PublishedAt   *time.Time `json:"published_at,omitempty" bun:"published_at,nullzero"`
	CreatedAt     *time.Time `json:"created_at,omitempty" bun:"created_at,nullzero,default:current_timestamp"`
	UpdatedAt     *time.Time `json:"updated_at,omitempty" bun:"updated_at,nullzero,default:current_timestamp"`
}

// MediaRecord represents media assets in go-crud responses.
type MediaRecord struct {
	bun.BaseModel `bun:"table:media,alias:m" crud:"resource:media"`

	ID         uuid.UUID      `json:"id" bun:"id,pk,type:uuid"`
	Filename   string         `json:"filename" bun:"filename"`
	URL        string         `json:"url" bun:"url"`
	Type       string         `json:"type" bun:"type"`
	MimeType   string         `json:"mime_type,omitempty" bun:"mime_type"`
	Size       int64          `json:"size" bun:"size"`
	Metadata   map[string]any `json:"metadata,omitempty" bun:"metadata,type:jsonb"`
	UploadedBy string         `json:"uploaded_by,omitempty" bun:"uploaded_by"`
	CreatedAt  *time.Time     `json:"created_at,omitempty" bun:"created_at,nullzero,default:current_timestamp"`
	UpdatedAt  *time.Time     `json:"updated_at,omitempty" bun:"updated_at,nullzero,default:current_timestamp"`
}

func pageRecordFromMap(record map[string]any) *PageRecord {
	now := time.Now().UTC()
	rec := &PageRecord{
		ID:              parseSeededUUID(stringID(record["id"]), "page:"+asString(record["slug"], asString(record["title"], ""))),
		Title:           asString(record["title"], ""),
		Slug:            sanitizeSlug(asString(record["slug"], "")),
		Status:          strings.ToLower(asString(record["status"], "draft")),
		Content:         asString(record["content"], ""),
		PreviewURL:      asString(record["preview_url"], ""),
		MetaTitle:       asString(record["meta_title"], ""),
		MetaDescription: asString(record["meta_description"], ""),
	}
	if rec.Slug == "" && rec.Title != "" {
		rec.Slug = sanitizeSlug(rec.Title)
	}
	if parent := stringID(record["parent_id"]); parent != "" {
		pid := parseSeededUUID(parent, "page-parent:"+parent)
		rec.ParentID = &pid
	}
	if ts := parseTimeValue(record["published_at"]); !ts.IsZero() {
		rec.PublishedAt = ptrTime(ts)
	}
	if ts := parseTimeValue(record["created_at"]); ts.IsZero() {
		rec.CreatedAt = ptrTime(now)
	} else {
		rec.CreatedAt = ptrTime(ts)
	}
	if ts := parseTimeValue(record["updated_at"]); ts.IsZero() {
		rec.UpdatedAt = ptrTime(now)
	} else {
		rec.UpdatedAt = ptrTime(ts)
	}
	return rec
}

func pageRecordToMap(record *PageRecord) map[string]any {
	if record == nil {
		return map[string]any{}
	}
	out := map[string]any{
		"id":               record.ID.String(),
		"title":            record.Title,
		"slug":             record.Slug,
		"status":           strings.ToLower(record.Status),
		"meta_title":       record.MetaTitle,
		"meta_description": record.MetaDescription,
		"content":          record.Content,
		"preview_url":      record.PreviewURL,
	}
	if record.ParentID != nil && *record.ParentID != uuid.Nil {
		out["parent_id"] = record.ParentID.String()
	}
	if record.PublishedAt != nil && !record.PublishedAt.IsZero() {
		out["published_at"] = record.PublishedAt
	}
	if record.CreatedAt != nil {
		out["created_at"] = record.CreatedAt
	}
	if record.UpdatedAt != nil {
		out["updated_at"] = record.UpdatedAt
	}
	return out
}

func postRecordFromMap(record map[string]any) *PostRecord {
	now := time.Now().UTC()
	rec := &PostRecord{
		ID:            parseSeededUUID(stringID(record["id"]), "post:"+asString(record["slug"], asString(record["title"], ""))),
		Title:         asString(record["title"], ""),
		Slug:          sanitizeSlug(asString(record["slug"], "")),
		Status:        strings.ToLower(asString(record["status"], "draft")),
		Author:        asString(record["author"], ""),
		Excerpt:       asString(record["excerpt"], ""),
		Content:       asString(record["content"], ""),
		Category:      strings.ToLower(asString(record["category"], "")),
		FeaturedImage: asString(record["featured_image"], ""),
		Tags:          parseTags(record["tags"]),
	}
	if rec.Slug == "" && rec.Title != "" {
		rec.Slug = sanitizeSlug(rec.Title)
	}
	if ts := parseTimeValue(record["published_at"]); !ts.IsZero() {
		rec.PublishedAt = ptrTime(ts)
	}
	if ts := parseTimeValue(record["created_at"]); ts.IsZero() {
		rec.CreatedAt = ptrTime(now)
	} else {
		rec.CreatedAt = ptrTime(ts)
	}
	if ts := parseTimeValue(record["updated_at"]); ts.IsZero() {
		rec.UpdatedAt = ptrTime(now)
	} else {
		rec.UpdatedAt = ptrTime(ts)
	}
	return rec
}

func postRecordToMap(record *PostRecord) map[string]any {
	if record == nil {
		return map[string]any{}
	}
	out := map[string]any{
		"id":             record.ID.String(),
		"title":          record.Title,
		"slug":           record.Slug,
		"status":         strings.ToLower(record.Status),
		"author":         record.Author,
		"excerpt":        record.Excerpt,
		"content":        record.Content,
		"category":       record.Category,
		"featured_image": record.FeaturedImage,
	}
	if len(record.Tags) > 0 {
		out["tags"] = record.Tags
	}
	if record.PublishedAt != nil && !record.PublishedAt.IsZero() {
		out["published_at"] = record.PublishedAt
	}
	if record.CreatedAt != nil {
		out["created_at"] = record.CreatedAt
	}
	if record.UpdatedAt != nil {
		out["updated_at"] = record.UpdatedAt
	}
	return out
}

func mediaRecordFromMap(record map[string]any) *MediaRecord {
	now := time.Now().UTC()
	rec := &MediaRecord{
		ID:         parseSeededUUID(stringID(record["id"]), "media:"+asString(record["filename"], "")),
		Filename:   asString(record["filename"], ""),
		URL:        asString(record["url"], ""),
		Type:       strings.ToLower(asString(record["type"], "")),
		MimeType:   asString(record["mime_type"], ""),
		UploadedBy: asString(record["uploaded_by"], ""),
		Metadata:   map[string]any{},
	}
	if rec.MimeType == "" {
		rec.MimeType = rec.Type
	}
	if rawSize, ok := record["size"]; ok && rawSize != nil {
		switch v := rawSize.(type) {
		case int64:
			rec.Size = v
		case int:
			rec.Size = int64(v)
		case float64:
			rec.Size = int64(v)
		default:
			rec.Size = parseSize(asString(rawSize, ""))
		}
	}
	if ts := parseTimeValue(record["created_at"]); ts.IsZero() {
		rec.CreatedAt = ptrTime(now)
	} else {
		rec.CreatedAt = ptrTime(ts)
	}
	if ts := parseTimeValue(record["updated_at"]); ts.IsZero() {
		rec.UpdatedAt = ptrTime(now)
	} else {
		rec.UpdatedAt = ptrTime(ts)
	}
	if alt := asString(record["alt_text"], ""); alt != "" {
		rec.Metadata["alt_text"] = alt
	}
	if caption := asString(record["caption"], ""); caption != "" {
		rec.Metadata["caption"] = caption
	}
	if meta, ok := record["metadata"].(map[string]any); ok {
		for k, v := range meta {
			rec.Metadata[k] = v
		}
	}
	return rec
}

func mediaRecordToMap(record *MediaRecord) map[string]any {
	if record == nil {
		return map[string]any{}
	}
	out := map[string]any{
		"id":          record.ID.String(),
		"filename":    record.Filename,
		"url":         record.URL,
		"type":        record.Type,
		"mime_type":   record.MimeType,
		"size":        record.Size,
		"uploaded_by": record.UploadedBy,
	}
	if record.CreatedAt != nil {
		out["created_at"] = record.CreatedAt
	}
	if record.UpdatedAt != nil {
		out["updated_at"] = record.UpdatedAt
	}
	for k, v := range record.Metadata {
		out[k] = v
	}
	return out
}

func parseTags(raw any) []string {
	switch v := raw.(type) {
	case nil:
		return nil
	case []string:
		return v
	case []any:
		out := make([]string, 0, len(v))
		for _, item := range v {
			if str := asString(item, ""); str != "" {
				out = append(out, strings.TrimSpace(str))
			}
		}
		return out
	default:
		return splitAndTrimCSV(asString(raw, ""))
	}
}

func sanitizeSlug(slug string) string {
	trimmed := strings.ToLower(strings.TrimSpace(slug))
	if trimmed == "" {
		return ""
	}
	trimmed = strings.ReplaceAll(trimmed, "_", "-")
	trimmed = strings.ReplaceAll(trimmed, " ", "-")
	trimmed = strings.ReplaceAll(trimmed, "--", "-")
	return strings.Trim(trimmed, "-")
}

func parseSeededUUID(val string, seed string) uuid.UUID {
	if parsed, err := uuid.Parse(strings.TrimSpace(val)); err == nil {
		return parsed
	}
	seeded := strings.TrimSpace(seed)
	if seeded == "" {
		seeded = uuid.NewString()
	}
	return uuid.NewSHA1(contentIDNamespace, []byte(seeded))
}

func splitAndTrimCSV(raw string) []string {
	if strings.TrimSpace(raw) == "" {
		return nil
	}
	parts := strings.FieldsFunc(raw, func(r rune) bool { return r == ',' || r == ';' })
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}

func parseSize(raw string) int64 {
	trimmed := strings.TrimSpace(strings.ToLower(raw))
	if trimmed == "" {
		return 0
	}
	var value float64
	var unit string
	_, _ = fmt.Sscanf(trimmed, "%f%s", &value, &unit)
	multiplier := float64(1)
	switch unit {
	case "kb", "kib":
		multiplier = 1024
	case "mb", "mib":
		multiplier = 1024 * 1024
	case "gb", "gib":
		multiplier = 1024 * 1024 * 1024
	default:
		multiplier = 1
	}
	return int64(value * multiplier)
}

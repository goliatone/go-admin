package data

import (
	"context"
	"encoding/json"
	"math"
	"slices"
	"time"
)

func (s *Service) ExploreSamples(ctx context.Context, q ExploreSamplesQuery) (ExploreSamples, error) {
	if err := q.Validate(); err != nil {
		return ExploreSamples{}, err
	}
	return s.exploreSamples(ctx, q, nil)
}
func (s *Service) ExploreRelated(ctx context.Context, q ExploreRelatedQuery) (ExploreSamples, error) {
	if err := q.Validate(); err != nil {
		return ExploreSamples{}, err
	}
	return s.exploreSamples(ctx, q.ExploreSamplesQuery, &q)
}
func (s *Service) exploreSamples(ctx context.Context, q ExploreSamplesQuery, related *ExploreRelatedQuery) (ExploreSamples, error) {
	if ctx == nil {
		return ExploreSamples{}, Error(CodeDenied)
	}
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	q.Selection = cloneExploreSelection(q.Selection)
	if q.Limit == 0 {
		q.Limit = ExploreDefaultLimit
	}
	b, err := s.bindExplore(ctx, q.Selection)
	if err != nil {
		return ExploreSamples{}, err
	}
	a := ExploreAccess{Selection: q.Selection, EntityID: q.EntityID}
	if related != nil {
		a.RecordKey = related.RecordKey
		a.RelationshipID = related.RelationshipID
		a.SourceEntityID = q.EntityID
		copy := *related
		related = &copy
		related.Selection = cloneExploreSelection(q.Selection)
		related.Limit = q.Limit
	}
	if err = s.authorizeExplore(ctx, b, a); err != nil {
		return ExploreSamples{}, err
	}
	out := ExploreSamples{ExploreEnvelope: exploreEnvelope(b, ExploreUnsupported, "unknown", "unknown"), EntityID: q.EntityID, Columns: []ExploreField{}, Rows: []ExploreRow{}}
	if b.provider != nil {
		// Load the authorized declared schema inside this same bounded read. Related
		// traversal is depth one; arbitrary keys, entities and relationship IDs fail.
		metadata, err := b.provider.ExploreMetadata(ctx, b.principal, b.providerRead())
		if err != nil {
			return ExploreSamples{}, readFailure(ctx, err)
		}
		if err = validateExploreMetadata(metadata, q.Selection, b.descriptor.Scenarios); err != nil {
			return ExploreSamples{}, err
		}
		if err = boundedExplore(metadata, ExploreMaxMetadataBytes); err != nil {
			return ExploreSamples{}, err
		}
		if !validExploreState(metadata.State) || !validCompleteness(metadata.Completeness) || !exploreID(metadata.PresentationRevision) {
			return ExploreSamples{}, Error(CodeProvider)
		}
		if metadata.State == ExploreUnsupported || metadata.State == ExploreSuppressed {
			out.ExploreEnvelope, err = providerEnvelope(b, metadata.ExploreEnvelope)
			if err != nil {
				return ExploreSamples{}, err
			}
		} else {
			i := slices.IndexFunc(metadata.Entities, func(e ExploreEntity) bool { return e.ID == q.EntityID })
			if i < 0 {
				return ExploreSamples{}, Error(CodeGone)
			}
			entity := metadata.Entities[i]
			for _, field := range entity.Fields {
				a.Fields = append(a.Fields, field.ID)
			}
			if err = s.authorizeExplore(ctx, b, a); err != nil {
				return ExploreSamples{}, err
			}
			a.Fields = nil
			resultEntity := entity
			if related != nil {
				j := slices.IndexFunc(entity.Relationships, func(r ExploreRelationship) bool { return r.ID == related.RelationshipID })
				if j < 0 {
					return ExploreSamples{}, Error(CodeGone)
				}
				resultEntity = metadata.Entities[slices.IndexFunc(metadata.Entities, func(e ExploreEntity) bool { return e.ID == entity.Relationships[j].EntityID })]
				destination := a
				destination.EntityID = resultEntity.ID
				for _, field := range resultEntity.Fields {
					destination.Fields = append(destination.Fields, field.ID)
				}
				if err = s.authorizeExplore(ctx, b, destination); err != nil {
					return ExploreSamples{}, err
				}
				out, err = b.provider.ExploreRelated(ctx, b.principal, b.providerRead(), *related)
			} else {
				providerQuery := q
				providerQuery.Selection = cloneExploreSelection(q.Selection)
				out, err = b.provider.ExploreSamples(ctx, b.principal, b.providerRead(), providerQuery)
			}
			if err != nil {
				return ExploreSamples{}, readFailure(ctx, err)
			}
			out.ExploreEnvelope, err = providerEnvelope(b, out.ExploreEnvelope)
			if err != nil {
				return ExploreSamples{}, err
			}
			if out.PresentationRevision != metadata.PresentationRevision {
				return ExploreSamples{}, Error(CodeStale)
			}
			if err = validateExploreSamples(out, resultEntity, q.Limit); err != nil {
				return ExploreSamples{}, err
			}
			a.EntityID = resultEntity.ID
			for _, column := range out.Columns {
				a.Fields = append(a.Fields, column.ID)
			}
			for _, row := range out.Rows {
				a.RecordKeys = append(a.RecordKeys, row.RecordKey)
			}
		}
	}
	if out.Columns == nil {
		out.Columns = []ExploreField{}
	}
	if out.Rows == nil {
		out.Rows = []ExploreRow{}
	}
	if err = boundedExplore(out, ExploreMaxResponseBytes); err != nil {
		return ExploreSamples{}, err
	}
	if err = s.deliverExplore(ctx, b, a); err != nil {
		return ExploreSamples{}, err
	}
	return out, nil
}
func validateExploreSamples(out ExploreSamples, entity ExploreEntity, limit int) error {
	if out.EntityID != entity.ID || len(out.Rows) > limit || out.Total != nil && *out.Total > MaxWireCounter || out.NextCursor != nil && (len(*out.NextCursor) == 0 || len(*out.NextCursor) > 512) {
		return Error(CodeProvider)
	}
	if err := validateExploreColumns(out.Columns); err != nil {
		return err
	}
	fields := map[string]ExploreField{}
	for _, c := range out.Columns {
		index := slices.IndexFunc(entity.Fields, func(f ExploreField) bool { return f.ID == c.ID })
		if index < 0 || c != entity.Fields[index] {
			return Error(CodeProvider)
		}
		fields[c.ID] = c
	}
	if out.State == ExploreUnsupported || out.State == ExploreSuppressed {
		if len(out.Rows) > 0 || len(out.Columns) > 0 || out.Total != nil || out.NextCursor != nil {
			return Error(CodeProvider)
		}
		return nil
	}
	if out.State == ExploreEmpty && (len(out.Rows) > 0 || out.Total == nil || *out.Total != 0 || out.NextCursor != nil) {
		return Error(CodeProvider)
	}
	if out.State == ExploreAvailable && (len(out.Rows) == 0 || len(out.Columns) == 0 || out.SamplingMethod == "") {
		return Error(CodeProvider)
	}
	if out.Total != nil && *out.Total < uint64(len(out.Rows)) {
		return Error(CodeProvider)
	}
	keys := map[string]bool{}
	for _, row := range out.Rows {
		if !exploreID(row.RecordKey) || keys[row.RecordKey] || len(row.Cells) != len(fields) {
			return Error(CodeProvider)
		}
		keys[row.RecordKey] = true
		for id, cell := range row.Cells {
			field, ok := fields[id]
			if !ok {
				return Error(CodeProvider)
			}
			switch cell.State {
			case "unknown", "redacted", "null":
				if cell.Value != nil {
					return Error(CodeProvider)
				}
			case "value":
				if !exploreScalar(field.Type, cell.Value) {
					return Error(CodeProvider)
				}
			default:
				return Error(CodeProvider)
			}
			value, err := json.Marshal(cell)
			if err != nil || len(value) > 2<<10 {
				return Error(CodeProvider)
			}
		}
	}
	return nil
}
func exploreScalar(kind string, v any) bool {
	switch kind {
	case "string":
		_, ok := v.(string)
		return ok
	case "date", "datetime":
		value, ok := v.(string)
		if !ok {
			return false
		}
		layout := "2006-01-02"
		if kind == "datetime" {
			layout = time.RFC3339
		}
		_, err := time.Parse(layout, value)
		return err == nil
	case "boolean":
		_, ok := v.(bool)
		return ok
	case "integer", "number":
		var n float64
		switch value := v.(type) {
		case int:
			n = float64(value)
		case int64:
			if value > int64(MaxWireCounter) || value < -int64(MaxWireCounter) {
				return false
			}
			n = float64(value)
		case uint64:
			if value > MaxWireCounter {
				return false
			}
			n = float64(value)
		case float64:
			n = value
		case json.Number:
			var err error
			n, err = value.Float64()
			if err != nil {
				return false
			}
		default:
			return false
		}
		return !math.IsNaN(n) && !math.IsInf(n, 0) && math.Abs(n) <= float64(MaxWireCounter) && (kind != "integer" || math.Trunc(n) == n)
	}
	return false
}

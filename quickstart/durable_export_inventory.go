package quickstart

import (
	"context"
	"database/sql"
	"errors"

	"github.com/goliatone/go-export/export"
	"github.com/uptrace/bun"
)

const MaxLegacyExportInventoryPage = 100

type LegacyExportInventoryQuery struct {
	ProfileRef string `json:"profile_ref"`
	After      string `json:"after,omitempty"`
	Limit      int    `json:"limit"`
}

func (q LegacyExportInventoryQuery) Validate() error {
	if !validLegacyRef(q.ProfileRef) || (q.After != "" && !validLegacyRef(q.After)) || q.Limit < 1 || q.Limit > MaxLegacyExportInventoryPage {
		return durableExportInvalid("versioned profile, valid cursor and inventory limit 1..100 required")
	}
	return nil
}

type LegacyExportInventoryEntry struct {
	ExportID string              `json:"export_id"`
	State    export.ExportState  `json:"state"`
	Blocker  string              `json:"blocker,omitempty"`
	Review   *LegacyExportReview `json:"review,omitempty"`
}

type LegacyExportInventoryResult struct {
	Entries   []LegacyExportInventoryEntry `json:"entries"`
	HasMore   bool                         `json:"has_more"`
	NextAfter string                       `json:"next_after,omitempty"`
}

// InventoryLegacyExports prepares one authorized page without adopting records.
// Inventory policy owns authoritative discovery; stored actor hints are not authority.
func (h *DurableExportHost) InventoryLegacyExports(ctx context.Context, a export.Actor, q LegacyExportInventoryQuery) (LegacyExportInventoryResult, error) {
	if err := q.Validate(); err != nil {
		return LegacyExportInventoryResult{}, err
	}
	if h == nil {
		return LegacyExportInventoryResult{}, durableExportInvalid("legacy host required")
	}
	ctx, release, _, err := h.cfg.RecoveryGate.enter(ctx)
	if err != nil {
		return LegacyExportInventoryResult{}, err
	}
	defer release()
	if err = h.legacyEnabled(); err != nil {
		return LegacyExportInventoryResult{}, err
	}
	if a.ID == "" {
		return LegacyExportInventoryResult{}, durableExportDenied()
	}
	if h.cfg.LegacyAdoption.Inventory == nil {
		return LegacyExportInventoryResult{}, durableExportInvalid("explicit legacy inventory policy required")
	}
	var result LegacyExportInventoryResult
	called := false
	err = h.cfg.WithTransaction(ctx, a, func(ctx context.Context, tx bun.Tx) error {
		if called {
			return durableExportInvalid("legacy inventory transaction callback repeated")
		}
		called = true
		var pageErr error
		result, pageErr = h.legacyInventoryPage(ctx, tx, a, q)
		return pageErr
	})
	if err != nil {
		return LegacyExportInventoryResult{}, err
	}
	if !called {
		return LegacyExportInventoryResult{}, durableExportInvalid("legacy inventory transaction callback not invoked")
	}
	return result, nil
}

// legacyInventoryPage keeps discovery, lookahead authorization and record review
// inside the caller's transaction. No partially reviewed page escapes on failure.
func (h *DurableExportHost) legacyInventoryPage(ctx context.Context, tx bun.Tx, a export.Actor, q LegacyExportInventoryQuery) (LegacyExportInventoryResult, error) {
	if err := ctx.Err(); err != nil {
		return LegacyExportInventoryResult{}, err
	}
	namespace, err := h.cfg.Namespace(ctx, a)
	if err != nil {
		return LegacyExportInventoryResult{}, err
	}
	if namespace == "" {
		return LegacyExportInventoryResult{}, durableExportDenied()
	}
	ids, err := h.cfg.LegacyAdoption.Inventory(ctx, tx, a, q.ProfileRef, q.After, q.Limit+1)
	if err != nil {
		return LegacyExportInventoryResult{}, err
	}
	if err = validateLegacyInventoryIDs(ids, q); err != nil {
		return LegacyExportInventoryResult{}, err
	}
	for _, id := range ids {
		if err = h.cfg.LegacyAdoption.Authorize(ctx, tx, a, id, q.ProfileRef); err != nil {
			return LegacyExportInventoryResult{}, err
		}
	}
	result := LegacyExportInventoryResult{
		Entries: make([]LegacyExportInventoryEntry, 0, q.Limit),
		HasMore: len(ids) > q.Limit,
	}
	if result.HasMore {
		ids = ids[:q.Limit]
		result.NextAfter = ids[len(ids)-1]
	}
	for _, id := range ids {
		entry, entryErr := h.legacyInventoryEntry(ctx, tx, a, id, q.ProfileRef, namespace)
		if entryErr != nil {
			return LegacyExportInventoryResult{}, entryErr
		}
		result.Entries = append(result.Entries, entry)
	}
	return result, ctx.Err()
}

func validateLegacyInventoryIDs(ids []string, q LegacyExportInventoryQuery) error {
	if len(ids) > q.Limit+1 {
		return durableExportInvalid("legacy inventory exceeded page bound")
	}
	previous := q.After
	for _, id := range ids {
		if !validLegacyRef(id) || id <= previous {
			return durableExportInvalid("legacy inventory IDs must increase after cursor")
		}
		previous = id
	}
	return nil
}

func (h *DurableExportHost) legacyInventoryEntry(ctx context.Context, tx bun.Tx, a export.Actor, id, profile, namespace string) (LegacyExportInventoryEntry, error) {
	if err := ctx.Err(); err != nil {
		return LegacyExportInventoryEntry{}, err
	}
	rec, _, review, err := h.legacyRead(ctx, tx, a, id, profile)
	if err != nil {
		return LegacyExportInventoryEntry{}, err
	}
	entry := LegacyExportInventoryEntry{ExportID: id, State: rec.State}
	entry.Blocker, err = h.legacyInventoryBlocker(ctx, tx, a, rec, namespace)
	if err != nil {
		return LegacyExportInventoryEntry{}, err
	}
	if entry.Blocker == "" {
		if err = h.authorizeLegacyAdoption(ctx, a, rec); err != nil {
			return LegacyExportInventoryEntry{}, err
		}
		entry.Review = &review
	}
	return entry, nil
}

func (h *DurableExportHost) legacyInventoryBlocker(ctx context.Context, tx bun.Tx, a export.Actor, rec export.ExportRecord, namespace string) (string, error) {
	var receipt legacyExportReceipt
	err := tx.NewSelect().Model(&receipt).Where("export_id=?", rec.ID).Scan(ctx)
	switch {
	case err == nil:
		if receipt.Namespace != namespace || receipt.ActorID != a.ID || receipt.TenantID != a.Scope.TenantID || receipt.WorkspaceID != a.Scope.WorkspaceID {
			return "", durableExportDenied()
		}
		if err = h.cfg.AuthorizeRecordTransaction(ctx, tx, a, rec.ID); err != nil {
			return "", err
		}
		return "already_adopted", nil
	case !errors.Is(err, sql.ErrNoRows):
		return "", err
	case rec.State != export.StateQueued && rec.State != export.StateCompleted:
		return "unsupported_state", nil
	}
	for _, table := range []string{"export_webhook_completion_plans", "export_webhook_targets"} {
		exists, queryErr := tx.NewSelect().Table(table).Where("export_id=?", rec.ID).Exists(ctx)
		if queryErr != nil {
			return "", queryErr
		}
		if exists {
			return "notification_intent", nil
		}
	}
	return "", nil
}

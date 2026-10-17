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
	result := LegacyExportInventoryResult{Entries: make([]LegacyExportInventoryEntry, 0, q.Limit)}
	called := false
	err = h.cfg.WithTransaction(ctx, a, func(ctx context.Context, tx bun.Tx) error {
		if called {
			return durableExportInvalid("legacy inventory transaction callback repeated")
		}
		called = true
		if err := ctx.Err(); err != nil {
			return err
		}
		namespace, err := h.cfg.Namespace(ctx, a)
		if err != nil {
			return err
		}
		if namespace == "" {
			return durableExportDenied()
		}
		ids, err := h.cfg.LegacyAdoption.Inventory(ctx, tx, a, q.ProfileRef, q.After, q.Limit+1)
		if err != nil {
			return err
		}
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
		for _, id := range ids {
			if err := h.cfg.LegacyAdoption.Authorize(ctx, tx, a, id, q.ProfileRef); err != nil {
				return err
			}
		}
		result.HasMore = len(ids) > q.Limit
		if result.HasMore {
			ids = ids[:q.Limit]
		}
		for _, id := range ids {
			if err := ctx.Err(); err != nil {
				return err
			}
			rec, _, review, err := h.legacyRead(ctx, tx, a, id, q.ProfileRef)
			if err != nil {
				return err
			}
			entry := LegacyExportInventoryEntry{ExportID: id, State: rec.State}
			var receipt legacyExportReceipt
			err = tx.NewSelect().Model(&receipt).Where("export_id=?", id).Scan(ctx)
			switch {
			case err == nil:
				if receipt.Namespace != namespace || receipt.ActorID != a.ID || receipt.TenantID != a.Scope.TenantID || receipt.WorkspaceID != a.Scope.WorkspaceID {
					return durableExportDenied()
				}
				if err = h.cfg.AuthorizeRecordTransaction(ctx, tx, a, id); err != nil {
					return err
				}
				entry.Blocker = "already_adopted"
			case !errors.Is(err, sql.ErrNoRows):
				return err
			case rec.State != export.StateQueued && rec.State != export.StateCompleted:
				entry.Blocker = "unsupported_state"
			default:
				for _, table := range []string{"export_webhook_completion_plans", "export_webhook_targets"} {
					exists, e := tx.NewSelect().Table(table).Where("export_id=?", id).Exists(ctx)
					if e != nil {
						return e
					}
					if exists {
						entry.Blocker = "notification_intent"
						break
					}
				}
				if entry.Blocker == "" {
					if err = h.authorizeLegacyAdoption(ctx, a, rec); err != nil {
						return err
					}
					entry.Review = &review
				}
			}
			result.Entries = append(result.Entries, entry)
		}
		if result.HasMore {
			result.NextAfter = ids[len(ids)-1]
		}
		return ctx.Err()
	})
	if err != nil {
		return LegacyExportInventoryResult{}, err
	}
	if !called {
		return LegacyExportInventoryResult{}, durableExportInvalid("legacy inventory transaction callback not invoked")
	}
	return result, nil
}

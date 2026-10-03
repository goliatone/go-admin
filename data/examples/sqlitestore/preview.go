package sqlitestore

import (
	"context"
	"encoding/json"
	"github.com/goliatone/go-admin/data"
	"reflect"
	"sort"
	"time"
)

// This reference store bounds durable preview request history to 1024 entries.
// It retains terminal locators/fingerprints rather than forgetting old request
// authority. At capacity new opens fail busy; existing replay/close still works.
// Production hosts should supply their own durable bounded replay policy.
const previewHistoryLimit = 1024

func previewRequestKey(r data.PreviewRecord) (string, error) {
	b, err := json.Marshal([]string{r.ApplicationID, r.EnvironmentID, r.Principal.ActorID, r.Principal.ScopeKey, r.Receipt.Target.TargetID, r.RequestID})
	return string(b), err
}
func (s *Store) OpenPreviewRecord(ctx context.Context, w data.PreviewRecord, quota int) (out data.PreviewRecord, err error) {
	err = s.transact(ctx, true, func(d *document) error {
		if e := validatePreviewCandidate(w, quota); e != nil {
			return e
		}
		k, e := previewRequestKey(w)
		if e != nil {
			return e
		}
		if replay, ok, replayErr := findPreviewReplay(d, w, k); replayErr != nil {
			return replayErr
		} else if ok {
			out = replay
			return nil
		}
		if e = validatePreviewCapacity(d, w, quota, s.options.Now()); e != nil {
			return e
		}
		if e = validatePreviewReceipt(d, w); e != nil {
			return e
		}
		if d.PreviewSessions == nil {
			d.PreviewSessions = map[string]data.PreviewRecord{}
		}
		if d.PreviewRequests == nil {
			d.PreviewRequests = map[string]string{}
		}
		// Session and retention protection commit in the same transaction.
		d.PreviewRequests[k] = w.Session.SessionID
		d.PreviewSessions[w.Session.SessionID] = w
		out = w
		return nil
	})
	return
}
func validatePreviewCandidate(w data.PreviewRecord, quota int) error {
	q := data.OpenApplicationPreviewInput{Selection: w.Session.Selection, SurfaceID: w.Session.SurfaceID, RequestID: w.RequestID}
	if err := q.Validate(); err != nil {
		return err
	}
	if quota < 1 || quota > data.PreviewMaxSessions || !w.Principal.Valid() || !w.Session.ReadOnly || w.Session.State != data.PreviewReady || w.Session.SessionID == "" || w.ApplicationID == "" || w.EnvironmentID == "" || w.Fingerprint == "" {
		return data.Error(data.CodeInvalid)
	}
	return nil
}
func findPreviewReplay(d *document, w data.PreviewRecord, k string) (data.PreviewRecord, bool, error) {
	id, ok := d.PreviewRequests[k]
	if !ok {
		return data.PreviewRecord{}, false, nil
	}
	r, ok := d.PreviewSessions[id]
	if !ok {
		return r, false, data.Error(data.CodeGone)
	}
	if r.Fingerprint != w.Fingerprint {
		return r, false, data.Error(data.CodeConflict)
	}
	return r, true, nil
}
func validatePreviewCapacity(d *document, w data.PreviewRecord, quota int, now time.Time) error {
	if len(d.PreviewSessions) >= previewHistoryLimit {
		return data.Error(data.CodeBusy)
	}
	if _, ok := d.PreviewSessions[w.Session.SessionID]; ok {
		return data.Error(data.CodeConflict)
	}
	if !now.Before(w.Session.ExpiresAt) || w.Session.ExpiresAt.After(now.Add(data.PreviewMaxLifetime)) {
		return data.Error(data.CodeInvalid)
	}
	count := 0
	for _, r := range d.PreviewSessions {
		if samePreviewOwner(r, w) && r.Session.State == data.PreviewReady && now.Before(r.Session.ExpiresAt) {
			count++
		}
	}
	if count >= quota {
		return data.Error(data.CodeBusy)
	}
	return nil
}
func samePreviewOwner(a, b data.PreviewRecord) bool {
	return a.ApplicationID == b.ApplicationID && a.EnvironmentID == b.EnvironmentID && a.Principal.ActorID == b.Principal.ActorID && a.Principal.ScopeKey == b.Principal.ScopeKey
}
func validatePreviewReceipt(d *document, w data.PreviewRecord) error {
	receipt, ok := d.Receipts[w.Receipt.ID]
	if !ok {
		return data.Error(data.CodeGone)
	}
	selection := w.Session.Selection
	if !reflect.DeepEqual(receipt, w.Receipt) || receipt.Target.ScopeKey != w.Principal.ScopeKey || receipt.ID != selection.ReceiptID || receipt.Target.TargetID != selection.TargetID || receipt.Dataset != selection.Dataset || receipt.Scenario != selection.Scenario || receipt.ContentRevision != selection.ContentRevision {
		return data.Error(data.CodeStale)
	}
	return nil
}

func (s *Store) LookupPreviewRecord(ctx context.Context, id string) (out data.PreviewRecord, err error) {
	err = s.transact(ctx, false, func(d *document) error {
		r, ok := d.PreviewSessions[id]
		if !ok {
			return data.Error(data.CodeGone)
		}
		out = r
		return nil
	})
	return
}
func (s *Store) InspectPreviewRecord(ctx context.Context, w data.PreviewRecord) error {
	return s.transact(ctx, false, func(d *document) error {
		r, ok := d.PreviewSessions[w.Session.SessionID]
		if !ok {
			return data.Error(data.CodeGone)
		}
		if !reflect.DeepEqual(r, w) {
			return data.Error(data.CodeStale)
		}
		if r.Session.State != data.PreviewReady || !s.options.Now().Before(r.Session.ExpiresAt) {
			return data.Error(data.CodeGone)
		}
		if current, ok := d.Receipts[r.Receipt.ID]; !ok {
			return data.Error(data.CodeGone)
		} else if !reflect.DeepEqual(current, r.Receipt) {
			return data.Error(data.CodeStale)
		}
		return nil
	})
}
func (s *Store) EndPreviewRecord(ctx context.Context, id, state string) error {
	if state != data.PreviewClosed && state != data.PreviewExpired && state != data.PreviewUnavailable {
		return data.Error(data.CodeInvalid)
	}
	return s.transact(ctx, true, func(d *document) error {
		r, ok := d.PreviewSessions[id]
		if !ok {
			return data.Error(data.CodeGone)
		}
		if r.Session.State == data.PreviewReady || state == data.PreviewClosed {
			r.Session.State = state
			d.PreviewSessions[id] = r
		}
		return nil
	})
}
func expirePreviewRecords(d *document, now time.Time, limit int) {
	ids := []string{}
	for id, r := range d.PreviewSessions {
		if r.Session.State == data.PreviewReady && !now.Before(r.Session.ExpiresAt) {
			ids = append(ids, id)
		}
	}
	sort.Strings(ids)
	if len(ids) > limit {
		ids = ids[:limit]
	}
	for _, id := range ids {
		r := d.PreviewSessions[id]
		r.Session.State = data.PreviewExpired
		d.PreviewSessions[id] = r
	}
}
func (s *Store) PrunePreviewRecords(ctx context.Context, limit int) error {
	if limit < 1 || limit > data.PreviewMaxPrune {
		return data.Error(data.CodeInvalid)
	}
	return s.transact(ctx, true, func(d *document) error { expirePreviewRecords(d, s.options.Now(), limit); return nil })
}

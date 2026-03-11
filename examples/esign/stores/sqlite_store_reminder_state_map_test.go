package stores

import (
	"strings"
	"testing"
	"time"
)

func TestEnsureAgreementReminderStateMapRekeysLegacyIDEntries(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	record := AgreementReminderStateRecord{
		ID:          "state-1",
		TenantID:    "tenant-1",
		OrgID:       "org-1",
		AgreementID: "agreement-1",
		RecipientID: "recipient-1",
		Status:      AgreementReminderStatusActive,
		NextDueAt:   &now,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	in := map[string]AgreementReminderStateRecord{
		strings.Join([]string{record.TenantID, record.OrgID, record.ID}, "|"): record,
	}

	out := ensureAgreementReminderStateMap(in)
	if len(out) != 1 {
		t.Fatalf("expected 1 reminder state entry after normalization, got %d", len(out))
	}

	expectedKey := strings.Join([]string{record.TenantID, record.OrgID, record.AgreementID, record.RecipientID}, "|")
	got, ok := out[expectedKey]
	if !ok {
		t.Fatalf("expected normalized key %q in %+v", expectedKey, out)
	}
	if got.ID != record.ID {
		t.Fatalf("expected record id %q, got %q", record.ID, got.ID)
	}
}

func TestEnsureAgreementReminderStateMapDedupesLogicalDuplicates(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	oldUpdated := now.Add(-time.Minute)
	newUpdated := now
	oldRecord := AgreementReminderStateRecord{
		ID:             "state-old",
		TenantID:       "tenant-1",
		OrgID:          "org-1",
		AgreementID:    "agreement-1",
		RecipientID:    "recipient-1",
		Status:         AgreementReminderStatusActive,
		NextDueAt:      &newUpdated,
		LastReasonCode: "old",
		CreatedAt:      now.Add(-2 * time.Minute),
		UpdatedAt:      oldUpdated,
	}
	newRecord := oldRecord
	newRecord.ID = "state-new"
	newRecord.LastReasonCode = "manual_resend"
	newRecord.UpdatedAt = newUpdated

	in := map[string]AgreementReminderStateRecord{
		strings.Join([]string{oldRecord.TenantID, oldRecord.OrgID, oldRecord.ID}, "|"):                                 oldRecord,
		strings.Join([]string{newRecord.TenantID, newRecord.OrgID, newRecord.AgreementID, newRecord.RecipientID}, "|"): newRecord,
	}

	out := ensureAgreementReminderStateMap(in)
	if len(out) != 1 {
		t.Fatalf("expected duplicates to collapse to 1 record, got %d", len(out))
	}

	expectedKey := strings.Join([]string{newRecord.TenantID, newRecord.OrgID, newRecord.AgreementID, newRecord.RecipientID}, "|")
	got := out[expectedKey]
	if got.ID != newRecord.ID {
		t.Fatalf("expected newest record id %q, got %q", newRecord.ID, got.ID)
	}
	if got.LastReasonCode != newRecord.LastReasonCode {
		t.Fatalf("expected newest record reason %q, got %q", newRecord.LastReasonCode, got.LastReasonCode)
	}
}

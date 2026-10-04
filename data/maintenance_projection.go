package data

import (
	"encoding/json"
	"time"
)

// MarshalJSON exposes maintenance readiness without coordinator inputs,
// requesting/delegated principals, policy hashes, epoch keys or pending intents.
// The in-process result retains references for trusted host adapters; persistence
// encodes MaintenanceRecord directly and therefore keeps recovery evidence.
func (r MaintenanceResult) MarshalJSON() ([]byte, error) {
	type view struct {
		Revision                   uint64
		Enabled                    bool
		Generation                 uint64
		Active                     *MaintenanceIdentity
		Due, ExpiresAt             time.Time
		State, Reason, OperationID string
	}
	type targetView struct {
		Activation       Activation
		RecoveryRequired bool
	}
	return json.Marshal(struct {
		Record view       `json:"maintenance"`
		Target targetView `json:"target"`
		DryRun bool       `json:"dry_run"`
	}{view{r.Record.Revision, r.Record.Enabled, r.Record.Generation, r.Record.Active, r.Record.Due, r.Record.ExpiresAt, r.Record.State, r.Record.Reason, r.Record.OperationID}, targetView{r.Target.Activation, r.Target.RecoveryRequired || r.Target.Pending != nil}, r.DryRun})
}

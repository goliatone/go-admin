package data

import (
	"encoding/json"
	"strings"
	"testing"

	gerrors "github.com/goliatone/go-errors"
)

func contractDescriptor() Descriptor {
	h := strings.Repeat("a", 64)
	return Descriptor{Dataset: DatasetRef{Provider: "sample", ID: "a", Version: "1"}, Components: []Component{{Path: "z.json", Digest: h}, {Path: "a.json", Digest: h}}, SourceContractHash: h, SourceContractVersion: "1", PolicyHash: h, AudienceHashes: map[string]string{"a": h}, Timezone: "America/Los_Angeles", Synthetic: true}
}
func contractInput() Input {
	d := contractDescriptor()
	d.Dataset.Digest, _ = d.CompositeDigest()
	return Input{Dataset: d.Dataset, Scenario: ScenarioRef{Dataset: d.Dataset, ID: "ready", Version: "1", ProfileHash: strings.Repeat("b", 64)}, TargetID: "preview", IdempotencyKey: "request-1"}
}
func TestCompositeIdentityBindsContentAndMetadata(t *testing.T) {
	d := contractDescriptor()
	want, err := d.CompositeDigest()
	if err != nil {
		t.Fatal(err)
	}
	d.Components[0], d.Components[1] = d.Components[1], d.Components[0]
	d.Dataset.Digest = want
	d.Capabilities = map[Kind]Capability{Prepare: {Supported: true, Permitted: true}}
	if got, _ := d.CompositeDigest(); got != want {
		t.Fatal("inventory order/discovery changed identity")
	}
	if err := d.ValidateIdentity(); err != nil {
		t.Fatal(err)
	}
	d.SourceContractVersion = "2"
	if got, _ := d.CompositeDigest(); got == want {
		t.Fatal("source version not bound")
	}
	if err := d.ValidateIdentity(); ErrorCode(err) != CodeConflict {
		t.Fatal("version collision accepted", err)
	}
	d = contractDescriptor()
	d.Components[0].Path = "../secret"
	if _, err := d.CompositeDigest(); err == nil {
		t.Fatal("escaping inventory")
	}
	d = contractDescriptor()
	d.Components[0].Path = d.Components[1].Path
	if _, err := d.CompositeDigest(); err == nil {
		t.Fatal("duplicate inventory")
	}
}
func TestFingerprintAndMandatoryGeneration(t *testing.T) {
	in := contractInput()
	want, err := in.Fingerprint(Prepare)
	if err != nil {
		t.Fatal(err)
	}
	if got, _ := in.Normalize().Fingerprint(Prepare); got != want {
		t.Fatal("normalization changed fingerprint")
	}
	for _, alter := range []func(*Input){func(i *Input) { i.DryRun = true }, func(i *Input) { i.BatchLimit = 2 }, func(i *Input) { i.Scenario.ProfileHash = strings.Repeat("c", 64) }, func(i *Input) { i.Dataset.Digest = strings.Repeat("d", 64); i.Scenario.Dataset = i.Dataset }} {
		changed := in
		alter(&changed)
		if got, _ := changed.Fingerprint(Prepare); got == want {
			t.Fatal("work-affecting input not bound")
		}
	}
	in.ReceiptID = "r"
	if err := in.Validate(Activate); err == nil {
		t.Fatal("missing generation accepted")
	}
	var zero uint64
	in.ExpectedGeneration = &zero
	if err := in.Validate(Activate); err != nil {
		t.Fatal("initial generation rejected", err)
	}
	in.ExpectedGeneration = nil
	in.ReceiptID = ""
	in.TimeoutSeconds = 3601
	if err := in.Validate(Prepare); err == nil {
		t.Fatal("unbounded work")
	}
}
func TestLifecycleWireAndSafeErrors(t *testing.T) {
	in := contractInput()
	b, err := json.Marshal(in)
	if err != nil {
		t.Fatal(err)
	}
	for _, key := range []string{"actor_id", "execution_id", "scope_key", "dsn"} {
		if strings.Contains(string(b), key) {
			t.Fatal("trusted metadata in payload")
		}
	}
	for _, code := range []string{CodeDenied, CodeStale, CodeConflict, CodeBusy, CodeUnavailable, CodeLeaseLost, CodeRecovery} {
		err := Error(code)
		structured, ok := err.(*gerrors.Error)
		if !ok || structured.TextCode != code || structured.Code == 0 || ErrorCode(err) != code {
			t.Fatal(code, err)
		}
	}
	result := Result{OperationID: "op-1", Kind: Prepare, State: Queued, Revision: 1, Phase: "accepted"}
	b, _ = json.Marshal(result)
	if !strings.Contains(string(b), `"active":false`) || strings.Contains(string(b), `"activation"`) {
		t.Fatal(string(b))
	}
	v := VerificationResult{ID: "v", ContentRevision: 1, Checks: []Check{{ID: "real-query", Status: CheckPlanned}}}
	if v.Passed() {
		t.Fatal("planned check reported executed")
	}
	v.Checks[0].Status = CheckPassed
	if !v.Passed() {
		t.Fatal("executed check rejected")
	}
	if (StoreCapabilities{AtomicClaims: true, Fencing: true, AtomicIntentFinalize: true, ProtectedRetention: true}).WriteReady() {
		t.Fatal("memory store enables writes")
	}
}

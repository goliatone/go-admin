# Feature List


## Editing

Edit after sending but before signing:
- update the document to correct a typo or update a date etc
    - allow edits to the document and field placement while the envelope is in flight, invalidate any signatures already collected on the modified pages (notifying those signers they need to re-sign), and maintain the audit trail showing what changed, when, and by whom. The final signed version is still the legally binding one.

Edit after signing:
- there are workflows to handle amendments and addenda
    - request amendment: "you could allow a "request amendment" flow where the platform generates a tracked-changes diff, routes it to all original signers for approval, and produces a linked amendment document with its own signatures — while preserving the original signed document's integrity. The original and amendment would be cryptographically chained (the amendment's hash includes a reference to the original's hash), creating an auditable modification history."

**Add a correction/amendment worfklow**:
Sender requests a correction to the document while it's partially signed.
The platform records exactly what changed (diff), when, and by whom.
All existing signatures are invalidated and those signers are notified: "The document has been modified. Specifically, [field X] was changed from [old value] to [new value]. Your previous signature has been invalidated. Please review the updated document and sign again if you agree."
The platform preserves both versions — the original signed version and the corrected version — in the audit trail.
All parties must re-sign the corrected version for it to be complete.
The final certificate of completion shows the full history: original document, modification event, re-signing events.

**Support multiple email addresses per user**


Tags/labels: user-defined, applied to received or sent envelopes. Think Gmail labels. A subcontractor receiving envelopes from multiple clients could tag them by project ("5th St Lobby Phase 1"), by client ("Acme Construction"), by status ("Needs legal review", "Waiting on insurance cert"), or by urgency. Tags would be private to the user — the sender and other recipients wouldn't see them. Implementation-wise, this is a simple many-to-many relationship between envelopes and user-scoped tag entities. You'd want color coding, search/filter by tag, and the ability to create tags on the fly during the tagging action.


Internal notes / annotations — free-text notes attached to an envelope that only the user (or their team) can see. "This is the revised contract from Tuesday's call — Bob wanted the indemnification clause changed." Or "Don't sign until Maria confirms the insurance rider." These are not part of the legal document — they're workflow metadata. They'd appear in the envelope detail view as a separate panel or thread, distinct from the document content. You could support @mentions for team collaboration ("@maria please review clause 7 before I sign").


Custom fields / properties — structured metadata beyond free-text. A real estate firm might want fields for "Property address," "Deal value," "Closing date." A construction company might want "Project number," "Phase," "Trade." These would be configurable per account or team, and filterable/sortable in the envelope list view.


Folders / projects — grouping envelopes into hierarchical containers. DocuSign has basic folders, but they're flat and limited. A proper implementation would allow nested folders, smart folders (auto-populate based on tag/field criteria), and cross-folder references (an envelope can appear in multiple folders without duplication).

#### Competitors

PandaDoc
Oneflow

=====

Claim email flow

The simplest model that actually works: separate identity from contact method, and make email addresses a claim on an identity rather than the identity itself.

The Core Model
You have three entities:
gotype Identity struct {
    ID          string    // internal, opaque (ULID or UUID)
    DisplayName string
    CreatedAt   time.Time
}

type EmailClaim struct {
    Email      string    // unique globally
    IdentityID string    // FK to Identity
    VerifiedAt time.Time
    IsPrimary  bool      // for outbound notifications
}

type Signature struct {
    ID         string
    IdentityID string
    Type       string    // "drawn", "typed", "uploaded"
    Data       []byte
    IsDefault  bool
}
The identity is the anchor. Email addresses are claims attached to it. When an envelope arrives addressed to any verified email on your identity, it resolves to your single inbox. Your signatures, tags, preferences, and document history all hang off the identity, not off individual email addresses.
The lookup path when an envelope is sent to gol@company.com:

Check if that email exists as a verified EmailClaim → if yes, route the envelope to that IdentityID
If not, create a pending envelope associated with that raw email address — the recipient can sign via the email link without an account (same as DocuSign today), or they can claim that email later by adding it to their identity

That's the whole trick. The email-to-identity resolution is a simple indexed lookup. Everything downstream operates on IdentityID, never on raw email.

Adding an Email: The Claim Flow
This needs to be low-friction. The flow:

User goes to their profile, enters a new email address
Platform sends a verification link to that address (standard email verification — nothing novel)
User clicks the link, email is now a verified claim on their identity
Any existing envelopes addressed to that email that were in "unclaimed" state automatically migrate into the user's inbox

Step 4 is the important one — it retroactively unifies history. If you signed 20 documents via email links to gol@gmail.com before ever creating an account, those envelopes were stored against the raw email as an unresolved recipient. The moment you claim that email, those envelopes resolve to your identity and appear in your history.
The data model for this:
gotype EnvelopeRecipient struct {
    EnvelopeID  string
    Email       string     // always stored, this is the addressing record
    IdentityID  *string    // nullable — resolved when email is claimed
    Role        string     // "signer", "cc", "witness"
    Status      string     // "pending", "viewed", "signed", "declined"
    SignedAt    *time.Time
}
When IdentityID is nil, the recipient is anonymous — they interact via email links only. When the email gets claimed by an identity, you backfill IdentityID on all matching EnvelopeRecipient rows. A simple background job:
gofunc (s *Service) ClaimEmail(ctx context.Context, identityID, email string) error {
    // 1. Create verified EmailClaim
    // 2. Backfill: UPDATE envelope_recipients
    //    SET identity_id = ? WHERE email = ? AND identity_id IS NULL
    // 3. Done — inbox queries already filter by identity_id
}
No data migration, no merging of accounts, no complex state reconciliation. You're just filling in a foreign key that was previously null.

Inbox Query
The inbox query becomes:
sqlSELECT e.* FROM envelopes e
JOIN envelope_recipients er ON er.envelope_id = e.id
WHERE er.identity_id = ?
ORDER BY e.updated_at DESC
This returns all envelopes where the user is a participant, regardless of which email address was used. Tags, notes, and folders all reference identity_id, so they apply across the unified view.

What About the Sender's Perspective?
When someone creates an envelope and adds a recipient, they type an email address. They don't know or care about your internal identity — they just know your email. The platform resolves it:

If the email matches a verified claim → the envelope is immediately linked to that identity. The sender sees the recipient's display name.
If no match → the envelope is addressed to a raw email. The recipient gets the standard email link. If they later create an account and verify that email, it resolves retroactively.

The sender never needs to think about identities, accounts, or multiple addresses. They type an email, it works. The resolution happens silently on the recipient side.

Handling Conflicts and Edge Cases
What if someone tries to claim an email that's already claimed by another identity? Reject it. One email can only belong to one identity. If you legitimately need to transfer an email (e.g., a shared team inbox changing owners), that's an explicit "release claim" action by the current owner followed by a new claim by the new owner.
What if a user loses access to all their verified emails? This is the exact DocuSign problem from the BBB complaints. The solution: support at least one non-email recovery method. A phone number, a government ID (if you've done Cl@ve or RENAPER verification), or a recovery code generated at account creation. Any of these can authenticate the identity and allow adding a new email. The identity exists independently of any specific email.
What about organization/team contexts? Add a simple membership layer:
gotype OrgMembership struct {
    IdentityID string
    OrgID      string
    Role       string // "admin", "member", "viewer"
    Email      string // which of their emails is used in this org context
}
The user picks which of their verified emails represents them in each organization. Envelopes sent within the org context use that email, but they all still resolve to the same identity and inbox. If you leave the company and lose gol@company.com, your identity persists — you just remove that email claim. Your signing history stays because it's linked to the identity, not the email.

What About Identity Verification Tiers?
This is where the model gets interesting for the Spain/Argentina use case. An identity can have verification at different levels:
gotype IdentityVerification struct {
    IdentityID string
    Method     string    // "email", "phone", "clave", "renaper", "fnmt"
    Level      string    // "basic", "enhanced", "qualified"
    VerifiedAt time.Time
    ExpiresAt  *time.Time
    Metadata   jsonb     // method-specific data (certificate ID, etc.)
}
Email verification gives you basic level — sufficient for simple e-signatures. Cl@ve or RENAPER biometric verification gives you enhanced or qualified — sufficient for AES/QES or firma digital. The platform knows what signature levels this identity is eligible for based on their highest verification, and can automatically route to the appropriate signing infrastructure.
This replaces the "which certificate do I use?" decision with a transparent identity model. You verified yourself once via Cl@ve — now any document that requires QES in Spain can use that verification, regardless of which email address the document was sent to.

Implementation Complexity
This is genuinely not a large engineering effort. The core data model is four tables (identities, email_claims, envelope_recipients, identity_verifications). The claim flow is a standard email verification loop. The inbox resolution is a JOIN. The retroactive backfill is a single UPDATE query.
The biggest implementation consideration is the uniqueness constraint on emails — you need a global unique index on email_claims.email to prevent two identities from claiming the same address. And you need to handle the race condition where an envelope is sent to an email that gets claimed between the send and the signing — but that's just a check-on-sign: resolve the email to the identity at signing time, not at send time.
If you're building this in Go with your existing stack (go-repository-bun for persistence, go-auth for authentication), this is probably 2-3 weeks of focused work for the core identity model, claim flow, and inbox resolution. The identity verification integrations (Cl@ve, RENAPER) are separate work that plugs into the IdentityVerification entity when you're ready.
The key insight is that this model doesn't require users to do anything special. If they only ever use one email, it works exactly like DocuSign — one email, one account, no friction. The multi-email capability is additive. You only engage with it when you want to claim an additional address. And the retroactive resolution means there's no penalty for adding an email later — your history consolidates automatically.

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

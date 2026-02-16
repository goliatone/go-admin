CREATE TABLE participants (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    agreement_id TEXT NOT NULL,
    email TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL CHECK (role IN ('signer', 'cc')),
    signing_stage INTEGER NOT NULL CHECK (signing_stage > 0),
    first_view_at TIMESTAMP NULL,
    last_view_at TIMESTAMP NULL,
    declined_at TIMESTAMP NULL,
    decline_reason TEXT NOT NULL DEFAULT '',
    completed_at TIMESTAMP NULL,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT uq_participants_scope_email UNIQUE (tenant_id, org_id, agreement_id, email),
    CONSTRAINT fk_participants_agreement_scope FOREIGN KEY (tenant_id, org_id, agreement_id)
      REFERENCES agreements (tenant_id, org_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_participants_scope_agreement_stage
    ON participants (tenant_id, org_id, agreement_id, signing_stage);

CREATE INDEX idx_participants_scope_agreement_role
    ON participants (tenant_id, org_id, agreement_id, role);

CREATE TABLE field_definitions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    agreement_id TEXT NOT NULL,
    participant_id TEXT NOT NULL,
    field_type TEXT NOT NULL CHECK (field_type IN ('signature', 'name', 'date_signed', 'text', 'checkbox', 'initials')),
    required BOOLEAN NOT NULL DEFAULT FALSE,
    validation_json TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_field_definitions_agreement_scope FOREIGN KEY (tenant_id, org_id, agreement_id)
      REFERENCES agreements (tenant_id, org_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_field_definitions_participant_scope FOREIGN KEY (tenant_id, org_id, participant_id)
      REFERENCES participants (tenant_id, org_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_field_definitions_scope_agreement
    ON field_definitions (tenant_id, org_id, agreement_id);

CREATE INDEX idx_field_definitions_scope_participant
    ON field_definitions (tenant_id, org_id, participant_id);

CREATE TABLE field_instances (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    agreement_id TEXT NOT NULL,
    field_definition_id TEXT NOT NULL,
    page_number INTEGER NOT NULL CHECK (page_number > 0),
    x REAL NOT NULL,
    y REAL NOT NULL,
    width REAL NOT NULL CHECK (width > 0),
    height REAL NOT NULL CHECK (height > 0),
    tab_index INTEGER NOT NULL DEFAULT 0,
    label TEXT NOT NULL DEFAULT '',
    appearance_json TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_field_instances_agreement_scope FOREIGN KEY (tenant_id, org_id, agreement_id)
      REFERENCES agreements (tenant_id, org_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_field_instances_definition_scope FOREIGN KEY (tenant_id, org_id, field_definition_id)
      REFERENCES field_definitions (tenant_id, org_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_field_instances_scope_agreement
    ON field_instances (tenant_id, org_id, agreement_id);

CREATE INDEX idx_field_instances_scope_definition
    ON field_instances (tenant_id, org_id, field_definition_id);

CREATE UNIQUE INDEX uq_field_instances_scope_definition_tab
    ON field_instances (tenant_id, org_id, field_definition_id, page_number, tab_index);

INSERT INTO participants (
    id, tenant_id, org_id, agreement_id, email, name, role, signing_stage,
    first_view_at, last_view_at, declined_at, decline_reason, completed_at,
    version, created_at, updated_at
)
SELECT
    r.id,
    r.tenant_id,
    r.org_id,
    r.agreement_id,
    r.email,
    r.name,
    r.role,
    r.signing_order,
    r.first_view_at,
    r.last_view_at,
    r.declined_at,
    COALESCE(r.decline_reason, ''),
    r.completed_at,
    COALESCE(r.version, 1),
    r.created_at,
    r.updated_at
FROM recipients r
WHERE NOT EXISTS (
    SELECT 1
    FROM participants p
    WHERE p.tenant_id = r.tenant_id
      AND p.org_id = r.org_id
      AND p.id = r.id
);

INSERT INTO field_definitions (
    id, tenant_id, org_id, agreement_id, participant_id, field_type,
    required, validation_json, created_at, updated_at
)
SELECT
    f.id,
    f.tenant_id,
    f.org_id,
    f.agreement_id,
    f.recipient_id,
    f.field_type,
    f.required,
    '',
    f.created_at,
    f.updated_at
FROM fields f
WHERE NOT EXISTS (
    SELECT 1
    FROM field_definitions d
    WHERE d.tenant_id = f.tenant_id
      AND d.org_id = f.org_id
      AND d.id = f.id
);

INSERT INTO field_instances (
    id, tenant_id, org_id, agreement_id, field_definition_id,
    page_number, x, y, width, height, tab_index, label, appearance_json,
    created_at, updated_at
)
SELECT
    f.id,
    f.tenant_id,
    f.org_id,
    f.agreement_id,
    f.id,
    f.page_number,
    f.pos_x,
    f.pos_y,
    f.width,
    f.height,
    0,
    '',
    '',
    f.created_at,
    f.updated_at
FROM fields f
WHERE NOT EXISTS (
    SELECT 1
    FROM field_instances i
    WHERE i.tenant_id = f.tenant_id
      AND i.org_id = f.org_id
      AND i.id = f.id
);

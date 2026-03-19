/**
 * Lineage Contract Fixture Tests
 *
 * Smoke coverage for document and agreement detail page rendering states.
 * Validates that pages render correctly for:
 * - Empty (upload-only, no lineage)
 * - Native (single import with lineage)
 * - Repeated import (multiple revisions)
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 2 Task 2.8
 */

import {
  documentLineageFixtures,
  agreementLineageFixtures,
  getDocumentLineageFixture,
  getAgreementLineageFixture,
  validateDocumentLineagePayload,
  validateAgreementLineagePayload,
  importResponseFixtures,
  getImportResponseFixture,
  validateImportResponsePayload,
  getImportFixtureStates,
  type LineageFixtureState,
  type ImportFixtureState,
} from './lineage-fixtures.js';
import {
  normalizeDocumentLineageDetail,
  normalizeAgreementLineageDetail,
  normalizeGoogleImportResponseWithLineage,
} from './lineage-contracts.js';

describe('Document Lineage Fixtures', () => {
  describe('empty state', () => {
    const fixture = documentLineageFixtures.empty;

    it('has valid document_id', () => {
      expect(typeof fixture.document_id).toBe('string');
      expect(fixture.document_id.length).toBeGreaterThan(0);
    });

    it('has null source references', () => {
      expect(fixture.source_document).toBeNull();
      expect(fixture.source_revision).toBeNull();
      expect(fixture.source_artifact).toBeNull();
      expect(fixture.google_source).toBeNull();
    });

    it('has empty_state with upload_only kind', () => {
      expect(fixture.empty_state.kind).toBe('upload_only');
      expect(fixture.empty_state.title).toBe('Direct Upload');
    });

    it('has no candidate warnings', () => {
      expect(fixture.candidate_warning_summary).toEqual([]);
    });

    it('normalizes correctly', () => {
      const normalized = normalizeDocumentLineageDetail(fixture);
      expect(normalized.document_id).toBe(fixture.document_id);
      expect(normalized.source_document).toBeNull();
      expect(normalized.empty_state.kind).toBe('upload_only');
    });

    it('passes validation', () => {
      const errors = validateDocumentLineagePayload(fixture);
      expect(errors).toEqual([]);
    });
  });

  describe('native lineage state', () => {
    const fixture = documentLineageFixtures.native;

    it('has valid document_id', () => {
      expect(typeof fixture.document_id).toBe('string');
      expect(fixture.document_id.length).toBeGreaterThan(0);
    });

    it('has source_document reference', () => {
      expect(fixture.source_document).not.toBeNull();
      expect(fixture.source_document!.id).toBeTruthy();
      expect(fixture.source_document!.label).toBeTruthy();
    });

    it('has source_revision with provider_revision_hint', () => {
      expect(fixture.source_revision).not.toBeNull();
      expect(fixture.source_revision!.id).toBeTruthy();
      expect(fixture.source_revision!.provider_revision_hint).toBe('v1');
    });

    it('has source_artifact with signable_pdf kind', () => {
      expect(fixture.source_artifact).not.toBeNull();
      expect(fixture.source_artifact!.artifact_kind).toBe('signable_pdf');
      expect(fixture.source_artifact!.sha256).toBeTruthy();
    });

    it('has google_source metadata', () => {
      expect(fixture.google_source).not.toBeNull();
      expect(fixture.google_source!.external_file_id).toBeTruthy();
      expect(fixture.google_source!.web_url).toContain('docs.google.com');
    });

    it('has fingerprint ready status', () => {
      expect(fixture.fingerprint_status.status).toBe('ready');
      expect(fixture.fingerprint_status.evidence_available).toBe(true);
    });

    it('has diagnostics_url', () => {
      expect(fixture.diagnostics_url).toContain('/diagnostics/');
    });

    it('normalizes correctly', () => {
      const normalized = normalizeDocumentLineageDetail(fixture);
      expect(normalized.document_id).toBe(fixture.document_id);
      expect(normalized.source_document!.id).toBe(fixture.source_document!.id);
      expect(normalized.google_source!.external_file_id).toBe(
        fixture.google_source!.external_file_id
      );
    });

    it('passes validation', () => {
      const errors = validateDocumentLineagePayload(fixture);
      expect(errors).toEqual([]);
    });
  });

  describe('repeated import state', () => {
    const fixture = documentLineageFixtures.repeated_import;

    it('has v2 revision hint', () => {
      expect(fixture.source_revision).not.toBeNull();
      expect(fixture.source_revision!.provider_revision_hint).toBe('v2');
    });

    it('has updated modified_time', () => {
      expect(fixture.google_source!.modified_time).toBe('2026-03-18T14:00:00Z');
    });

    it('has different artifact than v1', () => {
      const nativeArtifact = documentLineageFixtures.native.source_artifact!;
      expect(fixture.source_artifact!.sha256).not.toBe(nativeArtifact.sha256);
      expect(fixture.source_artifact!.page_count).toBe(4);
    });

    it('normalizes correctly', () => {
      const normalized = normalizeDocumentLineageDetail(fixture);
      expect(normalized.source_revision!.provider_revision_hint).toBe('v2');
    });

    it('passes validation', () => {
      const errors = validateDocumentLineagePayload(fixture);
      expect(errors).toEqual([]);
    });
  });

  describe('candidate warning state', () => {
    const fixture = documentLineageFixtures.candidate_warning;

    it('has candidate_warning_summary', () => {
      expect(fixture.candidate_warning_summary.length).toBeGreaterThan(0);
    });

    it('has pending_review status', () => {
      const warning = fixture.candidate_warning_summary[0];
      expect(warning.status).toBe('pending_review');
      expect(warning.confidence_band).toBe('medium');
    });

    it('has evidence array', () => {
      const warning = fixture.candidate_warning_summary[0];
      expect(warning.evidence.length).toBeGreaterThan(0);
      expect(warning.evidence[0].code).toBeTruthy();
    });

    it('passes validation', () => {
      const errors = validateDocumentLineagePayload(fixture);
      expect(errors).toEqual([]);
    });
  });

  describe('fingerprint pending state', () => {
    const fixture = documentLineageFixtures.fingerprint_pending;

    it('has pending fingerprint status', () => {
      expect(fixture.fingerprint_status.status).toBe('pending');
      expect(fixture.fingerprint_status.evidence_available).toBe(false);
    });

    it('passes validation', () => {
      const errors = validateDocumentLineagePayload(fixture);
      expect(errors).toEqual([]);
    });
  });
});

describe('Agreement Lineage Fixtures', () => {
  describe('empty state', () => {
    const fixture = agreementLineageFixtures.empty;

    it('has valid agreement_id', () => {
      expect(typeof fixture.agreement_id).toBe('string');
      expect(fixture.agreement_id.length).toBeGreaterThan(0);
    });

    it('has null source references', () => {
      expect(fixture.source_revision).toBeNull();
      expect(fixture.linked_document_artifact).toBeNull();
      expect(fixture.google_source).toBeNull();
    });

    it('has newer_source_exists false', () => {
      expect(fixture.newer_source_exists).toBe(false);
    });

    it('has empty_state with upload_only kind', () => {
      expect(fixture.empty_state.kind).toBe('upload_only');
    });

    it('normalizes correctly', () => {
      const normalized = normalizeAgreementLineageDetail(fixture);
      expect(normalized.agreement_id).toBe(fixture.agreement_id);
      expect(normalized.source_revision).toBeNull();
    });

    it('passes validation', () => {
      const errors = validateAgreementLineagePayload(fixture);
      expect(errors).toEqual([]);
    });
  });

  describe('native lineage state', () => {
    const fixture = agreementLineageFixtures.native;

    it('has source_revision with pinned revision', () => {
      expect(fixture.source_revision).not.toBeNull();
      expect(fixture.source_revision!.id).toBeTruthy();
    });

    it('has linked_document_artifact', () => {
      expect(fixture.linked_document_artifact).not.toBeNull();
      expect(fixture.linked_document_artifact!.artifact_kind).toBe('signable_pdf');
    });

    it('has google_source metadata', () => {
      expect(fixture.google_source).not.toBeNull();
      expect(fixture.google_source!.external_file_id).toBeTruthy();
    });

    it('has newer_source_exists false', () => {
      expect(fixture.newer_source_exists).toBe(false);
    });

    it('normalizes correctly', () => {
      const normalized = normalizeAgreementLineageDetail(fixture);
      expect(normalized.agreement_id).toBe(fixture.agreement_id);
      expect(normalized.source_revision!.id).toBe(fixture.source_revision!.id);
    });

    it('passes validation', () => {
      const errors = validateAgreementLineagePayload(fixture);
      expect(errors).toEqual([]);
    });
  });

  describe('newer_source_exists state', () => {
    const fixture = agreementLineageFixtures.newer_source_exists;

    it('has newer_source_exists true', () => {
      expect(fixture.newer_source_exists).toBe(true);
    });

    it('has pinned source_revision (not updated)', () => {
      expect(fixture.source_revision).not.toBeNull();
      expect(fixture.source_revision!.provider_revision_hint).toBe('v1');
    });

    it('normalizes correctly', () => {
      const normalized = normalizeAgreementLineageDetail(fixture);
      expect(normalized.newer_source_exists).toBe(true);
    });

    it('passes validation', () => {
      const errors = validateAgreementLineagePayload(fixture);
      expect(errors).toEqual([]);
    });
  });

  describe('candidate warning state', () => {
    const fixture = agreementLineageFixtures.candidate_warning;

    it('has candidate_warning_summary', () => {
      expect(fixture.candidate_warning_summary.length).toBeGreaterThan(0);
    });

    it('passes validation', () => {
      const errors = validateAgreementLineagePayload(fixture);
      expect(errors).toEqual([]);
    });
  });
});

describe('Fixture Helpers', () => {
  describe('getDocumentLineageFixture', () => {
    it('returns empty fixture', () => {
      const fixture = getDocumentLineageFixture('empty');
      expect(fixture.document_id).toBe(documentLineageFixtures.empty.document_id);
    });

    it('returns native fixture', () => {
      const fixture = getDocumentLineageFixture('native');
      expect(fixture.source_document).not.toBeNull();
    });

    it('returns a copy, not the original', () => {
      const fixture1 = getDocumentLineageFixture('native');
      const fixture2 = getDocumentLineageFixture('native');
      expect(fixture1).not.toBe(fixture2);
      expect(fixture1).toEqual(fixture2);
    });

    it('throws for unknown state', () => {
      expect(() => getDocumentLineageFixture('unknown' as LineageFixtureState)).toThrow(
        'Unknown document lineage fixture state'
      );
    });
  });

  describe('getAgreementLineageFixture', () => {
    it('returns empty fixture', () => {
      const fixture = getAgreementLineageFixture('empty');
      expect(fixture.agreement_id).toBe(agreementLineageFixtures.empty.agreement_id);
    });

    it('returns a copy, not the original', () => {
      const fixture1 = getAgreementLineageFixture('native');
      const fixture2 = getAgreementLineageFixture('native');
      expect(fixture1).not.toBe(fixture2);
    });
  });
});

describe('Validation Functions', () => {
  describe('validateDocumentLineagePayload', () => {
    it('returns empty array for valid payload', () => {
      const errors = validateDocumentLineagePayload(documentLineageFixtures.native);
      expect(errors).toEqual([]);
    });

    it('returns errors for null payload', () => {
      const errors = validateDocumentLineagePayload(null);
      expect(errors).toContain('payload must be an object');
    });

    it('returns errors for missing required fields', () => {
      const errors = validateDocumentLineagePayload({});
      expect(errors).toContain('document_id must be a string');
      expect(errors).toContain('fingerprint_status must be an object');
      expect(errors).toContain('candidate_warning_summary must be an array');
      expect(errors).toContain('empty_state must be an object');
    });

    it('returns errors for wrong types', () => {
      const errors = validateDocumentLineagePayload({
        document_id: 123,
        fingerprint_status: {},
        candidate_warning_summary: [],
        empty_state: {},
      });
      expect(errors).toContain('document_id must be a string');
    });
  });

  describe('validateAgreementLineagePayload', () => {
    it('returns empty array for valid payload', () => {
      const errors = validateAgreementLineagePayload(agreementLineageFixtures.native);
      expect(errors).toEqual([]);
    });

    it('returns errors for missing required fields', () => {
      const errors = validateAgreementLineagePayload({});
      expect(errors).toContain('agreement_id must be a string');
      expect(errors).toContain('newer_source_exists must be a boolean');
      expect(errors).toContain('candidate_warning_summary must be an array');
      expect(errors).toContain('empty_state must be an object');
    });
  });
});

describe('Normalization Roundtrip', () => {
  it('normalizes all document fixtures without loss', () => {
    for (const [state, fixture] of Object.entries(documentLineageFixtures)) {
      const normalized = normalizeDocumentLineageDetail(fixture);
      expect(normalized.document_id).toBe(fixture.document_id);
      expect(normalized.empty_state.kind).toBe(fixture.empty_state.kind);

      if (fixture.source_document) {
        expect(normalized.source_document!.id).toBe(fixture.source_document.id);
      } else {
        expect(normalized.source_document).toBeNull();
      }
    }
  });

  it('normalizes all agreement fixtures without loss', () => {
    for (const [state, fixture] of Object.entries(agreementLineageFixtures)) {
      const normalized = normalizeAgreementLineageDetail(fixture);
      expect(normalized.agreement_id).toBe(fixture.agreement_id);
      expect(normalized.newer_source_exists).toBe(fixture.newer_source_exists);

      if (fixture.source_revision) {
        expect(normalized.source_revision!.id).toBe(fixture.source_revision.id);
      } else {
        expect(normalized.source_revision).toBeNull();
      }
    }
  });
});

// ============================================================================
// Import Response Fixtures Tests (Phase 3 Task 3.10)
// ============================================================================

describe('Import Response Fixtures', () => {
  describe('native_import_success state', () => {
    const fixture = importResponseFixtures.native_import_success;

    it('has succeeded status', () => {
      expect(fixture.status).toBe('succeeded');
    });

    it('has native_import lineage outcome', () => {
      expect(fixture.lineage_outcome).toBe('native_import');
    });

    it('has is_new_source true', () => {
      expect(fixture.provenance.is_new_source).toBe(true);
    });

    it('has revision_reused false', () => {
      expect(fixture.provenance.revision_reused).toBe(false);
    });

    it('has document_id and agreement_id', () => {
      expect(fixture.document_id).toBeTruthy();
      expect(fixture.agreement_id).toBeTruthy();
    });

    it('has source_document_id in provenance', () => {
      expect(fixture.provenance.source_document_id).toBeTruthy();
    });

    it('has no error', () => {
      expect(fixture.error).toBeNull();
    });

    it('passes validation', () => {
      const errors = validateImportResponsePayload(fixture);
      expect(errors).toEqual([]);
    });
  });

  describe('duplicate_import state', () => {
    const fixture = importResponseFixtures.duplicate_import;

    it('has succeeded status', () => {
      expect(fixture.status).toBe('succeeded');
    });

    it('has duplicate_import lineage outcome', () => {
      expect(fixture.lineage_outcome).toBe('duplicate_import');
    });

    it('has is_new_source false', () => {
      expect(fixture.provenance.is_new_source).toBe(false);
    });

    it('has revision_reused true', () => {
      expect(fixture.provenance.revision_reused).toBe(true);
    });

    it('has document_id but no agreement_id', () => {
      expect(fixture.document_id).toBeTruthy();
      expect(fixture.agreement_id).toBeNull();
    });

    it('passes validation', () => {
      const errors = validateImportResponsePayload(fixture);
      expect(errors).toEqual([]);
    });
  });

  describe('unchanged_reimport state', () => {
    const fixture = importResponseFixtures.unchanged_reimport;

    it('has unchanged_reimport lineage outcome', () => {
      expect(fixture.lineage_outcome).toBe('unchanged_reimport');
    });

    it('has revision_reused true', () => {
      expect(fixture.provenance.revision_reused).toBe(true);
    });

    it('has is_new_source false', () => {
      expect(fixture.provenance.is_new_source).toBe(false);
    });

    it('passes validation', () => {
      const errors = validateImportResponsePayload(fixture);
      expect(errors).toEqual([]);
    });
  });

  describe('changed_source_reimport state', () => {
    const fixture = importResponseFixtures.changed_source_reimport;

    it('has changed_source_reimport lineage outcome', () => {
      expect(fixture.lineage_outcome).toBe('changed_source_reimport');
    });

    it('has revision_reused false', () => {
      expect(fixture.provenance.revision_reused).toBe(false);
    });

    it('has is_new_source false', () => {
      expect(fixture.provenance.is_new_source).toBe(false);
    });

    it('has new revision id', () => {
      expect(fixture.provenance.source_revision_id).toContain('v2');
    });

    it('passes validation', () => {
      const errors = validateImportResponsePayload(fixture);
      expect(errors).toEqual([]);
    });
  });

  describe('import_failure state', () => {
    const fixture = importResponseFixtures.import_failure;

    it('has failed status', () => {
      expect(fixture.status).toBe('failed');
    });

    it('has import_failure lineage outcome', () => {
      expect(fixture.lineage_outcome).toBe('import_failure');
    });

    it('has null provenance IDs', () => {
      expect(fixture.provenance.source_document_id).toBeNull();
      expect(fixture.provenance.source_revision_id).toBeNull();
      expect(fixture.provenance.source_artifact_id).toBeNull();
    });

    it('has null document and agreement IDs', () => {
      expect(fixture.document_id).toBeNull();
      expect(fixture.agreement_id).toBeNull();
    });

    it('has error object', () => {
      expect(fixture.error).not.toBeNull();
      expect(fixture.error!.code).toBe('IMPORT_FAILED');
      expect(fixture.error!.message).toBeTruthy();
    });

    it('passes validation', () => {
      const errors = validateImportResponsePayload(fixture);
      expect(errors).toEqual([]);
    });
  });
});

describe('Import Fixture Helpers', () => {
  describe('getImportResponseFixture', () => {
    it('returns native_import_success fixture', () => {
      const fixture = getImportResponseFixture('native_import_success');
      expect(fixture.lineage_outcome).toBe('native_import');
    });

    it('returns import_failure fixture', () => {
      const fixture = getImportResponseFixture('import_failure');
      expect(fixture.status).toBe('failed');
    });

    it('returns a copy, not the original', () => {
      const fixture1 = getImportResponseFixture('native_import_success');
      const fixture2 = getImportResponseFixture('native_import_success');
      expect(fixture1).not.toBe(fixture2);
      expect(fixture1.provenance).not.toBe(fixture2.provenance);
      expect(fixture1).toEqual(fixture2);
    });

    it('throws for unknown state', () => {
      expect(() => getImportResponseFixture('unknown' as ImportFixtureState)).toThrow(
        'Unknown import response fixture state'
      );
    });
  });

  describe('getImportFixtureStates', () => {
    it('returns all five fixture states', () => {
      const states = getImportFixtureStates();
      expect(states).toHaveLength(5);
      expect(states).toContain('native_import_success');
      expect(states).toContain('duplicate_import');
      expect(states).toContain('unchanged_reimport');
      expect(states).toContain('changed_source_reimport');
      expect(states).toContain('import_failure');
    });
  });
});

describe('Import Response Validation', () => {
  describe('validateImportResponsePayload', () => {
    it('returns empty array for valid payload', () => {
      const errors = validateImportResponsePayload(importResponseFixtures.native_import_success);
      expect(errors).toEqual([]);
    });

    it('returns errors for null payload', () => {
      const errors = validateImportResponsePayload(null);
      expect(errors).toContain('payload must be an object');
    });

    it('returns errors for missing required fields', () => {
      const errors = validateImportResponsePayload({});
      expect(errors).toContain('import_run_id must be a string');
      expect(errors).toContain('status must be a string');
      expect(errors).toContain('lineage_outcome must be a string');
      expect(errors).toContain('provenance must be an object');
    });

    it('returns errors for invalid provenance', () => {
      const errors = validateImportResponsePayload({
        import_run_id: 'test',
        status: 'succeeded',
        lineage_outcome: 'native_import',
        provenance: {
          revision_reused: 'not-a-boolean',
          is_new_source: 'not-a-boolean',
        },
      });
      expect(errors).toContain('provenance.revision_reused must be a boolean');
      expect(errors).toContain('provenance.is_new_source must be a boolean');
    });
  });
});

describe('Import Response Normalization Roundtrip', () => {
  it('normalizes all import fixtures without loss', () => {
    for (const [state, fixture] of Object.entries(importResponseFixtures)) {
      const normalized = normalizeGoogleImportResponseWithLineage(fixture);
      expect(normalized.import_run_id).toBe(fixture.import_run_id);
      expect(normalized.status).toBe(fixture.status);
      expect(normalized.lineage_outcome).toBe(fixture.lineage_outcome);
      expect(normalized.provenance.is_new_source).toBe(fixture.provenance.is_new_source);
      expect(normalized.provenance.revision_reused).toBe(fixture.provenance.revision_reused);
    }
  });
});

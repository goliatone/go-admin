/**
 * Source-Management Contract Fixtures
 *
 * Canonical frontend fixtures mirroring backend-owned example payloads.
 * These fixtures enable UI development and contract testing without backend dependencies.
 *
 * CRITICAL RULES:
 * 1. Fixtures must match backend contract shapes exactly
 * 2. Do not add frontend-only semantic fields
 * 3. Include all required states: empty, single, multi, warning, error
 * 4. Update fixtures when backend contracts change
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 11 Task 11.10
 * @see examples/esign/services/lineage_contracts.go (backend source of truth)
 */

import type {
  SourceListPage,
  SourceDetail,
  SourceRevisionPage,
  SourceRelationshipPage,
  SourceHandlePage,
  SourceRevisionDetail,
  SourceArtifactPage,
  SourceCommentPage,
  SourceSearchResults,
  Phase11SourceManagementContractFixtures,
} from './lineage-contracts.js';

// ============================================================================
// Source List Fixtures
// ============================================================================

/**
 * Empty source list (no sources found).
 */
export const SOURCE_LIST_EMPTY: SourceListPage = {
  items: [],
  page_info: {
    mode: 'page',
    page: 1,
    page_size: 20,
    total_count: 0,
    has_more: false,
  },
  applied_query: {
    page: 1,
    page_size: 20,
  },
  permissions: {
    can_view_diagnostics: true,
    can_open_provider_links: true,
    can_review_candidates: true,
    can_view_comments: false,
  },
  empty_state: {
    kind: 'no_results',
    title: 'No sources found',
    description: 'No canonical source documents match your query.',
  },
  links: {
    self: '/admin/api/v1/esign/sources',
  },
};

/**
 * Single source list item.
 */
export const SOURCE_LIST_SINGLE: SourceListPage = {
  items: [
    {
      source: {
        id: 'src_01HX5ZCQK0ABC123',
        label: 'Product Requirements Document v3.pdf',
        url: '/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123',
      },
      status: 'active',
      lineage_confidence: 'high',
      provider: {
        kind: 'google_drive',
        label: 'Google Drive',
        external_file_id: '1a2b3c4d5e6f7g8h9i0j',
        account_id: 'user@example.com',
        drive_id: 'root',
        web_url: 'https://docs.google.com/document/d/1a2b3c4d5e6f7g8h9i0j/edit',
      },
      latest_revision: {
        id: 'rev_01HX5ZCQK0DEF456',
        provider_revision_hint: 'v3',
        modified_time: '2026-01-15T10:30:00Z',
        exported_at: '2026-01-15T10:32:00Z',
        exported_by_user_id: 'usr_01HX5ZCQK0GHI789',
        source_mime_type: 'application/vnd.google-apps.document',
      },
      active_handle: {
        id: 'hdl_01HX5ZCQK0JKL012',
        provider_kind: 'google_drive',
        external_file_id: '1a2b3c4d5e6f7g8h9i0j',
        account_id: 'user@example.com',
        drive_id: 'root',
        web_url: 'https://docs.google.com/document/d/1a2b3c4d5e6f7g8h9i0j/edit',
        handle_status: 'active',
        links: {},
      },
      revision_count: 3,
      handle_count: 1,
      relationship_count: 0,
      pending_candidate_count: 0,
      permissions: {
        can_view_diagnostics: true,
        can_open_provider_links: true,
        can_review_candidates: true,
        can_view_comments: false,
      },
      links: {
        self: '/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123',
        revisions: '/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123/revisions',
        relationships: '/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123/relationships',
        handles: '/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123/handles',
        diagnostics: '/admin/debug/lineage/sources/src_01HX5ZCQK0ABC123',
        provider: 'https://docs.google.com/document/d/1a2b3c4d5e6f7g8h9i0j/edit',
      },
    },
  ],
  page_info: {
    mode: 'page',
    page: 1,
    page_size: 20,
    total_count: 1,
    has_more: false,
  },
  applied_query: {
    page: 1,
    page_size: 20,
  },
  permissions: {
    can_view_diagnostics: true,
    can_open_provider_links: true,
    can_review_candidates: true,
    can_view_comments: false,
  },
  empty_state: {
    kind: 'none',
  },
  links: {
    self: '/admin/api/v1/esign/sources',
  },
};

// ============================================================================
// Source Detail Fixtures
// ============================================================================

/**
 * Source detail with repeated revisions.
 */
export const SOURCE_DETAIL_REPEATED: SourceDetail = {
  source: {
    id: 'src_01HX5ZCQK0ABC123',
    label: 'Product Requirements Document v3.pdf',
    url: '/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123',
  },
  status: 'active',
  lineage_confidence: 'high',
  provider: {
    kind: 'google_drive',
    label: 'Google Drive',
    external_file_id: '1a2b3c4d5e6f7g8h9i0j',
    account_id: 'user@example.com',
    drive_id: 'root',
    web_url: 'https://docs.google.com/document/d/1a2b3c4d5e6f7g8h9i0j/edit',
  },
  active_handle: {
    id: 'hdl_01HX5ZCQK0JKL012',
    provider_kind: 'google_drive',
    external_file_id: '1a2b3c4d5e6f7g8h9i0j',
    account_id: 'user@example.com',
    drive_id: 'root',
    web_url: 'https://docs.google.com/document/d/1a2b3c4d5e6f7g8h9i0j/edit',
    handle_status: 'active',
    links: {},
  },
  latest_revision: {
    id: 'rev_01HX5ZCQK0DEF456',
    provider_revision_hint: 'v3',
    modified_time: '2026-01-15T10:30:00Z',
    exported_at: '2026-01-15T10:32:00Z',
    exported_by_user_id: 'usr_01HX5ZCQK0GHI789',
    source_mime_type: 'application/vnd.google-apps.document',
  },
  revision_count: 3,
  handle_count: 1,
  relationship_count: 0,
  pending_candidate_count: 0,
  permissions: {
    can_view_diagnostics: true,
    can_open_provider_links: true,
    can_review_candidates: true,
    can_view_comments: false,
  },
  links: {
    self: '/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123',
    revisions: '/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123/revisions',
    relationships: '/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123/relationships',
    handles: '/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123/handles',
    diagnostics: '/admin/debug/lineage/sources/src_01HX5ZCQK0ABC123',
    provider: 'https://docs.google.com/document/d/1a2b3c4d5e6f7g8h9i0j/edit',
  },
  empty_state: {
    kind: 'none',
  },
};

/**
 * Source detail for merged source.
 */
export const SOURCE_DETAIL_MERGED: SourceDetail = {
  source: {
    id: 'src_01HX5ZCQK0MERGED',
    label: 'Contract Template (Merged)',
    url: '/admin/api/v1/esign/sources/src_01HX5ZCQK0MERGED',
  },
  status: 'merged',
  lineage_confidence: 'high',
  provider: {
    kind: 'google_drive',
    label: 'Google Drive',
    external_file_id: '2z3y4x5w6v7u8t9s0r',
    account_id: 'admin@example.com',
    drive_id: 'root',
    web_url: 'https://docs.google.com/document/d/2z3y4x5w6v7u8t9s0r/edit',
  },
  active_handle: null,
  latest_revision: {
    id: 'rev_01HX5ZCQK0MERGED',
    provider_revision_hint: 'final',
    modified_time: '2025-12-20T14:00:00Z',
    exported_at: '2025-12-20T14:02:00Z',
    source_mime_type: 'application/vnd.google-apps.document',
  },
  revision_count: 5,
  handle_count: 2,
  relationship_count: 1,
  pending_candidate_count: 0,
  permissions: {
    can_view_diagnostics: true,
    can_open_provider_links: false,
    can_review_candidates: false,
    can_view_comments: false,
  },
  links: {
    self: '/admin/api/v1/esign/sources/src_01HX5ZCQK0MERGED',
    revisions: '/admin/api/v1/esign/sources/src_01HX5ZCQK0MERGED/revisions',
    relationships: '/admin/api/v1/esign/sources/src_01HX5ZCQK0MERGED/relationships',
    handles: '/admin/api/v1/esign/sources/src_01HX5ZCQK0MERGED/handles',
    diagnostics: '/admin/debug/lineage/sources/src_01HX5ZCQK0MERGED',
  },
  empty_state: {
    kind: 'none',
  },
};

/**
 * Source detail for archived source.
 */
export const SOURCE_DETAIL_ARCHIVED: SourceDetail = {
  source: {
    id: 'src_01HX5ZCQK0ARCHIVE',
    label: 'Old Draft Agreement',
    url: '/admin/api/v1/esign/sources/src_01HX5ZCQK0ARCHIVE',
  },
  status: 'archived',
  lineage_confidence: 'medium',
  provider: {
    kind: 'google_drive',
    label: 'Google Drive',
    external_file_id: '3p4o5n6m7l8k9j0i1h',
    account_id: 'user@example.com',
    web_url: 'https://docs.google.com/document/d/3p4o5n6m7l8k9j0i1h/edit',
  },
  active_handle: null,
  latest_revision: {
    id: 'rev_01HX5ZCQK0ARCHIVE',
    modified_time: '2025-10-01T09:00:00Z',
    exported_at: '2025-10-01T09:02:00Z',
    source_mime_type: 'application/vnd.google-apps.document',
  },
  revision_count: 1,
  handle_count: 1,
  relationship_count: 0,
  pending_candidate_count: 0,
  permissions: {
    can_view_diagnostics: true,
    can_open_provider_links: false,
    can_review_candidates: false,
    can_view_comments: false,
  },
  links: {
    self: '/admin/api/v1/esign/sources/src_01HX5ZCQK0ARCHIVE',
    revisions: '/admin/api/v1/esign/sources/src_01HX5ZCQK0ARCHIVE/revisions',
    diagnostics: '/admin/debug/lineage/sources/src_01HX5ZCQK0ARCHIVE',
  },
  empty_state: {
    kind: 'none',
  },
};

// ============================================================================
// Source Revision Page Fixtures
// ============================================================================

/**
 * Source revision page with repeated revisions.
 */
export const SOURCE_REVISIONS_REPEATED: SourceRevisionPage = {
  source: {
    id: 'src_01HX5ZCQK0ABC123',
    label: 'Product Requirements Document v3.pdf',
    url: '/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123',
  },
  items: [
    {
      revision: {
        id: 'rev_01HX5ZCQK0REV003',
        provider_revision_hint: 'v3',
        modified_time: '2026-01-15T10:30:00Z',
        exported_at: '2026-01-15T10:32:00Z',
        exported_by_user_id: 'usr_01HX5ZCQK0GHI789',
        source_mime_type: 'application/vnd.google-apps.document',
      },
      provider: {
        kind: 'google_drive',
        label: 'Google Drive',
        external_file_id: '1a2b3c4d5e6f7g8h9i0j',
        account_id: 'user@example.com',
        drive_id: 'root',
        web_url: 'https://docs.google.com/document/d/1a2b3c4d5e6f7g8h9i0j/edit',
      },
      primary_artifact: {
        id: 'art_01HX5ZCQK0ART003',
        artifact_kind: 'pdf_export',
        sha256: 'abc123def456...',
        page_count: 12,
        size_bytes: 204800,
        compatibility_tier: 'native',
        normalization_status: 'complete',
      },
      fingerprint_status: {
        status: 'ready',
        extract_version: 'v1.0',
        evidence_available: true,
      },
      fingerprint_processing: {
        state: 'ready',
        status_label: 'Fingerprint ready',
        completed_at: '2026-01-15T10:35:00Z',
        attempt_count: 1,
        retryable: false,
        stale: false,
      },
      is_latest: true,
      links: {
        self: '/admin/api/v1/esign/source-revisions/rev_01HX5ZCQK0REV003',
        artifacts: '/admin/api/v1/esign/source-revisions/rev_01HX5ZCQK0REV003/artifacts',
        source: '/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123',
      },
    },
    {
      revision: {
        id: 'rev_01HX5ZCQK0REV002',
        provider_revision_hint: 'v2',
        modified_time: '2026-01-10T14:20:00Z',
        exported_at: '2026-01-10T14:22:00Z',
        exported_by_user_id: 'usr_01HX5ZCQK0GHI789',
        source_mime_type: 'application/vnd.google-apps.document',
      },
      provider: {
        kind: 'google_drive',
        label: 'Google Drive',
        external_file_id: '1a2b3c4d5e6f7g8h9i0j',
        account_id: 'user@example.com',
        drive_id: 'root',
        web_url: 'https://docs.google.com/document/d/1a2b3c4d5e6f7g8h9i0j/edit',
      },
      primary_artifact: {
        id: 'art_01HX5ZCQK0ART002',
        artifact_kind: 'pdf_export',
        sha256: 'def456ghi789...',
        page_count: 10,
        size_bytes: 184320,
        compatibility_tier: 'native',
        normalization_status: 'complete',
      },
      fingerprint_status: {
        status: 'ready',
        extract_version: 'v1.0',
        evidence_available: true,
      },
      fingerprint_processing: {
        state: 'ready',
        status_label: 'Fingerprint ready',
        completed_at: '2026-01-10T14:25:00Z',
        attempt_count: 1,
        retryable: false,
        stale: false,
      },
      is_latest: false,
      links: {
        self: '/admin/api/v1/esign/source-revisions/rev_01HX5ZCQK0REV002',
        artifacts: '/admin/api/v1/esign/source-revisions/rev_01HX5ZCQK0REV002/artifacts',
        source: '/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123',
      },
    },
  ],
  page_info: {
    mode: 'page',
    page: 1,
    page_size: 20,
    total_count: 3,
    has_more: false,
    sort: 'modified_time_desc',
  },
  applied_query: {
    page: 1,
    page_size: 20,
    sort: 'modified_time_desc',
  },
  permissions: {
    can_view_diagnostics: true,
    can_open_provider_links: true,
    can_review_candidates: true,
    can_view_comments: false,
  },
  empty_state: {
    kind: 'none',
  },
  links: {
    self: '/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123/revisions',
    source: '/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123',
  },
};

// ============================================================================
// Source Relationship Page Fixtures
// ============================================================================

/**
 * Source relationship page with pending review candidate.
 */
export const SOURCE_RELATIONSHIPS_REVIEW: SourceRelationshipPage = {
  source: {
    id: 'src_01HX5ZCQK0ABC123',
    label: 'Product Requirements Document v3.pdf',
    url: '/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123',
  },
  items: [
    {
      id: 'rel_01HX5ZCQK0REL001',
      relationship_type: 'copied_from',
      status: 'pending_review',
      confidence_band: 'medium',
      confidence_score: 0.75,
      summary: 'Possible copy from previous template version',
      left_source: {
        id: 'src_01HX5ZCQK0ABC123',
        label: 'Product Requirements Document v3.pdf',
      },
      right_source: {
        id: 'src_01HX5ZCQK0PREV',
        label: 'PRD Template v2.0',
        url: '/admin/api/v1/esign/sources/src_01HX5ZCQK0PREV',
      },
      counterpart_source: {
        id: 'src_01HX5ZCQK0PREV',
        label: 'PRD Template v2.0',
        url: '/admin/api/v1/esign/sources/src_01HX5ZCQK0PREV',
      },
      review_action_visible: 'admin_view',
      evidence: [
        {
          code: 'title_similarity',
          label: 'Title similarity',
          details: '82% match',
        },
        {
          code: 'text_overlap',
          label: 'Text overlap',
          details: '68% chunk overlap',
        },
      ],
      links: {
        self: '/admin/api/v1/esign/source-relationships/rel_01HX5ZCQK0REL001',
        source: '/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123',
        diagnostics: '/admin/debug/lineage/relationships/rel_01HX5ZCQK0REL001',
      },
    },
  ],
  page_info: {
    mode: 'page',
    page: 1,
    page_size: 20,
    total_count: 1,
    has_more: false,
  },
  applied_query: {
    page: 1,
    page_size: 20,
  },
  permissions: {
    can_view_diagnostics: true,
    can_open_provider_links: true,
    can_review_candidates: true,
    can_view_comments: false,
  },
  empty_state: {
    kind: 'none',
  },
  links: {
    self: '/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123/relationships',
    source: '/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123',
  },
};

// ============================================================================
// Complete Phase 11 Fixture Bundle
// ============================================================================

/**
 * Complete Phase 11 source-management contract fixtures.
 * Mirrors backend-owned fixture structure for contract validation.
 */
export const PHASE_11_FIXTURES: Phase11SourceManagementContractFixtures = {
  schema_version: 1,
  rules: {
    frontend_presentation_only: true,
    pagination_mode: 'page',
    default_page_size: 20,
    max_page_size: 100,
    supported_source_sorts: ['modified_time_desc', 'created_at_desc', 'title_asc'],
    supported_revision_sorts: ['modified_time_desc', 'exported_at_desc'],
    supported_relationship_sorts: ['confidence_desc', 'created_at_desc'],
    supported_search_sorts: ['relevance_desc', 'modified_time_desc'],
    provider_link_visibility: 'admin_view',
    diagnostics_visibility: 'admin_debug_only',
    candidate_review_visibility: 'admin_view',
  },
  queries: {
    list_sources: {
      page: 1,
      page_size: 20,
    },
    list_revisions: {
      page: 1,
      page_size: 20,
      sort: 'modified_time_desc',
    },
    list_relationships: {
      page: 1,
      page_size: 20,
    },
    search: {
      query: 'requirements',
      page: 1,
      page_size: 20,
    },
  },
  states: {
    source_list_empty: SOURCE_LIST_EMPTY,
    source_list_single: SOURCE_LIST_SINGLE,
    source_detail_repeated: SOURCE_DETAIL_REPEATED,
    source_handles_multi: {
      source: {
        id: 'src_01HX5ZCQK0ABC123',
        label: 'Product Requirements Document v3.pdf',
      },
      items: [],
      page_info: {
        mode: 'page',
        page: 1,
        page_size: 20,
        total_count: 0,
        has_more: false,
      },
      permissions: {
        can_view_diagnostics: true,
        can_open_provider_links: true,
        can_review_candidates: true,
        can_view_comments: false,
      },
      empty_state: {
        kind: 'none',
      },
      links: {},
    },
    source_revisions_repeated: SOURCE_REVISIONS_REPEATED,
    source_relationships_review: SOURCE_RELATIONSHIPS_REVIEW,
    source_revision_detail: {
      source: {
        id: 'src_01HX5ZCQK0ABC123',
        label: 'Product Requirements Document v3.pdf',
      },
      revision: {
        id: 'rev_01HX5ZCQK0REV003',
        provider_revision_hint: 'v3',
        modified_time: '2026-01-15T10:30:00Z',
        exported_at: '2026-01-15T10:32:00Z',
        source_mime_type: 'application/vnd.google-apps.document',
      },
      provider: {
        kind: 'google_drive',
        label: 'Google Drive',
        external_file_id: '1a2b3c4d5e6f7g8h9i0j',
        account_id: 'user@example.com',
        web_url: 'https://docs.google.com/document/d/1a2b3c4d5e6f7g8h9i0j/edit',
      },
      fingerprint_status: {
        status: 'ready',
        extract_version: 'v1.0',
        evidence_available: true,
      },
      fingerprint_processing: {
        state: 'ready',
        status_label: 'Fingerprint ready',
        completed_at: '2026-01-15T10:35:00Z',
        attempt_count: 1,
        retryable: false,
        stale: false,
      },
      permissions: {
        can_view_diagnostics: true,
        can_open_provider_links: true,
        can_review_candidates: true,
        can_view_comments: false,
      },
      links: {
        self: '/admin/api/v1/esign/source-revisions/rev_01HX5ZCQK0REV003',
        source: '/admin/api/v1/esign/sources/src_01HX5ZCQK0ABC123',
      },
      empty_state: {
        kind: 'none',
      },
    },
    source_artifacts: {
      revision: {
        id: 'rev_01HX5ZCQK0REV003',
        modified_time: '2026-01-15T10:30:00Z',
        exported_at: '2026-01-15T10:32:00Z',
      },
      items: [],
      page_info: {
        mode: 'page',
        page: 1,
        page_size: 20,
        total_count: 0,
        has_more: false,
      },
      permissions: {
        can_view_diagnostics: true,
        can_open_provider_links: true,
        can_review_candidates: true,
        can_view_comments: false,
      },
      empty_state: {
        kind: 'none',
      },
      links: {},
    },
    source_comments_empty: {
      revision: {
        id: 'rev_01HX5ZCQK0REV003',
        modified_time: '2026-01-15T10:30:00Z',
        exported_at: '2026-01-15T10:32:00Z',
      },
      items: [],
      page_info: {
        mode: 'page',
        page: 1,
        page_size: 20,
        total_count: 0,
        has_more: false,
      },
      permissions: {
        can_view_diagnostics: true,
        can_open_provider_links: true,
        can_review_candidates: true,
        can_view_comments: false,
      },
      empty_state: {
        kind: 'no_comments',
        title: 'No comments',
        description: 'No comment threads found for this revision.',
      },
      sync_status: 'not_configured',
      links: {},
    },
    source_search_results: {
      items: [],
      page_info: {
        mode: 'page',
        page: 1,
        page_size: 20,
        total_count: 0,
        has_more: false,
      },
      applied_query: {
        query: 'requirements',
        page: 1,
        page_size: 20,
      },
      permissions: {
        can_view_diagnostics: true,
        can_open_provider_links: true,
        can_review_candidates: true,
        can_view_comments: false,
      },
      empty_state: {
        kind: 'no_results',
        title: 'No results found',
        description: 'No sources match your search query.',
      },
      links: {},
    },
    source_detail_merged: SOURCE_DETAIL_MERGED,
    source_detail_archived: SOURCE_DETAIL_ARCHIVED,
  },
};

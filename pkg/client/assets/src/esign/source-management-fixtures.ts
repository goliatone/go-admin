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
  Phase13SourceSearchResults,
  Phase13SourceCommentPage,
  Phase13SourceSearchResultSummary,
  Phase13SourceCommentThreadSummary,
  Phase13SourceManagementContractFixtures,
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

// ============================================================================
// Phase 13 Fixtures (Task 13.11)
// ============================================================================

/**
 * Phase 13 search results: empty state.
 */
export const SEARCH_EMPTY: Phase13SourceSearchResults = {
  items: [],
  page_info: {
    mode: 'page',
    page: 1,
    page_size: 20,
    total_count: 0,
    has_more: false,
  },
  applied_query: {
    query: 'nonexistent document',
    page: 1,
    page_size: 20,
  },
  permissions: {
    can_view_diagnostics: true,
    can_open_provider_links: true,
    can_review_candidates: true,
    can_view_comments: true,
  },
  empty_state: {
    kind: 'no_results',
    title: 'No results found',
    description: 'No sources match your search query. Try adjusting your filters or search terms.',
  },
  links: {
    self: '/admin/api/v1/esign/source-search?q=nonexistent+document',
  },
};

/**
 * Phase 13 search results: with results including comment fields.
 */
export const SEARCH_RESULTS_WITH_COMMENTS: Phase13SourceSearchResults = {
  items: [
    {
      result_kind: 'source_document',
      source: {
        id: 'src_01HX5ZCQK0SEARCH1',
        label: 'NDA Template - Enterprise Edition',
        url: '/admin/api/v1/esign/sources/src_01HX5ZCQK0SEARCH1',
      },
      revision: {
        id: 'rev_01HX5ZCQK0REV001',
        provider_revision_hint: 'v2.1',
        modified_time: '2026-02-15T14:30:00Z',
        source_mime_type: 'application/vnd.google-apps.document',
      },
      provider: {
        kind: 'google_drive',
        label: 'Google Drive',
        external_file_id: 'abc123def456',
        web_url: 'https://docs.google.com/document/d/abc123def456/edit',
      },
      matched_fields: ['canonical_title', 'comment_text'],
      summary: 'Enterprise NDA with legal team review comments',
      relationship_state: 'confirmed',
      comment_sync_status: 'synced',
      comment_count: 5,
      has_comments: true,
      artifact_hash: 'sha256:abc123...',
      links: {
        self: '/admin/api/v1/esign/sources/src_01HX5ZCQK0SEARCH1',
        comments: '/admin/api/v1/esign/sources/src_01HX5ZCQK0SEARCH1/comments',
      },
    },
    {
      result_kind: 'source_revision',
      source: {
        id: 'src_01HX5ZCQK0SEARCH2',
        label: 'Employment Agreement - Standard',
        url: '/admin/api/v1/esign/sources/src_01HX5ZCQK0SEARCH2',
      },
      revision: {
        id: 'rev_01HX5ZCQK0REV002',
        provider_revision_hint: 'v1.0',
        modified_time: '2026-02-10T09:15:00Z',
        source_mime_type: 'application/vnd.google-apps.document',
      },
      provider: {
        kind: 'google_drive',
        label: 'Google Drive',
        external_file_id: 'xyz789ghi012',
        web_url: 'https://docs.google.com/document/d/xyz789ghi012/edit',
      },
      matched_fields: ['external_file_id', 'revision_hint'],
      summary: 'Standard employment agreement template',
      relationship_state: 'pending_review',
      comment_sync_status: 'pending_sync',
      comment_count: 0,
      has_comments: false,
      links: {
        self: '/admin/api/v1/esign/source-revisions/rev_01HX5ZCQK0REV002',
      },
    },
  ],
  page_info: {
    mode: 'page',
    page: 1,
    page_size: 20,
    total_count: 2,
    has_more: false,
    sort: 'relevance',
  },
  applied_query: {
    query: 'agreement',
    page: 1,
    page_size: 20,
    has_comments: true,
  },
  permissions: {
    can_view_diagnostics: true,
    can_open_provider_links: true,
    can_review_candidates: true,
    can_view_comments: true,
  },
  empty_state: {
    kind: 'none',
  },
  links: {
    self: '/admin/api/v1/esign/source-search?q=agreement&has_comments=true',
  },
};

/**
 * Phase 13 comments page: empty state.
 */
export const COMMENTS_EMPTY: Phase13SourceCommentPage = {
  source: {
    id: 'src_01HX5ZCQK0COMMENT1',
    label: 'New Document Template',
    url: '/admin/api/v1/esign/sources/src_01HX5ZCQK0COMMENT1',
  },
  revision: {
    id: 'rev_01HX5ZCQK0REV001',
    provider_revision_hint: 'v1.0',
    modified_time: '2026-03-01T10:00:00Z',
  },
  items: [],
  applied_query: {
    page: 1,
    page_size: 20,
  },
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
    can_review_candidates: false,
    can_view_comments: true,
  },
  empty_state: {
    kind: 'no_comments',
    title: 'No comments',
    description: 'No comment threads found for this source revision.',
  },
  sync_status: 'synced',
  sync: {
    status: 'synced',
    thread_count: 0,
    message_count: 0,
    last_synced_at: '2026-03-01T10:05:00Z',
  },
  links: {
    self: '/admin/api/v1/esign/sources/src_01HX5ZCQK0COMMENT1/comments',
    source: '/admin/api/v1/esign/sources/src_01HX5ZCQK0COMMENT1',
  },
};

/**
 * Phase 13 comments page: synced with comments.
 */
export const COMMENTS_SYNCED: Phase13SourceCommentPage = {
  source: {
    id: 'src_01HX5ZCQK0COMMENT2',
    label: 'NDA Template - Enterprise Edition',
    url: '/admin/api/v1/esign/sources/src_01HX5ZCQK0COMMENT2',
  },
  revision: {
    id: 'rev_01HX5ZCQK0REV002',
    provider_revision_hint: 'v2.1',
    modified_time: '2026-02-15T14:30:00Z',
  },
  items: [
    {
      id: 'thread_01HX5ZCQK0THR001',
      provider_comment_id: 'AAAgB123456',
      thread_id: 'thread-sha1-001',
      status: 'open',
      anchor: {
        kind: 'quote',
        label: 'Section 3.1 - Confidentiality',
      },
      author_name: 'Jane Smith',
      author: {
        display_name: 'Jane Smith',
        email: 'jane.smith@example.com',
        type: 'user',
      },
      body_preview: 'We need to clarify the definition of "confidential information" in this section. The current language is too broad and may include...',
      message_count: 3,
      reply_count: 2,
      resolved_at: undefined,
      last_synced_at: '2026-02-20T09:00:00Z',
      last_activity_at: '2026-02-19T16:45:00Z',
      sync_status: 'synced',
      source: {
        id: 'src_01HX5ZCQK0COMMENT2',
        label: 'NDA Template - Enterprise Edition',
      },
      revision: {
        id: 'rev_01HX5ZCQK0REV002',
        provider_revision_hint: 'v2.1',
        modified_time: '2026-02-15T14:30:00Z',
      },
      messages: [
        {
          id: 'msg_001',
          provider_message_id: 'AAAgB123456-0',
          message_kind: 'comment',
          body_preview: 'We need to clarify the definition of "confidential information" in this section...',
          author: {
            display_name: 'Jane Smith',
            email: 'jane.smith@example.com',
            type: 'user',
          },
          created_at: '2026-02-18T10:00:00Z',
        },
        {
          id: 'msg_002',
          provider_message_id: 'AAAgB123456-1',
          message_kind: 'reply',
          body_preview: 'Good point. I suggest we add specific categories of information...',
          author: {
            display_name: 'John Doe',
            email: 'john.doe@example.com',
            type: 'user',
          },
          created_at: '2026-02-18T14:30:00Z',
        },
        {
          id: 'msg_003',
          provider_message_id: 'AAAgB123456-2',
          message_kind: 'reply',
          body_preview: 'Agreed. Let me draft some language and share it here for review.',
          author: {
            display_name: 'Jane Smith',
            email: 'jane.smith@example.com',
            type: 'user',
          },
          created_at: '2026-02-19T16:45:00Z',
        },
      ],
      links: {
        self: '/admin/api/v1/esign/source-comments/thread_01HX5ZCQK0THR001',
        provider: 'https://docs.google.com/document/d/abc123/edit?disco=AAAgB123456',
      },
    },
    {
      id: 'thread_01HX5ZCQK0THR002',
      provider_comment_id: 'AAAgB789012',
      thread_id: 'thread-sha1-002',
      status: 'resolved',
      anchor: {
        kind: 'quote',
        label: 'Section 5.2 - Term',
      },
      author_name: 'Legal Bot',
      author: {
        display_name: 'Legal Bot',
        email: 'legal-bot@example.com',
        type: 'bot',
      },
      body_preview: 'Auto-detected: Term length should be specified explicitly. Current language implies perpetual term.',
      message_count: 2,
      reply_count: 1,
      resolved_at: '2026-02-17T11:00:00Z',
      last_synced_at: '2026-02-20T09:00:00Z',
      last_activity_at: '2026-02-17T11:00:00Z',
      sync_status: 'synced',
      links: {
        self: '/admin/api/v1/esign/source-comments/thread_01HX5ZCQK0THR002',
      },
    },
  ],
  applied_query: {
    page: 1,
    page_size: 20,
  },
  page_info: {
    mode: 'page',
    page: 1,
    page_size: 20,
    total_count: 2,
    has_more: false,
  },
  permissions: {
    can_view_diagnostics: true,
    can_open_provider_links: true,
    can_review_candidates: true,
    can_view_comments: true,
  },
  empty_state: {
    kind: 'none',
  },
  sync_status: 'synced',
  sync: {
    status: 'synced',
    thread_count: 2,
    message_count: 5,
    last_synced_at: '2026-02-20T09:00:00Z',
  },
  links: {
    self: '/admin/api/v1/esign/sources/src_01HX5ZCQK0COMMENT2/comments',
    source: '/admin/api/v1/esign/sources/src_01HX5ZCQK0COMMENT2',
  },
};

/**
 * Phase 13 comments page: pending sync.
 */
export const COMMENTS_PENDING_SYNC: Phase13SourceCommentPage = {
  source: {
    id: 'src_01HX5ZCQK0COMMENT3',
    label: 'Partnership Agreement Draft',
    url: '/admin/api/v1/esign/sources/src_01HX5ZCQK0COMMENT3',
  },
  revision: {
    id: 'rev_01HX5ZCQK0REV003',
    provider_revision_hint: 'draft-1',
    modified_time: '2026-03-10T08:00:00Z',
  },
  items: [],
  applied_query: {
    page: 1,
    page_size: 20,
  },
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
    can_review_candidates: false,
    can_view_comments: true,
  },
  empty_state: {
    kind: 'pending_sync',
    title: 'Comments pending sync',
    description: 'Comment synchronization is in progress. Comments will appear once sync completes.',
  },
  sync_status: 'pending_sync',
  sync: {
    status: 'pending_sync',
    thread_count: 0,
    message_count: 0,
    last_attempt_at: '2026-03-10T08:05:00Z',
  },
  links: {
    self: '/admin/api/v1/esign/sources/src_01HX5ZCQK0COMMENT3/comments',
    source: '/admin/api/v1/esign/sources/src_01HX5ZCQK0COMMENT3',
  },
};

/**
 * Phase 13 comments page: sync failed.
 */
export const COMMENTS_SYNC_FAILED: Phase13SourceCommentPage = {
  source: {
    id: 'src_01HX5ZCQK0COMMENT4',
    label: 'Vendor Agreement 2026',
    url: '/admin/api/v1/esign/sources/src_01HX5ZCQK0COMMENT4',
  },
  revision: {
    id: 'rev_01HX5ZCQK0REV004',
    provider_revision_hint: 'v1.2',
    modified_time: '2026-03-05T16:00:00Z',
  },
  items: [],
  applied_query: {
    page: 1,
    page_size: 20,
  },
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
    can_review_candidates: false,
    can_view_comments: true,
  },
  empty_state: {
    kind: 'sync_failed',
    title: 'Unable to sync comments',
    description: 'Comment synchronization failed. This may be due to API quota limits or authentication issues.',
  },
  sync_status: 'failed',
  sync: {
    status: 'failed',
    thread_count: 0,
    message_count: 0,
    last_attempt_at: '2026-03-05T16:05:00Z',
    error_code: 'QUOTA_EXCEEDED',
    error_message: 'Google Drive API quota exceeded. Sync will retry automatically.',
  },
  links: {
    self: '/admin/api/v1/esign/sources/src_01HX5ZCQK0COMMENT4/comments',
    source: '/admin/api/v1/esign/sources/src_01HX5ZCQK0COMMENT4',
  },
};

/**
 * Phase 13 comments page: sync stale.
 */
export const COMMENTS_SYNC_STALE: Phase13SourceCommentPage = {
  source: {
    id: 'src_01HX5ZCQK0COMMENT5',
    label: 'License Agreement - OEM',
    url: '/admin/api/v1/esign/sources/src_01HX5ZCQK0COMMENT5',
  },
  revision: {
    id: 'rev_01HX5ZCQK0REV005',
    provider_revision_hint: 'v3.0',
    modified_time: '2026-01-15T12:00:00Z',
  },
  items: [
    {
      id: 'thread_01HX5ZCQK0STALE001',
      provider_comment_id: 'AAAgBSTALE1',
      thread_id: 'thread-sha1-stale',
      status: 'open',
      anchor: {
        kind: 'document',
        label: 'General',
      },
      author_name: 'Mark Johnson',
      author: {
        display_name: 'Mark Johnson',
        email: 'mark.johnson@example.com',
        type: 'user',
      },
      body_preview: 'This comment data may be outdated. Last synced over 7 days ago.',
      message_count: 1,
      reply_count: 0,
      last_synced_at: '2026-01-10T09:00:00Z',
      last_activity_at: '2026-01-10T09:00:00Z',
      sync_status: 'stale',
      links: {},
    },
  ],
  applied_query: {
    page: 1,
    page_size: 20,
  },
  page_info: {
    mode: 'page',
    page: 1,
    page_size: 20,
    total_count: 1,
    has_more: false,
  },
  permissions: {
    can_view_diagnostics: true,
    can_open_provider_links: true,
    can_review_candidates: false,
    can_view_comments: true,
  },
  empty_state: {
    kind: 'none',
  },
  sync_status: 'stale',
  sync: {
    status: 'stale',
    thread_count: 1,
    message_count: 1,
    last_synced_at: '2026-01-10T09:00:00Z',
    last_attempt_at: '2026-03-20T10:00:00Z',
    error_message: 'Data may be outdated. Provider has been unreachable for extended period.',
  },
  links: {
    self: '/admin/api/v1/esign/sources/src_01HX5ZCQK0COMMENT5/comments',
    source: '/admin/api/v1/esign/sources/src_01HX5ZCQK0COMMENT5',
  },
};

/**
 * Complete Phase 13 source-management contract fixtures.
 * Backend-owned example payloads for Phase 13 contract validation.
 */
export const PHASE_13_FIXTURES: Phase13SourceManagementContractFixtures = {
  schema_version: 1,
  rules: {
    frontend_presentation_only: true,
    pagination_mode: 'page',
    default_page_size: 20,
    max_page_size: 100,
    supported_source_sorts: ['modified_time_desc', 'created_at_desc', 'title_asc'],
    supported_revision_sorts: ['modified_time_desc', 'exported_at_desc'],
    supported_relationship_sorts: ['confidence_desc', 'created_at_desc'],
    supported_search_sorts: ['relevance', 'title_asc', 'modified_time_desc'],
    provider_link_visibility: 'admin_view',
    diagnostics_visibility: 'admin_debug_only',
    candidate_review_visibility: 'admin_view',
  },
  queries: {
    search_with_comments: {
      query: 'agreement',
      has_comments: true,
      page: 1,
      page_size: 20,
    },
    search_with_relationship_filter: {
      query: 'contract',
      relationship_state: 'pending_review',
      page: 1,
      page_size: 20,
    },
    comment_list_synced: {
      page: 1,
      page_size: 20,
      sync_status: 'synced',
    },
    comment_list_pending: {
      page: 1,
      page_size: 20,
      sync_status: 'pending_sync',
    },
  },
  states: {
    search_empty: SEARCH_EMPTY,
    search_results_with_comments: SEARCH_RESULTS_WITH_COMMENTS,
    comments_empty: COMMENTS_EMPTY,
    comments_synced: COMMENTS_SYNCED,
    comments_pending_sync: COMMENTS_PENDING_SYNC,
    comments_sync_failed: COMMENTS_SYNC_FAILED,
    comments_sync_stale: COMMENTS_SYNC_STALE,
  },
};

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

// ============================================================================
// Phase 14 Fixture Factory Functions (Task 14.7)
// ============================================================================

/**
 * Create a SourceListPage fixture for smoke tests.
 * Returns a valid source list page with sample data.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 14 Task 14.7
 */
export function createSourceListPageFixture(): SourceListPage {
  return { ...SOURCE_LIST_SINGLE };
}

/**
 * Create a SourceDetail fixture for smoke tests.
 * Returns a valid source detail with sample data.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 14 Task 14.7
 */
export function createSourceDetailFixture(): SourceDetail {
  return { ...SOURCE_DETAIL_REPEATED };
}

/**
 * Create a SourceRevisionPage fixture for smoke tests.
 * Returns a valid source revision page with sample data.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 14 Task 14.7
 */
export function createSourceRevisionPageFixture(): SourceRevisionPage {
  return { ...SOURCE_REVISIONS_REPEATED };
}

/**
 * Create a SourceRelationshipPage fixture for smoke tests.
 * Returns a valid source relationship page with sample data.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 14 Task 14.7
 */
export function createSourceRelationshipPageFixture(): SourceRelationshipPage {
  return { ...SOURCE_RELATIONSHIPS_REVIEW };
}

/**
 * Create a Phase13SourceSearchResults fixture for smoke tests.
 * Returns a valid Phase 13 search results with sample data.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 14 Task 14.7
 */
export function createPhase13SourceSearchResultsFixture(): Phase13SourceSearchResults {
  return { ...SEARCH_RESULTS_WITH_COMMENTS };
}

/**
 * Create a Phase13SourceCommentPage fixture for smoke tests.
 * Returns a valid Phase 13 comment page with sample data.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 14 Task 14.7
 */
export function createPhase13SourceCommentPageFixture(): Phase13SourceCommentPage {
  return { ...COMMENTS_SYNCED };
}

/**
 * Phase 14 fixture route map for backend integration.
 * Maps surface names to fixture endpoints.
 *
 * @see DOC_LINEAGE_V1_TSK.md Phase 14 Task 14.7
 */
export const PHASE_14_FIXTURE_ROUTES = {
  source_list: {
    route: '/admin/api/v1/esign/fixtures/source-list-page',
    fixture: createSourceListPageFixture,
    contractFamily: 'SourceListPage',
  },
  source_detail: {
    route: '/admin/api/v1/esign/fixtures/source-detail',
    fixture: createSourceDetailFixture,
    contractFamily: 'SourceDetail',
  },
  revision_history: {
    route: '/admin/api/v1/esign/fixtures/source-revision-page',
    fixture: createSourceRevisionPageFixture,
    contractFamily: 'SourceRevisionPage',
  },
  relationship_summaries: {
    route: '/admin/api/v1/esign/fixtures/source-relationship-page',
    fixture: createSourceRelationshipPageFixture,
    contractFamily: 'SourceRelationshipPage',
  },
  search: {
    route: '/admin/api/v1/esign/fixtures/phase13-source-search-results',
    fixture: createPhase13SourceSearchResultsFixture,
    contractFamily: 'Phase13SourceSearchResults',
  },
  source_comment: {
    route: '/admin/api/v1/esign/fixtures/phase13-source-comment-page',
    fixture: createPhase13SourceCommentPageFixture,
    contractFamily: 'Phase13SourceCommentPage',
  },
} as const;

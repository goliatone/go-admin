package adminkeys

const (
	KeyID        = "id"
	KeyIDs       = "ids"
	KeySelection = "selection"
	KeyRecord    = "record"
	KeyData      = "data"
)

const (
	KeyLocale             = "locale"
	KeyRequestedLocale    = "requested_locale"
	KeyChannel            = "channel"
	KeyContentChannel     = "content_channel"
	KeySiteContentChannel = "site_content_channel"
	KeyChannelScope       = "$channel"
)

const (
	KeyEnvironment = "environment"
	KeyEnv         = "env"
)

const (
	KeyPolicyEntity = "policy_entity"
)

const (
	KeyActorID       = "actor_id"
	KeyUserID        = "user_id"
	KeyRequestID     = "request_id"
	KeyCorrelationID = "correlation_id"
	KeyTraceID       = "trace_id"
)

const (
	KeyTenantID       = "tenant_id"
	KeyOrgID          = "org_id"
	KeyOrganizationID = "organization_id"
)

const (
	KeyIdempotency        = "idempotency_key"
	KeyPrivateIdempotency = "_idempotency_key"
	KeyDryRun             = "dry_run"
)

const (
	QueryPage           = "page"
	QueryPerPage        = "per_page"
	QueryLimit          = "limit"
	QueryOffset         = "offset"
	QueryFields         = "fields"
	QuerySearch         = "search"
	QueryQ              = "q"
	QuerySort           = "sort"
	QuerySortBy         = "sort_by"
	QuerySortDesc       = "sort_desc"
	QueryOrder          = "order"
	QueryState          = "state"
	QueryAdvancedSearch = "advanced_search"
	QueryHiddenColumns  = "hidden_columns"
	QueryViewMode       = "view_mode"
	QueryExpandedGroups = "expanded_groups"
	QueryGroupBy        = "group_by"
	QueryGroupStrategy  = "group_strategy"
)

const (
	QueryIncludeDrafts        = "include_drafts"
	QueryIncludeContributions = "include_contributions"
	QueryPreviewToken         = "preview_token"
	QueryViewProfile          = "view_profile"
)

const (
	HeaderRequestID      = "X-Request-ID"
	HeaderCorrelationID  = "X-Correlation-ID"
	HeaderTraceID        = "X-Trace-ID"
	HeaderUserID         = "X-User-ID"
	HeaderAdminChannel   = "X-Admin-Channel"
	HeaderContentChannel = "X-Content-Channel"
	HeaderAcceptLanguage = "Accept-Language"
)

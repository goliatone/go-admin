package handlers

import (
	"context"
	"github.com/goliatone/go-admin/internal/primitives"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/quickstart"
	authlib "github.com/goliatone/go-auth"
	goerrors "github.com/goliatone/go-errors"
	"github.com/goliatone/go-router"
)

const (
	defaultRolesPageSize = 10
	rolesBatchSize       = 200
	maxRoleBatchPages    = 500
)

// RolesAPIHandlers serves the DataGrid JSON payload for roles.
type RolesAPIHandlers struct {
	Admin  *admin.Admin
	Config admin.Config
}

type roleListQuery struct {
	Limit          int
	Offset         int
	Search         string
	SortBy         string
	SortDesc       bool
	Filters        map[string]string
	ServiceFilters map[string]any
}

// NewRolesAPIHandlers constructs a roles API handler.
func NewRolesAPIHandlers(adm *admin.Admin, cfg admin.Config) *RolesAPIHandlers {
	return &RolesAPIHandlers{Admin: adm, Config: cfg}
}

// List handles GET /admin/api/roles.
func (h *RolesAPIHandlers) List(c router.Context) error {
	if err := h.guard(c); err != nil {
		return err
	}
	if h == nil || h.Admin == nil || h.Admin.UserService() == nil {
		return goerrors.New("roles service not configured", goerrors.CategoryInternal).
			WithCode(goerrors.CodeInternal).
			WithTextCode("INTERNAL_ERROR")
	}

	query := parseRoleListQuery(c)
	if _, ok := query.ServiceFilters["include_global"]; !ok {
		scopeCfg := quickstart.ScopeConfigFromAdmin(h.Config)
		query.ServiceFilters["include_global"] = scopeCfg.Mode == quickstart.ScopeModeSingle
	}

	records, err := h.listAllRoles(c.Context(), query)
	if err != nil {
		return err
	}

	filtered := applyRoleFilters(records, query.Filters)
	sortRoleRecords(filtered, query.SortBy, query.SortDesc)

	total := len(filtered)
	start, end := paginateBounds(query.Offset, query.Limit, total)
	paged := filtered[start:end]

	items := make([]map[string]any, 0, len(paged))
	for _, role := range paged {
		items = append(items, roleToMap(role))
	}

	return c.JSON(http.StatusOK, map[string]any{
		"data":  items,
		"total": total,
	})
}

func (h *RolesAPIHandlers) listAllRoles(ctx context.Context, query roleListQuery) ([]admin.RoleRecord, error) {
	service := h.Admin.UserService()
	if service == nil {
		return nil, goerrors.New("roles service not configured", goerrors.CategoryInternal).
			WithCode(goerrors.CodeInternal).
			WithTextCode("INTERNAL_ERROR")
	}

	opts := admin.ListOptions{
		Page:    1,
		PerPage: rolesBatchSize,
		Search:  query.Search,
		Filters: primitives.CloneAnyMapEmptyOnEmpty(query.ServiceFilters),
	}

	all := make([]admin.RoleRecord, 0, rolesBatchSize)
	for page := 1; page <= maxRoleBatchPages; page++ {
		opts.Page = page
		records, total, err := service.ListRoles(ctx, opts)
		if err != nil {
			return nil, err
		}
		if len(records) == 0 {
			break
		}
		all = append(all, records...)
		if len(records) < rolesBatchSize || len(all) >= total {
			break
		}
	}

	return all, nil
}

func (h *RolesAPIHandlers) guard(c router.Context) error {
	if c == nil {
		return goerrors.New("missing context", goerrors.CategoryAuth).
			WithCode(goerrors.CodeUnauthorized).
			WithTextCode("UNAUTHORIZED")
	}

	claims, ok := authlib.GetClaims(c.Context())
	if !ok || claims == nil {
		return goerrors.New("missing or invalid token", goerrors.CategoryAuth).
			WithCode(goerrors.CodeUnauthorized).
			WithTextCode("UNAUTHORIZED")
	}

	if h != nil && h.Admin != nil {
		if authz := h.Admin.Authorizer(); authz != nil {
			if authz.Can(c.Context(), h.Config.RolesPermission, "") {
				return nil
			}
			return goerrors.New("forbidden", goerrors.CategoryAuthz).
				WithCode(goerrors.CodeForbidden).
				WithTextCode("FORBIDDEN")
		}
	}

	if authlib.Can(c.Context(), "admin.roles", "read") {
		return nil
	}

	return goerrors.New("forbidden", goerrors.CategoryAuthz).
		WithCode(goerrors.CodeForbidden).
		WithTextCode("FORBIDDEN")
}

func parseRoleListQuery(c router.Context) roleListQuery {
	query := roleListQuery{
		Limit:          defaultRolesPageSize,
		Offset:         0,
		Filters:        map[string]string{},
		ServiceFilters: map[string]any{},
	}
	if c == nil {
		return query
	}

	page := parseOptionalInt(strings.TrimSpace(c.Query("page", "")))
	if page <= 0 {
		page = 1
	}
	perPage := parseOptionalInt(strings.TrimSpace(c.Query("per_page", "")))
	if perPage <= 0 {
		perPage = defaultRolesPageSize
	}
	query.Limit = perPage
	query.Offset = (page - 1) * perPage

	if limit := parseOptionalInt(strings.TrimSpace(c.Query("limit", ""))); limit > 0 {
		query.Limit = limit
		offset := parseOptionalInt(strings.TrimSpace(c.Query("offset", "")))
		if offset > 0 {
			query.Offset = offset
		} else {
			query.Offset = 0
		}
	}

	if order := strings.TrimSpace(c.Query("order", "")); order != "" {
		first := strings.Split(order, ",")[0]
		parts := strings.Fields(first)
		if len(parts) > 0 {
			query.SortBy = strings.TrimSpace(parts[0])
			if len(parts) > 1 {
				query.SortDesc = strings.EqualFold(strings.TrimSpace(parts[1]), "desc")
			}
		}
	} else {
		query.SortBy = strings.TrimSpace(c.Query("sort", ""))
		query.SortDesc = strings.EqualFold(strings.TrimSpace(c.Query("sort_desc", "")), "true")
	}

	query.Search = strings.TrimSpace(c.Query("search", ""))

	reservedKeys := map[string]struct{}{
		"page":      {},
		"per_page":  {},
		"limit":     {},
		"offset":    {},
		"sort":      {},
		"sort_desc": {},
		"order":     {},
		"search":    {},
	}

	for key, value := range c.Queries() {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, reserved := reservedKeys[key]; reserved {
			continue
		}

		targetKey := key
		if strings.HasPrefix(targetKey, "filter_") {
			targetKey = strings.TrimSpace(targetKey[len("filter_"):])
		}
		if targetKey == "" {
			continue
		}
		query.Filters[targetKey] = value
	}

	if query.Search == "" {
		if value, ok := query.Filters["name__ilike"]; ok {
			query.Search = extractSearchToken(value)
		}
	}
	if query.Search == "" {
		if value, ok := query.Filters["description__ilike"]; ok {
			query.Search = extractSearchToken(value)
		}
	}
	if query.Search == "" {
		if value, ok := query.Filters["role_key__ilike"]; ok {
			query.Search = extractSearchToken(value)
		}
	}

	if roleKey := strings.TrimSpace(firstFilterValue(query.Filters, "role_key", "role_key__eq")); roleKey != "" {
		query.ServiceFilters["role_key"] = roleKey
	}
	if includeSystem := strings.TrimSpace(firstFilterValue(query.Filters, "include_system", "include_system__eq")); includeSystem != "" {
		query.ServiceFilters["include_system"] = includeSystem
	}
	if includeGlobal := strings.TrimSpace(firstFilterValue(query.Filters, "include_global", "include_global__eq")); includeGlobal != "" {
		query.ServiceFilters["include_global"] = includeGlobal
	}

	delete(query.Filters, "include_system")
	delete(query.Filters, "include_system__eq")
	delete(query.Filters, "include_global")
	delete(query.Filters, "include_global__eq")

	return query
}

func firstFilterValue(filters map[string]string, keys ...string) string {
	for _, key := range keys {
		if value, ok := filters[key]; ok {
			trimmed := strings.TrimSpace(value)
			if trimmed != "" {
				return trimmed
			}
		}
	}
	return ""
}

func extractSearchToken(raw string) string {
	parts := strings.Split(raw, ",")
	for _, part := range parts {
		token := strings.TrimSpace(strings.Trim(part, "%"))
		if token != "" {
			return token
		}
	}
	return ""
}

func applyRoleFilters(records []admin.RoleRecord, filters map[string]string) []admin.RoleRecord {
	if len(filters) == 0 {
		return records
	}

	out := make([]admin.RoleRecord, 0, len(records))
	for _, role := range records {
		if roleMatchesFilters(role, filters) {
			out = append(out, role)
		}
	}
	return out
}

func roleMatchesFilters(role admin.RoleRecord, filters map[string]string) bool {
	for key, raw := range filters {
		raw = strings.TrimSpace(raw)
		if raw == "" {
			continue
		}

		field, op := splitFilterKey(key)
		if !roleMatchesFilter(role, field, op, raw) {
			return false
		}
	}
	return true
}

func splitFilterKey(key string) (string, string) {
	parts := strings.SplitN(strings.ToLower(strings.TrimSpace(key)), "__", 2)
	field := strings.TrimSpace(parts[0])
	if field == "" {
		return "", "eq"
	}
	if len(parts) == 1 {
		return field, "eq"
	}
	op := strings.TrimSpace(parts[1])
	if op == "" {
		op = "eq"
	}
	return field, op
}

func roleMatchesFilter(role admin.RoleRecord, field, op, raw string) bool {
	switch field {
	case "id":
		return matchString(role.ID, op, raw)
	case "name":
		return matchString(role.Name, op, raw)
	case "role_key":
		return matchString(role.RoleKey, op, raw)
	case "description":
		return matchString(role.Description, op, raw)
	case "permissions":
		return matchStringSlice(role.Permissions, op, raw)
	case "is_system":
		return matchBool(role.IsSystem, op, raw)
	case "created_at":
		return matchTime(role.CreatedAt, op, raw)
	case "updated_at":
		return matchTime(role.UpdatedAt, op, raw)
	default:
		// Unknown filters are ignored to avoid accidental data loss.
		return true
	}
}

func matchString(value, op, raw string) bool {
	valueNorm := strings.ToLower(strings.TrimSpace(value))
	tokens := normalizedTokens(raw)
	if len(tokens) == 0 {
		return true
	}

	switch op {
	case "eq", "in":
		for _, token := range tokens {
			if valueNorm == token {
				return true
			}
		}
		return false
	case "ne":
		for _, token := range tokens {
			if valueNorm == token {
				return false
			}
		}
		return true
	case "ilike", "contains":
		for _, token := range tokens {
			if strings.Contains(valueNorm, token) {
				return true
			}
		}
		return false
	case "gt", "gte", "lt", "lte":
		token := tokens[0]
		cmp := strings.Compare(valueNorm, token)
		switch op {
		case "gt":
			return cmp > 0
		case "gte":
			return cmp >= 0
		case "lt":
			return cmp < 0
		case "lte":
			return cmp <= 0
		}
	}
	return true
}

func matchStringSlice(values []string, op, raw string) bool {
	if len(values) == 0 {
		return false
	}
	joined := make([]string, 0, len(values))
	for _, value := range values {
		joined = append(joined, strings.ToLower(strings.TrimSpace(value)))
	}
	tokens := normalizedTokens(raw)
	if len(tokens) == 0 {
		return true
	}

	containsAny := func(token string) bool {
		for _, value := range joined {
			if strings.Contains(value, token) {
				return true
			}
		}
		return false
	}
	equalsAny := func(token string) bool {
		for _, value := range joined {
			if value == token {
				return true
			}
		}
		return false
	}

	switch op {
	case "eq", "in":
		for _, token := range tokens {
			if equalsAny(token) {
				return true
			}
		}
		return false
	case "ne":
		for _, token := range tokens {
			if equalsAny(token) {
				return false
			}
		}
		return true
	case "ilike", "contains":
		for _, token := range tokens {
			if containsAny(token) {
				return true
			}
		}
		return false
	}
	return true
}

func matchBool(value bool, op, raw string) bool {
	tokens := normalizedTokens(raw)
	if len(tokens) == 0 {
		return true
	}

	parsed := make([]bool, 0, len(tokens))
	for _, token := range tokens {
		parsedValue, ok := parseBoolToken(token)
		if ok {
			parsed = append(parsed, parsedValue)
		}
	}
	if len(parsed) == 0 {
		return true
	}

	contains := func(candidate bool) bool {
		for _, item := range parsed {
			if item == candidate {
				return true
			}
		}
		return false
	}

	switch op {
	case "eq", "in", "ilike":
		return contains(value)
	case "ne":
		return !contains(value)
	}
	return true
}

func parseBoolToken(token string) (bool, bool) {
	normalized := strings.ToLower(strings.TrimSpace(token))
	switch normalized {
	case "1", "true", "yes", "y", "system":
		return true, true
	case "0", "false", "no", "n", "custom":
		return false, true
	default:
		return false, false
	}
}

func matchTime(value time.Time, op, raw string) bool {
	if value.IsZero() {
		return false
	}
	tokens := parseTimeTokens(raw)
	if len(tokens) == 0 {
		return true
	}

	switch op {
	case "eq", "in":
		for _, token := range tokens {
			if sameTimeValue(value, token.value, token.dateOnly) {
				return true
			}
		}
		return false
	case "ne":
		for _, token := range tokens {
			if sameTimeValue(value, token.value, token.dateOnly) {
				return false
			}
		}
		return true
	case "gt":
		return value.After(tokens[0].value)
	case "gte":
		return value.After(tokens[0].value) || sameTimeValue(value, tokens[0].value, tokens[0].dateOnly)
	case "lt":
		return value.Before(tokens[0].value)
	case "lte":
		return value.Before(tokens[0].value) || sameTimeValue(value, tokens[0].value, tokens[0].dateOnly)
	}
	return true
}

type parsedTimeToken struct {
	value    time.Time
	dateOnly bool
}

func parseTimeTokens(raw string) []parsedTimeToken {
	parts := strings.Split(raw, ",")
	out := make([]parsedTimeToken, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(strings.Trim(part, "%"))
		if trimmed == "" {
			continue
		}
		t, dateOnly, ok := parseTimeToken(trimmed)
		if !ok {
			continue
		}
		out = append(out, parsedTimeToken{value: t, dateOnly: dateOnly})
	}
	return out
}

func parseTimeToken(raw string) (time.Time, bool, bool) {
	layouts := []struct {
		layout   string
		dateOnly bool
	}{
		{layout: time.RFC3339Nano, dateOnly: false},
		{layout: time.RFC3339, dateOnly: false},
		{layout: "2006-01-02", dateOnly: true},
	}

	for _, candidate := range layouts {
		parsed, err := time.Parse(candidate.layout, raw)
		if err == nil {
			return parsed, candidate.dateOnly, true
		}
	}
	return time.Time{}, false, false
}

func sameTimeValue(left, right time.Time, rightDateOnly bool) bool {
	if rightDateOnly {
		y1, m1, d1 := left.Date()
		y2, m2, d2 := right.Date()
		return y1 == y2 && m1 == m2 && d1 == d2
	}
	return left.Equal(right)
}

func normalizedTokens(raw string) []string {
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		token := strings.ToLower(strings.TrimSpace(strings.Trim(part, "%")))
		if token == "" {
			continue
		}
		out = append(out, token)
	}
	return out
}

func sortRoleRecords(records []admin.RoleRecord, sortBy string, sortDesc bool) {
	field := strings.ToLower(strings.TrimSpace(sortBy))
	if field == "" || len(records) <= 1 {
		return
	}

	sort.SliceStable(records, func(i, j int) bool {
		cmp := compareRoleField(records[i], records[j], field)
		if sortDesc {
			return cmp > 0
		}
		return cmp < 0
	})
}

func compareRoleField(left, right admin.RoleRecord, field string) int {
	switch field {
	case "id":
		return compareStrings(left.ID, right.ID)
	case "name":
		return compareStrings(left.Name, right.Name)
	case "role_key":
		return compareStrings(left.RoleKey, right.RoleKey)
	case "description":
		return compareStrings(left.Description, right.Description)
	case "is_system":
		return compareBools(left.IsSystem, right.IsSystem)
	case "created_at":
		return compareTimes(left.CreatedAt, right.CreatedAt)
	case "updated_at":
		return compareTimes(left.UpdatedAt, right.UpdatedAt)
	default:
		return compareStrings(left.Name, right.Name)
	}
}

func compareStrings(left, right string) int {
	l := strings.ToLower(strings.TrimSpace(left))
	r := strings.ToLower(strings.TrimSpace(right))
	switch {
	case l < r:
		return -1
	case l > r:
		return 1
	default:
		return 0
	}
}

func compareBools(left, right bool) int {
	switch {
	case left == right:
		return 0
	case !left && right:
		return -1
	default:
		return 1
	}
}

func compareTimes(left, right time.Time) int {
	switch {
	case left.Equal(right):
		return 0
	case left.Before(right):
		return -1
	default:
		return 1
	}
}

func paginateBounds(offset, limit, total int) (int, int) {
	if total <= 0 {
		return 0, 0
	}
	if limit <= 0 {
		limit = defaultRolesPageSize
	}
	if offset < 0 {
		offset = 0
	}
	if offset > total {
		offset = total
	}

	end := offset + limit
	if end > total {
		end = total
	}
	if end < offset {
		end = offset
	}
	return offset, end
}

func roleToMap(role admin.RoleRecord) map[string]any {
	record := map[string]any{
		"id":          role.ID,
		"name":        role.Name,
		"role_key":    role.RoleKey,
		"description": role.Description,
		"permissions": append([]string{}, role.Permissions...),
		"metadata":    role.Metadata,
		"is_system":   role.IsSystem,
	}
	if !role.CreatedAt.IsZero() {
		record["created_at"] = role.CreatedAt.Format(time.RFC3339)
	}
	if !role.UpdatedAt.IsZero() {
		record["updated_at"] = role.UpdatedAt.Format(time.RFC3339)
	}
	return record
}

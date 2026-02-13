package admin

import (
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"sort"
	"strings"

	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
	"github.com/goliatone/go-users/command"
	"github.com/goliatone/go-users/pkg/authctx"
	userstypes "github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
)

const appRoleMetadataKey = "app_role"

type bulkImportSummary struct {
	Processed int `json:"processed"`
	Succeeded int `json:"succeeded"`
	Failed    int `json:"failed"`
}

type bulkImportResult struct {
	Index  int    `json:"index"`
	Email  string `json:"email,omitempty"`
	UserID string `json:"user_id,omitempty"`
	Status string `json:"status,omitempty"`
	Error  string `json:"error,omitempty"`
}

type bulkImportResponse struct {
	Summary bulkImportSummary  `json:"summary"`
	Results []bulkImportResult `json:"results"`
	Error   string             `json:"error,omitempty"`
}

type importRecord struct {
	Email    string
	Username string
	Role     string
	AppRole  string
	Status   string
	Metadata any
}

type bulkImportParseOutcome struct {
	Users       []*userstypes.AuthUser
	UserIndexes []int
	Results     []bulkImportResult
	Processed   int
}

type userImportBinding struct {
	admin *Admin
}

func newUserImportBinding(a *Admin) *userImportBinding {
	if a == nil || a.bulkUserImport == nil {
		return nil
	}
	return &userImportBinding{admin: a}
}

func (b *userImportBinding) ImportUsers(c router.Context) error {
	if b == nil || b.admin == nil {
		return respondBulkImportError(c, http.StatusInternalServerError, "user service unavailable")
	}
	adminCtx := b.admin.adminContextFromRequest(c, b.admin.config.DefaultLocale)
	if err := b.admin.requirePermission(adminCtx, b.admin.config.UsersImportPermission, "users"); err != nil {
		return respondBulkImportError(c, http.StatusForbidden, "forbidden")
	}
	if b.admin.bulkUserImport == nil {
		return respondBulkImportError(c, http.StatusInternalServerError, "user service unavailable")
	}

	file, err := c.FormFile("file")
	if err != nil || file == nil {
		return respondBulkImportError(c, http.StatusBadRequest, "file required")
	}
	if strings.TrimSpace(file.Filename) == "" || file.Size == 0 {
		return respondBulkImportError(c, http.StatusBadRequest, "file is empty")
	}
	if !isSupportedImportFile(file) {
		return respondBulkImportError(c, http.StatusBadRequest, "invalid file type")
	}

	outcome, err := parseImportFile(file)
	if err != nil {
		return respondBulkImportError(c, http.StatusBadRequest, bulkImportErrorMessage(err))
	}

	response := newBulkImportResponse()
	resultsByIndex := map[int]bulkImportResult{}
	order := []int{}
	for _, result := range outcome.Results {
		appendBulkImportResult(resultsByIndex, &order, result)
	}

	actorRef, actorCtx, err := authctx.ResolveActor(adminCtx.Context)
	if err != nil || actorRef.ID == uuid.Nil {
		return respondBulkImportError(c, http.StatusUnauthorized, "missing or invalid token")
	}
	scope := authctx.ScopeFromActorContext(actorCtx)

	var execErr error
	if len(outcome.Users) > 0 {
		cmdResults := []command.BulkUserImportResult{}
		input := command.BulkUserImportInput{
			Users:           outcome.Users,
			Actor:           actorRef,
			Scope:           scope,
			DefaultStatus:   userstypes.LifecycleStateActive,
			ContinueOnError: true,
			Results:         &cmdResults,
		}
		execErr = b.admin.bulkUserImport.Execute(adminCtx.Context, input)
		for _, result := range cmdResults {
			appendBulkImportResult(resultsByIndex, &order, mapBulkImportCommandResult(result, outcome.UserIndexes))
		}
	}

	response.Results = collectBulkImportResults(resultsByIndex, order)
	response.Summary = bulkImportSummaryFromResults(outcome.Processed, response.Results)

	status, message := bulkImportStatus(response.Summary.Failed > 0, execErr)
	if message != "" {
		response.Error = message
	}
	return c.JSON(status, response)
}

func (b *userImportBinding) ImportTemplate(c router.Context) error {
	format := strings.ToLower(strings.TrimSpace(c.Query("format")))
	if format == "" {
		format = "csv"
	}
	switch format {
	case "csv":
		return b.importTemplateCSV(c)
	case "json":
		return b.importTemplateJSON(c)
	default:
		return respondBulkImportError(c, http.StatusBadRequest, "invalid format, use csv or json")
	}
}

func (b *userImportBinding) importTemplateCSV(c router.Context) error {
	template := `email,username,role,app_role,status,metadata
user@example.com,johndoe,member,,active,"{""department"":""engineering""}"
admin@example.com,adminuser,admin,,active,
`
	c.SetHeader("Content-Type", "text/csv")
	c.SetHeader("Content-Disposition", "attachment; filename=users_import_template.csv")
	return c.SendString(template)
}

func (b *userImportBinding) importTemplateJSON(c router.Context) error {
	template := []map[string]any{
		{
			"email":    "user@example.com",
			"username": "johndoe",
			"role":     "member",
			"app_role": "",
			"status":   "active",
			"metadata": map[string]any{"department": "engineering"},
		},
		{
			"email":    "admin@example.com",
			"username": "adminuser",
			"role":     "admin",
			"app_role": "",
			"status":   "active",
			"metadata": nil,
		},
	}
	c.SetHeader("Content-Disposition", "attachment; filename=users_import_template.json")
	return c.JSON(http.StatusOK, template)
}

func newBulkImportResponse() bulkImportResponse {
	return bulkImportResponse{
		Summary: bulkImportSummary{},
		Results: []bulkImportResult{},
	}
}

func respondBulkImportError(c router.Context, status int, message string) error {
	response := newBulkImportResponse()
	response.Error = strings.TrimSpace(message)
	return c.JSON(status, response)
}

func appendBulkImportResult(results map[int]bulkImportResult, order *[]int, result bulkImportResult) {
	if results == nil || order == nil {
		return
	}
	if _, exists := results[result.Index]; exists {
		return
	}
	results[result.Index] = result
	*order = append(*order, result.Index)
}

func collectBulkImportResults(results map[int]bulkImportResult, order []int) []bulkImportResult {
	if len(results) == 0 {
		return []bulkImportResult{}
	}
	if len(order) == 0 {
		for index := range results {
			order = append(order, index)
		}
	}
	sort.Ints(order)
	out := make([]bulkImportResult, 0, len(order))
	for _, index := range order {
		if result, ok := results[index]; ok {
			out = append(out, result)
		}
	}
	return out
}

func mapBulkImportCommandResult(result command.BulkUserImportResult, indexes []int) bulkImportResult {
	index := result.Index
	if index >= 0 && index < len(indexes) {
		index = indexes[index]
	}
	output := bulkImportResult{
		Index:  index,
		Email:  strings.TrimSpace(result.Email),
		Status: string(result.Status),
	}
	if result.UserID != uuid.Nil {
		output.UserID = result.UserID.String()
	}
	if result.Err != nil {
		output.Error = bulkImportErrorMessage(result.Err)
	}
	return output
}

func bulkImportSummaryFromResults(processed int, results []bulkImportResult) bulkImportSummary {
	if processed == 0 && len(results) > 0 {
		processed = len(results)
	}
	summary := bulkImportSummary{
		Processed: processed,
	}
	for _, result := range results {
		if strings.TrimSpace(result.Error) != "" {
			summary.Failed++
		} else {
			summary.Succeeded++
		}
	}
	return summary
}

func bulkImportStatus(hasFailures bool, execErr error) (int, string) {
	if execErr != nil {
		switch {
		case bulkImportHasCategory(execErr, goerrors.CategoryAuthz):
			return http.StatusForbidden, "forbidden"
		case bulkImportHasCategory(execErr, goerrors.CategoryValidation),
			bulkImportHasCategory(execErr, goerrors.CategoryBadInput):
			return http.StatusUnprocessableEntity, "validation failed"
		default:
			return http.StatusInternalServerError, "import failed"
		}
	}
	if hasFailures {
		return http.StatusUnprocessableEntity, "validation failed"
	}
	return http.StatusOK, ""
}

func bulkImportHasCategory(err error, category goerrors.Category) bool {
	if err == nil {
		return false
	}
	type multiUnwrap interface {
		Unwrap() []error
	}
	if multi, ok := err.(multiUnwrap); ok {
		for _, inner := range multi.Unwrap() {
			if bulkImportHasCategory(inner, category) {
				return true
			}
		}
		return false
	}

	var richErr *goerrors.Error
	if goerrors.As(err, &richErr) && richErr.Category == category {
		return true
	}
	if inner := errors.Unwrap(err); inner != nil {
		return bulkImportHasCategory(inner, category)
	}
	return false
}

func bulkImportErrorMessage(err error) string {
	if err == nil {
		return ""
	}
	var richErr *goerrors.Error
	if goerrors.As(err, &richErr) {
		if richErr.Source != nil {
			if msg := bulkImportErrorMessage(richErr.Source); msg != "" {
				return msg
			}
		}
		if strings.TrimSpace(richErr.Message) != "" {
			return strings.TrimSpace(richErr.Message)
		}
	}
	return strings.TrimSpace(err.Error())
}

func isSupportedImportFile(file *multipart.FileHeader) bool {
	if file == nil {
		return false
	}
	name := strings.ToLower(strings.TrimSpace(file.Filename))
	ext := strings.ToLower(filepath.Ext(name))
	switch ext {
	case ".csv", ".json":
		return true
	}
	contentType := strings.ToLower(strings.TrimSpace(file.Header.Get("Content-Type")))
	return strings.Contains(contentType, "csv") || strings.Contains(contentType, "json")
}

func parseImportFile(file *multipart.FileHeader) (bulkImportParseOutcome, error) {
	outcome := bulkImportParseOutcome{}
	if file == nil {
		return outcome, requiredFieldDomainError("file", map[string]any{"component": "users_import"})
	}
	format := detectImportFormat(file)
	if format == "" {
		return outcome, validationDomainError("unsupported import format", map[string]any{"component": "users_import"})
	}
	handle, err := file.Open()
	if err != nil {
		return outcome, validationDomainError("unable to read import file", map[string]any{"component": "users_import"})
	}
	defer handle.Close()

	switch format {
	case "csv":
		return parseCSVImport(handle)
	case "json":
		return parseJSONImport(handle)
	default:
		return outcome, validationDomainError("unsupported import format", map[string]any{"component": "users_import"})
	}
}

func detectImportFormat(file *multipart.FileHeader) string {
	if file == nil {
		return ""
	}
	name := strings.ToLower(strings.TrimSpace(file.Filename))
	ext := strings.ToLower(filepath.Ext(name))
	switch ext {
	case ".csv":
		return "csv"
	case ".json":
		return "json"
	}
	contentType := strings.ToLower(strings.TrimSpace(file.Header.Get("Content-Type")))
	switch {
	case strings.Contains(contentType, "csv"):
		return "csv"
	case strings.Contains(contentType, "json"):
		return "json"
	default:
		return ""
	}
}

func parseCSVImport(reader io.Reader) (bulkImportParseOutcome, error) {
	outcome := bulkImportParseOutcome{}
	if reader == nil {
		return outcome, validationDomainError("empty csv payload", map[string]any{"format": "csv"})
	}
	csvReader := csv.NewReader(reader)
	csvReader.FieldsPerRecord = -1
	csvReader.TrimLeadingSpace = true
	csvReader.LazyQuotes = true

	header, err := csvReader.Read()
	if err != nil {
		if err == io.EOF {
			return outcome, validationDomainError("empty csv payload", map[string]any{"format": "csv"})
		}
		return outcome, validationDomainError("invalid csv payload", map[string]any{"format": "csv"})
	}
	columnIndex := map[string]int{}
	for idx, column := range header {
		key := normalizeColumnName(column)
		if key == "" {
			continue
		}
		columnIndex[key] = idx
	}
	if _, ok := columnIndex["email"]; !ok {
		return outcome, requiredFieldDomainError("email column", map[string]any{"format": "csv"})
	}

	rowIndex := 0
	for {
		row, err := csvReader.Read()
		if err != nil {
			if err == io.EOF {
				break
			}
			return outcome, validationDomainError("invalid csv payload", map[string]any{"format": "csv"})
		}
		record := importRecord{
			Email:    valueFromRow(row, columnIndex, "email"),
			Username: valueFromRow(row, columnIndex, "username"),
			Role:     valueFromRow(row, columnIndex, "role"),
			AppRole:  valueFromRow(row, columnIndex, "app_role"),
			Status:   valueFromRow(row, columnIndex, "status"),
			Metadata: valueFromRow(row, columnIndex, "metadata"),
		}
		outcome.Processed++
		if user, result := normalizeImportRecord(rowIndex, record); result != nil {
			outcome.Results = append(outcome.Results, *result)
		} else if user != nil {
			outcome.Users = append(outcome.Users, user)
			outcome.UserIndexes = append(outcome.UserIndexes, rowIndex)
		}
		rowIndex++
	}
	return outcome, nil
}

func parseJSONImport(reader io.Reader) (bulkImportParseOutcome, error) {
	outcome := bulkImportParseOutcome{}
	if reader == nil {
		return outcome, validationDomainError("empty json payload", map[string]any{"format": "json"})
	}
	decoder := json.NewDecoder(reader)
	decoder.UseNumber()

	var payload any
	if err := decoder.Decode(&payload); err != nil {
		return outcome, validationDomainError("invalid json payload", map[string]any{"format": "json"})
	}
	rows, ok := payload.([]any)
	if !ok {
		return outcome, validationDomainError("json payload must be an array", map[string]any{"format": "json"})
	}

	for idx, raw := range rows {
		outcome.Processed++
		record, ok := jsonRecord(raw)
		if !ok {
			outcome.Results = append(outcome.Results, bulkImportResult{
				Index: idx,
				Error: "record must be an object",
			})
			continue
		}
		if user, result := normalizeImportRecord(idx, record); result != nil {
			outcome.Results = append(outcome.Results, *result)
		} else if user != nil {
			outcome.Users = append(outcome.Users, user)
			outcome.UserIndexes = append(outcome.UserIndexes, idx)
		}
	}
	return outcome, nil
}

func jsonRecord(raw any) (importRecord, bool) {
	record := importRecord{}
	payload, ok := raw.(map[string]any)
	if !ok || payload == nil {
		return record, false
	}
	normalized := map[string]any{}
	for key, value := range payload {
		normalized[strings.ToLower(strings.TrimSpace(key))] = value
	}
	record.Email = importStringValue(normalized["email"])
	record.Username = importStringValue(normalized["username"])
	record.Role = importStringValue(normalized["role"])
	record.AppRole = importStringValue(normalized["app_role"])
	record.Status = importStringValue(normalized["status"])
	record.Metadata = normalized["metadata"]
	return record, true
}

func normalizeImportRecord(index int, record importRecord) (*userstypes.AuthUser, *bulkImportResult) {
	email := strings.TrimSpace(record.Email)
	result := &bulkImportResult{
		Index: index,
		Email: email,
	}
	if email == "" {
		result.Error = "email is required"
		return nil, result
	}
	metadata, err := parseMetadata(record.Metadata)
	if err != nil {
		result.Error = bulkImportErrorMessage(err)
		return nil, result
	}
	user := &userstypes.AuthUser{
		Email:    email,
		Username: strings.TrimSpace(record.Username),
		Role:     strings.TrimSpace(record.Role),
		Status:   parseLifecycleState(record.Status),
		Metadata: metadata,
	}
	if appRole := strings.TrimSpace(record.AppRole); appRole != "" {
		if user.Metadata == nil {
			user.Metadata = map[string]any{}
		}
		user.Metadata[appRoleMetadataKey] = appRole
	}
	return user, nil
}

func parseLifecycleState(raw string) userstypes.LifecycleState {
	value := strings.ToLower(strings.TrimSpace(raw))
	switch value {
	case "pending":
		return userstypes.LifecycleStatePending
	case "active":
		return userstypes.LifecycleStateActive
	case "suspended", "suspend":
		return userstypes.LifecycleStateSuspended
	case "disabled", "inactive", "disable":
		return userstypes.LifecycleStateDisabled
	case "archived", "archive":
		return userstypes.LifecycleStateArchived
	default:
		return ""
	}
}

func parseMetadata(raw any) (map[string]any, error) {
	switch value := raw.(type) {
	case nil:
		return nil, nil
	case map[string]any:
		return cloneMetadata(value), nil
	case string:
		return parseMetadataJSON(value)
	case []byte:
		return parseMetadataJSON(string(value))
	case json.RawMessage:
		return parseMetadataJSON(string(value))
	default:
		return nil, validationDomainError("metadata must be a json object", map[string]any{"field": "metadata"})
	}
}

func parseMetadataJSON(raw string) (map[string]any, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil, nil
	}
	payload := map[string]any{}
	if err := json.Unmarshal([]byte(trimmed), &payload); err != nil {
		return nil, validationDomainError("metadata must be valid json", map[string]any{"field": "metadata"})
	}
	return payload, nil
}

func cloneMetadata(input map[string]any) map[string]any {
	if input == nil {
		return nil
	}
	out := make(map[string]any, len(input))
	for key, value := range input {
		out[key] = value
	}
	return out
}

func normalizeColumnName(raw string) string {
	return strings.ToLower(strings.TrimSpace(raw))
}

func valueFromRow(row []string, index map[string]int, key string) string {
	pos, ok := index[key]
	if !ok || pos < 0 || pos >= len(row) {
		return ""
	}
	return strings.TrimSpace(row[pos])
}

func importStringValue(raw any) string {
	switch value := raw.(type) {
	case nil:
		return ""
	case string:
		return strings.TrimSpace(value)
	case []byte:
		return strings.TrimSpace(string(value))
	case json.Number:
		return strings.TrimSpace(value.String())
	default:
		return strings.TrimSpace(fmt.Sprint(value))
	}
}

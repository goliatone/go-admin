package services

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strings"
)

type googleDriveCommentPayload struct {
	ID                string `json:"id"`
	Content           string `json:"content"`
	HTMLContent       string `json:"htmlContent"` //nolint:tagliatelle // external Google API uses these camelCase JSON field names.
	Anchor            string `json:"anchor"`
	Deleted           bool   `json:"deleted"`
	Resolved          bool   `json:"resolved"`
	CreatedTime       string `json:"createdTime"`  //nolint:tagliatelle // external Google API uses these camelCase JSON field names.
	ModifiedTime      string `json:"modifiedTime"` //nolint:tagliatelle // external Google API uses these camelCase JSON field names.
	QuotedFileContent struct {
		MimeType string `json:"mimeType"` //nolint:tagliatelle // external Google API uses these camelCase JSON field names.
		Value    string `json:"value"`
	} `json:"quotedFileContent"` //nolint:tagliatelle // external Google API uses these camelCase JSON field names.
	Author struct {
		DisplayName  string `json:"displayName"`  //nolint:tagliatelle // external Google API uses these camelCase JSON field names.
		EmailAddress string `json:"emailAddress"` //nolint:tagliatelle // external Google API uses these camelCase JSON field names.
		Me           bool   `json:"me"`
	} `json:"author"`
}

type googleDriveReplyPayload struct {
	ID           string `json:"id"`
	Content      string `json:"content"`
	HTMLContent  string `json:"htmlContent"` //nolint:tagliatelle // external Google API uses these camelCase JSON field names.
	Action       string `json:"action"`
	Deleted      bool   `json:"deleted"`
	CreatedTime  string `json:"createdTime"`  //nolint:tagliatelle // external Google API uses these camelCase JSON field names.
	ModifiedTime string `json:"modifiedTime"` //nolint:tagliatelle // external Google API uses these camelCase JSON field names.
	Author       struct {
		DisplayName  string `json:"displayName"`  //nolint:tagliatelle // external Google API uses these camelCase JSON field names.
		EmailAddress string `json:"emailAddress"` //nolint:tagliatelle // external Google API uses these camelCase JSON field names.
		Me           bool   `json:"me"`
	} `json:"author"`
}

func (p *DeterministicGoogleProvider) ListComments(_ context.Context, accessToken, fileID string) ([]GoogleDriveComment, error) {
	if p == nil {
		return nil, fmt.Errorf("google provider not configured")
	}
	if err := p.resolveError("comments:" + strings.TrimSpace(accessToken) + ":" + strings.TrimSpace(fileID)); err != nil {
		return nil, err
	}
	fileID = strings.TrimSpace(fileID)
	comments := append([]GoogleDriveComment(nil), p.commentsByID[fileID]...)
	sort.SliceStable(comments, func(i, j int) bool {
		if comments[i].CreatedTime.Equal(comments[j].CreatedTime) {
			return comments[i].ID < comments[j].ID
		}
		return comments[i].CreatedTime.Before(comments[j].CreatedTime)
	})
	return comments, nil
}

func (p *GoogleHTTPProvider) ListComments(ctx context.Context, accessToken, fileID string) ([]GoogleDriveComment, error) {
	if p == nil {
		return nil, fmt.Errorf("google provider not configured")
	}
	fileID = strings.TrimSpace(fileID)
	if fileID == "" {
		return nil, NewGoogleProviderError(GoogleProviderErrorPermissionDenied, "google_file_id is required", nil)
	}
	params := url.Values{}
	params.Set("fields", "comments(id,content,htmlContent,anchor,deleted,resolved,createdTime,modifiedTime,quotedFileContent/value,quotedFileContent/mimeType,author/displayName,author/emailAddress,author/me),nextPageToken")
	params.Set("includeDeleted", "true")
	endpoint := fmt.Sprintf("%s/files/%s/comments?%s", p.driveBaseURL, url.PathEscape(fileID), params.Encode())

	comments := []GoogleDriveComment{}
	for endpoint != "" {
		respBody, statusCode, err := p.requestJSON(ctx, http.MethodGet, endpoint, accessToken, nil)
		if err != nil {
			return nil, err
		}
		if statusCode >= http.StatusBadRequest {
			return nil, mapGoogleHTTPStatus("drive_comments", statusCode, respBody, map[string]any{"file_id": fileID})
		}
		var payload struct {
			Comments      []googleDriveCommentPayload `json:"comments"`
			NextPageToken string                      `json:"nextPageToken"` //nolint:tagliatelle // external Google API uses these camelCase JSON field names.
		}
		if err := json.Unmarshal(respBody, &payload); err != nil {
			return nil, fmt.Errorf("decode google drive comments response: %w", err)
		}
		for _, record := range payload.Comments {
			comment, err := decodeGoogleDriveComment(record)
			if err != nil {
				return nil, err
			}
			replies, err := p.listReplies(ctx, accessToken, fileID, comment.ID)
			if err != nil {
				return nil, err
			}
			comment.Replies = replies
			comments = append(comments, comment)
		}
		if strings.TrimSpace(payload.NextPageToken) == "" {
			endpoint = ""
			continue
		}
		params.Set("pageToken", strings.TrimSpace(payload.NextPageToken))
		endpoint = fmt.Sprintf("%s/files/%s/comments?%s", p.driveBaseURL, url.PathEscape(fileID), params.Encode())
	}
	sort.SliceStable(comments, func(i, j int) bool {
		if comments[i].CreatedTime.Equal(comments[j].CreatedTime) {
			return comments[i].ID < comments[j].ID
		}
		return comments[i].CreatedTime.Before(comments[j].CreatedTime)
	})
	return comments, nil
}

func (p *GoogleHTTPProvider) listReplies(ctx context.Context, accessToken, fileID, commentID string) ([]GoogleDriveReply, error) {
	params := url.Values{}
	params.Set("fields", "replies(id,content,htmlContent,action,deleted,createdTime,modifiedTime,author/displayName,author/emailAddress,author/me),nextPageToken")
	params.Set("includeDeleted", "true")
	endpoint := fmt.Sprintf("%s/files/%s/comments/%s/replies?%s", p.driveBaseURL, url.PathEscape(fileID), url.PathEscape(commentID), params.Encode())

	out := []GoogleDriveReply{}
	for endpoint != "" {
		respBody, statusCode, err := p.requestJSON(ctx, http.MethodGet, endpoint, accessToken, nil)
		if err != nil {
			return nil, err
		}
		if statusCode >= http.StatusBadRequest {
			return nil, mapGoogleHTTPStatus("drive_comment_replies", statusCode, respBody, map[string]any{
				"file_id":    fileID,
				"comment_id": commentID,
			})
		}
		var payload struct {
			Replies       []googleDriveReplyPayload `json:"replies"`
			NextPageToken string                    `json:"nextPageToken"` //nolint:tagliatelle // external Google API uses these camelCase JSON field names.
		}
		if err := json.Unmarshal(respBody, &payload); err != nil {
			return nil, fmt.Errorf("decode google drive replies response: %w", err)
		}
		for _, record := range payload.Replies {
			out = append(out, decodeGoogleDriveReply(record))
		}
		if strings.TrimSpace(payload.NextPageToken) == "" {
			endpoint = ""
			continue
		}
		params.Set("pageToken", strings.TrimSpace(payload.NextPageToken))
		endpoint = fmt.Sprintf("%s/files/%s/comments/%s/replies?%s", p.driveBaseURL, url.PathEscape(fileID), url.PathEscape(commentID), params.Encode())
	}
	sort.SliceStable(out, func(i, j int) bool {
		if out[i].CreatedTime.Equal(out[j].CreatedTime) {
			return out[i].ID < out[j].ID
		}
		return out[i].CreatedTime.Before(out[j].CreatedTime)
	})
	return out, nil
}

func decodeGoogleDriveComment(record googleDriveCommentPayload) (GoogleDriveComment, error) {
	createdTime, err := parseGoogleTime(record.CreatedTime)
	if err != nil {
		return GoogleDriveComment{}, err
	}
	modifiedTime, err := parseGoogleTime(record.ModifiedTime)
	if err != nil {
		return GoogleDriveComment{}, err
	}
	return GoogleDriveComment{
		ID:           strings.TrimSpace(record.ID),
		Content:      strings.TrimSpace(record.Content),
		HTMLContent:  strings.TrimSpace(record.HTMLContent),
		Anchor:       strings.TrimSpace(record.Anchor),
		Deleted:      record.Deleted,
		Resolved:     record.Resolved,
		CreatedTime:  createdTime,
		ModifiedTime: modifiedTime,
		Author: GoogleDriveCommentAuthor{
			DisplayName:  strings.TrimSpace(record.Author.DisplayName),
			EmailAddress: strings.TrimSpace(record.Author.EmailAddress),
			Me:           record.Author.Me,
		},
		QuotedFileContent: GoogleDriveQuotedFileContent{
			MimeType: strings.TrimSpace(record.QuotedFileContent.MimeType),
			Value:    strings.TrimSpace(record.QuotedFileContent.Value),
		},
	}, nil
}

func decodeGoogleDriveReply(record googleDriveReplyPayload) GoogleDriveReply {
	createdTime, _ := parseGoogleTime(record.CreatedTime)   //nolint:errcheck // legacy dynamic payload keeps existing zero-value fallback behavior.
	modifiedTime, _ := parseGoogleTime(record.ModifiedTime) //nolint:errcheck // legacy dynamic payload keeps existing zero-value fallback behavior.
	return GoogleDriveReply{
		ID:           strings.TrimSpace(record.ID),
		Content:      strings.TrimSpace(record.Content),
		HTMLContent:  strings.TrimSpace(record.HTMLContent),
		Action:       strings.TrimSpace(record.Action),
		Deleted:      record.Deleted,
		CreatedTime:  createdTime,
		ModifiedTime: modifiedTime,
		Author: GoogleDriveCommentAuthor{
			DisplayName:  strings.TrimSpace(record.Author.DisplayName),
			EmailAddress: strings.TrimSpace(record.Author.EmailAddress),
			Me:           record.Author.Me,
		},
	}
}

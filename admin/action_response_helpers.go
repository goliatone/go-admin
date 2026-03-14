package admin

func normalizeActionResponse(response ActionResponse) ActionResponse {
	if response.StatusCode < 200 || response.StatusCode >= 600 {
		response.StatusCode = 200
	}
	response.Data = cloneActionResponseMap(response.Data)
	return response
}

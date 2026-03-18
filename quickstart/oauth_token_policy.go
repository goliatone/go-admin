package quickstart

// OAuthTokenPolicyInput captures provider token status flags used by UI warnings.
type OAuthTokenPolicyInput struct {
	IsExpired      bool `json:"is_expired"`
	IsExpiringSoon bool `json:"is_expiring_soon"`
	CanAutoRefresh bool `json:"can_auto_refresh"`
}

// OAuthTokenPolicyState contains derived UI policy for token warnings.
type OAuthTokenPolicyState struct {
	IsExpired            bool `json:"is_expired"`
	IsExpiringSoon       bool `json:"is_expiring_soon"`
	CanAutoRefresh       bool `json:"can_auto_refresh"`
	NeedsReauthorization bool `json:"needs_reauthorization"`
}

// OAuthNeedsReauthorization returns true only when manual action is required.
func OAuthNeedsReauthorization(isExpired, isExpiringSoon, canAutoRefresh bool) bool {
	return (isExpired || isExpiringSoon) && !canAutoRefresh
}

// ResolveOAuthTokenPolicy derives UI flags from backend token state.
func ResolveOAuthTokenPolicy(input OAuthTokenPolicyInput) OAuthTokenPolicyState {
	return OAuthTokenPolicyState{
		IsExpired:            input.IsExpired,
		IsExpiringSoon:       input.IsExpiringSoon,
		CanAutoRefresh:       input.CanAutoRefresh,
		NeedsReauthorization: OAuthNeedsReauthorization(input.IsExpired, input.IsExpiringSoon, input.CanAutoRefresh),
	}
}

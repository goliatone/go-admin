package quickstart

// OAuthTokenPolicyInput captures provider token status flags used by UI warnings.
type OAuthTokenPolicyInput struct {
	IsExpired      bool
	IsExpiringSoon bool
	CanAutoRefresh bool
}

// OAuthTokenPolicyState contains derived UI policy for token warnings.
type OAuthTokenPolicyState struct {
	IsExpired            bool
	IsExpiringSoon       bool
	CanAutoRefresh       bool
	NeedsReauthorization bool
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

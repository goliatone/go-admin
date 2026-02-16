package quickstart

import "testing"

func TestOAuthNeedsReauthorization(t *testing.T) {
	cases := []struct {
		name           string
		isExpired      bool
		isExpiringSoon bool
		canAutoRefresh bool
		want           bool
	}{
		{
			name:           "expired_manual_reauth",
			isExpired:      true,
			isExpiringSoon: false,
			canAutoRefresh: false,
			want:           true,
		},
		{
			name:           "expiring_manual_reauth",
			isExpired:      false,
			isExpiringSoon: true,
			canAutoRefresh: false,
			want:           true,
		},
		{
			name:           "expired_auto_refresh",
			isExpired:      true,
			isExpiringSoon: false,
			canAutoRefresh: true,
			want:           false,
		},
		{
			name:           "healthy_token",
			isExpired:      false,
			isExpiringSoon: false,
			canAutoRefresh: false,
			want:           false,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := OAuthNeedsReauthorization(tc.isExpired, tc.isExpiringSoon, tc.canAutoRefresh)
			if got != tc.want {
				t.Fatalf("expected %t, got %t", tc.want, got)
			}
		})
	}
}

func TestDefaultTemplateFuncsIncludesOAuthNeedsReauthorization(t *testing.T) {
	funcs := DefaultTemplateFuncs()
	fn, ok := funcs["oauthNeedsReauthorization"]
	if !ok || fn == nil {
		t.Fatalf("expected oauthNeedsReauthorization template func")
	}
	callable, ok := fn.(func(bool, bool, bool) bool)
	if !ok {
		t.Fatalf("expected oauthNeedsReauthorization signature func(bool,bool,bool)bool, got %T", fn)
	}
	if !callable(true, false, false) {
		t.Fatalf("expected helper to require manual reauthorization for expired token without auto refresh")
	}
	if callable(false, true, true) {
		t.Fatalf("expected helper to suppress manual reauthorization when auto refresh is available")
	}
}

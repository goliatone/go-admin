package admin

import (
	"encoding/base64"
	"net/url"
	"regexp"
	"strings"
)

// IconSecurityPolicy configures security restrictions for icon rendering.
type IconSecurityPolicy struct {
	// AllowUntrustedCustom permits custom SVG/URL for untrusted input.
	// Default: false
	AllowUntrustedCustom bool

	// AllowDataURI permits data: URIs.
	// For trusted input, default is true. For untrusted, follows AllowUntrustedCustom.
	AllowDataURI bool

	// AllowedExternalSchemes lists permitted URL schemes.
	// Default: ["https"]
	AllowedExternalSchemes []string

	// AllowedDataMIMEs lists permitted MIME types for data URIs.
	// Default: ["image/svg+xml", "image/png", "image/jpeg", "image/webp", "image/gif"]
	AllowedDataMIMEs []string

	// MaxSVGBytes is the maximum allowed size for SVG content.
	// Default: 65536 (64KB)
	MaxSVGBytes int

	// MaxDataURIBytes is the maximum allowed size for data URI payloads.
	// Default: 131072 (128KB)
	MaxDataURIBytes int

	// AllowedExternalHosts is an optional allowlist of external hosts.
	// Empty means any host with allowed scheme is permitted.
	AllowedExternalHosts []string
}

// DefaultIconSecurityPolicy returns the default security policy.
func DefaultIconSecurityPolicy() IconSecurityPolicy {
	return IconSecurityPolicy{
		AllowUntrustedCustom:   false,
		AllowDataURI:           true,
		AllowedExternalSchemes: []string{"https"},
		AllowedDataMIMEs: []string{
			"image/svg+xml",
			"image/png",
			"image/jpeg",
			"image/webp",
			"image/gif",
		},
		MaxSVGBytes:     65536,  // 64KB
		MaxDataURIBytes: 131072, // 128KB
	}
}

// IconSecurityResult represents the result of security validation.
type IconSecurityResult struct {
	// Allowed indicates whether the icon can be rendered.
	Allowed bool
	// Reason explains why the icon was blocked (empty if allowed).
	Reason string
	// SanitizedContent contains sanitized SVG content (if applicable).
	SanitizedContent string
	// ValidatedURL contains the validated URL (if applicable).
	ValidatedURL string
}

// IconSecurityValidator validates and sanitizes icon content.
type IconSecurityValidator struct {
	policy IconSecurityPolicy
}

// NewIconSecurityValidator creates a new validator with the given policy.
func NewIconSecurityValidator(policy IconSecurityPolicy) *IconSecurityValidator {
	return &IconSecurityValidator{policy: policy}
}

// ValidateIcon validates an icon reference based on trust level.
func (v *IconSecurityValidator) ValidateIcon(ref IconReference, opts IconRenderOptions) IconSecurityResult {
	switch ref.Type {
	case IconTypeEmoji:
		return IconSecurityResult{Allowed: true}

	case IconTypeLibrary:
		return v.validateLibraryIcon(ref)

	case IconTypeSVG:
		return v.validateSVG(ref.Value, opts.TrustedInput)

	case IconTypeURL:
		return v.validateURL(ref.Value, opts.TrustedInput)

	default:
		return IconSecurityResult{Allowed: false, Reason: "unknown icon type"}
	}
}

// validateLibraryIcon validates a library icon name.
func (v *IconSecurityValidator) validateLibraryIcon(ref IconReference) IconSecurityResult {
	// Library icons are always allowed - they're just CSS class names
	// that get escaped during rendering
	if ref.Value == "" {
		return IconSecurityResult{Allowed: false, Reason: "empty icon name"}
	}

	// Basic validation: only allow alphanumeric, dash, underscore
	if !isValidIconName(ref.Value) {
		return IconSecurityResult{Allowed: false, Reason: "invalid icon name characters"}
	}

	return IconSecurityResult{Allowed: true}
}

// validateSVG validates and sanitizes SVG content.
func (v *IconSecurityValidator) validateSVG(content string, trusted bool) IconSecurityResult {
	// Check trust level
	if !trusted && !v.policy.AllowUntrustedCustom {
		return IconSecurityResult{
			Allowed: false,
			Reason:  "custom SVG not allowed for untrusted input",
		}
	}

	// Check size limit
	if len(content) > v.policy.MaxSVGBytes {
		return IconSecurityResult{
			Allowed: false,
			Reason:  "SVG content exceeds size limit",
		}
	}

	// Sanitize SVG
	sanitized, err := sanitizeSVG(content)
	if err != nil {
		return IconSecurityResult{
			Allowed: false,
			Reason:  "SVG sanitization failed: " + err.Error(),
		}
	}

	// Check post-sanitization size
	if len(sanitized) > v.policy.MaxSVGBytes {
		return IconSecurityResult{
			Allowed: false,
			Reason:  "sanitized SVG exceeds size limit",
		}
	}

	return IconSecurityResult{
		Allowed:          true,
		SanitizedContent: sanitized,
	}
}

// validateURL validates a URL or data URI.
func (v *IconSecurityValidator) validateURL(rawURL string, trusted bool) IconSecurityResult {
	// Check for data URI
	if strings.HasPrefix(rawURL, "data:") {
		return v.validateDataURI(rawURL, trusted)
	}

	// Check trust level for external URLs
	if !trusted && !v.policy.AllowUntrustedCustom {
		return IconSecurityResult{
			Allowed: false,
			Reason:  "external URLs not allowed for untrusted input",
		}
	}

	// Parse URL
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return IconSecurityResult{
			Allowed: false,
			Reason:  "invalid URL: " + err.Error(),
		}
	}

	// Check scheme
	scheme := strings.ToLower(parsed.Scheme)
	if !v.isAllowedScheme(scheme) {
		return IconSecurityResult{
			Allowed: false,
			Reason:  "URL scheme not allowed: " + scheme,
		}
	}

	// Block javascript: explicitly
	if scheme == "javascript" {
		return IconSecurityResult{
			Allowed: false,
			Reason:  "javascript URLs are not allowed",
		}
	}

	// Check host allowlist if configured
	if len(v.policy.AllowedExternalHosts) > 0 {
		if !v.isAllowedHost(parsed.Host) {
			return IconSecurityResult{
				Allowed: false,
				Reason:  "host not in allowlist: " + parsed.Host,
			}
		}
	}

	return IconSecurityResult{
		Allowed:      true,
		ValidatedURL: rawURL,
	}
}

// validateDataURI validates a data URI.
func (v *IconSecurityValidator) validateDataURI(dataURI string, trusted bool) IconSecurityResult {
	// Check trust level
	if !trusted && !v.policy.AllowUntrustedCustom {
		return IconSecurityResult{
			Allowed: false,
			Reason:  "data URIs not allowed for untrusted input",
		}
	}

	if !v.policy.AllowDataURI {
		return IconSecurityResult{
			Allowed: false,
			Reason:  "data URIs are disabled",
		}
	}

	// Parse data URI: data:[<mediatype>][;base64],<data>
	if !strings.HasPrefix(dataURI, "data:") {
		return IconSecurityResult{
			Allowed: false,
			Reason:  "invalid data URI format",
		}
	}

	content := strings.TrimPrefix(dataURI, "data:")
	commaIdx := strings.Index(content, ",")
	if commaIdx < 0 {
		return IconSecurityResult{
			Allowed: false,
			Reason:  "invalid data URI: missing comma",
		}
	}

	mediaType := content[:commaIdx]
	data := content[commaIdx+1:]

	// Check for base64 encoding
	isBase64 := strings.HasSuffix(mediaType, ";base64")
	if isBase64 {
		mediaType = strings.TrimSuffix(mediaType, ";base64")
	}

	// Extract MIME type (remove charset and other params)
	mimeType := strings.Split(mediaType, ";")[0]
	mimeType = strings.TrimSpace(mimeType)

	// Check MIME allowlist
	if !v.isAllowedMIME(mimeType) {
		return IconSecurityResult{
			Allowed: false,
			Reason:  "data URI MIME type not allowed: " + mimeType,
		}
	}

	// Check size limit
	var dataSize int
	if isBase64 {
		// Base64 encoded data: estimate decoded size
		dataSize = base64.StdEncoding.DecodedLen(len(data))
	} else {
		dataSize = len(data)
	}

	if dataSize > v.policy.MaxDataURIBytes {
		return IconSecurityResult{
			Allowed: false,
			Reason:  "data URI payload exceeds size limit",
		}
	}

	// For SVG data URIs, decode and sanitize
	if mimeType == "image/svg+xml" {
		var svgContent string
		if isBase64 {
			decoded, err := base64.StdEncoding.DecodeString(data)
			if err != nil {
				return IconSecurityResult{
					Allowed: false,
					Reason:  "invalid base64 encoding: " + err.Error(),
				}
			}
			svgContent = string(decoded)
		} else {
			// URL decode
			decoded, err := url.QueryUnescape(data)
			if err != nil {
				return IconSecurityResult{
					Allowed: false,
					Reason:  "invalid URL encoding: " + err.Error(),
				}
			}
			svgContent = decoded
		}

		// Sanitize the SVG
		sanitized, err := sanitizeSVG(svgContent)
		if err != nil {
			return IconSecurityResult{
				Allowed: false,
				Reason:  "SVG sanitization failed: " + err.Error(),
			}
		}

		// Re-encode as data URI
		encoded := base64.StdEncoding.EncodeToString([]byte(sanitized))
		return IconSecurityResult{
			Allowed:          true,
			SanitizedContent: sanitized,
			ValidatedURL:     "data:image/svg+xml;base64," + encoded,
		}
	}

	return IconSecurityResult{
		Allowed:      true,
		ValidatedURL: dataURI,
	}
}

// isAllowedScheme checks if a URL scheme is in the allowlist.
func (v *IconSecurityValidator) isAllowedScheme(scheme string) bool {
	for _, allowed := range v.policy.AllowedExternalSchemes {
		if strings.EqualFold(scheme, allowed) {
			return true
		}
	}
	return false
}

// isAllowedHost checks if a host is in the allowlist.
func (v *IconSecurityValidator) isAllowedHost(host string) bool {
	host = strings.ToLower(host)
	for _, allowed := range v.policy.AllowedExternalHosts {
		if strings.EqualFold(host, allowed) {
			return true
		}
		// Support wildcard subdomains
		if strings.HasPrefix(allowed, "*.") {
			suffix := strings.TrimPrefix(allowed, "*")
			if strings.HasSuffix(host, suffix) {
				return true
			}
		}
	}
	return false
}

// isAllowedMIME checks if a MIME type is in the allowlist.
func (v *IconSecurityValidator) isAllowedMIME(mime string) bool {
	mime = strings.ToLower(strings.TrimSpace(mime))
	for _, allowed := range v.policy.AllowedDataMIMEs {
		if strings.EqualFold(mime, allowed) {
			return true
		}
	}
	return false
}

// isValidIconName checks if an icon name contains only safe characters.
func isValidIconName(name string) bool {
	for _, r := range name {
		if !((r >= 'a' && r <= 'z') ||
			(r >= 'A' && r <= 'Z') ||
			(r >= '0' && r <= '9') ||
			r == '-' || r == '_') {
			return false
		}
	}
	return true
}

// Dangerous SVG elements and attributes that must be removed
var (
	// Elements that can execute scripts or load external resources
	dangerousSVGElements = regexp.MustCompile(`(?i)<\s*(script|foreignObject|set|animate|animateMotion|animateTransform|use|image|feImage)[^>]*>[\s\S]*?</\s*(script|foreignObject|set|animate|animateMotion|animateTransform|use|image|feImage)\s*>|<\s*(script|foreignObject|set|animate|animateMotion|animateTransform|use|image|feImage)[^>]*/?\s*>`)

	// Event handler attributes
	eventHandlerAttrs = regexp.MustCompile(`(?i)\s+on\w+\s*=\s*["'][^"']*["']|\s+on\w+\s*=\s*[^\s>]+`)

	// href/xlink:href with javascript:
	javascriptHref = regexp.MustCompile(`(?i)(href|xlink:href)\s*=\s*["']?\s*javascript:[^"'\s>]*["']?`)

	// External references (can load remote content)
	externalRefs = regexp.MustCompile(`(?i)(href|xlink:href|src)\s*=\s*["']?\s*(https?:|//)[^"'\s>]*["']?`)

	// XML external entities
	xmlEntities = regexp.MustCompile(`(?i)<!ENTITY\s+[^>]+>|<!DOCTYPE[^>]*\[[\s\S]*?\]>`)

	// Processing instructions
	processingInstructions = regexp.MustCompile(`<\?[\s\S]*?\?>`)
)

// sanitizeSVG removes dangerous elements and attributes from SVG content.
func sanitizeSVG(svg string) (string, error) {
	// Check for basic SVG structure
	if !strings.Contains(strings.ToLower(svg), "<svg") {
		return "", validationDomainError("content is not valid SVG", nil)
	}

	// Remove XML entities and processing instructions
	svg = xmlEntities.ReplaceAllString(svg, "")
	svg = processingInstructions.ReplaceAllString(svg, "")

	// Remove dangerous elements
	svg = dangerousSVGElements.ReplaceAllString(svg, "")

	// Remove event handlers
	svg = eventHandlerAttrs.ReplaceAllString(svg, "")

	// Remove javascript: hrefs
	svg = javascriptHref.ReplaceAllString(svg, "")

	// Remove external references
	svg = externalRefs.ReplaceAllString(svg, "")

	// Trim whitespace
	svg = strings.TrimSpace(svg)

	// Verify SVG structure is still intact
	if !strings.Contains(strings.ToLower(svg), "<svg") {
		return "", validationDomainError("SVG structure destroyed during sanitization", nil)
	}

	return svg, nil
}

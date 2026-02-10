package stores

import "strings"

// ObjectStorageSecurityPolicy enforces encryption requirements for e-sign artifacts.
type ObjectStorageSecurityPolicy struct {
	RequireEncryption bool
	AllowedAlgorithms map[string]struct{}
}

func DefaultObjectStorageSecurityPolicy() ObjectStorageSecurityPolicy {
	return ObjectStorageSecurityPolicy{
		RequireEncryption: true,
		AllowedAlgorithms: map[string]struct{}{
			"aes256":  {},
			"aws:kms": {},
			"kms":     {},
		},
	}
}

func (p ObjectStorageSecurityPolicy) ValidateObjectWrite(objectKey, encryptionAlgorithm string) error {
	objectKey = strings.TrimSpace(objectKey)
	if !isArtifactObjectKey(objectKey) {
		return invalidRecordError("object_storage", "object_key", "invalid e-sign object key path")
	}
	if !p.RequireEncryption {
		return nil
	}
	algo := strings.ToLower(strings.TrimSpace(encryptionAlgorithm))
	if algo == "" {
		return storageEncryptionRequiredError(objectKey)
	}
	if len(p.AllowedAlgorithms) == 0 {
		return nil
	}
	if _, ok := p.AllowedAlgorithms[algo]; !ok {
		return storageEncryptionRequiredError(objectKey)
	}
	return nil
}

func isArtifactObjectKey(objectKey string) bool {
	if objectKey == "" {
		return false
	}
	if !strings.HasPrefix(objectKey, "tenant/") {
		return false
	}
	if strings.Contains(objectKey, "/docs/") {
		return true
	}
	if strings.Contains(objectKey, "/agreements/") {
		return true
	}
	return false
}

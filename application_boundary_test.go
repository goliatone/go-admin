package goadmin

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"unicode/utf8"
)

const deniedApplicationTokenDigest = "008177bebac1e9dbf2a4a03944eedbf465b1d713dbd817fd1fdedb026cc7914e"

type boundaryToken struct {
	text       []byte
	start, end int
}

func TestRepositoryApplicationBoundary(t *testing.T) {
	wantDigest, err := hex.DecodeString(deniedApplicationTokenDigest)
	if err != nil {
		t.Fatalf("decode denied application token digest: %v", err)
	}

	err = filepath.WalkDir(".", func(path string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if entry.IsDir() {
			if path != "." && excludedBoundaryDirectory(entry.Name()) {
				return filepath.SkipDir
			}
			return nil
		}

		relPath := filepath.ToSlash(path)
		if containsDeniedBoundaryToken([]byte(relPath), wantDigest) {
			return fmt.Errorf("application-owned identifier found in path %q", relPath)
		}

		var content []byte
		if entry.Type()&os.ModeSymlink != 0 {
			target, readErr := os.Readlink(path)
			if readErr != nil {
				return fmt.Errorf("read link %q: %w", relPath, readErr)
			}
			content = []byte(target)
		} else {
			info, infoErr := entry.Info()
			if infoErr != nil {
				return fmt.Errorf("stat %q: %w", relPath, infoErr)
			}
			if !boundaryEntryScannable(info.Mode()) {
				return fmt.Errorf("unsupported worktree entry %q (%s)", relPath, info.Mode())
			}
			content, walkErr = os.ReadFile(path)
			if walkErr != nil {
				return fmt.Errorf("read %q: %w", relPath, walkErr)
			}
		}

		if containsDeniedBoundaryToken(content, wantDigest) {
			return fmt.Errorf("application-owned identifier found in %q", relPath)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestApplicationBoundaryTokenCanonicalization(t *testing.T) {
	wantDigest, err := hex.DecodeString(deniedApplicationTokenDigest)
	if err != nil {
		t.Fatal(err)
	}
	joinedBytes, err := hex.DecodeString("657369676e")
	if err != nil {
		t.Fatal(err)
	}
	joined := string(joinedBytes)
	parts := []string{joined[:1], joined[1:]}
	positives := []string{
		joined,
		strings.Join(parts, "-"),
		strings.Join(parts, "_"),
		strings.Join(parts, "."),
		parts[0] + strings.ToUpper(parts[1][:1]) + parts[1][1:],
		"admin." + joined,
		joined + ".widget",
	}
	for _, value := range positives {
		if !containsDeniedBoundaryToken([]byte(value), wantDigest) {
			t.Errorf("expected representative application identifier to be rejected: %q", value)
		}
	}

	negatives := []string{
		"re" + "design",
		"pre" + "sign",
		"signature",
		"signal",
	}
	for _, value := range negatives {
		if containsDeniedBoundaryToken([]byte(value), wantDigest) {
			t.Errorf("expected unrelated word to be accepted: %q", value)
		}
	}
}

func TestApplicationBoundaryScansGeneratedAndContextDirectories(t *testing.T) {
	for _, name := range []string{".cache", ".tmp", "coverage", "node_modules", "vendor"} {
		if excludedBoundaryDirectory(name) {
			t.Errorf("generated or dependency directory %q must remain inside the zero-trace scan", name)
		}
	}
	if !excludedBoundaryDirectory(".git") {
		t.Fatal("immutable VCS metadata must remain the only directory exclusion")
	}
}

func TestApplicationBoundaryRejectsUnscannableEntryModes(t *testing.T) {
	for _, mode := range []fs.FileMode{os.ModeNamedPipe, os.ModeSocket, os.ModeDevice, os.ModeCharDevice} {
		if boundaryEntryScannable(mode) {
			t.Errorf("special entry mode %s must fail the zero-trace scan", mode)
		}
	}
	if !boundaryEntryScannable(0) {
		t.Fatal("regular files must remain scannable")
	}
}

func excludedBoundaryDirectory(name string) bool {
	return name == ".git"
}

func boundaryEntryScannable(mode fs.FileMode) bool {
	return mode.IsRegular()
}

func containsDeniedBoundaryToken(data, wantDigest []byte) bool {
	tokens := boundaryTokens(data)
	for i, token := range tokens {
		if tokenHasDigest(token.text, wantDigest) {
			return true
		}
		if i+1 >= len(tokens) || !joinableBoundary(data[token.end:tokens[i+1].start]) {
			continue
		}
		joined := make([]byte, 0, len(token.text)+len(tokens[i+1].text))
		joined = append(joined, token.text...)
		joined = append(joined, tokens[i+1].text...)
		if tokenHasDigest(joined, wantDigest) {
			return true
		}
	}
	return false
}

func boundaryTokens(data []byte) []boundaryToken {
	tokens := make([]boundaryToken, 0, 64)
	for offset := 0; offset < len(data); {
		r, width := utf8.DecodeRune(data[offset:])
		if !isASCIILetterOrDigit(r) {
			offset += width
			continue
		}

		start := offset
		previous := r
		offset += width
		for offset < len(data) {
			current, currentWidth := utf8.DecodeRune(data[offset:])
			if !isASCIILetterOrDigit(current) {
				break
			}
			next, _ := utf8.DecodeRune(data[offset+currentWidth:])
			if camelBoundary(previous, current, next) {
				break
			}
			previous = current
			offset += currentWidth
		}
		tokens = append(tokens, boundaryToken{
			text:  asciiLower(data[start:offset]),
			start: start,
			end:   offset,
		})
	}
	return tokens
}

func camelBoundary(previous, current, next rune) bool {
	if isASCIILower(previous) && isASCIIUpper(current) {
		return true
	}
	return isASCIIUpper(previous) && isASCIIUpper(current) && isASCIILower(next)
}

func joinableBoundary(separator []byte) bool {
	if len(separator) == 0 {
		return true
	}
	if len(separator) != 1 {
		return false
	}
	switch separator[0] {
	case '-', '_', '.', '/':
		return true
	default:
		return false
	}
}

func tokenHasDigest(token, wantDigest []byte) bool {
	digest := sha256.Sum256(token)
	return string(digest[:]) == string(wantDigest)
}

func asciiLower(value []byte) []byte {
	result := make([]byte, len(value))
	for i, current := range value {
		if current >= 'A' && current <= 'Z' {
			current += 'a' - 'A'
		}
		result[i] = current
	}
	return result
}

func isASCIILetterOrDigit(value rune) bool {
	return isASCIILower(value) || isASCIIUpper(value) || value >= '0' && value <= '9'
}

func isASCIILower(value rune) bool { return value >= 'a' && value <= 'z' }
func isASCIIUpper(value rune) bool { return value >= 'A' && value <= 'Z' }

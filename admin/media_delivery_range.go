package admin

import (
	"errors"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

// MediaDeliveryRange describes a satisfiable single byte range.
type MediaDeliveryRange struct {
	Start int64
	End   int64
}

//nolint:gocyclo // Range parsing intentionally branches by byte-range shape.
func ParseMediaDeliveryRange(header string, size int64) (MediaDeliveryRange, bool, error) {
	header = strings.TrimSpace(header)
	if header == "" {
		return MediaDeliveryRange{}, false, nil
	}
	if size <= 0 {
		return MediaDeliveryRange{}, false, errors.New("range size must be positive")
	}
	if !strings.HasPrefix(strings.ToLower(header), "bytes=") {
		return MediaDeliveryRange{}, false, errors.New("unsupported range unit")
	}
	spec := strings.TrimSpace(header[len("bytes="):])
	if strings.Contains(spec, ",") {
		return MediaDeliveryRange{}, false, errors.New("multiple ranges are not supported")
	}
	parts := strings.SplitN(spec, "-", 2)
	if len(parts) != 2 {
		return MediaDeliveryRange{}, false, errors.New("invalid range")
	}
	startRaw := strings.TrimSpace(parts[0])
	endRaw := strings.TrimSpace(parts[1])
	if startRaw == "" && endRaw == "" {
		return MediaDeliveryRange{}, false, errors.New("invalid range")
	}
	if startRaw == "" {
		suffix, err := strconv.ParseInt(endRaw, 10, 64)
		if err != nil || suffix <= 0 {
			return MediaDeliveryRange{}, false, errors.New("invalid suffix range")
		}
		if suffix > size {
			suffix = size
		}
		return MediaDeliveryRange{Start: size - suffix, End: size - 1}, true, nil
	}
	start, err := strconv.ParseInt(startRaw, 10, 64)
	if err != nil || start < 0 {
		return MediaDeliveryRange{}, false, errors.New("invalid range start")
	}
	end := size - 1
	if endRaw != "" {
		end, err = strconv.ParseInt(endRaw, 10, 64)
		if err != nil || end < 0 {
			return MediaDeliveryRange{}, false, errors.New("invalid range end")
		}
	}
	if start >= size || start > end {
		return MediaDeliveryRange{}, false, errors.New("range not satisfiable")
	}
	if end >= size {
		end = size - 1
	}
	return MediaDeliveryRange{Start: start, End: end}, true, nil
}

func NewLocalMediaDeliveryImported(path string, roots []string, contentType string) (*MediaDeliveryImported, error) {
	rootPath, relPath, resolved, err := resolveLocalMediaDeliveryPath(path, roots)
	if err != nil {
		return nil, err
	}
	root, err := os.OpenRoot(rootPath)
	if err != nil {
		return nil, err
	}
	file, err := root.Open(relPath)
	closeRootErr := root.Close()
	if err != nil {
		return nil, err
	}
	if closeRootErr != nil {
		if closeErr := file.Close(); closeErr != nil {
			return nil, errors.Join(closeRootErr, closeErr)
		}
		return nil, closeRootErr
	}
	info, err := file.Stat()
	if err != nil {
		if closeErr := file.Close(); closeErr != nil {
			return nil, errors.Join(err, closeErr)
		}
		return nil, err
	}
	if info.IsDir() {
		err = errors.New("media delivery path is a directory")
		if closeErr := file.Close(); closeErr != nil {
			return nil, errors.Join(err, closeErr)
		}
		return nil, err
	}
	if strings.TrimSpace(contentType) == "" {
		contentType = mediaContentTypeFromFileName(resolved)
	}
	return &MediaDeliveryImported{
		Reader:        file,
		ContentType:   contentType,
		ContentLength: info.Size(),
		FileName:      filepath.Base(resolved),
		ModTime:       info.ModTime(),
	}, nil
}

func resolveLocalMediaDeliveryPath(path string, roots []string) (string, string, string, error) {
	path = strings.TrimSpace(path)
	if path == "" {
		return "", "", "", errors.New("media delivery path required")
	}
	if len(roots) == 0 {
		return "", "", "", errors.New("media delivery root required")
	}
	candidate, err := filepath.Abs(path)
	if err != nil {
		return "", "", "", err
	}
	candidate = filepath.Clean(candidate)
	for _, root := range roots {
		root = strings.TrimSpace(root)
		if root == "" {
			continue
		}
		absRoot, err := filepath.Abs(root)
		if err != nil {
			continue
		}
		absRoot = filepath.Clean(absRoot)
		rel, err := filepath.Rel(absRoot, candidate)
		if err != nil {
			continue
		}
		if rel == "." || (!strings.HasPrefix(rel, ".."+string(filepath.Separator)) && rel != ".." && !filepath.IsAbs(rel)) {
			return absRoot, rel, filepath.Join(absRoot, rel), nil
		}
	}
	return "", "", "", errors.New("media delivery path is outside configured roots")
}

func mediaContentTypeFromFileName(name string) string {
	ext := strings.ToLower(strings.TrimSpace(filepath.Ext(name)))
	switch ext {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	case ".svg":
		return "image/svg+xml"
	case ".mp4":
		return "video/mp4"
	case ".mp3":
		return "audio/mpeg"
	case ".pdf":
		return "application/pdf"
	default:
		return "application/octet-stream"
	}
}

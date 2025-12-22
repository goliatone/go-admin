package quickstart

import (
	"io/fs"
	"time"
)

// MultiFS tries each filesystem in order until one succeeds.
type MultiFS []fs.FS

// Open implements fs.FS to provide fallback resolution.
func (m MultiFS) Open(name string) (fs.File, error) {
	var lastErr error
	for _, f := range m {
		if f == nil {
			continue
		}
		file, err := f.Open(name)
		if err == nil {
			return file, nil
		}
		lastErr = err
	}
	if lastErr == nil {
		lastErr = fs.ErrNotExist
	}
	return nil, lastErr
}

type multiFSDirInfo struct{ name string }

func (d multiFSDirInfo) Name() string       { return d.name }
func (d multiFSDirInfo) Size() int64        { return 0 }
func (d multiFSDirInfo) Mode() fs.FileMode  { return fs.ModeDir | 0o555 }
func (d multiFSDirInfo) ModTime() time.Time { return time.Time{} }
func (d multiFSDirInfo) IsDir() bool        { return true }
func (d multiFSDirInfo) Sys() any           { return nil }

// Stat implements fs.StatFS so callers can validate roots without requiring Open(".") to exist.
func (m MultiFS) Stat(name string) (fs.FileInfo, error) {
	if name == "" || name == "." {
		return multiFSDirInfo{name: "."}, nil
	}

	var lastErr error
	for _, f := range m {
		if f == nil {
			continue
		}
		if statter, ok := f.(fs.StatFS); ok {
			info, err := statter.Stat(name)
			if err == nil {
				return info, nil
			}
			lastErr = err
			continue
		}

		file, err := f.Open(name)
		if err != nil {
			lastErr = err
			continue
		}
		info, statErr := file.Stat()
		_ = file.Close()
		if statErr == nil {
			return info, nil
		}
		lastErr = statErr
	}

	if lastErr == nil {
		lastErr = fs.ErrNotExist
	}
	return nil, lastErr
}

// WithFallbackFS builds a MultiFS preferring the primary FS first.
func WithFallbackFS(primary fs.FS, fallbacks ...fs.FS) fs.FS {
	fsList := []fs.FS{}
	fsList = append(fsList, extractFS(primary)...)
	for _, f := range fallbacks {
		fsList = append(fsList, extractFS(f)...)
	}
	if len(fsList) == 0 {
		return nil
	}
	return MultiFS(fsList)
}

func extractFS(f fs.FS) []fs.FS {
	if f == nil {
		return nil
	}
	if m, ok := f.(MultiFS); ok {
		return []fs.FS(m)
	}
	return []fs.FS{f}
}

func fallbackFSList(fsList []fs.FS) fs.FS {
	if len(fsList) == 0 {
		return nil
	}
	return WithFallbackFS(fsList[0], fsList[1:]...)
}

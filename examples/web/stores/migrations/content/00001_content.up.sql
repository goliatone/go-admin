-- 00001_content.up.sql
-- Creates pages, posts, and media tables for the examples/web content persistence (SQLite)

CREATE TABLE IF NOT EXISTS pages (
    id TEXT NOT NULL PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    parent_id TEXT,
    meta_title TEXT,
    meta_description TEXT,
    content TEXT,
    preview_url TEXT,
    published_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS pages_slug_idx ON pages(slug);
CREATE INDEX IF NOT EXISTS pages_status_idx ON pages(status);
CREATE INDEX IF NOT EXISTS pages_title_idx ON pages(title);

---bun:split

CREATE TABLE IF NOT EXISTS posts (
    id TEXT NOT NULL PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    author TEXT,
    excerpt TEXT,
    content TEXT,
    category TEXT,
    featured_image TEXT,
    tags JSONB DEFAULT '[]',
    published_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS posts_slug_idx ON posts(slug);
CREATE INDEX IF NOT EXISTS posts_status_idx ON posts(status);
CREATE INDEX IF NOT EXISTS posts_category_idx ON posts(category);

---bun:split

CREATE TABLE IF NOT EXISTS media (
    id TEXT NOT NULL PRIMARY KEY,
    filename TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT,
    mime_type TEXT,
    size BIGINT DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    uploaded_by TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS media_filename_idx ON media(filename);
CREATE INDEX IF NOT EXISTS media_type_idx ON media(type);

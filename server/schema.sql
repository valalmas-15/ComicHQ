-- 1. Tabel Library (Koleksi Manga)
CREATE TABLE IF NOT EXISTS manga_library (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    source_id TEXT UNIQUE NOT NULL, -- URL/ID unik dari situs sumber
    provider TEXT NOT NULL,         -- Nama ekstensi (e.g., 'komikcast')
    thumbnail_url TEXT,
    last_chapter_count INT DEFAULT 0,
    has_update BOOLEAN DEFAULT FALSE,
    added_at TIMESTAMP DEFAULT NOW()
);

-- 2. Tabel Riwayat & Progress (Sync)
CREATE TABLE IF NOT EXISTS reading_history (
    id SERIAL PRIMARY KEY,
    manga_id INT REFERENCES manga_library(id) ON DELETE CASCADE,
    chapter_id TEXT NOT NULL,       -- URL/ID chapter terakhir
    chapter_title TEXT,
    last_page INT DEFAULT 1,        -- Posisi halaman terakhir
    is_completed BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_manga_progress UNIQUE(manga_id)
);

CREATE INDEX IF NOT EXISTS idx_manga_source ON manga_library(source_id);

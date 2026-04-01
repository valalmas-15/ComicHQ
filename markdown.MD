Tentu, ini adalah versi **Master Markdown** yang menggabungkan seluruh blueprint teknis, struktur database, arsitektur folder, hingga logika kode ke dalam satu kesatuan. 

Silakan salin seluruh teks di bawah ini untuk di-input ke **Antigravity** kamu:

---

# 🌀 Project: Tachiyomi-Web (Unified Master Blueprint)
> **Goal:** Membangun aplikasi pembaca manga berbasis web (PWA) yang identik dengan Tachiyomi, menggunakan PostgreSQL untuk sinkronisasi, dan dioptimasi agar sangat ringan saat dijalankan di laptop Acer.

---

## 🏗️ 1. Arsitektur Utama (Low-Resource Design)
Untuk menjaga RAM laptop tetap lega, sistem dibagi menjadi dua bagian:
* **Frontend (Client):** Menggunakan **SolidJS** atau **Preact** (High performance, low memory footprint).
* **Backend (Server):** Node.js + Express untuk menangani *scraping* (Cheerio) dan *Image Proxy*.
* **Database:** PostgreSQL untuk menyimpan Library, History, dan Progress Baca.

---

## 🗄️ 2. Skema Database (PostgreSQL)
Jalankan query SQL ini di server kamu untuk membangun struktur data:

```sql
-- 1. Tabel Library (Koleksi Manga)
CREATE TABLE manga_library (
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
CREATE TABLE reading_history (
    id SERIAL PRIMARY KEY,
    manga_id INT REFERENCES manga_library(id) ON DELETE CASCADE,
    chapter_id TEXT NOT NULL,       -- URL/ID chapter terakhir
    chapter_title TEXT,
    last_page INT DEFAULT 1,        -- Posisi halaman terakhir
    is_completed BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_manga_progress UNIQUE(manga_id)
);

CREATE INDEX idx_manga_source ON manga_library(source_id);
```

---

## 📂 3. Struktur Folder Project
```text
/tachiyomi-web
├── 📁 client (Frontend - Vite + SolidJS)
│   ├── 📁 src/components (Reader.tsx, SearchBar.tsx, LibraryGrid.tsx)
│   ├── 📁 src/hooks (useInfiniteScroll.ts, useProgressSync.ts)
│   └── 📄 .env (VITE_API_URL=http://your-server-ip:3000)
├── 📁 server (Backend - Node.js)
│   ├── 📁 src/providers (Sistem Ekstensi "Inspect & Copas")
│   │   ├── 📄 baseProvider.js
│   │   ├── 📄 komikcast.js (Hasil Copas Selector)
│   │   └── 📄 index.js (Registry gabungan)
│   ├── 📁 src/routes (search.js, library.js, history.js, proxy.js)
│   ├── 📁 src/workers (scanUpdates.js - Script Auto-Scan)
│   └── 📄 index.js (Entry Point)
└── 📄 docker-compose.yml
```

---

## 🛠️ 4. Logika Core & Ekstensi (Backend)

### A. Base Provider (`baseProvider.js`)
```javascript
class BaseProvider {
  constructor(name, baseUrl) {
    this.name = name;
    this.baseUrl = baseUrl;
  }
  // Template yang wajib di-override di file ekstensi
  async search(query) { throw new Error("Search not implemented"); }
  async getChapters(mangaId) { throw new Error("Chapters not implemented"); }
  async getPages(chapterId) { throw new Error("Pages not implemented"); }
}
module.exports = BaseProvider;
```

### B. Contoh Implementasi "Inspect & Copas" (`komikcast.js`)
```javascript
const axios = require('axios');
const cheerio = require('cheerio');
const BaseProvider = require('./baseProvider');

class Komikcast extends BaseProvider {
  constructor() { super("Komikcast", "https://komikcast.bz"); }

  async search(query) {
    const { data } = await axios.get(`${this.baseUrl}/?s=${query}`);
    const $ = cheerio.load(data);
    return $('.list-update_item').map((i, el) => ({ // Selector Kotak Manga
      title: $(el).find('h3').text().trim(),        // Selector Judul
      source_id: $(el).find('a').attr('href'),      // Link Detail
      thumbnail: $(el).find('img').attr('src'),     // Link Gambar
      provider: this.name
    })).get();
  }

  async getPages(chapterUrl) {
    const { data } = await axios.get(chapterUrl);
    const $ = cheerio.load(data);
    return $('.main-reading-area img').map((i, el) => { // Selector Gambar Konten
      return $(el).attr('data-src') || $(el).attr('src');
    }).get();
  }
}
module.exports = new Komikcast();
```

---

## 🚀 5. Checklist Fitur Utama (Agile Tasks)

### 🔴 Tahap 1: Core Engine (High Priority)
- [ ] **Global Search:** Menjalankan pencarian paralel ke semua provider.
- [ ] **Image Proxy:** Route `/api/proxy?url=...` untuk menembus anti-hotlink situs sumber.
- [ ] **Sync Progress:** Menyimpan `last_page` ke PostgreSQL setiap kali user berhenti scroll (Debounced).

### 🟠 Tahap 2: Reader & UX (Optimasi Acer)
- [ ] **Infinite Scroll:** Otomatis memuat chapter berikutnya di bawah halaman terakhir.
- [ ] **Virtual Scrolling:** Menghapus elemen gambar yang sudah jauh dari layar agar RAM tidak penuh.
- [ ] **Resume Reading:** Tombol "Continue" yang mengambil data terakhir dari `reading_history`.

### 🟡 Tahap 3: Automation & Update
- [ ] **Auto-Scan Worker:** Script Cron Job yang mengecek jumlah chapter terbaru setiap 6 jam.
- [ ] **Update Notification:** Menampilkan badge pada komik yang memiliki `has_update = true`.
- [ ] **PWA Mode:** Menambahkan Manifest agar web bisa di-install di Windows/Android.

---

## ⚡ Catatan Khusus Performa (Laptop Acer)
1.  **Lazy Loading:** Jangan pernah memuat gambar lebih dari 3 halaman di depan posisi scroll saat ini.
2.  **WebP Compression:** Gunakan library `sharp` di server untuk memperkecil ukuran file gambar sebelum dikirim ke laptop.
3.  **App Shell:** Load struktur navigasi secara instan, biarkan data komik menyusul lewat API.

---
**Status:** *Project Definition Complete* 🚀
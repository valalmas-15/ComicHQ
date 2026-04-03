require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const sharp = require("sharp");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const dns = require("dns");

// 🌐 Bypass Indonesian ISP Blocks (Telkomsel/Indihome) by using Cloudflare DNS
dns.setServers(["1.1.1.1", "1.0.0.1", "8.8.8.8"]);

const { providers } = require("./src/providers");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, "comics.db");

// SQLite connection setup
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("⚠️ SQLite connection failed", err.message);
  } else {
    console.log("✅ SQLite database connected at:", DB_PATH);
    // ⚡ Performance Optimization for Minimal Servers
    db.serialize(() => {
      db.run("PRAGMA journal_mode = WAL");
      db.run("PRAGMA synchronous = OFF");
      db.run("PRAGMA cache_size = -2000"); // 2MB cache
    });
    // initSchema() is usually called here (if you have the function defined locally or imported)
  }
});

const authRoutes = require("./src/routes/auth");
const historyRouter = require("./src/routes/history");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || process.env.SECRET_KEY || "comichq_lite_key";

// Middleware Authenticate
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token)
    return res.status(401).json({ error: "Access denied, token missing" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = user;
    next();
  });
}

// 🕒 Background update worker with initial delay to avoid startup lag
const { scanUpdates } = require("./src/workers/scanUpdates");
setTimeout(() => {
  scanUpdates().catch(err => console.error(err));
  setInterval(scanUpdates, 60 * 60 * 1000); // Check every 1 hour
}, 5 * 60 * 1000); // Initial delay of 5 minutes

app.use(cors({
  origin: true, 
  credentials: true
}));
app.use(express.json());

// --- ROUTES ---
app.use("/api/auth", authRoutes(db));
app.use("/api/history", authenticateToken, historyRouter(db));

// 🔄 Manual Scan Route
app.post("/api/scan-updates", (req, res) => {
  // Run scan asynchronously without blocking response
  scanUpdates().catch((err) => console.error(err));
  res.json({
    success: true,
    message: "Pembaruan bab terbaru sedang berjalan di latar belakang...",
  });
});

// 📊 Source Status
app.get("/api/sources-status", (req, res) => {
  db.all("SELECT * FROM provider_status", (err, statusRows) => {
    if (err)
      return res.status(500).json({ error: "Failed to fetch source status" });

    // Combine with all known active providers
    const activeProvidersList = Object.keys(providers).map((name) => {
      const dbRow = statusRows.find((r) => r.provider === name) || {
        is_broken: 0,
        last_error: null,
        updated_at: null,
      };
      return {
        name,
        url: providers[name].baseUrl,
        is_broken: dbRow.is_broken,
        last_error: dbRow.last_error,
        updated_at: dbRow.updated_at,
      };
    });

    res.json(activeProvidersList);
  });
});

app.post("/api/sources-ping", async (req, res) => {
  try {
    const activeProviders = Object.values(providers);
    const settleResults = await Promise.allSettled(
      activeProviders.map((p) => p.search("test")), // using "test" as a generic ping query
    );

    settleResults.forEach((r, idx) => {
      const providerName = activeProviders[idx].name;
      if (r.status === "fulfilled") {
        db.run(
          "INSERT INTO provider_status (provider, is_broken, last_error, updated_at) VALUES (?, 0, NULL, CURRENT_TIMESTAMP) ON CONFLICT(provider) DO UPDATE SET is_broken = 0, last_error = NULL, updated_at = CURRENT_TIMESTAMP",
          [providerName],
        );
      } else {
        const errStr = r.reason
          ? r.reason.message || String(r.reason)
          : "Ping failed";
        db.run(
          "INSERT INTO provider_status (provider, is_broken, last_error, updated_at) VALUES (?, 1, ?, CURRENT_TIMESTAMP) ON CONFLICT(provider) DO UPDATE SET is_broken = 1, last_error = excluded.last_error, updated_at = CURRENT_TIMESTAMP",
          [providerName, errStr],
        );
      }
    });

    res.json({ success: true, message: "Ping All command executed." });
  } catch (error) {
    res.status(500).json({ error: "Ping failed completely" });
  }
});

// 🔍 Available Providers List
app.get("/api/providers", (req, res) => {
  res.json(Object.keys(providers));
});

// 🔍 Search Route
app.get("/api/search", async (req, res) => {
  const { q, selected_providers } = req.query;
  if (!q) return res.status(400).json({ error: "Query is required" });

  let activeProviders = Object.values(providers);
  if (selected_providers) {
    const list = selected_providers.split(",");
    activeProviders = Object.values(providers).filter((p) =>
      list.includes(p.name),
    );
  }

  try {
    const settleResults = await Promise.allSettled(
      activeProviders.map((p) => p.search(q)),
    );

    const flattenedResults = [];
    settleResults.forEach((r, idx) => {
      const providerName = activeProviders[idx].name;
      if (r.status === "fulfilled") {
        flattenedResults.push(...r.value);
        db.run(
          "INSERT INTO provider_status (provider, is_broken, last_error, updated_at) VALUES (?, 0, NULL, CURRENT_TIMESTAMP) ON CONFLICT(provider) DO UPDATE SET is_broken = 0, last_error = NULL, updated_at = CURRENT_TIMESTAMP",
          [providerName],
        );
      } else {
        const errStr = r.reason
          ? r.reason.message || String(r.reason)
          : "Search timeout or failed";
        console.error(`Search error for ${providerName}:`, errStr);
        db.run(
          "INSERT INTO provider_status (provider, is_broken, last_error, updated_at) VALUES (?, 1, ?, CURRENT_TIMESTAMP) ON CONFLICT(provider) DO UPDATE SET is_broken = 1, last_error = excluded.last_error, updated_at = CURRENT_TIMESTAMP",
          [providerName, errStr],
        );
      }
    });

    res.json(flattenedResults);
  } catch (error) {
    console.error("Search Error:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

// 📚 Manga Chapters Route
app.get("/api/chapters", async (req, res) => {
  const { url, provider } = req.query;
  if (!url || !provider)
    return res.status(400).json({ error: "URL and provider required" });

  const p = providers[provider];
  if (!p) return res.status(404).json({ error: "Provider not found" });

  try {
    const chapters = await p.getChapters(url);
    // Update total count if in library to keep unread badges accurate
    db.run(
      "UPDATE manga_library SET last_chapter_count = ?, has_update = 0 WHERE source_id = ?",
      [chapters.length, url],
    );

    res.json(chapters);
  } catch (error) {
    console.error("Chapters Error:", error.message);
    res.status(500).json({ error: "Failed to get chapters" });
  }
});

// 🖼️ Image Proxy
app.get("/api/proxy", async (req, res) => {
  const { url } = req.query;
  if (!url || url === "undefined")
    return res.status(400).send("Valid URL required");

  try {
    let origin = new URL(url).origin;
    let referer = origin;

    if (
      url.includes("mangabat") ||
      url.includes("manganelo") ||
      url.includes("manganato") ||
      url.includes("nhato") ||
      url.includes("2xstorage") ||
      url.includes("mncdn")
    ) {
      referer = "https://www.mangabats.com/";
    } else if (url.includes("ikiru") || url.includes("itachi")) {
      referer = "https://02.ikiru.wtf/";
    } else if (url.includes("komiku")) {
      referer = "https://komiku.org/";
    } else if (url.includes("westmanga")) {
      referer = "https://westmanga.tv/";
    }

    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 10000,
      headers: {
        Referer: referer,
        "User-Agent": "Mozilla/5.0",
        Cookie: process.env.GLOBAL_COOKIE || "",
      },
    });

    try {
      const optimizedImage = await sharp(response.data).webp({ quality: 75 }).toBuffer();
      res.set("Content-Type", "image/webp");
      res.send(optimizedImage);
    } catch (e) {
      res.set("Content-Type", response.headers["content-type"] || "image/jpeg");
      res.send(response.data);
    }
  } catch (error) {
    res.status(500).send("Proxy failed");
  }
});

// 📖 Chapter Pages Route
app.get("/api/pages", async (req, res) => {
  const { url, provider } = req.query;
  if (!url || !provider)
    return res.status(400).json({ error: "URL and provider required" });

  const p = providers[provider];
  if (!p) return res.status(404).json({ error: "Provider not found" });

  try {
    const pages = await p.getPages(url);
    res.json(pages);
  } catch (error) {
    res.status(500).json({ error: "Failed to get pages" });
  }
});

// 📚 Library Routes
app.get("/api/library", authenticateToken, (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  const query = `
    SELECT ml.*, 
      (COALESCE(ml.last_chapter_count, 0) - (SELECT COUNT(*) FROM read_chapters WHERE manga_id = ml.id AND user_id = ?)) as unread_count
    FROM user_library ul 
    JOIN manga_library ml ON ul.manga_id = ml.id
    WHERE ul.user_id = ?
    ORDER BY ul.added_at DESC
  `;
  db.all(query, [req.user.id, req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch library" });
    res.json(rows);
  });
});

app.post("/api/library", authenticateToken, (req, res) => {
  const { title, source_id, provider, thumbnail_url, type } = req.body;
  const userId = req.user.id;

  const query = `
    INSERT INTO manga_library (title, source_id, provider, thumbnail_url, type) 
    VALUES (?, ?, ?, ?, ?) 
    ON CONFLICT (source_id) DO UPDATE SET 
      title = excluded.title,
      type = excluded.type,
      thumbnail_url = excluded.thumbnail_url
  `;

  db.run(query, [title, source_id, provider, thumbnail_url, type || "manga"], function (err) {
    if (err) return res.status(500).json({ error: err.message });

    db.get("SELECT id FROM manga_library WHERE source_id = ?", [source_id], (err, row) => {
      if (err || !row) return res.status(500).json({ error: "Failed to confirm" });

      const libQuery = `INSERT OR IGNORE INTO user_library (user_id, manga_id) VALUES (?, ?)`;
      db.run(libQuery, [userId, row.id], (err) => {
        if (err) return res.status(500).json({ error: "Failed to link" });
        res.json({ success: true, manga_id: row.id });
      });
    });
  });
});

app.delete("/api/library/:id", authenticateToken, (req, res) => {
  db.run("DELETE FROM user_library WHERE user_id = ? AND manga_id = ?", [req.user.id, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: "Failed to remove" });
    res.json({ success: true });
  });
});

app.get("/api/read-chapters/:manga_id", authenticateToken, (req, res) => {
  db.all("SELECT chapter_id FROM read_chapters WHERE user_id = ? AND manga_id = ?", [req.user.id, req.params.manga_id], (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch" });
    res.json(rows.map(r => r.chapter_id));
  });
});

app.post("/api/track/read", authenticateToken, (req, res) => {
  const { manga_id, chapter_id } = req.body;
  db.run("INSERT OR IGNORE INTO read_chapters (user_id, manga_id, chapter_id) VALUES (?, ?, ?)", [req.user.id, manga_id, chapter_id], (err) => {
    if (err) return res.status(500).json({ error: "Failed" });
    res.json({ success: true });
  });
});

app.post("/api/track/unread", authenticateToken, (req, res) => {
  const { manga_id, chapter_id } = req.body;
  db.run("DELETE FROM read_chapters WHERE user_id = ? AND manga_id = ? AND chapter_id = ?", [req.user.id, manga_id, chapter_id], (err) => {
    if (err) return res.status(500).json({ error: "Failed" });
    res.json({ success: true });
  });
});

app.get("/api/updates", authenticateToken, (req, res) => {
  const query = `
    SELECT ml.*, 
      (COALESCE(ml.last_chapter_count, 0) - (SELECT COUNT(*) FROM read_chapters WHERE manga_id = ml.id AND user_id = ?)) as unread_count
    FROM user_library ul 
    JOIN manga_library ml ON ul.manga_id = ml.id 
    WHERE ul.user_id = ? AND (ml.last_chapter_count > (SELECT COUNT(*) FROM read_chapters WHERE manga_id = ml.id AND user_id = ?))
    ORDER BY COALESCE(ml.updated_at, ml.added_at) DESC
  `;
  db.all(query, [req.user.id, req.user.id, req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch updates" });
    res.json(rows);
  });
});

// --- SPA FALLBACK ---
app.use(express.static(path.join(__dirname, "dist")));
app.get("*", (req, res) => {
  // Use "*" for standard catch-all in modern Express
  const indexPath = path.join(__dirname, "dist", "index.html");
  if (require("fs").existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    if (req.path.startsWith("/api/")) {
       return res.status(404).json({ error: "API route not found" });
    }
    res.status(404).send("Frontend build not found. Please run 'npm run build' in client folder.");
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("❌ Global Error:", err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server is listening at http://0.0.0.0:${PORT}`);
  console.log(`📂 DB Path: ${DB_PATH}`);
});

module.exports = { db };
function initSchema() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    db.run(`CREATE TABLE IF NOT EXISTS manga_library (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, source_id TEXT UNIQUE NOT NULL, provider TEXT NOT NULL, thumbnail_url TEXT, last_chapter_count INTEGER DEFAULT 0, has_update BOOLEAN DEFAULT 0, added_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, type TEXT DEFAULT 'manga')`);
    db.run(`CREATE TABLE IF NOT EXISTS user_library (user_id INTEGER NOT NULL, manga_id INTEGER NOT NULL, added_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, manga_id), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (manga_id) REFERENCES manga_library(id) ON DELETE CASCADE)`);
    db.run(`CREATE TABLE IF NOT EXISTS reading_history (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, manga_id INTEGER NOT NULL, chapter_id TEXT NOT NULL, chapter_title TEXT, last_page INTEGER DEFAULT 1, is_completed BOOLEAN DEFAULT 0, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, manga_id), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (manga_id) REFERENCES manga_library(id) ON DELETE CASCADE)`);
    db.run(`CREATE TABLE IF NOT EXISTS read_chapters (user_id INTEGER NOT NULL, manga_id INTEGER NOT NULL, chapter_id TEXT NOT NULL, UNIQUE(user_id, manga_id, chapter_id), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (manga_id) REFERENCES manga_library(id) ON DELETE CASCADE)`);
    db.run(`CREATE TABLE IF NOT EXISTS provider_status (provider TEXT PRIMARY KEY, is_broken BOOLEAN DEFAULT 0, last_error TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_manga_source ON manga_library(source_id)`);
    console.log("✅ SQLite schema verified.");
  });
}
initSchema();
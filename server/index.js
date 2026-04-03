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
    initSchema();
  }
});

const authRoutes = require("./src/routes/auth");
const historyRouter = require("./src/routes/history");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "comichq_lite_key";

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

// ... initSchema remains same ...

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
app.use("/api/history", authenticateToken, historyRouter);

// 📊 Source Status
app.get("/api/sources-status", (req, res) => {
  db.all("SELECT * FROM provider_status", (err, statusRows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch source status" });
    const activeProvidersList = Object.keys(providers).map((name) => {
      const dbRow = statusRows.find((r) => r.provider === name) || { is_broken: 0, last_error: null, updated_at: null };
      return { name, url: providers[name].baseUrl, is_broken: dbRow.is_broken, last_error: dbRow.last_error, updated_at: dbRow.updated_at };
    });
    res.json(activeProvidersList);
  });
});

// ... search, chapters, proxy, pages routes remain same ...

// 🖼️ Image Proxy
app.get("/api/proxy", async (req, res) => {
  const { url } = req.query;
  if (!url || url === "undefined") return res.status(400).send("Valid URL required");
  try {
    let origin = new URL(url).origin;
    let referer = origin;
    if (url.includes("mangabat") || url.includes("manganelo") || url.includes("manganato") || url.includes("nhato") || url.includes("2xstorage") || url.includes("mncdn")) {
      referer = "https://www.mangabats.com/";
    } else if (url.includes("ikiru") || url.includes("itachi")) {
      referer = "https://02.ikiru.wtf/";
    } else if (url.includes("komiku")) {
      referer = "https://komiku.org/";
    } else if (url.includes("westmanga")) {
      referer = "https://westmanga.tv/";
    }
    const response = await axios.get(url, { responseType: "arraybuffer", timeout: 10000, headers: { Referer: referer, "User-Agent": "Mozilla/5.0", Cookie: process.env.GLOBAL_COOKIE || "" } });
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
  if (!url || !provider) return res.status(400).json({ error: "URL and provider required" });
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
  const indexPath = path.join(__dirname, "dist", "index.html");
  if (require("fs").existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // If we're an API request and 404, don't try to send HTML
    if (req.path.startsWith("/api/")) {
       return res.status(404).json({ error: "API route not found" });
    }
    res.status(404).send("Frontend build not found. Please run 'npm run build' in client folder.");
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});

module.exports = { db };
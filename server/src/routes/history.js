 const express = require("express");
const path = require("path");

module.exports = (db) => {
  const router = express.Router();

  // 1. Get overall history (user-specific) - Matches GET /api/history
  router.get("/", async (req, res) => {
    console.log(`📖 [History API] Fetching overall history for user: ${req.user.id}`);
    const query = `
      SELECT h.*, m.title, m.thumbnail_url, m.provider, m.source_id, m.type
      FROM reading_history h 
      JOIN manga_library m ON h.manga_id = m.id 
      WHERE h.user_id = ?
      ORDER BY h.updated_at DESC
      LIMIT 100
    `;
    db.all(query, [req.user.id], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  });

  // 2. Get most recently read chapter (user-specific) - Matches GET /api/history/last/:mangaId
  router.get("/last/:mangaId", (req, res) => {
    console.log(`📡 [History API] Fetching last read for manga ID: ${req.params.mangaId} (User: ${req.user.id})`);
    const query = "SELECT chapter_id, chapter_title, last_page FROM reading_history WHERE user_id = ? AND manga_id = ? ORDER BY updated_at DESC LIMIT 1";
    db.get(query, [req.user.id, req.params.mangaId], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row || null);
    });
  });

  // 3. Compatibility route for read status check - Matches GET /api/history/check/:mangaId/:chapterId
  router.get("/check/:mangaId/:chapterId", (req, res) => {
    const query = "SELECT 1 FROM read_chapters WHERE user_id = ? AND manga_id = ? AND chapter_id = ? LIMIT 1";
    db.get(query, [req.user.id, req.params.mangaId, req.params.chapterId], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ is_read: !!row });
    });
  });

  // 4. Get all read chapters for a manga - Matches GET /api/history/:mangaId
  router.get("/:mangaId", (req, res) => {
    const query = "SELECT chapter_id FROM read_chapters WHERE user_id = ? AND manga_id = ?";
    db.all(query, [req.user.id, req.params.mangaId], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows.map(r => r.chapter_id));
    });
  });

  // 5. Save/Update history - Matches POST /api/history
  router.post("/", (req, res) => {
    const { manga_id, chapter_id, chapter_title, last_page, manga_title, thumbnail_url, provider, source_id, type } = req.body;
    const userId = req.user.id;

    const saveHistory = (mId) => {
      // Mark as read first
      db.run("INSERT OR IGNORE INTO read_chapters (user_id, manga_id, chapter_id) VALUES (?, ?, ?)", [userId, mId, chapter_id]);
      
      // Update general history table
      const query = `
        INSERT INTO reading_history (user_id, manga_id, chapter_id, chapter_title, last_page) 
        VALUES (?, ?, ?, ?, ?) 
        ON CONFLICT (user_id, manga_id) DO UPDATE SET 
          chapter_id = EXCLUDED.chapter_id, 
          chapter_title = EXCLUDED.chapter_title, 
          last_page = EXCLUDED.last_page, 
          updated_at = CURRENT_TIMESTAMP
      `;
      db.run(query, [userId, mId, chapter_id, chapter_title, last_page], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, manga_id: mId });
      });
    };

    if (!manga_id && source_id) {
      db.run("INSERT INTO manga_library (title, source_id, provider, thumbnail_url, type) VALUES (?, ?, ?, ?, ?) ON CONFLICT (source_id) DO UPDATE SET added_at = added_at", 
         [manga_title || "Unknown", source_id, provider || "Unknown", thumbnail_url || "", type || "manga"], function(err) {
        db.get("SELECT id FROM manga_library WHERE source_id = ?", [source_id], (err, row) => {
          if (row) saveHistory(row.id);
          else res.status(500).json({ error: "DB Error" });
        });
      });
    } else if (manga_id) {
      saveHistory(manga_id);
    }
  });

  return router;
};

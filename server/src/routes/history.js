const express = require("express");
const router = express.Router();
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");

async function openDb() {
  return open({
    filename: path.join(__dirname, "../../database.sqlite"),
    driver: sqlite3.Database,
  });
}

// 1. Get overall history (user-specific) - Matches GET /api/history
router.get("/", async (req, res) => {
  console.log(`📖 [History API] Fetching overall history for user: ${req.user.id}`);
  try {
    const db = await openDb();
    const history = await db.all(`
      SELECT h.*, m.title, m.thumbnail_url, m.provider, m.source_id 
      FROM history h 
      JOIN manga m ON h.manga_id = m.id 
      WHERE h.user_id = ?
      ORDER BY h.updated_at DESC
    `, [req.user.id]);
    res.json(history);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 2. Get most recently read chapter (user-specific) - Matches GET /api/history/last/35
router.get("/last/:mangaId", async (req, res) => {
  console.log(`📡 [History API] Fetching last read for manga ID: ${req.params.mangaId} (User: ${req.user.id})`);
  try {
    const db = await openDb();
    const lastRead = await db.get(
      "SELECT chapter_id, chapter_title, last_page FROM history WHERE user_id = ? AND manga_id = ? ORDER BY updated_at DESC LIMIT 1",
      [req.user.id, req.params.mangaId]
    );
    res.json(lastRead || null);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 3. Get all read chapters for a manga (user-specific) - Matches GET /api/history/35
router.get("/:mangaId", async (req, res) => {
  try {
    const db = await openDb();
    const history = await db.all(
      "SELECT chapter_id, last_page FROM history WHERE user_id = ? AND manga_id = ?",
      [req.user.id, req.params.mangaId]
    );
    res.json(history.map(h => h.chapter_id)); // Return array of IDs for compatibility
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Compatibility route for checking single chapter
router.get("/check/:mangaId/:chapterId", async (req, res) => {
  try {
    const db = await openDb();
    const history = await db.get(
      "SELECT * FROM history WHERE user_id = ? AND manga_id = ? AND chapter_id = ?",
      [req.user.id, req.params.mangaId, req.params.chapterId]
    );
    res.json({ isRead: !!history, last_page: history ? history.last_page : 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 4. Update/Insert history (user-specific) - Matches POST /api/history
router.post("/", async (req, res) => {
  const { manga_id, chapter_id, chapter_title, last_page, total_pages } = req.body;
  const user_id = req.user.id;
  try {
    const db = await openDb();
    await db.run(
      `INSERT OR REPLACE INTO history (user_id, manga_id, chapter_id, chapter_title, last_page, total_pages, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [user_id, manga_id, chapter_id, chapter_title, last_page, total_pages]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Bulk update (user-specific) - Matches POST /api/history/bulk
router.post("/bulk", async (req, res) => {
  const { manga_id, chapter_ids, action } = req.body;
  const user_id = req.user.id;
  try {
    const db = await openDb();
    if (action === "read") {
      for (const cid of chapter_ids) {
        await db.run(
          `INSERT OR IGNORE INTO history (user_id, manga_id, chapter_id, chapter_title, last_page, updated_at) 
           VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [user_id, manga_id, cid, "Manual Mark", 1]
        );
      }
    } else {
      const placeholders = chapter_ids.map(() => "?").join(",");
      await db.run(
        `DELETE FROM history WHERE user_id = ? AND manga_id = ? AND chapter_id IN (${placeholders})`,
        [user_id, manga_id, ...chapter_ids]
      );
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Clear history (user-specific) - Matches DELETE /api/history/:mangaId
router.delete("/:mangaId", async (req, res) => {
  try {
    const db = await openDb();
    await db.run("DELETE FROM history WHERE user_id = ? AND manga_id = ?", [req.user.id, req.params.mangaId]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

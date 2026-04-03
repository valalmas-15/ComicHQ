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

// Get most recently read chapter/page for a manga
router.get("/last/:mangaId", async (req, res) => {
  try {
    const db = await openDb();
    const lastRead = await db.get(
      "SELECT chapter_id, chapter_title, last_page FROM history WHERE manga_id = ? ORDER BY updated_at DESC LIMIT 1",
      [req.params.mangaId]
    );
    res.json(lastRead || null);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get read chapters for a manga
router.get("/:mangaId", async (req, res) => {
  try {
    const db = await openDb();
    const history = await db.all(
      "SELECT chapter_id, last_page FROM history WHERE manga_id = ?",
      [req.params.mangaId]
    );
    res.json(history);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update/Insert history
router.post("/", async (req, res) => {
  const { manga_id, chapter_id, chapter_title, last_page, total_pages } = req.body;
  try {
    const db = await openDb();
    await db.run(
      `INSERT OR REPLACE INTO history (manga_id, chapter_id, chapter_title, last_page, total_pages, updated_at) 
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [manga_id, chapter_id, chapter_title, last_page, total_pages]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk update history
router.post("/bulk", async (req, res) => {
  const { manga_id, chapter_ids, action } = req.body;
  try {
    const db = await openDb();
    if (action === "read") {
      for (const cid of chapter_ids) {
        await db.run(
          `INSERT OR IGNORE INTO history (manga_id, chapter_id, chapter_title, last_page, updated_at) 
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [manga_id, cid, "Manual Mark", 1]
        );
      }
    } else {
      const placeholders = chapter_ids.map(() => "?").join(",");
      await db.run(
        `DELETE FROM history WHERE manga_id = ? AND chapter_id IN (${placeholders})`,
        [manga_id, ...chapter_ids]
      );
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear history for a manga
router.delete("/:mangaId", async (req, res) => {
  try {
    const db = await openDb();
    await db.run("DELETE FROM history WHERE manga_id = ?", [req.params.mangaId]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get overall history
router.get("/", async (req, res) => {
  try {
    const db = await openDb();
    const history = await db.all(`
      SELECT h.*, m.title, m.thumbnail_url, m.provider, m.source_id 
      FROM history h 
      JOIN manga m ON h.manga_id = m.id 
      ORDER BY h.updated_at DESC
    `);
    res.json(history);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

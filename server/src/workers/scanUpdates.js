const { providers } = require('../providers');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config({ path: '../../.env' });

const DB_PATH = path.join(__dirname, '../../comics.db');
const db = new sqlite3.Database(DB_PATH);

async function scanUpdates() {
  console.log("🔄 Starting update scan (SQLite)...");
  
  db.all('SELECT * FROM manga_library', async (err, library) => {
    if (err) return console.error("Worker DB Error:", err);
    if (!library || library.length === 0) {
      console.log("✅ Scan complete: Library is empty.");
      return;
    }

    for (const manga of library) {
      const p = providers[manga.provider];
      if (!p) continue;

      try {
        const chapters = await p.getChapters(manga.source_id);
        const latestCount = chapters.length;

        if (latestCount > (manga.last_chapter_count || 0)) {
          console.log(`✨ New chapters for ${manga.title}!`);
          db.run(
            'UPDATE manga_library SET last_chapter_count = ?, has_update = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [latestCount, manga.id]
          );
        }
      } catch (err) {
        console.error(`Error checking ${manga.title}:`, err.message);
      }
    }
    console.log("✅ Scan complete.");
  });
}

// Export the function without auto-running anything
module.exports = { scanUpdates };

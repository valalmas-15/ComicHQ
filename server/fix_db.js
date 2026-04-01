const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'comics.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) return console.error('DB error:', err.message);
    
    db.all("SELECT id, chapter_id, chapter_title FROM reading_history WHERE chapter_title = 'Chapter '", (err, rows) => {
        if (err) return console.error(err);
        
        let count = 0;
        rows.forEach(row => {
            const urlParts = row.chapter_id.split('/').filter(Boolean);
            let slug = urlParts[urlParts.length - 1]; // e.g. 'chapter-69.829485'
            
            // Try to extract chapter number and decimals
            const match = slug.match(/chapter[_-]?(\d+(\.\d+)?)/i);
            const num = match ? match[1] : slug;
            const newTitle = `Chapter ${num}`;
            
            db.run("UPDATE reading_history SET chapter_title = ? WHERE id = ?", [newTitle, row.id], (err) => {
                if (!err) {
                    console.log(`Updated ID ${row.id} to ${newTitle}`);
                }
            });
        });
    });
});

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'comics.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) return console.error('DB error:', err.message);
    console.log('Connected to DB:', dbPath);
    
    db.all('SELECT * FROM manga_library', (err, rows) => {
        console.log('Manga Library:', rows);
    });
    
    db.all('SELECT * FROM reading_history', (err, rows) => {
        console.log('Reading History:', rows);
    });
});

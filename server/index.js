const express = require("express");
const path = require("path");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
// ... import authRoutes kamu ...

const app = express();
const db = new sqlite3.Database("./database.db");

app.use(cors());
app.use(express.json());

// --- BAGIAN PENTING: SERVE FRONTEND ---
// 1. Arahkan Express ke folder 'dist' hasil build SolidJS
app.use(express.static(path.join(__dirname, "dist")));

// 2. Route API Kamu
app.use("/api/auth", authRoutes(db));

// 3. FALLBACK: Agar SPA (SolidJS Router) tidak 404 saat direfresh
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(3000, () => console.log("Server & Frontend jalan di port 3000"));
const express = require("express");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "comichq_lite_key";

module.exports = (db) => {
  const router = express.Router();

  // --- HELPER DATABASE ---
  const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
    });
  };

  const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  };

  // 📝 REGISTER
  router.post("/register", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Data tidak lengkap" });
    if (password.length < 6) return res.status(400).json({ error: "Password minimal 6 karakter" });

    try {
      const exists = await dbGet("SELECT id FROM users WHERE username = ?", [username]);
      if (exists) return res.status(400).json({ error: "Username sudah digunakan" });

      const result = await dbRun("INSERT INTO users (username, password_hash) VALUES (?, ?)", [username, password]);

      const token = jwt.sign({ id: result.lastID, username }, JWT_SECRET, { expiresIn: "30d" });
      res.json({ success: true, token, user: { id: result.lastID, username } });
    } catch (e) {
      console.error("Register Error:", e);
      res.status(500).json({ error: "Registrasi gagal, coba lagi nanti" });
    }
  });

  // 🔑 LOGIN
  router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    
    try {
      const user = await dbGet("SELECT * FROM users WHERE username = ?", [username]);
      if (!user) return res.status(401).json({ error: "User tidak ditemukan" });

      if (user.password_hash !== password) return res.status(401).json({ error: "Password salah" });

      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "30d" });
      res.json({ success: true, token, user: { id: user.id, username: user.username } });
    } catch (e) {
      console.error("Login Error:", e);
      res.status(500).json({ error: "Login bermasalah, silakan coba lagi" });
    }
  });

  // 👤 ME (Verify)
  router.get("/me", (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Token missing" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ error: "Sesi berakhir, silakan login ulang" });
      res.json({ success: true, user });
    });
  });

  // 🔧 UPDATE PROFILE
  router.put("/update", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Token missing" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const { username, password, currentPassword } = req.body;
      
      const user = await dbGet("SELECT * FROM users WHERE id = ?", [decoded.id]);
      if (!user) return res.status(404).json({ error: "User not found" });

      if (password || username) {
        if (!currentPassword) return res.status(400).json({ error: "Konfirmasi password saat ini diperlukan" });
        if (user.password_hash !== currentPassword) return res.status(401).json({ error: "Password saat ini salah" });
      }

      let updates = [], params = [];

      if (username && username !== user.username) { 
        const exists = await dbGet("SELECT id FROM users WHERE username = ? AND id != ?", [username, decoded.id]);
        if (exists) return res.status(400).json({ error: "Username sudah digunakan" });
        updates.push("username = ?"); params.push(username); 
      }
      
      if (password) {
        if (password.length < 6) return res.status(400).json({ error: "Password baru minimal 6 karakter" });
        updates.push("password_hash = ?"); params.push(password);
      }

      if (updates.length === 0) return res.status(400).json({ error: "Tidak ada perubahan" });

      params.push(decoded.id);
      await dbRun(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);

      const finalUsername = username || decoded.username;
      const newToken = jwt.sign({ id: decoded.id, username: finalUsername }, JWT_SECRET, { expiresIn: "30d" });
      res.json({ success: true, token: newToken, user: { id: decoded.id, username: finalUsername } });
    } catch (e) {
      console.error("Update Profile Error:", e);
      res.status(403).json({ error: "Gagal memperbarui profil" });
    }
  });

  return router;
};
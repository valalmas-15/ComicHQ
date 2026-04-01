/** @jsxImportSource solid-js */
import { createSignal, onMount, Show } from "solid-js";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../utils/api";

export default function Profile() {
  const { user, login, logout } = useAuth();
  const [username, setUsername] = createSignal("");
  const [currentPassword, setCurrentPassword] = createSignal("");
  const [newPassword, setNewPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");
  const [message, setMessage] = createSignal("");
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);

  // Load current username from session
  onMount(() => {
    if (user()) {
      setUsername(user().username);
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (newPassword() && newPassword() !== confirmPassword()) {
      setError("Konfirmasi password baru tidak cocok");
      return;
    }

    setLoading(true);
    try {
      const payload = { 
        username: username(),
        currentPassword: currentPassword()
      };
      if (newPassword()) payload.password = newPassword();

      const res = await apiFetch("/api/auth/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user);
        setMessage("Profil berhasil diperbarui!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setError(data.error || "Gagal memperbarui profil");
      }
    } catch (e) {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="profile-page page-container">
      <div class="profile-container">
        <div class="profile-card">
          <div class="profile-header">
            <div class="profile-avatar">
              {username().charAt(0).toUpperCase()}
            </div>
            <h2>Pengaturan Profil</h2>
            <p>Kelola informasi akun Anda</p>
          </div>

          <Show when={error()}>
            <div class="auth-error-box">{error()}</div>
          </Show>
          <Show when={message()}>
            <div class="auth-success-box">{message()}</div>
          </Show>

          <form onSubmit={handleSubmit} class="profile-form">
            <div class="auth-form-group">
              <label>Username</label>
              <input 
                type="text" 
                value={username()} 
                onInput={e => setUsername(e.target.value)} 
                required 
                class="profile-input"
              />
            </div>

            <div class="auth-form-group">
              <label>Password Saat Ini (untuk verifikasi)</label>
              <input 
                type="password" 
                placeholder="Wajib diisi untuk simpan"
                value={currentPassword()} 
                onInput={e => setCurrentPassword(e.target.value)} 
                required 
                class="profile-input"
              />
            </div>

            <div class="profile-divider">
              <span>Ganti Password (Opsional)</span>
            </div>

            <div class="auth-form-group">
              <label>Password Baru</label>
              <input 
                type="password" 
                placeholder="Kosongkan jika tidak ganti"
                value={newPassword()} 
                onInput={e => setNewPassword(e.target.value)} 
                class="profile-input"
              />
            </div>

            <div class="auth-form-group">
              <label>Konfirmasi Password Baru</label>
              <input 
                type="password" 
                placeholder="Ulangi password baru"
                value={confirmPassword()} 
                onInput={e => setConfirmPassword(e.target.value)} 
                class="profile-input"
              />
            </div>

            <div class="profile-actions">
              <button 
                type="submit" 
                disabled={loading()} 
                class="auth-submit-btn"
              >
                {loading() ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
              
              <button 
                type="button" 
                onClick={() => { logout(); window.location.href = "/login"; }} 
                class="logout-btn"
              >
                Keluar Akun
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


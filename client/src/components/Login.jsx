import { createSignal, createMemo, Show } from "solid-js";
import { useNavigate, useLocation, A } from "@solidjs/router";
import { useAuth } from "../contexts/AuthContext";

import { API_BASE } from "../utils/api";
export default function Login() {
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");
  const [showPassword, setShowPassword] = createSignal(false);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isLogin = createMemo(() => location.pathname === "/login");

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isLogin() && password() !== confirmPassword()) {
      setError("Password tidak cocok");
      return;
    }

    setLoading(true);
    try {
      const type = isLogin() ? "login" : "register";
      const res = await fetch(`${API_BASE}/api/auth/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username(), password: password() }),
      });

      const data = await res.json();
      if (!res.ok) throw data;

      login(data.token, data.user);
      navigate("/library", { replace: true });
    } catch (err) {
      setError(err.error || "Terjadi kesalahan sistem");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="auth-page">
      <div class="auth-container">
        <form onSubmit={submit} class="auth-card">
          <div class="auth-header">
            <h1 class="auth-title">
              {isLogin() ? "Selamat Datang" : "Mulai Petualangan"}
            </h1>
            <p class="auth-subtitle">
              {isLogin()
                ? "Masuk untuk melanjutkan membaca"
                : "Buat akun ComicHQ Anda"}
            </p>
          </div>

          <Show when={error()}>
            <div class="auth-error-box">
              <span class="error-icon">⚠️</span>
              {error()}
            </div>
          </Show>

          <div class="auth-form-group">
            <label>Username</label>
            <div class="input-wrapper">
              <input
                type="text"
                placeholder="Masukkan username"
                value={username()}
                onInput={(e) => setUsername(e.target.value)}
                required
              />
              <span class="input-icon">👤</span>
            </div>
          </div>

          <div class="auth-form-group">
            <label>Password</label>
            <div class="input-wrapper">
              <input
                type={showPassword() ? "text" : "password"}
                placeholder="Masukkan password"
                value={password()}
                onInput={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                class="password-toggle"
                onClick={() => setShowPassword(!showPassword())}
              >
                {showPassword() ? "👁️" : "🙈"}
              </button>
            </div>
          </div>

          <Show when={!isLogin()}>
            <div class="auth-form-group animate-slide-down">
              <label>Konfirmasi Password</label>
              <div class="input-wrapper">
                <input
                  type={showPassword() ? "text" : "password"}
                  placeholder="Ulangi password"
                  value={confirmPassword()}
                  onInput={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <span class="input-icon">🔒</span>
              </div>
            </div>
          </Show>

          <button disabled={loading()} class="auth-submit-btn">
            <Show
              when={loading()}
              fallback={isLogin() ? "Masuk Sekarang" : "Daftar Akun"}
            >
              <div class="btn-spinner"></div>
            </Show>
          </button>

          <div class="auth-footer">
            <p>
              {isLogin() ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
              <A href={isLogin() ? "/register" : "/login"} class="auth-link">
                {isLogin() ? "Daftar di sini" : "Login sekarang"}
              </A>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

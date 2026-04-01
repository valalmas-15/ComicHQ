export const API_BASE = ""; // KOSONGKAN agar pakai Proxy Vite

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    ...options.headers,
    "Content-Type": "application/json",
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;

  return await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
}
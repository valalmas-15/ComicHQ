export const API_BASE = "http://localhost:3000";

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    ...options.headers,
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
  }

  return response;
}

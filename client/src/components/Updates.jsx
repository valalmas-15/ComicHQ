/** @jsxImportSource solid-js */
import { createSignal, onMount, For, Show, onCleanup } from "solid-js";
import { A } from "@solidjs/router";
import { apiFetch, API_BASE } from "../utils/api";
import { formatRelativeTime } from "../utils/helpers";

function Updates() {
  const [updates, setUpdates] = createSignal([]);
  const [loading, setLoading] = createSignal(true);

  const fetchUpdates = async () => {
    try {
      const response = await apiFetch(`/api/updates`);
      const data = await response.json();
      setUpdates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    fetchUpdates();
    window.addEventListener("refresh-requested", fetchUpdates);
  });

  onCleanup(() => {
    window.removeEventListener("refresh-requested", fetchUpdates);
  });

  const getProxyUrl = (url) =>
    `${API_BASE}/api/proxy?url=${encodeURIComponent(url)}`;

  return (
    <div class="page-container pb-80">
      <header class="text-center mb-8">
        <h1>🔔 Baru Diperbarui</h1>
        <button
          onClick={async () => {
            try {
              alert(
                "Memulai pemindaian manual. Silakan muat ulang halaman ini dalam beberapa detik untuk melihat pembaruan.",
              );
              await apiFetch(`/api/scan-updates`, { method: "POST" });
            } catch (err) {
              console.error(err);
              alert("Gagal memulai pemindaian.");
            }
          }}
          class="btn-secondary mt-4 px-4 py-2 rounded-lg inline-flex items-center gap-2"
        >
          <span>🔄</span> Perbarui Manual
        </button>
      </header>

      <Show when={loading()}>
        <div style="text-align: center;">Mengecek versi terbaru...</div>
      </Show>

      <Show when={!loading() && updates().length === 0}>
        <div style="text-align: center; color: var(--text-muted); margin-top: 4rem;">
          <p style="font-size: 3rem;">✨</p>
          <p>Semua komik di library sudah up-to-date.</p>
        </div>
      </Show>

      <div class="manga-grid">
        <For each={updates()}>
          {(manga) => (
            <div class="manga-card update-card">
              <A
                href={`/manga/${manga.provider}/${encodeURIComponent(manga.source_id)}`}
                class="card-link"
              >
                <div class="manga-poster-wrapper">
                  <span class="unread-badge">{manga.unread_count} New</span>
                  <span class="provider-badge">{manga.provider}</span>
                  <Show when={manga.type === "manhwa"}>
                    <div class="origin-flag-badge">🇰🇷</div>
                  </Show>
                  <Show when={manga.type === "manhua"}>
                    <div class="origin-flag-badge">🇨🇳</div>
                  </Show>
                  <Show when={manga.type === "manga"}>
                    <div class="origin-flag-badge">🇯🇵</div>
                  </Show>
                  <img
                    src={getProxyUrl(manga.thumbnail_url)}
                    alt={manga.title}
                    class="manga-thumbnail"
                    loading="lazy"
                    onerror={(e) => { e.target.src = "https://dummyimage.com/180x270?text=No+Image"; }}
                  />
                </div>
                <div class="card-info">
                  <h3>{manga.title}</h3>
                  <Show when={manga.updated_at}>
                    <div class="update-time-small">{formatRelativeTime(manga.updated_at)}</div>
                  </Show>
                </div>
              </A>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}

export default Updates;

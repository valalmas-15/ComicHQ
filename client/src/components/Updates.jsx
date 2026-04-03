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

      <div class="updates-list">
        <For each={updates()}>
          {(manga) => (
            <div class="history-card update-card-item">
              <A
                href={manga.latest_chapter_id 
                  ? `/read/${manga.provider}/${encodeURIComponent(manga.latest_chapter_id)}?source=${encodeURIComponent(manga.source_id)}&title=${encodeURIComponent(manga.latest_chapter_title)}&type=${manga.type}`
                  : `/manga/${manga.provider}/${encodeURIComponent(manga.source_id)}`
                }
                class="history-main-link"
                style={{ "display": "flex", "width": "100%", "text-decoration": "none", "color": "inherit" }}
              >
                <div class="history-poster">
                  <img
                    src={getProxyUrl(manga.thumbnail_url)}
                    alt={manga.title}
                    class="manga-thumbnail"
                    loading="lazy"
                    onerror={(e) => { e.target.src = "https://dummyimage.com/180x270?text=No+Image"; }}
                  />
                  <span class="provider-tag">{manga.provider}</span>
                  {/* 🆕 Badge NEW di Poster */}
                  <div class="poster-new-badge">NEW</div>
                  
                  <Show when={manga.type === "manhwa"}>
                    <div class="origin-flag-badge">🇰🇷</div>
                  </Show>
                  <Show when={manga.type === "manhua"}>
                    <div class="origin-flag-badge">🇨🇳</div>
                  </Show>
                   <Show when={manga.type === "manga"}>
                    <div class="origin-flag-badge">🇯🇵</div>
                  </Show>
                </div>
                
                <div class="history-details">
                  <div class="history-header">
                    <h3 class="update-manga-title">{manga.title}</h3>
                  </div>
                  
                  <div class="latest-chapter-info-row" style={{ "margin-top": "6px" }}>
                    <p class="latest-chapter-name" style={{ "color": "var(--primary)", "font-weight": "900", "font-size": "1.1rem", "margin": "0" }}>
                      {manga.latest_chapter_title || `Chapter Baru`}
                    </p>
                  </div>
                  
                  <div class="history-meta" style={{ "margin-top": "auto" }}>
                     <span class="time-ago">
                       <i class="far fa-clock mr-1" style={{ "font-size": "0.8rem" }}></i>
                       {manga.latest_chapter_date || formatRelativeTime(manga.updated_at)}
                     </span>
                  </div>
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

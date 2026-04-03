/** @jsxImportSource solid-js */
import { createSignal, onMount, For, Show, onCleanup } from "solid-js";
import { A } from "@solidjs/router";
import { apiFetch, API_BASE } from "../utils/api";

const libraryCache = {
  data: null,
  timestamp: 0
};

function Library() {
  const [library, setLibrary] = createSignal(libraryCache.data || []);
  const [loading, setLoading] = createSignal(!libraryCache.data);
  const [error, setError] = createSignal(null);

  const fetchLibrary = async () => {
    // If we have cached data, we already set it in initial signal state
    // so we just fetch in background to stay fresh.
    try {
      const response = await apiFetch(`/api/library?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Pragma": "no-cache" }
      });
      
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      
      const data = await response.json();
      const freshData = Array.isArray(data) ? data : [];
      
      setLibrary(freshData);
      libraryCache.data = freshData;
      libraryCache.timestamp = Date.now();
    } catch (err) {
      console.error("Library fetch failed:", err);
      if (library().length === 0) {
        const local = JSON.parse(localStorage.getItem("manga_library") || "[]");
        if (local.length > 0) setLibrary(local);
      }
    } finally {
      setLoading(false);
    }
  };
  onMount(() => {
    fetchLibrary();
    window.addEventListener("refresh-requested", fetchLibrary);
  });

  onCleanup(() => {
    window.removeEventListener("refresh-requested", fetchLibrary);
  });

  const removeFromLibrary = async (id, source_id) => {
    if (!confirm("Hapus dari library?")) return;
    try {
      if (id) {
        await apiFetch(`/api/library/${id}`, { method: "DELETE" });
      } else {
        // Fallback for local storage items without an ID
        const currentLib = JSON.parse(
          localStorage.getItem("manga_library") || "[]",
        );
        const filtered = currentLib.filter((m) => m.source_id !== source_id);
        localStorage.setItem("manga_library", JSON.stringify(filtered));
      }
      fetchLibrary();
    } catch (err) {
      console.error(err);
    }
  };

  const getProxyUrl = (url) =>
    `${API_BASE}/api/proxy?url=${encodeURIComponent(url)}`;

  return (
    <div class="page-container pb-80">
      <header class="text-center mb-8">
        <h1>📚 ComicHQ Library (SQLite)</h1>
        <button
          onClick={async () => {
            try {
              alert(
                "Memulai pemindaian manual. Silakan muat ulang halaman ini dalam beberapa detik.",
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

      <Show when={error()}>
        <div class="error-banner mb-4">
          <p>⚠️ {error()}</p>
          <button onClick={fetchLibrary} class="text-sm underline mt-1">Coba lagi</button>
        </div>
      </Show>

      <Show when={loading()}>
        <div style="text-align: center;" class="animate-pulse">Membuka koleksi...</div>
      </Show>

      <Show when={!loading() && library().length === 0}>
        <div style="text-align: center; color: var(--text-muted); margin-top: 4rem;">
          <p style="font-size: 3rem;">🏜️</p>
          <p>Library ComicHQ masih kosong.</p>
          <p>
            Cari komik di menu <b>Explore</b> untuk menambahkannya.
          </p>
        </div>
      </Show>

      <div class="manga-grid">
        <For each={library()}>
          {(manga) => (
            <div class="manga-card">
              <A
                href={`/manga/${manga.provider}/${encodeURIComponent(manga.source_id)}`}
                class="card-link"
              >
                <div class="manga-poster-wrapper">
                  <Show when={manga.unread_count > 0}>
                    <span class="unread-badge">{manga.unread_count}</span>
                  </Show>
                  <Show
                    when={manga.has_update === 1 || manga.has_update === true}
                  >
                    <span class="update-badge">NEW</span>
                  </Show>
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
                    onerror={(e) => {
                      e.target.src =
                        "https://dummyimage.com/180x270?text=No+Image";
                    }}
                  />
                </div>
                <div class="card-info">
                  <h3>{manga.title}</h3>
                </div>
              </A>
              <div class="card-actions px-2 pb-2">
                <button
                  class="add-lib-btn"
                  style="background-color: #475569; width: 100%;"
                  onClick={(e) => {
                    e.preventDefault();
                    removeFromLibrary(manga.id, manga.source_id);
                  }}
                >
                  Batal Favorit
                </button>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}

export default Library;

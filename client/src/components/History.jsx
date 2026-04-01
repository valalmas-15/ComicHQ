/** @jsxImportSource solid-js */
import { createSignal, onMount, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { apiFetch, API_BASE } from "../utils/api";
import { formatRelativeTime } from "../utils/helpers";

function History() {
  const [history, setHistory] = createSignal([]);
  const [loading, setLoading] = createSignal(true);

  const fetchHistory = async () => {
    try {
      const response = await apiFetch(`/api/history`);
      const data = await response.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      const data = JSON.parse(localStorage.getItem("manga_history") || "[]");
      setHistory(data);
    } finally {
      setLoading(false);
    }
  };

  onMount(fetchHistory);

  const getProxyUrl = (url) =>
    `${API_BASE}/api/proxy?url=${encodeURIComponent(url)}`;

  return (
    <div class="page-container pb-80">
      <header class="text-center mb-8">
        <h1>🕒 Riwayat Baca (SQLite)</h1>
      </header>

      <Show when={loading()}>
        <div class="text-center">Membuka riwayat...</div>
      </Show>

      <Show when={!loading() && history().length === 0}>
        <div style="text-align: center; color: var(--text-muted); margin-top: 4rem;">
          <p style="font-size: 3rem;">📖</p>
          <p>Belum ada riwayat baca.</p>
        </div>
      </Show>

      <div class="history-list">
        <For each={history()}>
          {(item) => (
            <div class="history-card">
              <div class="history-poster">
                <img
                  src={getProxyUrl(item.thumbnail_url)}
                  alt={item.title}
                  class="manga-thumbnail"
                  onerror={(e) => { e.target.src = "https://dummyimage.com/180x270?text=No+Image"; }}
                />
                <Show when={item.type === "manhwa"}>
                  <div class="origin-flag-badge">🇰🇷</div>
                </Show>
                <Show when={item.type === "manhua"}>
                  <div class="origin-flag-badge">🇨🇳</div>
                </Show>
                 <Show when={item.type === "manga"}>
                  <div class="origin-flag-badge">🇯🇵</div>
                </Show>
              </div>
              
              <div class="history-details">
                <div class="history-header">
                  <h3>{item.title}</h3>
                  <span class="provider-tag">{item.provider}</span>
                </div>
                
                <p class="history-chapter">{item.chapter_title}</p>
                
                <div class="history-meta">
                  <div class="progress-indicator">
                    <i class="fas fa-bookmark mr-2"></i>
                    <span>Trakhir di Hal. {item.last_page}</span>
                  </div>
                  <span class="time-ago">{formatRelativeTime(item.updated_at)}</span>
                </div>
                
                <div class="history-action">
                  <A
                    href={`/read/${item.provider}/${encodeURIComponent(item.chapter_id)}?source=${encodeURIComponent(item.source_id)}&title=${encodeURIComponent(item.chapter_title)}&type=${item.type}`}
                    class="continue-reading-btn"
                  >
                    <i class="fas fa-play mr-2"></i> Lanjut Baca
                  </A>
                </div>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}

export default History;

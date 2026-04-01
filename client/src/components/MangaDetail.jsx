/** @jsxImportSource solid-js */
import { createSignal, onMount, For, Show, createEffect } from "solid-js";
import { useParams, A } from "@solidjs/router";
import { apiFetch, API_BASE } from "../utils/api";

function MangaDetail() {
  const params = useParams();
  const [chapters, setChapters] = createSignal([]);
  const [loading, setLoading] = createSignal(true);
  const [readChapterIds, setReadChapterIds] = createSignal([]);
  const [selected, setSelected] = createSignal([]);
  const [isSelecting, setIsSelecting] = createSignal(false);

  const [mangaId, setMangaId] = createSignal(null);
  const [manga, setManga] = createSignal(null);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const url = decodeURIComponent(params.url);
      const provider = params.provider;

      // 1. Get manga info/id from library
      const libRes = await apiFetch(`/api/library`);
      const library = await libRes.json();
      const mangaData = library.find((m) => m.source_id === url);
      setManga(mangaData);

      if (mangaData) {
        setMangaId(mangaData.id);
        // 2. Get read chapters for this manga
        const readRes = await apiFetch(`/api/read-chapters/${mangaData.id}`);
        const readData = await readRes.json();
        setReadChapterIds(Array.isArray(readData) ? readData : []);
      }

      // 3. Get all chapters from provider
      const response = await fetch(
        `${API_BASE}/api/chapters?url=${encodeURIComponent(url)}&provider=${provider}`,
      );
      const data = await response.json();
      setChapters(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  onMount(fetchDetails);

  const toggleSelection = (id) => {
    if (selected().includes(id)) {
      setSelected(selected().filter((i) => i !== id));
    } else {
      setSelected([...selected(), id]);
    }
  };

  const handleBulkAction = async (action) => {
    if (!mangaId())
      return alert(
        "Manga ini belum ada di Library. Tambahkan dulu ke favorit.",
      );

    try {
      const response = await apiFetch(`/api/history/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manga_id: mangaId(),
          chapter_ids: selected(),
          action: action,
        }),
      });

      if (response.ok) {
        // Refresh read list
        const readRes = await apiFetch(`/api/read-chapters/${mangaId()}`);
        const readData = await readRes.json();
        setReadChapterIds(readData);

        setSelected([]);
        setIsSelecting(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isRead = (id) => readChapterIds().includes(id);

  const toggleAll = () => {
    if (selected().length === chapters().length) {
      setSelected([]);
    } else {
      setSelected(chapters().map((c) => c.id));
    }
  };

  return (
    <div class="page-container" style="padding-bottom: 120px;">
      <A href="/" class="back-btn" style="margin-bottom: 1rem; display: inline-block;">
        ← Back
      </A>
      <Show when={manga()}>
        <div style="display: flex; gap: 1rem; margin-bottom: 2rem;">
          <img src={`${API_BASE}/api/proxy?url=${encodeURIComponent(manga().thumbnail_url)}`} alt={manga().title} style="width: 120px; height: 180px; object-fit: cover; border-radius: 8px;" />
          <div style="display: flex; flex-direction: column; justify-content: flex-end;">
            <h1 style="margin-bottom: 0.5rem;">{manga().title}</h1>
            <p style="color: var(--text-muted); text-transform: capitalize;">{params.provider}</p>
          </div>
        </div>
      </Show>

      <header style="margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center;">
        <h2 style="margin: 0;">Chapters</h2>
        <button
          onClick={() => {
            setIsSelecting(!isSelecting());
            setSelected([]);
          }}
          class="select-btn"
          style={`background: ${isSelecting() ? "var(--primary)" : "rgba(255,255,255,0.1)"}`}
        >
          {isSelecting() ? "Batal" : "Pilih"}
        </button>
      </header>

      <Show when={loading()}>
        <div class="loading-spinner text-center">Mencari chapter...</div>
      </Show>

      <div class="chapter-list">
        <Show when={isSelecting() && chapters().length > 0 && mangaId()}>
          <div
            class="chapter-item select-all-item"
            onClick={toggleAll}
            style="border-bottom: 1px solid #334155; margin-bottom: 0.5rem; background: rgba(255,255,255,0.05);"
          >
            <div class="chapter-content">
              <span
                class="chapter-title"
                style="font-weight: 700; color: var(--primary);"
              >
                PILIH SEMUA
              </span>
              <span class="chapter-date">
                {chapters().length} Chapter total
              </span>{" "}
              {/* End chapter-content */}
            </div>
            <div
              class={`selection-indicator ${selected().length === chapters().length ? "checked" : ""}`}
            />
          </div>
        </Show>

        <For each={chapters()}>
          {(chapter) => (
            <div
              class={`chapter-item ${isRead(chapter.id) ? "read" : ""} ${selected().includes(chapter.id) ? "selected" : ""}`}
              onClick={() =>
                isSelecting() ? toggleSelection(chapter.id) : null
              }
              style={isSelecting() ? "cursor: pointer;" : ""}
            >
              <Show when={!isSelecting()}>
                <A
                  href={`/read/${params.provider}/${encodeURIComponent(chapter.id)}?source=${encodeURIComponent(params.url)}&title=${encodeURIComponent(chapter.title)}`}
                  class="chapter-link-overlay"
                />
              </Show>
              <div class="chapter-content">
                <span class="chapter-title">{chapter.title}</span>
                <span class="chapter-date">{chapter.updated_at}</span>
              </div>{" "}
              {/* End chapter-content */}
              <div style="display: flex; align-items: center; gap: 1rem;">
                <Show when={isRead(chapter.id)}>
                  <span class="read-status">✓ Dibaca</span>
                </Show>
                <Show when={isSelecting()}>
                  <div
                    class={`selection-indicator ${selected().includes(chapter.id) ? "checked" : ""}`}
                  />
                </Show>
              </div>
            </div>
          )}
        </For>
      </div>

      <Show when={isSelecting() && selected().length > 0}>
        <div class="bulk-actions-bar">
          <span style="font-weight: 600;">{selected().length} Terpilih</span>
          <div style="display: flex; gap: 0.75rem;">
            <button
              onClick={() => handleBulkAction("read")}
              class="action-btn read-btn"
            >
              Tandai Dibaca
            </button>
            <button
              onClick={() => handleBulkAction("unread")}
              class="action-btn unread-btn"
            >
              Tandai Belum Dibaca
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
}

export default MangaDetail;

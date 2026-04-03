/** @jsxImportSource solid-js */
/** @jsxImportSource solid-js */
import { createSignal, onMount, For, Show, createEffect } from "solid-js";
import { useParams, A } from "@solidjs/router";
import { apiFetch, API_BASE } from "../utils/api";

const mangaCache = new Map();

function MangaDetail() {
  const params = useParams();
  const [chapters, setChapters] = createSignal([]);
  const [loading, setLoading] = createSignal(true);
  const [readChapterIds, setReadChapterIds] = createSignal([]);
  const [selected, setSelected] = createSignal([]);
  const [isSelecting, setIsSelecting] = createSignal(false);
  const [manga, setManga] = createSignal(null);
  const [mangaId, setMangaId] = createSignal(null);
  const [lastRead, setLastRead] = createSignal(null);

  const fetchDetails = async () => {
    const url = decodeURIComponent(params.url);
    const cacheKey = `${params.provider}-${url}`;

    // 1. Check Cache first for instant load
    if (mangaCache.has(cacheKey)) {
      const cached = mangaCache.get(cacheKey);
      setChapters(cached.chapters);
      setManga(cached.manga);
      setMangaId(cached.mangaId);
      setReadChapterIds(cached.readChapterIds || []);
      setLastRead(cached.lastRead || null);
      setLoading(false); // Show data immediately
    }

    try {
      if (!mangaCache.has(cacheKey)) setLoading(true);
      
      const provider = params.provider;

      // 1. Fetch library and chapters first to get manga ID
      const [libRes, chaptersRes] = await Promise.all([
        apiFetch(`/api/library`),
        apiFetch(`/api/chapters?url=${encodeURIComponent(url)}&provider=${provider}`)
      ]);

      const library = await libRes.json();
      const chaptersData = await chaptersRes.json();
      let mangaData = library.find((m) => m.source_id === url);
      
      if (!mangaData) {
        try {
          const mRes = await apiFetch(`/api/manga/by-source?url=${encodeURIComponent(url)}`);
          if (mRes.ok) mangaData = await mRes.json();
        } catch(e) { console.error("Manga lookup failed", e); }
      }

      // 2. If we found the manga, fetch all reading status in parallel with nothing else
      let freshReadIds = [];
      let freshLastRead = null;

      if (mangaData) {
        setMangaId(mangaData.id);
        const [readRes, lastRes] = await Promise.all([
          apiFetch(`/api/read-chapters/${mangaData.id}?t=${Date.now()}`),
          apiFetch(`/api/history/last/${mangaData.id}?t=${Date.now()}`)
        ]);
        freshReadIds = await readRes.json();
        freshLastRead = await lastRes.json();
      }

      // 3. SET ALL DATA AT ONCE to ensure atomic re-render
      setManga(mangaData);
      setReadChapterIds(freshReadIds);
      setLastRead(freshLastRead);
      setChapters(chaptersData);

      // 4. Update Cache
      mangaCache.set(cacheKey, {
        chapters: chaptersData,
        manga: mangaData,
        mangaId: mangaData ? mangaData.id : null,
        readChapterIds: freshReadIds,
        lastRead: freshLastRead
      });
    } catch (err) {
      console.error("Fetch Details Error:", err);
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
        const [readRes, lastRes] = await Promise.all([
          apiFetch(`/api/read-chapters/${mangaId()}?t=${Date.now()}`),
          apiFetch(`/api/history/last/${mangaId()}?t=${Date.now()}`)
        ]);
        const readData = await readRes.json();
        const lastData = await lastRes.json();
        
        setReadChapterIds(readData);
        setLastRead(lastData);

        // Tell Library to refresh counts
        window.dispatchEvent(new CustomEvent("refresh-requested"));

        setSelected([]);
        setIsSelecting(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isRead = (id) => readChapterIds().some(h => h.chapter_id === id);
  const getProgress = (id) => readChapterIds().find(h => h.chapter_id === id);

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
            <h1 style="margin-bottom: 0.25rem; font-size: 1.5rem; line-height: 1.2;">{manga().title}</h1>
            <p style="color: var(--text-muted); text-transform: capitalize; font-size: 0.9rem; margin-bottom: 0.5rem;">{params.provider}</p>
            
            <Show
              when={lastRead()}
              fallback={
                <Show when={chapters().length > 0}>
                  <A
                    href={`/read/${params.provider}/${encodeURIComponent(chapters().at(-1).id)}?source=${encodeURIComponent(params.url)}&title=${encodeURIComponent(chapters().at(-1).title)}`}
                    style="display: flex; align-items: center; gap: 0.75rem; text-decoration: none; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); padding: 10px 16px; border-radius: 12px; width: fit-content; margin-top: 0.75rem;"
                  >
                    <div style="background: #22c55e; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 1px;">
                      <span style="font-size: 0.7rem; color: #22c55e; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">Mari Memulai</span>
                      <span style="font-size: 0.95rem; color: #fff; font-weight: 700;">Mulai Baca</span>
                    </div>
                  </A>
                </Show>
              }
            >
              <A 
                href={`/read/${params.provider}/${encodeURIComponent(lastRead().chapter_id)}?source=${encodeURIComponent(params.url)}&title=${encodeURIComponent(lastRead().chapter_title)}&page=${lastRead().last_page}`}
                style="display: flex; align-items: center; gap: 0.75rem; text-decoration: none; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.4); padding: 10px 16px; border-radius: 12px; width: fit-content; margin-top: 0.75rem; box-shadow: 0 4px 15px rgba(0,0,0,0.2);"
              >
                <div style="background: var(--primary); width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                </div>
                <div style="display: flex; flex-direction: column; gap: 1px;">
                  <span style="font-size: 0.7rem; color: var(--primary); font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">Lanjut Membaca</span>
                  <span style="font-size: 0.95rem; color: #fff; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">
                    {lastRead().chapter_title} (Hal {lastRead().last_page})
                  </span>
                </div>
              </A>
            </Show>
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
        <div class="spinner-container" style="padding: 3rem 0;">
          <div class="spinner"></div>
          <p>Mencari chapter...</p>
        </div>
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
          {(chapter) => {
            // Normalize IDs to handle case-sensitivity and mirror differences
            const normalizeId = (val) => {
              const id = typeof val === 'object' && val !== null ? (val.chapter_id || val.id) : val;
              if (!id) return "";
              try {
                const clean = id.toString().toLowerCase().trim().split('?')[0]; 
                const parts = clean.split('/').filter(Boolean);
                return parts[parts.length - 1] || clean;
              } catch(e) { return String(id).toLowerCase().trim(); }
            };

            const chSlug = normalizeId(chapter.id);
            const isFinished = readChapterIds().some(h => {
              const dbSlug = normalizeId(h);
              return dbSlug === chSlug || (dbSlug.length > 3 && chSlug.includes(dbSlug)) || (chSlug.length > 3 && dbSlug.includes(chSlug));
            });
            const isLast = normalizeId(lastRead()) === chSlug;

            return (
              <div
                class={`chapter-item ${isFinished ? "read" : ""} ${isLast ? "last-read-chapter" : ""} ${selected().includes(chapter.id) ? "selected" : ""}`}
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
                
                <div class="chapter-content" style="display: flex; flex-direction: column; flex: 1; min-width: 0;">
                  <span class="chapter-title" style="display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    {chapter.title}
                  </span>
                  <span class="chapter-date" style="display: block; font-size: 0.8rem; opacity: 0.6; margin-top: 4px;">
                    {chapter.updated_at}
                  </span>
                </div>

                <div style="display: flex; align-items: center; gap: 0.75rem; z-index: 2;">
                  <Show when={isLast}>
                    <span class="read-status status-last">
                      <i>📖</i> Hal {lastRead().last_page}
                    </span>
                  </Show>
                  <Show when={isFinished && !isLast}>
                    <span class="read-status status-read">
                      <i>✓</i> Selesai
                    </span>
                  </Show>
                  <Show when={isSelecting()}>
                    <div
                      class={`selection-indicator ${selected().includes(chapter.id) ? "checked" : ""}`}
                    />
                  </Show>
                </div>
              </div>
            );
          }}
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

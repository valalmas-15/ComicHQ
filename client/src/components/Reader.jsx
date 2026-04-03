/** @jsxImportSource solid-js */
import { createSignal, onMount, For, Show, onCleanup, createEffect } from "solid-js";
import { useParams, useSearchParams, useNavigate } from "@solidjs/router";
import { apiFetch, API_BASE } from "../utils/api";

function Reader() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [images, setImages] = createSignal([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal(null);
  const [mangaId, setMangaId] = createSignal(null);
  const [chapters, setChapters] = createSignal([]);
  const [currentPage, setCurrentPage] = createSignal(1);
  const [showControls, setShowControls] = createSignal(false);

  createEffect(() => {
    const chapterId = params.chapterId;
    const provider = params.provider;
    if (chapterId && chapterId !== "undefined" && provider) {
      fetchChapter();
    }
  });

  const fetchChapter = async () => {
    const chapterId = params.chapterId;
    if (!chapterId || chapterId === "undefined") return;
    
    setLoading(true);
    setError(null);
    try {
      const sourceUrl = searchParams.source ? decodeURIComponent(searchParams.source) : null;
      let url = `/api/chapters/pages/${params.provider}/${encodeURIComponent(chapterId)}`;
      if (sourceUrl) url += `?source=${encodeURIComponent(sourceUrl)}`;

      const response = await apiFetch(url);
      if (response.status === 404) throw new Error("Halaman tidak ditemukan (404)");
      
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setImages(data.pages || []);
      
      // Also fetch manga ID and chapter list for navigation
      if (sourceUrl) {
         const libRes = await apiFetch(`/api/library`);
         const lib = await libRes.json();
         const manga = lib.find(m => m.source_id === sourceUrl);
         if (manga) {
            setMangaId(manga.id);
            const chaptersRes = await apiFetch(`/api/chapters/${params.provider}/${encodeURIComponent(sourceUrl)}`);
            const chaptersData = await chaptersRes.json();
            setChapters(chaptersData);
         } else {
            // Fallback: check general manga table
            const mRes = await apiFetch(`/api/manga/by-source?url=${encodeURIComponent(sourceUrl)}`);
            const mData = await mRes.json();
            if (mData) {
               setMangaId(mData.id);
               const chaptersRes = await apiFetch(`/api/chapters/${params.provider}/${encodeURIComponent(sourceUrl)}`);
               const chaptersData = await chaptersRes.json();
               setChapters(chaptersData);
            }
         }
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
      // Reset scroll to top
      window.scrollTo(0, 0);
      setCurrentPage(1);
    }
  };

  let historyTimeout;
  const updateHistory = async (pageNum) => {
    if (!mangaId()) return;

    if (historyTimeout) clearTimeout(historyTimeout);
    historyTimeout = setTimeout(async () => {
      try {
        await apiFetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            manga_id: mangaId(),
            chapter_id: params.chapterId,
            chapter_title: searchParams.title ? decodeURIComponent(searchParams.title) : `Chapter ${params.chapterId}`,
            last_page: pageNum,
            total_pages: images().length,
          }),
        });
        window.dispatchEvent(new CustomEvent("refresh-requested"));
      } catch (err) {
        console.error("Failed to update history:", err);
      }
    }, 1500);
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === "ArrowLeft") navigateChapter("prev");
    if (e.key === "ArrowRight") navigateChapter("next");
  };
  onMount(() => window.addEventListener("keydown", handleKeyDown));
  onCleanup(() => window.removeEventListener("keydown", handleKeyDown));

  const navigateChapter = (dir) => {
    const currentIndex = chapters().findIndex(c => c.id === params.chapterId);
    if (currentIndex === -1) return;

    let targetChapter;
    if (dir === "next") {
      targetChapter = chapters()[currentIndex - 1]; // Chapters usually descending
    } else {
      targetChapter = chapters()[currentIndex + 1];
    }

    if (targetChapter) {
      const sourceUrl = searchParams.source ? decodeURIComponent(searchParams.source) : "";
      navigate(`/read/${params.provider}/${encodeURIComponent(targetChapter.id)}?source=${encodeURIComponent(sourceUrl)}&title=${encodeURIComponent(targetChapter.title)}`);
    }
  };

  const getProxyUrl = (url) => `${API_BASE}/api/proxy?url=${encodeURIComponent(url)}`;

  return (
    <div class="reader-container" onClick={() => setShowControls(!showControls())}>
      <Show when={loading()}>
        <div class="reader-loading">
          <div class="spinner"></div>
          <p>Memuat Gambar...</p>
        </div>
      </Show>

      <Show when={error()}>
        <div class="reader-error">
          <p>⚠️ {error()}</p>
          <button onClick={fetchChapter} class="btn-primary mt-4">Coba Lagi</button>
        </div>
      </Show>

      <div class="image-list">
        <For each={images()}>
          {(src, index) => (
            <div class="image-wrapper">
              <img 
                src={getProxyUrl(src)} 
                alt={`Halaman ${index() + 1}`}
                ref={(el) => {
                  const observer = new IntersectionObserver((entries) => {
                    if (entries[0].isIntersecting) {
                      setCurrentPage(index() + 1);
                      updateHistory(index() + 1);
                    }
                  }, { threshold: 0.1 });
                  observer.observe(el);
                }}
              />
            </div>
          )}
        </For>
      </div>

      {/* Reader Controls */}
      <div class={`reader-controls ${showControls() ? "visible" : ""}`}>
        <div class="controls-top">
          <button onClick={() => navigate(-1)} class="control-btn">← Back</button>
          <div class="chapter-info">
            <span class="manga-title-small">{decodeURIComponent(searchParams.title || "Reading...")}</span>
            <span class="page-count">{currentPage()} / {images().length}</span>
          </div>
        </div>
        <div class="controls-bottom">
          <button onClick={(e) => { e.stopPropagation(); navigateChapter("prev"); }} disabled={!chapters()[chapters().findIndex(c => c.id === params.chapterId)+1]} class="control-btn">Prev</button>
          <button onClick={(e) => { e.stopPropagation(); navigateChapter("next"); }} disabled={!chapters()[chapters().findIndex(c => c.id === params.chapterId)-1]} class="control-btn">Next</button>
        </div>
      </div>
    </div>
  );
}

export default Reader;

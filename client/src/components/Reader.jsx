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
    const chapterUrl = params.url;
    const provider = params.provider;
    if (chapterUrl && chapterUrl !== "undefined" && provider) {
      fetchChapter();
    }
  });

  const fetchChapter = async () => {
    const chapterUrl = params.url;
    if (!chapterUrl || chapterUrl === "undefined") return;
    
    setLoading(true);
    setError(null);
    try {
      const sourceUrl = searchParams.source ? decodeURIComponent(searchParams.source) : null;
      const chUrl = decodeURIComponent(chapterUrl);
      
      // Fixed: Server uses /api/pages?url=...&provider=...
      const response = await apiFetch(`/api/pages?url=${encodeURIComponent(chUrl)}&provider=${params.provider}`);
      if (response.status === 404) throw new Error("Halaman tidak ditemukan (404)");
      
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      // Fixed: Server returns array directly
      setImages(Array.isArray(data) ? data : []);
      
      // Also fetch manga ID and chapter list for navigation
      if (sourceUrl) {
         const libRes = await apiFetch(`/api/library`);
         const lib = await libRes.json();
         const manga = lib.find(m => m.source_id === sourceUrl);
         
         if (manga) {
            setMangaId(manga.id);
            // Fixed: Server uses /api/chapters?url=...&provider=...
            const chaptersRes = await apiFetch(`/api/chapters?url=${encodeURIComponent(sourceUrl)}&provider=${params.provider}`);
            const chaptersData = await chaptersRes.json();
            setChapters(chaptersData);
         } else {
            // Fallback: check general manga table (assuming endpoint exists or handles it)
            // Note: server currently doesn't have /api/manga/by-source; this might be a placeholder
            // For now, let's just use the provider data we have
            const chaptersRes = await apiFetch(`/api/chapters?url=${encodeURIComponent(sourceUrl)}&provider=${params.provider}`);
            const chaptersData = await chaptersRes.json();
            setChapters(chaptersData);
         }
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
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
            chapter_id: params.url,
            chapter_title: searchParams.title ? decodeURIComponent(searchParams.title) : `Chapter ${params.url}`,
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

  // Scroll detection for auto-hiding controls
  let lastScrollY = 0;
  const handleKeyDown = (e) => {
    if (e.key === "ArrowLeft") {
      navigateChapter("prev");
    } else if (e.key === "ArrowRight") {
      navigateChapter("next");
    }
  };

  const handleScroll = () => {
    const currentScrollY = window.scrollY;
    
    // Hide controls when scrolling down, show when scrolling up
    if (currentScrollY > lastScrollY && currentScrollY > 100) {
      if (showControls()) setShowControls(false);
    } else if (currentScrollY < lastScrollY) {
      if (!showControls()) setShowControls(true);
    }
    
    lastScrollY = currentScrollY;
  };

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, { passive: true });
    // Show controls initially
    setShowControls(true);
  });
  
  onCleanup(() => {
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("scroll", handleScroll);
  });

  const navigateChapter = (dir) => {
    const currentIndex = chapters().findIndex(c => c.id === params.url);
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

      <div class="reader-content">
        <div class="reader-header-spacer"></div>
        <For each={images()}>
          {(src, index) => (
            <div class="image-wrapper">
              <img 
                src={getProxyUrl(src)} 
                alt={`Halaman ${index() + 1}`}
                loading="lazy"
                ref={(el) => {
                  const observer = new IntersectionObserver((entries) => {
                    if (entries[0].isIntersecting) {
                      setCurrentPage(index() + 1);
                      updateHistory(index() + 1);
                    }
                  }, { threshold: 0.1 });
                  observer.observe(el);
                }}
                onError={(e) => {
                  e.target.title = "Gagal memuat gambar. Klik untuk coba lagi.";
                  e.target.style.cursor = "pointer";
                  e.target.onclick = () => {
                    const currentSrc = e.target.src;
                    const cleanSrc = currentSrc.split('&retry=')[0];
                    e.target.src = cleanSrc + (cleanSrc.includes('?') ? '&' : '?') + 'retry=' + Date.now();
                  };
                }}
              />
            </div>
          )}
        </For>
        
        {/* End of Chapter Action */}
        <Show when={!loading() && images().length > 0}>
          <div class="reader-footer-actions">
             <button onClick={() => navigateChapter("next")} class="next-ch-footer-btn">
      {/* Consolidated Top Navigation (Matches Global Header Size) */}
      <div 
        class={`reader-controls top ${showControls() ? "visible" : ""}`} 
        style="z-index: 4000 !important;"
        onClick={(e) => e.stopPropagation()}
      >
        <div class="reader-nav-content">
          <button 
            onClick={(e) => { e.stopPropagation(); navigate(-1); }} 
            class="reader-mini-btn"
          >
             <i>←</i>
          </button>
          
          <select 
            class="chapter-dropdown-global-style"
            value={params.url}
            onChange={(e) => {
               const target = chapters().find(c => c.id === e.target.value);
               if (target) {
                 navigate(`/read/${params.provider}/${encodeURIComponent(target.id)}?source=${encodeURIComponent(searchParams.source)}&title=${encodeURIComponent(target.title)}`);
               }
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <For each={chapters()}>
              {(chapter) => (
                <option value={chapter.id} selected={chapter.id === params.url}>
                  {chapter.title}
                </option>
              )}
            </For>
          </select>

          <div class="reader-nav-icons">
            <button 
              onClick={(e) => { e.stopPropagation(); navigateChapter("prev"); }} 
              class="reader-icon-btn"
              disabled={(() => {
                const idx = chapters().findIndex(c => {
                  const normC = c.id.split('?')[0].toLowerCase();
                  const normP = params.url.split('?')[0].toLowerCase();
                  return normC === normP || normC.includes(normP) || normP.includes(normC);
                });
                return idx === -1 || idx === chapters().length - 1;
              })()}
            >
              <i>«</i>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); navigateChapter("next"); }} 
              class="reader-icon-btn primary"
              disabled={(() => {
                const idx = chapters().findIndex(c => {
                  const normC = c.id.split('?')[0].toLowerCase();
                  const normP = params.url.split('?')[0].toLowerCase();
                  return normC === normP || normC.includes(normP) || normP.includes(normC);
                });
                return idx === -1 || idx === 0;
              })()}
            >
              <i>»</i>
            </button>
          </div>
        </div>
      </div>

      <div class="reader-view-area" onClick={() => setShowControls(!showControls())}>
        <div class="reader-content">
          <div class="reader-header-spacer"></div>
          <For each={images()}>
            {(src, index) => {
              const [loaded, setLoaded] = createSignal(false);
              return (
                <div class="image-wrapper">
                  {!loaded() && (
                    <div class="image-loader">
                      <div class="spinner"></div>
                      <span>Halaman {index() + 1} sedang dimuat...</span>
                    </div>
                  )}
                  <img
                    src={getProxyUrl(src)}
                    alt={`Page ${index() + 1}`}
                    class="reader-image"
                    onLoad={() => setLoaded(true)}
                    loading={index() < 3 ? "eager" : "lazy"}
                    style={{ display: loaded() ? 'block' : 'none' }}
                    ref={(el) => {
                      const observer = new IntersectionObserver((entries) => {
                        if (entries[0].isIntersecting) {
                          setCurrentPage(index() + 1);
                          updateHistory(index() + 1);
                        }
                      }, { threshold: 0.1 });
                      observer.observe(el);
                    }}
                    onError={(e) => {
                      e.target.title = "Gagal memuat gambar. Klik untuk coba lagi.";
                      e.target.style.cursor = "pointer";
                      e.target.onclick = () => {
                        const currentSrc = e.target.src;
                        const cleanSrc = currentSrc.split('&retry=')[0];
                        e.target.src = cleanSrc + (cleanSrc.includes('?') ? '&' : '?') + 'retry=' + Date.now();
                      };
                    }}
                  />
                  {loaded() && <div class="page-badge">Hal {index() + 1}</div>}
                </div>
              );
            }}
          </For>
          
          {/* End of Chapter Action */}
          <Show when={!loading() && images().length > 0}>
            <div class="reader-footer-actions">
               <button onClick={() => navigateChapter("next")} class="next-ch-footer-btn">
                  <span>Next Chapter</span>
                  <i>→</i>
               </button>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
}

export default Reader;

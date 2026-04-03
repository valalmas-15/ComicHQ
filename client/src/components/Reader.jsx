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
    setError("");
    try {
      const sourceUrl = searchParams.source;
      const chapterUrl = params.url;
      
      if (!sourceUrl || !chapterUrl) throw new Error("Missing source or chapter data");

      // ⚡ Parallel fetch for speed
      const [mangaRes, chaptersRes, pagesRes] = await Promise.all([
        apiFetch(`/api/manga/by-source?url=${encodeURIComponent(sourceUrl)}`),
        apiFetch(`/api/chapters?url=${encodeURIComponent(sourceUrl)}&provider=${params.provider}`),
        apiFetch(`/api/pages?url=${encodeURIComponent(chapterUrl)}&provider=${params.provider}`)
      ]);

      const [mangaData, chaptersData, pagesData] = await Promise.all([
        mangaRes.json(),
        chaptersRes.json(),
        pagesRes.json()
      ]);

      if (mangaData && mangaData.id) setMangaId(mangaData.id);
      setChapters(Array.isArray(chaptersData) ? chaptersData : []);
      
      if (Array.isArray(pagesData)) {
        setImages(pagesData);
      } else if (pagesData.error) {
        throw new Error(pagesData.error);
      } else {
        setImages([]);
      }

    } catch (err) {
      console.error("Reader Error:", err);
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
    <div class="reader-container">
      {/* 1. Header Navigasi (Pixel-Perfect Global Style) */}
      <div 
        class={`reader-controls top ${showControls() ? "visible" : ""}`} 
        style={{ "z-index": "10000 !important", "pointer-events": showControls() ? "auto" : "none" }}
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
                  const normC = (c.id || "").split('?')[0].toLowerCase();
                  const normP = (params.url || "").split('?')[0].toLowerCase();
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
                  const normC = (c.id || "").split('?')[0].toLowerCase();
                  const normP = (params.url || "").split('?')[0].toLowerCase();
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

      {/* 2. Loading State Utama */}
      <Show when={loading()}>
        <div class="reader-loading-overlay">
          <div class="spinner-container">
            <div class="spinner large"></div>
            <p>Mempersiapkan Chapter...</p>
          </div>
        </div>
      </Show>

      {/* 3. Area Baca */}
      <div class="reader-view-area" onClick={() => setShowControls(!showControls())} style={{ "position": "relative", "z-index": "1" }}>
        <div class="reader-content">
          <div class="reader-header-spacer"></div>
          
          {/* Test Image: Mengetahui apakah rendering img di browser rusak atau proxy-nya */}
          <div style="background: white; padding: 10px; color: black; text-align: center;">
            TEST RENDERING (Logo Placeholder):<br/>
            <img src="https://via.placeholder.com/150" style="display: block; margin: 0 auto; border: 5px solid lime;" />
          </div>

          <For each={images()}>
            {(src, index) => {
              const [loaded, setLoaded] = createSignal(false);
              return (
                <div class="image-wrapper" style={{ "min-height": "200px", "background": "crimson", "border": "2px solid yellow", "margin-bottom": "10px" }}>
                  <Show when={!loaded()}>
                    <div class="image-loader">
                      <div class="spinner"></div>
                      <span>Hal {index() + 1} memuat...</span>
                    </div>
                  </Show>
                  <img
                    src={getProxyUrl(src)}
                    alt={`Page ${index() + 1}`}
                    class="reader-image"
                    onLoad={() => setLoaded(true)}
                    onError={(e) => {
                      console.error(`Image failed: ${src}`);
                      const currentSrc = e.target.src;
                      if (!currentSrc.includes('retry=')) {
                        e.target.src = currentSrc + (currentSrc.includes('?') ? '&' : '?') + 'retry=' + Date.now();
                      }
                    }}
                    style={{ 
                      "display": "block",
                      "width": "100%",
                      "height": "auto",
                      "min-height": "400px",
                      "object-fit": "contain",
                      "border": "5px solid lime",
                      "opacity": "1 !important",
                      "visibility": "visible !important"
                    }}
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
                  {loaded() && <div class="page-badge">Hal {index() + 1}</div>}
                </div>
              );
            }}
          </For>

          <Show when={!loading() && images().length > 0}>
            <div class="reader-footer-actions">
               <button 
                 onClick={(e) => { e.stopPropagation(); navigateChapter("next"); }} 
                 class="next-ch-footer-btn"
                 disabled={chapters().findIndex(c => {
                   const normC = (c.id || "").split('?')[0].toLowerCase();
                   const normP = (params.url || "").split('?')[0].toLowerCase();
                   return normC === normP || normC.includes(normP) || normP.includes(normC);
                 }) === 0}
               >
                  <span>Lanjut ke Chapter Berikutnya</span>
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

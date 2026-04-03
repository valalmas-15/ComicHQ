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

  const getProxyUrl = (url) => {
    if (!url) return "";
    // Force relative path to use Vite proxy
    return `/api/proxy?url=${encodeURIComponent(url)}`;
  };

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
            onClick={(e) => { 
                e.stopPropagation(); 
                navigate(`/manga/${params.provider}/${encodeURIComponent(searchParams.source)}`); 
            }} 
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
          
          <div style={{ "font-size": "0.75rem", "opacity": "0.5", "font-weight": "bold", "white-space": "nowrap", "padding": "0 8px", "font-family": "monospace" }}>
            {currentPage()} / {images().length}
          </div>

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
          
          <For each={images()}>
            {(src, index) => {
              const [loaded, setLoaded] = createSignal(false);
              return (
                <div class="image-wrapper" style={{ "min-height": "400px", "background": "#000", "position": "relative" }}>
                  <Show when={!loaded()}>
                    <div class="image-loader">
                      <div class="spinner"></div>
                      <span>Hal {index() + 1} memuat...</span>
                    </div>
                  </Show>
                  <img
                    src={getProxyUrl(src)}
                    alt={`Page ${index() + 1}`}
                    classList={{ "reader-image": true, "loaded": loaded() }}
                    onLoad={() => setLoaded(true)}
                    onError={(e) => {
                      console.error(`❌ [Reader] Page ${index() + 1} Failed: ${src}`);
                      const el = e.target;
                      el.style.display = "none";
                      
                      // Show specific error overlay with retry button
                      const parent = el.parentElement;
                      if (!parent.querySelector(".retry-overlay")) {
                        const overlay = document.createElement("div");
                        overlay.className = "retry-overlay";
                        overlay.style = "position: absolute; top:0; left:0; width:100%; height:100%; min-height:400px; display:flex; flex-direction:column; align-items:center; justify-content:center; background:rgba(0,0,0,0.8); gap:15px; color:#fff;";
                        overlay.innerHTML = `
                          <span style="font-size:1.5rem;">⚠️</span>
                          <p style="font-size:0.85rem;">Gambar Hal. ${index() + 1} Gagal Dimuat</p>
                          <button class="retry-btn-styled" style="padding:10px 20px; background:#ef4444; border:none; border-radius:8px; color:white; font-weight:700; cursor:pointer;">Coba Lagi</button>
                        `;
                        overlay.querySelector(".retry-btn-styled").onclick = () => {
                           overlay.remove();
                           el.style.display = "block";
                           el.src = getProxyUrl(src) + "&retry=" + Date.now();
                        };
                        parent.appendChild(overlay);
                      }
                    }}
                    style={{ 
                      "display": "block",
                      "width": "100%",
                      "height": "auto",
                      "min-height": "400px",
                      "object-fit": "contain"
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

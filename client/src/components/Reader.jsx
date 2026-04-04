/** @jsxImportSource solid-js */
import { createSignal, onMount, For, Show, onCleanup, createEffect } from "solid-js";
import { useParams, useSearchParams, useNavigate } from "@solidjs/router";
import { apiFetch, API_BASE } from "../utils/api";

function Reader() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // 📜 Infinite Scroll State
  const [chapterList, setChapterList] = createSignal([]); // [{ chapterId, title, images: [], loaded: false }]
  const [availableChapters, setAvailableChapters] = createSignal([]); // Full list from API
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal(null);
  const [mangaId, setMangaId] = createSignal(null);
  const [showControls, setShowControls] = createSignal(true);
  const [currentChapterInfo, setCurrentChapterInfo] = createSignal({ id: "", title: "", index: 0, totalPages: 0 });
  const [currentPage, setCurrentPage] = createSignal(1);
  const [isFetching, setIsFetching] = createSignal(false);
  // 🧭 Absolut Numeric Navigation (Story Timeline)
  const getNumeric = (s) => {
     const matches = (s || "").match(/(\d+(\.\d+)?)/);
     return matches ? parseFloat(matches[0]) : 0;
  };

  // 🧭 ID Normalization to handle cases and slash differences
  const normalizeId = (val) => {
    const id = typeof val === 'object' && val !== null ? (val.chapter_id || val.id) : val;
    if (!id) return "";
    try {
      const clean = id.toString().toLowerCase().trim().split('?')[0]; 
      const parts = clean.split('/').filter(Boolean);
      return parts[parts.length - 1] || clean;
    } catch(e) { return String(id).toLowerCase().trim(); }
  };

  const getNextChapterData = () => {
    const currentList = chapterList();
    if (currentList.length === 0) return null;

    const currentTitle = currentChapterInfo().title || (chapterList()[0]?.title);
    const currentNum = getNumeric(currentTitle);
    
    // Find the chapter with the smallest number that is still GREATER than currentNum
    const all = availableChapters();
    let nextCh = null;
    let minDiff = Infinity;

    for(const ch of all) {
       const chNum = getNumeric(ch.title);
       if (chNum > currentNum) {
          const diff = chNum - currentNum;
          if (diff < minDiff) {
             minDiff = diff;
             nextCh = ch;
          }
       }
    }
    return nextCh; 
  };

  const getPrevChapterData = () => {
     const currentTitle = currentChapterInfo().title || (chapterList()[0]?.title);
     const currentNum = getNumeric(currentTitle);
     const all = availableChapters();
     let prevCh = null;
     let minDiff = Infinity;

     for(const ch of all) {
        const chNum = getNumeric(ch.title);
        if (chNum < currentNum) {
           const diff = currentNum - chNum;
           if (diff < minDiff) {
              minDiff = diff;
              prevCh = ch;
           }
        }
     }
     return prevCh;
  };

  // 🖱️ Scroll Detection for Auto-Hide
  let lastScrollY = 0;
  const handleScroll = () => {
    const currentScrollY = window.scrollY;
    if (currentScrollY > lastScrollY && currentScrollY > 150) {
      if (showControls()) setShowControls(false); // Hide on scroll down
    } else if (currentScrollY < lastScrollY) {
      if (!showControls()) setShowControls(true); // Show on scroll up
    }
    lastScrollY = currentScrollY;
  };

  onMount(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
  });

  onCleanup(() => {
    window.removeEventListener("scroll", handleScroll);
  });

  // Initial Load
  createEffect(() => {
    const chapterUrl = params.url;
    const provider = params.provider;
    if (chapterUrl && chapterUrl !== "undefined" && provider) {
      resetAndFetchInitial();
    }
  });

  const resetAndFetchInitial = async () => {
    const chapterUrl = params.url;
    const sourceUrl = searchParams.source;
    if (!chapterUrl || !sourceUrl) return;

    setLoading(true);
    setError(null);
    try {
      // 1. Get Manga & Available Chapters List
      const [mangaRes, chaptersRes] = await Promise.all([
        apiFetch(`/api/manga/by-source?url=${encodeURIComponent(sourceUrl)}`),
        apiFetch(`/api/chapters?url=${encodeURIComponent(sourceUrl)}&provider=${params.provider}`)
      ]);

      const mangaData = await mangaRes.json();
      const chaptersData = await chaptersRes.json();

      if (mangaData?.id) setMangaId(mangaData.id);
      setAvailableChapters(Array.isArray(chaptersData) ? chaptersData : []);

      // 2. Load the Initial Chapter
      const initialChapterTitle = searchParams.title ? decodeURIComponent(searchParams.title) : `Chapter ${params.url}`;
      await loadChapter(params.url, initialChapterTitle, true);

    } catch (err) {
      console.error("Reader Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      window.scrollTo(0, 0);
    }
  };

  const loadChapter = async (chapterId, title, isInitial = false) => {
    try {
      const pagesRes = await apiFetch(`/api/pages?url=${encodeURIComponent(chapterId)}&provider=${params.provider}`);
      const pagesData = await pagesRes.json();

      if (Array.isArray(pagesData)) {
        const newChapterObj = { chapterId, title, images: pagesData, loaded: true };
        if (isInitial) {
          setChapterList([newChapterObj]);
          setCurrentChapterInfo({ id: chapterId, title, index: 0, totalPages: pagesData.length });
        } else {
          setChapterList(prev => [...prev, newChapterObj]);
        }
      }
    } catch (err) {
      console.error("Failed to load more chapters:", err);
    }
  };

  const loadNextChapterAutomatically = async () => {
    if (isFetching()) return;
    try {
      const nextChapter = getNextChapterData();
      if (nextChapter && !chapterList().find(c => c.chapterId === nextChapter.id)) {
        setIsFetching(true);
        await loadChapter(nextChapter.id, nextChapter.title);
      }
    } finally {
      setIsFetching(false);
    }
  };

  const updateHistory = async (chapterId, title, pageNum, totalPages) => {
    if (!mangaId()) return;
    try {
      await apiFetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manga_id: mangaId(),
          chapter_id: chapterId,
          chapter_title: title,
          last_page: pageNum,
          total_pages: totalPages,
        }),
      });
      // Silent update URL to match scroll position
      const sourceUrl = searchParams.source;
      window.history.replaceState(null, "", `/read/${params.provider}/${encodeURIComponent(chapterId)}?source=${encodeURIComponent(sourceUrl)}&title=${encodeURIComponent(title)}`);
    } catch (err) {
      console.error("Failed to update history:", err);
    }
  };

  const getProxyUrl = (url) => {
    if (!url) return "";
    return `/api/proxy?url=${encodeURIComponent(url)}`;
  };

  return (
    <div class="reader-container">
      {/* 1. Dynamic Header */}
      <div 
        class={`reader-controls top ${showControls() ? "visible" : ""}`} 
        style={{ "z-index": "1000", "pointer-events": showControls() ? "auto" : "none" }}
      >
        <div class="reader-nav-content-rows">
          {/* Row 1: Main Controls Area */}
          <div class="reader-header-row-1">
            <button 
              onClick={() => navigate(`/manga/${params.provider}/${encodeURIComponent(searchParams.source)}`)} 
              class="reader-mini-btn"
            >
               <i class="fas fa-arrow-left"></i>
            </button>
            
            <div class="reader-row-nav-group">
               <button 
                 class="reader-icon-btn small"
                 disabled={!getPrevChapterData()}
                 onClick={() => {
                    const prevCh = getPrevChapterData();
                    if (prevCh) navigate(`/read/${params.provider}/${encodeURIComponent(prevCh.id)}?source=${encodeURIComponent(searchParams.source)}&title=${encodeURIComponent(prevCh.title)}`);
                 }}
               >
                  <i class="fas fa-chevron-left"></i>
               </button>

               <select 
                class="chapter-dropdown-global-style"
                value={(() => {
                   const currId = normalizeId(currentChapterInfo().id || params.url);
                   const all = availableChapters();
                   const match = all.find(c => normalizeId(c.id) === currId);
                   return match ? match.id : (currentChapterInfo().id || params.url);
                })()}
                onChange={(e) => {
                   const target = availableChapters().find(c => c.id === e.target.value);
                   if (target) {
                     navigate(`/read/${params.provider}/${encodeURIComponent(target.id)}?source=${encodeURIComponent(searchParams.source)}&title=${encodeURIComponent(target.title)}`);
                   }
                }}
              >
                <For each={availableChapters()}>
                  {(chapter) => (
                    <option value={chapter.id}>
                      {chapter.title}
                    </option>
                  )}
                </For>
              </select>

              <button 
                 class="reader-icon-btn active small"
                 disabled={!getNextChapterData()}
                 onClick={() => {
                    const nextCh = getNextChapterData();
                    if (nextCh) navigate(`/read/${params.provider}/${encodeURIComponent(nextCh.id)}?source=${encodeURIComponent(searchParams.source)}&title=${encodeURIComponent(nextCh.title)}`);
                 }}
               >
                  <i class="fas fa-chevron-right"></i>
               </button>
            </div>
          </div>

          {/* Row 2: Status Indicator */}
          <div class="reader-header-row-2">
            <div class="reader-status-pill-minimal">
               Hal {currentPage()} / {currentChapterInfo().totalPages}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Loading State */}
      <Show when={loading()}>
        <div class="reader-loading-overlay">
          <div class="spinner-container">
            <div class="spinner large"></div>
            <p>Mempersiapkan Chapter...</p>
          </div>
        </div>
      </Show>

      {/* 3. Infinite Stream Area */}
      <div class="reader-view-area" onClick={() => setShowControls(!showControls())}>
        <div class="reader-content">
          <div class="reader-header-spacer"></div>
          
          <For each={chapterList()}>
            {(chapter, chIndex) => (
              <div class="chapter-block">
                <div class="chapter-divider-label">
                   <span>{chapter.title}</span>
                </div>
                
                <For each={chapter.images}>
                  {(src, imgIndex) => {
                    const [loaded, setLoaded] = createSignal(false);
                    return (
                      <div class="image-wrapper" style={{ "min-height": "400px", "background": "#000", "position": "relative" }}>
                        <Show when={!loaded()}>
                          <div class="image-loader">
                            <div class="spinner"></div>
                            <span>Pemuatan Halaman {imgIndex() + 1}...</span>
                          </div>
                        </Show>
                        <img
                          src={getProxyUrl(src)}
                          alt={`Page ${imgIndex() + 1}`}
                          classList={{ "reader-image": true, "loaded": loaded() }}
                          onLoad={() => setLoaded(true)}
                          onError={(e) => {
                            const el = e.target;
                            el.style.display = "none";
                            const parent = el.parentElement;
                            if (!parent.querySelector(".retry-overlay")) {
                              const overlay = document.createElement("div");
                              overlay.className = "retry-overlay";
                              overlay.style = "position: absolute; top:0; left:0; width:100%; height:100%; min-height:400px; display:flex; flex-direction:column; align-items:center; justify-content:center; background:rgba(0,0,0,0.8); gap:15px; color:#fff;";
                              overlay.innerHTML = `
                                <span style="font-size:1.5rem;">⚠️</span>
                                <p style="font-size:0.85rem;">Gambar Gagal Dimuat</p>
                                <button class="btn-retry-fix" style="padding:10px 20px; background:#ef4444; border:none; border-radius:8px; color:white; font-weight:700; cursor:pointer;">Coba Lagi</button>
                              `;
                              overlay.querySelector(".btn-retry-fix").onclick = () => {
                                 overlay.remove();
                                 el.style.display = "block";
                                 el.src = getProxyUrl(src) + "&retry=" + Date.now();
                              };
                              parent.appendChild(overlay);
                            }
                          }}
                          ref={(el) => {
                            const observer = new IntersectionObserver((entries) => {
                              if (entries[0].isIntersecting) {
                                setCurrentPage(imgIndex() + 1);
                                setCurrentChapterInfo({ id: chapter.chapterId, title: chapter.title, index: chIndex(), totalPages: chapter.images.length });
                                updateHistory(chapter.chapterId, chapter.title, imgIndex() + 1, chapter.images.length);
                                
                                // Auto-trigger next chapter if near the end of the current list
                                if (!isFetching() && chIndex() === chapterList().length - 1 && imgIndex() > chapter.images.length - 8) {
                                  loadNextChapterAutomatically();
                                }
                              }
                            }, { threshold: 0.1 });
                            observer.observe(el);
                          }}
                        />
                      </div>
                    );
                  }}
                </For>
              </div>
            )}
          </For>

          {/* 🏁 Footer Dinamis: Pemicu Bab Selanjutnya */}
          <div 
            class="end-scroll-trigger" 
            ref={(el) => {
              const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                  loadNextChapterAutomatically();
                }
              }, { threshold: 0.01 });
              observer.observe(el);
            }}
            style={{ 
               padding: "100px 20px", 
               display: "flex", 
               "flex-direction": "column", 
               "align-items": "center", 
               "justify-content": "center", 
               "gap": "20px",
               "background": "linear-gradient(180deg, transparent, rgba(var(--primary-rgb), 0.05))" 
            }}
          >
             {(() => {
                const nextCh = getNextChapterData();
                if (nextCh) {
                  return (
                    <>
                      <div class="spinner"></div>
                      <p style={{ color: "var(--text-muted)", "font-size": "0.9rem", "font-weight": "800" }}>
                         Sedang Menjahit {nextCh.title}...
                      </p>
                      <button 
                         class="btn-primary" 
                         disabled={isFetching()}
                         style={{ "margin-top": "20px", "padding": "12px 40px", "font-weight": "900" }}
                         onClick={() => loadNextChapterAutomatically()}
                      >
                         {isFetching() ? "Sedang Mengunduh..." : `Muat ${nextCh.title} Sekarang`}
                      </button>
                    </>
                  );
                } else {
                  return (
                    <>
                       <div style={{ "font-size": "3rem", "margin-bottom": "10px" }}>🏁</div>
                       <h2 style={{ color: "var(--primary)", "font-weight": "900" }}>TAMAT</h2>
                       <p style={{ color: "var(--text-muted)", "margin-bottom": "20px" }}>Anda sudah berada di bab paling baru.</p>
                       <button 
                          class="btn-secondary" 
                          style={{ "padding": "12px 40px", "border-radius": "50px" }}
                          onClick={() => navigate(`/manga/${params.provider}/${encodeURIComponent(searchParams.source)}`)}
                       >
                          Kembali ke Halaman Detail
                       </button>
                    </>
                  );
                }
             })()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Reader;

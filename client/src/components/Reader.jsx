/** @jsxImportSource solid-js */
/** @jsxImportSource solid-js */
import { createSignal, onMount, For, Show, onCleanup } from "solid-js";
import { useParams, A, useSearchParams, useNavigate } from "@solidjs/router";
import { apiFetch, API_BASE } from "../utils/api";

function Reader() {
  const params = useParams();
  const navigate = useNavigate();
  const [pages, setPages] = createSignal([]); // Array of { url, chapterId, chapterIndex, pageNum }
  const [loadedChapterIds, setLoadedChapterIds] = createSignal(new Set());
  const [loading, setLoading] = createSignal(true);
  const [loadingNext, setLoadingNext] = createSignal(false);
  const [error, setError] = createSignal(null);
  const [currentPage, setCurrentPage] = createSignal(1);
  const [activeChapterId, setActiveChapterId] = createSignal("");
  const [loadingPrev, setLoadingPrev] = createSignal(false);
  const [showHeader, setShowHeader] = createSignal(true);
  const [chapters, setChapters] = createSignal([]);
  const [currentChapterIndex, setCurrentChapterIndex] = createSignal(-1);
  const [maxLoadedIndex, setMaxLoadedIndex] = createSignal(2); // Start by allowing first 3 pages
  let lastScrollY = window.scrollY;

  let syncTimer;

  const fetchPages = async () => {
    try {
      const provider = params.provider;
      const chapterUrl = params.url.includes('%') ? decodeURIComponent(params.url) : params.url;
      const sourceUrl = searchParams.source ? decodeURIComponent(searchParams.source) : null;

      // 1. Fetch current chapter pages
      const response = await apiFetch(
        `/api/pages?url=${encodeURIComponent(chapterUrl)}&provider=${provider}`,
      );
      const data = await response.json();
      const formattedPages = (Array.isArray(data) ? data : []).map((url, i) => ({
         url,
         chapterId: chapterUrl,
         pageNum: i + 1
      }));
      setPages(formattedPages);
      setLoadedChapterIds(new Set([chapterUrl]));
      setActiveChapterId(chapterUrl);
      
      // Reset maxLoadedIndex for new chapter
      setMaxLoadedIndex(2);

      // 2. Fetch all chapters to know what's next
      if (sourceUrl) {
        const chaptersRes = await apiFetch(`/api/chapters?url=${encodeURIComponent(sourceUrl)}&provider=${provider}`);
        const chaptersData = await chaptersRes.json();
        setChapters(chaptersData);
        
        // Find current index more robustly
        const currentIndex = chaptersData.findIndex(c => {
          const cid = c.id.replace(/\/$/, "");
          const curl = chapterUrl.replace(/\/$/, "");
          return cid === curl || cid.endsWith(curl) || curl.endsWith(cid);
        });
        setCurrentChapterIndex(currentIndex);
      }
    } catch (err) {
      console.error(err);
      setError("Gagal memuat halaman");
    } finally {
      setLoading(false);
    }
  };

  const switchToChapter = (chapter) => {
    if (!chapter) return;
    setLoading(true);
    setPages([]);
    setLoadedChapterIds(new Set());
    setCurrentPage(1);
    setMaxLoadedIndex(2);
    // Use navigate to update URL without full reload if possible, 
    // or just fetch new pages and update state
    const sourceUrl = searchParams.source ? decodeURIComponent(searchParams.source) : "";
    const mangaTitle = searchParams.manga_title ? decodeURIComponent(searchParams.manga_title) : "";
    const thumb = searchParams.thumb ? decodeURIComponent(searchParams.thumb) : "";
    
    // Update URL manually to keep it in sync
    const newUrl = `/read/${params.provider}/${encodeURIComponent(chapter.id)}?source=${encodeURIComponent(sourceUrl)}&manga_title=${encodeURIComponent(mangaTitle)}&thumb=${encodeURIComponent(thumb)}`;
    window.history.pushState({}, '', newUrl);
    
    // Update params manually since we aren't using navigate() to avoid remount flicker
    params.url = chapter.id;
    fetchPages();
    window.scrollTo(0, 0);
  };

  const fetchNextChapter = async () => {
    // currentChapterIndex === 0 means we are at the very top (usually newest)
    if (loadingNext() || currentChapterIndex() <= 0) return; 

    // In descending order list: Current = 5 (Index 2), Next = 6 (Index 1)
    const nextIndex = currentChapterIndex() - 1; 
    const nextChapter = chapters()[nextIndex];
    if (loadedChapterIds().has(nextChapter.id)) return;

    setLoadingNext(true);
    try {
      const response = await apiFetch(
        `/api/pages?url=${encodeURIComponent(nextChapter.id)}&provider=${params.provider}`,
      );
      const data = await response.json();
      if (Array.isArray(data)) {
        const newPages = data.map((url, i) => ({
           url,
           chapterId: nextChapter.id,
           pageNum: i + 1
        }));
        setPages([...pages(), ...newPages]);
        setLoadedChapterIds(prev => new Set(prev).add(nextChapter.id));
      }
    } catch (err) {
      console.error("Failed to load next chapter", err);
    } finally {
      setLoadingNext(false);
    }
  };

  const fetchPrevChapter = async () => {
    // Going backward (older chapters)
    if (loadingPrev() || currentChapterIndex() >= chapters().length - 1) return;

    const prevIndex = currentChapterIndex() + 1;
    const prevChapter = chapters()[prevIndex];
    if (loadedChapterIds().has(prevChapter.id)) return;

    setLoadingPrev(true);
    try {
      const response = await apiFetch(
        `/api/pages?url=${encodeURIComponent(prevChapter.id)}&provider=${params.provider}`,
      );
      const data = await response.json();
      if (Array.isArray(data)) {
        const newPages = data.map((url, i) => ({
           url,
           chapterId: prevChapter.id,
           pageNum: i + 1
        }));
        
        // Save current scroll height to adjust later
        const oldHeight = document.body.offsetHeight;
        const oldScroll = window.scrollY;

        setPages([...newPages, ...pages()]);
        setLoadedChapterIds(prev => new Set(prev).add(prevChapter.id));

        // Wait for Solid to update DOM then adjust scroll
        setTimeout(() => {
          const newHeight = document.body.offsetHeight;
          window.scrollTo(0, oldScroll + (newHeight - oldHeight));
        }, 50);
      }
    } catch (err) {
      console.error("Failed to load prev chapter", err);
    } finally {
      setLoadingPrev(false);
    }
  };

  const [searchParams] = useSearchParams();

  const syncProgress = async () => {
    try {
      const chapterUrl = decodeURIComponent(params.url);

      const libResponse = await apiFetch(`/api/library`);
      const library = await libResponse.json();

      // Attempt to find current manga safely
      const sourceUrl = searchParams.source
        ? decodeURIComponent(searchParams.source)
        : null;
      let manga = null;
      if (sourceUrl) {
        manga = library.find((m) => m.source_id === sourceUrl);
      } else {
        manga = library.find((m) => {
          const slug = m.source_id.split("/").filter(Boolean).pop();
          return slug && slug.length > 2 && chapterUrl.includes(slug);
        });
      }

      const rawChapterTitle = searchParams.title
        ? decodeURIComponent(searchParams.title)
        : `Chapter ${chapterUrl.split("/").filter(Boolean).pop()}`;

      const res = await apiFetch(`/api/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manga_id: manga ? manga.id : null,
          chapter_id: activeChapterId() || chapterUrl,
          chapter_title: chapters().find(c => c.id === activeChapterId())?.title || rawChapterTitle,
          last_page: currentPage(),

          manga_title: searchParams.manga_title
            ? decodeURIComponent(searchParams.manga_title)
            : null,
          thumbnail_url: searchParams.thumb
            ? decodeURIComponent(searchParams.thumb)
            : null,
          provider: params.provider,
          source_id: sourceUrl || chapterUrl,
          type: searchParams.type
            ? decodeURIComponent(searchParams.type)
            : "manga",
        }),
      });

      if (!res.ok) {
        throw new Error("Backend history insert auto-add failed");
      }
    } catch (e) {
      console.warn(
        "Failed to sync progress to SQLite server, reverting to local history:",
        e.message,
      );
      fallbackSync(decodeURIComponent(params.url));
    }
  };

  const fallbackSync = (chapterUrl) => {
    try {
      const history = JSON.parse(localStorage.getItem("manga_history") || "[]");
      const newEntry = {
        chapter_id: chapterUrl,
        chapter_title: `Chapter ${chapterUrl.split("/").pop()}`,
        last_page: currentPage(),
        total_pages: pages().length,
        provider: params.provider,
        updated_at: new Date().toISOString(),
      };
      const filtered = history.filter((h) => h.chapter_id !== chapterUrl);
      filtered.unshift(newEntry);
      localStorage.setItem(
        "manga_history",
        JSON.stringify(filtered.slice(0, 50)),
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleScroll = () => {
    const currentScrollY = window.scrollY;
    
    // Auto-hide/show navbar logic
    if (currentScrollY > lastScrollY && currentScrollY > 70) {
      setShowHeader(false); // Scrolling down - hide
    } else {
      setShowHeader(true); // Scrolling up - show
    }
    lastScrollY = currentScrollY;

    const scrollPos = currentScrollY + window.innerHeight / 2;
    const imgElements = document.querySelectorAll(".reader-image-container");

    imgElements.forEach((container, index) => {
      const top = container.offsetTop;
      const height = container.offsetHeight;
      if (top <= scrollPos && top + height > scrollPos) {
        const pageObj = pages()[index];
        if (pageObj) {
          setCurrentPage(pageObj.pageNum);
          if (pageObj.chapterId !== activeChapterId()) {
            setActiveChapterId(pageObj.chapterId);
            // Update currentChapterIndex based on the activeChapterId
            const newIdx = chapters().findIndex(c => c.id === pageObj.chapterId);
            if (newIdx !== -1) setCurrentChapterIndex(newIdx);
          }
        }
      }
    });

    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(syncProgress, 2000);

    // Check for end of scroll to load next chapter
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 2000) {
      fetchNextChapter();
    }
  };

  onMount(() => {
    fetchPages();
    window.addEventListener("scroll", handleScroll, { passive: true });
  });

  onCleanup(() => {
    window.removeEventListener("scroll", handleScroll);
    if (syncTimer) clearTimeout(syncTimer);
  });

  const getProxyUrl = (url) =>
    `${API_BASE}/api/proxy?url=${encodeURIComponent(url)}`;

  // Sub-component for individual pages to handle loading state
  const PageItem = (props) => {
    const [loaded, setLoaded] = createSignal(false);
    const [inView, setInView] = createSignal(false);
    let containerRef;

    // Ordered & Viewport-aware loading logic
    const shouldLoad = () => props.index <= maxLoadedIndex() || inView();

    onMount(() => {
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      }, { rootMargin: '500px' });
      if (containerRef) observer.observe(containerRef);
    });

    const onImageLoaded = () => {
      setLoaded(true);
      // When this image loads, allow the next ones to start
      if (props.index >= maxLoadedIndex() - 1) {
        setMaxLoadedIndex(props.index + 2); // Buffer of 2
      }
    };

    return (
      <div
        id={`page-${props.index}`}
        ref={containerRef}
        class="reader-image-container"
        classList={{ "bg-gray-900": true }}
      >
        {!loaded() && (
          <div class="page-loader">
            <div class="loading-spinner-small"></div>
            <span>Halaman {props.index + 1}</span>
          </div>
        )}
        <Show when={shouldLoad()}>
          <img
            src={getProxyUrl(props.url)}
            alt={`Page ${props.index + 1}`}
            class="reader-image"
            classList={{ loaded: loaded() }}
            onLoad={onImageLoaded}
            onerror={(e) => {
              e.currentTarget.src =
                "https://dummyimage.com/800x1200?text=Gagal+Memuat+Gambar";
            }}
          />
        </Show>
      </div>
    );
  };

  return (
    <div class="reader-container">
      <header class="reader-header" classList={{ hidden: !showHeader() }}>
        <button 
          onClick={() => {
            const sourceUrl = searchParams.source ? decodeURIComponent(searchParams.source) : "";
            if (sourceUrl) {
              navigate(`/manga/${params.provider}/${encodeURIComponent(sourceUrl)}`);
            } else {
              window.history.back();
            }
          }} 
          class="reader-back"
        >
          ←
        </button>
        
        <div class="reader-nav-controls">
          <button 
            class="nav-btn" 
            disabled={currentChapterIndex() >= chapters().length - 1}
            onClick={() => switchToChapter(chapters()[currentChapterIndex() + 1])}
          >
            Prev
          </button>

          <div class="chapter-selector-wrapper">
            <select 
              class="chapter-select"
              value={chapters()[currentChapterIndex()]?.id}
              onChange={(e) => {
                const selected = chapters().find(c => c.id === e.target.value);
                switchToChapter(selected);
              }}
            >
              <For each={chapters()}>
                {(chapter, index) => (
                  <option value={chapter.id} selected={index() === currentChapterIndex()}>
                    {chapter.title}
                  </option>
                )}
              </For>
            </select>
          </div>

          <button 
            class="nav-btn" 
            disabled={currentChapterIndex() <= 0}
            onClick={() => switchToChapter(chapters()[currentChapterIndex() - 1])}
          >
            Next
          </button>
        </div>

        <div class="reader-progress-mini">
           {currentPage()} / {pages().length}
        </div>
      </header>

      <Show when={error()}>
        <div class="reader-error">
          <p>⚠️ {error()}</p>
          <button onClick={fetchPages}>Coba Lagi</button>
        </div>
      </Show>

      <div class="reader-content">
        <For each={pages()}>
          {(page, index) => <PageItem url={page.url} index={index()} />}
        </For>
      </div>

      <div class="reader-footer">
        <Show when={loadingNext()}>
          <div class="loading-spinner-small"></div>
          <p>Memuat chapter selanjutnya...</p>
        </Show>
        <Show when={!loadingNext() && currentChapterIndex() <= 0}>
          <p>Sudah mencapai chapter terbaru ✨</p>
        </Show>
        <Show when={!loadingNext() && currentChapterIndex() > 0}>
          <p>Tarik ke bawah untuk chapter selanjutnya</p>
        </Show>
      </div>
    </div>
  );
}

export default Reader;

/** @jsxImportSource solid-js */
/** @jsxImportSource solid-js */
import { createSignal, onMount, For, Show, onCleanup } from "solid-js";
import { useParams, A, useSearchParams } from "@solidjs/router";
import { apiFetch, API_BASE } from "../utils/api";

function Reader() {
  const params = useParams();
  const [pages, setPages] = createSignal([]);
  const [loading, setLoading] = createSignal(true);
  const [loadingNext, setLoadingNext] = createSignal(false);
  const [error, setError] = createSignal(null);
  const [currentPage, setCurrentPage] = createSignal(1);
  const [visibleIndices, setVisibleIndices] = createSignal([]);
  const [showHeader, setShowHeader] = createSignal(true);
  const [chapters, setChapters] = createSignal([]);
  const [currentChapterIndex, setCurrentChapterIndex] = createSignal(-1);
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
      setPages(Array.isArray(data) ? data : []);
      setVisibleIndices(new Array(data.length).fill(true));

      // 2. Fetch all chapters to know what's next
      if (sourceUrl) {
        const chaptersRes = await apiFetch(`/api/chapters?url=${encodeURIComponent(sourceUrl)}&provider=${provider}`);
        const chaptersData = await chaptersRes.json();
        setChapters(chaptersData);
        
        const currentIndex = chaptersData.findIndex(c => c.id === chapterUrl);
        setCurrentChapterIndex(currentIndex);
      }
    } catch (err) {
      console.error(err);
      setError("Gagal memuat halaman");
    } finally {
      setLoading(false);
    }
  };

  const fetchNextChapter = async () => {
    if (loadingNext() || currentChapterIndex() <= 0) return; // Index 0 is often the latest chapter, chapters are usually sorted desc

    const nextIndex = currentChapterIndex() - 1; // Assuming descending order (Chapter 2 is index n-1 if Chapter 1 is index n)
    // Wait, let's check order. Usually 10, 9, 8... 1.
    // If current is Chapter 9 (index 1), next is Chapter 10 (index 0).
    // Let's assume the user wants to read in increasing order (1 -> 2 -> 3).
    // In most manga sites, index 0 is the NEWEST (highest number).
    // So "Next" in reading order is the one with SMALLER index.
    
    const nextChapter = chapters()[nextIndex];
    if (!nextChapter) return;

    setLoadingNext(true);
    try {
      const response = await apiFetch(
        `/api/pages?url=${encodeURIComponent(nextChapter.id)}&provider=${params.provider}`,
      );
      const data = await response.json();
      if (Array.isArray(data)) {
        setPages([...pages(), ...data]);
        setVisibleIndices(new Array(pages().length).fill(true));
        setCurrentChapterIndex(nextIndex);
      }
    } catch (err) {
      console.error("Failed to load next chapter", err);
    } finally {
      setLoadingNext(false);
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
          chapter_id: chapterUrl,
          chapter_title: rawChapterTitle,
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
        setCurrentPage(index + 1);
      }
    });

    const windowTop = window.scrollY - 1500;
    const windowBottom = window.scrollY + window.innerHeight + 1500;

    const nextVisibility = pages().map((_, i) => {
      const el = document.getElementById(`page-${i}`);
      if (!el) return true;
      const rect = el.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const bottom = rect.bottom + window.scrollY;
      return bottom >= windowTop && top <= windowBottom;
    });
    setVisibleIndices(nextVisibility);

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

  return (
    <div class="reader-container">
      <header class="reader-header" classList={{ hidden: !showHeader() }}>
        <A href="/" class="reader-back">
          ←
        </A>
        <div class="reader-info">
          <span class="chapter-label">Chapter Reading</span>
          <span class="page-counter">
            {currentPage()} / {pages().length}
          </span>
        </div>
      </header>

      <Show when={loading()}>
        <div class="reader-loading">
          <div class="spinner"></div>
          <p>Memuat lembaran komik...</p>
        </div>
      </Show>

      <Show when={error()}>
        <div class="reader-error">
          <p>⚠️ {error()}</p>
          <button onClick={fetchPages}>Coba Lagi</button>
        </div>
      </Show>

      <div class="reader-content">
        <For each={pages()}>
          {(page, index) => (
            <div
              id={`page-${index()}`}
              class="reader-image-container"
              classList={{
                "min-h-screen": !visibleIndices()[index()],
                "bg-gray-900": true,
              }}
            >
              <Show when={visibleIndices()[index()]}>
                <img
                  src={getProxyUrl(page)}
                  alt={`Page ${index() + 1}`}
                  class="reader-image"
                  onerror={(e) => {
                    e.target.src =
                      "https://dummyimage.com/800x1200?text=Failed+to+load+image";
                  }}
                />
              </Show>
              <Show when={!visibleIndices()[index()]}>
                <div class="placeholder-page">Lembaran {index() + 1}</div>
              </Show>
            </div>
          )}
        </For>
      </div>

      <div class="reader-footer">
        <Show when={loadingNext()}>
          <div class="spinner"></div>
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

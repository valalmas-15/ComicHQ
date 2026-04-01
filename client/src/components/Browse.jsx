/** @jsxImportSource solid-js */
import { createSignal, onMount, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { apiFetch, API_BASE } from "../utils/api";

function Browse() {
  const [query, setQuery] = createSignal("");
  const [results, setResults] = createSignal([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal(null);

  const [allProviders, setAllProviders] = createSignal([]);
  const [selectedProviders, setSelectedProviders] = createSignal([]);
  const [libraryIds, setLibraryIds] = createSignal(new Set());

  const fetchLibraryStatus = async () => {
    try {
      const response = await apiFetch(`/api/library`);
      const data = await response.json();
      if (Array.isArray(data)) {
        const ids = new Set(data.map((m) => m.source_id));
        setLibraryIds(ids);
      }
    } catch (err) {
      console.error("Failed to fetch library status:", err);
    }
  };

  onMount(async () => {
    fetchLibraryStatus();
    try {
      const response = await apiFetch(`/api/providers`);
      const data = await response.json();
      setAllProviders(data);
      setSelectedProviders(data); // Default select all
    } catch (err) {
      console.error("Failed to fetch providers:", err);
    }
  });

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query().trim()) return;

    setLoading(true);
    setError(null);
    try {
      const providersParam = selectedProviders().join(",");
      const response = await apiFetch(
        `/api/search?q=${encodeURIComponent(query())}&selected_providers=${encodeURIComponent(providersParam)}`,
      );
      const data = await response.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch results");
    } finally {
      setLoading(false);
    }
  };

  const toggleProvider = (name) => {
    if (selectedProviders().includes(name)) {
      setSelectedProviders(selectedProviders().filter((p) => p !== name));
    } else {
      setSelectedProviders([...selectedProviders(), name]);
    }
  };

  const addToLibrary = async (manga) => {
    try {
      const response = await apiFetch(`/api/library`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: manga.title,
          source_id: manga.source_id,
          provider: manga.provider,
          thumbnail_url: manga.thumbnail,
          type: manga.type,
        }),
      });

      if (response.ok) {
        alert("Ditambahkan ke Library!");
        fetchLibraryStatus(); // Refresh local list
      } else {
        const err = await response.json();
        alert(`Gagal: ${err.error || "Server error"}`);
      }
    } catch (err) {
      console.error("API error:", err);
    }
  };

  const getProxyUrl = (url) =>
    `${API_BASE}/api/proxy?url=${encodeURIComponent(url)}`;

  const [selectedManga, setSelectedManga] = createSignal(null);
  const [chapters, setChapters] = createSignal([]);
  const [loadingChapters, setLoadingChapters] = createSignal(false);

  const openDetail = async (manga) => {
    setSelectedManga(manga);
    setLoadingChapters(true);
    setChapters([]);
    try {
      const response = await apiFetch(
        `/api/chapters?url=${encodeURIComponent(manga.source_id)}&provider=${manga.provider}`,
      );
      const data = await response.json();
      setChapters(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingChapters(false);
    }
  };

  const closeDetail = () => setSelectedManga(null);

  return (
    <div class="page-container">
      <header>
        <h1 style="text-align: center; margin-bottom: 2rem;">
          Explore ComicHQ
        </h1>
      </header>

      {/* Detail Modal / Wizard */}
      <Show when={selectedManga()}>
        <div class="modal-overlay" onClick={closeDetail}>
          <div class="modal-content" onClick={(e) => e.stopPropagation()}>
            <div class="modal-header flex justify-between items-center">
              <h2 class="m-0 text-lg max-w-4/5 overflow-hidden text-ellipsis whitespace-nowrap">
                {selectedManga().title}
              </h2>
              <button class="modal-close" onClick={closeDetail}>
                &times;
              </button>
            </div>
            <div class="modal-body">
              <div class="detail-wizard">
                <div class="wizard-sidebar">
                  <img
                    src={getProxyUrl(selectedManga().thumbnail)}
                    class="wizard-poster"
                  />
                  <div class="mt-4">
                    <p class="text-muted text-sm">
                      Sumber:{" "}
                      <span class="text-primary">
                        {selectedManga().provider}
                      </span>
                    </p>
                    <button
                      class="add-lib-btn"
                      classList={{
                        "w-full m-0 mt-4": true,
                        "bg-green-500 pointer-events-none opacity-80":
                          libraryIds().has(selectedManga().source_id),
                      }}
                      onClick={() => addToLibrary(selectedManga())}
                    >
                      {libraryIds().has(selectedManga().source_id)
                        ? "✓ Sudah di Library"
                        : "+ Simpan ke Library"}
                    </button>
                  </div>
                </div>
                <div class="wizard-main">
                  <h3>Daftar Chapter</h3>
                  <Show when={loadingChapters()}>
                    <div class="loading-spinner"></div>
                  </Show>
                  <Show
                    when={
                      !loadingChapters() &&
                      chapters().length === 0 &&
                      selectedManga()
                    }
                  >
                    <p style="text-align: center; color: var(--text-muted);">
                      Tidak ada chapter ditemukan.
                    </p>
                  </Show>
                  <div class="wizard-chapters">
                    <For each={chapters()}>
                      {(ch) => (
                        <A
                          href={`/read/${selectedManga().provider}/${encodeURIComponent(ch.id)}?source=${encodeURIComponent(selectedManga().source_id)}&title=${encodeURIComponent(ch.title)}&manga_title=${encodeURIComponent(selectedManga().title)}&thumb=${encodeURIComponent(selectedManga().thumbnail)}&type=${encodeURIComponent(selectedManga().type || "manga")}`}
                          class="wizard-chapter-btn"
                        >
                          <span>{ch.title}</span>
                          <span class="text-xs text-muted">
                            {ch.updated_at}
                          </span>
                        </A>
                      )}
                    </For>
                  </div>
                </div>
              </div>
            </div>{" "}
            {/* End modal-body */}
          </div>
        </div>
      </Show>

      <div class="filter-section mb-6 bg-white-05 p-4 rounded-xl border border-white-10">
        <p class="text-sm font-semibold mb-3 text-muted">
          Pilih Sumber (Sources):
        </p>
        <div class="flex flex-wrap gap-2">
          <For each={allProviders()}>
            {(name) => (
              <button
                onClick={() => toggleProvider(name)}
                class={`source-chip ${selectedProviders().includes(name) ? "active" : ""}`}
              >
                {name}
              </button>
            )}
          </For>
        </div>
      </div>

      <form class="search-container" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Cari di sumber terpilih..."
          value={query()}
          onInput={(e) => setQuery(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading() || selectedProviders().length === 0}
        >
          {loading() ? "..." : "Cari"}
        </button>
      </form>

      <Show when={error()}>
        <div class="error-msg">{error()}</div>
      </Show>

      <div class="manga-grid">
        <For each={results()}>
          {(manga) => (
            <div class="manga-card" onClick={() => openDetail(manga)}>
              <div class="card-link" style="cursor: pointer;">
                <div class="manga-poster-wrapper">
                  <Show when={manga.type === "manhwa"}>
                    <div class="origin-flag-badge">🇰🇷</div>
                  </Show>
                  <Show when={manga.type === "manhua"}>
                    <div class="origin-flag-badge">🇨🇳</div>
                  </Show>
                  <Show when={manga.type === "manga"}>
                    <div class="origin-flag-badge">🇯🇵</div>
                  </Show>

                  <span class="provider-badge-search">{manga.provider}</span>

                  <Show when={manga.latest_chapter}>
                    <span class="chapter-badge">{manga.latest_chapter}</span>
                  </Show>

                  <img
                    src={getProxyUrl(manga.thumbnail)}
                    alt={manga.title}
                    class="manga-thumbnail"
                    loading="lazy"
                    onerror={(e) => {
                      e.target.src =
                        "https://dummyimage.com/180x270?text=No+Image";
                    }}
                  />
                </div>
                <div class="card-info">
                  <h3>{manga.title}</h3>
                </div>{" "}
                {/* End card-info */}
              </div>
              <div class="card-actions px-2 pb-2">
                <button
                  class="add-lib-btn"
                  classList={{
                    "w-full": true,
                    "bg-green-500 pointer-events-none opacity-80":
                      libraryIds().has(manga.source_id),
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    addToLibrary(manga);
                  }}
                >
                  {libraryIds().has(manga.source_id) ? "✓ Ada" : "+ Favorit"}
                </button>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}

export default Browse;

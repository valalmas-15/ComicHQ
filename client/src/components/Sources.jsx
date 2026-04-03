/** @jsxImportSource solid-js */
import { createSignal, onMount, For, Show } from "solid-js";
import { apiFetch } from "../utils/api";
import { formatRelativeTime } from "../utils/helpers";

function Sources() {
  const [sources, setSources] = createSignal([]);
  const [loading, setLoading] = createSignal(true);
  const [pinging, setPinging] = createSignal(false);
  const [pingingSingle, setPingingSingle] = createSignal({});
  const [error, setError] = createSignal(null);

  const fetchSources = async () => {
    try {
      const response = await apiFetch(`/api/sources-status`);
      const data = await response.json();
      setSources(data || []);
    } catch (err) {
      console.error(err);
      setError("Gagal memuat daftar status sumber");
    } finally {
      setLoading(false);
    }
  };

  onMount(fetchSources);

  const pingAllSources = async () => {
    try {
      setPinging(true);
      await apiFetch(`/api/sources-ping`, { method: "POST" });
      await fetchSources(); // Refresh status after pinging
    } catch (err) {
      console.error(err);
      alert("Gagal mengeksekusi Ping");
    } finally {
      setPinging(false);
    }
  };

  const pingSource = async (name) => {
    try {
      setPingingSingle((prev) => ({ ...prev, [name]: true }));
      await apiFetch(`/api/sources-ping/${name}`, { method: "POST" });
      await fetchSources(); // Refresh status after pinging
    } catch (err) {
      console.error(err);
      alert(`Gagal mengeksekusi Ping untuk ${name}`);
    } finally {
      setPingingSingle((prev) => ({ ...prev, [name]: false }));
    }
  };

  return (
    <div class="page-container pb-80">
      <header class="text-center mb-8">
        <h1>⚙️ Status Provider (Sources)</h1>
        <p class="text-muted text-sm mt-2 max-w-xl mx-auto">
          Ini adalah daftar seluruh sumber komik yang aktif di sistem. Provider
          yang bermasalah akan otomatis ditandai peringatan saat *Auto-Scanner*
          gagal membaca chapter terbarunya atau ketika fitur *Explore* rusak.
        </p>

        <button
          onClick={pingAllSources}
          disabled={pinging()}
          class="btn-primary mt-6 px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2"
        >
          <span>📡</span>{" "}
          {pinging()
            ? "Mengetes Semua Server..."
            : "Tes Koneksi Semua Source (Ping)"}
        </button>
      </header>

      <Show when={loading()}>
        <div style="text-align: center;">Membuka status...</div>
      </Show>

      <Show when={error()}>
        <div style="text-align: center; color: var(--danger);">{error()}</div>
      </Show>

      <div class="sources-grid">
        <For each={sources()}>
          {(source) => (
            <div class={`source-card ${source.is_broken ? 'broken' : 'healthy'}`}>
              <div class="source-card-header">
                <div class="source-icon">
                  {source.name.charAt(0).toUpperCase()}
                </div>
                <div class="source-status-ring"></div>
              </div>

              <div class="source-card-body">
                <h3 class="source-title">{source.name}</h3>
                <p class="source-url-text">{source.url || 'No URL'}</p>
                
                <Show when={source.is_broken}>
                  <div class="error-pill">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Issues Detected</span>
                  </div>
                  <p class="error-detail-text">{source.last_error || 'Unknown error'}</p>
                </Show>
              </div>

              <div class="source-card-footer">
                <div class="source-meta">
                  <span class="meta-label">Last Ping:</span>
                  <span class="meta-value">
                    {source.updated_at ? formatRelativeTime(source.updated_at) : "N/A"}
                  </span>
                </div>

                <div class="source-actions">
                  <button
                    onClick={() => pingSource(source.name)}
                    disabled={pingingSingle()[source.name] || pinging()}
                    class="ping-action-btn"
                    title="Test Latency"
                  >
                    <i class={`fas ${pingingSingle()[source.name] ? 'fa-spinner fa-spin' : 'fa-signal'}`}></i>
                  </button>
                  <Show when={source.url}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="visit-action-btn"
                      title="Visit Website"
                    >
                      <i class="fas fa-external-link-alt"></i>
                    </a>
                  </Show>
                </div>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}

export default Sources;

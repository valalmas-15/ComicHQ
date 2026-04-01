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

      <div class="history-list">
        <For each={sources()}>
          {(source) => (
            <div
              class="history-item"
              style="display: flex; flex-direction: column; gap: 0.5rem;"
            >
              <div class="flex justify-between items-center w-full">
                <h3 class="m-0 text-xl">{source.name}</h3>
                <Show
                  when={source.is_broken === 1 || source.is_broken === true}
                >
                  <div class="status-badge status-error">
                    <span>⚠️</span>
                    <span class="font-bold text-sm">ERROR</span>
                  </div>
                </Show>
                <Show
                  when={source.is_broken === 0 || source.is_broken === false}
                >
                  <div class="status-badge status-healthy">
                    <span>✅</span>
                    <span class="font-bold text-sm">SEHAT</span>
                  </div>
                </Show>
              </div>

              <div class="flex flex-col gap-1 mt-2">
                <Show when={source.last_error && source.is_broken}>
                  <p class="m-0 text-red-400 text-sm font-mono bg-black-30 p-2 rounded-md">
                    {source.last_error}
                  </p>
                </Show>

                <p class="m-0 text-muted text-xs">
                  Terakhir dicek:{" "}
                  {source.updated_at
                    ? formatRelativeTime(source.updated_at)
                    : "Belum pernah dipakai"}
                </p>
              </div>

              <div class="flex gap-2 justify-end mt-4 pt-4 border-t border-white-10">
                <Show when={source.url}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn-secondary btn-sm inline-flex items-center gap-1"
                  >
                    🌐 Kunjungi Web
                  </a>
                </Show>
                <button
                  onClick={() => pingSource(source.name)}
                  disabled={pingingSingle()[source.name] || pinging()}
                  class="btn-primary btn-sm inline-flex items-center gap-1"
                >
                  📡{" "}
                  {pingingSingle()[source.name]
                    ? "Mengetes..."
                    : "Tes Ping Individual"}
                </button>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}

export default Sources;

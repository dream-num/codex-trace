import type { CodexHome } from "../../shared/types";
import { VscFolderLibrary } from "react-icons/vsc";

interface CodexHomeSelectorProps {
  homes: CodexHome[];
  loading: boolean;
  error: string;
  selectedIndex: number;
  onSelect: (home: CodexHome) => void;
  onRetry: () => void;
}

export function CodexHomeSelector({
  homes,
  loading,
  error,
  selectedIndex,
  onSelect,
  onRetry,
}: CodexHomeSelectorProps) {
  return (
    <div className="home-selector">
      <div className="home-selector__panel">
        <div className="home-selector__header">
          <h1 className="home-selector__title">Choose a Codex home</h1>
          <p className="home-selector__subtitle">Select the mounted workspace to inspect.</p>
        </div>

        {loading && <div className="home-selector__status">Discovering Codex homes…</div>}

        {!loading && error && (
          <div className="home-selector__status home-selector__status--error">
            <span>{error}</span>
            <button className="home-selector__retry" onClick={onRetry}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && homes.length === 0 && (
          <div className="home-selector__status">
            <span>No mounted Codex homes were found.</span>
            <span className="home-selector__hint">
              Expected layout: &lt;root&gt;/&lt;name&gt;/home/.codex/sessions
            </span>
            <button className="home-selector__retry" onClick={onRetry}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && homes.length > 0 && (
          <div className="home-selector__list" role="listbox" aria-label="Codex homes">
            {homes.map((home, index) => {
              const selected = index === selectedIndex;
              return (
                <button
                  key={home.id}
                  className={`home-selector__home${selected ? " home-selector__home--selected" : ""}`}
                  onClick={() => onSelect(home)}
                  role="option"
                  aria-selected={selected}
                  title={home.sessions_dir}
                >
                  <VscFolderLibrary className="home-selector__icon" />
                  <span className="home-selector__home-copy">
                    <span className="home-selector__home-name">{home.name}</span>
                    <span className="home-selector__home-path">{home.sessions_dir}</span>
                  </span>
                  <span className="home-selector__open">Open →</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

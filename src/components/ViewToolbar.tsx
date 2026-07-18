import type { ViewState } from "../../shared/types";
import { IoMdSettings } from "react-icons/io";

interface ViewToolbarProps {
  view: ViewState;
  hasSession: boolean;
  activeHomeName: string | null;
  canSwitchHomes: boolean;
  canOpenSettings: boolean;
  onGoToSessions: () => void;
  onSwitchHomes: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onOpenSettings: () => void;
}

function scrollContent(to: "top" | "bottom") {
  const el = document.querySelector(".main-content");
  if (el) el.scrollTo({ top: to === "top" ? 0 : el.scrollHeight, behavior: "smooth" });
}

export function ViewToolbar({
  view,
  hasSession,
  activeHomeName,
  canSwitchHomes,
  canOpenSettings,
  onGoToSessions,
  onSwitchHomes,
  onExpandAll,
  onCollapseAll,
  onOpenSettings,
}: ViewToolbarProps) {
  return (
    <div className="view-toolbar">
      {activeHomeName && <span className="view-toolbar__home">Home: {activeHomeName}</span>}
      {canSwitchHomes && view !== "homes" && (
        <button className="view-toolbar__btn" onClick={onSwitchHomes}>
          Switch Home
        </button>
      )}
      {view !== "picker" && view !== "homes" && hasSession && (
        <button className="view-toolbar__btn" onClick={onGoToSessions}>
          ← Sessions
        </button>
      )}
      {view !== "homes" && (
        <>
          <button className="view-toolbar__btn" onClick={onExpandAll}>
            Expand All
          </button>
          <button className="view-toolbar__btn" onClick={onCollapseAll}>
            Collapse All
          </button>
          <span className="view-toolbar__separator" />
          <button className="view-toolbar__btn" onClick={() => scrollContent("top")}>
            Top
          </button>
          <button className="view-toolbar__btn" onClick={() => scrollContent("bottom")}>
            Bottom
          </button>
        </>
      )}
      <span className="view-toolbar__spacer" />
      {canOpenSettings && (
        <button className="view-toolbar__btn" onClick={onOpenSettings} title="Settings (,) ">
          <IoMdSettings />
        </button>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { ViewState, CodexHome, CodexSessionInfo, CodexToolCall } from "../shared/types";
import { useSession } from "./hooks/useSession";
import { usePicker } from "./hooks/usePicker";
import { useCodexHomes } from "./hooks/useCodexHomes";
import { useToggleSet } from "./hooks/useToggleSet";
import { ThemeContext, useTheme } from "./hooks/useTheme";
import { useKeyboard } from "./hooks/useKeyboard";
import { SidebarTree } from "./components/SidebarTree";
import { SessionPicker } from "./components/SessionPicker";
import { TurnList } from "./components/TurnList";
import { TurnDetail } from "./components/TurnDetail";
import { WorkerPanel } from "./components/WorkerPanel";
import { InfoBar } from "./components/InfoBar";
import { KeybindBar } from "./components/KeybindBar";
import { ViewToolbar } from "./components/ViewToolbar";
import { ResizeHandle } from "./components/ResizeHandle";
import { SettingsModal } from "./components/SettingsModal";
import { CodexHomeSelector } from "./components/CodexHomeSelector";
import { readShareRoute, replaceShareRoute } from "./lib/shareRoute";

function findToolByCallId(tools: CodexToolCall[], callId: string): CodexToolCall | null {
  for (const tool of tools) {
    if (tool.call_id === callId) return tool;
    const childTurns = tool.worker_session?.turns ?? [];
    for (const turn of childTurns) {
      const found = findToolByCallId(turn.tool_calls, callId);
      if (found) return found;
    }
  }
  return null;
}

export function App() {
  const initialShareRoute = useRef(readShareRoute());
  const { theme, toggleTheme } = useTheme();
  const [view, setView] = useState<ViewState>("homes");
  const [selectedTurn, setSelectedTurn] = useState(0);
  const [pickerSelected, setPickerSelected] = useState(0);
  const [showKeybinds, setShowKeybinds] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(200);
  const [showSettings, setShowSettings] = useState(false);
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());
  const [workerPanelWidth, setWorkerPanelWidth] = useState(380);
  const [workerPanelCallId, setWorkerPanelCallId] = useState<string | null>(null);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(
    initialShareRoute.current.sessionId,
  );

  const session = useSession();
  const picker = usePicker();
  const codexHomes = useCodexHomes();
  const {
    set: expandedTools,
    toggle: toggleTool,
    clear: clearTools,
    addAll: addAllTools,
  } = useToggleSet();

  const { loadSession, resetSession } = session;
  const { discoverSessions, resetPicker, updateSessionOngoing } = picker;
  const {
    selectHome,
    clearActiveHome,
    discoverHomes: fetchHomes,
    setSelectedIndex: setHomeSelectedIndex,
  } = codexHomes;

  const resetSourceUi = useCallback(() => {
    setSelectedTurn(0);
    setPickerSelected(0);
    setCollapsedDates(new Set());
    setWorkerPanelCallId(null);
    clearTools();
  }, [clearTools]);

  const handleSelectHome = useCallback(
    async (home: CodexHome, linkedSessionId: string | null = null) => {
      await Promise.all([resetSession(), resetPicker()]);
      resetSourceUi();
      setPendingSessionId(linkedSessionId);
      selectHome(home);
      replaceShareRoute({ homeId: home.id, sessionId: linkedSessionId });
      setView("picker");
      await discoverSessions(home.sessions_dir);
    },
    [discoverSessions, resetPicker, resetSession, resetSourceUi, selectHome],
  );

  const discoverHomes = useCallback(
    async (autoSelectSingle: boolean) => {
      const response = await fetchHomes();
      if (!response) return;

      const linkedHome = initialShareRoute.current.homeId
        ? response.homes.find((home) => home.id === initialShareRoute.current.homeId)
        : null;
      if (linkedHome) {
        await handleSelectHome(linkedHome, initialShareRoute.current.sessionId);
      } else if (autoSelectSingle && response.homes.length === 1) {
        await handleSelectHome(response.homes[0], initialShareRoute.current.sessionId);
      } else {
        setView("homes");
      }
    },
    [fetchHomes, handleSelectHome],
  );

  // Existing single-home deployments are auto-selected; multi-home
  // deployments stop here until the browser chooses a source.
  const discoveredRef = useRef(false);
  useEffect(() => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    void discoverHomes(true);
  }, [discoverHomes]);

  const handleSwitchHomes = useCallback(async () => {
    await Promise.all([resetSession(), resetPicker()]);
    resetSourceUi();
    clearActiveHome();
    setPendingSessionId(null);
    replaceShareRoute({ homeId: null, sessionId: null });
    setView("homes");
    await fetchHomes();
  }, [clearActiveHome, fetchHomes, resetPicker, resetSession, resetSourceUi]);

  // Sync session watcher ongoing status into picker
  useEffect(() => {
    if (session.sessionPath) {
      updateSessionOngoing(session.sessionPath, session.session?.is_ongoing ?? false);
    }
  }, [session.sessionPath, session.session?.is_ongoing, updateSessionOngoing]);

  const handleSelectSession = useCallback(
    (info: CodexSessionInfo) => {
      setPendingSessionId(null);
      replaceShareRoute({ homeId: codexHomes.activeHome?.id ?? null, sessionId: info.id });
      void loadSession(info.path);
      setView("list");
      setSelectedTurn(0);
      clearTools();
    },
    [loadSession, clearTools, codexHomes.activeHome?.id],
  );

  useEffect(() => {
    if (
      !pendingSessionId ||
      !codexHomes.activeHome ||
      picker.loading ||
      picker.sessionsDir !== codexHomes.activeHome.sessions_dir
    ) {
      return;
    }

    const linkedSession = picker.allSessions.find((item) => item.id === pendingSessionId);
    if (linkedSession) handleSelectSession(linkedSession);
  }, [
    pendingSessionId,
    codexHomes.activeHome,
    picker.loading,
    picker.sessionsDir,
    picker.allSessions,
    handleSelectSession,
  ]);

  const handleOpenDetail = useCallback((index: number) => {
    setSelectedTurn(index);
    setView("detail");
  }, []);

  const handleToggleDate = useCallback((dateGroup: string) => {
    setCollapsedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateGroup)) next.delete(dateGroup);
      else next.add(dateGroup);
      return next;
    });
  }, []);

  const turns = session.session?.turns ?? [];
  const selectedTurnData = turns[selectedTurn];
  const workerPanelTool = useMemo(() => {
    if (!workerPanelCallId || !selectedTurnData) return null;
    return findToolByCallId(selectedTurnData.tool_calls, workerPanelCallId);
  }, [selectedTurnData, workerPanelCallId]);

  const expandAll = useCallback(() => {
    if (view === "detail") {
      const currentTurns = session.session?.turns ?? [];
      if (currentTurns[selectedTurn]) {
        addAllTools(currentTurns[selectedTurn].tool_calls.map((_, i) => i));
      }
    }
  }, [view, session.session, selectedTurn, addAllTools]);

  const collapseAll = useCallback(() => clearTools(), [clearTools]);

  const goToSessions = useCallback(() => {
    setView("picker");
    replaceShareRoute({ homeId: codexHomes.activeHome?.id ?? null, sessionId: null });
  }, [codexHomes.activeHome?.id]);

  const closeWorkerPanel = useCallback(() => setWorkerPanelCallId(null), []);

  const handleOpenWorkerPanel = useCallback((tool: CodexToolCall) => {
    if (!tool.worker_session) return;
    setWorkerPanelCallId((current) => (current === tool.call_id ? null : tool.call_id));
  }, []);

  useEffect(() => {
    if (view !== "detail") {
      closeWorkerPanel();
      return;
    }
    if (workerPanelCallId && !workerPanelTool?.worker_session) {
      closeWorkerPanel();
    }
  }, [view, workerPanelCallId, workerPanelTool?.worker_session, closeWorkerPanel]);

  // Keyboard navigation
  useKeyboard({
    j: () => {
      if (view === "homes" && codexHomes.homes.length > 0) {
        setHomeSelectedIndex(Math.min(codexHomes.selectedIndex + 1, codexHomes.homes.length - 1));
      }
      if (view === "list") setSelectedTurn((i) => Math.min(i + 1, turns.length - 1));
      if (view === "picker") setPickerSelected((i) => Math.min(i + 1, picker.sessions.length - 1));
    },
    k: () => {
      if (view === "homes") {
        setHomeSelectedIndex(Math.max(codexHomes.selectedIndex - 1, 0));
      }
      if (view === "list") setSelectedTurn((i) => Math.max(i - 1, 0));
      if (view === "picker") setPickerSelected((i) => Math.max(i - 1, 0));
    },
    Enter: () => {
      if (view === "homes" && codexHomes.homes[codexHomes.selectedIndex]) {
        void handleSelectHome(codexHomes.homes[codexHomes.selectedIndex]);
      }
      if (view === "list" && turns.length > 0) handleOpenDetail(selectedTurn);
      if (view === "picker" && picker.sessions.length > 0)
        handleSelectSession(picker.sessions[pickerSelected]);
    },
    Escape: () => {
      if (workerPanelCallId) {
        closeWorkerPanel();
        return;
      }
      if (view === "detail") setView("list");
      else if (view === "list") goToSessions();
    },
    q: () => {
      if (workerPanelCallId) {
        closeWorkerPanel();
        return;
      }
      if (view === "detail") setView("list");
      else if (view === "list") goToSessions();
    },
    ",": () => {
      if (!codexHomes.multiHomeEnabled) setShowSettings(true);
    },
    "?": () => setShowKeybinds((p) => !p),
  });

  return (
    <ThemeContext.Provider value={theme}>
      <div className="app">
        {/* Info bar — only when session loaded and not in picker */}
        {session.sessionPath && view !== "picker" && session.session && (
          <InfoBar session={session.session} />
        )}

        {/* View toolbar */}
        <ViewToolbar
          view={view}
          hasSession={!!session.sessionPath}
          activeHomeName={codexHomes.activeHome?.name ?? null}
          canSwitchHomes={codexHomes.homes.length > 1}
          canOpenSettings={view !== "homes" && !codexHomes.multiHomeEnabled}
          onGoToSessions={goToSessions}
          onSwitchHomes={() => void handleSwitchHomes()}
          onExpandAll={expandAll}
          onCollapseAll={collapseAll}
          onOpenSettings={() => setShowSettings(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <div className="app-body">
          {/* Left sidebar */}
          {view !== "homes" && (
            <>
              <div className="app__sidebar" style={{ width: sidebarWidth, minWidth: sidebarWidth }}>
                <div className="app__sidebar-header">
                  <span className="app__sidebar-title">SESSIONS</span>
                </div>
                <SidebarTree
                  sessions={picker.allSessions}
                  selectedPath={session.sessionPath || null}
                  collapsedDates={collapsedDates}
                  onSelectSession={handleSelectSession}
                  onToggleDate={handleToggleDate}
                />
              </div>

              <ResizeHandle onResize={setSidebarWidth} />
            </>
          )}

          {/* Main content */}
          <div className="main-content">
            {view === "homes" && (
              <CodexHomeSelector
                homes={codexHomes.homes}
                loading={codexHomes.loading}
                error={codexHomes.error}
                selectedIndex={codexHomes.selectedIndex}
                onSelect={(home) => void handleSelectHome(home)}
                onRetry={() => void discoverHomes(true)}
              />
            )}

            {view === "picker" && (
              <SessionPicker
                sessions={picker.sessions}
                loading={picker.loading}
                searchQuery={picker.searchQuery}
                selectedIndex={pickerSelected}
                onSelectSession={handleSelectSession}
                onSearchChange={picker.setSearchQuery}
              />
            )}

            {view === "list" && session.loading && (
              <div className="app__loading">Loading session…</div>
            )}

            {view === "list" && !session.loading && session.session && (
              <TurnList
                turns={turns}
                selectedIndex={selectedTurn}
                onSelectTurn={(i) => {
                  setSelectedTurn(i);
                  setView("detail");
                }}
              />
            )}

            {view === "detail" && turns[selectedTurn] && (
              <TurnDetail
                turn={turns[selectedTurn]}
                expanded={expandedTools}
                onToggle={toggleTool}
                onBack={() => setView("list")}
                openWorkerCallId={workerPanelCallId}
                onOpenWorkerPanel={handleOpenWorkerPanel}
              />
            )}
          </div>

          {view === "detail" && workerPanelTool?.worker_session && (
            <>
              <ResizeHandle onResize={setWorkerPanelWidth} side="right" />
              <WorkerPanel
                session={workerPanelTool.worker_session}
                sourceTool={workerPanelTool}
                activeWorkerCallId={workerPanelCallId}
                style={{ flex: `0 0 ${workerPanelWidth}px`, maxWidth: workerPanelWidth }}
                onClose={closeWorkerPanel}
                onOpenWorker={handleOpenWorkerPanel}
              />
            </>
          )}
        </div>

        {/* Bottom keybind bar */}
        <KeybindBar
          view={view}
          showHints={showKeybinds}
          onToggle={() => setShowKeybinds((p) => !p)}
        />

        {showSettings && !codexHomes.multiHomeEnabled && (
          <SettingsModal
            onClose={() => setShowSettings(false)}
            onSaved={(dir) => {
              discoverSessions(dir);
            }}
          />
        )}
      </div>
    </ThemeContext.Provider>
  );
}

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CodexSessionInfo } from "../shared/types";
import { App } from "./App";

const {
  invokeMock,
  loadSessionMock,
  resetSessionMock,
  resetPickerMock,
  discoverSessionsMock,
  setSearchQueryMock,
  pickerState,
} = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  loadSessionMock: vi.fn(),
  resetSessionMock: vi.fn(),
  resetPickerMock: vi.fn(),
  discoverSessionsMock: vi.fn(),
  setSearchQueryMock: vi.fn(),
  pickerState: {
    sessions: [] as CodexSessionInfo[],
    sessionsDir: "",
  },
}));

vi.mock("./lib/invoke", () => ({ invoke: invokeMock }));
vi.mock("./hooks/useSession", () => ({
  useSession: () => ({
    session: null,
    loading: false,
    sessionPath: "",
    loadSession: loadSessionMock,
    resetSession: resetSessionMock,
  }),
}));
vi.mock("./hooks/usePicker", () => ({
  usePicker: () => ({
    sessions: pickerState.sessions,
    allSessions: pickerState.sessions,
    loading: false,
    searchQuery: "",
    sessionsDir: pickerState.sessionsDir,
    setSearchQuery: setSearchQueryMock,
    discoverSessions: discoverSessionsMock,
    resetPicker: resetPickerMock,
    updateSessionOngoing: vi.fn(),
  }),
}));

const homesResponse = {
  homes: [
    { id: "discord", name: "discord-test", sessions_dir: "/discord/sessions" },
    { id: "slack", name: "slack-test", sessions_dir: "/slack/sessions" },
  ],
  multi_home_enabled: true,
};

function makeSession(id: string, path: string): CodexSessionInfo {
  return {
    id,
    path,
    cwd: "/workspace/project",
    git_branch: null,
    originator: null,
    model: null,
    cli_version: null,
    thread_name: "Shareable session",
    turn_count: 1,
    start_time: "2026-07-24T00:00:00Z",
    end_time: null,
    total_tokens: null,
    is_ongoing: false,
    is_external_worker: false,
    is_inline_worker: false,
    is_headless: false,
    is_archived: false,
    worker_nickname: null,
    worker_role: null,
    spawned_worker_ids: [],
    date_group: "2026-07-24",
    ai_title: null,
    approval_mode: null,
  };
}

describe("App Codex home flow", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    document.documentElement.style.colorScheme = "";
    invokeMock.mockReset().mockResolvedValue(homesResponse);
    loadSessionMock.mockReset().mockResolvedValue(undefined);
    resetSessionMock.mockReset().mockResolvedValue(undefined);
    resetPickerMock.mockReset().mockResolvedValue(undefined);
    discoverSessionsMock.mockReset().mockResolvedValue(undefined);
    pickerState.sessions = [];
    pickerState.sessionsDir = "";
  });

  it("defaults to dark mode and persists theme changes", async () => {
    render(<App />);

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    fireEvent.click(screen.getByRole("button", { name: "Switch to light mode" }));

    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(localStorage.getItem("codex-trace-theme")).toBe("light");
    expect(screen.getByRole("button", { name: "Switch to dark mode" })).toBeInTheDocument();
  });

  it("restores a persisted light theme", () => {
    localStorage.setItem("codex-trace-theme", "light");

    render(<App />);

    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(screen.getByRole("button", { name: "Switch to dark mode" })).toBeInTheDocument();
  });

  it("auto-selects the existing single-home deployment", async () => {
    invokeMock.mockResolvedValue({
      homes: [{ id: "default", name: "Default", sessions_dir: "/default/sessions" }],
      multi_home_enabled: false,
    });

    render(<App />);

    await waitFor(() => expect(discoverSessionsMock).toHaveBeenCalledWith("/default/sessions"));
    expect(screen.queryByText("Choose a Codex home")).not.toBeInTheDocument();
    expect(screen.getByTitle("Settings (,)")).toBeInTheDocument();
  });

  it("writes the selected session into the browser URL", async () => {
    invokeMock.mockResolvedValue({
      homes: [{ id: "default", name: "Default", sessions_dir: "/default/sessions" }],
      multi_home_enabled: false,
    });
    const linkedSession = makeSession("session-123", "/default/sessions/rollout.jsonl");
    pickerState.sessions = [linkedSession];

    render(<App />);

    const labels = await screen.findAllByText("Shareable session");
    const pickerLabel = labels.find((label) => label.classList.contains("picker__session-preview"));
    fireEvent.click(pickerLabel!.closest(".picker__session")!);

    expect(loadSessionMock).toHaveBeenCalledWith(linkedSession.path);
    expect(window.location.search).toBe("?home=default&session=session-123");
  });

  it("opens a session directly from a copied multi-home URL", async () => {
    const linkedSession = makeSession("session-123", "/slack/sessions/rollout.jsonl");
    pickerState.sessions = [linkedSession];
    pickerState.sessionsDir = "/slack/sessions";
    window.history.replaceState(null, "", "/?home=slack&session=session-123");

    render(<App />);

    await waitFor(() => expect(discoverSessionsMock).toHaveBeenCalledWith("/slack/sessions"));
    await waitFor(() => expect(loadSessionMock).toHaveBeenCalledWith(linkedSession.path));
    expect(screen.queryByText("Choose a Codex home")).not.toBeInTheDocument();
  });

  it("defers sessions, supports keyboard selection, and cleans up when switching", async () => {
    render(<App />);

    expect(await screen.findByText("Choose a Codex home")).toBeInTheDocument();
    expect(discoverSessionsMock).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: "j" });
    expect(screen.getByRole("option", { name: /slack-test/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    fireEvent.keyDown(window, { key: "Enter" });

    await waitFor(() => expect(discoverSessionsMock).toHaveBeenCalledWith("/slack/sessions"));
    expect(resetSessionMock).toHaveBeenCalledOnce();
    expect(resetPickerMock).toHaveBeenCalledOnce();
    expect(screen.queryByText("Choose a Codex home")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Settings (,)")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Switch Home" }));
    await waitFor(() => expect(screen.getByText("Choose a Codex home")).toBeInTheDocument());
    expect(resetSessionMock).toHaveBeenCalledTimes(2);
    expect(resetPickerMock).toHaveBeenCalledTimes(2);
    expect(invokeMock).toHaveBeenCalledTimes(2);
  });
});

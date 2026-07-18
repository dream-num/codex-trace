import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const { invokeMock, resetSessionMock, resetPickerMock, discoverSessionsMock, setSearchQueryMock } =
  vi.hoisted(() => ({
    invokeMock: vi.fn(),
    resetSessionMock: vi.fn(),
    resetPickerMock: vi.fn(),
    discoverSessionsMock: vi.fn(),
    setSearchQueryMock: vi.fn(),
  }));

vi.mock("./lib/invoke", () => ({ invoke: invokeMock }));
vi.mock("./hooks/useSession", () => ({
  useSession: () => ({
    session: null,
    loading: false,
    sessionPath: "",
    loadSession: vi.fn(),
    resetSession: resetSessionMock,
  }),
}));
vi.mock("./hooks/usePicker", () => ({
  usePicker: () => ({
    sessions: [],
    allSessions: [],
    loading: false,
    searchQuery: "",
    sessionsDir: "",
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

describe("App Codex home flow", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    document.documentElement.style.colorScheme = "";
    invokeMock.mockReset().mockResolvedValue(homesResponse);
    resetSessionMock.mockReset().mockResolvedValue(undefined);
    resetPickerMock.mockReset().mockResolvedValue(undefined);
    discoverSessionsMock.mockReset().mockResolvedValue(undefined);
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

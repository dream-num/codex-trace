import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CodexSessionInfo } from "../../shared/types";
import { usePicker } from "./usePicker";

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));
vi.mock("../lib/invoke", () => ({ invoke: invokeMock }));
vi.mock("./useTauriEvent", () => ({ useTauriEvent: vi.fn() }));

function session(id: string, path: string): CodexSessionInfo {
  return {
    id,
    path,
    cwd: null,
    git_branch: null,
    originator: null,
    model: null,
    cli_version: null,
    thread_name: null,
    turn_count: 0,
    start_time: "",
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
    date_group: "",
    ai_title: null,
    approval_mode: null,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("usePicker", () => {
  beforeEach(() => invokeMock.mockReset());

  it("ignores a late response from the previously selected home", async () => {
    const discord = deferred<CodexSessionInfo[]>();
    const slack = deferred<CodexSessionInfo[]>();
    invokeMock.mockImplementation((command: string, args?: { sessionsDir?: string }) => {
      if (command === "list_sessions") {
        return args?.sessionsDir === "/discord" ? discord.promise : slack.promise;
      }
      return Promise.resolve();
    });
    const { result } = renderHook(() => usePicker());

    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = result.current.discoverSessions("/discord");
      second = result.current.discoverSessions("/slack");
    });
    await act(async () => slack.resolve([session("slack", "/slack/rollout.jsonl")]));
    await second;
    await act(async () => discord.resolve([session("discord", "/discord/rollout.jsonl")]));
    await first;

    expect(result.current.sessionsDir).toBe("/slack");
    expect(result.current.sessions.map((item) => item.id)).toEqual(["slack"]);
  });

  it("resets picker state and stops its watcher", async () => {
    invokeMock.mockResolvedValue([]);
    const { result } = renderHook(() => usePicker());
    await act(async () => result.current.discoverSessions("/discord"));
    act(() => result.current.setSearchQuery("old query"));

    await act(async () => result.current.resetPicker());

    expect(result.current.sessionsDir).toBe("");
    expect(result.current.searchQuery).toBe("");
    expect(invokeMock).toHaveBeenCalledWith("unwatch_picker");
  });
});

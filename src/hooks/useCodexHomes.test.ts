import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CodexHomesResponse } from "../../shared/types";
import { useCodexHomes } from "./useCodexHomes";

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));
vi.mock("../lib/invoke", () => ({ invoke: invokeMock }));

const multipleHomes: CodexHomesResponse = {
  homes: [
    { id: "discord", name: "discord", sessions_dir: "/app/discord/home/.codex/sessions" },
    { id: "slack", name: "slack", sessions_dir: "/app/slack/home/.codex/sessions" },
  ],
  multi_home_enabled: true,
};

describe("useCodexHomes", () => {
  beforeEach(() => invokeMock.mockReset());

  it("discovers multiple homes without selecting one", async () => {
    invokeMock.mockResolvedValue(multipleHomes);
    const { result } = renderHook(() => useCodexHomes());

    await act(async () => {
      expect(await result.current.discoverHomes()).toEqual(multipleHomes);
    });

    expect(invokeMock).toHaveBeenCalledWith("list_codex_homes");
    expect(result.current.homes).toEqual(multipleHomes.homes);
    expect(result.current.activeHome).toBeNull();
    expect(result.current.multiHomeEnabled).toBe(true);
  });

  it("surfaces an error and supports retry", async () => {
    invokeMock.mockRejectedValueOnce(new Error("bad root")).mockResolvedValueOnce(multipleHomes);
    const { result } = renderHook(() => useCodexHomes());

    await act(async () => {
      expect(await result.current.discoverHomes()).toBeNull();
    });
    expect(result.current.error).toContain("bad root");

    await act(async () => {
      await result.current.discoverHomes();
    });
    expect(result.current.error).toBe("");
    expect(result.current.homes).toHaveLength(2);
  });

  it("keeps selections local to each hook instance", () => {
    const first = renderHook(() => useCodexHomes());
    const second = renderHook(() => useCodexHomes());

    act(() => first.result.current.selectHome(multipleHomes.homes[0]));

    expect(first.result.current.activeHome?.id).toBe("discord");
    expect(second.result.current.activeHome).toBeNull();
  });
});

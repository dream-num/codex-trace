import { beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "./invoke";

describe("web invoke adapter", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("maps list_codex_homes to the homes endpoint", async () => {
    const response = { homes: [], multi_home_enabled: true };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(response),
    } as Response);

    await expect(invoke("list_codex_homes")).resolves.toEqual(response);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/codex-homes$/),
      expect.objectContaining({
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      }),
    );
  });
});

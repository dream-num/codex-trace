import { describe, expect, it } from "vitest";
import { buildShareUrl, readShareRoute } from "./shareRoute";

describe("shareRoute", () => {
  it("reads a linked home and session", () => {
    expect(readShareRoute("?home=team%20one&session=session-123")).toEqual({
      homeId: "team one",
      sessionId: "session-123",
    });
  });

  it("adds share parameters without dropping deployment parameters or fragments", () => {
    expect(
      buildShareUrl("https://trace.example.test/?type=2#details", {
        homeId: "default",
        sessionId: "session-123",
      }),
    ).toBe("https://trace.example.test/?type=2&home=default&session=session-123#details");
  });

  it("removes stale share parameters", () => {
    expect(
      buildShareUrl("https://trace.example.test/?home=old&session=old&type=2", {
        homeId: "new",
        sessionId: null,
      }),
    ).toBe("https://trace.example.test/?home=new&type=2");
  });
});

import { describe, it, expect, vi, afterEach } from "vitest";
import { emotionApi } from "../emotionApi";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

afterEach(() => vi.unstubAllGlobals());

describe("emotionApi.reportCrisis", () => {
  it("posts the alert for this interview and reports that the therapist was told", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => json({ status: "success", data: { notified: true } }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await emotionApi.reportCrisis("tok")).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toContain("/api/emotion/token/tok/crisis-alert");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST" });
  });

  it("is false when the server couldn't notify", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ status: "success", data: { notified: false } })));
    expect(await emotionApi.reportCrisis("tok")).toBe(false);
  });

  it("never throws (offline, server error)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    expect(await emotionApi.reportCrisis("tok")).toBe(false);
    vi.stubGlobal("fetch", vi.fn(async () => json({ message: "Too many" }, 429)));
    expect(await emotionApi.reportCrisis("tok")).toBe(false);
  });
});

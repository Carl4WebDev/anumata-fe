import { describe, it, expect, vi, afterEach } from "vitest";
import { translateQuestion } from "../translateApi";

function mockFetchOnce(impl: () => Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(impl));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("translateQuestion", () => {
  it("returns the translated text on success", async () => {
    mockFetchOnce(async () =>
      new Response(
        JSON.stringify({ status: "ok", data: { ok: true, translated: "Kumusta ka ngayon?" } }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    expect(await translateQuestion("How are you doing today?", "tl")).toBe("Kumusta ka ngayon?");
  });

  it("returns null when the translator reports ok:false — interview falls back to English", async () => {
    mockFetchOnce(async () =>
      new Response(JSON.stringify({ status: "ok", data: { ok: false, translated: "" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(await translateQuestion("How are you doing today?", "ceb")).toBeNull();
  });

  it("returns null on network failure", async () => {
    mockFetchOnce(async () => {
      throw new Error("network down");
    });
    expect(await translateQuestion("How are you doing today?", "tl")).toBeNull();
  });

  it("returns null on HTTP error", async () => {
    mockFetchOnce(async () =>
      new Response(JSON.stringify({ detail: "Ollama exploded" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(await translateQuestion("How are you doing today?", "tl")).toBeNull();
  });

  it("returns null when translated text is missing", async () => {
    mockFetchOnce(async () =>
      new Response(JSON.stringify({ status: "ok", data: { ok: true } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(await translateQuestion("How are you doing today?", "tl")).toBeNull();
  });
});

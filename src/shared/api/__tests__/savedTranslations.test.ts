import { describe, test, expect, vi, afterEach } from "vitest";
import { fetchSavedTranslations, translateForInterview } from "../translateApi";

afterEach(() => vi.unstubAllGlobals());

const respond = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });

describe("fetchSavedTranslations", () => {
  test("returns the saved translations for the interview and language", async () => {
    const fetchMock = respond(200, { data: { translations: { "How are you?": "Kumusta ka?" } } });
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchSavedTranslations("tok 1", "tl")).toEqual({ "How are you?": "Kumusta ka?" });
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/translations\/interview\/tok%201\?lang=tl$/);
  });

  test("any failure gives no translations (the room asks in English)", async () => {
    vi.stubGlobal("fetch", respond(404, { message: "not found" }));
    expect(await fetchSavedTranslations("tok", "ceb")).toEqual({});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await fetchSavedTranslations("tok", "ceb")).toEqual({});
  });
});

describe("translateForInterview", () => {
  test("posts the question and returns the translation", async () => {
    const fetchMock = respond(200, { data: { translated: "Kumusta ka?", source: "machine" } });
    vi.stubGlobal("fetch", fetchMock);
    expect(await translateForInterview("tok", "How are you?", "tl")).toBe("Kumusta ka?");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ text: "How are you?", lang: "tl" });
  });

  test("no translation when the AI couldn't make one", async () => {
    vi.stubGlobal("fetch", respond(200, { data: { translated: null, source: null } }));
    expect(await translateForInterview("tok", "How are you?", "ceb")).toBeNull();
  });
});

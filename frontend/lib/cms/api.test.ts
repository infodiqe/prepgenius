import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCmsPage, fetchPublishedCmsPages } from "./api";

afterEach(() => vi.restoreAllMocks());

describe("fetchCmsPage", () => {
  it("returns the page on a 200 response", async () => {
    const page = { slug: "about-us", blocks: [] };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => page }),
    );
    const result = await fetchCmsPage("about-us", "as");
    expect(result).toEqual(page);
  });

  it("returns null on a 404 (unknown / unpublished)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    expect(await fetchCmsPage("missing", "as")).toBeNull();
  });

  it("returns null when the request throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    expect(await fetchCmsPage("about-us", "as")).toBeNull();
  });
});

describe("fetchPublishedCmsPages", () => {
  it("returns the list on success", async () => {
    const list = [{ slug: "a", locale: "as", updated_at: "x" }];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => list }),
    );
    expect(await fetchPublishedCmsPages()).toEqual(list);
  });

  it("returns [] on error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    expect(await fetchPublishedCmsPages()).toEqual([]);
  });
});

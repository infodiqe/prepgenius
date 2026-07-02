// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { ApiError } from "@/lib/errors";

function mockFetch(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("apiRequest", () => {
  it("returns parsed JSON on success", async () => {
    mockFetch({ ok: true, status: 200, json: async () => ({ detail: "ok" }) });
    await expect(apiRequest("/auth/login/")).resolves.toEqual({ detail: "ok" });
  });

  it("returns undefined for 204 No Content", async () => {
    mockFetch({ ok: true, status: 204, json: async () => ({}) });
    await expect(apiRequest("/auth/logout/")).resolves.toBeUndefined();
  });

  it("throws an ApiError carrying status and field-error payload", async () => {
    const payload = { email: ["A user with this email already exists."] };
    mockFetch({ ok: false, status: 400, json: async () => payload });

    const err = await apiRequest("/auth/register/", {
      method: "POST",
      body: {},
    }).catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(400);
    expect((err as ApiError).payload).toEqual(payload);
  });

  it("uses the payload detail as the (legacy-compatible) message", async () => {
    mockFetch({
      ok: false,
      status: 401,
      json: async () => ({ detail: "Invalid credentials." }),
    });

    const err = (await apiRequest("/auth/login/", { method: "POST" }).catch(
      (e) => e,
    )) as ApiError;

    expect(err).toBeInstanceOf(Error); // backward-compatible with e.message callers
    expect(err.message).toBe("Invalid credentials.");
    expect(err.status).toBe(401);
  });

  // ── RC-02A: automatic access-token refresh ────────────────────────────────

  it("refreshes once on 401 then retries the original request", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) }) // original → expired
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) }) // refresh
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: 1 }) }); // retry
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest("/dashboard/")).resolves.toEqual({ data: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1][0])).toContain("/auth/token/refresh/");
  });

  it("triggers only one refresh for concurrent 401s (single-flight)", async () => {
    let refreshCount = 0;
    let reqCount = 0;
    const fetchMock = vi.fn((url: string) => {
      if (String(url).includes("/auth/token/refresh/")) {
        refreshCount += 1;
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
      }
      reqCount += 1;
      // The first two hits (the two originals) are expired; retries succeed.
      const expired = reqCount <= 2;
      return Promise.resolve({
        ok: !expired,
        status: expired ? 401 : 200,
        json: async () => ({}),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await Promise.all([apiRequest("/a/"), apiRequest("/b/")]);
    expect(refreshCount).toBe(1);
  });

  it("redirects to /login?next and throws when refresh fails", async () => {
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { pathname: "/dashboard", search: "", assign },
    });
    try {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) }) // original
        .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) }); // refresh fails
      vi.stubGlobal("fetch", fetchMock);

      await expect(apiRequest("/dashboard/")).rejects.toBeInstanceOf(ApiError);
      expect(assign).toHaveBeenCalledTimes(1);
      expect(String(assign.mock.calls[0][0])).toContain("/login?next=");
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: original,
      });
    }
  });

  it("does NOT redirect on refresh failure when skipAuthRedirect is set", async () => {
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { pathname: "/", search: "", assign },
    });
    try {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) })
        .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });
      vi.stubGlobal("fetch", fetchMock);

      await expect(
        apiRequest("/auth/profile/", { skipAuthRedirect: true }),
      ).rejects.toBeInstanceOf(ApiError);
      expect(assign).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: original,
      });
    }
  });

  it("does NOT refresh on a 401 from a session-lifecycle endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: "Invalid credentials." }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      apiRequest("/auth/login/", { method: "POST" }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1); // no refresh attempt
  });
});

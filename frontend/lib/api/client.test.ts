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
});

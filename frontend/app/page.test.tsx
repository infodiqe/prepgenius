import { afterEach, describe, expect, it, vi } from "vitest";

const spies = vi.hoisted(() => ({
  redirect: vi.fn(),
  get: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: spies.get }),
}));
vi.mock("next/navigation", () => ({
  redirect: spies.redirect,
}));
// Avoid rendering the full landing tree — this test only asserts routing.
vi.mock("@/features/marketing/LandingPage", () => ({
  LandingPage: () => null,
}));

import RootPage from "./page";

afterEach(() => {
  spies.redirect.mockReset();
  spies.get.mockReset();
});

describe("RootPage", () => {
  it("redirects authenticated visitors to the dashboard", async () => {
    spies.get.mockReturnValue({ value: "token-abc" });
    await RootPage();
    expect(spies.get).toHaveBeenCalledWith("access_token");
    expect(spies.redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("renders the landing page for unauthenticated visitors", async () => {
    spies.get.mockReturnValue(undefined);
    const result = await RootPage();
    expect(spies.redirect).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });
});

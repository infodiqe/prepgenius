import { afterEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/api/client", () => ({ apiRequest: vi.fn() }));
vi.mock("../content/contentService", () => ({
  listExams: vi.fn(),
}));

import { apiRequest } from "@/lib/api/client";
import {
  getOpsUser,
  getOpsUserSummary,
  listOpsUsers,
  userDisplayName,
  rolesLabel,
  formatDate,
  formatReadiness,
} from "./userService";

afterEach(() => vi.clearAllMocks());

describe("listOpsUsers — server pagination/search/filters", () => {
  it("requests the ops users endpoint and maps cursor tokens from next/previous", async () => {
    (apiRequest as Mock).mockResolvedValue({
      next: "http://testserver/api/v1/ops/users/?cursor=NEXT123",
      previous: null,
      results: [{ id: "u-1" }],
    });
    const page = await listOpsUsers();
    expect(apiRequest).toHaveBeenCalledWith("/ops/users/");
    expect(page.results).toEqual([{ id: "u-1" }]);
    expect(page.nextCursor).toBe("NEXT123");
    expect(page.prevCursor).toBeNull();
  });

  it("forwards search + filters + cursor as query params (omitting empties)", async () => {
    (apiRequest as Mock).mockResolvedValue({
      next: null,
      previous: null,
      results: [],
    });
    await listOpsUsers({
      search: "amla",
      role: "support",
      status: "active",
      target_exam: "exam-1",
      cursor: "CUR",
    });
    expect(apiRequest).toHaveBeenCalledWith(
      "/ops/users/?search=amla&role=support&status=active&target_exam=exam-1&cursor=CUR",
    );
  });

  it("omits blank params", async () => {
    (apiRequest as Mock).mockResolvedValue({
      next: null,
      previous: null,
      results: [],
    });
    await listOpsUsers({ search: "", role: "", status: "" });
    expect(apiRequest).toHaveBeenCalledWith("/ops/users/");
  });
});

describe("getOpsUser / getOpsUserSummary", () => {
  it("getOpsUser calls the detail endpoint", async () => {
    (apiRequest as Mock).mockResolvedValue({ id: "u-1" });
    await getOpsUser("u-1");
    expect(apiRequest).toHaveBeenCalledWith("/ops/users/u-1/");
  });

  it("getOpsUserSummary calls the summary endpoint", async () => {
    (apiRequest as Mock).mockResolvedValue({ total_attempts: 0 });
    await getOpsUserSummary("u-1");
    expect(apiRequest).toHaveBeenCalledWith("/ops/users/u-1/summary/");
  });
});

describe("display helpers (pure)", () => {
  it("userDisplayName prefers full_name, then email, then id", () => {
    expect(
      userDisplayName({ full_name: "Amla Bora", email: "a@x", id: "1" }),
    ).toBe("Amla Bora");
    expect(userDisplayName({ full_name: " ", email: "a@x", id: "1" })).toBe(
      "a@x",
    );
    expect(userDisplayName({ full_name: "", email: "", id: "u-9" })).toBe("u-9");
  });

  it("rolesLabel joins roles or returns em dash", () => {
    expect(rolesLabel(["a", "b"])).toBe("a, b");
    expect(rolesLabel([])).toBe("—");
  });

  it("formatDate renders a date or em dash", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("nope")).toBe("—");
    expect(formatDate("2026-01-15T08:00:00Z")).toContain("2026");
  });

  it("formatReadiness normalizes a decimal string, or null when absent", () => {
    expect(formatReadiness("66.00")).toBe("66");
    expect(formatReadiness("82.5")).toBe("82.5");
    expect(formatReadiness(null)).toBeNull();
    expect(formatReadiness("")).toBeNull();
    expect(formatReadiness("abc")).toBeNull();
  });
});

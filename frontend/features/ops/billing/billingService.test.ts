import { afterEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/api/client", () => ({ apiRequest: vi.fn() }));
vi.mock("../users/userService", () => ({
  listOpsUsers: vi.fn(),
  userDisplayName: (u: { full_name?: string }) => u.full_name ?? "",
  formatDate: (s: string) => s,
}));

import { apiRequest } from "@/lib/api/client";
import { getUserCredits, adjustUserCredits } from "./billingService";

afterEach(() => vi.clearAllMocks());

describe("billingService", () => {
  it("getUserCredits calls the ops credits endpoint", async () => {
    (apiRequest as Mock).mockResolvedValue({ balance: "0.00" });
    await getUserCredits("u-1");
    expect(apiRequest).toHaveBeenCalledWith("/ops/users/u-1/credits/");
  });

  it("adjustUserCredits POSTs amount + description to the adjust endpoint", async () => {
    (apiRequest as Mock).mockResolvedValue({ balance: {}, entry: {} });
    await adjustUserCredits("u-1", { amount: "-25.00", description: "refund" });
    expect(apiRequest).toHaveBeenCalledWith("/ops/users/u-1/credits/adjust/", {
      method: "POST",
      body: { amount: "-25.00", description: "refund" },
    });
  });

  it("adjustUserCredits defaults description to empty string", async () => {
    (apiRequest as Mock).mockResolvedValue({ balance: {}, entry: {} });
    await adjustUserCredits("u-1", { amount: "5" });
    expect(apiRequest).toHaveBeenCalledWith("/ops/users/u-1/credits/adjust/", {
      method: "POST",
      body: { amount: "5", description: "" },
    });
  });
});

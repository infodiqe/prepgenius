// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { render, cleanup, screen, waitFor } from "@testing-library/react";
import { ApiError } from "@/lib/errors";
import { AnalyticsWorkspace } from "./AnalyticsWorkspace";
import {
  getOpsContent,
  getOpsCredits,
  getOpsOverview,
  getOpsReadiness,
  getOpsReview,
  type OpsContentDistribution,
  type OpsCreditAnalytics,
  type OpsOverview,
  type OpsReadinessDistribution,
  type OpsReviewAnalytics,
} from "./analyticsService";

vi.mock("./analyticsService", async (orig) => {
  const actual = await orig<typeof import("./analyticsService")>();
  return {
    ...actual,
    getOpsOverview: vi.fn(),
    getOpsReadiness: vi.fn(),
    getOpsContent: vi.fn(),
    getOpsReview: vi.fn(),
    getOpsCredits: vi.fn(),
  };
});

const overview: OpsOverview = {
  total_users: 120,
  active_users_30d: 45,
  total_attempts: 980,
  total_questions: 1500,
  approved_questions: 870,
  published_pages: 12,
  available_credits: "100.00",
  reserved_credits: "20.50",
};
const readiness: OpsReadinessDistribution = {
  bands: [
    { label: "0-20", count: 1 },
    { label: "21-40", count: 2 },
    { label: "41-60", count: 3 },
    { label: "61-80", count: 4 },
    { label: "81-100", count: 5 },
  ],
  total: 15,
};
const content: OpsContentDistribution = {
  draft: 5, in_review: 4, sme_review: 3, approved: 2, published: 1,
};
const review: OpsReviewAnalytics = {
  claimed: 7, unclaimed: 3, escalated: 2, approved_today: 9, rejected_today: 1,
};
const credits: OpsCreditAnalytics = {
  total_granted: "1000.00", total_reserved: "30.00",
  total_debited: "250.00", active_wallets: 8,
};

beforeEach(() => {
  (getOpsOverview as Mock).mockResolvedValue(overview);
  (getOpsReadiness as Mock).mockResolvedValue(readiness);
  (getOpsContent as Mock).mockResolvedValue(content);
  (getOpsReview as Mock).mockResolvedValue(review);
  (getOpsCredits as Mock).mockResolvedValue(credits);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AnalyticsWorkspace (OPS-08A — operator-wide)", () => {
  it("loads all five operator endpoints on mount (no exam gating)", async () => {
    render(<AnalyticsWorkspace />);
    expect(await screen.findByText("120")).toBeTruthy(); // overview KPI
    expect(await screen.findByText("870")).toBeTruthy(); // approved questions
    expect(getOpsOverview).toHaveBeenCalled();
    expect(getOpsReadiness).toHaveBeenCalled();
    expect(getOpsContent).toHaveBeenCalled();
    expect(getOpsReview).toHaveBeenCalled();
    expect(getOpsCredits).toHaveBeenCalled();
  });

  it("renders metrics from every operator section", async () => {
    render(<AnalyticsWorkspace />);
    expect(await screen.findByText("81-100")).toBeTruthy(); // readiness band
    expect(screen.getByText("SME Review")).toBeTruthy(); // content stage
    expect(screen.getByText("Approved today")).toBeTruthy(); // review metric
    expect(screen.getByText("1000.00")).toBeTruthy(); // credit metric
  });

  it("exposes accessible workspace regions", async () => {
    render(<AnalyticsWorkspace />);
    await screen.findByText("120");
    for (const region of [
      "Analytics filters",
      "Key metrics",
      "Readiness distribution",
      "Content pipeline",
      "Review operations",
      "Credit operations",
    ]) {
      expect(screen.getByRole("region", { name: region })).toBeTruthy();
    }
  });

  it("surfaces an unauthorized overview as a sign-in notice", async () => {
    (getOpsOverview as Mock).mockRejectedValue(new ApiError(401, {}, "x"));
    render(<AnalyticsWorkspace />);
    expect(await screen.findByText("Sign in required")).toBeTruthy();
  });

  it("surfaces a forbidden content endpoint as access denied", async () => {
    (getOpsContent as Mock).mockRejectedValue(new ApiError(403, {}, "x"));
    render(<AnalyticsWorkspace />);
    expect(await screen.findByText("Access denied")).toBeTruthy();
  });

  it("surfaces a credits error independently of other panels", async () => {
    (getOpsCredits as Mock).mockRejectedValue(new Error("boom"));
    render(<AnalyticsWorkspace />);
    expect(await screen.findByText("Could not load analytics")).toBeTruthy();
    // Other panels still render their data.
    expect(screen.getByText("120")).toBeTruthy();
  });
});

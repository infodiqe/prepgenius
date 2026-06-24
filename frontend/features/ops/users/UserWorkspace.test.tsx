// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi, type Mock } from "vitest";
import { render, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { UserWorkspace } from "./UserWorkspace";
import {
  listOpsUsers,
  getOpsUser,
  getOpsUserSummary,
  listExams,
  type OpsUserListItem,
} from "./userService";
import { ApiError } from "@/lib/errors";

vi.mock("./userService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./userService")>();
  return {
    ...actual,
    listOpsUsers: vi.fn(),
    getOpsUser: vi.fn(),
    getOpsUserSummary: vi.fn(),
    listExams: vi.fn(),
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const ROW: OpsUserListItem = {
  id: "u-1",
  email: "amla@example.com",
  full_name: "Amla Bora",
  roles: ["support"],
  status: "active",
  target_exam: { id: "exam-1", code: "CTET", name: "CTET Paper I" },
  created_at: "2026-01-15T08:00:00Z",
};

function primeList(over: Partial<Awaited<ReturnType<typeof listOpsUsers>>> = {}) {
  (listExams as Mock).mockResolvedValue([{ id: "exam-1", code: "CTET", name: "CTET" }]);
  (listOpsUsers as Mock).mockResolvedValue({
    results: [ROW],
    nextCursor: "N1",
    prevCursor: null,
    ...over,
  });
}

describe("UserWorkspace — listing & server controls", () => {
  it("loads and renders the user list from GET /ops/users/", async () => {
    primeList();
    render(<UserWorkspace />);
    expect(await screen.findByText("Amla Bora")).toBeTruthy();
    expect(listOpsUsers).toHaveBeenCalledWith({});
  });

  it("submits search as a server query param", async () => {
    primeList();
    render(<UserWorkspace />);
    await screen.findByText("Amla Bora");
    fireEvent.change(screen.getByLabelText("Search users"), {
      target: { value: "amla" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() =>
      expect(listOpsUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: "amla" }),
      ),
    );
  });

  it("applies the status filter server-side", async () => {
    primeList();
    render(<UserWorkspace />);
    await screen.findByText("Amla Bora");
    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "suspended" },
    });
    await waitFor(() =>
      expect(listOpsUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: "suspended" }),
      ),
    );
  });

  it("paginates forward using the server cursor token verbatim", async () => {
    primeList();
    render(<UserWorkspace />);
    await screen.findByText("Amla Bora");
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await waitFor(() =>
      expect(listOpsUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ cursor: "N1" }),
      ),
    );
  });

  it("disables Previous on the first page", async () => {
    primeList();
    render(<UserWorkspace />);
    await screen.findByText("Amla Bora");
    expect(
      (screen.getByRole("button", { name: "Previous page" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});

describe("UserWorkspace — drawer", () => {
  it("loads detail + summary on row open", async () => {
    primeList();
    (getOpsUser as Mock).mockResolvedValue({
      ...ROW,
      target_exam_id: "exam-1",
      phone_e164: null,
      preferred_language: "as",
      exam_date: null,
      is_minor: false,
      is_email_verified: true,
    });
    (getOpsUserSummary as Mock).mockResolvedValue({
      total_attempts: 4,
      latest_attempt: null,
      readiness_score: null,
      current_streak: 1,
    });
    render(<UserWorkspace />);
    fireEvent.click(await screen.findByRole("button", { name: "Open user Amla Bora" }));
    expect(await screen.findByText("Read-only view")).toBeTruthy();
    expect(getOpsUser).toHaveBeenCalledWith("u-1");
    expect(getOpsUserSummary).toHaveBeenCalledWith("u-1");
    expect(await screen.findByText("Total attempts")).toBeTruthy();
    expect(await screen.findByText("No readiness data")).toBeTruthy();
  });
});

describe("UserWorkspace — error/forbidden states", () => {
  it("shows the forbidden state on a 403", async () => {
    (listExams as Mock).mockResolvedValue([]);
    (listOpsUsers as Mock).mockRejectedValue(new ApiError(403, {}, "forbidden"));
    render(<UserWorkspace />);
    expect(await screen.findByText("Access denied")).toBeTruthy();
  });

  it("shows the unauthorized state on a 401", async () => {
    (listExams as Mock).mockResolvedValue([]);
    (listOpsUsers as Mock).mockRejectedValue(new ApiError(401, {}, "unauth"));
    render(<UserWorkspace />);
    expect(await screen.findByText("Sign in required")).toBeTruthy();
  });

  it("shows a generic error with retry otherwise", async () => {
    (listExams as Mock).mockResolvedValue([]);
    (listOpsUsers as Mock).mockRejectedValue(new Error("boom"));
    render(<UserWorkspace />);
    expect(await screen.findByText("Could not load users")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
  });
});

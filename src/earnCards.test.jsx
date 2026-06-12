import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EarnDashboardCards } from "./earnCards.jsx";

describe("EarnDashboardCards", () => {
  it("renders the active survey earn cards with payout, provider, and status context", () => {
    const analytics = vi.fn();
    render(<EarnDashboardCards navigate={vi.fn()} onAnalytics={analytics} />);

    expect(screen.getByRole("heading", { name: "CPX Research" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "TheoremReach" })).toBeInTheDocument();
    expect(screen.getByText("Provider: CPX Research")).toBeInTheDocument();
    expect(screen.getByText("Provider: TheoremReach")).toBeInTheDocument();
    expect(screen.getAllByText("Est. payout $0.40-$6")).toHaveLength(2);
    expect(screen.getByText("Available: ready to start")).toBeInTheDocument();
    expect(screen.getByText("Pending: reward verifies after provider callback")).toBeInTheDocument();
    expect(analytics).toHaveBeenCalledTimes(2);
    expect(analytics).toHaveBeenCalledWith("card_impression", expect.objectContaining({ cardId: "cpx-surveys", position: 1 }));
  });

  it("renders exactly two skeleton cards while loading", () => {
    render(<EarnDashboardCards loading navigate={vi.fn()} onAnalytics={vi.fn()} />);

    expect(screen.getAllByLabelText("Loading earn card")).toHaveLength(2);
    expect(screen.queryByRole("heading", { name: "CPX Research" })).not.toBeInTheDocument();
  });

  it("routes users to the correct marketplace lane and records click analytics", async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    const analytics = vi.fn();
    render(<EarnDashboardCards navigate={navigate} onAnalytics={analytics} />);

    await user.click(screen.getByRole("button", { name: /open cpx/i }));

    expect(navigate).toHaveBeenCalledWith("/surveys");
    expect(analytics).toHaveBeenCalledWith("card_click", expect.objectContaining({
      cardId: "cpx-surveys",
      route: "/surveys"
    }));
  });
});

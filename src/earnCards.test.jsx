import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EarnDashboardCards } from "./earnCards.jsx";

describe("EarnDashboardCards", () => {
  it("renders the three primary earn cards with payout, provider, and status context", () => {
    const analytics = vi.fn();
    render(<EarnDashboardCards navigate={vi.fn()} onAnalytics={analytics} />);

    expect(screen.getByRole("heading", { name: "Offers" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Surveys" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Play Games" })).toBeInTheDocument();
    expect(screen.getByText("Provider: Multi-provider")).toBeInTheDocument();
    expect(screen.getByText("Provider: CPX + BitLabs")).toBeInTheDocument();
    expect(screen.getByText("Provider: AdGate + Lootably")).toBeInTheDocument();
    expect(screen.getByText("Est. payout $3-$45")).toBeInTheDocument();
    expect(screen.getByText("Est. payout $0.40-$6")).toBeInTheDocument();
    expect(screen.getByText("Est. payout $2-$35")).toBeInTheDocument();
    expect(screen.getByText("Available: ready to start")).toBeInTheDocument();
    expect(screen.getByText("Pending: reward verifies after provider callback")).toBeInTheDocument();
    expect(analytics).toHaveBeenCalledTimes(3);
    expect(analytics).toHaveBeenCalledWith("card_impression", expect.objectContaining({ cardId: "offers", position: 1 }));
  });

  it("renders exactly three skeleton cards while loading", () => {
    render(<EarnDashboardCards loading navigate={vi.fn()} onAnalytics={vi.fn()} />);

    expect(screen.getAllByLabelText("Loading earn card")).toHaveLength(3);
    expect(screen.queryByRole("heading", { name: "Offers" })).not.toBeInTheDocument();
  });

  it("routes users to the correct marketplace lane and records click analytics", async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    const analytics = vi.fn();
    render(<EarnDashboardCards navigate={navigate} onAnalytics={analytics} />);

    await user.click(screen.getByRole("button", { name: /start surveys/i }));

    expect(navigate).toHaveBeenCalledWith("/offers?category=Surveys");
    expect(analytics).toHaveBeenCalledWith("card_click", expect.objectContaining({
      cardId: "surveys",
      route: "/offers?category=Surveys"
    }));
  });
});

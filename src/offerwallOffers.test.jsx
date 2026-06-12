import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { App } from "./main.jsx";
import {
  filterOffersByCategory,
  formatRewardUsd,
  formatWaveCoinReward,
  normalizeOffer
} from "./offerwallOffers.js";

function mockFetch() {
  global.fetch = vi.fn(async url => {
    if (String(url).includes("/api/csrf-token")) {
      return { ok: true, json: async () => ({ csrfToken: "csrf" }) };
    }
    if (String(url).includes("/api/offerwalls/providers")) {
      return {
        ok: true,
        json: async () => ({
          providers: {
            cpx: { key: "cpx", name: "CPX Research", enabled: true },
            theorem: { key: "theorem", name: "TheoremReach", enabled: true },
            adgate: { key: "adgate", name: "AdGate", enabled: false }
          }
        })
      };
    }
    if (String(url).includes("/api/offerwalls/cpx/launch")) {
      return { ok: true, json: async () => ({ configured: true, name: "CPX Research", url: "https://offers.cpx-research.com/test" }) };
    }
    if (String(url).includes("/api/offerwalls/theorem/launch")) {
      return { ok: true, json: async () => ({ configured: true, name: "TheoremReach", url: "https://theoremreach.com/test" }) };
    }
    return { ok: true, json: async () => ({}) };
  });
}

beforeEach(() => {
  localStorage.clear();
  window.history.pushState({}, "", "/offers");
  mockFetch();
});

describe("offerwall offer normalization", () => {
  it("converts USD payouts into WaveCoins and USD cents", () => {
    const offer = normalizeOffer({ title: "Survey", provider: "CPX Research", payoutUsd: 5 });
    expect(offer.rewardWaveCoins).toBe(500);
    expect(offer.rewardUsdCents).toBe(500);
    expect(formatWaveCoinReward(offer)).toBe("500 WaveCoins");
    expect(formatRewardUsd(offer)).toBe("$5.00");
  });

  it("uses Reward varies when reward amount is missing", () => {
    const offer = normalizeOffer({ title: "Featured wall", provider: "TheoremReach" });
    expect(offer.rewardWaveCoins).toBeNull();
    expect(formatWaveCoinReward(offer)).toBe("Reward varies");
  });

  it("filters offers by category tabs", () => {
    const offers = [
      normalizeOffer({ id: "game", title: "Game", provider: "CPX Research", category: "Games" }),
      normalizeOffer({ id: "survey", title: "Survey", provider: "TheoremReach", category: "Surveys" })
    ];
    expect(filterOffersByCategory(offers, "Games")).toHaveLength(1);
    expect(filterOffersByCategory(offers, "Games")[0].title).toBe("Game");
  });
});

describe("offerwall page", () => {
  it("opens a provider modal from an offer card and hides unavailable providers", async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => expect(screen.getAllByText("CPX Mobile Game Missions").length).toBeGreaterThan(0));
    expect(screen.queryByText("AdGate")).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /start offer/i })[0]);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("/api/offerwalls/cpx/launch"), expect.any(Object)));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTitle("CPX Research offers")).toHaveAttribute("src", "https://offers.cpx-research.com/test");
  });
});

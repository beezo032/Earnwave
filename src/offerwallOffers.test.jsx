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
            theorem: { key: "theorem", name: "TheoremReach", enabled: true }
          }
        })
      };
    }
    if (String(url).includes("/api/offerwalls/cpx/launch")) {
      return {
        ok: true,
        json: async () => ({
          configured: true,
          name: "CPX Research",
          url: "https://offers.cpx-research.com/test",
          integration: "cpx_script",
          scriptSrc: "https://cdn.cpx-research.com/assets/js/script_tag_v2.0.js",
          config: {
            general_config: { app_id: 33553, ext_user_id: "user_123", secure_hash: "hash" },
            script_config: [{ div_id: "fullscreen", theme_style: 1, order_by: 2, limit_surveys: 7 }]
          }
        })
      };
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
      normalizeOffer({ id: "cpx-survey", title: "CPX Survey", provider: "CPX Research", category: "Surveys" }),
      normalizeOffer({ id: "theorem-survey", title: "Theorem Survey", provider: "TheoremReach", category: "Surveys" })
    ];
    expect(filterOffersByCategory(offers, "Surveys")).toHaveLength(2);
    expect(filterOffersByCategory(offers, "All")).toHaveLength(2);
  });
});

describe("offerwall page", () => {
  it("opens a provider modal from an offer card and hides unavailable providers", async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => expect(screen.getAllByText("CPX Survey Matches").length).toBeGreaterThan(0));
    expect(screen.queryByText("Unavailable provider")).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /start offer/i })[0]);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("/api/offerwalls/cpx/launch"), expect.any(Object)));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Loading CPX Research surveys")).toBeInTheDocument();
    expect(document.getElementById("fullscreen")).toBeInTheDocument();
  });
});

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App, SurveysPage } from "./main.jsx";

function mockApi() {
  return {
    session: {
      user: {
        id: "user_123",
        name: "Test User",
        balance_wavecoins: 1250,
        preferredBalanceDisplay: "both",
        email_verified: true
      }
    },
    request: vi.fn(async path => {
      if (path === "/offerwalls/providers") {
        return {
          providers: {
            cpx: { key: "cpx", name: "CPX Research", enabled: true },
            theorem: { key: "theorem", name: "TheoremReach", enabled: true }
          }
        };
      }
      if (path === "/offerwalls/cpx/launch") return {
        configured: true,
        url: "https://survey.example/cpx?user_id=user_123",
        integration: "cpx_script",
        scriptSrc: "https://cdn.cpx-research.com/assets/js/script_tag_v2.0.js",
        config: {
          general_config: { app_id: 33553, ext_user_id: "user_123", secure_hash: "hash" },
          script_config: [{ div_id: "fullscreen", theme_style: 1, order_by: 2, limit_surveys: 7 }]
        }
      };
      if (path === "/offerwalls/theorem/launch") return { configured: true, url: "https://survey.example/theorem?user_id=user_123" };
      return {};
    })
  };
}

describe("SurveysPage", () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        providers: {
          cpx: { key: "cpx", name: "CPX Research", enabled: true },
          theorem: { key: "theorem", name: "TheoremReach", enabled: true }
        }
      })
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.history.pushState({}, "", "/");
    localStorage.clear();
  });

  it("renders the surveys route with headline and navbar link", async () => {
    window.history.pushState({}, "", "/surveys");
    render(<App />);

    expect(screen.getByRole("heading", { name: "Earn WaveCoins with Surveys" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Surveys" })).toHaveClass("active-link");
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("/api/offerwalls/providers"), expect.any(Object)));
  });

  it("routes from the navbar to the dedicated surveys page", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Surveys" }));

    expect(screen.getByRole("heading", { name: "Earn WaveCoins with Surveys" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/surveys");
  });

  it("opens provider cards in a survey modal and tracks close events", async () => {
    const api = mockApi();
    const opened = vi.fn();
    const closed = vi.fn();
    window.addEventListener("earnwave:survey_provider_opened", opened);
    window.addEventListener("earnwave:survey_modal_closed", closed);
    const user = userEvent.setup();

    render(<SurveysPage api={api} />);

    const buttons = await screen.findAllByRole("button", { name: "Open Surveys" });
    await user.click(buttons[0]);

    expect(api.request).toHaveBeenCalledWith("/offerwalls/cpx/launch");
    expect(opened).toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "CPX Research survey wall" })).toBeInTheDocument();
    expect(screen.getByText("Loading CPX Research surveys")).toBeInTheDocument();
    expect(document.getElementById("fullscreen")).toBeInTheDocument();
    expect(window.config.general_config.ext_user_id).toBe("user_123");

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(closed).toHaveBeenCalled();
    expect(window.config).toBeUndefined();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    window.removeEventListener("earnwave:survey_provider_opened", opened);
    window.removeEventListener("earnwave:survey_modal_closed", closed);
  });
});

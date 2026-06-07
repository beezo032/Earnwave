import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  HowItWorksBlock,
  LandingHero,
  PayoutMethodsStrip,
  PayoutProof,
  PendingRewardsFaq,
  RewardStatusExplainer,
  StructuredFaqMarkup
} from "./landingSections.jsx";

const analyticsSeries = [
  { day: "Mon" },
  { day: "Tue" },
  { day: "Wed" }
];

const earningsFeed = [
  { user: "Maya", action: "completed a finance survey", amount: 6.25, time: "now" },
  { user: "Jon", action: "hit a 9-day streak", amount: 1.45, time: "1m" }
];

function SectionTitle({ title, copy }) {
  return <div><h2>{title}</h2><p>{copy}</p></div>;
}

function FaqItem({ question, answer, defaultOpen }) {
  return <article data-open={defaultOpen}><h3>{question}</h3><p>{answer}</p></article>;
}

function Meter({ value }) {
  return <div data-meter={value} />;
}

function money(value) {
  return `$${Number(value).toFixed(2)}`;
}

describe("landing copy sections", () => {
  it("matches the trust-focused hero copy snapshot", () => {
    const { asFragment } = render(<LandingHero navigate={vi.fn()} money={money} analyticsSeries={analyticsSeries} earningsFeed={earningsFeed} Meter={Meter} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it("matches the payout methods strip snapshot", () => {
    const { asFragment } = render(<PayoutMethodsStrip />);
    expect(asFragment()).toMatchSnapshot();
  });

  it("matches the three-step how it works snapshot", () => {
    const { asFragment } = render(<HowItWorksBlock SectionTitle={SectionTitle} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it("matches the pending versus available explainer snapshot", () => {
    const { asFragment } = render(<RewardStatusExplainer SectionTitle={SectionTitle} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it("matches the redacted payout proof snapshot", () => {
    const { asFragment } = render(<PayoutProof SectionTitle={SectionTitle} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it("matches the pending and reversal FAQ snapshot", () => {
    const { asFragment } = render(<PendingRewardsFaq SectionTitle={SectionTitle} FaqItem={FaqItem} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it("matches the structured FAQ markup snapshot", () => {
    const { asFragment } = render(<StructuredFaqMarkup />);
    expect(asFragment()).toMatchSnapshot();
  });
});

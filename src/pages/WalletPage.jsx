import React, { useEffect, useState } from "react";
import { DashboardLayout } from "../components/Shell.jsx";
import {
  DashboardTop,
  MiniStat,
  Meter,
  Method,
  SectionTitle,
  DataTable
} from "../components/OfferCard.jsx";
import { TurnstileField } from "../components/TurnstileField.jsx";
import {
  userAmountWaveCoins,
  formatBalance,
  dollarsToWaveCoins
} from "../utils.js";

const ENABLE_CRYPTO_WITHDRAWALS = import.meta.env.VITE_ENABLE_CRYPTO_WITHDRAWALS === "true";

export function WalletPage({ navigate, api }) {
  const [walletUser, setWalletUser] = useState(api.session?.user || { balance: 48.75 });
  const minimumCashoutWaveCoins = 500;
  const [withdrawal, setWithdrawal] = useState({ method: "PayPal", amountWaveCoins: "", destinationType: "EMAIL", destinationValue: "", turnstileToken: "" });
  const [notice, setNotice] = useState("All cashouts enter review before approval.");
  const [withdrawals, setWithdrawals] = useState([]);
  const [transactions, setTransactions] = useState([
    { created_at: "2026-06-05", type: "survey_completion", description: "Completed survey reward", amount: 2.84, direction: "credit" },
    { created_at: "2026-06-04", type: "withdrawal_request", description: "PayPal withdrawal requested", amount: 18.5, direction: "debit" }
  ]);

  useEffect(() => {
    api.request("/auth/me").then(data => {
      if (data.user) {
        setWalletUser(data.user);
        if (api.session) api.save({ ...api.session, user: data.user });
      }
    }).catch(() => {});
    api.request("/account/transactions").then(data => setTransactions(data.transactions || [])).catch(() => {});
    api.request("/wallet/withdrawals").then(data => setWithdrawals(data.withdrawals || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (api.session?.user) setWalletUser(api.session.user);
  }, [api.session?.user?.balance_wavecoins, api.session?.user?.pending_wavecoins, api.session?.user?.total_earned_wavecoins]);

  const availableWaveCoins = userAmountWaveCoins(walletUser, walletUser.balance);
  const pendingWaveCoins = Number(walletUser.pending_wavecoins ?? walletUser.pending_rewards_wavecoins ?? transactions
    .filter(item => item.direction === "credit" && String(item.status || "").toLowerCase() === "pending")
    .reduce((sum, item) => sum + Number(item.user_reward_wavecoins ?? item.amount_wavecoins ?? dollarsToWaveCoins(item.amount || 0)), 0));
  const cashoutProgress = Math.min(100, Math.round((availableWaveCoins / minimumCashoutWaveCoins) * 100));
  const latestWithdrawal = withdrawals[0];
  const payoutStatus = latestWithdrawal?.status || "No withdrawal yet";

  async function submitWithdrawal(event) {
    event.preventDefault();
    try {
      const result = await api.request("/wallet/withdrawals", {
        method: "POST",
        body: JSON.stringify({ ...withdrawal, amountWaveCoins: Number(withdrawal.amountWaveCoins), balance: walletUser.balance })
      });
      setWithdrawals([result.withdrawal, ...withdrawals]);
      setNotice(`Withdrawal ${result.withdrawal.status}: risk score ${result.risk.score} (${result.risk.signals.join(", ")}).`);
    } catch (error) {
      setNotice(error.message);
    }
  }

  return (
    <DashboardLayout active="Wallet" navigate={navigate} api={api}>
      <DashboardTop kicker="Wallet" title="Payout center" copy="WaveCoins are EarnWave reward credits. 100 WaveCoins equals $1.00 when redeemed." action={<span className="tag">500 WaveCoins minimum cashout</span>} />
      <div className="wallet-summary-grid">
        <MiniStat label="Available balance" value={formatBalance(walletUser, availableWaveCoins)} />
        <MiniStat label="Pending rewards" value={formatBalance(walletUser, pendingWaveCoins)} />
        <MiniStat label="Minimum cashout" value={formatBalance(walletUser, minimumCashoutWaveCoins)} />
        <MiniStat label="Payout status" value={payoutStatus} />
      </div>
      <div className="wallet-grid">
        <div className="card">
          <p>Available Balance</p>
          <div className="balance">{formatBalance(walletUser, availableWaveCoins)}</div>
          <Meter value={cashoutProgress} />
          <div className="notice">500 WaveCoins minimum cashout. WaveCoins are EarnWave reward credits. 100 WaveCoins equals $1.00 when redeemed.</div>
          <div className="wallet-clarity-list">
            <div className="row"><span>Ready to withdraw</span><span className="pill">{formatBalance(walletUser, availableWaveCoins)}</span></div>
            <div className="row"><span>Pending rewards</span><span className="pill blue">{formatBalance(walletUser, pendingWaveCoins)}</span></div>
            <div className="row"><span>Minimum cashout</span><span className="pill amber">{formatBalance(walletUser, minimumCashoutWaveCoins)}</span></div>
          </div>
          <label>Balance display<select value={walletUser.preferredBalanceDisplay || "coins"} onChange={async event => {
            const preferredBalanceDisplay = event.target.value;
            const nextUser = { ...walletUser, preferredBalanceDisplay };
            setWalletUser(nextUser);
            if (api.session) api.save({ ...api.session, user: nextUser });
            await api.request("/account/preferences", { method: "PATCH", body: JSON.stringify({ preferredBalanceDisplay }) }).catch(() => {});
          }}><option value="coins">WaveCoins</option><option value="usd">USD</option><option value="both">WaveCoins + USD</option></select></label>
          <div className="method-grid">
            <Method title="PayPal" copy="Payouts after approval" />
            <Method title="Tremendous" copy="Gift cards after approval" />
            {ENABLE_CRYPTO_WITHDRAWALS && <Method title="Crypto" copy="Stablecoin payout after approval" />}
          </div>
          <form className="form-grid" onSubmit={submitWithdrawal}>
            <label>Method<select value={withdrawal.method} onChange={event => {
              const method = event.target.value;
              setWithdrawal({
                ...withdrawal,
                method,
                destinationType: method === "Crypto" ? "ETH" : "EMAIL"
              });
            }}><option>PayPal</option><option>Gift Card</option>{ENABLE_CRYPTO_WITHDRAWALS && <option>Crypto</option>}</select></label>
            <label>Amount in WaveCoins<input type="number" min="500" step="1" placeholder="2500" value={withdrawal.amountWaveCoins} onChange={event => setWithdrawal({ ...withdrawal, amountWaveCoins: event.target.value })} /></label>
            {ENABLE_CRYPTO_WITHDRAWALS && withdrawal.method === "Crypto" && (
              <label>Network<select value={withdrawal.destinationType} onChange={event => setWithdrawal({ ...withdrawal, destinationType: event.target.value })}><option>ETH</option><option>SOL</option><option>AVAX</option><option>MATIC</option></select></label>
            )}
            <label>{ENABLE_CRYPTO_WITHDRAWALS && withdrawal.method === "Crypto" ? "Wallet address" : "Recipient email"}<input required placeholder={ENABLE_CRYPTO_WITHDRAWALS && withdrawal.method === "Crypto" ? "0x..." : "member@example.com"} value={withdrawal.destinationValue} onChange={event => setWithdrawal({ ...withdrawal, destinationValue: event.target.value })} /></label>
            <TurnstileField onToken={token => setWithdrawal(current => ({ ...current, turnstileToken: token }))} />
            <button className="btn">Request Withdrawal</button>
            <div className="notice">{notice}</div>
          </form>
        </div>
        <div className="card">
          <SectionTitle title="Withdrawal history" copy="Every payout request shows its method, amount, and current review status." />
          <DataTable rows={(withdrawals.length ? withdrawals : [
            { created_at: "No requests yet", method: "Choose a payout method", amount: 0, status: "Not started" }
          ]).map(item => [
            String(item.created_at || "").slice(0, 10) || "New",
            item.method || "Method",
            formatBalance(walletUser, item.amount_wavecoins ?? dollarsToWaveCoins(item.amount ?? item.amount_cents / 100)),
            item.status || "Pending"
          ])} />
        </div>
        <div className="card wallet-history-card">
          <SectionTitle title="Ledger history" copy="Auditable credits and debits tied to offers, bonuses, streaks, and withdrawals." />
          <DataTable rows={transactions.map(item => [
            String(item.created_at || "").slice(0, 10),
            item.description,
            `${item.direction === "debit" ? "-" : "+"}${formatBalance(walletUser, item.amount_wavecoins ?? dollarsToWaveCoins(item.amount))}`,
            item.type
          ])} />
        </div>
      </div>
    </DashboardLayout>
  );
}

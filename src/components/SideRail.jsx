import React from "react";
import { Meter } from "./OfferCard.jsx";
import { rewardLabel } from "../utils.js";

export function SideRail({ growth, leaderboard, bonusCode, setBonusCode, claimStreak, redeemCode, dailyQuest, completeQuest, growthNotice }) {
  const xpProgress = Math.min(100, Math.round((growth.xp / Math.max(growth.nextLevelXp, 1)) * 100));
  const referralProgress = growth.referralProgress || { referrals: growth.referrals || 0, target: 5, progress: 0, rewardUnlocked: false };
  return (
    <div className="stack">
      <div className="card">
        <h3>Level {growth.level}</h3>
        <p>{growth.xp} XP toward {growth.nextLevelXp} XP</p>
        <br /><Meter value={xpProgress} />
      </div>
      <div className="card">
        <h3>Referral system</h3>
        <p>Code: <strong>{growth.referralCode}</strong></p>
        <div className="copy-box">{growth.referralUrl}</div>
        <div className="row"><span>Referrals</span><span className="pill">{referralProgress.referrals}/{referralProgress.target}</span></div>
        <Meter value={referralProgress.progress || 0} />
        <p>{referralProgress.rewardUnlocked ? "Referral reward tier unlocked." : "Invite verified users to fill the progress card."}</p>
      </div>
      <div className="card">
        <h3>Daily streak</h3>
        <p>{growth.streak} day streak. Claim once per day.</p>
        <button className="btn" onClick={claimStreak}>Claim Daily Bonus</button>
      </div>
      <div className="card">
        <h3>Daily quest</h3>
        <p>{dailyQuest ? dailyQuest.title : "Loading today's quest..."}</p>
        {dailyQuest && <div className="row"><span>{dailyQuest.description}</span><span className="tag amber">+{rewardLabel(dailyQuest.reward)}</span></div>}
        <button className={dailyQuest?.status === "completed" ? "btn alt" : "btn"} disabled={!dailyQuest || dailyQuest.status === "completed"} onClick={completeQuest}>
          {dailyQuest?.status === "completed" ? "Quest Complete" : "Complete Quest"}
        </button>
      </div>
      <div className="card">
        <h3>Bonus codes</h3>
        <form className="bonus-form" onSubmit={redeemCode}>
          <input value={bonusCode} onChange={event => setBonusCode(event.target.value)} placeholder="WELCOME" />
          <button className="btn" type="submit">Redeem</button>
        </form>
        <div className="notice">{growthNotice}</div>
      </div>
      <div className="card">
        <h3>Weekly leaderboard</h3>
        {leaderboard.map((row, index) => <div className="leader-row" key={`${row.name}-${index}`}><span className="avatar">{index + 1}</span><strong>{row.name}</strong><span className="pill">{rewardLabel(row.total_earned)}</span></div>)}
      </div>
      <div className="card"><h3>Quick goals</h3><div className="row"><span>Complete one survey</span><span className="tag amber">Bonus eligible</span></div><div className="row"><span>Keep your streak active</span><span className="tag blue">XP boost</span></div></div>
    </div>
  );
}

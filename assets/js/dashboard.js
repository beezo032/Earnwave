async function loadDashboard() {
  const user = await loadCurrentUser();
  const offers = await loadOffers();

  const nameTarget = document.querySelector("#userName");
  const balanceTargets = document.querySelectorAll("#balance");
  const earnedTarget = document.querySelector("#earned");
  const completedTarget = document.querySelector("#completedCount");
  const offersGrid = document.querySelector("#offersGrid");

  if (nameTarget) {
    nameTarget.textContent = user.name || "EarnWave User";
  }

  balanceTargets.forEach(target => {
    target.textContent = money(user.balance);
  });

  if (earnedTarget) {
    earnedTarget.textContent = money(user.total_earned);
  }

  if (completedTarget) {
    completedTarget.textContent = String(Math.max(14, Math.round(Number(user.total_earned || 0) / 18)));
  }

  if (offersGrid) {
    offersGrid.innerHTML = offers.slice(0, 6).map(offer => offerCard(offer, { action: true })).join("");

    offersGrid.querySelectorAll(".complete-btn").forEach(button => {
      button.addEventListener("click", async () => {
        const offerId = button.dataset.offerId;
        button.disabled = true;
        button.textContent = "Tracking...";

        try {
          await apiRequest(`/offers/${offerId}/complete`, { method: "POST" });
          button.textContent = "Completed";
        } catch (error) {
          const card = button.closest(".offer-card");
          const reward = Number(card.querySelector(".reward").textContent.replace("$", ""));
          const current = getStoredUser() || user;
          const nextUser = {
            ...current,
            balance: Number(current.balance || 0) + reward,
            total_earned: Number(current.total_earned || 0) + reward
          };

          saveSession({ ...getSession(), user: nextUser });
          button.textContent = "Completed";
        }

        setTimeout(loadDashboard, 350);
      });
    });
  }
}

async function loadWallet() {
  const user = await loadCurrentUser();
  document.querySelectorAll("#balance").forEach(target => {
    target.textContent = money(user.balance);
  });

  const form = document.querySelector("#withdrawForm");
  const notice = document.querySelector("#walletNotice");
  const rows = document.querySelector("#withdrawalRows");

  if (!form) return;

  try {
    const withdrawals = await apiRequest("/withdrawals");
    if (rows && withdrawals.length) {
      rows.innerHTML = withdrawals.map(item => `
        <tr>
          <td>${String(item.created_at || "").slice(0, 10)}</td>
          <td>${item.method}</td>
          <td>${money(item.amount)}</td>
          <td><span class="pill">${item.status}</span></td>
        </tr>
      `).join("");
    }
  } catch (error) {
    // Static previews keep the seeded transaction rows.
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const method = document.querySelector("#method").value;
    const amount = Number(document.querySelector("#amount").value);

    try {
      await apiRequest("/withdrawals", {
        method: "POST",
        body: JSON.stringify({ method, amount })
      });

      if (notice) {
        notice.textContent = `${method} withdrawal for ${money(amount)} is pending review.`;
      }
    } catch (error) {
      const current = getStoredUser() || user;
      if (amount > Number(current.balance || 0)) {
        if (notice) notice.textContent = "That amount is higher than your available balance.";
        return;
      }

      const nextUser = {
        ...current,
        balance: Number(current.balance || 0) - amount
      };
      saveSession({ ...getSession(), user: nextUser });

      if (notice) {
        notice.textContent = `${method} withdrawal for ${money(amount)} is pending review in demo mode.`;
      }

      if (rows) {
        rows.insertAdjacentHTML("afterbegin", `
          <tr>
            <td>${new Date().toISOString().slice(0, 10)}</td>
            <td>${method}</td>
            <td>${money(amount)}</td>
            <td><span class="tag amber">Pending</span></td>
          </tr>
        `);
      }
    }

    loadWallet();
  }, { once: true });
}

loadDashboard();
loadWallet();

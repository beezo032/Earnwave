const API_BASE = "/api";

const demoOffers = [
  {
    id: 1,
    title: "Kingdom Builder",
    description: "Reach castle level 10 and keep the app installed for tracking.",
    reward: 28.4,
    category: "Games",
    time: "2-4 days",
    difficulty: "Medium"
  },
  {
    id: 2,
    title: "Consumer Pulse Survey",
    description: "Answer a short brand research survey with instant credit.",
    reward: 4.25,
    category: "Surveys",
    time: "8 min",
    difficulty: "Easy"
  },
  {
    id: 3,
    title: "Streaming App Trial",
    description: "Start a partner trial and confirm your first app session.",
    reward: 11,
    category: "Apps",
    time: "15 min",
    difficulty: "Easy"
  },
  {
    id: 4,
    title: "Budget Card Signup",
    description: "Open a free finance account and complete identity verification.",
    reward: 36,
    category: "Finance",
    time: "1 day",
    difficulty: "Advanced"
  },
  {
    id: 5,
    title: "Daily Check-in",
    description: "Claim today's streak reward and keep your bonus multiplier alive.",
    reward: .75,
    category: "Bonus",
    time: "1 min",
    difficulty: "Easy"
  },
  {
    id: 6,
    title: "Puzzle Sprint",
    description: "Complete 20 puzzle rounds in a new mobile game.",
    reward: 17.8,
    category: "Games",
    time: "1-2 days",
    difficulty: "Medium"
  }
];

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function saveSession(session) {
  localStorage.setItem("earnwave_session", JSON.stringify(session));
  if (session.user) {
    localStorage.setItem("earnwave_user", JSON.stringify(session.user));
  }
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem("earnwave_session")) || {};
  } catch (error) {
    return {};
  }
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("earnwave_user")) || null;
  } catch (error) {
    return null;
  }
}

function demoUser(overrides = {}) {
  return {
    id: "demo",
    name: "EarnWave User",
    email: "demo@earnwave.local",
    balance: 48.75,
    total_earned: 320.4,
    role: "user",
    ...overrides
  };
}

async function apiRequest(path, options = {}) {
  const session = getSession();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (session.token) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || "Unable to reach EarnWave API");
  }

  return payload;
}

async function loadOffers() {
  try {
    return await apiRequest("/offers");
  } catch (error) {
    return demoOffers;
  }
}

async function loadCurrentUser() {
  try {
    return await apiRequest("/me");
  } catch (error) {
    return getStoredUser() || demoUser();
  }
}

function offerCard(offer, options = {}) {
  const action = options.action
    ? `<button class="btn complete-btn" data-offer-id="${offer.id}">${options.actionLabel || `Complete +${money(offer.reward)}`}</button>`
    : `<a class="btn alt" href="signup.html">Start +${money(offer.reward)}</a>`;

  return `
    <div class="card offer-card" data-category="${offer.category}">
      <div class="offer-head">
        <div>
          <h3>${offer.title}</h3>
          <p>${offer.description}</p>
        </div>
        <span class="reward">${money(offer.reward)}</span>
      </div>
      <div class="offer-meta">
        <span class="tag">${offer.category}</span>
        <span class="tag blue">${offer.time || "Tracked"}</span>
        <span class="tag amber">${offer.difficulty || "Standard"}</span>
      </div>
      ${action}
    </div>
  `;
}

async function renderPublicOffers() {
  const grid = document.querySelector("#publicOffersGrid");
  if (!grid) return;

  const offers = await loadOffers();

  function draw(category = "all") {
    const filtered = category === "all"
      ? offers
      : offers.filter(offer => offer.category === category);

    grid.innerHTML = filtered.map(offer => offerCard(offer)).join("");
  }

  document.querySelectorAll("[data-filter]").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-filter]").forEach(item => item.classList.remove("active"));
      button.classList.add("active");
      draw(button.dataset.filter);
    });
  });

  draw();
}

document.querySelectorAll("[data-logout]").forEach(link => {
  link.addEventListener("click", () => {
    localStorage.removeItem("earnwave_session");
    localStorage.removeItem("earnwave_user");
  });
});

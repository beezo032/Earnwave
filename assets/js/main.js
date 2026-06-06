const signupForm = document.querySelector("#signupForm");
const loginForm = document.querySelector("#loginForm");
const authNotice = document.querySelector("#authNotice");

function setNotice(message) {
  if (authNotice) {
    authNotice.textContent = message;
  }
}

if (signupForm) {
  signupForm.addEventListener("submit", async event => {
    event.preventDefault();

    const userInput = {
      name: document.querySelector("#name").value.trim(),
      email: document.querySelector("#email").value.trim(),
      password: document.querySelector("#password").value
    };

    try {
      const session = await apiRequest("/auth/signup", {
        method: "POST",
        body: JSON.stringify(userInput)
      });

      saveSession(session);
      window.location.href = "dashboard.html";
    } catch (error) {
      const user = demoUser({
        name: userInput.name,
        email: userInput.email,
        balance: 5,
        total_earned: 5
      });

      saveSession({ token: null, user });
      setNotice("Demo account created because the API is not running or the email already exists.");
      window.location.href = "dashboard.html";
    }
  });
}

if (loginForm) {
  loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    const credentials = {
      email: document.querySelector("#email").value.trim(),
      password: document.querySelector("#password").value
    };

    try {
      const session = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials)
      });

      saveSession(session);
      window.location.href = "dashboard.html";
    } catch (error) {
      const user = demoUser({ email: credentials.email });

      saveSession({ token: null, user });
      setNotice("Demo login started because the API is not running or the credentials did not match.");
      window.location.href = "dashboard.html";
    }
  });
}

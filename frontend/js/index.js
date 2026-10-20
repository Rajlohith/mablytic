const API =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:8001"
    : "https://mablytic.onrender.com";
let selectedRole = "user";

// Already logged in? Redirect.
const session = JSON.parse(localStorage.getItem("mablytic_session") || "null");
if (session) {
  window.location.href = session.is_admin ? "/admin.html" : "/feed.html";
}

function setRole(role) {
  selectedRole = role;
  document
    .getElementById("tab-user")
    .classList.toggle("active", role === "user");
  document
    .getElementById("tab-admin")
    .classList.toggle("active", role === "admin");
  const hint = document.getElementById("admin-hint");
  if (hint) hint.style.display = role === "admin" ? "block" : "none";
  document.getElementById("err").style.display = "none";
}

function showErr(msg) {
  const el = document.getElementById("err");
  el.textContent = msg;
  el.style.display = "block";
}

async function doLogin() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  if (!username || !password) {
    showErr("Please enter both username and password.");
    return;
  }

  const btn = document.getElementById("login-btn");
  btn.innerHTML = '<span class="spinner"></span>Logging in…';
  btn.disabled = true;
  document.getElementById("err").style.display = "none";

  try {
    const r = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!r.ok) {
      const d = await r.json();
      throw new Error(d.detail || "Login failed.");
    }
    const user = await r.json();

    // Role mismatch check
    if (selectedRole === "admin" && !user.is_admin) {
      throw new Error("This account does not have admin privileges.");
    }
    if (selectedRole === "user" && user.is_admin) {
      throw new Error("Please use the Admin tab to log in as admin.");
    }

    localStorage.setItem("mablytic_session", JSON.stringify(user));
    window.location.href = user.is_admin ? "/admin.html" : "/feed.html";
  } catch (e) {
    showErr(e.message);
    btn.innerHTML = "Login";
    btn.disabled = false;
  }
}

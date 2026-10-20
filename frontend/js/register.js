const API =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:8001"
    : "https://mablytic.onrender.com";
let currentStep = 1;
const selectedPrefs = new Set();

// ── Navigation ───────────────────────────────────────────────────────────────
function goStep(n) {
  if (n > currentStep) {
    if (!validateStep(currentStep)) return;
    document
      .getElementById(`stab-${currentStep}`)
      .classList.replace("active", "done");
  }
  document.getElementById(`step-${currentStep}`).classList.remove("active");
  currentStep = n;
  document.getElementById(`step-${n}`).classList.add("active");
  document.getElementById(`stab-${n}`).classList.add("active");
  document.getElementById("err").style.display = "none";
}

// ── Validation ───────────────────────────────────────────────────────────────
function validateStep(n) {
  if (n === 1) {
    if (!validateUsername(document.getElementById("username"))) return false;
    if (!validatePassword(document.getElementById("password"))) return false;
    if (!validateConfirm(document.getElementById("confirm"))) return false;
  }
  if (n === 2) {
    const fields = ["first_name", "last_name", "email", "age", "gender"];
    for (const id of fields) {
      const el = document.getElementById(id);
      if (!el.value.trim()) {
        showErr("Please fill in all profile fields.");
        el.focus();
        return false;
      }
    }
    const age = parseInt(document.getElementById("age").value);
    if (isNaN(age) || age < 13 || age > 100) {
      showErr("Please enter a valid age (13–100).");
      return false;
    }
  }
  return true;
}

function validateUsername(el) {
  const v = el.value.trim();
  const ok = /^[a-zA-Z0-9]+$/.test(v) && v.length >= 2;
  el.classList.toggle("invalid", !ok && v.length > 0);
  el.classList.toggle("valid", ok);
  return ok;
}

function validatePassword(el) {
  const v = el.value;
  const ok = v.length >= 6 && v.length <= 128;

  el.classList.toggle("invalid", !ok && v.length > 0);
  el.classList.toggle("valid", ok);

  // Strength bar
  const bar = document.getElementById("pw-bar");
  const hint = document.getElementById("pw-hint");

  if (!v) {
    bar.style.width = "0";
    bar.style.background = "";
    hint.textContent = "";
  } else if (v.length < 8) {
    bar.style.width = "25%";
    bar.style.background = "#ef4444";
    hint.textContent = "Too short — need at least 12 characters";
  } else if (v.length < 12) {
    bar.style.width = "50%";
    bar.style.background = "#f97316";
    hint.textContent = "Almost there — need 12 characters";
  } else if (v.length <= 128) {
    bar.style.width = "100%";
    bar.style.background = "#22c55e";
    hint.textContent = "Length looks good ✓";
  } else {
    bar.style.width = "75%";
    bar.style.background = "#f97316";
    hint.textContent = "Maximum 128 characters";
  }

  return ok;
}

function validateConfirm(el) {
  const pw = document.getElementById("password").value;
  const ok = el.value === pw && pw.length > 0;
  el.classList.toggle("invalid", !ok && el.value.length > 0);
  el.classList.toggle("valid", ok);
  return ok;
}

// ── Preferences ──────────────────────────────────────────────────────────────
function togglePref(el) {
  const v = el.dataset.val;
  if (selectedPrefs.has(v)) {
    selectedPrefs.delete(v);
    el.classList.remove("selected");
  } else {
    selectedPrefs.add(v);
    el.classList.add("selected");
  }
}

// ── Submit ───────────────────────────────────────────────────────────────────
async function doRegister() {
  if (selectedPrefs.size === 0) {
    showErr("Please select at least one interest.");
    return;
  }

  const btn = document.getElementById("submit-btn");
  btn.innerHTML = '<span class="spinner"></span>Creating…';
  btn.disabled = true;
  document.getElementById("err").style.display = "none";

  const payload = {
    username: document.getElementById("username").value.trim(),
    password: document.getElementById("password").value,
    first_name: document.getElementById("first_name").value.trim(),
    last_name: document.getElementById("last_name").value.trim(),
    email: document.getElementById("email").value.trim(),
    gender: document.getElementById("gender").value,
    age: parseInt(document.getElementById("age").value),
    preferences: [...selectedPrefs].join(","),
  };

  try {
    const r = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const d = await r.json();
      throw new Error(d.detail || "Registration failed.");
    }

    // Show success
    document.getElementById("step-3").classList.remove("active");
    document.getElementById("success").style.display = "block";
    document.querySelector(".footer-link").style.display = "none";
    document.querySelector(".steps").style.display = "none";
    setTimeout(() => (window.location.href = "index.html"), 3000);
  } catch (e) {
    showErr(e.message);
    btn.innerHTML = "Create Account";
    btn.disabled = false;
  }
}

function showErr(msg) {
  const el = document.getElementById("err");
  el.textContent = msg;
  el.style.display = "block";
}

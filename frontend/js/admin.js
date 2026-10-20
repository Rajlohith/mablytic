const API =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:8001"
    : "https://mablytic.onrender.com";

// ── Auth guard ────────────────────────────────────────────
const session = JSON.parse(localStorage.getItem("mablytic_session") || "null");

if (!session || !session.is_admin || !session.access_token) {
  localStorage.removeItem("mablytic_session");
  window.location.href = "/";
} else {
  document.getElementById("admin-name").textContent =
    session.first_name || "Admin";

  document.getElementById("admin-username").textContent =
    "@" + (session.username || "admin");

  document.getElementById("admin-av").textContent = (
    session.first_name?.[0] || "A"
  ).toUpperCase();
}

function logout() {
  localStorage.removeItem("mablytic_session");
  window.location.href = "/";
}

// ── Globals ───────────────────────────────────────────────
let currentAdId = null,
  currentServeUid = null;
let selectedUserId = null,
  selectedAdId = null;

const sidebarToggle = document.getElementById("sidebar-toggle");
const sidebarClose = document.getElementById("sidebar-close");
const sidebarBackdrop = document.getElementById("sidebar-backdrop");

function setSidebar(open) {
  document.body.classList.toggle("sidebar-open", open);
  sidebarToggle.setAttribute("aria-expanded", String(open));
}

sidebarToggle.addEventListener("click", () =>
  setSidebar(!document.body.classList.contains("sidebar-open")),
);
sidebarClose.addEventListener("click", () => setSidebar(false));
sidebarBackdrop.addEventListener("click", () => setSidebar(false));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setSidebar(false);
});

// ── Toast ─────────────────────────────────────────────────
function toast(msg, type = "ok") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = `show ${type}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => (el.className = ""), 3500);
}

// ── Backend status ────────────────────────────────────────

async function checkBackend() {
  const dot = document.getElementById("status-dot");
  const lbl = document.getElementById("status-lbl");

  try {
    await apiFetch("/admin/dashboard-stats");

    dot.className = "dot online";
    lbl.textContent = "Backend Active";
  } catch (error) {
    dot.className = "dot offline";

    if (
      error.message.includes("401") ||
      error.message.includes("403") ||
      error.message.includes("Authentication") ||
      error.message.includes("Administrator")
    ) {
      lbl.textContent = "Backend Active · Auth Required";
    } else {
      lbl.textContent = "Backend Error";
    }
  }
}

// ── Navigation ────────────────────────────────────────────
const PAGE_TITLES = {
  home: "MABlytic Admin Dashboard",
  analysis: "Ad Analysis",
  users: "User Management",
  ads: "Ad Management",
  history: "Interaction Log",
  api: "API Console",
};

function goto(name) {
  document
    .querySelectorAll(".nav-item[data-page]")
    .forEach((el) => el.classList.toggle("active", el.dataset.page === name));
  document
    .querySelectorAll(".page")
    .forEach((el) => el.classList.remove("active"));
  document.getElementById(`page-${name}`).classList.add("active");
  document.getElementById("topbar-title").textContent =
    PAGE_TITLES[name] || name;
  setSidebar(false);
  if (name === "home") loadHome();
  if (name === "analysis") loadAnalysis();
  if (name === "users") loadUsers();
  if (name === "ads") loadAds();
  if (name === "history") loadHistory();
}

document
  .querySelectorAll(".nav-item[data-page]")
  .forEach((el) => el.addEventListener("click", () => goto(el.dataset.page)));

// ── Theme ─────────────────────────────────────────────────
let isDark = true;
document.getElementById("theme-btn").addEventListener("click", () => {
  isDark = !isDark;
  document.documentElement.setAttribute(
    "data-theme",
    isDark ? "dark" : "light",
  );
  document.getElementById("theme-lbl").textContent = isDark
    ? "Light Mode"
    : "Dark Mode";
  document.querySelector("#theme-btn .nav-icon").textContent = isDark
    ? "🌙"
    : "☀️";
});

// ── Clear ─────────────────────────────────────────────────
document.getElementById("clear-btn").addEventListener("click", confirmClear);
async function confirmClear() {
  if (!confirm("⚠️ Delete ALL users, ads, and interactions? Cannot be undone."))
    return;
  try {
    const r = await apiFetch("/clear-database/", {
      method: "POST",
    });
    if (!r.ok) throw new Error((await r.json()).detail);
    toast("✓ Database cleared", "ok");
    loadHome();
  } catch (e) {
    toast(`✗ ${e.message}`, "err");
  }
}

// ── Helpers ───────────────────────────────────────────────

async function apiFetch(path, opts = {}) {
  const token = session?.access_token;
  const headers = new Headers(opts.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const r = await fetch(`${API}${path}`, {
    ...opts,
    headers,
  });

  if (r.status === 401) {
    localStorage.removeItem("mablytic_session");
    window.location.replace("/");
    throw new Error("Your session has expired. Please log in again.");
  }

  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.detail || `Request failed (${r.status})`);
  }

  return r.json();
}

function ctrColor(v) {
  return v > 10 ? "var(--green)" : v > 3 ? "var(--cyan)" : "var(--accent)";
}

function variantPill(v) {
  const cls = v === "A" ? "pill-a" : v === "B" ? "pill-b" : "badge-accent";
  return `<span class="pill ${cls}">${v || "—"}</span>`;
}

function ctrBar(v) {
  const pct = Math.min(v, 100),
    c = ctrColor(v);
  return `<div class="ctr-wrap"><div class="ctr-track"><div class="ctr-fill" style="width:${pct}%;background:${c}"></div></div><span class="ctr-label" style="color:${c}">${v}%</span></div>`;
}

function jsonBlock(data) {
  return `<pre style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;font-size:11px;overflow:auto;max-height:240px;color:var(--muted)">${JSON.stringify(data, null, 2)}</pre>`;
}

function drow(key, val, color = "var(--text)") {
  return `<div class="drow"><span class="dkey">${key}</span><span class="dval" style="color:${color}">${val ?? "—"}</span></div>`;
}

// ── HOME ──────────────────────────────────────────────────
async function loadHome() {
  try {
    const d = await apiFetch("/admin/dashboard-stats");
    document.getElementById("h-users").textContent = d.total_users ?? "—";
    document.getElementById("h-ads").textContent = d.total_ads ?? "—";
    document.getElementById("h-views").textContent = d.total_views ?? "—";
    document.getElementById("h-clicks").textContent = d.total_clicks ?? "—";
    document.getElementById("h-ctr").textContent = `${d.global_ctr ?? "—"}%`;
  } catch {}
}

// ── ANALYSIS ──────────────────────────────────────────────
async function loadAnalysis() {
  await Promise.all([loadDash(), loadAnalytics()]);
}

async function loadDash() {
  try {
    const d = await apiFetch("/admin/dashboard-stats");
    document.getElementById("an-views").textContent = d.total_views ?? "—";
    document.getElementById("an-clicks").textContent = d.total_clicks ?? "—";
    document.getElementById("an-ctr").textContent = `${d.global_ctr ?? "—"}%`;
    document.getElementById("an-ads").textContent = d.total_ads ?? "—";
  } catch {}
}

async function loadAnalytics() {
  const tbody = document.getElementById("an-table");
  const chart = document.getElementById("an-chart");
  tbody.innerHTML = `<tr><td colspan="7"><div class="loading">Loading…</div></td></tr>`;
  if (chart)
    chart.innerHTML = `<div class="loading" style="width:100%">Loading...</div>`;
  try {
    const data = await apiFetch("/admin/analytics");
    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty">No analytics yet</div></td></tr>`;
      if (chart)
        chart.innerHTML = `<div class="empty" style="width:100%">No analytics yet</div>`;
      return;
    }
    tbody.innerHTML = data
      .map(
        (a) => `<tr>
      <td>${a.ad_id}</td>
      <td style="font-weight:600">${a.title}</td>
      <td><span class="pill pill-cat">${a.category}</span></td>
      <td>${variantPill(a.variant)}</td>
      <td>${a.views}</td><td>${a.clicks}</td>
      <td>${ctrBar(a.ctr_percentage)}</td>
    </tr>`,
      )
      .join("");
    const maxCtr = Math.max(...data.map((d) => d.ctr_percentage), 1);
    if (chart)
      chart.innerHTML = data
        .map((a) => {
          const h = Math.round((a.ctr_percentage / maxCtr) * 100);
          const c =
            a.ctr_percentage === maxCtr ? "var(--green)" : "var(--accent)";
          return `<div class="bar-col" title="${a.title}: ${a.ctr_percentage}%">
        <div class="bar-fill" style="height:${h}%;background:${c}"></div>
        <div class="bar-label">${a.title}</div></div>`;
        })
        .join("");
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty">Error: ${e.message}</div></td></tr>`;
    if (chart)
      chart.innerHTML = `<div class="empty" style="width:100%">Error: ${e.message}</div>`;
  }
}

async function serveAd() {
  const uid = parseInt(document.getElementById("srv-uid").value);
  if (!uid) {
    toast("Enter a valid User ID", "err");
    return;
  }
  currentServeUid = uid;
  try {
    const ad = await apiFetch(`/serve-ad/${uid}`);
    currentAdId = ad.id;
    document.getElementById("srv-title").textContent = ad.title;
    document.getElementById("srv-body").textContent = ad.content;
    document.getElementById("srv-cat").textContent = ad.category;
    document.getElementById("srv-var").className =
      `pill ${ad.variant === "A" ? "pill-a" : "pill-b"}`;
    document.getElementById("srv-var").textContent = `Variant ${ad.variant}`;
    document.getElementById("srv-result").style.display = "block";
    await apiFetch("/interactions/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: uid,
        ad_id: ad.id,
        interaction_type: "view",
      }),
    });
    toast(`Served Ad #${ad.id} to User #${uid}. View logged.`, "ok");
  } catch (e) {
    toast(`✗ ${e.message}`, "err");
  }
}

async function logClick() {
  if (!currentAdId || !currentServeUid) {
    toast("Serve an ad first", "err");
    return;
  }
  try {
    await apiFetch("/interactions/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: currentServeUid,
        ad_id: currentAdId,
        interaction_type: "click",
      }),
    });
    toast("✓ Click logged", "ok");
  } catch (e) {
    toast(`✗ ${e.message}`, "err");
  }
}

// ── USERS ─────────────────────────────────────────────────
async function loadUsers() {
  const list = document.getElementById("user-list");
  list.innerHTML = `<div class="loading">Loading…</div>`;
  try {
    const users = await apiFetch("/admin/users");
    if (!users.length) {
      list.innerHTML = `<div class="empty">No users yet</div>`;
      return;
    }
    list.innerHTML = users
      .map(
        (u) => `
      <div class="list-item ${selectedUserId === u.id ? "selected" : ""}" onclick="selectUser(${u.id})" id="ur-${u.id}">
        <div class="list-id">${u.id}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            ${u.first_name || u.username} ${u.last_name || ""}
            <span class="pill ${u.is_admin ? "pill-admin" : "pill-user"}" style="margin-left:4px">${u.is_admin ? "admin" : "user"}</span>
          </div>
          <div style="font-size:11px;color:var(--muted)">@${u.username} · ${u.preferences || "—"}</div>
        </div>
      </div>`,
      )
      .join("");
  } catch (e) {
    list.innerHTML = `<div class="empty">Error: ${e.message}</div>`;
  }
}

async function selectUser(id) {
  selectedUserId = id;
  document
    .querySelectorAll("[id^='ur-']")
    .forEach((el) => el.classList.remove("selected"));
  document.getElementById(`ur-${id}`)?.classList.add("selected");
  const det = document.getElementById("user-detail");
  det.innerHTML = `<div class="loading">Loading…</div>`;
  try {
    const d = await apiFetch(`/admin/analytics/user/${id}`);
    det.innerHTML = `
      <div class="card-title">User #${id}</div>
      <div style="margin-bottom:14px;display:flex;gap:6px;flex-wrap:wrap">
        <span class="pill pill-cat">${d.gender || "—"}</span>
        ${(d.preferences || "")
          .split(",")
          .filter(Boolean)
          .map((p) => `<span class="pill pill-cat">${p.trim()}</span>`)
          .join("")}
      </div>
      ${drow("Full Name", `${d.full_name || "—"}`)}
      ${drow("Username", `@${d.username || "—"}`)}
      ${drow("Email", d.email || "—")}
      ${drow("Age", d.age || "—")}
      ${drow("Total Views", d.total_views, "var(--cyan)")}
      ${drow("Total Clicks", d.total_clicks, "var(--green)")}
      ${drow("CTR", `${d.ctr}%`, ctrColor(d.ctr))}
      <div style="margin-top:16px">
        <div style="font-size:11px;color:var(--muted);margin-bottom:6px">CTR Visual</div>
        <div class="ctr-track" style="height:8px"><div class="ctr-fill" style="width:${Math.min(d.ctr, 100)}%;background:${ctrColor(d.ctr)}"></div></div>
        <div style="font-size:11px;margin-top:4px;color:${ctrColor(d.ctr)}">${d.ctr}%</div>
      </div>`;
  } catch (e) {
    det.innerHTML = `<div class="empty">Error: ${e.message}</div>`;
  }
}

async function createPersona() {
  const prefs = document.getElementById("new-prefs").value.trim();
  if (!prefs) {
    toast("Enter preferences", "err");
    return;
  }
  try {
    const r = await apiFetch("/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences: prefs }),
    });
    toast(`✓ Persona @${r.username} created (ID ${r.user_id})`, "ok");
    document.getElementById("new-prefs").value = "";
    loadUsers();
    loadHome();
  } catch (e) {
    toast(`✗ ${e.message}`, "err");
  }
}

async function lookupUser() {
  const uid = parseInt(document.getElementById("lkp-uid").value);
  if (!uid) {
    toast("Enter a user ID", "err");
    return;
  }
  const out = document.getElementById("lkp-result");
  out.innerHTML = `<div class="loading">Looking up…</div>`;
  try {
    const u = await apiFetch(`/users/${uid}`);
    out.innerHTML = `<div class="card" style="font-size:13px">
      ${drow("ID", u.id)} ${drow("Username", "@" + u.username)} ${drow("Name", `${u.first_name} ${u.last_name}`)}
      ${drow("Email", u.email)} ${drow("Gender", u.gender)} ${drow("Age", u.age)}
      ${drow("Preferences", u.preferences)}
      ${drow("Created", new Date(u.created_at).toLocaleString())}
      <button class="btn btn-ghost btn-sm mt-3" onclick="selectUser(${u.id});goto('users')">View Analytics →</button>
    </div>`;
  } catch (e) {
    out.innerHTML = `<div style="color:var(--red);font-size:12px">✗ ${e.message}</div>`;
  }
}

async function deleteUser() {
  const uid = parseInt(document.getElementById("del-uid").value);
  if (!uid) {
    toast("Enter a user ID", "err");
    return;
  }
  if (!confirm(`Delete user #${uid} and all their interactions?`)) return;
  try {
    const r = await apiFetch(`/users/${uid}`, { method: "DELETE" });
    toast(`✓ ${r.message}`, "ok");
    loadUsers();
    loadHome();
  } catch (e) {
    toast(`✗ ${e.message}`, "err");
  }
}

// ── ADS ───────────────────────────────────────────────────
async function loadAds() {
  const list = document.getElementById("ad-list");
  list.innerHTML = `<div class="loading">Loading…</div>`;
  try {
    const ads = await apiFetch("/admin/ads");
    if (!ads.length) {
      list.innerHTML = `<div class="empty">No ads yet</div>`;
      return;
    }
    list.innerHTML = ads
      .map(
        (a) => `
      <div class="list-item ${selectedAdId === a.id ? "selected" : ""}" onclick="selectAd(${a.id})" id="ar-${a.id}">
        <div class="list-id" style="background:var(--orange-soft);border-color:var(--orange);color:var(--orange)">${a.id}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.title}</div>
          <div style="display:flex;gap:6px"><span class="pill pill-cat">${a.category}</span>${variantPill(a.variant)}</div>
        </div>
      </div>`,
      )
      .join("");
  } catch (e) {
    list.innerHTML = `<div class="empty">Error: ${e.message}</div>`;
  }
}

async function selectAd(id) {
  selectedAdId = id;
  document
    .querySelectorAll("[id^='ar-']")
    .forEach((el) => el.classList.remove("selected"));
  document.getElementById(`ar-${id}`)?.classList.add("selected");
  const wrap = document.getElementById("ad-detail-wrap");
  const det = document.getElementById("ad-detail");
  wrap.style.display = "block";
  det.innerHTML = `<div class="loading">Loading…</div>`;
  try {
    const d = await apiFetch(`/admin/analytics/ad/${id}`);
    det.innerHTML = `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:16px">
        <div>
          <div style="font-size:16px;font-weight:800;margin-bottom:8px">${d.title}</div>
          <div style="display:flex;gap:8px"><span class="pill pill-cat">${d.category}</span>${variantPill(d.variant)}</div>
        </div>
        <div style="display:flex;gap:24px">
          <div style="text-align:center"><div style="font-size:22px;font-weight:800;color:var(--cyan)">${d.total_views}</div><div style="font-size:11px;color:var(--muted)">Views</div></div>
          <div style="text-align:center"><div style="font-size:22px;font-weight:800;color:var(--green)">${d.total_clicks}</div><div style="font-size:11px;color:var(--muted)">Clicks</div></div>
          <div style="text-align:center"><div style="font-size:22px;font-weight:800;color:${ctrColor(d.ctr)}">${d.ctr}%</div><div style="font-size:11px;color:var(--muted)">CTR</div></div>
        </div>
      </div>
      <div class="ctr-track" style="height:8px"><div class="ctr-fill" style="width:${Math.min(d.ctr, 100)}%;background:${ctrColor(d.ctr)}"></div></div>
      ${d.image_url ? `<div style="margin-top:12px;font-size:12px;color:var(--muted)">Image URL: <a href="${d.image_url}" target="_blank" style="color:var(--accent)">${d.image_url}</a></div>` : ""}`;
  } catch (e) {
    det.innerHTML = `<div class="empty">Error: ${e.message}</div>`;
  }
}

async function createAd() {
  const title = document.getElementById("ad-title").value.trim();
  const content = document.getElementById("ad-content").value.trim();
  const category = document.getElementById("ad-cat").value.trim().toLowerCase();
  const variant = document.getElementById("ad-variant").value;
  const image_url = document.getElementById("ad-img").value.trim();
  if (!title || !content || !category) {
    toast("Fill in title, content, category", "err");
    return;
  }
  try {
    const ad = await apiFetch("/ads/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, category, variant, image_url }),
    });
    toast(`✓ Ad #${ad.id} published`, "ok");
    ["ad-title", "ad-content", "ad-cat", "ad-img"].forEach(
      (id) => (document.getElementById(id).value = ""),
    );
    loadAds();
    loadHome();
  } catch (e) {
    toast(`✗ ${e.message}`, "err");
  }
}

async function deleteAd() {
  const aid = parseInt(document.getElementById("del-aid").value);
  if (!aid) {
    toast("Enter an ad ID", "err");
    return;
  }
  if (!confirm(`Delete ad #${aid} and all its interactions?`)) return;
  try {
    const r = await apiFetch(`/ads/${aid}`, { method: "DELETE" });
    toast(`✓ ${r.message}`, "ok");
    loadAds();
    loadHome();
  } catch (e) {
    toast(`✗ ${e.message}`, "err");
  }
}

// ── HISTORY ───────────────────────────────────────────────
async function loadHistory() {
  const limit = document.getElementById("hist-limit").value;
  const tbody = document.getElementById("hist-body");
  tbody.innerHTML = `<tr><td colspan="7"><div class="loading">Loading…</div></td></tr>`;
  try {
    const data = await apiFetch(`/admin/history?limit=${limit}`);
    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty">No interactions yet</div></td></tr>`;
      return;
    }
    tbody.innerHTML = data
      .map(
        (row) => `<tr>
      <td style="color:var(--muted)">${row.log_id}</td>
      <td style="font-family:monospace;font-size:11px;color:var(--muted)">${row.timestamp}</td>
      <td><div style="font-size:12px">@${row.username || row.user_id}</div></td>
      <td><span class="pill pill-cat">${row.user_prefs}</span></td>
      <td style="font-weight:500;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${row.ad_title}</td>
      <td>${variantPill(row.variant)}</td>
      <td><span class="pill ${row.type === "click" ? "pill-click" : "pill-view"}">${row.type}</span></td>
    </tr>`,
      )
      .join("");
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty">Error: ${e.message}</div></td></tr>`;
  }
}

async function logManual() {
  const uid = parseInt(document.getElementById("mi-uid").value);
  const aid = parseInt(document.getElementById("mi-aid").value);
  const type = document.getElementById("mi-type").value;
  if (!uid || !aid) {
    toast("Enter both User ID and Ad ID", "err");
    return;
  }
  try {
    await apiFetch("/interactions/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: uid,
        ad_id: aid,
        interaction_type: type,
      }),
    });
    toast(`✓ Interaction logged (${type})`, "ok");
    loadHistory();
  } catch (e) {
    toast(`✗ ${e.message}`, "err");
  }
}

async function loadInteractions() {
  const limit = document.getElementById("ints-limit").value || 20;
  const out = document.getElementById("ints-result");
  out.innerHTML = `<div class="loading">Fetching…</div>`;
  try {
    const data = await apiFetch(`/interactions/?limit=${limit}`);
    out.innerHTML = jsonBlock(data);
  } catch (e) {
    out.innerHTML = `<div style="color:var(--red);font-size:12px">✗ ${e.message}</div>`;
  }
}

// ── API CONSOLE ───────────────────────────────────────────
async function apiLogin() {
  const username = document.getElementById("api-uname").value.trim();
  const password = document.getElementById("api-pass").value;
  const out = document.getElementById("api-auth-result");
  try {
    const d = await apiFetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    out.innerHTML = jsonBlock(d);
    toast("✓ Login test success", "ok");
  } catch (e) {
    out.innerHTML = `<div style="color:var(--red);font-size:12px">✗ ${e.message}</div>`;
  }
}

async function apiGetProfile() {
  const uid = parseInt(document.getElementById("api-prof-id").value);
  if (!uid) {
    toast("Enter user ID", "err");
    return;
  }
  const out = document.getElementById("api-auth-result");
  try {
    out.innerHTML = jsonBlock(await apiFetch(`/auth/profile/${uid}`));
  } catch (e) {
    out.innerHTML = `<div style="color:var(--red);font-size:12px">✗ ${e.message}</div>`;
  }
}

async function apiListUsers() {
  const out = document.getElementById("api-users-result");
  try {
    out.innerHTML = jsonBlock(await apiFetch("/users/"));
  } catch (e) {
    out.innerHTML = `<div style="color:var(--red);font-size:12px">✗ ${e.message}</div>`;
  }
}

async function apiListAds() {
  const out = document.getElementById("api-ads-result");
  try {
    out.innerHTML = jsonBlock(await apiFetch("/ads/"));
  } catch (e) {
    out.innerHTML = `<div style="color:var(--red);font-size:12px">✗ ${e.message}</div>`;
  }
}

async function apiGetAd() {
  const aid = parseInt(document.getElementById("api-ad-id").value);
  if (!aid) {
    toast("Enter ad ID", "err");
    return;
  }
  const out = document.getElementById("api-ads-result");
  try {
    out.innerHTML = jsonBlock(await apiFetch(`/ads/${aid}`));
  } catch (e) {
    out.innerHTML = `<div style="color:var(--red);font-size:12px">✗ ${e.message}</div>`;
  }
}

async function apiServeAd() {
  const uid = parseInt(document.getElementById("api-serve-uid").value);
  if (!uid) {
    toast("Enter user ID", "err");
    return;
  }
  const out = document.getElementById("api-serve-result");
  try {
    out.innerHTML = jsonBlock(await apiFetch(`/serve-ad/${uid}`));
  } catch (e) {
    out.innerHTML = `<div style="color:var(--red);font-size:12px">✗ ${e.message}</div>`;
  }
}

async function apiStats() {
  const out = document.getElementById("api-stats-result");
  try {
    out.innerHTML = jsonBlock(await apiFetch("/admin/dashboard-stats"));
  } catch (e) {
    out.innerHTML = `<div style="color:var(--red);font-size:12px">✗ ${e.message}</div>`;
  }
}

async function apiAllAnalytics() {
  const out = document.getElementById("api-stats-result");
  try {
    out.innerHTML = jsonBlock(await apiFetch("/admin/analytics"));
  } catch (e) {
    out.innerHTML = `<div style="color:var(--red);font-size:12px">✗ ${e.message}</div>`;
  }
}

// ── Init ──────────────────────────────────────────────────
checkBackend();
loadHome();
setInterval(checkBackend, 30000);

// Splash
window.addEventListener("load", () => {
  setTimeout(() => {
    const s = document.getElementById("splash");
    s.classList.add("hide");
    setTimeout(() => s.remove(), 500);
  }, 1600);
});

// Disable right-click & common DevTools shortcuts
document.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("keydown", (e) => {
  if (e.key === "F12") {
    e.preventDefault();
    return;
  }
  if (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key)) {
    e.preventDefault();
    return;
  }
  if (e.ctrlKey && e.key === "U") {
    e.preventDefault();
  }
});

const API =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:8001"
    : "https://mablytic.onrender.com";
const SESSION_KEY = "mablytic_session";
const AD_CACHE_KEY = "mablytic_ad_cache";

// ── Auth guard ────────────────────────────────────────────
// Support both old key (mablytic_session) and new key for backwards compat

const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");

// Require a valid session with a user ID and access token.
if (
  !session ||
  !session.access_token ||
  !Number.isInteger(Number(session.id)) ||
  Number(session.id) <= 0
) {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = "/";
  throw new Error("Valid authentication session required.");
}

const userId = Number(session.id);

// ── Ad state ──────────────────────────────────────────────
const adState = { 1: null, 2: null };
const clickInProgress = { 1: false, 2: false };
let isOnline = navigator.onLine;

// ── Splash ────────────────────────────────────────────────
window.addEventListener("load", () => {
  setTimeout(() => {
    const s = document.getElementById("splash");
    s.classList.add("hide");
    setTimeout(() => s.remove(), 500);
  }, 1600);
});

// ── Right-click & DevTools shortcuts disabled ─────────────
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
  if (e.ctrlKey && e.key === "U") e.preventDefault();
});

// ── Init UI ───────────────────────────────────────────────
document.getElementById("user-display").textContent =
  session?.first_name || session?.username || "User";
document.getElementById("today-date").textContent =
  new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

// Interests strip
const prefs = (session?.preferences || "").split(",").filter(Boolean);
const strip = document.getElementById("interests-strip");
if (prefs.length) {
  prefs.forEach((p) => {
    const t = document.createElement("span");
    t.className = "pref-tag";
    t.textContent = p.trim();
    strip.appendChild(t);
  });
} else {
  strip.style.display = "none";
}

// ── Logout ────────────────────────────────────────────────
function logout() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem("mablytic_session");
  window.location.href = "/";
}

// ── Online / Offline detection ────────────────────────────
function updateOnlineStatus() {
  isOnline = navigator.onLine;
  document.getElementById("offline-banner").classList.toggle("show", !isOnline);
}
window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);
updateOnlineStatus();

function isValidAd(ad) {
  return (
    !!ad &&
    typeof ad === "object" &&
    typeof ad.title === "string" &&
    ad.title.trim().length > 0 &&
    typeof ad.content === "string" &&
    ad.content.trim().length > 0
  );
}

// ── Ad cache helpers (localStorage) ──────────────────────
function getCachedAds() {
  try {
    return JSON.parse(localStorage.getItem(AD_CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}
function cacheAd(slot, ad) {
  if (!isValidAd(ad)) return;
  const c = getCachedAds();
  c[slot] = { ad, ts: Date.now() };
  localStorage.setItem(AD_CACHE_KEY, JSON.stringify(c));
}
function getCachedAd(slot) {
  const ad = getCachedAds()[slot]?.ad;
  return isValidAd(ad) ? ad : null;
}

// ── Fetch ad — network first, cache fallback ──────────────
async function fetchAdWithFallback(slot) {
  const tryFetch = async (id) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      // Exclude the ad in the other slot and the current slot's previous ad.
      const excludedIds = [
        adState[slot]?.ad_id,
        adState[slot === 1 ? 2 : 1]?.ad_id,
      ].filter(Number.isInteger);

      const params = new URLSearchParams();
      if (excludedIds.length) {
        params.set("exclude_ids", [...new Set(excludedIds)].join(","));
      }

      const url = `${API}/serve-ad/${id}${params.size ? `?${params}` : ""}`;

      const r = await fetch(url, {
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (r.status === 401) {
        logout();
        throw new Error("Session expired");
      }

      if (!r.ok) {
        throw new Error(`Ad request failed: ${r.status}`);
      }

      const ad = await r.json();
      if (!isValidAd(ad)) throw new Error("Malformed ad payload");

      cacheAd(slot, ad);
      return { ad, fromCache: false };
    } finally {
      clearTimeout(timeoutId);
    }
  };

  if (isOnline) {
    try {
      return await tryFetch(userId);
    } catch (err) {
      const cached = getCachedAd(slot);
      if (cached) return { ad: cached, fromCache: true };
      if (userId !== 1) {
        try {
          return await tryFetch(1);
        } catch {}
      }
      throw err;
    }
  }

  const cached = getCachedAd(slot);
  if (cached) return { ad: cached, fromCache: true };
  throw new Error("Offline and no cached ad available");
}

function renderAd(slot, ad, fromCache) {
  const title = document.getElementById(`promo${slot}-headline`);
  const body = document.getElementById(`promo${slot}-body`);
  const meta = document.getElementById(`promo${slot}-meta`);
  const loaded = document.getElementById(`promo${slot}-loaded`);
  const imageWrap = document.getElementById(`promo${slot}-image-wrap`);
  const image = document.getElementById(`promo${slot}-image`);
  const badge = document.getElementById(`promo-cache-badge-${slot}`);
  const error = document.getElementById(`promo${slot}-error`);

  if (!title || !body || !meta || !loaded || !badge || !error) return;

  document.getElementById(`promo-sk${slot}`).style.display = "none";
  title.textContent = ad.title || "";
  body.textContent = ad.content || "";
  meta.textContent = `${ad.category || "General"} · Variant ${ad.variant || 1}`;

  if (ad.image_url && String(ad.image_url).trim()) {
    image.src = ad.image_url;
    image.alt = ad.title || "Sponsored image";
    imageWrap.style.display = "block";
  } else {
    image.removeAttribute("src");
    imageWrap.style.display = "none";
  }

  error.style.display = "none";
  loaded.style.display = "block";
  badge.classList.toggle("show", fromCache);
}

async function loadAd(slot) {
  const skeleton = document.getElementById(`promo-sk${slot}`);
  const loaded = document.getElementById(`promo${slot}-loaded`);
  const badge = document.getElementById(`promo-cache-badge-${slot}`);
  const error = document.getElementById(`promo${slot}-error`);

  if (skeleton) skeleton.style.display = "block";
  if (loaded) loaded.style.display = "none";
  if (badge) badge.classList.remove("show");
  if (error) {
    error.textContent = "";
    error.style.display = "none";
  }

  try {
    const { ad, fromCache } = await fetchAdWithFallback(slot);
    adState[slot] = { ad_id: ad.id, title: ad.title };
    renderAd(slot, ad, fromCache);
    if (!fromCache) await logInteraction(ad.id, "view");
  } catch (err) {
    if (skeleton) skeleton.style.display = "none";
    if (loaded) loaded.style.display = "none";
    if (error) {
      error.textContent =
        "⚠ Could not load ad right now. Try again in a moment.";
      error.style.display = "block";
    }
  }
}

// ── Log interaction ───────────────────────────────────────

async function logInteraction(adId, type) {
  try {
    const response = await fetch(`${API}/interactions/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        user_id: userId,
        ad_id: adId,
        interaction_type: type,
      }),
    });

    if (response.status === 401) {
      logout();
      return false;
    }

    if (!response.ok) {
      console.error(
        "Failed to log interaction:",
        response.status,
        await response.text(),
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("Interaction logging failed:", error);
    return false;
  }
}

async function ensureNotificationPermission() {
  if (!("Notification" in window)) return false;

  if (Notification.permission === "granted") return true;
  if (Notification.permission !== "default") return false;

  try {
    return (await Notification.requestPermission()) === "granted";
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return false;
  }
}

async function showPwaNotification(title, options) {
  if (!("serviceWorker" in navigator)) return false;

  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, options);
    return true;
  } catch {
    return false;
  }
}

async function notifyAdClick(ad) {
  const label = ad?.title ? `"${ad.title}"` : `Ad #${ad?.ad_id}`;
  const message = `You clicked on ${label}.`;
  const canNotify = await ensureNotificationPermission();

  if (canNotify) {
    const shown = await showPwaNotification("MABlytic - Ad clicked", {
      body: message,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-96.png",
      tag: `mablytic-ad-click-${ad?.ad_id || Date.now()}`,
      renotify: true,
      vibrate: [120, 80, 120],
      data: { url: "/feed.html" },
    });
    if (shown) return;
  }

  alert(message);
}

// ── Click handlers ────────────────────────────────────────

async function clickAd(slot) {
  if (clickInProgress[slot]) return;

  const st = adState[slot];
  if (!st) return;

  clickInProgress[slot] = true;

  try {
    const logged = await logInteraction(st.ad_id, "click");

    if (!logged) return;

    await notifyAdClick(st);
    await loadAd(slot);
  } finally {
    clickInProgress[slot] = false;
  }
}

// ── Push notifications ────────────────────────────────────
let notifTimer = null;

function showNotifPrompt() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    document.getElementById("notif-prompt").style.display = "flex";
  }
}

async function requestNotifPermission() {
  document.getElementById("notif-prompt").style.display = "none";
  const perm = await Notification.requestPermission();
  if (perm === "granted") {
    document.getElementById("notif-banner").classList.add("show");
    setTimeout(
      () => document.getElementById("notif-banner").classList.remove("show"),
      4000,
    );
    scheduleBackgroundNotif();
  }
}

function scheduleBackgroundNotif() {
  // When user hides the app, schedule a notification after 45 seconds
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && Notification.permission === "granted") {
      notifTimer = setTimeout(() => {
        const cached = getCachedAd(1) || getCachedAd(2);
        const body = cached
          ? `New ${cached.category} deal: ${cached.title}`
          : "New personalized ads are waiting for you! 🎯";
        navigator.serviceWorker.ready
          .then((reg) => {
            reg.showNotification("MABlytic — New Ad for You", {
              body,
              icon: "/icons/icon-192.png",
              badge: "/icons/icon-96.png",
              tag: "mablytic-bg-ad",
              vibrate: [200, 100, 200],
              data: { url: "/feed.html" },
            });
          })
          .catch(() => {});
      }, 45000); // 45 seconds after going to background
    } else {
      if (notifTimer) {
        clearTimeout(notifTimer);
        notifTimer = null;
      }
    }
  });
}

// ── Service Worker registration ───────────────────────────
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("sw.js")
    .then((reg) => {
      console.log("[MABlytic] SW registered");
      reg.update();
      reg.addEventListener("updatefound", () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (
            worker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            if (
              confirm("A new MABlytic update is ready. Reload now to apply it?")
            ) {
              worker.postMessage({ type: "SKIP_WAITING" });
              window.location.reload();
            }
          }
        });
      });
    })
    .catch((err) => console.warn("[MABlytic] SW failed:", err));
}

// ── Initial load ──────────────────────────────────────────
loadAd(1);
loadAd(2);
showNotifPrompt();

// Auto-refresh ad slot 2 every 90 seconds (when online)
setInterval(() => {
  if (isOnline && document.visibilityState === "visible") loadAd(2);
}, 90000);

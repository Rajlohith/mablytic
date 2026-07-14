const API_BASE_URL = "https://mablytic.onrender.com";
const USER_ID = 1; // Hardcoded for this phase to match our seeded data
let currentAdId = null;

// DOM Elements
const adContainer = document.getElementById("ad-container");
const adTitle = document.getElementById("ad-title");
const adContent = document.getElementById("ad-content");
const adActionBtn = document.getElementById("ad-action-btn");
const refreshBtn = document.getElementById("refresh-ad-btn");

// 1. Fetch the Ad
async function fetchAd() {
    try {
        const response = await fetch(`${API_BASE_URL}/serve-ad/${USER_ID}`);
        if (!response.ok) throw new Error("Failed to fetch ad");
        
        const ad = await response.json();
        currentAdId = ad.id;

        // Update UI
        adTitle.innerText = ad.title;
        adContent.innerText = ad.content;
        adContainer.classList.remove("hidden");

        // Log the 'view' interaction
        logInteraction("view");

    } catch (error) {
        console.error("Error fetching ad:", error);
    }
}

// 2. Log Interaction to Backend (The ML Data Feed)
async function logInteraction(type) {
    if (!currentAdId) return;

    const interactionData = {
        user_id: USER_ID,
        ad_id: currentAdId,
        interaction_type: type
    };

    try {
        await fetch(`${API_BASE_URL}/interactions/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(interactionData)
        });
        console.log(`Successfully logged: ${type}`);
    } catch (error) {
        console.error(`Error logging ${type}:`, error);
    }
}

async function ensureNotificationPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'default') return false;

    try {
        return await Notification.requestPermission() === 'granted';
    } catch (error) {
        console.error("Error requesting notification permission:", error);
        return false;
    }
}

async function showPwaNotification(title, options) {
    if (!('serviceWorker' in navigator)) return false;

    try {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(title, options);
        return true;
    } catch (error) {
        console.error("Error showing PWA notification:", error);
        return false;
    }
}

async function notifyAdClick() {
    const message = `You clicked on Ad #${currentAdId}.`;
    const canNotify = await ensureNotificationPermission();

    if (canNotify) {
        const shown = await showPwaNotification('MABlytic - Ad clicked', {
            body: message,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-96.png',
            tag: `mablytic-ad-click-${currentAdId}`,
            renotify: true,
            vibrate: [120, 80, 120],
            data: { url: '/feed.html' }
        });
        if (shown) return;
    }

    alert(message);
}

// 3. Event Listeners
adActionBtn.addEventListener("click", async () => {
    await logInteraction("click");
    await notifyAdClick();
});

refreshBtn.addEventListener("click", fetchAd);

// 4. Register Service Worker (PWA Requirement)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker Registered!', reg))
            .catch(err => console.error('Service Worker Failed!', err));
    });
}

// Initialize on page load
fetchAd();

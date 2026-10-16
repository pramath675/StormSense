/**
 * Global Cyclone Intelligence System - Alerts & "Watch My Place" Engine
 * Handles user subscription, Telegram Bot API dispatching, simulated drill alerts,
 * and live notification telemetry logging.
 */

class AlertsEngine {
    constructor() {
        this.subscriptions = [];
        this.logs = [];
        this.init();
    }

    init() {
        this.loadSubscriptions();
        this.loadLogs();
        this.bindEvents();
    }

    bindEvents() {
        const form = document.getElementById("wmpSubscriptionForm");
        if (form) {
            form.addEventListener("submit", (e) => {
                e.preventDefault();
                this.handleSubscribe();
            });
        }

        const testBtn = document.getElementById("wmpTestTriggerBtn");
        if (testBtn) {
            testBtn.addEventListener("click", () => {
                this.handleTestTrigger();
            });
        }
    }

    async loadSubscriptions() {
        try {
            const r = await fetch("/api/alerts/subscriptions");
            const data = await r.json();
            if (data.status === "SUCCESS") {
                this.subscriptions = data.subscriptions || [];
                this.renderSubscriptionsList();
            }
        } catch (e) {
            console.error("Error loading alert subscriptions:", e);
        }
    }

    async loadLogs() {
        try {
            const r = await fetch("/api/alerts/logs");
            const data = await r.json();
            if (data.status === "SUCCESS") {
                this.logs = data.logs || [];
                this.renderLogsList();
            }
        } catch (e) {
            console.error("Error loading alert logs:", e);
        }
    }

    async handleSubscribe() {
        const locName = document.getElementById("wmpLocationName").value;
        const lat = parseFloat(document.getElementById("wmpLat").value);
        const lon = parseFloat(document.getElementById("wmpLon").value);
        const threshold = parseFloat(document.getElementById("wmpThreshold").value);
        const userName = document.getElementById("wmpUserName").value;
        const chatId = document.getElementById("wmpChatId").value;
        const botToken = document.getElementById("wmpBotToken").value;

        if (!locName || isNaN(lat) || isNaN(lon)) {
            alert("Please provide a valid location name and geographic coordinates.");
            return;
        }

        const payload = {
            location_name: locName,
            lat: lat,
            lon: lon,
            threshold_km: threshold,
            user_name: userName,
            telegram_chat_id: chatId,
            telegram_bot_token: botToken
        };

        try {
            const res = await fetch("/api/alerts/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.status === "SUCCESS") {
                alert(`✅ Watch Activated: "${locName}" is now actively monitored 24/7 against cyclone forecast cones.`);
                this.loadSubscriptions();
                this.loadLogs();
            }
        } catch (e) {
            console.error("Error subscribing:", e);
            alert("Error registering alert subscription.");
        }
    }

    async handleTestTrigger() {
        const locName = document.getElementById("wmpLocationName").value || "Puri Coastal Defense Base";
        const lat = parseFloat(document.getElementById("wmpLat").value) || 19.8135;
        const lon = parseFloat(document.getElementById("wmpLon").value) || 85.8312;
        const userName = document.getElementById("wmpUserName").value || "Disaster Officer";
        const chatId = document.getElementById("wmpChatId").value;
        const botToken = document.getElementById("wmpBotToken").value;

        const payload = {
            location_name: locName,
            lat: lat,
            lon: lon,
            user_name: userName,
            telegram_chat_id: chatId,
            telegram_bot_token: botToken
        };

        try {
            const res = await fetch("/api/alerts/test-trigger", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.status === "SUCCESS") {
                const status = data.dispatch_result.status;
                const details = data.dispatch_result.message || "";
                alert(`🚨 Instant Test Alert Triggered!\n\nChannel Status: ${status}\n${details}`);
                this.loadLogs();
            }
        } catch (e) {
            console.error("Error sending test alert:", e);
            alert("Error triggering test alert.");
        }
    }

    renderSubscriptionsList() {
        const container = document.getElementById("activeSubscriptionsList");
        if (!container) return;

        if (this.subscriptions.length === 0) {
            container.innerHTML = '<div style="color: #64748b; font-size: 11px;">No registered community watchpoints yet.</div>';
            return;
        }

        container.innerHTML = this.subscriptions.map(s => `
            <div style="background: rgba(16, 26, 44, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 10px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-weight: 600; color: #00f0ff; font-size: 12px;">📍 ${s.location_name}</div>
                    <div style="font-size: 10px; font-family: 'JetBrains Mono'; color: #00ff9d; background: rgba(0,255,157,0.12); padding: 2px 6px; border-radius: 4px;">Active Watch</div>
                </div>
                <div style="font-size: 11px; color: #94a3b8; font-family: 'JetBrains Mono'; margin-top: 4px;">
                    Coords: (${s.lat.toFixed(2)}, ${s.lon.toFixed(2)}) | Threshold: &le; ${s.threshold_km} km
                </div>
                <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
                    Observer: ${s.user_name} ${s.telegram_chat_id ? `| Telegram ID: ${s.telegram_chat_id}` : '| (Simulated Web Console)'}
                </div>
            </div>
        `).join("");
    }

    renderLogsList() {
        const container = document.getElementById("alertLogsList");
        if (!container) return;

        if (this.logs.length === 0) {
            container.innerHTML = '<div style="color: #64748b; font-size: 11px;">No alert events recorded yet.</div>';
            return;
        }

        container.innerHTML = this.logs.map(l => `
            <div style="background: rgba(12, 19, 32, 0.7); border-left: 3px solid ${l.distance_km <= 150 ? '#ff2a5f' : '#ffb700'}; border-radius: 4px; padding: 8px 12px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; font-size: 10px; font-family: 'JetBrains Mono'; color: #94a3b8;">
                    <span>⏱ ${new Date(l.timestamp).toUTCString()}</span>
                    <span style="color: #00ff9d;">${l.channel} [${l.delivery_status}]</span>
                </div>
                <div style="font-size: 12px; font-weight: 600; color: #f1f5f9; margin-top: 2px;">
                    🌀 ${l.storm_name} &rarr; ${l.location_name}
                </div>
                <div style="font-size: 11px; color: #cbd5e1; font-family: 'JetBrains Mono'; margin-top: 2px;">
                    Distance: ${l.distance_km} km | Wind: ${l.wind_kph} km/h | Recipient: ${l.recipient}
                </div>
            </div>
        `).join("");
    }
}

/**
 * CycloneGuard AI: Master Application Orchestrator
 * Fully interactive frontend coordinator for the CycloneGuard AI Live Tracking Dashboard
 */

class CycloneGuardApp {
    constructor() {
        this.globe = null;
        this.charts = null;
        this.activeStorms = [];
        this.selectedStorm = null;
        this.timelinePlaying = false;
        this.timelineStep = 2; // Default to '17 Oct 12:00 (Now)'
        this.timelineTimer = null;

        this.init();
    }

    async init() {
        console.log("[*] Initializing CycloneGuard AI Real-Time Risk Intelligence...");

        // 1. Initialize 3D Cesium Globe
        this.globe = new GlobeEngine("cesiumContainer");

        // 2. Initialize Charts & Radar Canvas
        this.charts = new TelemetryChartsEngine();
        this.charts.initEyewallRadarCanvas();
        this.charts.renderConfidenceGauge(78);

        // 3. Start Live Clock
        this.startLiveClock();

        // 4. Bind UI Interactions
        this.bindEvents();

        // 5. Fetch Active Storms & Data
        await this.fetchActiveStorms();

        // 6. Select first active global storm
        if (this.activeStorms.length > 0) {
            this.selectStorm(this.activeStorms[0].id);
        } else {
            this.renderCalmState();
        }
    }

    startLiveClock() {
        const clockEl = document.getElementById("headerLiveClock");
        const update = () => {
            const now = new Date();
            const dateStr = now.toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' });
            const timeStr = now.toLocaleTimeString("en-GB", { hour12: false });
            if (clockEl) {
                clockEl.textContent = `${dateStr}  ${timeStr} IST`;
            }
        };
        update();
        setInterval(update, 1000);
    }

    bindEvents() {
        // Universal Location Search
        const searchInput = document.getElementById("headerLocationSearch");
        if (searchInput) {
            searchInput.addEventListener("keypress", (e) => {
                if (e.key === "Enter") {
                    this.handleLocationSearch(searchInput.value);
                }
            });
        }

        // Left Navigation Menu Click Handlers
        document.querySelectorAll(".nav-item").forEach(item => {
            item.addEventListener("click", (e) => {
                e.preventDefault();
                const navId = item.getAttribute("data-nav");
                this.handleNavClick(navId, item);
            });
        });

        // Right Panel Tabs
        document.querySelectorAll(".rtab-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".rtab-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                const tab = btn.getAttribute("data-tab");
                this.switchRightTab(tab);
            });
        });

        // Floating Globe Controls
        const btnCompass = document.getElementById("btnCompass");
        const btnZoomIn = document.getElementById("btnZoomIn");
        const btnZoomOut = document.getElementById("btnZoomOut");
        const btnResetView = document.getElementById("btnResetView");
        const btnToggle3D = document.getElementById("btnToggle3D");

        if (btnCompass) btnCompass.addEventListener("click", () => this.globe.resetView());
        if (btnZoomIn) btnZoomIn.addEventListener("click", () => this.globe.zoomIn());
        if (btnZoomOut) btnZoomOut.addEventListener("click", () => this.globe.zoomOut());
        if (btnResetView) btnResetView.addEventListener("click", () => this.globe.resetView());
        if (btnToggle3D) btnToggle3D.addEventListener("click", () => this.globe.togglePerspective3D());

        // Timeline Controls (Play/Pause & Thumbnails)
        const playBtn = document.getElementById("timelinePlayBtn");
        if (playBtn) {
            playBtn.addEventListener("click", () => this.toggleTimelinePlay());
        }

        document.querySelectorAll(".sat-thumb-box").forEach(thumb => {
            thumb.addEventListener("click", () => {
                const step = parseInt(thumb.getAttribute("data-step"));
                this.setTimelineStep(step);
            });
        });

        // Intensity Chart Metric Toggles
        document.querySelectorAll(".it-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".it-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                const metric = btn.getAttribute("data-metric");
                if (this.selectedStorm) {
                    this.charts.renderIntensityChart(this.selectedStorm, metric);
                }
            });
        });

        // AI Assistant Drawer Toggle & Send
        const closeAiChatBtn = document.getElementById("closeAiChatBtn");
        if (closeAiChatBtn) {
            closeAiChatBtn.addEventListener("click", () => {
                document.getElementById("ai-assistant-drawer").classList.remove("open");
            });
        }

        const chatSendBtn = document.getElementById("chatSendBtn");
        const chatInput = document.getElementById("chatInput");
        if (chatSendBtn && chatInput) {
            const sendMsg = () => {
                const text = chatInput.value.trim();
                if (text) {
                    this.sendChatMessage(text);
                    chatInput.value = "";
                }
            };
            chatSendBtn.addEventListener("click", sendMsg);
            chatInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMsg(); });
        }

        // Modals close buttons
        document.querySelectorAll(".close-modal-trigger").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".cg-modal-backdrop").forEach(m => m.classList.remove("open"));
            });
        });

        // What-If Simulation Sliders
        const simWindSlider = document.getElementById("simWindSlider");
        const simTideSlider = document.getElementById("simTideSlider");
        if (simWindSlider && simTideSlider) {
            const runSim = () => {
                this.runSimulationUpdate(parseFloat(simWindSlider.value), parseFloat(simTideSlider.value));
            };
            simWindSlider.addEventListener("input", runSim);
            simTideSlider.addEventListener("input", runSim);
        }

        // Watch My Place Test Trigger
        const wmpTestBtn = document.getElementById("wmpTestTriggerBtn");
        if (wmpTestBtn) {
            wmpTestBtn.addEventListener("click", () => this.triggerTestAlert());
        }

        // Language Switcher
        document.querySelectorAll(".header-lang-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".header-lang-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                const lang = btn.getAttribute("data-lang");
                if (window.setLanguage) window.setLanguage(lang);
            });
        });
    }

    async fetchActiveStorms() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const isDemoReq = urlParams.get("demo") === "true";
            const fetchUrl = isDemoReq ? "/api/storms/active?demo=true" : "/api/storms/active";
            const r = await fetch(fetchUrl);
            const data = await r.json();
            if (data.status === "SUCCESS") {
                this.activeStorms = data.storms || [];

                // Check demo mode banner
                const isDemo = data.demo_mode || isDemoReq;
                let demoBadge = document.getElementById("demoModeBanner");
                if (isDemo) {
                    if (!demoBadge) {
                        demoBadge = document.createElement("div");
                        demoBadge.id = "demoModeBanner";
                        demoBadge.style.cssText = "background: #f59e0b; color: #000; font-weight: 800; font-size: 10px; letter-spacing: 0.8px; padding: 3px 8px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; margin-left: 10px; box-shadow: 0 0 10px rgba(245, 158, 11, 0.4);";
                        demoBadge.innerHTML = "⚠️ DEMO MODE: BENCHMARK SIMULATION";
                        const headerBrand = document.querySelector(".header-brand");
                        if (headerBrand) headerBrand.appendChild(demoBadge);
                    }
                } else if (demoBadge) {
                    demoBadge.remove();
                }

                // 1. Update Top Header KPIs
                const kpiCyclones = document.getElementById("kpiActiveCyclones");
                if (kpiCyclones) kpiCyclones.textContent = data.active_cyclones !== undefined ? data.active_cyclones : this.activeStorms.length;

                const kpiRegions = document.getElementById("kpiMonitoredRegions");
                if (kpiRegions) kpiRegions.textContent = data.monitored_regions !== undefined ? data.monitored_regions : 0;

                const kpiPop = document.getElementById("kpiPeopleAtRisk");
                if (kpiPop) {
                    kpiPop.textContent = data.people_at_risk || "0";
                    kpiPop.title = data.people_at_risk_label || "estimated exposure (GDACS)";
                }

                const kpiAlerts = document.getElementById("kpiCriticalAlerts");
                if (kpiAlerts) kpiAlerts.textContent = data.critical_alerts !== undefined ? data.critical_alerts : 0;

                const kpiSources = document.getElementById("kpiDataSources");
                if (kpiSources) kpiSources.textContent = data.data_sources_online || "8 / 8 Online";

                this.renderActiveStormsCards(this.activeStorms);
                this.globe.renderActiveStorms(this.activeStorms);

                if (this.activeStorms.length === 0) {
                    this.renderCalmState();
                }
            }
        } catch (e) {
            console.error("Error fetching active storms:", e);
        }
    }

    renderActiveStormsCards(storms) {
        const container = document.getElementById("floatingStormsList");
        if (!container) return;

        if (!storms || storms.length === 0) {
            container.innerHTML = `
                <div style="padding: 12px; font-size: 11px; color: #94a3b8; text-align: center;">
                    🌊 <strong>Ocean Waters Calm</strong><br>
                    <span style="font-size: 9.5px; color: #64748b;">No active tropical cyclones worldwide.</span>
                </div>
            `;
            return;
        }

        container.innerHTML = storms.map(s => {
            const wind = s.wind_kph || s.max_wind_kmh || 0;
            let swirlClass = "cyan";
            let pillClass = "cat1";
            if (wind >= 210) { swirlClass = "red"; pillClass = "cat4"; }
            else if (wind >= 160) { swirlClass = "red"; pillClass = "cat3"; }
            else if (wind >= 120) { swirlClass = "amber"; pillClass = "cat2"; }
            else if (wind < 63) { swirlClass = "emerald"; pillClass = "td"; }

            const nativeCat = s.category_native || s.category || "Tropical System";
            const sshwsBadge = s.sshws_badge || s.category_sshws_equiv || "";

            return `
                <div class="fac-item ${this.selectedStorm && this.selectedStorm.id === s.id ? 'active-storm' : ''}" onclick="app.selectStorm('${s.id}')">
                    <div class="fac-storm-meta">
                        <div class="storm-swirl-icon ${swirlClass}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <circle cx="12" cy="12" r="3"></circle>
                                <path d="M12 2a10 10 0 0 0-9.8 12.2l-1.7 1.7a12 12 0 1 1 18.9 0l-1.7-1.7A10 10 0 0 0 12 2z"></path>
                            </svg>
                        </div>
                        <div>
                            <div class="fac-storm-name">${s.name}</div>
                            <div class="fac-storm-telemetry">${s.wind_kph} km/h · ${s.basin || ''}</div>
                        </div>
                    </div>
                    <span class="cat-pill ${pillClass}" title="${sshwsBadge}">${nativeCat}</span>
                </div>
            `;
        }).join("");
    }

    selectStorm(stormId) {
        const storm = this.activeStorms.find(s => s.id === stormId);
        if (!storm) return;

        this.selectedStorm = storm;

        // Re-render floating card active highlights
        this.renderActiveStormsCards(this.activeStorms);

        // 1. Fly Cesium Camera centered to Storm
        this.globe.flyToCoordinates(storm.current_lat, storm.current_lon, 3600000.0, -89.9);

        // 2. Render Forecast Corridor & Cone on Globe
        this.globe.renderForecastTrack(storm);

        // 3. Populate Right Detail Panel
        this.populateRightPanel(storm);

        // 4. Update Bottom Intensity Chart & Key Locations
        this.charts.renderIntensityChart(storm, "wind");
        this.renderKeyLocationsTable(storm.key_locations || []);
    }

    populateRightPanel(storm) {
        const titlePrefix = (storm.category_native && storm.category_native.toLowerCase().includes("hurricane")) ? "Hurricane" : "Cyclone";
        document.getElementById("rightStormName").textContent = `${titlePrefix} ${storm.name}`;
        
        const catBadge = document.getElementById("rightStormCatBadge");
        if (catBadge) {
            catBadge.textContent = storm.category_native || storm.category;
            const wind = storm.wind_kph || 0;
            catBadge.className = `cat-pill ${wind >= 210 ? 'cat4' : wind >= 160 ? 'cat3' : wind >= 120 ? 'cat2' : 'cat1'}`;
            if (storm.sshws_badge) {
                catBadge.title = storm.sshws_badge;
            }
        }

        // Stats grid
        const period = storm.wind_averaging_period ? ` (${storm.wind_averaging_period})` : "";
        document.getElementById("statWindSpeed").textContent = `${storm.wind_kph} km/h${period}`;
        document.getElementById("statCentralPressure").textContent = `${storm.pressure_hpa} hPa`;
        document.getElementById("statMovement").textContent = `${storm.movement_dir_deg || 0}° at ${storm.forward_speed_kph || 0} km/h`;
        document.getElementById("statDistanceCoast").textContent = `${storm.distance_to_coast_km || '--'} km`;
        document.getElementById("statLandfall").textContent = storm.landfall_expected || "Over Open Sea";
        document.getElementById("statCategoryIMD").textContent = `${storm.category_native} · ${storm.sshws_badge || storm.category_sshws_equiv}`;

        // Footer KPI
        document.getElementById("kpiMaxWind").textContent = `${storm.wind_kph} km/h`;
        document.getElementById("kpiMinPressure").textContent = `${storm.pressure_hpa} hPa`;
        document.getElementById("kpiStormRadius").textContent = `${storm.storm_radius_km || 200} km`;

        // Advisories Tab with STALE badge calculation
        const advTextEl = document.getElementById("advisoryText");
        if (advTextEl) {
            advTextEl.textContent = storm.bulletin_text || `Official advisory for ${storm.name}. No bulletin summary available.`;
        }
        const advLinkEl = document.getElementById("advisoryOfficialLink");
        if (advLinkEl) {
            advLinkEl.href = storm.raw_url || "#";
            advLinkEl.textContent = `Official ${storm.sources ? storm.sources.join(" / ") : storm.source} Bulletin Feed →`;
        }
        const advSub = document.getElementById("advisoryHeaderSubtitle");
        if (advSub) {
            const advTimeStr = storm.advisory_time_utc || storm.last_updated;
            let isStale = false;
            if (advTimeStr) {
                const advDate = new Date(advTimeStr.endsWith("Z") ? advTimeStr : advTimeStr + "Z");
                if (!isNaN(advDate.getTime())) {
                    const diffHours = (Date.now() - advDate.getTime()) / (3600 * 1000);
                    if (diffHours > 6) isStale = true;
                }
            }
            const staleBadge = isStale ? `<span style="background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.5); font-size: 9px; padding: 2px 6px; border-radius: 4px; margin-left: 6px; font-weight: 700;" title="Advisory timestamp is > 6 hours old. Awaiting next agency issuance.">STALE (>6h)</span>` : "";
            advSub.innerHTML = `Issued: ${storm.advisory_time_ist || storm.advisory_time_utc} ${staleBadge} · Sources: ${(storm.sources || [storm.source]).join(', ')}`;
        }

        // Models Tab
        const modelsBody = document.getElementById("modelsTableBody");
        if (modelsBody) {
            const multiWinds = storm.multi_agency_winds || {};
            const keys = Object.keys(multiWinds);
            if (keys.length > 0) {
                modelsBody.innerHTML = keys.map(agency => {
                    const m = multiWinds[agency];
                    return `
                        <tr>
                            <td style="font-weight: 700; color: #fff;">${agency}</td>
                            <td style="color: #38bdf8;">${m.averaging_period || 'N/A'}</td>
                            <td style="color: #ef4444; font-weight: 600;">${m.max_wind_kmh} km/h (${m.max_wind_kt} kt)</td>
                            <td style="color: #f59e0b;">${m.category}</td>
                        </tr>
                    `;
                }).join("");
            } else {
                modelsBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 12px;">No model data</td></tr>`;
            }
        }

        // Satellite Tab: Real NASA GIBS imagery
        this.charts.renderSatelliteImagery(storm);

        // Dynamic Timeline thumbnails
        this.renderDynamicTimeline(storm);
    }

    renderDynamicTimeline(storm) {
        const strip = document.querySelector(".timeline-thumbnails-strip");
        if (!strip || !storm.timeline_snapshots || storm.timeline_snapshots.length === 0) return;

        strip.innerHTML = storm.timeline_snapshots.map((snap, idx) => {
            const isNow = snap.is_now || idx === 0;
            return `
                <div class="sat-thumb-box ${isNow ? 'active' : ''}" data-step="${idx}" onclick="app.setTimelineStep(${idx})" title="UTC: ${snap.timestamp || 'N/A'}">
                    <canvas class="sat-thumb-canvas" width="48" height="46"></canvas>
                    <span class="sat-thumb-label" style="font-size: 8.5px;">${snap.date_label}</span>
                </div>
            `;
        }).join("");

        strip.querySelectorAll(".sat-thumb-canvas").forEach((canvas, idx) => {
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#020712";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.beginPath();
            ctx.arc(24, 23, 10, 0, Math.PI * 2);
            ctx.fillStyle = idx >= 1 ? "rgba(239, 68, 68, 0.7)" : "rgba(56, 189, 248, 0.7)";
            ctx.fill();
        });
    }

    renderKeyLocationsTable(locations) {
        const tbody = document.getElementById("keyLocationsTableBody");
        if (!tbody) return;

        if (!locations || locations.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 16px;">No populated places currently within storm threat radius (< 350 km).</td></tr>`;
            return;
        }

        tbody.innerHTML = locations.map(loc => {
            let riskClass = "moderate";
            if (loc.risk.toLowerCase() === "critical") riskClass = "critical";
            else if (loc.risk.toLowerCase() === "high") riskClass = "high";

            return `
                <tr onclick="app.inspectLocation(${loc.lat}, ${loc.lon}); app.globe.setInspectionPin(${loc.lat}, ${loc.lon}); app.globe.flyToCoordinates(${loc.lat}, ${loc.lon}, 28000.0)" style="cursor: pointer;" title="Click to view full cyclone & weather intelligence for ${loc.name}">
                    <td style="font-weight: 700; color: #fff;">${loc.name} <span style="font-size: 9px; color: #64748b;">(${loc.country || ''})</span></td>
                    <td style="color: #94a3b8;">${loc.eta}</td>
                    <td><span class="risk-badge-sm ${riskClass}">${loc.risk}</span></td>
                    <td style="color: #ef4444; font-weight: 600;">${loc.max_wind}</td>
                    <td style="color: #00d2ff;">${loc.expected_rain}</td>
                </tr>
            `;
        }).join("");
    }

    showCityDetail(cityName) {
        if (!this.selectedStorm || !this.selectedStorm.key_locations) return;
        const loc = this.selectedStorm.key_locations.find(l => l.name === cityName);
        if (loc) {
            this.globe.setInspectionPin(loc.lat, loc.lon);
            this.inspectLocation(loc.lat, loc.lon);
        }
    }

    async handleLocationSearch(query) {
        if (!query) return;
        const clean = query.trim();

        // 1. Check if query matches an active storm
        const matchedStorm = this.activeStorms.find(s => 
            s.name.toLowerCase().includes(clean.toLowerCase()) || 
            (s.full_title && s.full_title.toLowerCase().includes(clean.toLowerCase()))
        );
        if (matchedStorm) {
            this.selectStorm(matchedStorm.id);
            return;
        }

        // 2. Query universal search endpoint (/api/places/search)
        try {
            const resp = await fetch(`/api/places/search?q=${encodeURIComponent(clean)}`);
            if (resp.ok) {
                const data = await resp.json();
                if (data.storms && data.storms.length > 0) {
                    this.selectStorm(data.storms[0].id);
                    return;
                }
                if (data.places && data.places.length > 0) {
                    const place = data.places[0];
                    this.globe.flyToCoordinates(place.lat, place.lon, 25000.0);
                    this.globe.setInspectionPin(place.lat, place.lon);
                    this.inspectLocation(place.lat, place.lon);
                    return;
                }
            }
        } catch(e) {
            console.warn("Local gazetteer search fallback:", e);
        }

        // 3. Fallback to Open-Meteo Geocoding API (free, global, high-precision)
        try {
            const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(clean)}&count=1&language=en&format=json`);
            const data = await res.json();
            if (data.results && data.results.length > 0) {
                const item = data.results[0];
                const lat = parseFloat(item.latitude);
                const lon = parseFloat(item.longitude);
                this.globe.flyToCoordinates(lat, lon, 25000.0);
                this.globe.setInspectionPin(lat, lon);
                this.inspectLocation(lat, lon);
                return;
            }
        } catch(e) {
            console.error("Open-Meteo geocoding error:", e);
        }

        // 4. Fallback to OpenStreetMap Nominatim
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(clean)}&limit=1`);
            const results = await res.json();
            if (results && results.length > 0) {
                const lat = parseFloat(results[0].lat);
                const lon = parseFloat(results[0].lon);
                this.globe.flyToCoordinates(lat, lon, 25000.0);
                this.globe.setInspectionPin(lat, lon);
                this.inspectLocation(lat, lon);
            } else {
                alert(`Location "${clean}" not found. Try searching for a city, island, or coastal place.`);
            }
        } catch(e) {
            console.error("Nominatim error:", e);
            alert(`Location "${clean}" not found.`);
        }
    }

    handleNavClick(navId, item) {
        document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
        item.classList.add("active");

        if (navId === "ai-assistant") {
            const drawer = document.getElementById("ai-assistant-drawer");
            drawer.classList.toggle("open");
        } else if (navId === "emergency-planning") {
            this.openSheltersModal();
        } else if (navId === "what-if") {
            this.openSimulationModal();
        } else if (navId === "alerts") {
            document.getElementById("wmpModal").classList.add("open");
        } else if (navId === "forecast-models") {
            document.getElementById("mlBenchmarkModal").classList.add("open");
        } else if (navId === "global-view") {
            this.globe.resetView();
        } else if (navId === "live-tracking") {
            if (this.selectedStorm) {
                this.globe.flyToCoordinates(this.selectedStorm.current_lat, this.selectedStorm.current_lon, 3600000.0, -89.9);
            } else {
                this.globe.resetView();
            }
        }
    }

    switchRightTab(tabKey) {
        // Tab switching logic for Right Panel
        console.log(`[Tab] Switching to ${tabKey}`);
        
        // Hide all panels and show target panel
        document.querySelectorAll(".rtab-panel").forEach(p => p.classList.remove("active"));
        const targetPanel = document.getElementById(`rtab-panel-${tabKey}`);
        if (targetPanel) {
            targetPanel.classList.add("active");
        }

        if (tabKey === "overview") {
            if (this.charts) {
                this.charts.initEyewallRadarCanvas();
                this.charts.renderConfidenceGauge(78);
            }
        } else if (tabKey === "forecast") {
            this.globe.renderForecastTrack(this.selectedStorm);
        } else if (tabKey === "satellite") {
            this.globe.setBasemap("satellite");
            if (this.charts) {
                setTimeout(() => this.charts.renderSatelliteIRCanvas(), 50);
            }
        } else if (tabKey === "impact") {
            // Focus camera on coastal landfall zone
            this.globe.flyToCoordinates(20.2, 86.6, 1200000.0);
        }
    }

    setTimelineStep(stepIndex) {
        this.timelineStep = stepIndex;

        // Update progress handle position
        const pct = (stepIndex / 6.0) * 100.0;
        const bar = document.getElementById("timelineProgress");
        const handle = document.getElementById("timelineNowHandle");
        if (bar) bar.style.width = `${pct}%`;
        if (handle) handle.style.left = `${pct}%`;

        // Update active thumbnail
        document.querySelectorAll(".sat-thumb-box").forEach(t => {
            if (parseInt(t.getAttribute("data-step")) === stepIndex) t.classList.add("active");
            else t.classList.remove("active");
        });

        // Move storm on Cesium globe
        if (this.selectedStorm) {
            this.globe.setStormPositionToStep(stepIndex, this.selectedStorm);
        }
    }

    toggleTimelinePlay() {
        const btn = document.getElementById("timelinePlayBtn");
        if (this.timelinePlaying) {
            this.timelinePlaying = false;
            clearInterval(this.timelineTimer);
            if (btn) btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
        } else {
            this.timelinePlaying = true;
            if (btn) btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
            this.timelineTimer = setInterval(() => {
                let nextStep = this.timelineStep + 1;
                if (nextStep > 6) nextStep = 0;
                this.setTimelineStep(nextStep);
            }, 1400);
        }
    }

    async sendChatMessage(userText) {
        const msgContainer = document.getElementById("chatMessages");
        if (!msgContainer) return;

        // Ensure drawer is open
        const drawer = document.getElementById("ai-assistant-drawer");
        if (drawer && !drawer.classList.contains("open")) {
            drawer.classList.add("open");
        }

        // Append user bubble
        const userDiv = document.createElement("div");
        userDiv.className = "chat-msg user";
        userDiv.textContent = userText;
        msgContainer.appendChild(userDiv);
        msgContainer.scrollTop = msgContainer.scrollHeight;

        // Add a temporary analyzing indicator
        const typingDiv = document.createElement("div");
        typingDiv.className = "chat-msg bot typing";
        typingDiv.innerHTML = '<span style="font-size: 10px; color: #00d2ff;">🧠 Analyzing topic & meteorological intelligence...</span>';
        msgContainer.appendChild(typingDiv);
        msgContainer.scrollTop = msgContainer.scrollHeight;

        try {
            const r = await fetch("/api/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userText })
            });
            const data = await r.json();

            // Remove typing indicator
            if (typingDiv.parentNode) {
                typingDiv.parentNode.removeChild(typingDiv);
            }

            const botDiv = document.createElement("div");
            botDiv.className = "chat-msg bot";

            // Add topic badge
            const topicLabel = data.topic_label || "Intelligence Briefing";
            const isScopeWarning = !data.is_on_topic;
            const badgeHtml = `<span class="chat-topic-badge ${isScopeWarning ? 'warning' : ''}">Topic: ${topicLabel}</span>`;

            // Simple markdown parser for bold, italics, bullets, newlines
            let textHtml = data.reply
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/\n/g, '<br>');

            botDiv.innerHTML = `${badgeHtml}<div>${textHtml}</div>`;
            msgContainer.appendChild(botDiv);
            msgContainer.scrollTop = msgContainer.scrollHeight;
        } catch (e) {
            console.error("Chat error:", e);
            if (typingDiv.parentNode) typingDiv.parentNode.removeChild(typingDiv);
            const errDiv = document.createElement("div");
            errDiv.className = "chat-msg bot";
            errDiv.textContent = "AI model connection error. Please try again.";
            msgContainer.appendChild(errDiv);
        }
    }

    async openSheltersModal() {
        const modal = document.getElementById("sheltersModal");
        if (!modal) return;
        modal.classList.add("open");

        try {
            const r = await fetch("/api/shelters");
            const data = await r.json();
            document.getElementById("shTotalCapacity").textContent = data.total_capacity;
            document.getElementById("shOccupancy").textContent = data.current_occupancy;
            document.getElementById("shAvailable").textContent = data.available_space;

            const tbody = document.getElementById("sheltersTableBody");
            if (tbody) {
                tbody.innerHTML = data.shelters.map(s => `
                    <tr>
                        <td style="font-weight: 700; color: #fff;">${s.name}<br><span style="font-size: 9.5px; color: #64748b;">${s.location}</span></td>
                        <td>${s.total_capacity}</td>
                        <td style="color: #f59e0b;">${s.current_occupancy}</td>
                        <td style="color: #10b981; font-weight: 700;">${s.available_space}</td>
                        <td><span style="font-size: 9px; padding: 2px 6px; border-radius: 4px; background: rgba(16,185,129,0.15); color: #10b981;">${s.status}</span></td>
                    </tr>
                `).join("");
            }
        } catch (e) {
            console.error("Shelters error:", e);
        }
    }

    openSimulationModal() {
        const modal = document.getElementById("simulationModal");
        if (modal) modal.classList.add("open");
        this.runSimulationUpdate(0, 0);
    }

    async runSimulationUpdate(windDelta, tideDelta) {
        document.getElementById("simWindVal").textContent = `${windDelta >= 0 ? '+' : ''}${windDelta}%`;
        document.getElementById("simTideVal").textContent = `${tideDelta >= 0 ? '+' : ''}${tideDelta} m`;

        try {
            const r = await fetch("/api/simulation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ wind_delta_percent: windDelta, tide_delta_m: tideDelta })
            });
            const data = await r.json();
            const res = data.results;

            document.getElementById("simPopExposed").textContent = (res.population_exposed / 1000000).toFixed(1) + " M";
            document.getElementById("simHousesExposed").textContent = (res.housing_units_exposed / 1000).toFixed(0) + " k";
            document.getElementById("simSurgeDepth").textContent = `${res.projected_storm_surge_m} m`;
            document.getElementById("simRiskTier").textContent = res.flood_inundation_risk;
        } catch (e) {
            console.error("Simulation error:", e);
        }
    }

    async inspectLocation(lat, lon) {
        const card = document.getElementById("point-intel-card");
        if (!card) return;

        // Reveal card and set loading states
        card.style.display = "block";
        const placeNameEl = document.getElementById("picPlaceName");
        const coordsEl = document.getElementById("picCoords");
        if (placeNameEl) placeNameEl.textContent = "Analyzing location...";
        if (coordsEl) coordsEl.textContent = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;

        document.getElementById("picTemp").textContent = "--°C";
        document.getElementById("picFeelsLike").textContent = "Feels: --°C";
        document.getElementById("picHumidity").textContent = "--%";
        document.getElementById("picCondition").textContent = "Fetching live weather...";
        document.getElementById("picPressure").textContent = "-- hPa";
        document.getElementById("picWind").textContent = "-- km/h";
        document.getElementById("picGusts").textContent = "Gusts: --";
        document.getElementById("picThreatTitle").textContent = "Analyzing cyclone threat...";
        const badgeEl = document.getElementById("picThreatBadge");
        badgeEl.className = "pic-threat-badge watch";
        badgeEl.textContent = "CALCULATING";
        document.getElementById("picDistEye").textContent = "-- km";
        document.getElementById("picETA").textContent = "Calculating ETA...";
        document.getElementById("picMaxWind").textContent = "-- km/h";
        document.getElementById("picExpectedRain").textContent = "-- mm";
        document.getElementById("picSurge").textContent = "-- m";
        document.getElementById("picAdvisory").textContent = "Computing threat trajectory and civil vulnerability...";
        document.getElementById("picNearestShelter").textContent = "Searching nearby shelters...";

        try {
            const resp = await fetch(`/api/point/intelligence?lat=${lat}&lon=${lon}`);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            const p = data.place || {};
            const w = data.weather || {};
            const impact = data.cyclone_impact || {};

            // 1. Place name & coordinates
            const placeTitle = p.name || `Location (${lat.toFixed(3)}°, ${lon.toFixed(3)}°)`;
            if (placeNameEl) placeNameEl.textContent = placeTitle;
            if (coordsEl) {
                const subLoc = p.district ? `${p.district}${p.state ? ', ' + p.state : ''}` : (p.state || p.country || '');
                const coordStr = `${Math.abs(lat).toFixed(3)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(3)}° ${lon >= 0 ? 'E' : 'W'}`;
                coordsEl.textContent = subLoc ? `${subLoc} · ${coordStr}` : coordStr;
            }
            if (this.globe && this.globe.updateInspectionPinLabel) {
                this.globe.updateInspectionPinLabel(placeTitle);
            }

            // 2. Real-time Atmospheric Telemetry
            document.getElementById("picTemp").textContent = `${w.temperature_c ?? '--'}°C`;
            document.getElementById("picFeelsLike").textContent = `Feels: ${w.feels_like_c ?? '--'}°C`;
            document.getElementById("picHumidity").textContent = `${w.humidity_pct ?? '--'}%`;
            document.getElementById("picCondition").textContent = `${w.condition || 'Atmospheric Nominal'}`;
            document.getElementById("picPressure").textContent = `${w.pressure_hpa ?? '--'} hPa`;
            document.getElementById("picWind").textContent = `${w.wind_kph ?? '--'} km/h`;
            document.getElementById("picGusts").textContent = `Gusts: ${w.wind_gusts_kph ?? '--'} km/h`;

            // 3. Cyclone Threat & Impact Assessment
            const threatBadge = (impact.threat_badge || "WATCH").toUpperCase();
            badgeEl.className = `pic-threat-badge ${threatBadge.toLowerCase().replace(/\s+/g, '-')}`;
            badgeEl.textContent = threatBadge;

            const stormName = impact.threatening_cyclone || "No Storm Threat";
            if (threatBadge.includes("LOW") || threatBadge.includes("SAFE") || threatBadge.includes("CALM")) {
                document.getElementById("picThreatTitle").innerHTML = `🛡️ ${impact.threat_level || 'Safe / Outside Hazard Corridor'}`;
                badgeEl.style.background = "#10b981";
                badgeEl.style.color = "#ffffff";
            } else if (threatBadge === "CRITICAL") {
                document.getElementById("picThreatTitle").innerHTML = `⚠️ Direct Threat: ${stormName}`;
                badgeEl.style.background = "#ef4444";
                badgeEl.style.color = "#ffffff";
            } else if (threatBadge === "HIGH") {
                document.getElementById("picThreatTitle").innerHTML = `⚠️ Approaching: ${stormName}`;
                badgeEl.style.background = "#f59e0b";
                badgeEl.style.color = "#ffffff";
            } else {
                document.getElementById("picThreatTitle").innerHTML = `🌀 ${stormName}`;
                badgeEl.style.background = "#00d2ff";
                badgeEl.style.color = "#03112c";
            }
            
            const distCenter = impact.distance_to_center_km ? `${impact.distance_to_center_km} km` : "> 500 km";
            const distClosest = impact.closest_approach_distance_km ? ` (Closest: ${impact.closest_approach_distance_km} km)` : "";
            document.getElementById("picDistEye").textContent = `${distCenter}${distClosest}`;
            
            // Format ETA
            let etaFormatted = impact.closest_approach_eta || "Next 48 Hours";
            if (typeof etaFormatted === "string" && etaFormatted.includes("-") && etaFormatted.includes("T")) {
                try {
                    const d = new Date(etaFormatted);
                    if (!isNaN(d.getTime())) {
                        etaFormatted = d.toLocaleDateString("en-GB", { day: '2-digit', month: 'short' }) + " " + d.toLocaleTimeString("en-GB", { hour: '2-digit', minute: '2-digit' }) + " IST";
                    }
                } catch(e) {}
            }
            document.getElementById("picETA").textContent = etaFormatted;

            document.getElementById("picMaxWind").textContent = impact.projected_peak_winds || "--";
            document.getElementById("picExpectedRain").textContent = impact.expected_rainfall || "--";
            document.getElementById("picSurge").textContent = impact.storm_surge_risk || "--";

            // 4. Detailed Approaching Storm Description & Advisory
            const advEl = document.getElementById("picAdvisory");
            const rawDesc = impact.storm_description || impact.civil_action_advisory || "Monitor local meteorological warnings and remain alert.";
            const formattedDesc = rawDesc
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/\n\n/g, '<br><br>')
                .replace(/\n/g, '<br>');
            advEl.innerHTML = formattedDesc;

            if (threatBadge === "CRITICAL") {
                advEl.style.borderLeftColor = "#ef4444";
                advEl.style.color = "#fca5a5";
                advEl.style.background = "rgba(239, 68, 68, 0.14)";
            } else if (threatBadge === "HIGH" || threatBadge.includes("ALERT")) {
                advEl.style.borderLeftColor = "#f59e0b";
                advEl.style.color = "#fde68a";
                advEl.style.background = "rgba(245, 158, 11, 0.14)";
            } else if (threatBadge === "MODERATE") {
                advEl.style.borderLeftColor = "#00d2ff";
                advEl.style.color = "#bae6fd";
                advEl.style.background = "rgba(0, 210, 255, 0.12)";
            } else {
                advEl.style.borderLeftColor = "#10b981";
                advEl.style.color = "#a7f3d0";
                advEl.style.background = "rgba(16, 185, 129, 0.14)";
            }

            const shelter = impact.nearest_shelter;
            if (shelter) {
                document.getElementById("picNearestShelter").textContent = `${shelter.name} (${shelter.distance_km} km · ${shelter.available_space} open spaces)`;
            } else {
                document.getElementById("picNearestShelter").textContent = "Regional Civil Defense Hub";
            }

            // 5. Actions: Ask AI & Zoom In
            const askBtn = document.getElementById("picAskAiBtn");
            if (askBtn) {
                askBtn.onclick = () => {
                    const prompt = `Provide a full cyclone threat report for ${placeTitle}. Threat level is ${threatBadge} regarding ${stormName}. What are expected winds, surge, and immediate safety measures?`;
                    const drawer = document.getElementById("ai-assistant-drawer");
                    if (drawer) drawer.classList.add("open");
                    const input = document.getElementById("chatInput");
                    if (input) {
                        input.value = prompt;
                        this.sendChatMessage(prompt);
                        input.value = "";
                    }
                };
            }

            const zoomBtn = document.getElementById("picZoomBtn");
            if (zoomBtn) {
                zoomBtn.onclick = () => {
                    this.globe.flyToCoordinates(lat, lon, 15000.0, -82.0);
                };
            }

        } catch (e) {
            console.error("Point intelligence error:", e);
            if (placeNameEl) placeNameEl.textContent = `Lat: ${lat.toFixed(3)}°, Lon: ${lon.toFixed(3)}°`;
            document.getElementById("picCondition").textContent = "Offline / Local estimation";
        }
    }

    closePointIntelCard() {
        const card = document.getElementById("point-intel-card");
        if (card) card.style.display = "none";
        if (this.globe && this.globe.clearInspectionPin) {
            this.globe.clearInspectionPin();
        }
    }

    renderCalmState() {
        console.log("[Calm State] All global ocean basins quiet.");
        this.selectedStorm = null;

        if (this.globe && this.globe.clearForecastTrack) {
            this.globe.clearForecastTrack();
        }

        const container = document.getElementById("floatingStormsList");
        if (container) {
            container.innerHTML = `
                <div style="padding: 16px; font-size: 11px; color: #94a3b8; text-align: center;">
                    <div style="font-size: 26px; margin-bottom: 6px;">🌊</div>
                    <strong style="color: #10b981; font-size: 12px;">All Ocean Basins Calm</strong><br>
                    <span style="font-size: 9.5px; color: #64748b;">No active tropical cyclones worldwide.<br>24/7 surveillance active across 8 global feeds.</span>
                </div>
            `;
        }

        const nameEl = document.getElementById("rightStormName");
        if (nameEl) nameEl.textContent = "All Basins Quiet";
        const catBadge = document.getElementById("rightStormCatBadge");
        if (catBadge) {
            catBadge.textContent = "CALM";
            catBadge.className = "cat-pill td";
            catBadge.style.background = "rgba(16, 185, 129, 0.2)";
            catBadge.style.color = "#10b981";
            catBadge.title = "No active storms detected worldwide";
        }

        const statW = document.getElementById("statWindSpeed");
        if (statW) statW.textContent = "Nominal (< 30 km/h)";
        const statP = document.getElementById("statCentralPressure");
        if (statP) statP.textContent = "1012 hPa (Mean)";
        const statM = document.getElementById("statMovement");
        if (statM) statM.textContent = "Quiet Waters";
        const statD = document.getElementById("statDistanceCoast");
        if (statD) statD.textContent = "N/A";
        const statL = document.getElementById("statLandfall");
        if (statL) statL.textContent = "None Expected";
        const statC = document.getElementById("statCategoryIMD");
        if (statC) statC.textContent = "Normal Seasonal Conditions";

        const kpiW = document.getElementById("kpiMaxWind");
        if (kpiW) kpiW.textContent = "0 km/h";
        const kpiP = document.getElementById("kpiMinPressure");
        if (kpiP) kpiP.textContent = "1012 hPa";
        const kpiR = document.getElementById("kpiStormRadius");
        if (kpiR) kpiR.textContent = "0 km";

        const advTextEl = document.getElementById("advisoryText");
        if (advTextEl) {
            advTextEl.innerHTML = `
                <div style="padding: 12px; background: rgba(16, 185, 129, 0.08); border-left: 3px solid #10b981; border-radius: 4px;">
                    <strong style="color: #10b981;">🛡️ WMO Global Tropical Cyclone Surveillance Briefing</strong><br><br>
                    All regional basins (North Indian Ocean, Western Pacific, Eastern Pacific, North Atlantic, Southern Hemisphere) are currently quiet with zero cyclogenesis warnings.<br><br>
                    <strong>Upcoming WMO Storm Names for 2026/2027:</strong><br>
                    • <strong>North Indian Ocean (RSMC New Delhi):</strong> Montha, Senyar, Ditum, Ni-halo, Fengal, Shakhti<br>
                    • <strong>Western North Pacific (JMA Tokyo):</strong> Ewiniar, Maliksi, Gaemi, Prapiroon, Maria, Son-Tinh<br>
                    • <strong>North Atlantic (NOAA NHC):</strong> Alberto, Beryl, Chris, Debby, Ernesto, Francine, Gordon, Helene<br>
                    • <strong>Eastern Pacific (NOAA NHC):</strong> Aletta, Bud, Carlotta, Daniel, Emilia, Fabio, Gilma<br>
                    • <strong>Southern Hemisphere (BoM / MFR):</strong> Ancha, Bakari, Chido, Dikeledi, Elvis
                </div>
            `;
        }
        const advLinkEl = document.getElementById("advisoryOfficialLink");
        if (advLinkEl) {
            advLinkEl.href = "https://mausam.imd.gov.in/";
            advLinkEl.textContent = "View RSMC New Delhi Regional Bulletins →";
        }
        const advSub = document.getElementById("advisoryHeaderSubtitle");
        if (advSub) {
            advSub.textContent = "Status: Nominal · 24/7 Automated Surveillance Active";
        }

        const modelsBody = document.getElementById("modelsTableBody");
        if (modelsBody) {
            modelsBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 16px;">All oceans calm. No numerical cyclone forecast tracks active.</td></tr>`;
        }

        const locsBody = document.getElementById("keyLocationsTableBody");
        if (locsBody) {
            locsBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #10b981; padding: 16px;">🛡️ All coastal regions report nominal conditions. Zero cyclone exposure.</td></tr>`;
        }
    }

    async triggerTestAlert() {
        try {
            const r = await fetch("/api/alerts/test-trigger", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ location_name: "Puri Coastal Defense Base", lat: 19.8135, lon: 85.8312 })
            });
            const d = await r.json();
            alert(`🚨 Drill Alert Dispatched to Telegram & Webhook!\n\nDelivery Status: ${d.dispatch_result.status}`);
        } catch (e) {
            alert("Error dispatching test alert.");
        }
    }
}

// Instantiate on DOM ready
document.addEventListener("DOMContentLoaded", () => {
    window.app = new CycloneGuardApp();
});

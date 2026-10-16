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

        // 6. Select REMAL by default
        if (this.activeStorms.length > 0) {
            this.selectStorm("REMAL");
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
        const btnZoomIn = document.getElementById("btnZoomIn");
        const btnZoomOut = document.getElementById("btnZoomOut");
        const btnResetView = document.getElementById("btnResetView");
        const btnToggle3D = document.getElementById("btnToggle3D");

        if (btnZoomIn) btnZoomIn.addEventListener("click", () => this.globe.zoomIn());
        if (btnZoomOut) btnZoomOut.addEventListener("click", () => this.globe.zoomOut());
        if (btnResetView) btnResetView.addEventListener("click", () => this.globe.resetView());

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
            const r = await fetch("/api/storms/active");
            const data = await r.json();
            if (data.status === "SUCCESS") {
                this.activeStorms = data.storms || [];
                this.renderActiveStormsCards(this.activeStorms);
                this.globe.renderActiveStorms(this.activeStorms);
            }
        } catch (e) {
            console.error("Error fetching active storms:", e);
        }
    }

    renderActiveStormsCards(storms) {
        const container = document.getElementById("floatingStormsList");
        if (!container) return;

        container.innerHTML = storms.map(s => {
            let swirlClass = "cyan";
            let pillClass = "cat1";
            if (s.id === "REMAL") { swirlClass = "red"; pillClass = "cat3"; }
            else if (s.id === "INVEST_94B") { swirlClass = "amber"; pillClass = "cat2"; }

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
                            <div class="fac-storm-telemetry">${s.wind_kph} km/h · ${s.pressure_hpa} hPa</div>
                        </div>
                    </div>
                    <span class="cat-pill ${pillClass}">Cat ${s.category.includes('3') ? '3' : s.category.includes('2') ? '2' : '1'}</span>
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

        // 1. Fly Cesium Camera to Storm
        this.globe.flyToCoordinates(storm.current_lat, storm.current_lon, 3200000.0);

        // 2. Render Forecast Corridor & Cone on Globe
        this.globe.renderForecastTrack(storm);

        // 3. Populate Right Detail Panel
        this.populateRightPanel(storm);

        // 4. Update Bottom Intensity Chart & Key Locations
        this.charts.renderIntensityChart(storm, "wind");
        this.renderKeyLocationsTable(storm.key_locations || []);
    }

    populateRightPanel(storm) {
        document.getElementById("rightStormName").textContent = `Cyclone ${storm.name}`;
        const catBadge = document.getElementById("rightStormCatBadge");
        if (catBadge) {
            catBadge.textContent = storm.category;
            catBadge.className = `cat-pill ${storm.id === 'REMAL' ? 'cat3' : 'cat2'}`;
        }

        // Stats grid
        document.getElementById("statWindSpeed").textContent = `${storm.wind_kph} km/h`;
        document.getElementById("statCentralPressure").textContent = `${storm.pressure_hpa} hPa`;
        document.getElementById("statMovement").textContent = `NW at ${storm.forward_speed_kph} km/h`;
        document.getElementById("statDistanceCoast").textContent = `${storm.distance_to_coast_km} km`;
        document.getElementById("statLandfall").textContent = storm.landfall_expected || "18 Oct, 06:00 AM";
        document.getElementById("statCategoryIMD").textContent = storm.category;

        // Footer KPI
        document.getElementById("kpiMaxWind").textContent = `${storm.wind_kph} km/h`;
        document.getElementById("kpiMinPressure").textContent = `${storm.pressure_hpa} hPa`;
        document.getElementById("kpiStormRadius").textContent = `${storm.storm_radius_km || 280} km`;
    }

    renderKeyLocationsTable(locations) {
        const tbody = document.getElementById("keyLocationsTableBody");
        if (!tbody) return;

        tbody.innerHTML = locations.map(loc => {
            let riskClass = "moderate";
            if (loc.risk.toLowerCase() === "critical") riskClass = "critical";
            else if (loc.risk.toLowerCase() === "high") riskClass = "high";

            return `
                <tr onclick="app.inspectLocation(${loc.lat}, ${loc.lon}); app.globe.setInspectionPin(${loc.lat}, ${loc.lon}); app.globe.flyToCoordinates(${loc.lat}, ${loc.lon}, 28000.0)" style="cursor: pointer;" title="Click to view full cyclone & weather intelligence for ${loc.name}">
                    <td style="font-weight: 700; color: #fff;">${loc.name}</td>
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
        const clean = query.trim().toLowerCase();

        // 1. Check if query matches an active storm
        const matchedStorm = this.activeStorms.find(s => s.name.toLowerCase().includes(clean));
        if (matchedStorm) {
            this.selectStorm(matchedStorm.id);
            return;
        }

        // 2. Comprehensive coastal cities & towns dictionary (zooms in to 15km - 35km town level!)
        const towns = [
            { name: "Puri", lat: 19.8135, lon: 85.8312, height: 25000.0 },
            { name: "Paradip", lat: 20.3165, lon: 86.6115, height: 20000.0 },
            { name: "Bhubaneswar", lat: 20.2961, lon: 85.8245, height: 35000.0 },
            { name: "Cuttack", lat: 20.4625, lon: 85.8828, height: 30000.0 },
            { name: "Jagatsinghpur", lat: 20.2644, lon: 86.1717, height: 20000.0 },
            { name: "Kendrapara", lat: 20.5014, lon: 86.4225, height: 20000.0 },
            { name: "Balasore", lat: 21.4934, lon: 86.9135, height: 25000.0 },
            { name: "Chandipur", lat: 21.4700, lon: 87.0160, height: 15000.0 },
            { name: "Digha", lat: 21.6266, lon: 87.5074, height: 18000.0 },
            { name: "Sagar Island", lat: 21.6500, lon: 88.1000, height: 28000.0 },
            { name: "Haldia", lat: 22.0667, lon: 88.0698, height: 25000.0 },
            { name: "Kolkata", lat: 22.5726, lon: 88.3639, height: 45000.0 },
            { name: "Gopalpur", lat: 19.2600, lon: 84.9000, height: 18000.0 },
            { name: "Visakhapatnam", lat: 17.6868, lon: 83.2185, height: 35000.0 },
            { name: "Chennai", lat: 13.0827, lon: 80.2707, height: 45000.0 },
            { name: "Mumbai", lat: 19.0760, lon: 72.8777, height: 50000.0 },
            { name: "Dhaka", lat: 23.8103, lon: 90.4125, height: 45000.0 }
        ];

        const matchedTown = towns.find(t => t.name.toLowerCase().includes(clean));
        if (matchedTown) {
            this.globe.flyToCoordinates(matchedTown.lat, matchedTown.lon, matchedTown.height);
            this.globe.setInspectionPin(matchedTown.lat, matchedTown.lon);
            this.inspectLocation(matchedTown.lat, matchedTown.lon);
            return;
        }

        // 3. Fallback to OpenStreetMap geocoding for ANY global town or village!
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
            const results = await res.json();
            if (results && results.length > 0) {
                const lat = parseFloat(results[0].lat);
                const lon = parseFloat(results[0].lon);
                this.globe.flyToCoordinates(lat, lon, 25000.0);
                this.globe.setInspectionPin(lat, lon);
                this.inspectLocation(lat, lon);
            } else {
                alert(`Location "${query}" not found. Try searching for a city, state, or coastal town.`);
            }
        } catch(e) {
            console.error("Geocoding error:", e);
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

        // Append user bubble
        const userDiv = document.createElement("div");
        userDiv.className = "chat-msg user";
        userDiv.textContent = userText;
        msgContainer.appendChild(userDiv);
        msgContainer.scrollTop = msgContainer.scrollHeight;

        try {
            const r = await fetch("/api/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userText })
            });
            const data = await r.json();

            const botDiv = document.createElement("div");
            botDiv.className = "chat-msg bot";
            botDiv.innerHTML = data.reply.replace(/\n/g, "<br>");
            msgContainer.appendChild(botDiv);
            msgContainer.scrollTop = msgContainer.scrollHeight;
        } catch (e) {
            console.error("Chat error:", e);
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
            if (coordsEl) coordsEl.textContent = p.formatted || `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;
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
            badgeEl.className = `pic-threat-badge ${threatBadge.toLowerCase()}`;
            badgeEl.textContent = threatBadge;

            const stormName = impact.threatening_cyclone || "Cyclone REMAL";
            document.getElementById("picThreatTitle").innerHTML = `🌀 ${stormName}`;
            
            const distCenter = impact.distance_to_center_km ? `${impact.distance_to_center_km} km` : "> 500 km";
            const distClosest = impact.closest_approach_distance_km ? ` (Closest: ${impact.closest_approach_distance_km} km)` : "";
            document.getElementById("picDistEye").textContent = `${distCenter}${distClosest}`;
            
            // Format ETA
            let etaFormatted = impact.closest_approach_eta || "Next 48 Hours";
            if (etaFormatted.includes("T")) {
                try {
                    const d = new Date(etaFormatted);
                    etaFormatted = d.toLocaleDateString("en-GB", { day: '2-digit', month: 'short' }) + " " + d.toLocaleTimeString("en-GB", { hour: '2-digit', minute: '2-digit' }) + " IST";
                } catch(e) {}
            }
            document.getElementById("picETA").textContent = etaFormatted;

            document.getElementById("picMaxWind").textContent = impact.projected_peak_winds || "--";
            document.getElementById("picExpectedRain").textContent = impact.expected_rainfall || "--";
            document.getElementById("picSurge").textContent = impact.storm_surge_risk || "--";

            // 4. Civil Advisory & Nearest Shelter
            const advEl = document.getElementById("picAdvisory");
            advEl.textContent = impact.civil_action_advisory || "Monitor local meteorological warnings and remain alert.";
            if (threatBadge === "CRITICAL") {
                advEl.style.borderLeftColor = "#ef4444";
                advEl.style.color = "#fca5a5";
                advEl.style.background = "rgba(239, 68, 68, 0.12)";
            } else if (threatBadge === "HIGH") {
                advEl.style.borderLeftColor = "#f59e0b";
                advEl.style.color = "#fde68a";
                advEl.style.background = "rgba(245, 158, 11, 0.12)";
            } else if (threatBadge === "MODERATE") {
                advEl.style.borderLeftColor = "#eab308";
                advEl.style.color = "#fef08a";
                advEl.style.background = "rgba(234, 179, 8, 0.12)";
            } else {
                advEl.style.borderLeftColor = "#10b981";
                advEl.style.color = "#a7f3d0";
                advEl.style.background = "rgba(16, 185, 129, 0.12)";
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

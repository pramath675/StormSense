/**
 * CycloneGuard AI: Chart & Canvas Visualization Engine
 * Matches the exact visual charts in the CycloneGuard AI dashboard:
 *  - Doppler Eyewall Radar Canvas generator
 *  - Intensity Forecast Chart (Wind Speed, Pressure, Rainfall)
 *  - Circular Track Confidence Gauge (78%)
 */

class TelemetryChartsEngine {
    constructor() {
        this.intensityChart = null;
        this.activeMetric = "wind";
        this.radarAnimationId = null;
    }

    initEyewallRadarCanvas() {
        const canvas = document.getElementById("eyewallRadarCanvas");
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        let angle = 0;

        const renderRadar = () => {
            const w = canvas.width = canvas.parentElement.clientWidth || 350;
            const h = canvas.height = canvas.parentElement.clientHeight || 150;
            const cx = w / 2;
            const cy = h / 2;

            // Background space
            ctx.fillStyle = "#020714";
            ctx.fillRect(0, 0, w, h);

            // Draw concentric range rings
            ctx.strokeStyle = "rgba(0, 210, 255, 0.15)";
            ctx.lineWidth = 1;
            for (let r = 25; r < 140; r += 30) {
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Draw rotating spiral storm rainbands
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(angle);

            // Eyewall core (Red / Orange)
            const eyeGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 45);
            eyeGrad.addColorStop(0, "rgba(2, 6, 16, 0.95)"); // calm eye
            eyeGrad.addColorStop(0.3, "rgba(239, 68, 68, 0.85)"); // eyewall peak reflectivity
            eyeGrad.addColorStop(0.7, "rgba(245, 158, 11, 0.65)");
            eyeGrad.addColorStop(1, "transparent");

            ctx.fillStyle = eyeGrad;
            ctx.beginPath();
            ctx.arc(0, 0, 48, 0, Math.PI * 2);
            ctx.fill();

            // Spiral spiral bands
            for (let arm = 0; arm < 4; arm++) {
                ctx.rotate((Math.PI / 2) * arm);
                ctx.beginPath();
                for (let t = 10; t < 120; t += 2) {
                    const theta = t * 0.08;
                    const rad = 15 + t;
                    const x = rad * Math.cos(theta);
                    const y = rad * Math.sin(theta);
                    if (t === 10) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.strokeStyle = arm % 2 === 0 ? "rgba(239, 68, 68, 0.6)" : "rgba(16, 185, 129, 0.45)";
                ctx.lineWidth = arm % 2 === 0 ? 6 : 4;
                ctx.stroke();
            }
            ctx.restore();

            // Crosshair
            ctx.strokeStyle = "rgba(0, 210, 255, 0.25)";
            ctx.beginPath();
            ctx.moveTo(cx - 15, cy); ctx.lineTo(cx + 15, cy);
            ctx.moveTo(cx, cy - 15); ctx.lineTo(cx, cy + 15);
            ctx.stroke();

            // Calm eye label
            ctx.fillStyle = "#ffffff";
            ctx.font = 'bold 9px "JetBrains Mono"';
            ctx.fillText("EYE 950 hPa", cx + 8, cy - 8);

            angle += 0.015;
            this.radarAnimationId = requestAnimationFrame(renderRadar);
        };

        if (this.radarAnimationId) cancelAnimationFrame(this.radarAnimationId);
        renderRadar();
    }

    renderIntensityChart(storm, metricType = "wind") {
        this.activeMetric = metricType;
        const ctx = document.getElementById("intensityChartCanvas");
        if (!ctx) return;

        if (this.intensityChart) {
            this.intensityChart.destroy();
        }

        const labels = [];
        const windData = [];
        const pressureData = [];
        const rainData = [];

        if (storm) {
            labels.push("Now");
            windData.push(storm.wind_kph || Math.round((storm.wind_kt || 0) * 1.852) || 0);
            pressureData.push(storm.pressure_hpa || 1010);
            rainData.push(Math.round((storm.wind_kph || 80) * 0.7));

            if (storm.forecast_track && storm.forecast_track.length > 0) {
                storm.forecast_track.forEach(pt => {
                    labels.push(`+${pt.hour || 24}h`);
                    windData.push(pt.wind_kph || Math.round((pt.wind_kt || 0) * 1.852) || 0);
                    pressureData.push(pt.pressure_hpa || 1005);
                    rainData.push(Math.round((pt.wind_kph || 60) * 0.5));
                });
            }
        }

        let datasetLabel = "Wind Speed (km/h)";
        let chartData = windData;
        let borderColor = "#ef4444";
        let bgColor = "rgba(239, 68, 68, 0.15)";
        let yUnit = "km/h";
        let isBar = false;

        if (metricType === "pressure") {
            datasetLabel = "Central Pressure (hPa)";
            chartData = pressureData;
            borderColor = "#f59e0b";
            bgColor = "rgba(245, 158, 11, 0.15)";
            yUnit = "hPa";
        } else if (metricType === "rain") {
            datasetLabel = "Estimated Precipitation (mm/h)";
            chartData = rainData;
            borderColor = "#00d2ff";
            bgColor = "rgba(0, 210, 255, 0.4)";
            yUnit = "mm/h";
            isBar = true;
        }

        this.intensityChart = new Chart(ctx, {
            type: isBar ? "bar" : "line",
            data: {
                labels: labels,
                datasets: [{
                    label: datasetLabel,
                    data: chartData,
                    borderColor: borderColor,
                    backgroundColor: bgColor,
                    borderWidth: 2.2,
                    fill: !isBar,
                    tension: 0.35,
                    pointBackgroundColor: borderColor,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: "rgba(5, 12, 26, 0.95)",
                        borderColor: "rgba(0, 210, 255, 0.4)",
                        borderWidth: 1,
                        titleColor: "#00d2ff",
                        bodyColor: "#ffffff",
                        bodyFont: { family: "JetBrains Mono" },
                        callbacks: {
                            label: (context) => ` ${datasetLabel}: ${context.raw} ${yUnit}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: "rgba(255, 255, 255, 0.05)" },
                        ticks: { color: "#64748b", font: { family: "JetBrains Mono", size: 9 } }
                    },
                    y: {
                        grid: { color: "rgba(255, 255, 255, 0.05)" },
                        ticks: { color: "#64748b", font: { family: "JetBrains Mono", size: 9 } }
                    }
                }
            }
        });
    }

    renderConfidenceGauge(confidencePercent = 78) {
        const canvas = document.getElementById("confidenceGaugeCanvas");
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        const w = canvas.width = 72;
        const h = canvas.height = 72;
        const cx = w / 2;
        const cy = h / 2;
        const r = 30;

        ctx.clearRect(0, 0, w, h);

        // Background track arc
        ctx.beginPath();
        ctx.arc(cx, cy, r, Math.PI * 0.75, Math.PI * 2.25);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.stroke();

        // Active progress arc
        const startAngle = Math.PI * 0.75;
        const endAngle = startAngle + (Math.PI * 1.5 * (confidencePercent / 100.0));

        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, "#00d2ff");
        grad.addColorStop(1, "#2563eb");

        ctx.beginPath();
        ctx.arc(cx, cy, r, startAngle, endAngle);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.stroke();
    }

    renderSatelliteImagery(storm) {
        const wrap = document.getElementById("satellitePreviewWrap");
        const img = document.getElementById("satelliteRealImg");
        const noData = document.getElementById("satelliteNoData");
        const timeBadge = document.getElementById("satTimestampBadge");
        const sensorEl = document.getElementById("satSensorName");
        const titleEl = document.getElementById("satPanelTitle");

        if (!storm) return;

        const basin = (storm.basin || "").toLowerCase();
        const lat = storm.current_lat || storm.lat || 0;
        const lon = storm.current_lon || storm.lon || 0;
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);

        let layer = null;
        let sensorName = "No Sensor";

        if (basin.includes("west pacific") || basin.includes("australian") || lon > 100) {
            layer = "Himawari_AHI_Band13_Clean_Infrared";
            sensorName = "JMA Himawari-9 AHI (10.4 µm)";
        } else if (basin.includes("east pacific") || basin.includes("atlantic") || basin.includes("central pacific") || lon < -50) {
            layer = lon < -120 ? "GOES-West_ABI_Band13_Clean_Infrared" : "GOES-East_ABI_Band13_Clean_Infrared";
            sensorName = "NOAA GOES ABI (10.3 µm)";
        }

        if (layer && img && wrap && noData) {
            const minLat = Math.max(-85, lat - 5.0);
            const maxLat = Math.min(85, lat + 5.0);
            const minLon = Math.max(-180, lon - 5.0);
            const maxLon = Math.min(180, lon + 5.0);

            const wmsUrl = `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&LAYERS=${layer}&VERSION=1.3.0&FORMAT=image/png&TRANSPARENT=true&WIDTH=340&HEIGHT=160&CRS=EPSG:4326&BBOX=${minLat},${minLon},${maxLat},${maxLon}&TIME=${dateStr}`;

            img.src = wmsUrl;
            img.style.display = "block";
            noData.style.display = "none";
            if (timeBadge) timeBadge.textContent = `Acquired: ${dateStr} (NASA GIBS)`;
            if (sensorEl) sensorEl.textContent = sensorName;
            if (titleEl) titleEl.textContent = `${sensorName} Imagery`;
        } else if (img && noData) {
            img.style.display = "none";
            noData.style.display = "flex";
            if (timeBadge) timeBadge.textContent = "No imagery";
            if (sensorEl) sensorEl.textContent = "None for Basin";
            if (titleEl) titleEl.textContent = "Satellite Imagery (NASA GIBS)";
        }
    }

    renderSatelliteIRCanvas(storm) {
        // Alias for backwards compatibility
        this.renderSatelliteImagery(storm);
    }
}


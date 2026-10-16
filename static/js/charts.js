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

        const labels = ["16 Oct 12:00", "17 Oct 12:00 (Now)", "18 Oct 12:00", "19 Oct 12:00", "20 Oct 12:00", "21 Oct 12:00"];
        
        let datasetLabel = "Wind Speed (km/h)";
        let chartData = [120, 185, 160, 95, 50, 30];
        let borderColor = "#ef4444";
        let bgColor = "rgba(239, 68, 68, 0.15)";
        let yUnit = "km/h";
        let isBar = false;

        if (metricType === "pressure") {
            datasetLabel = "Central Pressure (hPa)";
            chartData = [982, 950, 965, 986, 998, 1006];
            borderColor = "#f59e0b";
            bgColor = "rgba(245, 158, 11, 0.15)";
            yUnit = "hPa";
        } else if (metricType === "rain") {
            datasetLabel = "Precipitation (mm/h)";
            chartData = [45, 85, 75, 40, 15, 5];
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

    renderSatelliteIRCanvas() {
        const canvas = document.getElementById("satelliteIRCanvas");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const w = canvas.width = canvas.parentElement.clientWidth || 340;
        const h = canvas.height = canvas.parentElement.clientHeight || 160;
        const cx = w / 2;
        const cy = h / 2;

        ctx.fillStyle = "#010409";
        ctx.fillRect(0, 0, w, h);

        // CDO Central Dense Overcast Cloud Top Gradient
        const cdoGrad = ctx.createRadialGradient(cx, cy, 8, cx, cy, 75);
        cdoGrad.addColorStop(0, "#020617"); // Warm calm eye
        cdoGrad.addColorStop(0.15, "#ffffff"); // Coldest eyewall tops (< -80C)
        cdoGrad.addColorStop(0.35, "#e879f9"); // Deep convection
        cdoGrad.addColorStop(0.60, "#a855f7"); // Strong convection
        cdoGrad.addColorStop(0.85, "#2563eb"); // Feeder band tops
        cdoGrad.addColorStop(1, "transparent");

        ctx.fillStyle = cdoGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, 75, 0, Math.PI * 2);
        ctx.fill();

        // Spiral IR banding
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            for (let a = 0; a < Math.PI * 1.5; a += 0.1) {
                const r = 20 + a * 25 + i * 15;
                const x = cx + r * Math.cos(a + i);
                const y = cy + r * Math.sin(a + i);
                if (a === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = "rgba(168, 85, 247, 0.45)";
            ctx.lineWidth = 12;
            ctx.stroke();
        }

        // Eyewall crosshair
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - 10, cy); ctx.lineTo(cx + 10, cy);
        ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy + 10);
        ctx.stroke();
    }
}


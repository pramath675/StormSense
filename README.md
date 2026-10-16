# CycloneGuard AI — Real-Time Cyclone Risk Intelligence

> **Predict · Assess · Explain · Prepare · Protect**  
> An enterprise-grade, full-stack geospatial intelligence and disaster early-warning mission-control system. Built with **Flask**, **CesiumJS (3D Digital Earth)**, **Doppler Eyewall Radar Reflectivity Canvas**, **Physics-Informed Machine Learning Forecasting**, and automated community push notifications via **Telegram Bot API**.

![CycloneGuard AI Live Dashboard Preview](reference_images/CycloneGuard%20AI%20Live%20Tracking%20Dashboard.png)

---

## 🌟 Key Architecture & Capabilities


### 1. High-Performance Backend & Data Pipeline (`server.py`)
- **Real-Time Data Ingestion**: Live feeds and telemetry from **NOAA IBTrACS**, **GDACS (Global Disaster Alert and Coordination System)** GeoJSON/RSS, and **Open-Meteo Severe Marine/Weather APIs**.
- **Automated Proximity & Impact Matching**: Haversine distance tracking against 42 coastal/vulnerable global metropolitan centers (e.g. Mumbai, Chennai, Puri, Kolkata, Dhaka, Manila, Tokyo, Miami, Havana, Darwin) estimating vulnerable population exposure and risk categorization (**Critical**, **High**, **Moderate**, **Watch Zone**).
- **Resilient Fallback Tier**: High-availability architecture guaranteeing zero downtime and uninterrupted situational awareness even if external upstream feeds experience network latency or rate-limiting.

### 2. Machine Learning Forecasting & Baseline Comparison Engine (`train.py`)
- **Multi-Horizon Trajectory & Intensity Prediction**: Trains supervised regression models (Ridge + Gradient Boosting Regressor ensembles) to forecast storm positions ($\Delta\text{lat}, \Delta\text{lon}$) and maximum sustained wind speeds at **+6h, +12h, +18h, and +24h** horizons (with extended projections to +48h and +72h).
- **Physics-Informed Features**: Incorporates Coriolis beta-drift acceleration ($\sin(\text{lat})$), forward velocity vectors, heading dynamics, central pressure deficits $(1013.25 - P_c)$, and past 6h/12h rate of change.
- **Rigorous Baseline Benchmarking**:
  - **Baseline 1: No-Change (Persistence)** — Evaluates error assuming storm remains static.
  - **Baseline 2: Constant-Motion (CLIPER-like Linear Extrapolation)** — Extrapolates along past 6h synoptic trajectory.
  - **Our ML Model**: Evaluated on a chronologically held-out test split, computing **Wind MAE (knots)** and **Track Error (km)**.
- **Cross-Platform Hardware Profiling**: Detects and profiles compute architecture (**x86_64 / AMD64**, **IBM Z / s390x Enterprise Mainframe**, and **ARM64 / AArch64**) recording core count, inference latency (ms/forecast), and throughput.

### 3. "Watch My Place" Public Safety & Telegram Alert Pipeline
- **Autonomous Threat Detection**: Background daemon checks active cyclone 24-hour forecast cones and high-gust radii against user-registered locations every 15 minutes.
- **Instant Emergency Alerts**: Formats structured emergency bulletins with estimated closest approach, sustained wind speeds, landfall ETA, and civil protection checklists.
- **Telegram Bot Integration**: Dispatches push alerts via `https://api.telegram.org/bot<TOKEN>/sendMessage` (with instant simulated drill fallback for web-based testing).

### 4. 3D Digital Earth UI/UX (`templates/index.html` & `static/`)
- **CesiumJS 3D Photorealistic Globe**: GPU-accelerated rendering of planetary terrain, active storm coordinates, dashed past tracks, glowing forecast paths, and expanding uncertainty cones.
- **Tactical Mission-Control Aesthetics**: Dark mode glassmorphism panels, pulsing warning markers, and synchronized UTC and Local clocks.
- **Telemetry Charts (Chart.js)**: 72-hour historical and forecast curves for sustained wind/gusts, barometric pressure drops, and precipitation accumulation.
- **Multi-Language Accessibility (i18n)**: Real-time localization toggle supporting **English (EN)**, **Hindi (हिंदी)**, and **Kannada (ಕನ್ನಡ)**.

---

## 🚀 Quickstart Guide

### 1. Installation
Clone the repository and install pinned dependencies:
```bash
pip install -r requirements.txt
```

### 2. Train and Benchmark the ML Forecasting Models
Run the training pipeline to generate the physics-guided dataset, benchmark against persistence and constant-motion baselines, and profile system hardware:
```bash
python train.py
```
This generates:
- `models/cyclone_forecast_model.pkl`: Serialized multi-horizon inference models.
- `data/model_metrics.json`: Exported validation errors, MAE metrics, and hardware benchmark telemetry.

### 3. Launch the Mission Control Server
Start the Flask application:
```bash
python server.py
```
Open your browser at:
```
http://127.0.0.1:5000/
```

---

## 📡 REST API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/system/health` | `GET` | System uptime, 3/3 data source status, hardware architecture, and inference latency |
| `/api/storms/active` | `GET` | All active cyclones with current coordinates, ML forecast cones, and affected cities |
| `/api/storms/<id>/details` | `GET` | Detailed dossier including 72h telemetry timeseries and official advisories |
| `/api/storms/historical` | `GET` | Curated archive of famous historical cyclones (Amphan, Biparjoy, Haiyan, Fani, Katrina) |
| `/api/forecast/weather` | `GET` | Open-Meteo proxy for live marine weather at any latitude/longitude |
| `/api/ml/metrics` | `GET` | ML model vs persistence and constant-motion baseline evaluation metrics |
| `/api/alerts/subscribe` | `POST` | Register a new city/location for 24/7 "Watch My Place" monitoring |
| `/api/alerts/subscriptions` | `GET` | List all active community watchpoints |
| `/api/alerts/test-trigger` | `POST` | Dispatch an immediate test alert to Telegram or the simulated console |
| `/api/alerts/logs` | `GET` | Chronological log of dispatched emergency notifications |

---

## 🌐 Community Localization (I18N)

Switch instantly between languages using the top-bar controls:
- **EN**: English (Global standard)
- **हिंदी**: Hindi (National disaster response standard)
- **ಕನ್ನಡ**: Kannada (Coastal Karnataka disaster response standard)

---

## ⚙️ Environment Variables (Optional)

To enable live production Telegram Bot notifications, set the following environment variables:
```bash
export TELEGRAM_BOT_TOKEN="your_bot_token_from_botfather"
export TELEGRAM_CHAT_ID="your_channel_or_user_chat_id"
```
*(If unset, the system automatically uses the built-in simulated mission-control console dispatcher so you can test all alert functionality immediately in the UI without setup!)*

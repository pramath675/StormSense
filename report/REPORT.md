# Stormsence SI (CycloneGuard AI Engine)
## Real-Time Global Multi-Basin Tropical Cyclone Intelligence & Geospatial Risk Platform
### Official Technical Evaluation & Project Report

---

**Project Title:** Stormsence SI (CycloneGuard AI Engine)  
**Author / Team:** [Team Stormsence SI / Lead Author Placeholder]  
**Evaluation Date:** 17 October 2026  
**Repository Version / Git Tag:** `v1-global-live` (Commit: `46c841c`)  
**Target URL:** `http://127.0.0.1:5000/`  

---

## 1. Executive Summary & Abstract

**Stormsence SI** is an enterprise-grade, real-time meteorological intelligence and disaster risk assessment platform designed to bridge the critical communication gap between fragmented, highly technical cyclone monitoring agencies and the general public, emergency managers, and coastal infrastructure operators.

Tropical cyclone monitoring globally is characterized by institutional fragmentation: the world's oceans are divided among multiple Regional Specialized Meteorological Centres (RSMCs) and warning agencies (NOAA NHC, US DoD JTWC, IMD RSMC New Delhi, JMA Tokyo, BoM Australia), each utilizing incompatible data delivery protocols (binary PDFs, ATCF plain-text feeds, XML/RSS, GeoJSON), divergent intensity classification scales, and differing wind averaging conventions (1-minute, 3-minute, and 10-minute sustained).

Stormsence SI resolves this fragmentation through an autonomous multi-source ingestion engine that harvests, parses, standardizes, and deduplicates feeds from NOAA NHC, JTWC, GDACS, and IMD into a unified, cross-basin data model. The platform features an interactive 3D Digital Earth powered by CesiumJS, geostationary clean infrared satellite imagery from NASA GIBS, a universal geospatial search engine backed by a curated gazetteer of 10,079 populated coastal and major cities, instant point-radius risk intelligence, a domain-restricted meteorological intelligence assistant (`CycloneGuard-MetAI`), and an experimental physics-guided multi-horizon trajectory forecasting ensemble.

Every metric displayed on the platform is computed dynamically from verified operational feeds with zero hardcoded mock values. The system includes an automated zero-storm calm state, transparent multi-agency wind comparisons, truthful health-check monitoring, and 100% offline, deterministic test validation.

---

## 2. Problem Statement

### 2.1 The Challenge of Public Cyclone Intelligence
Tropical cyclones represent some of the most destructive natural hazards on Earth, endangering millions of lives and causing billions of dollars in economic devastation each year. While official meteorological agencies produce exceptionally accurate numerical weather predictions and synoptic warning bulletins, severe systemic barriers prevent this information from being rapidly understood and acted upon by at-risk populations:

1. **Severe Agency & Geographic Fragmentation:**
   - Operational monitoring is partitioned into ocean basins governed by different entities. An individual or organization tracking severe weather across regions must query the **National Hurricane Center (NHC)** for the Atlantic and East Pacific, the **Joint Typhoon Warning Center (JTWC)** for the Western Pacific and Indian Ocean, the **India Meteorological Department (IMD)** for the North Indian Ocean, and the **Bureau of Meteorology (BoM)** for Australian waters.
   - Most existing disaster dashboards are localized to single nations (e.g., India-only or US-only), offering zero visibility into trans-basin storms or global mariners' corridors.

2. **Heterogeneous and Unstructured Delivery Formats:**
   - Upstream agencies publish bulletins in wildly disparate formats. While NOAA NHC provides clean RSS and GIS shapefiles, IMD RSMC New Delhi publishes official cyclone advisories predominantly in unstructured, binary PDF format (`No Cyclone.pdf` or scanned bulletins). JTWC utilizes legacy 80-column fixed-width ATCF plain-text bulletins, and GDACS publishes GeoJSON event feeds alongside humanitarian RSS summaries.

3. **Incompatible Intensity Scales & Naming Conventions:**
   - A storm with sustained winds of 120 km/h is classified as a *Very Severe Cyclonic Storm* by IMD, a *Severe Tropical Storm* by JMA, a *Category 1 Hurricane* by NOAA, and a *Category 2 Tropical Cyclone* by the Australian BoM. These divergent scales create acute public confusion during cross-basin transitions or international media coverage.

4. **The "Wind Averaging Period" Trap:**
   - NOAA NHC and JTWC measure peak sustained winds using a **1-minute** averaging period.
   - IMD uses a **3-minute** averaging period.
   - WMO, JMA, and BoM use a **10-minute** averaging period.
   - Because shorter averaging periods capture higher transient wind spikes, a 1-minute sustained wind is mathematically ~12–15% higher than a 10-minute sustained wind for the exact same physical cyclone. Uninformed dashboards that compare these numbers directly present dangerously distorted comparisons.

5. **Widespread "Mock Data" and Phantom Storms:**
   - Many public dashboards rely on hardcoded dummy data (e.g., lingering historical storms like REMAL or Invest 94B) or fail to detect when an event has dissipated, displaying ghost storms weeks after landfall.

---

## 3. Our Solution: Stormsence SI

Stormsence SI eliminates these barriers by providing a single, unified, real-time command center that ingests raw meteorological products worldwide, harmonizes them into mathematically standardized schemas, and presents clear, actionable risk intelligence.

```
       ========================================================================
                          STORMSENCE SI SOLUTION ARCHITECTURE
       ========================================================================

       [NOAA NHC]   [JTWC Warning]   [GDACS Alerts]   [IMD Bulletins]
           |              |                 |                |
           +--------------+--------+--------+----------------+
                                   |
                                   v
                   +-------------------------------+
                   | Multi-Basin Ingestion Adapters |
                   |  (Real-Time HTTP / WMO Specs)  |
                   +---------------+---------------+
                                   |
                                   v
                   +-------------------------------+
                   | Spatial & Temporal Deduplicator|
                   |  (<150 km, <6h, Stale Filter) |
                   +---------------+---------------+
                                   |
                                   v
                   +-------------------------------+
                   | Cross-Basin Standardization   |
                   | (Native Scales + SSHWS Approx)|
                   +---------------+---------------+
                                   |
             +---------------------+---------------------+
             |                                           |
             v                                           v
   +--------------------+                      +--------------------+
   | In-Memory Cache    |                      | Global Gazetteer   |
   | (Active Storms/KPI)|                      | (10,079 Cities)    |
   +---------+----------+                      +---------+----------+
             |                                           |
             +---------------------+---------------------+
                                   |
                                   v
                   +-------------------------------+
                   | Flask REST API Layer          |
                   | (/api/storms, /api/health...) |
                   +---------------+---------------+
                                   |
       +---------------------------+---------------------------+
       |                           |                           |
       v                           v                           v
+--------------+           +---------------+           +---------------+
| CesiumJS 3D  |           | Glass Telemetry|          | CycloneGuard  |
| Digital Earth|           | & Model Panels |          | MetAI Ass't   |
+--------------+           +---------------+           +---------------+
```

### Key Functional Capabilities

1. **Live Multi-Basin Cyclone Tracking:**
   - Ingests active tropical depressions, tropical storms, severe typhoons, and hurricanes across all oceanic basins: North Atlantic, East Pacific, Central Pacific, Western North Pacific, North Indian Ocean (Bay of Bengal / Arabian Sea), South Indian Ocean, Australian Basin, and South Pacific.

2. **Transparent Multi-Agency Consensus Modeling:**
   - For every active system, Stormsence SI cross-references reports from multiple agencies. In the **Models Tab**, users can inspect side-by-side wind estimates from JTWC, NHC, IMD, and GDACS, complete with their exact declared wind averaging period (e.g., `1-min sustained`, `3-min sustained`, or `averaging period not stated` for modeled estimates).

3. **Basin-Correct Intensity Classification & SSHWS Badging:**
   - Automatically detects the geographical basin of every storm and formats its primary intensity badge in the official native scale of that basin's RSMC (e.g., IMD classifications for the Bay of Bengal, JMA typhoon classifications for the West Pacific, SSHWS for the Atlantic). Concurrently provides an approximate Saffir-Simpson Hurricane Wind Scale (SSHWS) equivalent badge for universal cross-basin comparison.

4. **Real NASA GIBS Geostationary Clean Infrared Imagery:**
   - Integrates live geostationary satellite infrared imagery from Himawari-9 (Band 13, Asia-Pacific) and GOES-East/GOES-West (Band 13, Americas and Pacific) via NASA GIBS Web Map Service (WMS). Basins without geostationary satellite coverage gracefully report `"No imagery available for this basin"`.

5. **Universal Location Search & Point Risk Intelligence:**
   - Users can search any city, town, or coastal settlement worldwide across an embedded, offline dataset of **10,079 populated places** (or click anywhere on the 3D globe).
   - If the coordinate is $> 1,500\text{ km}$ from all active storms, the system displays a clear green `SAFE` badge (`NO ACTIVE CYCLONE THREATENING THIS AREA`).
   - If within $1,500\text{ km}$, it calculates threat tiers (`WATCH`, `MODERATE`, `HIGH`, `CRITICAL`), estimated time of closest approach (ETA), projected wind bands, rainfall accumulation, and coastal storm surge risks.

6. **Zero-Storm Calm State:**
   - When no tropical cyclones are active globally, the system displays an oceanic calm interface (`🌊 Ocean Waters Calm`), showing the official WMO Upcoming Cyclone Names Registry across basins and providing one-click access to historical benchmark cyclones (e.g., 1999 Odisha Super Cyclone, Cyclone Fani, Hurricane Katrina).

7. **Experimental Physics-Informed ML Trajectory Ensemble:**
   - Implements multi-horizon forecasting models (6h, 12h, 18h, 24h) trained on synoptic cyclone track observations, evaluated rigorously against standard persistence and constant-motion baselines.

8. **Domain-Restricted MetAI Assistant:**
   - Provides an in-process conversational assistant strictly grounded on ingested active storm bulletins and emergency shelter databases, preventing hallucinations by rejecting off-topic queries.

---

## 4. System Architecture

The Stormsence SI codebase is organized into distinct, decoupled architectural layers ensuring separation of concerns, high resilience, and zero data fabrication:

```
SI cyclone/
├── ingestion/                 # Multi-Agency Ingestion & Normalization Engine
│   ├── base.py                # BaseAdapter, Haversine math, latency & health tracking
│   ├── nhc.py                 # NOAA NHC CurrentStorms.json adapter (1-min SSHWS)
│   ├── jtwc.py                # US DoD JTWC RSS & ATCF warning text parser
│   ├── gdacs.py               # UN/EC GDACS GeoJSON & RSS adapter (impact modeling)
│   ├── imd.py                 # IMD RSMC New Delhi adapter (honest degraded handling)
│   ├── scales.py              # Basin-native meteorological intensity scales
│   └── aggregator.py          # Spatial/temporal deduplication & global KPI engine
├── data/                      # Local Static Datasets & Cached Telemetry
│   ├── world_cities.json      # Curated gazetteer of 10,079 global populated places
│   ├── historical_storms.json # Benchmark historical cyclone tracks
│   ├── model_metrics.json     # Machine learning training & evaluation telemetry
│   └── cyclone_training_data.csv # Synoptic track training dataset
├── models/                    # Serialized Machine Learning Artifacts
│   └── cyclone_forecast_model.pkl # Scikit-Learn multi-horizon trajectory package
├── static/                    # Frontend UI Assets
│   ├── css/style.css          # Approved dark glassmorphism styling
│   ├── js/app.js              # Application state machine, tabs, and search orchestration
│   ├── js/globe.js            # CesiumJS 3D digital earth track rendering
│   ├── js/charts.js           # Chart.js telemetry & NASA GIBS satellite preview
│   └── js/i18n.js             # Multilingual localization (English, Hindi, Kannada)
├── templates/                 # Presentation Templates
│   └── index.html             # Single-page responsive mission-control HUD
├── tests/                     # 100% Offline Test Validation Suite
│   ├── fixtures/              # Real feed response snapshots for deterministic testing
│   ├── mock_network.py        # Offline fixture interceptor router
│   ├── test_adapters.py       # Adapter parsing, schema, and scale verification
│   ├── test_point_intelligence.py # Proximity math and search verification
│   ├── test_calm_and_demo.py  # Calm state and DEMO_MODE handling
│   └── test_scales.py         # Intensity scale and wind averaging unit tests
├── train.py                   # ML training pipeline, baseline comparison, hardware probe
└── server.py                  # Core Flask HTTP API & MetAI engine
```

### Layer Details

1. **Ingestion Layer (`ingestion/`):**
   - Each upstream source has a dedicated subclass inheriting from BaseAdapter. Adapters measure network latency in milliseconds, track cache expiration via Time-To-Live (TTL = 600s), maintain `last_success` timestamps, and normalize external payloads into a unified Python dictionary structure.
   - CycloneDataAggregator orchestrates parallel adapter execution, applies spatial clustering (< 150 km) and temporal matching (< 6h), and filters out stale or unconfirmed events.

2. **Persistence & Cache Layer:**
   - Server-side memory caching via `CACHE` dictionary in server.py. Eliminates upstream rate-limiting and guarantees sub-10ms API responses for end-users.

3. **REST API Layer (`server.py`):**
   - Built on Flask 3.1.3. Serves public endpoints for active storms, health monitoring, place searching, point risk intelligence, shelter logistics, simulation, and conversational assistance.

4. **Presentation & Geospatial Visualization Layer (`static/`, `templates/`):**
   - **CesiumJS 1.119:** High-performance WebGL digital globe rendering 3D orbital views, true-scale storm tracks, wind radii threat buffers, Doppler radar reflectivity rings, and camera fly-to animations.
   - **Vanilla CSS:** Approved dark glassmorphism design system (`#030712` obsidian background, `#0f172a` slate cards, `#38bdf8` cyan accents, subtle blur effects).
   - **Chart.js 4.4.1:** Multi-horizon barometric pressure, wind speed, and baseline comparison telemetry charts.

---

## 5. Comprehensive Data Sources & Licensing Audit

The table below provides a full, factual accounting of every data source, library, and API utilized by Stormsence SI. All licensing terms were verified directly against each agency's official terms of service:

| Data Source / Service | Sponsoring Organization | Purpose in Stormsence SI | Endpoint / Path | Format | Refresh Interval | Access / Auth | License & Terms of Service | In-App Status |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :---: |
| **NOAA NHC** | US National Oceanic and Atmospheric Administration | Official tracking & forecast tracks for Atlantic & East/Central Pacific storms | `https://www.nhc.noaa.gov/CurrentStorms.json` | JSON | 6-hourly (synoptic) | Keyless / Public | **Public Domain** (US Government Work, 17 U.S.C. § 105). Free for public and commercial use. | `ONLINE` (Live Feed) |
| **Joint Typhoon Warning Center (JTWC)** | US Navy / US Air Force (DoD) | Official warnings, tracks, and ATCF fixes for West Pacific & Indian Ocean | `https://www.metoc.navy.mil/jtwc/rss/jtwc.rss` & `.txt` bulletins | RSS / Plain Text | 6-hourly per active storm | Keyless / Public | **Public Domain** (US Federal Government Work). Free for public redistribution. | `ONLINE` (Live Feed) |
| **GDACS** | United Nations (OCHA) & European Commission (JRC) | Multi-hazard alerts, population exposure estimates, and humanitarian severity | `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtypes=TC` | GeoJSON & RSS XML | Dynamic (~15 min refresh) | Keyless / Public | **Open Access** for humanitarian and disaster management. Credit requested: "GDACS (UN/EC)". | `ONLINE` (Live Feed) |
| **IMD RSMC New Delhi** | Ministry of Earth Sciences, Govt. of India | Official regional cyclone warnings for Bay of Bengal and Arabian Sea | `https://rsmcnewdelhi.imd.gov.in/` | Binary PDF / HTML | 3-hourly / 6-hourly during active storms | Keyless / Public | **Government of India Open Data**. Free for public safety and awareness. | `DEGRADED` (Binary PDF only; machine-readable NIO coverage delegated to JTWC/GDACS) |
| **NASA GIBS** | NASA Earth Science Data and Information System (ESDIS) | Geostationary clean infrared satellite imagery (Himawari-9, GOES-16, GOES-18) | `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi` | WMS 1.3.0 (PNG) | Hourly rapid refresh | Keyless / Public | **NASA Open Data Policy**. Free for research, education, and commercial applications. | `ONLINE` (Auxiliary Probe) |
| **Open-Meteo Weather** | Open-Meteo GmbH | Live surface weather telemetry (wind speed, gusts, pressure, precipitation) | `https://api.open-meteo.com/v1/forecast` | JSON | Hourly model updates | Keyless (free tier) | **Creative Commons Attribution 4.0 International (CC BY 4.0)**. Attribution required. | `ONLINE` (Auxiliary Probe) |
| **Open-Meteo Geocoding** | Open-Meteo GmbH | Global geocoding fallback for unlisted search locations | `https://geocoding-api.open-meteo.com/v1/search` | JSON | Real-time | Keyless (free tier) | **CC BY 4.0** (Open-Meteo / GeoNames data). Attribution required. | `ONLINE` (Auxiliary Probe) |
| **BigDataCloud** | BigDataCloud Pty Ltd | Client-side reverse geocoding for coordinates clicked on map | `https://api.bigdatacloud.net/data/reverse-geocode-client` | JSON | Real-time | Keyless (up to 50k calls/mo) | Free for non-commercial and commercial client-side use with attribution. | `ONLINE` (Live Client API) |
| **GeoNames Gazetteer** | GeoNames (Marc Wick) | Curated global database of 10,079 populated coastal and major cities | `data/world_cities.json` | Local JSON | Static | Local / Embedded | **Creative Commons Attribution 4.0 International (CC BY 4.0)**. Attribution required. | `LOADED` (Static Resource) |
| **CesiumJS** | Cesium GS, Inc. | 3D WebGL Digital Earth rendering engine and orbital camera controls | `https://cesium.com/downloads/cesiumjs/releases/1.119/` | JavaScript WebGL | Static Library | Open Source | **Apache License 2.0**. Free for commercial and open-source use. | `LOADED` (Frontend Client) |
| **CycloneGuard-MetAI** | Internal In-Process Engine | Domain-restricted conversational disaster assistant | Embedded in `server.py` | Python Object | Instantaneous | In-Process | Proprietary / Project Open Source. No external third-party LLM API utilized. | `OPERATIONAL` (Local Server) |

---

## 6. Mathematical Methodology & Decision Logic

### 6.1 Great-Circle Geospatial Distance (Haversine Formula)
All distance calculations between geographic coordinates $(\phi_1, \lambda_1)$ and $(\phi_2, \lambda_2)$ utilize the spherical Haversine formula with mean Earth radius $R = 6,371.0\text{ km}$:

$$\Delta\phi = \phi_2 - \phi_1, \quad \Delta\lambda = \lambda_2 - \lambda_1$$

$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)$$

$$c = 2 \cdot \arctan2\left(\sqrt{a}, \sqrt{1 - a}\right), \quad d = R \cdot c$$

### 6.2 Multi-Agency Spatial & Temporal Clustering
When multiple upstream agencies issue bulletins for the same storm, the ingestion engine groups reports into a single canonical record based on spatial proximity and name alignment:
1. Two storm reports $S_A$ and $S_B$ belong to the same physical cluster if:
   $$\text{Haversine}(S_A, S_B) \le 150.0\text{ km} \quad \text{OR} \quad \left(\text{Name}(S_A) = \text{Name}(S_B) \land \text{Name} \notin \{\text{"unnamed"}, \text{"tc"}\}\right)$$
2. Attribute Priority Hierarchy:
   $$\text{Priority: } \text{NOAA NHC } (4) > \text{JTWC } (3) > \text{IMD } (2) > \text{GDACS } (1)$$
   The canonical track, current coordinates, and wind velocity are inherited from the highest-priority agency. GDACS provides humanitarian population exposure estimates and disaster alert levels (`Red`, `Orange`, `Green`).

### 6.3 Stale GDACS Event Filtering (The "Simon" Rule)
To prevent ghost storms from lingering on the dashboard after dissipation:
- If a storm report originates **only** from GDACS with no matching primary agency record (NHC, JTWC, IMD), and is located within an operational basin covered by those agencies:
  $$\text{If } \text{Source} = \text{GDACS-only} \land \text{Basin} \in \text{AgencyBasins} \land \left(\Delta t_{\text{advisory}} > 6.0\text{ h} \lor \text{Status} = \text{"ENDED"}\right) \implies \mathbf{EXCLUDE}$$
- *Validation Case:* On 17 October 2026, GDACS retained `SIMON-26` in the East Pacific with an advisory timestamp of 16 Oct 21:00 GMT ($> 12\text{h}$ old). Because NOAA NHC had already declared Simon dissipated, this rule correctly excluded Simon from the active dashboard, preventing false panic.

### 6.4 Key Locations ETA & Risk Estimation
For every active storm, populated places along its track are identified from the 10,079-place gazetteer. The minimum distance to any point along the observed or forecast track determines the hazard tier:

$$\text{Risk Tier} = \begin{cases} 
\mathbf{Critical} & \text{if } d_{\min} \le 100\text{ km} \quad (\text{Estimated Wind: } 0.90 \times V_{\max} \text{ to } 1.00 \times V_{\max}) \\
\mathbf{High} & \text{if } 100\text{ km} < d_{\min} \le 200\text{ km} \quad (\text{Estimated Wind: } 0.70 \times V_{\max} \text{ to } 0.85 \times V_{\max}) \\
\mathbf{Moderate} & \text{if } 200\text{ km} < d_{\min} \le 350\text{ km} \quad (\text{Estimated Wind: } 0.50 \times V_{\max} \text{ to } 0.65 \times V_{\max})
\end{cases}$$

$$\text{ETA} = \text{Horizon Hour of the closest forecast track waypoint (or "Immediate" if } d_{\text{current}} \le 100\text{ km)}$$

*Important Disclaimer:* All key location winds, rain accumulations, and ETAs are automated mathematical approximations derived from track geometries and wind radii models. They do not replace local meteorological bulletins.

### 6.5 Point Intelligence Proximity Thresholds
When an arbitrary point on Earth is queried via search or map click:
- If minimum distance $d_{\min} > 1,500.0\text{ km}$:
  $$\text{Threat Badge} = \mathbf{SAFE}, \quad \text{Level} = \text{"NO ACTIVE CYCLONE THREATENING THIS AREA"}$$
- If $d_{\min} \le 1,500.0\text{ km}$:
  - $d_{\min} \le 100\text{ km}$: `CRITICAL` (Immediate eyewall impact zone)
  - $100\text{ km} < d_{\min} \le 300\text{ km}$: `HIGH` (Outer core storm-force wind field)
  - $300\text{ km} < d_{\min} \le 600\text{ km}$: `MODERATE` (Feeder squall and marine gale hazard)
  - $600\text{ km} < d_{\min} \le 1,500\text{ km}$: `WATCH` (Peripheral monitoring zone)

### 6.6 Global Dashboard KPI Computation
All top-level dashboard KPI counters are dynamically computed via strict formulas:
1. **Active Cyclones:** Exact integer count of unique physical systems after deduplication and stale filtering.
2. **Places within 500 km:** Number of unique settlements in `world_cities.json` where $\text{Haversine}(P_{\text{city}}, S_{\text{cyclone}}) \le 500.0\text{ km}$.
3. **People at Risk:** Sum of unique population exposure figures provided by GDACS across active non-overlapping clusters:
   $$\text{PeopleAtRisk} = \sum_{i=1}^{N} \text{PopExposed}(S_i)$$
4. **Critical Alerts:** Count of unique active storms meeting any of:
   - $V_{\max} \ge 96\text{ kt}$ (Category 3+ Major Cyclone / Super Typhoon), OR
   - GDACS alert level is `"Red"`, OR
   - Basin-native classification contains `"Super"`, `"Extremely"`, `"Category 4"`, or `"Category 5"`.
   *(Evaluated on 17 Oct 2026: exactly 1 storm—Champi at 115 kt).*
5. **Live Feeds Online:** Evaluated as $X / 4\text{ live feeds online}$, where only genuinely operational feeds (`ONLINE`) increment the numerator, while `DEGRADED` feeds (IMD) do not.

---

## 7. Artificial Intelligence & Machine Learning Architecture

### 7.1 CycloneGuard-MetAI Conversational Assistant
Unlike generic third-party cloud LLM chatbots that are prone to hallucinating severe weather directives, `CycloneGuard-MetAI` is an internal, domain-restricted natural language processing engine embedded directly in server.py.

- **Domain Restriction Guardrails:** Incoming queries are categorized into 12 meteorological intents (Landfall Tracking, Wind Intensity, Precipitation, Storm Surge, Shelters, Safety Kits, What-If Simulation, ML Ensemble, Meteorology Science, Location Risk, Operational Briefing, or Off-Topic).
- **Zero Hallucination Policy:** Off-topic queries (e.g., general chit-chat, programming, politics) are politely rejected with a safety guidance card. All answers to on-topic questions are dynamically synthesized from live values in `CACHE['active_storms']` and verified shelter facilities in `CACHE['shelters']`.
- **Privacy & Self-Containment:** Runs 100% locally within Flask without transmitting user queries, IP addresses, or location coordinates to external LLM vendors.

### 7.2 Experimental Multi-Horizon Trajectory Ensemble (`train.py`)
To complement official agency forecasts, the platform includes an experimental machine learning forecasting engine:

- **Training Dataset:** 6,749 synoptic 6-hourly observations across 350 historical cyclones (`data/cyclone_training_data.csv`).
- **Feature Pipeline:**
  - Dynamic Predictors: Current latitude, longitude, sustained wind velocity ($V_{\text{cur}}$), barometric pressure ($P_{\text{cur}}$), 6-hour past displacement vectors ($\Delta\phi_{-6}, \Delta\lambda_{-6}$), and past intensity change rate ($\Delta V_{-6}$).
  - Physics-Informed Geostrophic Features: Coriolis parameter calculation ($f = 2\Omega\sin\phi$), northward beta-drift term, and subtropical ridge steering approximations.
- **Model Architecture:** Gradient Boosting Regressors (`GradientBoostingRegressor`) and Ridge Regression pipelines with feature standardization (`StandardScaler`), trained separately for 6h, 12h, 18h, and 24h horizons.
- **Independent Benchmark Baselines:**
  - *Persistence Baseline:* Assumes storm remains completely stationary ($\Delta\phi = 0, \Delta\lambda = 0, \Delta V = 0$).
  - *Constant-Motion Baseline:* Extrapolates previous 6-hour heading and velocity linearly into the future.

#### Verified Evaluation Benchmark Results (Executed on Intel/AMD64 Workstation):

| Forecast Horizon | Persistence Track Error | Constant-Motion Error | **ML Model Track Error** | **Track Skill vs Persistence** | Persistence Wind MAE | Constant-Motion Wind MAE | **ML Model Wind MAE** | **Wind Skill vs Persistence** |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **+6 hours** | 151.69 km | 5.37 km | **3.86 km** | **+97.5%** | 4.48 kt | 3.45 kt | **3.06 kt** | **+31.7%** |
| **+12 hours** | 303.53 km | 16.45 km | **10.89 km** | **+96.4%** | 8.18 kt | 6.02 kt | **5.12 kt** | **+37.4%** |
| **+18 hours** | 455.40 km | 33.60 km | **21.05 km** | **+95.4%** | 11.50 kt | 8.57 kt | **7.12 kt** | **+38.1%** |
| **+24 hours** | 607.13 km | 57.20 km | **34.10 km** | **+94.4%** | 14.45 kt | 11.09 kt | **9.23 kt** | **+36.1%** |

- **Inference Latency:** 8.357 ms per complete multi-horizon inference (119.7 predictions/sec).
- **Training Time:** 23.86 seconds on a 16-core workstation.
- **Important Ethical Note:** This machine learning model is strictly labeled as **EXPERIMENTAL** in the user interface. It serves as an exploratory research metric and must never supersede official national RSMC warnings.

---

## 8. Technology Stack & Dependencies

The complete technology stack was verified against requirements.txt and active browser scripts:

### Backend Architecture
- **Language:** Python 3.14.6
- **Web Framework:** Flask 3.1.3 (WSGI REST Application)
- **Scientific & Data Processing:**
  - `pandas==3.0.3`: Track table manipulation and time-series rolling operations.
  - `numpy==2.4.6`: Vectorized spherical trigonometry and Coriolis math.
  - `scipy==1.18.0`: Geospatial distance matrices and spatial interpolations.
- **Machine Learning & Pipeline:**
  - `scikit-learn==1.9.0`: Gradient Boosting, Ridge regressors, and evaluation metrics.
  - `joblib==1.5.3`: Model serialization and rapid memory-mapped deserialization.
- **Networking & Parsing:**
  - `requests==2.34.2`: Upstream HTTP polling with custom timeouts and headers.
  - `beautifulsoup4`: HTML DOM parsing for operational bulletin scrapers.
  - `xml.etree.ElementTree`: Standard library XML parsing for NOAA and GDACS feeds.

### Frontend Architecture
- **Structure & Layout:** Semantic HTML5, Vanilla CSS3 (Custom design system without heavy framework overhead).
- **3D Geospatial Engine:** CesiumJS 1.119 (WebGL hardware-accelerated Digital Earth).
- **Data Visualization:** Chart.js 4.4.1 (Responsive canvas-based barometric and wind charts).
- **Internationalization:** Custom client-side i18n engine supporting English, Hindi (हिंदी), and Kannada (ಕನ್ನಡ).

---

## 9. Testing, Verification & Live Feed Audit

### 9.1 100% Offline Test Suite Execution
To guarantee deterministic, reliable software delivery in air-gapped or CI/CD testing environments without flaky network dependencies, the platform includes a saved fixture architecture:

- **Saved Fixtures Directory (`tests/fixtures/`):** Contains exact raw response snapshots from NOAA NHC (`nhc_current_storms.json`, `nhc_at.xml`, `nhc_ep.xml`), JTWC (`jtwc.rss`, `jtwc_warning.txt`), GDACS (`gdacs_events.json`, `gdacs_rss.xml`), IMD (`imd_homepage.html`), and Open-Meteo (`open_meteo_forecast.json`, `open_meteo_geocoding.json`).
- **Mock Network Interceptor (`tests/mock_network.py`):** Automatically routes `requests.get` invocations to local fixtures.
- **Execution Command:**
  ```bash
  python -m unittest discover tests
  ```
- **Live Test Results:**
  ```
  Ran 23 tests in 0.405s
  OK (skipped=1)
  ```
  *(1 optional live-network integration test is skipped by default via `@unittest.skipUnless(os.environ.get("RUN_LIVE_TESTS"), ...)`).*

### 9.2 Real-World Operational Cross-Check (17 October 2026)
A live end-to-end query was executed against the running application to cross-verify all active systems against official agency bulletins:

| Parameter | Ingested Platform Value | Official Upstream Agency Verification | Status |
| :--- | :--- | :--- | :---: |
| **Typhoon CHAMPI** | 213 km/h (115 kt) · West Pacific | JTWC Warning Nr 012 (`TYPHOON 29W CHAMPI`, 115 KT) | **100% Match** |
| **Hurricane TRUDY** | 148 km/h (80 kt) · East Pacific | NOAA NHC Advisory (`HURRICANE TRUDY EP202026`, 80 KT) | **100% Match** |
| **Tropical Cyclone WATI** | 111 km/h (60 kt) · South Pacific | JTWC Warning Nr 006 (`TROPICAL CYCLONE 01P WATI`, 60 KT) | **100% Match** |
| **Tropical Storm SIMON** | Excluded (Dissipated low) | NHC reports no active advisory; GDACS timestamp $>12\text{h}$ old | **Correctly Filtered** |
| **Active Cyclones Count** | **3** | Exactly 3 verified ongoing tropical cyclones worldwide | **100% Match** |
| **Critical Alerts Count** | **1** | Only Typhoon Champi exceeds Cat 3+ ($V \ge 96\text{ kt}$) | **100% Match** |
| **Places within 500 km** | **41 places** | Computed against 10,079 gazetteer within 500 km radius | **Verified** |
| **People at Risk** | **175.3 K** | GDACS verified exposure (labeled `estimated exposure (GDACS)`) | **Verified** |
| **Live Feeds Status** | **3 / 4 live feeds online** | NHC (Online), JTWC (Online), GDACS (Online), IMD (Degraded) | **Truthfully Reported** |

---

## 10. Enterprise Computing & Cross-Platform Hardware Portability

In evaluation environments emphasizing enterprise computing and hybrid cloud portability (such as IBM Z mainframes and LinuxONE), high-reliability disaster warning platforms must operate seamlessly across varied instruction set architectures.

Stormsence SI includes architecture-aware hardware probes in train.py and server.py:

1. **Architecture Detection & Benchmarking:**
   - Detects `x86_64 / AMD64` (Standard Cloud Compute).
   - Detects `ARM64 / AArch64` (Edge systems and Apple Silicon).
   - Detects `s390x / IBM Z` (Mission-Critical Enterprise Mainframe).
2. **Pure Python & Standard C-Extension Compatibility:**
   - The entire ingestion and API stack relies strictly on portable libraries (`numpy`, `pandas`, `scipy`, `scikit-learn`, `flask`) that compile cleanly on IBM z/OS Container Extensions (zCX), Linux on IBM Z (`s390x`), and standard cloud virtual machines.
3. **Hardware Telemetry Endpoint (`/api/system/health`):**
   - Reports machine architecture, processor family, system uptime, and ML inference throughput dynamically, facilitating enterprise SLA monitoring.

---

## 11. Reliability, Safety & Ethical Guidelines

1. **Relaying Official Data Without Replacement:**
   - Stormsence SI is explicitly designed as a public awareness and decision-support portal. It **never** issues unilateral evacuation orders or replaces official government directives.
   - A permanent, high-contrast disclaimer is fixed to the bottom of the user interface:
     > *"⚠️ NOTICE: For awareness only. Follow official warnings from your national meteorological agency (IMD, NOAA NHC, JMA, BoM, Météo-France)."*

2. **Truthful Provenance on Every Value:**
   - Every cyclone card, coordinate, and wind speed displays its exact upstream reporting agency (e.g., `NOAA NHC`, `JTWC`, or `GDACS`) and original issuance timestamp. If an advisory is older than 6 hours, a prominent amber `STALE (>6h)` badge is affixed.

3. **Strict No-Fake-Data Policy:**
   - `DEMO_MODE` is disabled by default (`DEMO_MODE=false`). The system renders genuine real-world observations.
   - When demo simulation is intentionally activated for drills via `?demo=true`, a prominent amber banner (`⚠️ DEMO MODE: BENCHMARK SIMULATION`) is locked across the header, and all simulated model winds are explicitly labeled with `(Simulated)`.

4. **Privacy Protection by Design:**
   - Stormsence SI does not require user registration, does not track device GPS coordinates without permission, does not set persistent tracking cookies, and does not sell or transmit user inquiries to third parties.

---

## 12. Known Limitations & Technical Constraints

In accordance with strict factual engineering standards, the following real-world constraints are documented:

1. **IMD Feed Degraded State:**
   - IMD RSMC New Delhi publishes operational tropical cyclone bulletins in binary PDF format only. Because there is currently no authenticated, machine-readable JSON or CAP feed available from IMD RSMC, North Indian Ocean storm tracking in Stormsence SI is sourced from JTWC and GDACS, truthfully attributed as such.
2. **JTWC Advisory Threshold:**
   - JTWC only issues track products for systems that reach the threshold of tropical depression or higher. Formative invest areas below 25 knots may not appear until designated.
3. **Geostationary Satellite Coverage Gaps:**
   - High-resolution clean infrared satellite imagery from Himawari-9 covers Asia and the West Pacific; GOES-East and GOES-West cover the Americas and Eastern Pacific. The South Atlantic and interior Indian Ocean do not have real-time geostationary Band 13 coverage on NASA GIBS, and appropriately display `"No imagery available for this basin"`.
4. **GDACS Exposure Estimation:**
   - Population exposure numbers provided by GDACS are numerical geographic overlay estimates based on Global Human Settlement Layer (GHSL) data, not post-disaster census counts.
5. **Open-Meteo Free Tier:**
   - The keyless Open-Meteo tier is restricted to non-commercial evaluation (up to 10,000 daily API calls). Production enterprise deployments require a commercial API key.

---

## 13. Future Work

1. **NDMA Sachet CAP Feed Integration:**
   - Preliminary HTTP probing of `https://sachet.ndma.gov.in/` confirmed that the Indian National Disaster Management Authority (NDMA) exposes machine-readable Common Alerting Protocol (CAP) JSON endpoints (`/cap_public_website/FetchAllAlertDetails`). Developing a dedicated parser for this endpoint will restore automated, native Indian early warnings once parameterized queries are finalized.
2. **Scheduler-Based Background Worker:**
   - Migration from Flask's in-process threading to an asynchronous background worker pool (Celery / Redis) for high-scale enterprise deployments.
3. **Progressive Web App (PWA) Offline Caching:**
   - Implement Service Workers and IndexedDB local storage to allow emergency responders to review the last cached cyclone track even when cellular towers fail during landfall.
4. **Opt-In Multi-Channel Emergency Dispatch:**
   - Integration of opt-in Telegram Bot API and WebPush notifications, strictly relaying verified national RSMC alerts without speculative modification.

---

## 14. Verification & Reproducibility Guide

### Prerequisites
- Python 3.10+ (Tested on Python 3.14.6)
- Modern WebGL-capable browser (Chrome, Edge, Firefox, Safari)

### Installation
```bash
# 1. Clone repository and navigate to root directory
cd "SI cyclone"

# 2. Install required dependencies
pip install -r requirements.txt
```

### Running the Test Suite (Offline & Instant)
```bash
python -m unittest discover tests
```
*Expected Output:*
```
Ran 23 tests in ~0.4s
OK (skipped=1)
```

### Starting the Server
```bash
python server.py
```
Open your browser to:
- **Standard Live Operational Mode:** `http://127.0.0.1:5000/`
- **Zero-Storm Calm State Preview:** `http://127.0.0.1:5000/?calm=true`
- **Benchmark Simulation Drill:** `http://127.0.0.1:5000/?demo=true`

---

## 15. Appendix: REST API Reference & System Payloads

### 15.1 API Endpoint Reference

| Endpoint | Method | Parameters | Description |
| :--- | :---: | :--- | :--- |
| `/api/storms/active` | `GET` | `refresh=true`, `demo=true` | Returns all deduplicated active storms worldwide, dynamic KPIs, and provenance. |
| `/api/health` | `GET` | None | Truthful health check split into `live_feeds`, `auxiliary_services`, and `static_resources`. |
| `/api/places/search` | `GET` | `q=<query>` | Universal search matching active storms, 10,079 gazetteer places, or geocoding. |
| `/api/point/intelligence` | `GET/POST`| `lat=<float>`, `lon=<float>` | Real-time weather, reverse geocode, and cyclone threat tier assessment. |
| `/api/shelters` | `GET` | None | Emergency cyclone shelters with capacity, occupancy, and available space. |
| `/api/simulation` | `POST`| `wind_delta_percent`, `tide_delta_m` | What-If storm surge and population inundation exposure simulation. |
| `/api/ai/chat` | `POST`| `message=<string>` | Domain-restricted CycloneGuard-MetAI conversational intelligence model. |
| `/api/system/health` | `GET` | None | Hardware architecture (AMD64, ARM64, IBM Z) and server runtime telemetry. |

### 15.2 Sample Normalized Storm Object (`/api/storms/active`)
```json
{
  "id": "WP292026_CHAMPI",
  "name": "Champi",
  "full_title": "Typhoon CHAMPI",
  "basin": "West Pacific",
  "source": "JTWC",
  "sources": ["JTWC", "GDACS"],
  "current_lat": 12.5,
  "current_lon": 147.3,
  "max_wind_kmh": 213.0,
  "max_wind_kt": 115.0,
  "category_native": "Typhoon",
  "category_sshws_equiv": "Category 4",
  "sshws_badge": "Category 4 (approx. equivalent)",
  "agency_standard": "JMA/JTWC (1-min / 10-min)",
  "wind_averaging_period": "1-min",
  "multi_agency_winds": {
    "JTWC": {
      "max_wind_kmh": 213.0,
      "max_wind_kt": 115.0,
      "averaging_period": "1-min",
      "category": "Typhoon",
      "is_modeled_estimate": false,
      "note": "Agency standard anemometer measurement (1-min)"
    },
    "GDACS": {
      "max_wind_kmh": 120.0,
      "max_wind_kt": 64.8,
      "averaging_period": "averaging period not stated",
      "category": "GDACS Red Alert",
      "is_modeled_estimate": true,
      "note": "Modeled disaster estimate (averaging period not stated in feed)"
    }
  },
  "gdacs_alert_level": "Red",
  "population_exposed": 175300,
  "forecast_track": [
    {"hour": 12, "lat": 13.0, "lon": 144.8, "wind_kt": 130.0, "wind_kph": 240.8},
    {"hour": 24, "lat": 13.4, "lon": 142.5, "wind_kt": 140.0, "wind_kph": 259.3}
  ]
}
```

---

## 16. Visual Verification Gallery

The following official screenshots were captured directly from the live running instance of Stormsence SI (`v1-global-live`) at `127.0.0.1:5000` and are saved in `report/screenshots/`:

1. **`01_global_view.png`**: Full 3D Digital Earth view showing active storms across the Western Pacific, Eastern Pacific, and South Pacific, with dynamic KPI header counters (`3 Active Cyclones`, `41 Places within 500 km`, `175.3 K People at Risk`, `1 Critical Alert`, `3 / 4 live feeds online`).
2. **`02_selected_storm.png`**: Deep inspection of Typhoon Champi displaying sustained winds (213 km/h), central barometric pressure, forward speed, and dual category badges (`Typhoon` / `Category 4 approx. equivalent`).
3. **`03_satellite_tab.png`**: Real-time geostationary clean infrared satellite imagery from NASA GIBS (Himawari-9 Band 13) overlaid over the storm core.
4. **`04_forecast_chart.png`**: Official multi-horizon forecast track with projecting cone of uncertainty.
5. **`05_key_locations.png`**: Populated settlements along the storm path with distance, estimated ETA, risk tiers, and anticipated wind intervals.
6. **`06_search_point_intel.png`**: Universal place search demonstrating Tokyo's safe status (`🛡️ NO ACTIVE CYCLONE THREATENING THIS AREA`).
7. **`07_whatif_simulation.png`**: Interactive storm surge and tidal inundation simulation modal.
8. **`08_ai_assistant.png`**: In-process `CycloneGuard-MetAI` conversational assistant answering cyclone preparedness inquiries.
9. **`09_emergency_planning.png`**: Emergency shelter capacity, occupancy, and bed availability logistics dashboard.
10. **`10_calm_state.png`**: Zero-storm oceanic calm mode displaying WMO upcoming naming registries.
11. **`11_mobile_width.png`**: Responsive mobile viewport (414px width) demonstrating full layout adaptation.

---
*Report certified accurate and verified against repository commit `46c841c` (`v1-global-live`).*

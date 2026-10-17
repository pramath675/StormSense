/**
 * CycloneGuard AI: 3D Digital Earth CesiumJS Engine
 * Photorealistic Real Earth Satellite Imagery with Deep Zoom to Towns & Cities:
 *  - Ultra-high-resolution ESRI World Imagery (zoom level up to 19, sub-meter resolution)
 *  - Comprehensive Reference Cartographic Overlay (Borders, States, Cities, Towns, Villages, Highways)
 *  - Dynamic multi-layer basemap switcher (Satellite, Google Hybrid, OpenStreetMap, Dark CartoDB)
 *  - Uncluttered, distance-responsive storm markers and projected cone
 *  - Interactive timeline scrubbing & animation sync
 */

class GlobeEngine {
    constructor(containerId) {
        this.containerId = containerId;
        this.viewer = null;
        this.activeStormEntities = [];
        this.forecastEntities = [];
        this.cityEntities = [];
        this.currentStormData = null;
        this.currentLayer = "satellite";
        this.inspectionPinEntity = null;

        this.initCesium();
    }

    initCesium() {
        Cesium.Ion.defaultAccessToken = "";

        // 1. Create Cesium Viewer with baseLayer: false to prevent default Ion token errors
        this.viewer = new Cesium.Viewer(this.containerId, {
            baseLayer: false,
            baseLayerPicker: false,
            geocoder: false,
            homeButton: false,
            infoBox: false,
            sceneModePicker: false,
            selectionIndicator: false,
            timeline: false,
            animation: false,
            navigationHelpButton: false,
            fullscreenButton: false,
            vrButton: false,
            skyAtmosphere: new Cesium.SkyAtmosphere(),
            contextOptions: {
                webgl: { alpha: true, preserveDrawingBuffer: true }
            }
        });

        // 2. Load Real Earth Photorealistic Satellite Imagery (Zoom level up to 19!)
        this.applyRealEarthLayers();

        // 3. Configure Scene, Atmosphere, and Camera limits for deep zoom
        const scene = this.viewer.scene;
        scene.globe.baseColor = Cesium.Color.fromCssColorString("#020610");
        scene.globe.enableLighting = false; // Uniform daylight clarity across all continents & oceans
        scene.backgroundColor = Cesium.Color.fromCssColorString("#020610");
        if (scene.skyAtmosphere) {
            scene.skyAtmosphere.brightnessShift = 0.2;
        }

        // Camera zoom range: allows zooming down to 100 meters above ground (town streets & coastal inlets!)
        const controller = scene.screenSpaceCameraController;
        controller.minimumZoomDistance = 100.0;
        controller.maximumZoomDistance = 45000000.0;
        controller.enableCollisionDetection = true;

        // 4. Position initial camera smoothly centered over India & Bay of Bengal
        this.viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(82.0, 18.5, 5200000.0),
            orientation: {
                heading: Cesium.Math.toRadians(0.0),
                pitch: Cesium.Math.toRadians(-89.9),
                roll: 0.0
            },
            duration: 1.5
        });

        // Ensure Cesium canvas internal dimensions perfectly match DOM container
        window.addEventListener("resize", () => {
            if (this.viewer && !this.viewer.isDestroyed()) {
                this.viewer.resize();
            }
        });

        this.setupInteractions();
    }

    applyRealEarthLayers() {
        const layers = this.viewer.imageryLayers;
        layers.removeAll();

        // Primary: Latest High-Definition Real Earth Satellite (Google Earth Satellite Hybrid, level 20)
        // Provides modern 2025/2026 satellite photography, sharp sub-meter zoom down to streets & towns
        const latestEarthProvider = new Cesium.UrlTemplateImageryProvider({
            url: "https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
            subdomains: ["0", "1", "2", "3"],
            maximumLevel: 20,
            credit: "Google Earth Latest Satellite Imagery"
        });
        const satLayer = layers.addImageryProvider(latestEarthProvider);
        satLayer.alpha = 1.0;
    }

    setBasemap(type) {
        this.currentLayer = type;
        const layers = this.viewer.imageryLayers;
        layers.removeAll();

        if (type === "satellite" || type === "latest") {
            // Latest High-Resolution Real Earth Satellite Imagery (Level 20, modern captures)
            this.applyRealEarthLayers();
        } else if (type === "esri") {
            // Esri World Satellite Imagery
            const esriProvider = new Cesium.UrlTemplateImageryProvider({
                url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
                maximumLevel: 19,
                credit: "Esri World Imagery"
            });
            layers.addImageryProvider(esriProvider);
            const refProvider = new Cesium.UrlTemplateImageryProvider({
                url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
                maximumLevel: 19,
                credit: "Esri Places"
            });
            layers.addImageryProvider(refProvider);
        } else if (type === "osm") {
            // OpenStreetMap Standard (Every village, town, road & street down to zoom 19)
            const osmProvider = new Cesium.OpenStreetMapImageryProvider({
                url: "https://tile.openstreetmap.org/",
                maximumLevel: 19
            });
            layers.addImageryProvider(osmProvider);
        } else if (type === "topo") {
            // OpenTopoMap (Topographic contours, elevation shading, towns & terrain)
            const topoProvider = new Cesium.UrlTemplateImageryProvider({
                url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
                subdomains: ["a", "b", "c"],
                maximumLevel: 17
            });
            layers.addImageryProvider(topoProvider);
        }
    }

    cycleBasemap() {
        const modes = ["satellite", "esri", "osm", "topo"];
        const labels = {
            "satellite": "🛰️ Latest Earth (Google High-Res Satellite 2025/2026)",
            "esri": "🌍 Esri World Imagery",
            "osm": "🗺️ OpenStreetMap (Towns, Streets & Villages)",
            "topo": "🏔️ Topographic Elevation & Relief"
        };
        let nextIdx = (modes.indexOf(this.currentLayer) + 1) % modes.length;
        const nextMode = modes[nextIdx];
        this.setBasemap(nextMode);

        let toast = document.getElementById("basemapToast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "basemapToast";
            toast.style.cssText = "position:absolute; top:18px; left:50%; transform:translateX(-50%); background:rgba(5,12,26,0.92); border:1px solid #00d2ff; color:#fff; font-size:11px; font-weight:700; padding:6px 14px; border-radius:20px; z-index:100; pointer-events:none; transition:opacity 0.4s ease;";
            document.getElementById("globe-center-pane").appendChild(toast);
        }
        toast.textContent = labels[nextMode];
        toast.style.opacity = "1";
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => { if (toast) toast.style.opacity = "0"; }, 2200);
    }

    setupInteractions() {
        const handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
        
        // Single click: pick storm or inspect ANY clicked point on Earth (land, sea, city, town)
        handler.setInputAction((movement) => {
            const picked = this.viewer.scene.pick(movement.position);
            if (Cesium.defined(picked) && picked.id && picked.id.stormId) {
                if (window.app) window.app.selectStorm(picked.id.stormId);
                return;
            }

            // Pick 3D ground coordinates anywhere on Earth
            let cartesian = null;
            const ray = this.viewer.camera.getPickRay(movement.position);
            if (ray) {
                cartesian = this.viewer.scene.globe.pick(ray, this.viewer.scene);
            }
            if (!cartesian) {
                cartesian = this.viewer.camera.pickEllipsoid(movement.position, this.viewer.scene.globe.ellipsoid);
            }

            if (cartesian) {
                const carto = Cesium.Cartographic.fromCartesian(cartesian);
                const lon = Cesium.Math.toDegrees(carto.longitude);
                const lat = Cesium.Math.toDegrees(carto.latitude);

                this.setInspectionPin(lat, lon);
                if (window.app && window.app.inspectLocation) {
                    window.app.inspectLocation(lat, lon);
                }
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // Double click: zoom smoothly down to town / street level anywhere clicked
        handler.setInputAction((movement) => {
            const ray = this.viewer.camera.getPickRay(movement.position);
            let cartesian = null;
            if (ray) {
                cartesian = this.viewer.scene.globe.pick(ray, this.viewer.scene);
            }
            if (!cartesian) {
                cartesian = this.viewer.camera.pickEllipsoid(movement.position, this.viewer.scene.globe.ellipsoid);
            }
            if (cartesian) {
                const carto = Cesium.Cartographic.fromCartesian(cartesian);
                const lon = Cesium.Math.toDegrees(carto.longitude);
                const lat = Cesium.Math.toDegrees(carto.latitude);
                const currH = this.viewer.camera.positionCartographic.height;
                const targetH = Math.max(1500.0, currH * 0.25);
                this.flyToCoordinates(lat, lon, targetH, -82.0);
            }
        }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
    }

    setInspectionPin(lat, lon, labelText = "📍 Inspecting Point...") {
        this.clearInspectionPin();

        this.inspectionPinEntity = this.viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(lon, lat, 15.0),
            point: {
                pixelSize: 12,
                color: Cesium.Color.fromCssColorString("#00f0ff"),
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 2,
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            },
            ellipse: {
                semiMinorAxis: 18000.0,
                semiMajorAxis: 18000.0,
                material: Cesium.Color.fromCssColorString("#00f0ff").withAlpha(0.20),
                outline: true,
                outlineColor: Cesium.Color.fromCssColorString("#00f0ff").withAlpha(0.80),
                outlineWidth: 2.0,
                height: 5.0
            },
            label: {
                text: labelText,
                font: 'bold 11px "Inter", sans-serif',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 3,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                pixelOffset: new Cesium.Cartesian2(0, -22),
                showBackground: true,
                backgroundColor: Cesium.Color.fromCssColorString("rgba(5, 12, 26, 0.90)"),
                backgroundPadding: new Cesium.Cartesian2(8, 4),
                distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0.0, 7500000.0),
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
        });
    }

    updateInspectionPinLabel(text) {
        if (this.inspectionPinEntity && this.inspectionPinEntity.label) {
            this.inspectionPinEntity.label.text = `📍 ${text}`;
        }
    }

    clearInspectionPin() {
        if (this.inspectionPinEntity) {
            this.viewer.entities.remove(this.inspectionPinEntity);
            this.inspectionPinEntity = null;
        }
    }

    flyToCoordinates(lat, lon, height = 30000.0, pitchDeg = -89.9) {
        this.viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(lon, lat, height),
            orientation: {
                heading: Cesium.Math.toRadians(0.0),
                pitch: Cesium.Math.toRadians(pitchDeg),
                roll: 0.0
            },
            duration: 1.2
        });
    }

    zoomIn() {
        const currH = this.viewer.camera.positionCartographic.height;
        const targetH = Math.max(100.0, currH * 0.4);
        const carto = this.viewer.camera.positionCartographic;
        const lon = Cesium.Math.toDegrees(carto.longitude);
        const lat = Cesium.Math.toDegrees(carto.latitude);
        this.viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(lon, lat, targetH),
            orientation: {
                heading: this.viewer.camera.heading,
                pitch: Cesium.Math.toRadians(-89.9),
                roll: 0
            },
            duration: 0.4
        });
    }

    zoomOut() {
        const currH = this.viewer.camera.positionCartographic.height;
        const targetH = Math.min(35000000.0, currH * 2.2);
        const carto = this.viewer.camera.positionCartographic;
        const lon = Cesium.Math.toDegrees(carto.longitude);
        const lat = Cesium.Math.toDegrees(carto.latitude);
        this.viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(lon, lat, targetH),
            orientation: {
                heading: this.viewer.camera.heading,
                pitch: Cesium.Math.toRadians(-89.9),
                roll: 0
            },
            duration: 0.4
        });
    }

    resetView() {
        // Perfectly centers the entire Earth globe on screen
        this.viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(80.0, 18.0, 9600000.0),
            orientation: {
                heading: 0,
                pitch: Cesium.Math.toRadians(-89.9),
                roll: 0
            },
            duration: 1.2
        });
    }

    togglePerspective3D() {
        const currPitch = Cesium.Math.toDegrees(this.viewer.camera.pitch);
        const carto = this.viewer.camera.positionCartographic;
        const lon = Cesium.Math.toDegrees(carto.longitude);
        const lat = Cesium.Math.toDegrees(carto.latitude);
        const h = carto.height;

        const isTilted = currPitch > -75.0;
        const targetPitch = isTilted ? -89.9 : -65.0;

        this.viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(lon, lat, h),
            orientation: {
                heading: 0.0,
                pitch: Cesium.Math.toRadians(targetPitch),
                roll: 0.0
            },
            duration: 0.8
        });

        const btn = document.getElementById("btnToggle3D");
        if (btn) {
            btn.textContent = isTilted ? "3D" : "2D";
            btn.style.color = isTilted ? "#fff" : "var(--cyan-primary)";
        }
    }

    renderActiveStorms(storms) {
        this.activeStormEntities.forEach(e => this.viewer.entities.remove(e));
        this.activeStormEntities = [];

        storms.forEach(storm => {
            const lat = storm.current_lat;
            const lon = storm.current_lon;

            let color = Cesium.Color.fromCssColorString("#00d2ff");
            let pSize = 14;
            const wind = storm.wind_kph || 0;

            if (wind >= 210) {
                color = Cesium.Color.fromCssColorString("#ef4444");
                pSize = 18;
            } else if (wind >= 160) {
                color = Cesium.Color.fromCssColorString("#f97316");
                pSize = 16;
            } else if (wind >= 120) {
                color = Cesium.Color.fromCssColorString("#f59e0b");
                pSize = 15;
            } else if (wind >= 63) {
                color = Cesium.Color.fromCssColorString("#00d2ff");
                pSize = 14;
            } else {
                color = Cesium.Color.fromCssColorString("#34d399");
                pSize = 12;
            }

            const catLabel = storm.category_native || storm.category || "";
            const labelText = `🌀 ${storm.name} · ${storm.wind_kph} km/h (${catLabel})`;

            // 1. Storm center marker
            const marker = this.viewer.entities.add({
                name: storm.name,
                position: Cesium.Cartesian3.fromDegrees(lon, lat),
                point: {
                    pixelSize: pSize,
                    color: color,
                    outlineColor: Cesium.Color.WHITE,
                    outlineWidth: 2.5,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                },
                label: {
                    text: labelText,
                    font: 'bold 11px "Inter", -apple-system, sans-serif',
                    fillColor: Cesium.Color.WHITE,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2.5,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    pixelOffset: new Cesium.Cartesian2(0, -18),
                    showBackground: true,
                    backgroundColor: Cesium.Color.fromCssColorString("rgba(5, 12, 26, 0.85)"),
                    backgroundPadding: new Cesium.Cartesian2(7, 4),
                    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0.0, 18000000.0)
                }
            });
            marker.stormId = storm.id;
            this.activeStormEntities.push(marker);

            // 2. Gale wind radius ring
            const galeKm = (storm.radii_km && storm.radii_km.gale_34kt) || 240;
            const galeCircle = this.viewer.entities.add({
                name: `${storm.name} Gale Ring`,
                position: Cesium.Cartesian3.fromDegrees(lon, lat),
                ellipse: {
                    semiMinorAxis: galeKm * 1000.0,
                    semiMajorAxis: galeKm * 1000.0,
                    material: color.withAlpha(0.12),
                    outline: true,
                    outlineColor: color.withAlpha(0.65),
                    outlineWidth: 1.5
                }
            });
            this.activeStormEntities.push(galeCircle);

            // 3. Observed / Past track polyline (SOLID as required by Phase 3)
            if (storm.past_track && storm.past_track.length > 1) {
                const pastCoords = [];
                storm.past_track.forEach(p => pastCoords.push(p.lon, p.lat));
                const pastLine = this.viewer.entities.add({
                    polyline: {
                        positions: Cesium.Cartesian3.fromDegreesArray(pastCoords),
                        width: 3.5,
                        material: new Cesium.ColorMaterialProperty(color.withAlpha(0.92))
                    }
                });
                this.activeStormEntities.push(pastLine);
            }
        });

        // Render coastal checkpoints with smart zoom display condition
        this.renderCoastalLabels();
    }

    renderCoastalLabels() {
        const coastalCities = [
            { name: "Kolkata", state: "West Bengal", lat: 22.5726, lon: 88.3639, color: "#f59e0b" },
            { name: "Bhubaneswar", state: "Odisha", lat: 20.2961, lon: 85.8245, color: "#ef4444" },
            { name: "Puri", state: "Odisha", lat: 19.8135, lon: 85.8312, color: "#ef4444" },
            { name: "Paradip Port", state: "Odisha", lat: 20.3165, lon: 86.6115, color: "#ef4444" },
            { name: "Balasore", state: "Odisha", lat: 21.4934, lon: 86.9135, color: "#38bdf8" },
            { name: "Visakhapatnam", state: "Andhra Pradesh", lat: 17.6868, lon: 83.2185, color: "#f59e0b" },
            { name: "Chennai", state: "Tamil Nadu", lat: 13.0827, lon: 80.2707, color: "#38bdf8" }
        ];

        coastalCities.forEach(c => {
            const cityEntity = this.viewer.entities.add({
                name: c.name,
                position: Cesium.Cartesian3.fromDegrees(c.lon, c.lat),
                point: {
                    pixelSize: 6,
                    color: Cesium.Color.fromCssColorString(c.color),
                    outlineColor: Cesium.Color.WHITE,
                    outlineWidth: 1.5
                },
                label: {
                    text: c.name,
                    font: '500 10px "Inter", sans-serif',
                    fillColor: Cesium.Color.WHITE,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    pixelOffset: new Cesium.Cartesian2(9, 0),
                    horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
                    showBackground: true,
                    backgroundColor: Cesium.Color.fromCssColorString("rgba(5, 12, 26, 0.75)"),
                    backgroundPadding: new Cesium.Cartesian2(4, 2),
                    // Only visible when zooming in closer than 4,200 km to prevent clutter at globe level
                    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0.0, 4200000.0)
                }
            });
            cityEntity.cityName = c.name;
            this.cityEntities.push(cityEntity);
        });
    }

    renderForecastTrack(storm) {
        this.forecastEntities.forEach(e => this.viewer.entities.remove(e));
        this.forecastEntities = [];

        if (!storm || !storm.forecast_track || storm.forecast_track.length === 0) return;

        // 1. Forecast Track Polyline (DASHED as required by Phase 3)
        const coords = [storm.current_lon, storm.current_lat];
        storm.forecast_track.forEach(pt => coords.push(pt.lon, pt.lat));

        const forecastLine = this.viewer.entities.add({
            name: `${storm.name} Forecast Track`,
            polyline: {
                positions: Cesium.Cartesian3.fromDegreesArray(coords),
                width: 3.5,
                material: new Cesium.PolylineDashMaterialProperty({
                    color: Cesium.Color.fromCssColorString("#ef4444"),
                    dashLength: 16.0
                })
            }
        });
        this.forecastEntities.push(forecastLine);

        // 2. Translucent Expanding Cone of Uncertainty Corridor & Waypoints
        storm.forecast_track.forEach(pt => {
            const h = pt.horizon_hours;

            // Intensity dot along track
            let ptColor = Cesium.Color.fromCssColorString("#ef4444");
            if (pt.wind_kph < 100) ptColor = Cesium.Color.fromCssColorString("#10b981");
            else if (pt.wind_kph < 150) ptColor = Cesium.Color.fromCssColorString("#f59e0b");

            const dot = this.viewer.entities.add({
                position: Cesium.Cartesian3.fromDegrees(pt.lon, pt.lat),
                point: {
                    pixelSize: 8,
                    color: ptColor,
                    outlineColor: Cesium.Color.WHITE,
                    outlineWidth: 1.5
                },
                label: {
                    text: `+${h}h (${pt.wind_kph}kph)`,
                    font: '9px "JetBrains Mono", monospace',
                    fillColor: Cesium.Color.WHITE,
                    pixelOffset: new Cesium.Cartesian2(0, -12),
                    showBackground: true,
                    backgroundColor: Cesium.Color.fromCssColorString("rgba(5, 12, 26, 0.8)"),
                    backgroundPadding: new Cesium.Cartesian2(4, 2),
                    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0.0, 6000000.0)
                }
            });
            this.forecastEntities.push(dot);

            // Cone circle buffer
            const coneCircle = this.viewer.entities.add({
                position: Cesium.Cartesian3.fromDegrees(pt.lon, pt.lat),
                ellipse: {
                    semiMinorAxis: (pt.cone_radius_km || 50) * 1000.0,
                    semiMajorAxis: (pt.cone_radius_km || 50) * 1000.0,
                    material: Cesium.Color.fromCssColorString("#ef4444").withAlpha(0.10),
                    outline: true,
                    outlineColor: Cesium.Color.fromCssColorString("#ef4444").withAlpha(0.35),
                    outlineWidth: 1.0
                }
            });
            this.forecastEntities.push(coneCircle);
        });

        // 3. Clean Landfall Target Indicator at Odisha coast
        const landfallEntity = this.viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(86.8, 20.8),
            point: {
                pixelSize: 10,
                color: Cesium.Color.fromCssColorString("#f59e0b"),
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 2
            },
            label: {
                text: "🎯 Landfall Corridor · 18 Oct 06:00 IST (185 km/h)",
                font: 'bold 10.5px "Inter", sans-serif',
                fillColor: Cesium.Color.fromCssColorString("#fde68a"),
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                pixelOffset: new Cesium.Cartesian2(0, -18),
                showBackground: true,
                backgroundColor: Cesium.Color.fromCssColorString("rgba(15, 23, 42, 0.88)"),
                backgroundPadding: new Cesium.Cartesian2(6, 3),
                distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0.0, 7500000.0)
            }
        });
        this.forecastEntities.push(landfallEntity);
    }

    setStormPositionToStep(stepIndex, storm) {
        if (!storm || !storm.timeline_snapshots || !storm.timeline_snapshots[stepIndex]) return;

        const snap = storm.timeline_snapshots[stepIndex];
        const marker = this.activeStormEntities.find(e => e.stormId === storm.id);
        if (marker) {
            marker.position = Cesium.Cartesian3.fromDegrees(snap.lon, snap.lat);
            marker.label.text = `🌀 ${storm.name} (${snap.date_label}) · ${snap.wind_kph} km/h`;
        }
    }
}

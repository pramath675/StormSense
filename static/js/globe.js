/**
 * CycloneGuard AI: 3D Digital Earth CesiumJS Engine
 * Precision geospatial rendering matching CycloneGuard AI Dashboard:
 *  - High-res 3D Earth terrain focused on Bay of Bengal / Indian Ocean
 *  - Cyclone REMAL (Cat 3 Severe) with pulsing red eyewall, trajectory & cone
 *  - Invest 94B (Amber) and System 91W (Cyan) active storm markers
 *  - Coastal hazard labels (Kolkata, Bhubaneswar, Visakhapatnam, Chennai, Puri)
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
        this.overlays = { radar: true, cones: true, cities: true };

        this.initCesium();
    }

    initCesium() {
        Cesium.Ion.defaultAccessToken = "";

        // Default photorealistic ESRI imagery or CartoDB Dark
        const esriImageryProvider = new Cesium.ArcGisMapServerImageryProvider({
            url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer"
        });

        this.viewer = new Cesium.Viewer(this.containerId, {
            imageryProvider: esriImageryProvider,
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

        const scene = this.viewer.scene;
        scene.globe.baseColor = Cesium.Color.fromCssColorString("#020610");
        scene.globe.enableLighting = true;
        scene.backgroundColor = Cesium.Color.fromCssColorString("#020610");

        // Focus initial camera exactly on India, Bay of Bengal, and Indian Ocean
        this.viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(86.5, 17.5, 5200000.0),
            orientation: {
                heading: Cesium.Math.toRadians(0.0),
                pitch: Cesium.Math.toRadians(-68.0),
                roll: 0.0
            },
            duration: 2.0
        });

        this.setupInteractions();
    }

    setupInteractions() {
        const handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
        handler.setInputAction((movement) => {
            const picked = this.viewer.scene.pick(movement.position);
            if (Cesium.defined(picked) && picked.id && picked.id.stormId) {
                if (window.app) window.app.selectStorm(picked.id.stormId);
            } else if (Cesium.defined(picked) && picked.id && picked.id.cityName) {
                if (window.app) window.app.showCityDetail(picked.id.cityName);
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    }

    setBasemap(type) {
        this.currentLayer = type;
        const layers = this.viewer.imageryLayers;
        layers.removeAll();

        let provider;
        if (type === "dark") {
            provider = new Cesium.UrlTemplateImageryProvider({
                url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
                subdomains: ["a", "b", "c", "d"],
                maximumLevel: 19
            });
        } else if (type === "osm") {
            provider = new Cesium.OpenStreetMapImageryProvider({
                url: "https://tile.openstreetmap.org/"
            });
        } else {
            provider = new Cesium.ArcGisMapServerImageryProvider({
                url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer"
            });
        }
        layers.addImageryProvider(provider);
    }

    flyToCoordinates(lat, lon, height = 2600000.0) {
        this.viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(lon, lat, height),
            orientation: {
                heading: Cesium.Math.toRadians(0.0),
                pitch: Cesium.Math.toRadians(-65.0),
                roll: 0.0
            },
            duration: 1.8
        });
    }

    zoomIn() {
        this.viewer.camera.zoomIn(750000.0);
    }

    zoomOut() {
        this.viewer.camera.zoomOut(750000.0);
    }

    resetView() {
        this.viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(86.5, 17.5, 5200000.0),
            orientation: {
                heading: 0,
                pitch: Cesium.Math.toRadians(-68.0),
                roll: 0
            },
            duration: 1.5
        });
    }

    renderActiveStorms(storms) {
        this.activeStormEntities.forEach(e => this.viewer.entities.remove(e));
        this.activeStormEntities = [];

        storms.forEach(storm => {
            const lat = storm.current_lat;
            const lon = storm.current_lon;

            let color = Cesium.Color.fromCssColorString("#00d2ff");
            let iconText = "🌀";
            if (storm.id === "REMAL") {
                color = Cesium.Color.fromCssColorString("#ef4444");
            } else if (storm.id === "INVEST_94B") {
                color = Cesium.Color.fromCssColorString("#f59e0b");
            }

            // 1. Storm center marker
            const marker = this.viewer.entities.add({
                name: storm.name,
                position: Cesium.Cartesian3.fromDegrees(lon, lat),
                point: {
                    pixelSize: storm.id === "REMAL" ? 22 : 16,
                    color: color,
                    outlineColor: Cesium.Color.WHITE,
                    outlineWidth: 3,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                },
                label: {
                    text: `${iconText} ${storm.name}\n${storm.category}`,
                    font: 'bold 12px "Inter", sans-serif',
                    fillColor: Cesium.Color.WHITE,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 3,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    pixelOffset: new Cesium.Cartesian2(0, -18)
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
                    outlineWidth: 2
                }
            });
            this.activeStormEntities.push(galeCircle);

            // 3. Past track polyline
            if (storm.past_track && storm.past_track.length > 1) {
                const pastCoords = [];
                storm.past_track.forEach(p => pastCoords.push(p.lon, p.lat));
                const pastLine = this.viewer.entities.add({
                    polyline: {
                        positions: Cesium.Cartesian3.fromDegreesArray(pastCoords),
                        width: 3.5,
                        material: new Cesium.PolylineDashMaterialProperty({
                            color: color.withAlpha(0.85)
                        })
                    }
                });
                this.activeStormEntities.push(pastLine);
            }
        });

        // Render Indian coastal region labels matching screenshot
        this.renderCoastalLabels();
    }

    renderCoastalLabels() {
        const coastalCities = [
            { name: "Kolkata", state: "West Bengal", lat: 22.5726, lon: 88.3639, color: "#f59e0b" },
            { name: "Bhubaneswar", state: "Odisha", lat: 20.2961, lon: 85.8245, color: "#ef4444" },
            { name: "Puri", state: "Odisha", lat: 19.8135, lon: 85.8312, color: "#ef4444" },
            { name: "Visakhapatnam", state: "Andhra Pradesh", lat: 17.6868, lon: 83.2185, color: "#f59e0b" },
            { name: "Chennai", state: "Tamil Nadu", lat: 13.0827, lon: 80.2707, color: "#38bdf8" }
        ];

        coastalCities.forEach(c => {
            const cityEntity = this.viewer.entities.add({
                name: c.name,
                position: Cesium.Cartesian3.fromDegrees(c.lon, c.lat),
                point: {
                    pixelSize: 8,
                    color: Cesium.Color.fromCssColorString(c.color),
                    outlineColor: Cesium.Color.WHITE,
                    outlineWidth: 2
                },
                label: {
                    text: `● ${c.name}`,
                    font: 'bold 11px "Inter", sans-serif',
                    fillColor: Cesium.Color.WHITE,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    pixelOffset: new Cesium.Cartesian2(12, 0),
                    showBackground: true,
                    backgroundColor: Cesium.Color.fromCssColorString("rgba(3, 7, 18, 0.75)")
                }
            });
            cityEntity.cityName = c.name;
            this.cityEntities.push(cityEntity);
        });
    }

    renderForecastTrack(storm) {
        this.forecastEntities.forEach(e => this.viewer.entities.remove(e));
        this.forecastEntities = [];

        if (!storm || !storm.forecast_track) return;

        // 1. Main Forecast Polyline (Glowing corridor)
        const coords = [storm.current_lon, storm.current_lat];
        storm.forecast_track.forEach(pt => coords.push(pt.lon, pt.lat));

        const forecastLine = this.viewer.entities.add({
            name: `${storm.name} Forecast Corridor`,
            polyline: {
                positions: Cesium.Cartesian3.fromDegreesArray(coords),
                width: 4.5,
                material: new Cesium.PolylineGlowMaterialProperty({
                    glowPower: 0.35,
                    color: Cesium.Color.fromCssColorString("#ef4444")
                })
            }
        });
        this.forecastEntities.push(forecastLine);

        // 2. Translucent Expanding Cone of Uncertainty Corridor
        const leftBoundary = [];
        const rightBoundary = [];

        storm.forecast_track.forEach(pt => {
            const h = pt.horizon_hours;
            const coneR = (pt.cone_radius_km || h * 6) / 111.0; // km to approx degrees

            leftBoundary.push(pt.lon - coneR, pt.lat + (coneR * 0.4));
            rightBoundary.push(pt.lon + coneR, pt.lat - (coneR * 0.4));

            // Intensity dot along track
            let ptColor = Cesium.Color.fromCssColorString("#ef4444");
            if (pt.wind_kph < 100) ptColor = Cesium.Color.fromCssColorString("#10b981");
            else if (pt.wind_kph < 150) ptColor = Cesium.Color.fromCssColorString("#f59e0b");

            const dot = this.viewer.entities.add({
                position: Cesium.Cartesian3.fromDegrees(pt.lon, pt.lat),
                point: {
                    pixelSize: 10,
                    color: ptColor,
                    outlineColor: Cesium.Color.WHITE,
                    outlineWidth: 2
                },
                label: {
                    text: `+${h}h (${pt.wind_kph} km/h)`,
                    font: '10px "JetBrains Mono", sans-serif',
                    fillColor: Cesium.Color.WHITE,
                    pixelOffset: new Cesium.Cartesian2(0, -12),
                    showBackground: true,
                    backgroundColor: Cesium.Color.fromCssColorString("rgba(4, 10, 22, 0.85)")
                }
            });
            this.forecastEntities.push(dot);

            // Cone circle buffer
            const coneCircle = this.viewer.entities.add({
                position: Cesium.Cartesian3.fromDegrees(pt.lon, pt.lat),
                ellipse: {
                    semiMinorAxis: (pt.cone_radius_km || 50) * 1000.0,
                    semiMajorAxis: (pt.cone_radius_km || 50) * 1000.0,
                    material: Cesium.Color.fromCssColorString("#ef4444").withAlpha(0.12),
                    outline: true,
                    outlineColor: Cesium.Color.fromCssColorString("#ef4444").withAlpha(0.4),
                    outlineWidth: 1.5
                }
            });
            this.forecastEntities.push(coneCircle);
        });

        // 3. Landfall target marker at Odisha coast
        const landfallEntity = this.viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(86.8, 20.8),
            label: {
                text: "🎯 Landfall Expected: 18 Oct, 06:00 AM IST\nBetween Puri & Sagar Island (185 km/h)",
                font: 'bold 12px "Inter", sans-serif',
                fillColor: Cesium.Color.YELLOW,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 3,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                pixelOffset: new Cesium.Cartesian2(0, -16),
                showBackground: true,
                backgroundColor: Cesium.Color.fromCssColorString("rgba(239, 68, 68, 0.85)")
            }
        });
        this.forecastEntities.push(landfallEntity);
    }

    setStormPositionToStep(stepIndex, storm) {
        if (!storm || !storm.timeline_snapshots || !storm.timeline_snapshots[stepIndex]) return;

        const snap = storm.timeline_snapshots[stepIndex];
        const remalMarker = this.activeStormEntities.find(e => e.stormId === "REMAL");
        if (remalMarker) {
            remalMarker.position = Cesium.Cartesian3.fromDegrees(snap.lon, snap.lat);
            remalMarker.label.text = `🌀 ${storm.name}\n${snap.date_label}\n${snap.wind_kph} km/h (${snap.category})`;
        }
    }
}

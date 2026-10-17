"""
CycloneGuard AI: Basin-Specific Intensity Scales & Cross-Basin Standardization
Implements native meteorological agency scales and Saffir-Simpson approximations.
"""


def get_sshws_equivalent(wind_kt: float) -> dict:
    """Returns universal Saffir-Simpson Hurricane Wind Scale (SSHWS) equivalent."""
    if wind_kt >= 137:
        cat = "Category 5"
        level = 5
    elif wind_kt >= 113:
        cat = "Category 4"
        level = 4
    elif wind_kt >= 96:
        cat = "Category 3"
        level = 3
    elif wind_kt >= 83:
        cat = "Category 2"
        level = 2
    elif wind_kt >= 64:
        cat = "Category 1"
        level = 1
    elif wind_kt >= 34:
        cat = "Tropical Storm"
        level = 0
    else:
        cat = "Tropical Depression"
        level = -1

    return {
        "category": cat,
        "level": level,
        "label": f"{cat} (approx. equivalent)" if level >= 1 else cat,
        "is_major": level >= 3
    }


def get_imd_scale(wind_kt: float) -> str:
    """IMD (RSMC New Delhi) official classification (3-minute sustained winds)."""
    if wind_kt >= 120:
        return "Super Cyclonic Storm (SuCS)"
    elif wind_kt >= 90:
        return "Extremely Severe Cyclonic Storm (ESCS)"
    elif wind_kt >= 64:
        return "Very Severe Cyclonic Storm (VSCS)"
    elif wind_kt >= 48:
        return "Severe Cyclonic Storm (SCS)"
    elif wind_kt >= 34:
        return "Cyclonic Storm (CS)"
    elif wind_kt >= 28:
        return "Deep Depression (DD)"
    elif wind_kt >= 17:
        return "Depression (D)"
    else:
        return "Low Pressure Area (LPA)"


def get_west_pacific_scale(wind_kt: float) -> str:
    """Western Pacific (JMA / JTWC) classification."""
    if wind_kt >= 130:
        return "Super Typhoon"
    elif wind_kt >= 64:
        return "Typhoon"
    elif wind_kt >= 48:
        return "Severe Tropical Storm (STS)"
    elif wind_kt >= 34:
        return "Tropical Storm (TS)"
    else:
        return "Tropical Depression (TD)"


def get_australian_bom_scale(wind_kt: float) -> str:
    """Australian / South Pacific / South Indian Ocean (BoM) classification (10-min sustained)."""
    if wind_kt >= 107:
        return "Category 5 Severe Tropical Cyclone"
    elif wind_kt >= 86:
        return "Category 4 Severe Tropical Cyclone"
    elif wind_kt >= 64:
        return "Category 3 Severe Tropical Cyclone"
    elif wind_kt >= 48:
        return "Category 2 Tropical Cyclone"
    elif wind_kt >= 34:
        return "Category 1 Tropical Cyclone"
    else:
        return "Tropical Low"


def get_nhc_scale(wind_kt: float) -> str:
    """NOAA NHC (Atlantic & East/Central Pacific) Saffir-Simpson classification."""
    if wind_kt >= 137:
        return "Category 5 Major Hurricane"
    elif wind_kt >= 113:
        return "Category 4 Major Hurricane"
    elif wind_kt >= 96:
        return "Category 3 Major Hurricane"
    elif wind_kt >= 83:
        return "Category 2 Hurricane"
    elif wind_kt >= 64:
        return "Category 1 Hurricane"
    elif wind_kt >= 34:
        return "Tropical Storm"
    else:
        return "Tropical Depression"


class ScaleResult(dict):
    """Dictionary that can also be unpacked as a 3-tuple (native, sshws_equivalent, sshws_badge)."""
    def __iter__(self):
        yield self["native_category"]
        yield self["sshws_equivalent"]
        yield self["sshws_badge"]


def get_wind_averaging_period(source: str) -> str:
    """Returns official WMO wind averaging period for an agency."""
    s_lower = (source or "").lower()
    if "imd" in s_lower:
        return "3-minute sustained"
    elif any(k in s_lower for k in ["gdacs", "jma", "bom", "australia"]):
        return "10-minute sustained"
    else:
        return "1-minute sustained"


def classify_storm_intensity(basin_or_wind, wind_or_basin, source: str = "") -> ScaleResult:
    """
    Computes both the official basin-native agency category and the cross-basin SSHWS equivalent.
    Accepts arguments in either order: (basin, wind_kt) or (wind_kt, basin).
    If wind speed is provided in km/h (> 140 or explicit conversion), normalizes to knots.
    """
    if isinstance(basin_or_wind, (int, float)):
        wind_val = float(basin_or_wind)
        basin = str(wind_or_basin)
    else:
        basin = str(basin_or_wind)
        wind_val = float(wind_or_basin)

    # Convert km/h to knots if caller passed km/h (e.g. > 140 kt without cat 5 context or explicit km/h)
    # A storm with wind > 185 is almost certainly km/h (since max earthly wind in kt is ~175)
    wind_kt = wind_val / 1.852 if wind_val > 185.0 else wind_val

    sshws = get_sshws_equivalent(wind_kt)
    basin_lower = basin.lower()

    if "north indian" in basin_lower or "bay of bengal" in basin_lower or "arabian sea" in basin_lower:
        native = get_imd_scale(wind_kt)
        agency_standard = "IMD (3-min sustained)"
    elif any(k in basin_lower for k in ["west pacific", "western pacific", "northwest pacific", "western north pacific", "wpac", "typhoon"]):
        native = get_west_pacific_scale(wind_kt)
        agency_standard = "JMA/JTWC (1-min / 10-min)"
    elif any(k in basin_lower for k in ["south pacific", "south indian", "australian"]):
        native = get_australian_bom_scale(wind_kt)
        agency_standard = "BoM (10-min sustained)"
    elif any(k in basin_lower for k in ["north atlantic", "east pacific", "central pacific", "atlantic", "eastern pacific"]):
        native = get_nhc_scale(wind_kt)
        agency_standard = "NOAA NHC (1-min sustained)"
    else:
        native = sshws["category"]
        agency_standard = "WMO Standard"

    return ScaleResult({
        "native_category": native,
        "sshws_equivalent": sshws["category"],
        "sshws_badge": sshws["label"],
        "sshws_level": sshws["level"],
        "is_major": sshws["is_major"],
        "agency_standard": agency_standard
    })


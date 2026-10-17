"""
CycloneGuard AI: Base Ingestion Adapter
Defines standardized interface, caching, latency measurement, and error handling.
"""

import time
from datetime import datetime, timezone, timedelta
from abc import ABC, abstractmethod

# IST timezone: UTC + 5:30
IST = timezone(timedelta(hours=5, minutes=30))


def now_utc_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def now_ist_str() -> str:
    return datetime.now(IST).strftime("%d %b %Y, %I:%M %p IST")


def to_ist_str(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(IST).strftime("%d %b %Y, %I:%M %p IST")


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two points in km."""
    import math
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    return round(2.0 * R * math.atan2(math.sqrt(a), math.sqrt(1.0 - a)), 2)


class BaseAdapter(ABC):
    def __init__(self, name: str, default_ttl_sec: int = 600):
        self.name = name
        self.ttl = default_ttl_sec
        self.cached_storms = []
        self.last_fetch_time = 0.0
        self.last_fetch_utc = None
        self.last_fetch_ist = None
        self.last_status = "UNKNOWN"
        self.last_latency_ms = 0.0
        self.last_error = None

    def get_health(self) -> dict:
        return {
            "source": self.name,
            "status": self.last_status,
            "latency_ms": round(self.last_latency_ms, 1),
            "last_fetch_utc": self.last_fetch_utc,
            "last_fetch_ist": self.last_fetch_ist,
            "cached_storms_count": len(self.cached_storms),
            "last_error": self.last_error
        }

    def fetch(self, force: bool = False) -> list:
        now = time.time()
        if not force and self.cached_storms and (now - self.last_fetch_time < self.ttl):
            return self.cached_storms

        t0 = time.time()
        try:
            storms = self._fetch_live()
            t1 = time.time()
            self.last_latency_ms = (t1 - t0) * 1000.0
            self.cached_storms = storms
            self.last_fetch_time = now
            self.last_fetch_utc = now_utc_iso()
            self.last_fetch_ist = now_ist_str()
            self.last_status = "ONLINE"
            self.last_error = None
            return storms
        except Exception as e:
            t1 = time.time()
            self.last_latency_ms = (t1 - t0) * 1000.0
            self.last_status = "OFFLINE" if not self.cached_storms else "DEGRADED"
            self.last_error = str(e)
            print(f"[!] Adapter {self.name} fetch failed: {e}")
            return self.cached_storms

    @abstractmethod
    def _fetch_live(self) -> list:
        """Subclasses must implement actual HTTP fetching and return list of normalized storm dicts."""
        pass

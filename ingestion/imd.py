"""
CycloneGuard AI: IMD (India Meteorological Department / RSMC New Delhi) Adapter
Basin: North Indian Ocean (Bay of Bengal, Arabian Sea)
Wind averaging: 3-minute sustained (IMD official standard)

CRITICAL AMENDMENT RULE:
Probe RSMC New Delhi pages. If no machine-readable bulletin exists,
return an empty list so NIO storms are sourced from JTWC or GDACS.
NEVER label a storm with source='IMD' unless the data truly came from IMD.
"""

import requests
from bs4 import BeautifulSoup
from .base import BaseAdapter, now_utc_iso, now_ist_str


class IMDAdapter(BaseAdapter):
    RSMC_URL = "https://rsmcnewdelhi.imd.gov.in/"
    BULLETINS_URL = "https://rsmcnewdelhi.imd.gov.in/bulletins-products.php"

    def __init__(self):
        super().__init__(name="IMD RSMC New Delhi", default_ttl_sec=600)
        self.fixed_status = "DEGRADED"

    def get_health(self) -> dict:
        h = super().get_health()
        h["status"] = "DEGRADED"
        h["note"] = "RSMC New Delhi publishes bulletins in binary PDF format only; no machine-readable CAP/JSON feed. NIO coverage delegated to JTWC & GDACS."
        return h

    def _fetch_live(self) -> list:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)"
        }

        # 1. Probe RSMC New Delhi homepage
        resp = requests.get(self.RSMC_URL, headers=headers, timeout=10)
        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "html.parser")

        # Check if RSMC indicates "No Cyclone" or active storm
        page_text = soup.get_text().lower()
        has_no_cyclone = "no cyclone" in page_text or "no cyclonic storm" in page_text

        # Look for active bulletin links
        active_bulletin_links = []
        for a in soup.find_all("a", href=True):
            href = a["href"].lower()
            txt = a.get_text().strip().lower()
            if "cyclone" in href and "no cyclone" not in href and "pdf" in href:
                active_bulletin_links.append(a["href"])

        if has_no_cyclone or not active_bulletin_links:
            # RSMC New Delhi currently has no active cyclonic disturbance or only publishes PDF
            self.last_error = "RSMC New Delhi reports no active cyclonic disturbance in NIO (Routine: No Cyclone.pdf). NIO coverage delegated to JTWC & GDACS."
            return []

        # If an active bulletin link was found, note that IMD distributes PDFs
        # In this phase, without machine-readable JSON/XML feeds from IMD, we fall back to JTWC & GDACS.
        self.last_error = "IMD active bulletin is published in binary PDF format only. Sourcing NIO intelligence from JTWC & GDACS with exact source attribution."
        return []

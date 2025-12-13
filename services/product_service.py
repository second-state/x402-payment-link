"""Product/link service that fetches catalog data from the Next.js API."""

import logging
import os
from typing import Optional

import requests
from requests import exceptions as req_exc

API_BASE = os.getenv("LINK_API_BASE", "http://localhost:3000")
API_KEY = os.getenv("LINK_API_KEY")
API_TIMEOUT = float(os.getenv("LINK_API_TIMEOUT", "15"))

logger = logging.getLogger(__name__)


def _auth_headers() -> dict:
    if not API_KEY:
        return {}
    return {"Authorization": f"Bearer {API_KEY}"}


def fetch_link(code: str) -> Optional[dict]:
    """Fetch link data from the dashboard API."""
    url = f"{API_BASE}/api/links/{code}"
    try:
        resp = requests.get(url, headers=_auth_headers(), timeout=API_TIMEOUT)
        if not resp.ok:
            logger.warning("Link fetch failed (%s): %s", code, resp.status_code)
            return None
        return resp.json().get("link")
    except req_exc.RequestException as exc:
        logger.error("Link fetch error (%s): %s", code, exc)
        return None


def get_products_from_link(link: dict) -> list[dict]:
    """Map linkProducts into product configs for the preview/order form."""
    products = []
    for lp in link.get("linkProducts", []):
        product = lp.get("product", {})
        price = lp.get("price")
        products.append(
          {
            "id": product.get("id"),
            "name": product.get("name"),
            "description": product.get("description"),
            "image": product.get("image"),
            "price": float(price["amount"]) if price else 0.0,
            "shipping": float(price["shipping"]) if price else 0.0,
          }
        )
    return products


def get_link_config(link_code: str, _environment: Optional[str] = None) -> Optional[dict]:
    link = fetch_link(link_code)
    if not link:
        return None
    products = get_products_from_link(link)
    if not products:
        return None
    return {
        "code": link_code,
        "products": products,
        "network": link.get("network"),
        "pay_to_address": link.get("payToAddress"),
        "require_shipping": bool(link.get("requireShipping", True)),
    }

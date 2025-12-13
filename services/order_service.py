"""Order management service for handling order persistence and retrieval via dashboard API."""

import logging
import os
import secrets
import string
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


def generate_order_id(length=12):
    """Generate a random order ID (uppercase alphanumeric)."""
    chars = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))


def _normalize_order(order: dict) -> dict:
    """Normalize order keys from API into the snake_case we expect internally."""
    return {
        **order,
        "order_id": order.get("orderId"),
        "require_shipping": order.get("requireShipping"),
        "tx_hash": order.get("txHash"),
        "tx_network": order.get("txNetwork"),
        "total": float(order.get("total", 0)) if order.get("total") is not None else None,
    }


def create_or_update_order(payload: dict) -> Optional[dict]:
    """Create or update an order in the dashboard via API."""
    url = f"{API_BASE}/api/orders"
    try:
        resp = requests.post(url, json=payload, headers=_auth_headers(), timeout=API_TIMEOUT)
        if not resp.ok:
            logger.error("Order create/update failed (%s): %s %s", payload.get("orderId"), resp.status_code, resp.text)
            return None
        order = resp.json().get("order")
        return _normalize_order(order) if order else None
    except req_exc.RequestException as exc:
        logger.error("Order create/update error (%s): %s", payload.get("orderId"), exc)
        return None


def get_order_by_id(order_id: str) -> Optional[dict]:
    """Fetch an order by ID from the dashboard API."""
    url = f"{API_BASE}/api/orders/{order_id}"
    try:
        resp = requests.get(url, headers=_auth_headers(), timeout=API_TIMEOUT)
        if resp.status_code == 404:
            return None
        if not resp.ok:
            logger.error("Order fetch failed (%s): %s %s", order_id, resp.status_code, resp.text)
            return None
        order = resp.json().get("order")
        return _normalize_order(order) if order else None
    except req_exc.RequestException as exc:
        logger.error("Order fetch error (%s): %s", order_id, exc)
        return None


def update_order(order_id: str, payload: dict) -> Optional[dict]:
    """Update an order by ID via the dashboard API."""
    url = f"{API_BASE}/api/orders/{order_id}"
    try:
        resp = requests.put(url, json=payload, headers=_auth_headers(), timeout=API_TIMEOUT)
        if not resp.ok:
            logger.error("Order update failed (%s): %s %s", order_id, resp.status_code, resp.text)
            return None
        order = resp.json().get("order")
        return _normalize_order(order) if order else None
    except req_exc.RequestException as exc:
        logger.error("Order update error (%s): %s", order_id, exc)
        return None

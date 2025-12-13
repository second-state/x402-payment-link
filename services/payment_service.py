"""Payment service for handling x402 payment verification and settlement."""

import json
import logging
import os
from typing import Optional

import httpx
from x402.common import find_matching_payment_requirements, process_price_to_atomic_amount
from x402.encoding import safe_base64_decode
from x402.facilitator import FacilitatorClient
from x402.types import PaymentPayload, PaymentRequirements


logger = logging.getLogger(__name__)
FACILITATOR_TIMEOUT = float(os.getenv("FACILITATOR_TIMEOUT", "60"))


def create_payment_requirements(
    product_config: dict,
    order: dict,
    order_id: str,
    resource_url: str,
    network: str,
    pay_to_address: str,
    max_timeout_seconds: int
) -> list[PaymentRequirements]:
    """Create payment requirements for an order.

    Args:
        product_config: Product configuration dictionary
        order: Order data dictionary
        order_id: Order identifier
        resource_url: The resource URL being accessed
        network: Network name (e.g., 'base-sepolia', 'base')
        pay_to_address: Address to receive payment
        max_timeout_seconds: Maximum timeout for payment

    Returns:
        List of PaymentRequirements
    """
    total_price = order.get("total")
    if total_price is None:
        total_price = product_config.get("price", 0) + product_config.get("shipping", 0)
    max_amount_required, asset_address, eip712_domain = process_price_to_atomic_amount(
        f"${float(total_price):.2f}", network
    )

    requirements = [
        PaymentRequirements(
            scheme="exact",
            network=network,
            asset=asset_address,
            max_amount_required=max_amount_required,
            resource=resource_url,
            description=f"Payment for order {order_id}",
            mime_type="text/html",
            pay_to=pay_to_address,
            max_timeout_seconds=max_timeout_seconds,
            extra=eip712_domain,
        )
    ]
    logger.info(
        "Built payment requirements (%s): network=%s pay_to=%s amount=%s shipping=%s resource=%s",
        order_id,
        network,
        pay_to_address,
        product_config.get("price"),
        product_config.get("shipping"),
        resource_url,
    )
    return requirements


def parse_payment_header(
    payment_header: str,
    payment_requirements: list[PaymentRequirements],
    order_id: str
) -> tuple[Optional[PaymentPayload], Optional[PaymentRequirements], Optional[str]]:
    """Parse and validate payment header.

    Args:
        payment_header: Base64-encoded payment header
        payment_requirements: List of acceptable payment requirements
        order_id: Order ID for logging

    Returns:
        Tuple of (payment_payload, selected_requirements, error_message)
        If successful, error_message is None
        If failed, payment_payload and selected_requirements may be None
    """
    try:
        payment_dict = json.loads(safe_base64_decode(payment_header))
        payment = PaymentPayload(**payment_dict)
        logger.info(f"Decoded payment payload ({order_id}): %s", payment_dict)
    except Exception as e:
        logger.error(f"Failed to decode payment header ({order_id}): {e}")
        return None, None, f"Invalid payment header format: {e}"

    selected_payment_requirements = find_matching_payment_requirements(
        payment_requirements, payment
    )
    if not selected_payment_requirements:
        logger.error(f"No matching payment requirements found ({order_id})")
        return payment, None, "No matching payment requirements found"

    logger.info(f"Selected payment requirements ({order_id}): {selected_payment_requirements}")
    return payment, selected_payment_requirements, None


async def verify_payment(
    facilitator: FacilitatorClient,
    payment: PaymentPayload,
    requirements: PaymentRequirements,
    order_id: str
) -> tuple[bool, Optional[str]]:
    """Verify a payment using the facilitator.

    Args:
        facilitator: FacilitatorClient instance
        payment: Payment payload to verify
        requirements: Payment requirements to verify against
        order_id: Order ID for logging

    Returns:
        Tuple of (is_valid, error_message)
        If valid, error_message is None
    """
    url = facilitator.config["url"]
    payload = {
        "x402Version": payment.x402_version,
        "paymentPayload": payment.model_dump(by_alias=True),
        "paymentRequirements": requirements.model_dump(by_alias=True, exclude_none=True),
    }
    try:
        async with httpx.AsyncClient(timeout=FACILITATOR_TIMEOUT) as client:
            response = await client.post(f"{url}/verify", json=payload)
            data = response.json()
    except Exception as e:
        logger.error(f"Payment verification failed ({order_id}): {e}", exc_info=True)
        return False, f"Payment verification failed: {e}"

    is_valid = data.get("isValid")
    if not is_valid:
        error_reason = data.get("invalidReason") or data.get("error") or "Unknown error"
        logger.error(f"Payment verification failed ({order_id}): {error_reason} | raw={data}")
        return False, f"Payment verification failed: {error_reason}"

    logger.info(f"Payment verified successfully ({order_id}): {data}")
    return True, None


async def settle_payment(
    facilitator: FacilitatorClient,
    payment: PaymentPayload,
    requirements: PaymentRequirements,
    order_id: str
) -> tuple[bool, Optional[str], Optional[str], Optional[str]]:
    """Settle a payment using the facilitator.

    Args:
        facilitator: FacilitatorClient instance
        payment: Payment payload to settle
        requirements: Payment requirements
        order_id: Order ID for logging

    Returns:
        Tuple of (success, tx_hash, network, error_message)
        If successful, error_message is None
    """
    url = facilitator.config["url"]
    payload = {
        "x402Version": payment.x402_version,
        "paymentPayload": payment.model_dump(by_alias=True),
        "paymentRequirements": requirements.model_dump(by_alias=True, exclude_none=True),
    }

    try:
        async with httpx.AsyncClient(timeout=FACILITATOR_TIMEOUT) as client:
            response = await client.post(f"{url}/settle", json=payload)
            data = response.json()
    except Exception as e:
        logger.error(f"Payment settlement failed ({order_id}): {e}", exc_info=True)
        return False, None, None, f"Payment settlement failed: {e}"

    if not data.get("success"):
        error_reason = data.get("errorReason") or data.get("error") or "Unknown error"
        logger.error(
            "Payment settlement not success (%s): %s | raw=%s | tx=%s | network=%s",
            order_id,
            error_reason,
            data,
            data.get("transaction"),
            data.get("network"),
        )
        return False, None, None, f"Payment settlement not success: {error_reason}"

    logger.info(f"Payment settled successfully ({order_id}): tx={data.get('transaction')} network={data.get('network')}")
    return True, data.get("transaction"), data.get("network"), None


def generate_transaction_link(tx_hash: Optional[str], network: str) -> str:
    """Generate blockchain explorer link for a transaction.

    Args:
        tx_hash: Transaction hash
        network: Network name

    Returns:
        Transaction explorer URL or empty string if no hash
    """
    if not tx_hash:
        return ''

    explorers = {
        "base-sepolia": f"https://sepolia.basescan.org/tx/{tx_hash}",
        "base": f"https://basescan.org/tx/{tx_hash}",
    }

    return explorers.get(network, '')

"""Payment service for handling x402 payment verification and settlement."""

import json
import logging
from typing import Optional

from x402.common import (find_matching_payment_requirements,
                         process_price_to_atomic_amount)
from x402.encoding import safe_base64_decode
from x402.facilitator import FacilitatorClient
from x402.types import PaymentPayload, PaymentRequirements

logger = logging.getLogger(__name__)


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
    max_amount_required, asset_address, eip712_domain = (
        process_price_to_atomic_amount(f"${total_price:.2f}", network)
    )

    return [
        PaymentRequirements(
            scheme="exact",
            network=network,
            asset=asset_address,
            max_amount_required=max_amount_required,
            resource=resource_url,
            description=f"Payment for {product_config['name']} order {order_id}",
            mime_type="text/html",
            pay_to=pay_to_address,
            max_timeout_seconds=max_timeout_seconds,
            extra=eip712_domain,
            output_schema={},
        )
    ]


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
        logger.info(f"Decoded payment payload ({order_id}): {payment}")
    except Exception as e:
        logger.error(f"Failed to decode payment header ({order_id}): {e}")
        return None, None, f"Invalid payment header format: {e}"

    selected_payment_requirements = find_matching_payment_requirements(
        payment_requirements, payment
    )
    if not selected_payment_requirements:
        logger.error(f"No matching payment requirements found ({order_id})")
        return payment, None, "No matching payment requirements found"

    logger.info(
        f"Selected payment requirements ({order_id}): {selected_payment_requirements}")
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
    try:
        verify_response = await facilitator.verify(payment, requirements)
    except Exception as e:
        logger.error(f"Payment verification failed ({order_id}): {e}")
        return False, f"Payment verification failed: {e}"

    if not verify_response.is_valid:
        error_reason = verify_response.invalid_reason or "Unknown error"
        logger.error(
            f"Payment verification failed ({order_id}): {error_reason}")
        return False, f"Payment verification failed: {error_reason}"

    logger.info(
        f"Payment verified successfully ({order_id}): {verify_response}")
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
    try:
        settle_response = await facilitator.settle(payment, requirements)
        logger.info(f"Settle response ({order_id}): {settle_response}")

        if not settle_response.success:
            error_reason = settle_response.error_reason or "Unknown error"
            logger.error(
                f"Payment settlement not success ({order_id}): {error_reason}")
            return False, None, None, f"Payment settlement not success: {error_reason}"

        logger.info(f"Payment settled successfully ({order_id})")
        return True, settle_response.transaction, settle_response.network, None

    except Exception as e:
        logger.error(f"Payment settlement failed ({order_id}): {e}")
        return False, None, None, f"Payment settlement failed: {e}"


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

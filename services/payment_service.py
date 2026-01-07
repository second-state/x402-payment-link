"""Payment service for handling x402 payment verification and settlement."""

import json
import logging
from typing import Optional

from x402.common import (find_matching_payment_requirements,
                         process_price_to_atomic_amount, x402_VERSION)
from x402.encoding import safe_base64_decode
from x402.facilitator import FacilitatorClient, FacilitatorConfig
from x402.paywall import get_paywall_html, is_browser_request
from x402.types import (PaymentPayload, PaymentRequirements, PaywallConfig,
                        x402PaymentRequiredResponse)

logger = logging.getLogger(__name__)


class PaymentService:
    """Service class for handling x402 payment operations."""

    def __init__(
        self,
        app_name: str,
        app_logo: str,
        headers: dict,
        resource_url: str,
        price: float,
        description: str,
        network: str,
        pay_to_address: str,
        facilitator_url: str,
        max_timeout_seconds: int = 60
    ):
        """Initialize PaymentService.

        Args:
            app_name: Application name for paywall display
            app_logo: Application logo URL for paywall display
            headers: Request headers dictionary
            resource_url: The resource URL being accessed
            price: Price of the product
            description: Description of the payment
            network: Network name (e.g., 'base-sepolia', 'base')
            pay_to_address: Address to receive payment
            facilitator_url: Facilitator service URL
            max_timeout_seconds: Maximum timeout for payment
        """
        self.app_name = app_name
        self.app_logo = app_logo
        self.headers = dict(headers)
        self.resource_url = resource_url
        self.price = price
        self.description = description
        self.network = network
        self.pay_to_address = pay_to_address
        self.facilitator_url = facilitator_url
        self.paywall_config = PaywallConfig(
            app_name=self.app_name,
            app_logo=self.app_logo,
        )
        self.max_timeout_seconds = max_timeout_seconds

        # Create payment requirements on initialization
        self.payment_requirements = self._create_payment_requirements()
        self.facilitator_config = FacilitatorConfig(url=self.facilitator_url)
        self.facilitator = FacilitatorClient(self.facilitator_config)

    def _create_payment_requirements(self) -> list[PaymentRequirements]:
        """Create payment requirements for the payment.

        Returns:
            List of PaymentRequirements
        """
        max_amount_required, asset_address, eip712_domain = (
            process_price_to_atomic_amount(f"${self.price:.2f}", self.network)
        )

        return [
            PaymentRequirements(
                scheme="exact",
                network=self.network,
                asset=asset_address,
                max_amount_required=max_amount_required,
                resource=self.resource_url,
                description=self.description,
                mime_type="text/html",
                pay_to=self.pay_to_address,
                max_timeout_seconds=self.max_timeout_seconds,
                extra=eip712_domain,
                output_schema={},
            )
        ]

    def response(self, error: str) -> tuple:
        """Create a 402 response with payment requirements.

        Args:
            error: Error message to include in response

        Returns:
            Tuple of (response_content, status_code)
        """
        if is_browser_request(self.headers):
            html_content = get_paywall_html(
                error, self.payment_requirements, self.paywall_config
            )
            return html_content, 400
        else:
            response_data = x402PaymentRequiredResponse(
                x402_version=x402_VERSION,
                accepts=self.payment_requirements,
                error=error,
            ).model_dump(by_alias=True)
            return response_data, 402

    def parse(self) -> tuple[bool, Optional[PaymentPayload], Optional[PaymentRequirements], Optional[str]]:
        """Parse and validate payment header.

        Returns:
            Tuple of (success, payment_payload, selected_requirements, error_message)
            If successful, error_message is None
        """
        payment_header = self.headers.get(
            "X-Payment", "") or self.headers.get("X-PAYMENT", "")

        if not payment_header:
            return False, None, None, "No X-PAYMENT header provided"

        logger.info(
            f"Received X-PAYMENT header: {payment_header}")

        try:
            payment_dict = json.loads(safe_base64_decode(payment_header))
            payment = PaymentPayload(**payment_dict)
            logger.info(f"Decoded payment payload: {payment}")
        except Exception as e:
            logger.error(f"Failed to decode payment header: {e}")
            return False, None, None, f"Invalid payment header format: {e}"

        selected_payment_requirements = find_matching_payment_requirements(
            self.payment_requirements, payment
        )
        if not selected_payment_requirements:
            logger.error("No matching payment requirements found")
            return False, payment, None, "No matching payment requirements found"

        logger.info(
            f"Selected payment requirements: {selected_payment_requirements}")
        return True, payment, selected_payment_requirements, None

    async def verify(
        self,
        payment: PaymentPayload,
        requirements: PaymentRequirements,
        order_id: str
    ) -> tuple[bool, Optional[str]]:
        """Verify a payment using the facilitator.

        Args:
            payment: Payment payload to verify
            requirements: Payment requirements to verify against
            order_id: Order ID for logging

        Returns:
            Tuple of (is_valid, error_message)
            If valid, error_message is None
        """
        try:
            verify_response = await self.facilitator.verify(payment, requirements)
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

    async def settle(
        self,
        payment: PaymentPayload,
        requirements: PaymentRequirements,
        order_id: str
    ) -> tuple[bool, Optional[str], Optional[str], Optional[str]]:
        """Settle a payment using the facilitator.

        Args:
            payment: Payment payload to settle
            requirements: Payment requirements
            order_id: Order ID for logging

        Returns:
            Tuple of (success, tx_hash, network, error_message)
            If successful, error_message is None
        """
        try:
            settle_response = await self.facilitator.settle(payment, requirements)
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

    @staticmethod
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

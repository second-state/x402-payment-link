"""
Simple Flask demo with x402 payment integration.

This example demonstrates how to add payment functionality to a Flask endpoint
using the PaymentService class.
"""

import os

from dotenv import load_dotenv
from flask import Flask, request
from x402_payment_service import PaymentService

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configuration
NETWORK = os.getenv("NETWORK", "base-sepolia")
ADDRESS = os.getenv("ADDRESS")
FACILITATOR_URL = os.getenv("FACILITATOR_URL", "https://x402f1.secondstate.io")
MAX_DEADLINE_SECONDS = int(os.getenv("MAX_DEADLINE_SECONDS", "60"))

# Paywall configuration
APP_NAME = "Demo App"
APP_LOGO = "/static/logo.png"

# Validate required environment variables
if not ADDRESS:
    raise ValueError("Missing required environment variable: ADDRESS")


@app.route("/")
def index():
    """Public endpoint - no payment required."""
    return """
    <h1>Welcome to the Demo</h1>
    <ul>
        <li><a href="/free">Free Content</a> - No payment required</li>
        <li><a href="/premium">Premium Content</a> - Requires $0.01 payment</li>
    </ul>
    """


@app.route("/free")
def free_content():
    """Free endpoint - no payment required."""
    return "<h1>Free Content</h1><p>This content is available to everyone!</p>"


@app.route("/premium")
async def premium_content():
    """Premium endpoint - requires payment."""
    # Create payment service
    payment_service = PaymentService(
        app_name=APP_NAME,
        app_logo=APP_LOGO,
        headers=request.headers,
        resource_url=request.url,
        price=0.01,  # $0.01 USD
        description="Access to premium content",
        network=NETWORK,
        pay_to_address=ADDRESS,
        facilitator_url=FACILITATOR_URL,
        max_timeout_seconds=MAX_DEADLINE_SECONDS
    )

    # Parse and validate payment header
    success, payment, selected_requirements, parse_error = payment_service.parse()
    if not success:
        return payment_service.response(parse_error)

    # Verify payment
    is_valid, verify_error = await payment_service.verify(
        payment, selected_requirements, "premium"
    )
    if not is_valid:
        return payment_service.response(verify_error)

    # Settle payment
    success, tx_hash, tx_network, settle_error = await payment_service.settle(
        payment, selected_requirements, "premium"
    )
    if not success:
        return payment_service.response(settle_error)

    # Generate transaction link
    tx_link = PaymentService.generate_transaction_link(tx_hash, tx_network)

    # Return premium content after successful payment
    return f"""
    <h1>🎉 Premium Content Unlocked!</h1>
    <p>Thank you for your payment!</p>
    <p>This is the exclusive premium content that you paid for.</p>
    <hr>
    <p><small>Transaction: <a href="{tx_link}" target="_blank">{tx_hash}</a></small></p>
    """


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

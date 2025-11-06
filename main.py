import asyncio
import json
import logging
import os
import secrets
import string
import time
from logging.handlers import RotatingFileHandler

import sendgrid
import yaml
from cdp.x402 import create_facilitator_config
from dotenv import load_dotenv
from flask import (Flask, redirect, render_template, request,
                   send_from_directory)
from sendgrid.helpers.mail import Cc, Email, Mail, To
from werkzeug.middleware.proxy_fix import ProxyFix
from x402.common import (find_matching_payment_requirements,
                         process_price_to_atomic_amount, x402_VERSION)
from x402.encoding import safe_base64_decode
from x402.facilitator import FacilitatorClient, FacilitatorConfig
from x402.paywall import get_paywall_html, is_browser_request
from x402.types import (PaymentPayload, PaymentRequirements, PaywallConfig,
                        x402PaymentRequiredResponse)

ORDER_DIR = "data"

# Load environment variables
load_dotenv()

APP_PORT = int(os.getenv("APP_PORT", "5000"))
NETWORK = os.getenv("NETWORK", "base-sepolia")
ADDRESS = os.getenv("ADDRESS")
CDP_API_KEY_ID = os.getenv("CDP_API_KEY_ID")
CDP_API_KEY_SECRET = os.getenv("CDP_API_KEY_SECRET")
ENVIRONMENT = os.getenv("ENVIRONMENT", "staging")
MAX_DEADLINE_SECONDS = int(os.getenv("MAX_DEADLINE_SECONDS", "60"))

# Validate required environment variables
if NETWORK == "base-sepolia":
    if not ADDRESS:
        raise ValueError("Missing required environment variables")
    facilitator_config = FacilitatorConfig(url="https://x402.org/facilitator")
elif NETWORK == "base":
    if not ADDRESS or not CDP_API_KEY_ID or not CDP_API_KEY_SECRET:
        raise ValueError("Missing required environment variables")
    facilitator_config = create_facilitator_config(
        CDP_API_KEY_ID, CDP_API_KEY_SECRET)
else:
    raise ValueError(f"Unsupported network: {NETWORK}")

app = Flask(__name__)

# Logging configuration
file_handler = RotatingFileHandler(
    'data/app.log', maxBytes=10240000, backupCount=10)
file_handler.setFormatter(logging.Formatter(
    '[%(asctime)s] [%(levelname)s] %(message)s'))
file_handler.setLevel(logging.INFO)
app.logger.addHandler(file_handler)
app.logger.setLevel(logging.INFO)

# Handle reverse proxy headers
app.wsgi_app = ProxyFix(
    app.wsgi_app,
    x_for=1,
    x_proto=1,
)


def get_products():
    """Get all products from product.yaml"""
    with open('products.yaml', 'r') as f:
        product_catalog = yaml.safe_load(f)
    return product_catalog.keys()


def get_product_config(product_id):
    """Get product configuration based on current environment"""
    with open('products.yaml', 'r') as f:
        product_catalog = yaml.safe_load(f)
    if product_id not in product_catalog:
        return None

    product = product_catalog[product_id]
    env_config = product.get(ENVIRONMENT, product.get("production"))

    return {
        "id": product_id,
        "name": product["name"],
        "description": product["description"],
        "image": product["image"],
        "price": env_config["price"],
        "shipping": env_config["shipping"],
        "total": env_config["price"] + env_config["shipping"],
        "environment": ENVIRONMENT
    }


def generate_order_id(length=12):
    chars = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))


def get_orders(product):
    try:
        with open(f"{ORDER_DIR}/{product}.txt", "r") as f:
            orders = [json.loads(line) for line in f.readlines()]
    except FileNotFoundError:
        # Create a new file if not exists
        with open(f"{ORDER_DIR}/{product}.txt", "w") as f:
            pass
    return orders


def save_product_order(product, data):
    with open(f"{ORDER_DIR}/{product}.txt", "a") as f:
        f.write(f"{json.dumps(data)}\n")


def x402_response(error, payment_requirements):
    """Create a 402 response with payment requirements."""
    request_headers = dict(request.headers)

    if is_browser_request(request_headers):
        html_content = get_paywall_html(
            error, payment_requirements, PaywallConfig(
                app_name="x402-mvp",
                app_logo="/static/secondstate.png",
            )
        )

        return html_content, 402
    else:
        response_data = x402PaymentRequiredResponse(
            x402_version=x402_VERSION,
            accepts=payment_requirements,
            error=error,
        ).model_dump(by_alias=True)

        return response_data, 402


@app.after_request
def add_security_headers(response):
    response.headers['Cross-Origin-Opener-Policy'] = 'same-origin-allow-popups'
    return response


@app.route("/")
def index():
    html = ''
    products = get_products()
    for product in products:
        html += f'<li><a href="/{product}">{product}</a></li>'
    return html


@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)


@app.route("/<product>")
def product_page(product):
    product_config = get_product_config(product)
    if not product_config:
        return "Not found", 404
    return render_template(f"{product}/product.html", product=product_config)


@app.route("/<product>/order", methods=["POST"])
def product_order(product):
    timestamp = time.time()
    email = request.form.get("email")
    phone = request.form.get("phone")
    name = request.form.get("fullName")
    address1 = request.form.get("address1")
    address2 = request.form.get("address2")
    state = request.form.get("state")
    zip = request.form.get("zip")
    country = request.form.get("country")
    order_id = generate_order_id()
    data = {
        "time": timestamp,
        "email": email,
        "phone": phone,
        "name": name,
        "address1": address1,
        "address2": address2,
        "state": state,
        "zip": zip,
        "country": country,
        "order_id": order_id,
        "payment": False,
    }
    save_product_order(product, data)
    return redirect(f"/{product}/order/{order_id}")


@app.route("/<product>/order/<order_id>")
def product_order_id(product, order_id):
    # Get product price
    product_config = get_product_config(product)
    if not product_config:
        return "Not found", 404
    max_amount_required, asset_address, eip712_domain = (
        process_price_to_atomic_amount(f"${product_config["total"]}", NETWORK)
    )

    # Prepare payment requirements
    payment_requirements = [
        PaymentRequirements(
            scheme="exact",
            network=NETWORK,
            asset=asset_address,
            max_amount_required=max_amount_required,
            resource=request.url,
            description=f"Payment for {product_config['name']} order {order_id}",
            mime_type="text/html",
            pay_to=ADDRESS,
            max_timeout_seconds=MAX_DEADLINE_SECONDS,
            extra=eip712_domain,
        )
    ]

    # Check payment header
    payment_header = request.headers.get("X-PAYMENT", "")
    if payment_header == "":
        return x402_response("No X-PAYMENT header provided", payment_requirements)
    app.logger.info(
        f"Received X-PAYMENT header ({order_id}): {payment_header}")

    # Get payment header
    try:
        payment_dict = json.loads(safe_base64_decode(payment_header))
        payment = PaymentPayload(**payment_dict)
    except Exception as e:
        app.logger.error(f"Failed to decode payment header ({order_id}): {e}")
        return x402_response(f"Invalid payment header format: {e}", payment_requirements)
    selected_payment_requirements = find_matching_payment_requirements(
        payment_requirements, payment
    )
    if not selected_payment_requirements:
        app.logger.error(
            f"No matching payment requirements found ({order_id})")
        return x402_response("No matching payment requirements found", payment_requirements)
    app.logger.info(f"Decoded payment payload ({order_id}): {payment}")
    app.logger.info(
        f"Selected payment requirements ({order_id}): {selected_payment_requirements}")

    # Verify payment (async call in sync context)
    facilitator = FacilitatorClient(facilitator_config)
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        verify_response = loop.run_until_complete(
            facilitator.verify(payment, selected_payment_requirements)
        )
    except Exception as e:
        app.logger.error(f"Payment verification failed ({order_id}): {e}")
        return x402_response(f"Payment verification failed: {e}", payment_requirements)
    finally:
        loop.close()

    if not verify_response.is_valid:
        error_reason = verify_response.invalid_reason or "Unknown error"
        app.logger.error(
            f"Payment verification failed ({order_id}): {error_reason}")
        return x402_response(f"Payment verification failed: {error_reason}", payment_requirements)
    app.logger.info(
        f"Payment verified successfully ({order_id}): {verify_response}")

    # Verified payment, try to settle payment
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        settle_response = loop.run_until_complete(
            facilitator.settle(
                payment, selected_payment_requirements)
        )
        app.logger.info(f"Settle response ({order_id}): {settle_response}")

        if not settle_response.success:
            error_reason = settle_response.error_reason or "Unknown error"
            app.logger.error(
                f"Payment settlement not success ({order_id}): {error_reason}")
            return x402_response(f"Payment settlement not success: {error_reason}", payment_requirements)
    except Exception as e:
        app.logger.error(f"Payment settlement failed ({order_id}): {e}")
        return x402_response(f"Payment settlement failed: {e}", payment_requirements)
    finally:
        loop.close()
    app.logger.info(f"Payment settled successfully ({order_id})")
    if settle_response.transaction:
        if settle_response.network == "base-sepolia":
            app.logger.info(
                f"Transaction: https://sepolia.basescan.org/tx/{settle_response.transaction}")
        elif settle_response.network == "base":
            app.logger.info(
                f"Transaction: https://basescan.org/tx/{settle_response.transaction}")

    # Payment settled
    orders = get_orders(product)
    order = next((order for order in orders if order.get(
        "order_id") == order_id), None)
    if order:
        order["time"] = time.time()
        order["payment"] = True
        save_product_order(product, order)

        # Send order confirmation email
        load_dotenv()
        order_confirmation_recipient = os.getenv(
            "ORDER_CONFIRMATION_RECIPIENT")
        if order.get("email") and order_confirmation_recipient:
            try:
                # Get product configuration for email
                product_config = get_product_config(product)
                sendgrid_client = sendgrid.SendGridAPIClient(
                    api_key=os.getenv('SENDGRID_API_KEY'))
                from_email = Email("vivian@secondstate.io")
                to_email = To(order.get("email"))
                cc_email = Cc(order_confirmation_recipient)
                subject = f"Order Confirmation - {order_id}"
                html_content = render_template(
                    f"{product}/order_confirmation_email.html",
                    order_id=order_id,
                    name=order.get("name", "Customer"),
                    email=order.get("email"),
                    phone=order.get("phone"),
                    address1=order.get("address1"),
                    address2=order.get("address2"),
                    state=order.get("state"),
                    zip=order.get("zip"),
                    country=order.get("country"),
                    product=product_config
                )
                mail = Mail(from_email, to_email,
                            subject, html_content=html_content)
                mail.cc = cc_email
                sendgrid_client.send(mail)
            except Exception as e:
                app.logger.error(f"Failed to send email ({order_id}): {e}")

    return render_template(f"{product}/order_confirmation.html", order_id=order_id)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=APP_PORT, debug=(ENVIRONMENT == 'staging'))

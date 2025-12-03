import logging
import os
import time
from logging.handlers import RotatingFileHandler

from flask import (Flask, redirect, render_template, request,
                   send_from_directory)
from werkzeug.middleware.proxy_fix import ProxyFix
from x402.common import x402_VERSION
from x402.facilitator import FacilitatorClient
from x402.paywall import get_paywall_html, is_browser_request
from x402.types import x402PaymentRequiredResponse

# Import configuration
from config import (ADDRESS, APP_PORT, ENVIRONMENT, FACILITATOR_CONFIG,
                    FROM_EMAIL, MAX_DEADLINE_SECONDS, NETWORK,
                    ORDER_CONFIRMATION_RECIPIENT, PAYWALL_CONFIG,
                    SENDGRID_API_KEY)
# Import services
from services.notification_service import send_order_confirmation_email
from services.order_service import (generate_order_id, get_order_by_id,
                                    save_product_order)
from services.payment_service import (create_payment_requirements,
                                      generate_transaction_link,
                                      parse_payment_header, settle_payment,
                                      verify_payment)
from services.product_service import get_product_config, get_products

app = Flask(__name__)

# Ensure data directory exists
os.makedirs('data', exist_ok=True)

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


def x402_response(error, payment_requirements):
    """Create a 402 response with payment requirements."""
    request_headers = dict(request.headers)

    if is_browser_request(request_headers):
        html_content = get_paywall_html(
            error, payment_requirements, PAYWALL_CONFIG
        )
        return html_content, 400
    else:
        response_data = x402PaymentRequiredResponse(
            x402_version=x402_VERSION,
            accepts=payment_requirements,
            error=error,
        ).model_dump(by_alias=True)

        return response_data, 400


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
    product_config = get_product_config(product, ENVIRONMENT)
    if not product_config:
        return "Not found", 404
    return render_template(f"{product}/product.html", product=product_config)


@app.route("/<product>/order", methods=["POST"])
def product_order(product):
    product_config = get_product_config(product, ENVIRONMENT)
    if not product_config:
        return "Not found", 404

    timestamp = time.time()
    email = request.form.get("email")
    phone = request.form.get("phone")
    name = request.form.get("fullName")
    address1 = request.form.get("address1")
    address2 = request.form.get("address2")
    state = request.form.get("state")
    zip_code = request.form.get("zip")
    country = request.form.get("country")
    order_id = generate_order_id()
    quantity = int(request.form.get("quantity", 1))
    total = round(
        quantity * product_config["price"] + product_config["shipping"], 2)

    data = {
        "time": timestamp,
        "email": email,
        "phone": phone,
        "name": name,
        "address1": address1,
        "address2": address2,
        "state": state,
        "zip": zip_code,
        "country": country,
        "order_id": order_id,
        "quantity": quantity,
        "total": total,
        "payment": False,
    }
    save_product_order(product, data)
    return redirect(f"/{product}/order/{order_id}")


@app.route("/<product>/order/<order_id>")
async def product_order_id(product, order_id):
    """Handle order payment verification and settlement (async)."""
    # Get order and product details
    order = get_order_by_id(product, order_id)
    if not order:
        return "Not found", 404

    product_config = get_product_config(product, ENVIRONMENT)
    if not product_config:
        return "Not found", 404

    # Create payment requirements
    payment_requirements = create_payment_requirements(
        product_config=product_config,
        order=order,
        order_id=order_id,
        resource_url=request.url,
        network=NETWORK,
        pay_to_address=ADDRESS,
        max_timeout_seconds=MAX_DEADLINE_SECONDS
    )

    # Check payment header
    payment_header = request.headers.get("X-PAYMENT", "")
    if payment_header == "":
        return x402_response("No X-PAYMENT header provided", payment_requirements)

    app.logger.info(
        f"Received X-PAYMENT header ({order_id}): {payment_header}")

    # Parse and validate payment header
    payment, selected_requirements, error = parse_payment_header(
        payment_header, payment_requirements, order_id
    )
    if error:
        app.logger.error(f"Payment header parse error ({order_id}): {error}")
        return x402_response(error, payment_requirements)

    # Verify payment
    facilitator = FacilitatorClient(FACILITATOR_CONFIG)
    is_valid, verify_error = await verify_payment(
        facilitator, payment, selected_requirements, order_id
    )
    if not is_valid:
        app.logger.error(
            f"Payment verification error ({order_id}): {verify_error}")
        return x402_response(verify_error, payment_requirements)

    # Settle payment
    success, tx_hash, tx_network, settle_error = await settle_payment(
        facilitator, payment, selected_requirements, order_id
    )
    if not success:
        app.logger.error(
            f"Payment settlement error ({order_id}): {settle_error}")
        return x402_response(settle_error, payment_requirements)

    # Generate transaction link
    tx_link = generate_transaction_link(tx_hash, tx_network)
    if tx_link:
        app.logger.info(f"Transaction: {tx_link}")
    else:
        app.logger.warning(f"No transaction hash returned ({order_id})")

    # Update order as paid
    order["time"] = time.time()
    order["payment"] = True
    save_product_order(product, order)

    # Send order confirmation email
    if order.get("email") and ORDER_CONFIRMATION_RECIPIENT and SENDGRID_API_KEY:
        send_order_confirmation_email(
            order=order,
            product_config=product_config,
            product=product,
            order_id=order_id,
            tx_hash=tx_hash,
            tx_link=tx_link,
            from_email=FROM_EMAIL,
            cc_recipient=ORDER_CONFIRMATION_RECIPIENT,
            sendgrid_api_key=SENDGRID_API_KEY
        )

    return render_template(
        f"{product}/order_confirmation.html",
        order_id=order_id,
        tx_hash=tx_hash,
        tx_link=tx_link
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=APP_PORT, debug=(ENVIRONMENT == 'staging'))

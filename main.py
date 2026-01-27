import logging
import os
import time
from logging.handlers import RotatingFileHandler

from flask import (Flask, redirect, render_template, request,
                   send_from_directory)
from werkzeug.middleware.proxy_fix import ProxyFix
from x402_payment_service import PaymentService

# Import configuration
from config import (ADDRESS, APP_LOGO, APP_NAME, APP_PORT, AVAILABLE_TOKENS,
                    ENVIRONMENT, FACILITATOR_URL, FROM_EMAIL,
                    MAX_DEADLINE_SECONDS, NETWORK, ORDER_CONFIRMATION_RECIPIENT,
                    SENDGRID_API_KEY, get_token_by_id, get_token_config_for_payment)
# Import services
from services.notification_service import send_order_confirmation_email
from services.order_service import (generate_order_id, get_order_by_id,
                                    save_product_order)
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

    # Merge token prices into AVAILABLE_TOKENS for display
    token_prices = product_config.get("token_prices", {})
    tokens_with_prices = []
    for token in AVAILABLE_TOKENS:
        token_copy = token.copy()
        if token["id"] in token_prices:
            tp = token_prices[token["id"]]
            token_copy["price"] = tp.get("price", product_config["price"])
            token_copy["shipping"] = tp.get("shipping", product_config["shipping"])
        else:
            token_copy["price"] = product_config["price"]
            token_copy["shipping"] = product_config["shipping"]
        tokens_with_prices.append(token_copy)

    return render_template(
        f"{product}/product.html",
        product=product_config,
        tokens=tokens_with_prices
    )


@app.route("/<product>/order", methods=["POST"])
def product_order(product):
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
    token_id = request.form.get("token", "usdc")

    # Get product config with token-specific pricing
    product_config = get_product_config(product, ENVIRONMENT, token_id)
    if not product_config:
        return "Not found", 404

    total = quantity * product_config["price"] + product_config["shipping"]

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
        "token_id": token_id,
        "total": total,
        "payment": False,
    }
    save_product_order(product, data)
    return redirect(f"/{product}/order/{order_id}?token={token_id}")


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

    # Get selected token and build token_config for PaymentService
    token_id = request.args.get("token", order.get("token_id", "usdc"))
    selected_token = get_token_by_id(token_id)
    token_config = get_token_config_for_payment(selected_token)

    # Re-fetch product config with token-specific pricing
    product_config = get_product_config(product, ENVIRONMENT, token_id)
    if not product_config:
        return "Not found", 404

    # Check if selected token is native
    is_native_token = selected_token.get("native", False) if selected_token else False

    # Create payment service
    payment_service = PaymentService(
        app_name=APP_NAME,
        app_logo=APP_LOGO,
        headers=request.headers,
        resource_url=request.url,
        price=order.get("total"),
        description=f"Payment for {product_config['name']} order {order_id}",
        network=NETWORK,
        pay_to_address=ADDRESS,
        facilitator_url=FACILITATOR_URL,
        max_timeout_seconds=MAX_DEADLINE_SECONDS,
        token_config=token_config,
        native_token=is_native_token
    )

    # Parse and validate payment header
    success, payment, selected_requirements, parse_error = payment_service.parse()
    if not success:
        app.logger.error(
            f"Payment header parse error ({order_id}): {parse_error}")
        return payment_service.response(parse_error)

    # Verify payment
    is_valid, verify_error = await payment_service.verify(payment, selected_requirements, order_id)
    if not is_valid:
        app.logger.error(
            f"Payment verification error ({order_id}): {verify_error}")
        return payment_service.response(verify_error)

    # Settle payment
    success, tx_hash, tx_network, settle_error = await payment_service.settle(
        payment, selected_requirements, order_id
    )
    if not success:
        app.logger.error(
            f"Payment settlement error ({order_id}): {settle_error}")
        return payment_service.response(settle_error)

    # Generate transaction link
    tx_link = PaymentService.generate_transaction_link(tx_hash, tx_network)
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

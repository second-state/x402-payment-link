import json
import os
import secrets
import string
import time

import sendgrid
import yaml
from cdp.x402 import create_facilitator_config
from dotenv import load_dotenv
from flask import (Flask, redirect, render_template, request,
                   send_from_directory)
from sendgrid.helpers.mail import Cc, Email, Mail, To
from werkzeug.middleware.proxy_fix import ProxyFix
from x402.facilitator import FacilitatorConfig
from x402.flask.middleware import PaymentMiddleware
from x402.types import PaywallConfig

ORDER_DIR = "data"

# Load environment variables
load_dotenv()

APP_PORT = int(os.getenv("APP_PORT", "5000"))
NETWORK = os.getenv("NETWORK", "base-sepolia")
ADDRESS = os.getenv("ADDRESS")
CDP_API_KEY_ID = os.getenv("CDP_API_KEY_ID")
CDP_API_KEY_SECRET = os.getenv("CDP_API_KEY_SECRET")
ENVIRONMENT = os.getenv("ENVIRONMENT", "staging")


def get_products():
    """Get all products from product.yaml"""
    with open('product.yaml', 'r') as f:
        product_catalog = yaml.safe_load(f)
    return product_catalog.keys()


def get_product_config(product_id):
    """Get product configuration based on current environment"""
    with open('product.yaml', 'r') as f:
        product_catalog = yaml.safe_load(f)
    if product_id not in product_catalog:
        return None

    product = product_catalog[product_id]
    env_config = product.get(ENVIRONMENT, product.get("production"))

    return {
        "name": product["name"],
        "description": product["description"],
        "image": product["image"],
        "price": env_config["price"],
        "shipping": env_config["shipping"],
        "total": env_config["price"] + env_config["shipping"],
        "environment": ENVIRONMENT
    }


if NETWORK == "base-sepolia":
    if not ADDRESS:
        raise ValueError("Missing required environment variables")
elif NETWORK == "base":
    if not ADDRESS or not CDP_API_KEY_ID or not CDP_API_KEY_SECRET:
        raise ValueError("Missing required environment variables")
else:
    raise ValueError(f"Unsupported network: {NETWORK}")

app = Flask(__name__)
app.config["MAIL_SERVER"] = os.getenv("MAIL_SERVER", "smtp.gmail.com")
app.config["MAIL_PORT"] = int(os.getenv("MAIL_PORT", "587"))
app.config["MAIL_USE_TLS"] = os.getenv(
    "MAIL_USE_TLS", "true").lower() == "true"
app.config["MAIL_USE_SSL"] = os.getenv(
    "MAIL_USE_SSL", "false").lower() == "true"
app.config["MAIL_USERNAME"] = os.getenv("MAIL_USERNAME")
app.config["MAIL_PASSWORD"] = os.getenv("MAIL_PASSWORD")
app.config["MAIL_DEFAULT_SENDER"] = os.getenv("MAIL_DEFAULT_SENDER")
mail = Mail(app)

if NETWORK == "base-sepolia":
    facilitator_config = FacilitatorConfig(
        url="https://x402.org/facilitator")
elif NETWORK == "base":
    facilitator_config = create_facilitator_config(
        CDP_API_KEY_ID, CDP_API_KEY_SECRET)

payment_middleware = PaymentMiddleware(app)

# Get product configuration for payment middleware
for product in get_products():
    product_config = get_product_config(product)
    payment_middleware.add(
        path=f"/{product}/order/*",
        price=f"${product_config['total']:.2f}",
        pay_to_address=ADDRESS,
        network=NETWORK,
        paywall_config=PaywallConfig(
            app_name="x402-mvp",
            app_logo="/static/secondstate.png",
        ),
        facilitator_config=facilitator_config,
    )

app.wsgi_app = ProxyFix(
    app.wsgi_app,
    x_for=1,
    x_proto=1,
)


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
    return render_template(f"product.html", product=product_config)


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
                    "order_confirmation_email.html",
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
                app.logger.error(f"Failed to send email: {e}")

    return render_template("order_confirmation.html", order_id=order_id)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=APP_PORT)

import json
import os
import secrets
import string
import time

from cdp.x402 import create_facilitator_config
from dotenv import load_dotenv
from flask import Flask, render_template, redirect, request, send_from_directory
from x402.facilitator import FacilitatorConfig
from x402.flask.middleware import PaymentMiddleware
from x402.types import PaywallConfig
from werkzeug.middleware.proxy_fix import ProxyFix

# Load environment variables
load_dotenv()

NETWORK = os.getenv("NETWORK", "base-sepolia")
ADDRESS = os.getenv("ADDRESS")
CDP_API_KEY_ID = os.getenv("CDP_API_KEY_ID")
CDP_API_KEY_SECRET = os.getenv("CDP_API_KEY_SECRET")

if NETWORK == "base-sepolia":
    if not ADDRESS:
        raise ValueError("Missing required environment variables")
elif NETWORK == "base":
    if not ADDRESS or not CDP_API_KEY_ID or not CDP_API_KEY_SECRET:
        raise ValueError("Missing required environment variables")
else:
    raise ValueError(f"Unsupported network: {NETWORK}")

app = Flask(__name__)

if NETWORK == "base-sepolia":
    facilitator_config = FacilitatorConfig(
        url="https://x402.org/facilitator")
elif NETWORK == "base":
    facilitator_config = create_facilitator_config(
        CDP_API_KEY_ID, CDP_API_KEY_SECRET)

payment_middleware = PaymentMiddleware(app)
payment_middleware.add(
    path="/buy-echokit/order/*",
    price="$0.001",
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


def get_orders():
    try:
        with open("orders.txt", "r") as f:
            orders = [json.loads(line) for line in f.readlines()]
    except FileNotFoundError:
        # Create a new file if not exists
        with open("orders.txt", "w") as f:
            pass
    return orders


@app.after_request
def add_security_headers(response):
    response.headers['Cross-Origin-Opener-Policy'] = 'same-origin-allow-popups'
    return response


@app.route("/")
def index():
    return render_template("index.html", network=NETWORK)


@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)


@app.route("/buy-echokit")
def buy_echokit():
    return render_template("buy_echokit.html")


@app.route("/buy-echokit/order", methods=["POST"])
def buy_echokit_order():
    name = request.form.get("name")
    email = request.form.get("email")
    address = request.form.get("address")
    timestamp = time.time()
    order_id = generate_order_id()
    data = {
        "time": timestamp,
        "name": name,
        "email": email,
        "address": address,
        "order_id": order_id,
        "payment": False,
    }
    with open("orders.txt", "a") as f:
        f.write(f"{json.dumps(data)}\n")
    return redirect(f"/buy-echokit/order/{order_id}")


@app.route("/buy-echokit/order/<order_id>")
def buy_echokit_order_id(order_id):
    orders = get_orders()
    order = next((order for order in orders if order.get("order_id") == order_id), None)
    if order:
        order["time"] = time.time()
        order["payment"] = True
        with open("orders.txt", "a") as f:
            f.write(f"{json.dumps(order)}\n")
    return render_template("order_confirmation.html", order_id=order_id)


@app.route("/orders")
def orders():
    orders = get_orders()
    orders = [order for order in orders if order.get("payment")]
    return {"data": orders}


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)

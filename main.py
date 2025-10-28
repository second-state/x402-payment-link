import json
import os

from cdp.x402 import create_facilitator_config
from dotenv import load_dotenv
from flask import Flask, render_template, request, send_from_directory
from x402.facilitator import FacilitatorConfig
from x402.flask.middleware import PaymentMiddleware
from x402.types import PaywallConfig

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
    path="/buy-echokit/order",
    price="$0.001",
    pay_to_address=ADDRESS,
    network=NETWORK,
    paywall_config=PaywallConfig(
        app_name="x402-mvp",
        app_logo="/static/secondstate.png",
    ),
    facilitator_config=facilitator_config,
)


@app.route("/")
def index():
    return render_template("index.html", network=NETWORK)


@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)


@app.route("/buy-echokit")
def buy_echokit():
    return render_template("buy_echokit.html")


@app.route("/buy-echokit/order")
def buy_echokit_order():
    name = request.args.get("name")
    email = request.args.get("email")
    address = request.args.get("address")
    data = {"name": name, "email": email, "address": address}
    with open("orders.txt", "a") as f:
        f.write(f"{json.dumps(data)}\n")
    return render_template("order_confirmation.html")


@app.route("/orders")
def orders():
    with open("orders.txt", "r") as f:
        orders = [json.loads(line) for line in f.readlines()]
    return {"data": orders}


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
